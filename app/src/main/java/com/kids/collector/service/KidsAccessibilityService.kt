package com.kids.collector.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityManager
import android.view.accessibility.AccessibilityNodeInfo
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.kids.collector.data.db.KidsDatabase
import com.kids.collector.data.db.NoticeEntity
import com.kids.collector.domain.classifier.ContentClassifier
import com.kids.collector.domain.dedupe.DeduplicationEngine
import com.kids.collector.domain.model.ChildProfile
import com.kids.collector.domain.model.SyncStatus
import com.kids.collector.domain.router.MultiChildRouter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * Historical Notice Crawler Accessibility Service
 *
 * Exclusively active for Day 0 historical backfill when authorized school apps are in foreground.
 * Traverses accessibility node trees, extracts past circulars & homework, and deduplicates via SHA-256.
 *
 * Includes FloatingCrawlerOverlay for one-tap auto-capture at the calibrated optimal speed.
 *
 * Governance:
 * - 100% Optional: declining accessibility does not impair 24/7 push notification capture.
 * - Zero third-party cloud retention: all notices sync solely to parent's personal Google Drive vault.
 */
class KidsAccessibilityService : AccessibilityService() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val classifier = ContentClassifier()
    private val deduplicationEngine = DeduplicationEngine()

    private var crawlerOverlay: FloatingCrawlerOverlay? = null
    private var lastActiveSchoolPackage: String? = null

    @Volatile
    private var isHandlingAttachmentDownload = false
    @Volatile
    private var pendingAttachmentDownloadName: String? = null
    private val capturedAttachmentNames = java.util.concurrent.ConcurrentHashMap.newKeySet<String>()

    data class ExtractedAttachment(
        val fileName: String,
        val clickableNode: AccessibilityNodeInfo?
    )

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.i(TAG, "KidsAccessibilityService connected")
        getOrCreateOverlay()

        serviceScope.launch {
            try {
                val db = KidsDatabase.getInstance(applicationContext)
                val allAtts = db.attachmentDao().getAllAttachmentsDirect()
                for (att in allAtts) {
                    capturedAttachmentNames.add(att.fileName)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error pre-loading attachment names: ${e.message}")
            }
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val packageName = event.packageName?.toString() ?: return

        // 0. Drop our own app events so we never capture our own wizard UI
        if (packageName == applicationContext.packageName) {
            return
        }

        // 1. If currently handling an autonomous attachment download, inspect preview screen
        if (isHandlingAttachmentDownload) {
            val root = rootInActiveWindow
            if (root != null) {
                val downloadBtn = findDownloadButtonNode(root)
                if (downloadBtn != null) {
                    CrawlerTraceLogger.log("ATTACHMENT_DOWNLOAD", "Found download control for $pendingAttachmentDownloadName. Triggering download.")
                    val clicked = downloadBtn.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    downloadBtn.recycle()
                    if (clicked) {
                        serviceScope.launch {
                            kotlinx.coroutines.delay(400)
                            performGlobalAction(GLOBAL_ACTION_BACK)
                            isHandlingAttachmentDownload = false
                            pendingAttachmentDownloadName = null
                        }
                        return
                    }
                }
            }
        }

        // 2. Ignore system background events
        if (isSystemPackage(packageName)) {
            return
        }

        if (isAuthorizedSchoolApp(packageName)) {
            lastActiveSchoolPackage = packageName
            getOrCreateOverlay().show()

            val rootNode = rootInActiveWindow ?: return
            if (rootNode.packageName?.toString() == applicationContext.packageName) {
                return
            }
            processRootNode(rootNode, packageName)
        } else if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && isHomeScreenOrLauncher(packageName)) {
            crawlerOverlay?.hide()
        }
    }

    private fun getOrCreateOverlay(): FloatingCrawlerOverlay {
        if (crawlerOverlay == null) {
            crawlerOverlay = FloatingCrawlerOverlay(this) {
                val root = rootInActiveWindow ?: return@FloatingCrawlerOverlay
                if (root.packageName?.toString() == applicationContext.packageName) return@FloatingCrawlerOverlay
                val pkg = lastActiveSchoolPackage ?: "com.google.android.apps.classroom"
                processRootNode(root, pkg)
            }
        }
        return crawlerOverlay!!
    }

    private fun processRootNode(rootNode: AccessibilityNodeInfo, packageName: String) {
        if (rootNode.packageName?.toString() == applicationContext.packageName) return
        CrawlerTraceLogger.log("SCROLLER_SCAN", "Inspecting active window: pkg=$packageName")
        serviceScope.launch {
            try {
                val db = KidsDatabase.getInstance(applicationContext)

                // 1. Fetch children for multi-child attribution
                val childEntities = db.childProfileDao().getAllChildren().firstOrNull().orEmpty()
                val children = childEntities.map { e ->
                    ChildProfile(
                        childId = e.childId,
                        firstName = e.firstName,
                        grade = e.grade,
                        academicYear = e.academicYear,
                        schoolName = e.schoolName,
                        accountEmail = e.accountEmail,
                        disambiguationTag = e.disambiguationTag,
                        photoUri = e.photoUri,
                        channels = e.channels,
                        createdAtMs = e.createdAtMs
                    )
                }

                val (_, savedYear, savedChildName) = com.kids.collector.data.drive.DriveVaultManager.getSavedVaultPrefs(applicationContext)
                val router = MultiChildRouter(children)

                val excludedChrome = setOf(
                    "open navigation menu", "show menu", "more options", "navigate up", "back",
                    "stream", "classwork", "people", "about", "join course", "view to-do list",
                    "classroom", "google classroom", "class options"
                )

                // 2. Discover post cards in the list container (or fallback to full window)
                val postCards = findPostCards(rootNode)
                CrawlerTraceLogger.log("SCROLLER_CARDS", "Identified ${postCards.size} discrete post cards on active screen")

                var newlyBackfilled = 0
                for (card in postCards) {
                    val cardItems = mutableListOf<String>()
                    val cardAttachments = mutableListOf<ExtractedAttachment>()
                    extractCardDetails(card, cardItems, cardAttachments)

                    if (cardItems.isEmpty()) {
                        card.recycle()
                        continue
                    }

                    val combinedText = cardItems.joinToString(" ")
                    if (combinedText.length <= 25) {
                        card.recycle()
                        continue
                    }

                    val titleCandidate = cardItems.firstOrNull { item ->
                        val lower = item.trim().lowercase()
                        !excludedChrome.contains(lower) &&
                                !lower.startsWith("tab ") &&
                                !lower.startsWith("signed in as") &&
                                !lower.startsWith("tasks due") &&
                                !lower.startsWith("class options for") &&
                                item.trim().length > 3
                    }
                    val title = titleCandidate?.take(80) ?: "Historical Classroom Notice"
                    val body = combinedText
                    val category = classifier.classify(title, body)

                    val targetChild = router.route(packageName, title, body)
                    val targetChildId = targetChild?.childId ?: children.firstOrNull()?.childId ?: "child_$savedChildName"

                    val hash = deduplicationEngine.computeNoticeHash(
                        childId = targetChildId,
                        sourceApp = packageName,
                        title = title,
                        body = body
                    )

                    val existing = db.noticeDao().findByHash(hash)
                    if (existing == null) {
                        val noticeId = UUID.randomUUID().toString()
                        val noticeEntity = NoticeEntity(
                            noticeId = noticeId,
                            childId = targetChildId,
                            sourceApp = packageName,
                            category = category.name,
                            title = title,
                            body = body,
                            sender = packageName,
                            timestampMs = System.currentTimeMillis(),
                            hashSha256 = hash,
                            syncStatus = SyncStatus.PENDING.name,
                            driveFileId = null,
                            attachmentCount = cardAttachments.size
                        )
                        db.noticeDao().insert(noticeEntity)

                        for (att in cardAttachments) {
                            val attEntity = com.kids.collector.data.db.AttachmentEntity(
                                attachmentId = UUID.randomUUID().toString(),
                                noticeId = noticeId,
                                fileName = att.fileName.take(60),
                                localUri = "",
                                mimeType = if (att.fileName.contains(".pdf", true)) "application/pdf"
                                else if (att.fileName.matches(Regex(".*\\.(jpg|jpeg|png)$", RegexOption.IGNORE_CASE))) "image/jpeg"
                                else "application/octet-stream",
                                sizeBytes = 0L,
                                fileHash = att.fileName.hashCode().toString(),
                                ocrText = null,
                                pageCount = 1,
                                driveFileId = null,
                                syncStatus = SyncStatus.PENDING.name
                            )
                            db.attachmentDao().insert(attEntity)
                        }

                        newlyBackfilled++
                        CrawlerTraceLogger.log(
                            "SCROLLER_ACCEPTED",
                            "Notice backfilled: \"$title\" ($category) [Attachments: ${cardAttachments.size}]"
                        )
                        crawlerOverlay?.incrementNoticeCount()
                    }

                    // 3. Autonomous attachment download check (zero parent clicking)
                    if (crawlerOverlay?.isAutoScrollingActive() == true && !isHandlingAttachmentDownload && cardAttachments.isNotEmpty()) {
                        val uncaptured = cardAttachments.firstOrNull { att ->
                            !capturedAttachmentNames.contains(att.fileName)
                        }
                        if (uncaptured != null && uncaptured.clickableNode != null && uncaptured.clickableNode.isClickable) {
                            capturedAttachmentNames.add(uncaptured.fileName)
                            CrawlerTraceLogger.log("ATTACHMENT_AUTO_TAP", "Autonomously tapping attachment chip: \"${uncaptured.fileName}\"")
                            isHandlingAttachmentDownload = true
                            pendingAttachmentDownloadName = uncaptured.fileName
                            uncaptured.clickableNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)

                            // Safety timeout: if preview screen doesn't resolve within 3.5s, reset state and return
                            serviceScope.launch {
                                kotlinx.coroutines.delay(3500)
                                if (isHandlingAttachmentDownload) {
                                    CrawlerTraceLogger.log("ATTACHMENT_TIMEOUT", "Preview did not trigger download within 3.5s; pressing back")
                                    performGlobalAction(GLOBAL_ACTION_BACK)
                                    isHandlingAttachmentDownload = false
                                    pendingAttachmentDownloadName = null
                                }
                            }
                        }
                    }

                    // Clean up card references
                    for (att in cardAttachments) {
                        att.clickableNode?.recycle()
                    }
                    card.recycle()
                }

                // 4. Scan download folders for newly saved files
                com.kids.collector.data.drive.DownloadFolderObserver.scanLocalAttachments(applicationContext)

                // 5. Trigger sync if manual capture or idle
                if (crawlerOverlay?.isAutoScrollingActive() != true && newlyBackfilled > 0) {
                    triggerDriveSync(applicationContext)
                }
            } catch (e: Exception) {
                CrawlerTraceLogger.log("SCROLLER_ERROR", "Error during accessibility crawl: ${e.message}")
                Log.e(TAG, "Error during accessibility crawl", e)
            }
        }
    }

    private fun extractCardDetails(
        node: AccessibilityNodeInfo,
        outText: MutableList<String>,
        outAttachments: MutableList<ExtractedAttachment>
    ) {
        val directText = node.text?.toString()?.trim()
        val descText = node.contentDescription?.toString()?.trim()

        val candidate = when {
            !directText.isNullOrBlank() && directText.length > 2 -> directText
            !descText.isNullOrBlank() && descText.length > 2 -> descText
            else -> null
        }

        if (candidate != null && !outText.contains(candidate)) {
            outText.add(candidate)
            val attachmentExts = listOf(".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".jpg", ".jpeg", ".png", ".mp4")
            if (attachmentExts.any { candidate.contains(it, ignoreCase = true) }) {
                val clickableNode = findClickableAncestor(node) ?: AccessibilityNodeInfo.obtain(node)
                outAttachments.add(ExtractedAttachment(candidate.take(60), clickableNode))
            }
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            extractCardDetails(child, outText, outAttachments)
            child.recycle()
        }
    }

    private fun findClickableAncestor(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        var current: AccessibilityNodeInfo? = node
        while (current != null) {
            if (current.isClickable) {
                return AccessibilityNodeInfo.obtain(current)
            }
            current = current.parent
        }
        return null
    }

    private fun findDownloadButtonNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val text = node.text?.toString()?.lowercase() ?: ""
        val desc = node.contentDescription?.toString()?.lowercase() ?: ""
        val viewId = node.viewIdResourceName?.lowercase() ?: ""

        if (text == "download" || desc.contains("download") || desc.contains("save to device") || viewId.contains("download")) {
            if (node.isClickable) return AccessibilityNodeInfo.obtain(node)
            var parent = node.parent
            while (parent != null) {
                if (parent.isClickable) return parent
                parent = parent.parent
            }
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findDownloadButtonNode(child)
            child.recycle()
            if (found != null) return found
        }
        return null
    }

    private fun findPostCards(rootNode: AccessibilityNodeInfo): List<AccessibilityNodeInfo> {
        val scrollable = findScrollableNode(rootNode)
        if (scrollable != null && scrollable.childCount > 0) {
            val cards = mutableListOf<AccessibilityNodeInfo>()
            for (i in 0 until scrollable.childCount) {
                val child = scrollable.getChild(i) ?: continue
                if (hasSubstantialContent(child)) {
                    cards.add(child)
                } else {
                    child.recycle()
                }
            }
            scrollable.recycle()
            if (cards.isNotEmpty()) {
                return cards
            }
        }
        return listOf(AccessibilityNodeInfo.obtain(rootNode))
    }

    private fun findScrollableNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        if (node.isScrollable) {
            return AccessibilityNodeInfo.obtain(node)
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findScrollableNode(child)
            child.recycle()
            if (found != null) return found
        }
        return null
    }

    private fun hasSubstantialContent(node: AccessibilityNodeInfo): Boolean {
        val textList = mutableListOf<String>()
        collectQuickText(node, textList)
        return textList.joinToString(" ").length > 20
    }

    private fun collectQuickText(node: AccessibilityNodeInfo, outList: MutableList<String>) {
        node.text?.toString()?.trim()?.let { if (it.length > 2) outList.add(it) }
        node.contentDescription?.toString()?.trim()?.let { if (it.length > 2) outList.add(it) }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            collectQuickText(child, outList)
            child.recycle()
        }
    }

    private fun isAuthorizedSchoolApp(packageName: String): Boolean {
        val lower = packageName.lowercase()
        return lower.contains("classroom") ||
                lower.contains("campuscare") ||
                lower.contains("toddle") ||
                lower.contains("edunext")
    }

    private fun isSystemPackage(pkg: String): Boolean {
        val lower = pkg.lowercase()
        return lower.contains("systemui") ||
                lower.contains("inputmethod") ||
                lower.contains("gboard") ||
                lower.contains("keyboard") ||
                lower == "android" ||
                lower.contains("miui.securitycenter")
    }

    private fun isHomeScreenOrLauncher(pkg: String): Boolean {
        val lower = pkg.lowercase()
        return lower.contains("launcher") ||
                lower.contains("home") ||
                lower.contains("miui.home")
    }

    override fun onInterrupt() {
        Log.w(TAG, "KidsAccessibilityService interrupted")
    }

    override fun onDestroy() {
        super.onDestroy()
        crawlerOverlay?.destroy()
        crawlerOverlay = null
    }

    companion object {
        private const val TAG = "KidsAccessibilityService"

        fun triggerDriveSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val syncRequest = OneTimeWorkRequestBuilder<DriveSyncWorker>()
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                "DriveVaultSyncWork",
                ExistingWorkPolicy.KEEP,
                syncRequest
            )
        }

        fun isEnabled(context: Context): Boolean {
            val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager ?: return false
            val enabledServices = am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
            for (enabled in enabledServices) {
                val serviceInfo = enabled.resolveInfo.serviceInfo
                if (serviceInfo.packageName == context.packageName && serviceInfo.name == KidsAccessibilityService::class.java.name) {
                    return true
                }
            }
            return false
        }
    }
}
