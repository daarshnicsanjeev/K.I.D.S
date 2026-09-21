package com.kids.collector.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.graphics.Rect
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityManager
import android.view.accessibility.AccessibilityNodeInfo
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.kids.collector.data.db.AttachmentEntity
import com.kids.collector.data.db.KidsDatabase
import com.kids.collector.data.db.NoticeEntity
import com.kids.collector.domain.classifier.ContentClassifier
import com.kids.collector.domain.dedupe.DeduplicationEngine
import com.kids.collector.domain.model.ChildProfile
import com.kids.collector.domain.model.SyncStatus
import com.kids.collector.domain.router.MultiChildRouter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * Historical Notice Crawler Accessibility Service
 *
 * Exclusively active for Day 0 historical backfill when authorized school apps are in foreground.
 * Implements a deep crawl finite state machine (FSM):
 * - Traverses Stream / Classwork post cards within the safe screen viewport.
 * - Enters each post detail view to extract complete text, author, date, and attachments.
 * - Autonomously detects and triggers physical file download for every attachment.
 * - Safely returns to the stream list via guarded BACK navigation.
 * - Continuously deduplicates via SHA-256 and syncs to Google Drive vault.
 */
class KidsAccessibilityService : AccessibilityService() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val classifier = ContentClassifier()
    private val deduplicationEngine = DeduplicationEngine()

    private var crawlerOverlay: FloatingCrawlerOverlay? = null
    private var lastActiveSchoolPackage: String? = null
    private var exitDebounceJob: Job? = null

    private var crawlerJob: Job? = null
    private val visitedPostFingerprints = ConcurrentHashMap.newKeySet<String>()
    private val capturedAttachmentNames = ConcurrentHashMap.newKeySet<String>()

    private val excludedChrome = setOf(
        "open navigation menu", "show menu", "more options", "navigate up", "back",
        "stream", "classwork", "people", "about", "join course", "view to-do list",
        "classroom", "google classroom", "class options", "close", "comments"
    )

    private val attachmentExts = listOf(
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".jpg", ".jpeg", ".png", ".mp4"
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

        // 1. If in an authorized school app, maintain/restore active session
        if (isAuthorizedSchoolApp(packageName)) {
            exitDebounceJob?.cancel()
            exitDebounceJob = null
            lastActiveSchoolPackage = packageName

            if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
                getOrCreateOverlay().show()
            }
            return
        }

        // 2. Ignore transient system surfaces (keyboards, system dialogs, document viewers)
        if (isTransientOrSystemPackage(packageName)) {
            return
        }

        // 3. User transitioned away to non-school app (Home launcher, WhatsApp, Settings, Recents)
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            handleAppExitEvent(packageName)
        }
    }

    private fun handleAppExitEvent(foreignPackage: String) {
        if (exitDebounceJob?.isActive == true) return

        exitDebounceJob = serviceScope.launch {
            delay(1200) // 1.2-second debounce for stability against transient window changes
            if (crawlerOverlay?.isAutoScrollingActive() == true || crawlerOverlay?.isShowing() == true) {
                CrawlerTraceLogger.log(
                    "DEEP_CRAWLER",
                    "Exited school app to \"$foreignPackage\". Auto-stopping capture, closing overlay, and triggering Drive sync."
                )
                stopDeepCrawl()
                crawlerOverlay?.dismissAndRemove()
                triggerDriveSync(applicationContext)
            }
        }
    }

    private fun getOrCreateOverlay(): FloatingCrawlerOverlay {
        if (crawlerOverlay == null) {
            crawlerOverlay = FloatingCrawlerOverlay(
                service = this,
                onStartAutoCapture = {
                    startDeepCrawl()
                },
                onStopAutoCapture = {
                    stopDeepCrawl()
                }
            )
        }
        return crawlerOverlay!!
    }

    private fun startDeepCrawl() {
        crawlerJob?.cancel()
        crawlerJob = serviceScope.launch(Dispatchers.Default) {
            CrawlerTraceLogger.log("DEEP_CRAWLER", "Starting deep crawl state machine...")
            runDeepCrawlLoop()
        }
    }

    private fun stopDeepCrawl() {
        crawlerJob?.cancel()
        crawlerJob = null
        CrawlerTraceLogger.log("DEEP_CRAWLER", "Deep crawl halted. All pending actions cancelled.")
    }

    private suspend fun runDeepCrawlLoop() {
        var consecutiveZeroDiscoveryCount = 0

        while (serviceScope.isActive && crawlerOverlay?.isAutoScrollingActive() == true) {
            try {
                val root = rootInActiveWindow
                if (root == null) {
                    delay(300)
                    continue
                }

                val currentPkg = root.packageName?.toString() ?: ""
                if (currentPkg != "com.google.android.apps.classroom") {
                    crawlerOverlay?.updateStatus("Status: Paused (External App)", currentPkg)
                    root.recycle()
                    delay(1000)
                    continue
                }

                // If somehow trapped in detail view on start/resume, return to stream
                if (isPostDetailView(root) && !isStreamOrClassworkView(root)) {
                    CrawlerTraceLogger.log("DEEP_CRAWLER", "Detected post detail on stream scan, returning to stream")
                    performReturnToStream(root)
                    root.recycle()
                    delay(700)
                    continue
                }

                // 1. Scan for the first unvisited post card in the safe viewport
                val unvisitedCard = findNextUnvisitedPost(root)
                root.recycle()

                if (unvisitedCard != null) {
                    consecutiveZeroDiscoveryCount = 0
                    val (title, fingerprint, clickableNode) = unvisitedCard
                    crawlerOverlay?.updateStatus("Status: Opening Post...", title)
                    CrawlerTraceLogger.log("DEEP_CRAWLER", "Tapping post card: \"$title\" [Fingerprint: $fingerprint]")

                    val clicked = clickableNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    clickableNode.recycle()

                    if (!clicked) {
                        CrawlerTraceLogger.log("DEEP_CRAWLER", "Failed to click post card \"$title\". Skipping.")
                        visitedPostFingerprints.add(fingerprint)
                        delay(400)
                        continue
                    }

                    // Wait up to 2500ms for Detail View to load
                    val enteredDetail = waitForCondition(timeoutMs = 2500, pollIntervalMs = 200) {
                        val active = rootInActiveWindow ?: return@waitForCondition false
                        val isDetail = isPostDetailView(active)
                        active.recycle()
                        isDetail
                    }

                    if (!enteredDetail) {
                        CrawlerTraceLogger.log("DEEP_CRAWLER", "Timed out waiting for detail view for \"$title\". Skipping.")
                        visitedPostFingerprints.add(fingerprint)
                        delay(400)
                        continue
                    }

                    // 2. We are in detail view: Extract details and download attachments
                    crawlerOverlay?.updateStatus("Status: Reading Detail...", title)
                    val detailRoot = rootInActiveWindow
                    if (detailRoot != null) {
                        try {
                            processPostDetailAndDownload(detailRoot, title)
                        } catch (e: Exception) {
                            CrawlerTraceLogger.log("DEEP_CRAWLER", "Error extracting detail: ${e.message}")
                        } finally {
                            detailRoot.recycle()
                        }
                    }

                    // 3. Guarded Return to Stream
                    crawlerOverlay?.updateStatus("Status: Returning to Stream...")
                    val returnRoot = rootInActiveWindow
                    if (returnRoot != null) {
                        performReturnToStream(returnRoot)
                        returnRoot.recycle()
                    }

                    // Wait up to 2000ms for Stream to re-settle
                    waitForCondition(timeoutMs = 2000, pollIntervalMs = 200) {
                        val active = rootInActiveWindow ?: return@waitForCondition false
                        val isStream = isStreamOrClassworkView(active)
                        active.recycle()
                        isStream
                    }

                    visitedPostFingerprints.add(fingerprint)
                    delay(600) // Stabilization delay after returning
                } else {
                    // All visible cards on this screen are visited -> Scroll forward
                    crawlerOverlay?.updateStatus("Status: Scrolling Stream...")
                    CrawlerTraceLogger.log("DEEP_CRAWLER", "All visible cards visited. Scrolling forward...")

                    var scrollFinished = false
                    crawlerOverlay?.performScroll {
                        scrollFinished = true
                    }

                    waitForCondition(timeoutMs = 1500, pollIntervalMs = 150) { scrollFinished }
                    delay(850) // Wait for views to settle and bind

                    // Check if new cards appeared after scroll
                    val checkRoot = rootInActiveWindow
                    val hasNew = if (checkRoot != null) {
                        val next = findNextUnvisitedPost(checkRoot)
                        checkRoot.recycle()
                        next != null
                    } else false

                    if (!hasNew) {
                        consecutiveZeroDiscoveryCount++
                        CrawlerTraceLogger.log("DEEP_CRAWLER", "Scroll yielded 0 new cards ($consecutiveZeroDiscoveryCount/2)")
                        if (consecutiveZeroDiscoveryCount >= 2) {
                            CrawlerTraceLogger.log("DEEP_CRAWLER", "End of stream reached. Completing capture.")
                            val totalNotices = crawlerOverlay?.getCapturedCount() ?: visitedPostFingerprints.size
                            val totalFiles = crawlerOverlay?.getCapturedAttachmentsCount() ?: capturedAttachmentNames.size
                            crawlerOverlay?.showCompletion(totalNotices, totalFiles) {
                                stopDeepCrawl()
                                triggerDriveSync(applicationContext)
                            }
                            break
                        }
                    } else {
                        consecutiveZeroDiscoveryCount = 0
                    }
                }
            } catch (e: Exception) {
                CrawlerTraceLogger.log("DEEP_CRAWLER", "Crawler loop error: ${e.message}")
                delay(600)
            }
        }
    }

    private suspend fun processPostDetailAndDownload(detailRoot: AccessibilityNodeInfo, fallbackTitle: String) {
        val db = KidsDatabase.getInstance(applicationContext)

        // Dismiss soft keyboard if focused in comment box
        clearFocusIfInputFocused(detailRoot)

        // Extract full post text elements
        val textList = mutableListOf<String>()
        collectAllText(detailRoot, textList)
        val combinedText = textList.joinToString("\n")
        val titleCandidate = textList.firstOrNull { item ->
            val lower = item.trim().lowercase()
            !excludedChrome.contains(lower) &&
                    !lower.startsWith("tab ") &&
                    !lower.startsWith("add class comment") &&
                    item.trim().length > 3
        }
        val title = titleCandidate?.take(80) ?: fallbackTitle
        val category = classifier.classify(title, combinedText)

        // Route to child
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
        val (_, _, savedChildName) = com.kids.collector.data.drive.DriveVaultManager.getSavedVaultPrefs(applicationContext)
        val router = MultiChildRouter(children)
        val targetChild = router.route("com.google.android.apps.classroom", title, combinedText)
        val targetChildId = targetChild?.childId ?: children.firstOrNull()?.childId ?: "child_$savedChildName"

        val hash = deduplicationEngine.computeNoticeHash(
            childId = targetChildId,
            sourceApp = "com.google.android.apps.classroom",
            title = title,
            body = combinedText
        )

        var noticeEntity = db.noticeDao().findByHash(hash)
        val noticeId = noticeEntity?.noticeId ?: UUID.randomUUID().toString()
        if (noticeEntity == null) {
            noticeEntity = NoticeEntity(
                noticeId = noticeId,
                childId = targetChildId,
                sourceApp = "com.google.android.apps.classroom",
                category = category.name,
                title = title,
                body = combinedText,
                sender = "Google Classroom",
                timestampMs = System.currentTimeMillis(),
                hashSha256 = hash,
                syncStatus = SyncStatus.PENDING.name,
                driveFileId = null,
                attachmentCount = 0
            )
            db.noticeDao().insert(noticeEntity)
            crawlerOverlay?.incrementNoticeCount()
            CrawlerTraceLogger.log("SCROLLER_ACCEPTED", "Notice backfilled: \"$title\" ($category)")
        }

        // 4. Discover and process attachments
        val attachments = extractDetailAttachments(detailRoot)
        CrawlerTraceLogger.log("DEEP_CRAWLER", "Discovered ${attachments.size} attachments for \"$title\"")

        for ((index, att) in attachments.withIndex()) {
            val fileHash = "${noticeId}_${att.fileName}".hashCode().toString()
            val existingAtt = db.attachmentDao().findByFileHash(fileHash)
            if (existingAtt == null) {
                val attEntity = AttachmentEntity(
                    attachmentId = UUID.randomUUID().toString(),
                    noticeId = noticeId,
                    fileName = att.fileName.take(60),
                    localUri = "",
                    mimeType = if (att.fileName.contains(".pdf", true)) "application/pdf"
                    else if (att.fileName.matches(Regex(".*\\.(jpg|jpeg|png)$", RegexOption.IGNORE_CASE))) "image/jpeg"
                    else "application/octet-stream",
                    sizeBytes = 0L,
                    fileHash = fileHash,
                    ocrText = null,
                    pageCount = 1,
                    driveFileId = null,
                    syncStatus = SyncStatus.PENDING.name
                )
                db.attachmentDao().insert(attEntity)
            }

            // Click download button or chip
            if (att.downloadNode != null && att.downloadNode.isClickable) {
                crawlerOverlay?.updateStatus("Downloading (${index + 1}/${attachments.size})...", att.fileName)
                CrawlerTraceLogger.log("ATTACHMENT_DOWNLOAD", "Tapping download button for \"${att.fileName}\"")
                att.downloadNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                crawlerOverlay?.incrementAttachmentCount()
                delay(800) // Calibrated debounce between downloads
            } else if (att.clickableChip != null && att.clickableChip.isClickable) {
                crawlerOverlay?.updateStatus("Opening (${index + 1}/${attachments.size})...", att.fileName)
                CrawlerTraceLogger.log("ATTACHMENT_AUTO_TAP", "Tapping attachment chip for \"${att.fileName}\"")
                att.clickableChip.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                crawlerOverlay?.incrementAttachmentCount()
                delay(800)
            }

            att.downloadNode?.recycle()
            att.clickableChip?.recycle()
        }

        if (attachments.isNotEmpty()) {
            delay(1000) // Allow system DownloadManager to register downloads
            com.kids.collector.data.drive.DownloadFolderObserver.scanLocalAttachments(applicationContext)
        }
    }

    private fun performReturnToStream(root: AccessibilityNodeInfo) {
        val navUp = findNavigateUpButton(root)
        if (navUp != null) {
            CrawlerTraceLogger.log("DEEP_CRAWLER", "Clicking Navigate Up to return to stream")
            navUp.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            navUp.recycle()
        } else {
            CrawlerTraceLogger.log("DEEP_CRAWLER", "Dispatching GLOBAL_ACTION_BACK to return to stream")
            performGlobalAction(GLOBAL_ACTION_BACK)
        }
    }

    private data class UnvisitedCard(
        val title: String,
        val fingerprint: String,
        val clickableNode: AccessibilityNodeInfo
    )

    private fun findNextUnvisitedPost(rootNode: AccessibilityNodeInfo): UnvisitedCard? {
        val postCards = findPostCards(rootNode)
        val displayMetrics = resources.displayMetrics
        val minTop = 140
        val maxBottom = displayMetrics.heightPixels - 170

        val rect = Rect()
        for (card in postCards) {
            card.getBoundsInScreen(rect)
            // Viewport guard: Skip cards partially occluded at top or bottom
            if (rect.top < minTop || rect.bottom > maxBottom) {
                card.recycle()
                continue
            }

            val cardItems = mutableListOf<String>()
            collectQuickText(card, cardItems)
            val combinedText = cardItems.joinToString(" ")
            if (combinedText.length <= 20) {
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
            val title = titleCandidate?.take(80) ?: "Classroom Notice"
            val fingerprint = computeCardFingerprint(cardItems)

            if (!visitedPostFingerprints.contains(fingerprint)) {
                val clickable = findClickableAncestor(card) ?: AccessibilityNodeInfo.obtain(card)
                card.recycle()
                return UnvisitedCard(title, fingerprint, clickable)
            }
            card.recycle()
        }
        return null
    }

    private fun computeCardFingerprint(cardItems: List<String>): String {
        val content = cardItems
            .filter { !excludedChrome.contains(it.lowercase().trim()) }
            .joinToString("|")
        return try {
            val md = MessageDigest.getInstance("SHA-256")
            val digest = md.digest(content.toByteArray(Charsets.UTF_8))
            digest.take(8).joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            content.hashCode().toString()
        }
    }

    private data class ExtractedAttachmentDetail(
        val fileName: String,
        val downloadNode: AccessibilityNodeInfo?,
        val clickableChip: AccessibilityNodeInfo?
    )

    private fun extractDetailAttachments(root: AccessibilityNodeInfo): List<ExtractedAttachmentDetail> {
        val results = mutableListOf<ExtractedAttachmentDetail>()
        val filenameNodes = mutableListOf<Pair<String, AccessibilityNodeInfo>>()
        findNodesWithExtensions(root, attachmentExts, filenameNodes)

        for ((fileName, nameNode) in filenameNodes) {
            val container = findAttachmentContainer(nameNode)
            val downloadBtn = if (container != null) {
                findDownloadButtonNode(container)
            } else {
                findDownloadButtonNode(nameNode)
            }
            val clickableChip = findClickableAncestor(nameNode)

            results.add(ExtractedAttachmentDetail(fileName, downloadBtn, clickableChip))
            nameNode.recycle()
            container?.recycle()
        }
        return results
    }

    private fun findNodesWithExtensions(
        node: AccessibilityNodeInfo,
        extensions: List<String>,
        outList: MutableList<Pair<String, AccessibilityNodeInfo>>
    ) {
        val text = node.text?.toString()?.trim()
        val desc = node.contentDescription?.toString()?.trim()
        val candidate = when {
            !text.isNullOrBlank() && extensions.any { text.contains(it, ignoreCase = true) } -> text
            !desc.isNullOrBlank() && extensions.any { desc.contains(it, ignoreCase = true) } -> desc
            else -> null
        }

        if (candidate != null && outList.none { it.first == candidate.take(60) }) {
            outList.add(candidate.take(60) to AccessibilityNodeInfo.obtain(node))
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            findNodesWithExtensions(child, extensions, outList)
            child.recycle()
        }
    }

    private fun findAttachmentContainer(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        var parent = node.parent
        var depth = 0
        while (parent != null && depth < 3) {
            if (parent.childCount > 1 || parent.isClickable) {
                return parent
            }
            parent = parent.parent
            depth++
        }
        return null
    }

    private fun isStreamOrClassworkView(rootNode: AccessibilityNodeInfo): Boolean {
        val textList = mutableListOf<String>()
        collectQuickText(rootNode, textList)
        val combined = textList.joinToString(" ").lowercase()
        val hasBottomTabs = (combined.contains("stream") && combined.contains("classwork")) ||
                combined.contains("people") ||
                combined.contains("tab 1 of 3") ||
                combined.contains("tab 2 of 3")
        val hasBackArrow = hasNavigateUpButton(rootNode)
        return hasBottomTabs && !hasBackArrow
    }

    private fun isPostDetailView(rootNode: AccessibilityNodeInfo): Boolean {
        val hasBackArrow = hasNavigateUpButton(rootNode)
        val textList = mutableListOf<String>()
        collectQuickText(rootNode, textList)
        val combined = textList.joinToString(" ").lowercase()
        val hasDetailIndicators = combined.contains("add class comment") ||
                combined.contains("class comments") ||
                combined.contains("your work") ||
                combined.contains("assigned") ||
                combined.contains("attachment")
        val hasBottomTabs = combined.contains("tab 1 of 3") && combined.contains("tab 2 of 3")
        return hasBackArrow || (hasDetailIndicators && !hasBottomTabs)
    }

    private fun hasNavigateUpButton(node: AccessibilityNodeInfo): Boolean {
        val btn = findNavigateUpButton(node)
        val exists = btn != null
        btn?.recycle()
        return exists
    }

    private fun findNavigateUpButton(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val desc = node.contentDescription?.toString()?.lowercase() ?: ""
        val text = node.text?.toString()?.lowercase() ?: ""
        if (desc == "navigate up" || desc == "back" || text == "back" || desc.contains("navigate up")) {
            if (node.isClickable) return AccessibilityNodeInfo.obtain(node)
            var parent = node.parent
            while (parent != null) {
                if (parent.isClickable) return parent
                parent = parent.parent
            }
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findNavigateUpButton(child)
            child.recycle()
            if (found != null) return found
        }
        return null
    }

    private fun clearFocusIfInputFocused(rootNode: AccessibilityNodeInfo) {
        val input = findInputNode(rootNode)
        if (input != null) {
            if (input.isFocused) {
                input.performAction(AccessibilityNodeInfo.ACTION_CLEAR_FOCUS)
            }
            input.recycle()
        }
    }

    private fun findInputNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val className = node.className?.toString() ?: ""
        if (className.contains("EditText", ignoreCase = true)) {
            return AccessibilityNodeInfo.obtain(node)
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findInputNode(child)
            child.recycle()
            if (found != null) return found
        }
        return null
    }

    private suspend fun waitForCondition(
        timeoutMs: Long,
        pollIntervalMs: Long = 150,
        condition: () -> Boolean
    ): Boolean {
        val start = System.currentTimeMillis()
        while (System.currentTimeMillis() - start < timeoutMs) {
            if (!serviceScope.isActive) return false
            if (condition()) return true
            delay(pollIntervalMs)
        }
        return false
    }

    private fun findDownloadButtonNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val text = node.text?.toString()?.lowercase() ?: ""
        val desc = node.contentDescription?.toString()?.lowercase() ?: ""
        val viewId = node.viewIdResourceName?.lowercase() ?: ""

        if (text == "download" || desc.contains("download") || desc.contains("save to device") || desc.contains("save offline") || viewId.contains("download")) {
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

    private fun collectAllText(node: AccessibilityNodeInfo, outList: MutableList<String>) {
        val t = node.text?.toString()?.trim()
        val d = node.contentDescription?.toString()?.trim()
        val candidate = when {
            !t.isNullOrBlank() && t.length > 1 -> t
            !d.isNullOrBlank() && d.length > 1 -> d
            else -> null
        }
        if (candidate != null && !outList.contains(candidate)) {
            outList.add(candidate)
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            collectAllText(child, outList)
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

    private fun isAuthorizedSchoolApp(packageName: String): Boolean {
        val lower = packageName.lowercase()
        return lower.contains("classroom") ||
                lower.contains("campuscare") ||
                lower.contains("toddle") ||
                lower.contains("edunext")
    }

    private fun isTransientOrSystemPackage(pkg: String): Boolean {
        val lower = pkg.lowercase()
        return lower.contains("systemui") ||
                lower.contains("inputmethod") ||
                lower.contains("gboard") ||
                lower.contains("keyboard") ||
                lower.contains("swiftkey") ||
                lower.contains("samsungime") ||
                lower == "android" ||
                lower.contains("resolver") ||
                lower.contains("chooser") ||
                lower.contains("documentsui") ||
                lower.contains("miui.securitycenter") ||
                lower.contains("google.android.apps.docs")
    }

    private fun isHomeScreenOrLauncher(pkg: String): Boolean {
        val lower = pkg.lowercase()
        return lower.contains("launcher") ||
                lower.contains("home") ||
                lower.contains("miui.home")
    }

    override fun onInterrupt() {
        Log.w(TAG, "KidsAccessibilityService interrupted")
        exitDebounceJob?.cancel()
        exitDebounceJob = null
        stopDeepCrawl()
        crawlerOverlay?.dismissAndRemove()
    }

    override fun onDestroy() {
        super.onDestroy()
        exitDebounceJob?.cancel()
        exitDebounceJob = null
        stopDeepCrawl()
        crawlerOverlay?.dismissAndRemove()
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
                ExistingWorkPolicy.APPEND_OR_REPLACE,
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
