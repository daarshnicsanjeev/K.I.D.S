package com.kids.collector.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.accessibilityservice.GestureDescription
import android.content.Context
import android.graphics.Path
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
import java.io.File
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
        "classroom", "google classroom", "class options", "close", "comments",
        "back to classwork page", "back to classwork", "back to stream", "back to people",
        "attachments", "class comments", "no comments", "add class comment",
        "save all files offline", "save all offline", "save offline", "more options for attachment",
        "for your reference", "for reference", "0 class comments", "class comments for",
        "class comment", "post by"
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
                    val (title, fullText, fingerprint, clickableNode, cardBounds) = unvisitedCard
                    crawlerOverlay?.updateStatus("Status: Opening Post...", title)
                    CrawlerTraceLogger.log(
                        "DEEP_CRAWLER",
                        "Opening post card at (${cardBounds.centerX()}, ${cardBounds.centerY()}): \"$title\" [Fingerprint: $fingerprint]"
                    )

                    // 1. Attempt native accessibility click
                    clickableNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    clickableNode.recycle()

                    // 2. Dispatch physical tap gesture to guarantee detail view opens
                    dispatchTap(cardBounds.centerX().toFloat(), cardBounds.centerY().toFloat())

                    // Wait up to 800ms for Detail View to load
                    val enteredDetail = waitForCondition(timeoutMs = 800, pollIntervalMs = 150) {
                        val active = rootInActiveWindow ?: return@waitForCondition false
                        val isDetail = isPostDetailView(active)
                        active.recycle()
                        isDetail
                    }

                    if (!enteredDetail) {
                        CrawlerTraceLogger.log("DEEP_CRAWLER", "Stream card did not open detail view (plain text notice). Ingesting directly from stream.")
                        val db = KidsDatabase.getInstance(applicationContext)
                        val childEntities = db.childProfileDao().getAllChildren().firstOrNull().orEmpty()
                        val children = childEntities.map { e ->
                            ChildProfile(e.childId, e.firstName, e.grade, e.academicYear, e.schoolName, e.accountEmail, e.disambiguationTag, e.photoUri, e.channels, e.createdAtMs)
                        }
                        val (_, _, savedChildName) = com.kids.collector.data.drive.DriveVaultManager.getSavedVaultPrefs(applicationContext)
                        val router = MultiChildRouter(children)
                        val targetChild = router.route("com.google.android.apps.classroom", title, fullText)
                        val targetChildId = targetChild?.childId ?: children.firstOrNull()?.childId ?: "child_$savedChildName"

                        val hash = deduplicationEngine.computeNoticeHash(
                            childId = targetChildId,
                            sourceApp = "com.google.android.apps.classroom",
                            title = title,
                            body = fullText
                        )

                        val existing = db.noticeDao().findByHash(hash)
                        if (existing == null) {
                            val noticeEntity = NoticeEntity(
                                noticeId = UUID.randomUUID().toString(),
                                childId = targetChildId,
                                sourceApp = "com.google.android.apps.classroom",
                                category = classifier.classify(title, fullText).name,
                                title = title,
                                body = fullText,
                                sender = "Google Classroom",
                                timestampMs = System.currentTimeMillis(),
                                hashSha256 = hash,
                                syncStatus = SyncStatus.PENDING.name,
                                driveFileId = null,
                                attachmentCount = 0
                            )
                            db.noticeDao().insert(noticeEntity)
                            crawlerOverlay?.incrementNoticeCount()
                            CrawlerTraceLogger.log("SCROLLER_ACCEPTED", "Notice backfilled from stream: \"$title\"")
                        }
                        visitedPostFingerprints.add(fingerprint)
                        delay(200)
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

                    // 3. Guarded Return to Stream (up to 3 attempts to close any preview and return to Stream)
                    crawlerOverlay?.updateStatus("Status: Returning to Stream...")
                    var returnAttempts = 0
                    while (returnAttempts < 3) {
                        val active = rootInActiveWindow ?: break
                        if (isStreamOrClassworkView(active)) {
                            active.recycle()
                            break
                        }
                        performReturnToStream(active)
                        active.recycle()
                        delay(600)
                        returnAttempts++
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
                        CrawlerTraceLogger.log("DEEP_CRAWLER", "Scroll yielded 0 new cards ($consecutiveZeroDiscoveryCount/5)")
                        if (consecutiveZeroDiscoveryCount < 5) {
                            crawlerOverlay?.updateStatus("Checking for earlier posts...", "Waiting for stream pagination ($consecutiveZeroDiscoveryCount/5)")
                            delay(1500) // Allow Classroom time to fetch older posts from network
                        } else {
                            CrawlerTraceLogger.log("DEEP_CRAWLER", "End of stream confirmed after 5 scrolls. Completing capture.")
                            val totalNotices = crawlerOverlay?.getCapturedCount() ?: 0
                            val totalFiles = crawlerOverlay?.getCapturedAttachmentsCount() ?: 0
                            if (totalNotices > 0) {
                                crawlerOverlay?.showCompletion(totalNotices, totalFiles) {
                                    stopDeepCrawl()
                                    triggerDriveSync(applicationContext)
                                }
                            } else {
                                crawlerOverlay?.updateStatus("✓ Stream Up to Date", "All current stream posts already captured")
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
                    !excludedChrome.any { lower.startsWith(it) } &&
                    !lower.startsWith("tab ") &&
                    !lower.startsWith("add class comment") &&
                    !lower.startsWith("0 class comments") &&
                    !lower.contains("class comments") &&
                    !lower.startsWith("back to ") &&
                    !lower.startsWith("more options") &&
                    !lower.startsWith("for your reference") &&
                    !lower.startsWith("for reference") &&
                    item.trim().length > 3
        }
        val cleanFallback = if (fallbackTitle.isNotBlank() && fallbackTitle != "Classroom Notice") fallbackTitle else null
        val title = cleanFallback ?: titleCandidate?.take(80) ?: "Classroom Notice"
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
        // 4. Discover and register attachments
        val attachments = extractDetailAttachments(detailRoot)
        CrawlerTraceLogger.log("DEEP_CRAWLER", "Discovered ${attachments.size} attachments for \"$title\"")

        for (att in attachments) {
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
        }

        // Autonomous Attachment Download: Systematically tap each attachment chip / download button
        for ((index, att) in attachments.withIndex()) {
            val fileHash = "${noticeId}_${att.fileName}".hashCode().toString()
            val existingAtt = db.attachmentDao().findByFileHash(fileHash)
            if (existingAtt != null && existingAtt.syncStatus == SyncStatus.SYNCED.name &&
                !existingAtt.driveFileId.isNullOrBlank() && !existingAtt.driveFileId.startsWith("virtual_")) {
                continue // Already physically downloaded and synced
            }

            if (att.downloadNode != null && att.downloadNode.isClickable) {
                crawlerOverlay?.updateStatus("Downloading (${index + 1}/${attachments.size})...", att.fileName)
                CrawlerTraceLogger.log("ATTACHMENT_DOWNLOAD", "Tapping download button for \"${att.fileName}\"")
                val clicked = att.downloadNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                if (!clicked) {
                    val b = Rect()
                    att.downloadNode.getBoundsInScreen(b)
                    dispatchTap(b.centerX().toFloat(), b.centerY().toFloat())
                }
                delay(1000) // Calibrated debounce between downloads
            } else if (att.clickableChip != null && att.clickableChip.isClickable) {
                crawlerOverlay?.updateStatus("Opening (${index + 1}/${attachments.size})...", att.fileName)
                CrawlerTraceLogger.log("ATTACHMENT_AUTO_TAP", "Tapping attachment chip for \"${att.fileName}\"")
                val clicked = att.clickableChip.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                if (!clicked) {
                    val b = Rect()
                    att.clickableChip.getBoundsInScreen(b)
                    dispatchTap(b.centerX().toFloat(), b.centerY().toFloat())
                }
                delay(800)

                // Automate Share or Download inside viewer and return to detail view
                automateViewerShareOrDownload(att.fileName)

                // Check if file was captured by ShareTargetActivity
                val updatedAtt = db.attachmentDao().findByFileHash(fileHash)
                if (updatedAtt != null && updatedAtt.localUri.isNotBlank() && File(updatedAtt.localUri).exists()) {
                    if (capturedAttachmentNames.add(att.fileName)) {
                        crawlerOverlay?.incrementAttachmentCount()
                    }
                }
            }

            att.downloadNode?.recycle()
            att.clickableChip?.recycle()
        }

        if (attachments.isNotEmpty()) {
            delay(1000) // Allow file staging to finalize
            val stagedCount = com.kids.collector.data.drive.DownloadFolderObserver.scanLocalAttachments(applicationContext)
            for (s in 0 until stagedCount) {
                crawlerOverlay?.incrementAttachmentCount()
            }
        }
    }

    /**
     * Autonomously triggers Share or Download from document viewer/preview screen,
     * selects "K.I.D.S. Vault" from the system share sheet if opened,
     * and returns back to Classroom detail view.
     */
    private suspend fun automateViewerShareOrDownload(fileName: String) {
        // Wait up to 1500ms for viewer or preview to open
        val openedViewer = waitForCondition(timeoutMs = 1500, pollIntervalMs = 200) {
            val root = rootInActiveWindow ?: return@waitForCondition false
            val isNotDetail = !isPostDetailView(root) && !isStreamOrClassworkView(root)
            root.recycle()
            isNotDetail
        }

        if (!openedViewer) {
            CrawlerTraceLogger.log("ATTACHMENT_SHARE", "No external/internal viewer opened for \"$fileName\"")
            return
        }

        CrawlerTraceLogger.log("ATTACHMENT_SHARE", "Viewer detected for \"$fileName\". Scanning for Share/Download actions...")

        // Step A: Check if a direct Share or Download button exists in the viewer
        var active = rootInActiveWindow
        var sharedOrDownloaded = false

        if (active != null) {
            // 1. Look for direct Share / Send button
            val shareBtn = findShareButton(active)
            if (shareBtn != null) {
                CrawlerTraceLogger.log("ATTACHMENT_SHARE", "Found direct Share button. Clicking it.")
                crawlerOverlay?.updateStatus("Sharing...", fileName)
                val clicked = shareBtn.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                if (!clicked) {
                    val b = Rect()
                    shareBtn.getBoundsInScreen(b)
                    dispatchTap(b.centerX().toFloat(), b.centerY().toFloat())
                }
                shareBtn.recycle()
                sharedOrDownloaded = true
            } else {
                // 2. Look for direct Download / Save offline button in viewer
                val downloadBtn = findDownloadButtonNode(active)
                if (downloadBtn != null) {
                    CrawlerTraceLogger.log("ATTACHMENT_SHARE", "Found direct Download button in viewer. Clicking it.")
                    crawlerOverlay?.updateStatus("Downloading...", fileName)
                    val clicked = downloadBtn.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    if (!clicked) {
                        val b = Rect()
                        downloadBtn.getBoundsInScreen(b)
                        dispatchTap(b.centerX().toFloat(), b.centerY().toFloat())
                    }
                    downloadBtn.recycle()
                    sharedOrDownloaded = true
                } else {
                    // 3. Look for overflow "More options" button
                    val overflow = findOverflowMenuButton(active)
                    if (overflow != null) {
                        CrawlerTraceLogger.log("ATTACHMENT_SHARE", "Clicking overflow menu in viewer...")
                        val clicked = overflow.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                        if (!clicked) {
                            val b = Rect()
                            overflow.getBoundsInScreen(b)
                            dispatchTap(b.centerX().toFloat(), b.centerY().toFloat())
                        }
                        overflow.recycle()
                        delay(400) // Wait for popup menu to appear

                        val popupRoot = rootInActiveWindow
                        if (popupRoot != null) {
                            val popupShare = findShareButton(popupRoot) ?: findDownloadButtonNode(popupRoot)
                            if (popupShare != null) {
                                CrawlerTraceLogger.log("ATTACHMENT_SHARE", "Found Share/Download in overflow menu. Clicking it.")
                                val clickOk = popupShare.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                                if (!clickOk) {
                                    val b = Rect()
                                    popupShare.getBoundsInScreen(b)
                                    dispatchTap(b.centerX().toFloat(), b.centerY().toFloat())
                                }
                                popupShare.recycle()
                                sharedOrDownloaded = true
                            }
                            popupRoot.recycle()
                        }
                    }
                }
            }
            active.recycle()
        }

        // Step B: If Share action was triggered, select "K.I.D.S. Vault" in system chooser
        if (sharedOrDownloaded) {
            delay(500)
            selectKidsInSystemChooser()
        }

        // Step C: Guarded return to detail view (up to 3 attempts)
        delay(400)
        var returnAttempts = 0
        while (returnAttempts < 3) {
            val cur = rootInActiveWindow ?: break
            if (isPostDetailView(cur) || isStreamOrClassworkView(cur)) {
                cur.recycle()
                break
            }
            performReturnToStream(cur)
            cur.recycle()
            delay(500)
            returnAttempts++
        }
    }

    private fun findShareButton(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val desc = node.contentDescription?.toString()?.lowercase() ?: ""
        val text = node.text?.toString()?.lowercase() ?: ""
        val viewId = node.viewIdResourceName?.lowercase() ?: ""

        val isShare = (desc == "share" || desc.contains("share") || desc.contains("send a copy") || desc.contains("send file") || desc.contains("export") || desc.contains("open in") || desc.contains("open with")) ||
                (text == "share" || text.contains("send a copy") || text.contains("send file") || text.contains("export") || text.contains("open in") || text.contains("open with")) ||
                viewId.contains("share") || viewId.contains("export")

        if (isShare) {
            if (node.isClickable) return AccessibilityNodeInfo.obtain(node)
            var parent = node.parent
            while (parent != null) {
                if (parent.isClickable) return parent
                parent = parent.parent
            }
            return AccessibilityNodeInfo.obtain(node)
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findShareButton(child)
            child.recycle()
            if (found != null) return found
        }
        return null
    }

    private fun findOverflowMenuButton(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val desc = node.contentDescription?.toString()?.lowercase() ?: ""
        val text = node.text?.toString()?.lowercase() ?: ""
        val viewId = node.viewIdResourceName?.lowercase() ?: ""

        val isOverflow = desc == "more options" || desc.contains("more options") ||
                desc == "overflow" || desc.contains("overflow") ||
                text == "more options" ||
                viewId.contains("overflow") || viewId.contains("more_options")

        if (isOverflow) {
            if (node.isClickable) return AccessibilityNodeInfo.obtain(node)
            var parent = node.parent
            while (parent != null) {
                if (parent.isClickable) return parent
                parent = parent.parent
            }
            return AccessibilityNodeInfo.obtain(node)
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findOverflowMenuButton(child)
            child.recycle()
            if (found != null) return found
        }
        return null
    }

    private suspend fun selectKidsInSystemChooser() {
        // Wait up to 1500ms for system chooser to appear
        waitForCondition(timeoutMs = 1500, pollIntervalMs = 200) {
            val root = rootInActiveWindow ?: return@waitForCondition false
            val pkg = root.packageName?.toString()?.lowercase() ?: ""
            val isChooser = pkg.contains("resolver") || pkg.contains("chooser") ||
                    pkg.contains("android") || pkg.contains("systemui")
            val hasKidsTarget = findKidsShareTarget(root) != null
            root.recycle()
            isChooser && hasKidsTarget
        }

        val chooserRoot = rootInActiveWindow ?: return
        val target = findKidsShareTarget(chooserRoot)
        if (target != null) {
            CrawlerTraceLogger.log("ATTACHMENT_SHARE", "Found \"K.I.D.S. Vault\" target in share sheet. Selecting it.")
            val clicked = target.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            if (!clicked) {
                val b = Rect()
                target.getBoundsInScreen(b)
                dispatchTap(b.centerX().toFloat(), b.centerY().toFloat())
            }
            target.recycle()
            delay(500) // Allow ShareTargetActivity to process intent
        } else {
            CrawlerTraceLogger.log("ATTACHMENT_SHARE", "K.I.D.S. Vault not visible in immediate chooser view")
        }
        chooserRoot.recycle()
    }

    private fun findKidsShareTarget(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val text = node.text?.toString()?.lowercase() ?: ""
        val desc = node.contentDescription?.toString()?.lowercase() ?: ""

        val isTarget = text.contains("k.i.d.s") || desc.contains("k.i.d.s") ||
                text.contains("kids vault") || desc.contains("kids vault")

        if (isTarget) {
            if (node.isClickable) return AccessibilityNodeInfo.obtain(node)
            var parent = node.parent
            while (parent != null) {
                if (parent.isClickable) return parent
                parent = parent.parent
            }
            return AccessibilityNodeInfo.obtain(node)
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findKidsShareTarget(child)
            child.recycle()
            if (found != null) return found
        }
        return null
    }

    private suspend fun performReturnToStream(root: AccessibilityNodeInfo) {
        val navUp = findNavigateUpButton(root)
        if (navUp != null) {
            CrawlerTraceLogger.log("DEEP_CRAWLER", "Clicking Navigate Up to return to stream")
            val clicked = navUp.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            if (!clicked) {
                val b = Rect()
                navUp.getBoundsInScreen(b)
                dispatchTap(b.centerX().toFloat(), b.centerY().toFloat())
            }
            navUp.recycle()
        } else {
            CrawlerTraceLogger.log("DEEP_CRAWLER", "Dispatching GLOBAL_ACTION_BACK to return to stream")
            performGlobalAction(GLOBAL_ACTION_BACK)
        }
    }

    private suspend fun dispatchTap(x: Float, y: Float): Boolean {
        val path = Path().apply {
            moveTo(x, y)
        }
        val stroke = GestureDescription.StrokeDescription(path, 0, 50)
        val gesture = GestureDescription.Builder().addStroke(stroke).build()
        var completed = false
        val dispatched = dispatchGesture(gesture, object : AccessibilityService.GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                completed = true
            }

            override fun onCancelled(gestureDescription: GestureDescription?) {
                completed = false
            }
        }, null)
        delay(120)
        return dispatched && completed
    }

    private data class UnvisitedCard(
        val title: String,
        val fullText: String,
        val fingerprint: String,
        val clickableNode: AccessibilityNodeInfo,
        val bounds: Rect
    )

    private fun findNextUnvisitedPost(rootNode: AccessibilityNodeInfo): UnvisitedCard? {
        val postCards = findPostCards(rootNode)
        val displayMetrics = resources.displayMetrics
        val minTop = 140
        val maxBottom = displayMetrics.heightPixels - 170

        val rect = Rect()
        for (card in postCards) {
            card.getBoundsInScreen(rect)
            
            // Viewport guard: Ensure card is visibly accessible (at least 35% visible or center in viewport)
            val cardHeight = rect.height().coerceAtLeast(1)
            val visibleTop = rect.top.coerceAtLeast(minTop)
            val visibleBottom = rect.bottom.coerceAtMost(maxBottom)
            val visibleHeight = (visibleBottom - visibleTop).coerceAtLeast(0)
            val visibilityFraction = visibleHeight.toFloat() / cardHeight.toFloat()

            if (visibilityFraction < 0.35f && rect.centerY() !in minTop..maxBottom) {
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

            val lowerCombined = combinedText.lowercase().trim()
            if (lowerCombined.contains("class comments for") ||
                lowerCombined.startsWith("0 class comments") ||
                lowerCombined.startsWith("add class comment") ||
                lowerCombined.matches(Regex("""^\d+\s+class\s+comments?.*"""))
            ) {
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
                        !lower.contains("class comments") &&
                        item.trim().length > 3
            }
            val title = titleCandidate?.take(80) ?: "Classroom Notice"
            val fingerprint = computeCardFingerprint(cardItems)

            if (!visitedPostFingerprints.contains(fingerprint)) {
                val clickable = findClickableAncestor(card) ?: AccessibilityNodeInfo.obtain(card)
                val safeCenterY = rect.centerY().coerceIn(minTop + 40, maxBottom - 40)
                val cardBounds = Rect(rect.left, safeCenterY - 20, rect.right, safeCenterY + 20)
                card.recycle()
                return UnvisitedCard(title, combinedText, fingerprint, clickable, cardBounds)
            }
            card.recycle()
        }
        return null
    }

    private fun computeCardFingerprint(cardItems: List<String>): String {
        val commentPattern = Regex("""\b\d+\s+class\s+comments?.*""", RegexOption.IGNORE_CASE)
        val content = cardItems
            .map { it.replace(commentPattern, "").trim() }
            .filter { item ->
                val lower = item.lowercase().trim()
                !excludedChrome.contains(lower) &&
                        !excludedChrome.any { lower.startsWith(it) } &&
                        !lower.contains("class comments for") &&
                        item.isNotBlank()
            }
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

        val isOptionsButton = (desc?.contains("options", ignoreCase = true) == true) ||
                (text?.contains("options", ignoreCase = true) == true) ||
                (desc?.contains("more options", ignoreCase = true) == true)

        val candidate = when {
            isOptionsButton -> null
            !text.isNullOrBlank() && (extensions.any { text.contains(it, ignoreCase = true) } || text.endsWith("...")) -> {
                if (text.contains('.')) text else "$text.pdf"
            }
            !desc.isNullOrBlank() && (extensions.any { desc.contains(it, ignoreCase = true) } || (desc.contains("attachment", ignoreCase = true) && !desc.contains("options", ignoreCase = true)) || desc.contains("pdf", ignoreCase = true)) -> {
                if (desc.contains('.')) desc else "$desc.pdf"
            }
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
        return hasBottomTabs
    }

    private fun isDocumentViewerScreen(combinedText: String): Boolean {
        val lower = combinedText.lowercase()
        return lower.contains("page 1 of") ||
                lower.contains("page 1/") ||
                lower.contains("fit to width") ||
                lower.contains("fit to screen") ||
                lower.contains("zoom in") ||
                lower.contains("send a copy") ||
                lower.contains("send file")
    }

    private fun isPostDetailView(rootNode: AccessibilityNodeInfo): Boolean {
        val textList = mutableListOf<String>()
        collectQuickText(rootNode, textList)
        val combined = textList.joinToString(" ").lowercase()

        // 1. If it has document viewer controls, it is a document viewer, not post detail
        if (isDocumentViewerScreen(combined)) {
            return false
        }

        val hasDetailIndicators = combined.contains("add class comment") ||
                combined.contains("class comments") ||
                combined.contains("your work") ||
                combined.contains("assigned") ||
                combined.contains("attachments") ||
                combined.contains("attachment") ||
                combined.contains("save all files offline") ||
                combined.contains("save all") ||
                combined.contains("save offline") ||
                combined.contains("for your reference") ||
                combined.contains("points")
        val hasBottomTabs = (combined.contains("stream") && combined.contains("classwork")) ||
                combined.contains("tab 1 of 3") ||
                combined.contains("tab 2 of 3")
        val hasBackArrow = hasNavigateUpButton(rootNode)
        return hasDetailIndicators && hasBackArrow && !hasBottomTabs
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
        val viewId = node.viewIdResourceName?.lowercase() ?: ""
        if (desc == "navigate up" || desc == "back" || text == "back" ||
            desc.contains("navigate up") || desc.contains("back") ||
            viewId.contains("up") || viewId.contains("back") || viewId.contains("action_bar")
        ) {
            if (node.isClickable) return AccessibilityNodeInfo.obtain(node)
            var parent = node.parent
            while (parent != null) {
                if (parent.isClickable) return parent
                parent = parent.parent
            }
            return AccessibilityNodeInfo.obtain(node)
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findNavigateUpButton(child)
            child.recycle()
            if (found != null) return found
        }
        return null
    }

    private fun findSaveAllOfflineButton(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val text = node.text?.toString()?.lowercase() ?: ""
        val desc = node.contentDescription?.toString()?.lowercase() ?: ""
        if (text.contains("save all files offline") || desc.contains("save all files offline") ||
            text.contains("save all") || desc.contains("save all") ||
            text.contains("save offline") || desc.contains("save offline")
        ) {
            if (node.isClickable) return AccessibilityNodeInfo.obtain(node)
            var parent = node.parent
            while (parent != null) {
                if (parent.isClickable) return parent
                parent = parent.parent
            }
            return AccessibilityNodeInfo.obtain(node)
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findSaveAllOfflineButton(child)
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
                lower.contains("google.android.apps.docs") ||
                lower.contains("adobe.reader") ||
                lower.contains("cn.wps") ||
                lower.contains("viewer") ||
                lower.contains("microsoft.office")
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
