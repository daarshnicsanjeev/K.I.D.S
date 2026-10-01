package com.kids.collector.service

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.graphics.Rect
import android.view.accessibility.AccessibilityNodeInfo
import com.kids.collector.data.db.AttachmentEntity
import com.kids.collector.data.db.KidsDatabase
import com.kids.collector.domain.classifier.ClassroomDateParser
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import java.util.Calendar
import java.util.Locale

/**
 * Autonomous Google Drive Shared Tab Harvester.
 *
 * Implements Phase 3 of the accelerated ingestion pipeline:
 * 1. Verifies that the Google Drive app (com.google.android.apps.docs) is active in the child's school account.
 * 2. Navigates to the "Shared" ("Shared with me") tab.
 * 3. Matches visible files against pending Classroom attachments using both normalized filename and post date/time.
 * 4. Multi-selects batches of 15–20 matching files while strictly skipping folders (preventing Drive from hiding "Send a copy").
 * 5. Recursively enters relevant folders to harvest nested files without selecting the folder itself.
 * 6. Dispatches "Send a copy" -> "K.I.D.S. Vault" via system share sheet in bulk.
 */
class GoogleDriveSharedHarvester(
    private val context: Context,
    private val serviceScope: CoroutineScope,
    private val database: KidsDatabase,
    private val crawlerOverlay: FloatingCrawlerOverlay?,
    private val rootInActiveWindowProvider: () -> AccessibilityNodeInfo?,
    private val dispatchTapAction: suspend (Float, Float) -> Boolean,
    private val dispatchLongPressAction: suspend (Float, Float) -> Boolean,
    private val dispatchSwipeAction: suspend (Float, Float, Float, Float, Long) -> Boolean,
    private val selectKidsInChooserAction: suspend () -> Unit,
    private val waitForConditionAction: suspend (Long, Long, () -> Boolean) -> Boolean,
    private val dispatchBackAction: suspend () -> Boolean = { true }
) {

    companion object {
        const val DRIVE_PACKAGE_NAME = "com.google.android.apps.docs"
        private const val MAX_BATCH_SELECTION_SIZE = 15
        private const val DEFAULT_MINIMUM_SCROLL_PAGE_BUDGET = 150
        private const val PAGES_PER_PENDING_ATTACHMENT_MULTIPLIER = 3
        private const val MAX_CONSECUTIVE_STATIC_PAGES = 5
        private const val MAX_CONSECUTIVE_EMPTY_PAGES = 50
        private const val MAX_EMPTY_PAGE_RETRIES = 3
        private const val INITIAL_DRIVE_LAUNCH_SETTLE_DELAY_MS = 1500L
        private const val MAX_NAV_UP_ATTEMPTS = 6
        private const val POST_BATCH_SETTLING_DELAY_MS = 1200L
        private const val SETTLING_DELAY_MS = 800L

        fun calculateDynamicScrollPageLimit(pendingAttachmentCount: Int): Int {
            val calculatedBudget = pendingAttachmentCount * PAGES_PER_PENDING_ATTACHMENT_MULTIPLIER
            return calculatedBudget.coerceAtLeast(DEFAULT_MINIMUM_SCROLL_PAGE_BUDGET)
        }

        fun calculateDynamicFolderDepth(pendingAttachmentCount: Int): Int {
            return when {
                pendingAttachmentCount > 100 -> 15
                pendingAttachmentCount > 30 -> 10
                else -> 8
            }
        }

        @Volatile
        var isDriveHarvestingActive: Boolean = false

        @Volatile
        var activeHarvestingFolderName: String? = null

        val KNOWN_FILE_EXTENSIONS = setOf(
            "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx",
            "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg",
            "mp4", "mov", "avi", "mkv", "webm", "3gp",
            "mp3", "m4a", "wav", "aac", "ogg", "wma", "flac",
            "zip", "rar", "7z", "txt", "rtf", "csv", "epub"
        )

        fun splitTitleAndExtension(rawTitle: String): Pair<String, String> {
            val cleaned = rawTitle.trim()
                .replace(Regex("""\s+\."""), ".")
                .replace(Regex("""\.{2,}"""), ".")
            val lower = cleaned.lowercase(Locale.ROOT)
            for (ext in KNOWN_FILE_EXTENSIONS) {
                if (lower.endsWith(".$ext")) {
                    val beforeExt = cleaned.substring(0, cleaned.length - ext.length - 1).trim()
                    val secondLower = beforeExt.lowercase(Locale.ROOT)
                    for (ext2 in KNOWN_FILE_EXTENSIONS) {
                        if (secondLower.endsWith(".$ext2")) {
                            val base = beforeExt.substring(0, beforeExt.length - ext2.length - 1).trim()
                            return Pair(base, ext)
                        }
                    }
                    return Pair(beforeExt, ext)
                }
            }
            return Pair(cleaned, "")
        }

        fun normalizeBaseName(baseName: String): String {
            return baseName.lowercase(Locale.ROOT)
                .replace(Regex("""[_\-]+"""), " ")
                .replace(Regex("""\s+"""), " ")
                .trim()
        }

        fun matchesDriveItem(driveTitle: String, attachmentFileName: String): Boolean {
            val (driveBase, driveExt) = splitTitleAndExtension(driveTitle)
            val (attBase, attExt) = splitTitleAndExtension(attachmentFileName)

            val isExtCompatible = driveExt.isBlank() || attExt.isBlank() || driveExt == attExt ||
                    (driveExt in setOf("doc", "docx") && attExt == "pdf") ||
                    (driveExt == "pdf" && attExt in setOf("doc", "docx")) ||
                    (driveExt in setOf("ppt", "pptx") && attExt == "pdf") ||
                    (driveExt == "pdf" && attExt in setOf("ppt", "pptx"))

            if (!isExtCompatible) return false

            val normDriveBase = normalizeBaseName(driveBase)
            val normAttBase = normalizeBaseName(attBase)

            val isExact = normDriveBase == normAttBase
            val isPrefix = (normDriveBase.length >= 8 && normAttBase.startsWith(normDriveBase)) ||
                    (normAttBase.length >= 8 && driveBase.isNotBlank() && normDriveBase.startsWith(normAttBase))
            val isSubstring = normDriveBase.length >= 8 && normAttBase.length >= 8 &&
                    (normDriveBase.contains(normAttBase) || normAttBase.contains(normDriveBase))

            return isExact || isPrefix || isSubstring
        }

        suspend fun findBestCandidate(
            driveTitle: String,
            driveSubtitle: String,
            pendingAttachments: List<AttachmentEntity>,
            noticeLookup: (suspend (noticeId: String) -> Pair<String, String>?)? = null
        ): AttachmentEntity? {
            val (driveBase, _) = splitTitleAndExtension(driveTitle)
            val normDriveBase = normalizeBaseName(driveBase)

            val candidateMatches = pendingAttachments.filter { att ->
                matchesDriveItem(driveTitle, att.fileName)
            }

            if (candidateMatches.isEmpty()) return null
            if (candidateMatches.size == 1) return candidateMatches.first()

            val exactMatches = candidateMatches.filter { att ->
                val (attBase, _) = splitTitleAndExtension(att.fileName)
                normDriveBase == normalizeBaseName(attBase)
            }
            if (exactMatches.size == 1) return exactMatches.first()
            val poolToDisambiguate = if (exactMatches.isNotEmpty()) exactMatches else candidateMatches

            if (noticeLookup != null) {
                val parsedDriveDate = ClassroomDateParser.parse(driveSubtitle)
                if (parsedDriveDate != null) {
                    for (candidate in poolToDisambiguate) {
                        val noticeInfo = noticeLookup(candidate.noticeId)
                        if (noticeInfo != null) {
                            val (noticeTitle, noticeBody) = noticeInfo
                            val noticeDate = ClassroomDateParser.parse(noticeTitle + " " + noticeBody.take(1000))
                            if (noticeDate != null && parsedDriveDate.matchesMonthAndDay(noticeDate.month, noticeDate.day)) {
                                CrawlerTraceLogger.log(
                                    "DRIVE_HARVESTER",
                                    "Disambiguated identical file \"$driveTitle\" by date ${parsedDriveDate.monthShortName} ${parsedDriveDate.day} -> Notice \"${noticeTitle.take(30)}\""
                                )
                                return candidate
                            }
                        }
                    }
                }
            }

            return poolToDisambiguate.first()
        }

        val DRIVE_FILE_BADGES = setOf(
            "pdf", "audio", "video", "image", "photo", "document", "google docs",
            "spreadsheet", "google sheets", "presentation", "google slides",
            "google forms", "archive", "zip", "text", "code"
        )

        fun isDriveFolder(
            title: String,
            descriptions: List<String>,
            viewId: String = ""
        ): Boolean {
            val lowerDescs = descriptions.map { it.trim().lowercase(Locale.US) }.filter { it.isNotBlank() }
            val hasFolderBadge = lowerDescs.any { it.contains("folder") } || viewId.lowercase(Locale.US).contains("folder")
            val hasFileBadge = lowerDescs.any { DRIVE_FILE_BADGES.contains(it) }

            if (hasFolderBadge && !hasFileBadge) {
                return true
            }
            if (hasFileBadge) {
                return false
            }
            val lowerTitle = title.trim().lowercase(Locale.US)
            if (lowerTitle == "classroom" || lowerTitle.endsWith("folder") || lowerTitle.endsWith("folders")) {
                return true
            }
            return false
        }
    }

    data class DriveSharedItem(
        val title: String,
        val subtitle: String,
        val isFolder: Boolean,
        val hasFileBadge: Boolean = false,
        val node: AccessibilityNodeInfo,
        val bounds: Rect,
        val moreActionsBounds: Rect? = null
    )

    /**
     * Brings Google Drive to the foreground using an explicit system intent with REORDER_TO_FRONT.
     */
    private fun bringDriveToForeground(): Boolean {
        return try {
            var launchIntent = context.packageManager.getLaunchIntentForPackage(DRIVE_PACKAGE_NAME)
            if (launchIntent == null) {
                launchIntent = Intent(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_LAUNCHER)
                    setPackage(DRIVE_PACKAGE_NAME)
                }
            }
            launchIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
            )
            context.startActivity(launchIntent)
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Re-brought Google Drive to foreground.")
            true
        } catch (e: Exception) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Failed to bring Google Drive to foreground: ${e.message}")
            false
        }
    }

    /**
     * Executes the full Google Drive Shared harvesting cycle.
     * Returns the total count of files successfully dispatched to K.I.D.S. Vault.
     */
    suspend fun executeHarvest(targetAccountEmail: String?): Int {
        CrawlerTraceLogger.log("DRIVE_HARVESTER", "Starting Google Drive Shared Tab Harvester...")
        crawlerOverlay?.updateStatus("Google Drive Harvester", "Launching Drive & verifying account...")

        isDriveHarvestingActive = true
        try {
            // Step 1: Open Google Drive.
            // On Android 14+ / MIUI, external background activity launches are restricted.
            // When Google Classroom is the active foreground app, clicking "Classroom folder"
            // in Classroom's navigation drawer lets Classroom itself launch Drive natively!
            val initialRoot = rootInActiveWindowProvider()
            val initialPkg = initialRoot?.packageName?.toString() ?: ""
            initialRoot?.recycle()

            if (initialPkg.contains("classroom")) {
                openDriveViaClassroom()
            }

            // Wait for Google Drive window
            var isDriveOpen = waitForConditionAction(6000L, 300L) {
                val root = rootInActiveWindowProvider() ?: return@waitForConditionAction false
                val pkg = root.packageName?.toString() ?: ""
                root.recycle()
                pkg.contains(DRIVE_PACKAGE_NAME)
            }

            // Fallback: If not open via Classroom folder, attempt direct launcher intent
            if (!isDriveOpen) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Drive not opened via Classroom folder. Attempting direct launcher intent...")
                try {
                    var launchIntent = context.packageManager.getLaunchIntentForPackage(DRIVE_PACKAGE_NAME)
                    if (launchIntent == null) {
                        launchIntent = Intent(Intent.ACTION_MAIN).apply {
                            addCategory(Intent.CATEGORY_LAUNCHER)
                            setPackage(DRIVE_PACKAGE_NAME)
                        }
                    }
                    launchIntent.addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                        Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
                    )
                    context.startActivity(launchIntent)
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "Dispatched launch intent for $DRIVE_PACKAGE_NAME")
                } catch (e: Exception) {
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "Failed to launch Drive via launcher intent: ${e.message}")
                }

                isDriveOpen = waitForConditionAction(6000L, 300L) {
                    val root = rootInActiveWindowProvider() ?: return@waitForConditionAction false
                    val pkg = root.packageName?.toString() ?: ""
                    root.recycle()
                    pkg.contains(DRIVE_PACKAGE_NAME)
                }
            }

            // Second Fallback: Attempt ACTION_VIEW deep link to drive.google.com
            if (!isDriveOpen) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Drive not detected. Retrying with VIEW intent...")
                try {
                    val viewIntent = Intent(Intent.ACTION_VIEW).apply {
                        data = android.net.Uri.parse("https://drive.google.com")
                        setPackage(DRIVE_PACKAGE_NAME)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                    }
                    context.startActivity(viewIntent)
                } catch (e: Exception) {
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "Retry launch with VIEW intent failed: ${e.message}")
                }
                isDriveOpen = waitForConditionAction(6000L, 300L) {
                    val root = rootInActiveWindowProvider() ?: return@waitForConditionAction false
                    val pkg = root.packageName?.toString() ?: ""
                    root.recycle()
                    pkg.contains(DRIVE_PACKAGE_NAME)
                }
            }

            if (!isDriveOpen) {
                val finalPkg = rootInActiveWindowProvider()?.let {
                    val p = it.packageName?.toString() ?: ""
                    it.recycle()
                    p
                } ?: "null"
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Google Drive app window not detected (current window: $finalPkg). Halting.")
                return 0
            }

            var totalHarvestedCount = 0

            delay(INITIAL_DRIVE_LAUNCH_SETTLE_DELAY_MS)

            // Step 2: Navigate to top-level "Shared" ("Shared with me") tab FIRST
            // This exits any folder Drive might have opened into and exposes the root navigation and account avatar
            var isNavigatedToShared = navigateToSharedTab()
            if (!isNavigatedToShared) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Initial Shared tab navigation failed. Re-focusing Drive and retrying...")
                bringDriveToForeground()
                delay(SETTLING_DELAY_MS)
                isNavigatedToShared = navigateToSharedTab()
            }
            if (!isNavigatedToShared) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Failed to navigate to Shared tab in Google Drive. Halting harvester safely.")
                return 0
            }
            delay(SETTLING_DELAY_MS)

            // Step 3: Validate and ensure Google Drive is viewing the child's school account
            if (!targetAccountEmail.isNullOrBlank()) {
                val isAccountValidated = ensureDriveAccount(targetAccountEmail)
                if (!isAccountValidated) {
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "Warning: Could not validate account $targetAccountEmail on first attempt. Re-navigating to Shared...")
                }
                // Re-ensure we are on the Shared tab after account reload
                navigateToSharedTab()
                delay(SETTLING_DELAY_MS)
            }

            // Step 3b: Ensure optimal view layout (List) and sorting (Date shared, newest first)
            ensureProperViewAndSorting()
            delay(SETTLING_DELAY_MS)

            // Step 4: Iterative Harvest Loop across Shared tab pages
            val allNotices = database.noticeDao().getAllNoticesDirect()
            var scrollPageCount = 0
            var consecutiveEmptyPages = 0
            var consecutiveStaticPages = 0
            var lastVisibleTitles = listOf<String>()
            val processedDriveTitles = mutableSetOf<String>()
            val processedFolderNames = mutableSetOf<String>()

            val initialPendingAttachments = getPendingUncapturedAttachments()
            val dynamicMaxScrollPages = calculateDynamicScrollPageLimit(initialPendingAttachments.size)
            CrawlerTraceLogger.log(
                "DRIVE_HARVESTER",
                "Commencing harvest with ${initialPendingAttachments.size} pending attachments. Dynamic scroll page budget: $dynamicMaxScrollPages."
            )

            while (serviceScope.isActive && crawlerOverlay?.isAutoScrollingActive() == true && scrollPageCount < dynamicMaxScrollPages) {
                val pendingAttachments = getPendingUncapturedAttachments()
                if (pendingAttachments.isEmpty()) {
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "All pending attachments successfully captured!")
                    crawlerOverlay?.updateStatus("✓ Drive Harvest Complete", "All missing attachments received.")
                    break
                }

                crawlerOverlay?.updateStatus(
                    "Scanning Shared Tab (Page ${scrollPageCount + 1})...",
                    "${pendingAttachments.size} files remaining"
                )

                // Resiliently acquire active window with retries to prevent premature termination during activity switches
                var currentRoot: AccessibilityNodeInfo? = null
                var rootRetry = 0
                while (serviceScope.isActive && currentRoot == null && rootRetry < 12) {
                    val candidateRoot = rootInActiveWindowProvider()
                    val candidatePkg = candidateRoot?.packageName?.toString() ?: ""
                    if (candidateRoot != null && candidatePkg.contains(DRIVE_PACKAGE_NAME)) {
                        currentRoot = candidateRoot
                    } else {
                        candidateRoot?.recycle()
                        delay(250L)
                        rootRetry++
                    }
                }
                if (currentRoot == null) {
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "Drive window unavailable on page ${scrollPageCount + 1}. Re-bringing Drive to front...")
                    bringDriveToForeground()
                    delay(SETTLING_DELAY_MS)
                    continue
                }

                // Autonomous Pass 3 Auto-Recovery: detect and heal any tab displacement, open viewer/editor, stuck multi-select, or stray modal sheet
                if (performDriveAutoRecoveryIfDisplaced(currentRoot)) {
                    currentRoot.recycle()
                    delay(SETTLING_DELAY_MS)
                    continue
                }

                var visibleItems = scanVisibleDriveItems(currentRoot)
                var emptyRetries = 0
                while (visibleItems.isEmpty() && emptyRetries < MAX_EMPTY_PAGE_RETRIES && serviceScope.isActive) {
                    delay(SETTLING_DELAY_MS)
                    emptyRetries++
                    val retryRoot = rootInActiveWindowProvider()
                    if (retryRoot != null) {
                        val retryPkg = retryRoot.packageName?.toString() ?: ""
                        if (retryPkg.contains(DRIVE_PACKAGE_NAME)) {
                            val retryItems = scanVisibleDriveItems(retryRoot)
                            if (retryItems.isNotEmpty()) {
                                currentRoot?.recycle()
                                currentRoot = retryRoot
                                visibleItems = retryItems
                                break
                            }
                        }
                        retryRoot.recycle()
                    }
                }

                val visibleTitles = visibleItems.map { it.title }
                CrawlerTraceLogger.log(
                    "DRIVE_HARVESTER",
                    "Page ${scrollPageCount + 1}: ${visibleItems.size} items visible: ${visibleTitles.take(4)}"
                )

                // Check if list has stopped moving (reached the bottom)
                if (visibleTitles.isNotEmpty() && visibleTitles == lastVisibleTitles) {
                    consecutiveStaticPages++
                    if (consecutiveStaticPages >= MAX_CONSECUTIVE_STATIC_PAGES) {
                        CrawlerTraceLogger.log(
                            "DRIVE_HARVESTER",
                            "Drive list reached the bottom (same items across $consecutiveStaticPages swipes). Concluding harvest."
                        )
                        break
                    }
                } else {
                    consecutiveStaticPages = 0
                    if (visibleTitles.isNotEmpty()) {
                        lastVisibleTitles = visibleTitles
                    }
                }

                val foldersToHarvest = mutableListOf<String>()
                val batchToSelect = mutableListOf<DriveSharedItem>()

                for (item in visibleItems) {
                    if (item.isFolder) {
                        if (!processedFolderNames.contains(item.title)) {
                            foldersToHarvest.add(item.title)
                        }
                    } else if (!processedDriveTitles.contains(item.title)) {
                        val matchedAttachment = matchDriveItemToPendingAttachment(item, pendingAttachments)
                        if (matchedAttachment != null) {
                            batchToSelect.add(item)
                            if (batchToSelect.size >= MAX_BATCH_SELECTION_SIZE) {
                                break
                            }
                        }
                    }
                }

                if (batchToSelect.isNotEmpty()) {
                    consecutiveEmptyPages = 0
                    CrawlerTraceLogger.log(
                        "DRIVE_HARVESTER",
                        "Selecting batch of ${batchToSelect.size} matching files on page ${scrollPageCount + 1}..."
                    )

                    // Perform multi-selection: Long press first file, tap subsequent files
                    val batchDispatched = selectAndDispatchBatch(batchToSelect)
                    if (batchDispatched) {
                        totalHarvestedCount += batchToSelect.size
                        for (item in batchToSelect) {
                            processedDriveTitles.add(item.title)
                        }
                        crawlerOverlay?.updateStatus(
                            "Batch Sent to Vault",
                            "Shared ${batchToSelect.size} files (Total: $totalHarvestedCount)"
                        )
                        // Explicitly wait for Google Drive to regain foreground focus after ShareTargetActivity finishes
                        var waitDriveAttempts = 0
                        while (serviceScope.isActive && waitDriveAttempts < 15) {
                            val waitRoot = rootInActiveWindowProvider()
                            val pkg = waitRoot?.packageName?.toString() ?: ""
                            val isDrive = pkg.contains(DRIVE_PACKAGE_NAME)
                            waitRoot?.recycle()
                            if (isDrive) {
                                break
                            }
                            delay(300L)
                            waitDriveAttempts++
                        }
                        delay(POST_BATCH_SETTLING_DELAY_MS)
                    }
                } else if (foldersToHarvest.isEmpty()) {
                    consecutiveEmptyPages++
                }

                // Recycle nodes of items not selected
                for (item in visibleItems) {
                    if (!batchToSelect.contains(item)) {
                        item.node.recycle()
                    }
                }
                currentRoot?.recycle()

                // Explore any unharvested folders discovered on this page
                for (folderTitle in foldersToHarvest) {
                    processedFolderNames.add(folderTitle)
                    val freshRoot = rootInActiveWindowProvider()
                    val freshFolderItem = freshRoot?.let { r ->
                        val currentItems = scanVisibleDriveItems(r)
                        r.recycle()
                        val target = currentItems.find { it.isFolder && it.title == folderTitle }
                        for (ci in currentItems) {
                            if (ci != target) ci.node.recycle()
                        }
                        target
                    }
                    if (freshFolderItem != null) {
                        val harvestedFromFolder = harvestFolder(freshFolderItem, pendingAttachments, 1)
                        totalHarvestedCount += harvestedFromFolder
                        freshFolderItem.node.recycle()
                    }
                }

                if (foldersToHarvest.isNotEmpty()) {
                    lastVisibleTitles = emptyList()
                    consecutiveStaticPages = 0
                }

                if (consecutiveEmptyPages >= MAX_CONSECUTIVE_EMPTY_PAGES) {
                    CrawlerTraceLogger.log(
                        "DRIVE_HARVESTER",
                        "No matching pending files found across $consecutiveEmptyPages consecutive pages. Concluding harvest."
                    )
                    break
                }

                // Scroll down in Shared tab to reveal older files
                if (visibleItems.isNotEmpty()) {
                    scrollPageCount++
                }
                scrollSharedListForward()
                delay(SETTLING_DELAY_MS)
            }

            CrawlerTraceLogger.log(
                "DRIVE_HARVESTER",
                "Google Drive Shared Tab Harvest completed: $totalHarvestedCount files dispatched to K.I.D.S. Vault."
            )
            return totalHarvestedCount
        } finally {
            isDriveHarvestingActive = false
        }
    }

    /**
     * Checks if Google Drive is currently viewing the target child's account.
     * If not, automatically opens the OneGoogle account switcher, selects the child's account,
     * and rigorously validates the new active account avatar disc after reload.
     */
    suspend fun ensureDriveAccount(targetEmail: String): Boolean {
        val cleanTarget = targetEmail.trim().lowercase(Locale.US)
        CrawlerTraceLogger.log("ACCOUNT_SWITCH", "Verifying Google Drive active account for target: $cleanTarget")

        // 1. Ensure Drive is at root level with bottom tabs accessible
        ensureAtDriveRoot()

        // 2. Locate avatar node, uncollapsing top search bar if scrolled down
        var avatarNode: AccessibilityNodeInfo? = null
        for (uncollapseAttempt in 0..2) {
            val root = rootInActiveWindowProvider()
            if (root != null) {
                avatarNode = findAccountAvatarNode(root)
                root.recycle()
            }
            if (avatarNode != null) break

            CrawlerTraceLogger.log("ACCOUNT_SWITCH", "Avatar not visible (attempt ${uncollapseAttempt + 1}/3). Swiping down to expose Drive top search bar...")
            val dm = context.resources.displayMetrics
            val swipeX = dm.widthPixels / 2f
            val startY = dm.heightPixels * 0.20f
            val endY = dm.heightPixels * 0.70f
            dispatchSwipeAction(swipeX, startY, swipeX, endY, 300L)
            delay(800L)
        }

        if (avatarNode == null) {
            // Fallback: Re-tap Shared tab at bottom to force top bar to re-appear and scroll to top
            val tabRoot = rootInActiveWindowProvider()
            if (tabRoot != null) {
                val sharedTab = findSharedTabNode(tabRoot)
                if (sharedTab != null) {
                    CrawlerTraceLogger.log("ACCOUNT_SWITCH", "Tapping Shared tab to force top search bar uncollapse...")
                    val clicked = sharedTab.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    if (!clicked) {
                        val tb = Rect()
                        sharedTab.getBoundsInScreen(tb)
                        if (tb.width() > 0) dispatchTapAction(tb.centerX().toFloat(), tb.centerY().toFloat())
                    }
                    sharedTab.recycle()
                    delay(800L)
                }
                tabRoot.recycle()
            }
            val checkRoot = rootInActiveWindowProvider()
            if (checkRoot != null) {
                avatarNode = findAccountAvatarNode(checkRoot)
                checkRoot.recycle()
            }
        }

        if (avatarNode == null) {
            CrawlerTraceLogger.log("ACCOUNT_SWITCH", "Account avatar not found even after uncollapsing top bar.")
            return false
        }

        val avatarDesc = avatarNode.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val avatarText = avatarNode.text?.toString()?.lowercase(Locale.US) ?: ""

        if (avatarDesc.contains(cleanTarget) || avatarText.contains(cleanTarget)) {
            CrawlerTraceLogger.log("ACCOUNT_VALIDATION", "✓ Confirmed Google Drive is already viewing target account ($cleanTarget).")
            crawlerOverlay?.updateStatus("Account Verified", "Active: $cleanTarget")
            avatarNode.recycle()
            return true
        }

        CrawlerTraceLogger.log(
            "ACCOUNT_SWITCH",
            "Drive is currently open in wrong account ($avatarDesc). Auto-switching to $cleanTarget..."
        )
        crawlerOverlay?.updateStatus("Switching Account...", "Selecting $cleanTarget")

        // 3. Open OneGoogle Account switcher via direct physical touch coordinates
        val rect = Rect()
        avatarNode.getBoundsInScreen(rect)
        val clickedAvatar = avatarNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        if (!clickedAvatar && rect.width() > 0) {
            dispatchTapAction(rect.centerX().toFloat(), rect.centerY().toFloat())
        }
        avatarNode.recycle()

        // Wait for OneGoogle bottom sheet to open
        val isSheetOpen = waitForConditionAction(5000L, 300L) {
            val root = rootInActiveWindowProvider() ?: return@waitForConditionAction false
            val hasSheet = findNodeContainingText(root, "manage accounts") != null ||
                    findNodeContainingText(root, "add another account") != null ||
                    findNodeContainingText(root, "google account") != null
            root.recycle()
            hasSheet
        }

        if (!isSheetOpen) {
            CrawlerTraceLogger.log("ACCOUNT_SWITCH", "Account switcher bottom sheet did not appear after tapping avatar disc.")
            return false
        }

        delay(600L)

        // 4. Search and select target account in bottom sheet (with scroll support)
        var isAccountTapped = false
        for (attempt in 0..4) {
            val dialogRoot = rootInActiveWindowProvider()
            if (dialogRoot != null) {
                val targetRow = findAccountRowInSheet(dialogRoot, cleanTarget)
                if (targetRow != null) {
                    val r = Rect()
                    targetRow.getBoundsInScreen(r)
                    CrawlerTraceLogger.log("ACCOUNT_SWITCH", "Found target account row at $r. Dispatching click...")
                    val clicked = targetRow.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    if (!clicked && r.width() > 0) {
                        dispatchTapAction(r.centerX().toFloat(), r.centerY().toFloat())
                    }
                    targetRow.recycle()
                    isAccountTapped = true
                    dialogRoot.recycle()
                    break
                }
                val sheetBounds = Rect()
                val scrollableSheet = findFirstScrollableNode(dialogRoot)
                if (scrollableSheet != null) {
                    scrollableSheet.getBoundsInScreen(sheetBounds)
                    scrollableSheet.recycle()
                } else {
                    dialogRoot.getBoundsInScreen(sheetBounds)
                }
                dialogRoot.recycle()

                if (attempt < 4) {
                    CrawlerTraceLogger.log("ACCOUNT_SWITCH", "Account $cleanTarget not visible on attempt ${attempt + 1}. Swiping up in account list...")
                    val dm = context.resources.displayMetrics
                    val swipeX = if (sheetBounds.width() > 0) sheetBounds.centerX().toFloat() else (dm.widthPixels / 2f)
                    val startY = if (sheetBounds.height() > 0) (sheetBounds.top + sheetBounds.height() * 0.80f) else (dm.heightPixels * 0.75f)
                    val endY = if (sheetBounds.height() > 0) (sheetBounds.top + sheetBounds.height() * 0.25f) else (dm.heightPixels * 0.35f)
                    dispatchSwipeAction(swipeX, startY, swipeX, endY, 350L)
                    delay(800L)
                }
            }
        }

        if (!isAccountTapped) {
            CrawlerTraceLogger.log("ACCOUNT_SWITCH", "Target account $cleanTarget not found in account list after scrolling.")
            dispatchBackAction()
            delay(500L)
            return false
        }

        // 5. ACCOUNT VALIDATION: Wait for sheet dismissal and verify the new active account
        CrawlerTraceLogger.log("ACCOUNT_VALIDATION", "Validating account switch to $cleanTarget...")
        crawlerOverlay?.updateStatus("Validating Account...", cleanTarget)

        // Wait for bottom sheet to close
        waitForConditionAction(6000L, 300L) {
            val root = rootInActiveWindowProvider() ?: return@waitForConditionAction true
            val hasSheet = findNodeContainingText(root, "manage accounts") != null ||
                    findNodeContainingText(root, "add another account") != null
            root.recycle()
            !hasSheet
        }
        delay(1500L)

        // Ensure top bar is visible
        ensureAtDriveRoot()
        var validatedAvatar: AccessibilityNodeInfo? = null
        for (checkAttempt in 0..2) {
            val root = rootInActiveWindowProvider()
            if (root != null) {
                validatedAvatar = findAccountAvatarNode(root)
                root.recycle()
            }
            if (validatedAvatar != null) break
            val dm = context.resources.displayMetrics
            val swipeX = dm.widthPixels / 2f
            val startY = dm.heightPixels * 0.20f
            val endY = dm.heightPixels * 0.70f
            dispatchSwipeAction(swipeX, startY, swipeX, endY, 300L)
            delay(800L)
        }

        if (validatedAvatar != null) {
            val newDesc = validatedAvatar.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
            validatedAvatar.recycle()
            if (newDesc.contains(cleanTarget)) {
                CrawlerTraceLogger.log("ACCOUNT_VALIDATION", "✓ Account validation PASSED: Google Drive successfully switched to $cleanTarget!")
                crawlerOverlay?.updateStatus("Account Verified", "Active: $cleanTarget")
                return true
            } else {
                CrawlerTraceLogger.log("ACCOUNT_VALIDATION", "✗ Account validation FAILED: Google Drive active account is \"$newDesc\", expected $cleanTarget.")
                return false
            }
        } else {
            CrawlerTraceLogger.log("ACCOUNT_VALIDATION", "Account avatar not re-acquired after switch. Validation indeterminate.")
            return false
        }
    }

    private suspend fun ensureAtDriveRoot() {
        dismissMultiSelectMode()
        var attempts = 0
        while (attempts < 5) {
            val root = rootInActiveWindowProvider() ?: break
            val hasSharedTab = findSharedTabNode(root) != null
            val navUp = findNavigateUpButton(root)
            root.recycle()

            if (hasSharedTab) {
                break
            }
            if (navUp != null) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Inside folder/subfolder. Navigating up toward Drive root...")
                val clicked = navUp.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                navUp.recycle()
                if (!clicked) {
                    dispatchBackAction()
                }
                delay(600L)
            } else {
                break
            }
            attempts++
        }
    }

    private fun findAccountRowInSheet(root: AccessibilityNodeInfo, targetEmail: String): AccessibilityNodeInfo? {
        val cleanTarget = targetEmail.trim().lowercase(Locale.US)
        val userPrefix = if (cleanTarget.contains("@")) cleanTarget.substringBefore('@') else cleanTarget

        val candidates = mutableListOf<AccessibilityNodeInfo>()
        collectAvailableAccountRows(root, candidates)

        for (row in candidates) {
            val texts = mutableListOf<String>()
            collectNodeTexts(row, texts)
            val combined = texts.joinToString(" ").lowercase(Locale.US)
            val matchesTarget = combined.contains(cleanTarget) ||
                    (userPrefix.length >= 3 && combined.contains(userPrefix))

            if (matchesTarget) {
                for (other in candidates) {
                    if (other != row) other.recycle()
                }
                return row
            }
        }

        for (c in candidates) {
            c.recycle()
        }
        return null
    }

    private fun collectAvailableAccountRows(node: AccessibilityNodeInfo, outList: MutableList<AccessibilityNodeInfo>) {
        val viewId = node.viewIdResourceName?.lowercase(Locale.US) ?: ""
        if (viewId.contains("og_bento_available_account_root") || viewId.contains("available_account")) {
            outList.add(AccessibilityNodeInfo.obtain(node))
            return
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            collectAvailableAccountRows(child, outList)
            child.recycle()
        }
    }

    private fun collectNodeTexts(node: AccessibilityNodeInfo, outList: MutableList<String>) {
        val text = node.text?.toString()?.trim() ?: ""
        val desc = node.contentDescription?.toString()?.trim() ?: ""
        if (text.isNotBlank()) outList.add(text)
        if (desc.isNotBlank()) outList.add(desc)

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            collectNodeTexts(child, outList)
            child.recycle()
        }
    }

    /**
     * Opens Google Drive directly from Google Classroom's navigation drawer ("Classroom folder").
     *
     * This bypasses Android 14+ / MIUI background-activity-launch restrictions because
     * Google Classroom (which is currently the active foreground app) initiates the launch itself.
     */
    private suspend fun openDriveViaClassroom(): Boolean {
        CrawlerTraceLogger.log("DRIVE_HARVESTER", "Attempting to open Google Drive via Classroom folder...")
        crawlerOverlay?.updateStatus("Opening Drive...", "Accessing Classroom folder...")

        val root = rootInActiveWindowProvider() ?: return false
        val pkg = root.packageName?.toString() ?: ""
        if (!pkg.contains("classroom")) {
            root.recycle()
            return false
        }

        // Method 1: Check if we are inside a Class view with a "Classwork" tab
        // In Google Classroom, the Classwork tab has a "Class Drive folder" icon at the top right!
        val classworkTab = findClassworkTabNode(root)
        if (classworkTab != null) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Found Classwork tab in Classroom. Switching to Classwork...")
            val clicked = if (classworkTab.isClickable) {
                classworkTab.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            } else {
                findClickableAncestor(classworkTab)?.let {
                    val ok = it.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    it.recycle()
                    ok
                } ?: false
            }
            if (!clicked) {
                val r = Rect()
                classworkTab.getBoundsInScreen(r)
                dispatchTapAction(r.centerX().toFloat(), r.centerY().toFloat())
            }
            classworkTab.recycle()
            delay(1200L)

            val classworkRoot = rootInActiveWindowProvider()
            if (classworkRoot != null) {
                val driveFolderBtn = findClassDriveFolderButton(classworkRoot)
                if (driveFolderBtn != null) {
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "Found Class Drive folder button in Classwork. Clicking...")
                    val opened = if (driveFolderBtn.isClickable) {
                        driveFolderBtn.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    } else {
                        findClickableAncestor(driveFolderBtn)?.let {
                            val ok = it.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                            it.recycle()
                            ok
                        } ?: false
                    }
                    if (!opened) {
                        val r = Rect()
                        driveFolderBtn.getBoundsInScreen(r)
                        dispatchTapAction(r.centerX().toFloat(), r.centerY().toFloat())
                    }
                    driveFolderBtn.recycle()
                    classworkRoot.recycle()
                    root.recycle()
                    return true
                }
                classworkRoot.recycle()
            }
        }

        // Method 2: Open Classroom Drawer -> "Classroom folders"
        // If in class view, click Navigate up (<-) to return to main classes list first
        val hamburgerNode = findHamburgerNode(root)
        if (hamburgerNode != null) {
            val desc = hamburgerNode.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
            if (desc.contains("navigate up") || desc.contains("back")) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Navigating up from class to main Classroom screen...")
                hamburgerNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                hamburgerNode.recycle()
                delay(1000L)
            } else {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Clicking Classroom navigation drawer...")
                hamburgerNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                hamburgerNode.recycle()
                delay(1000L)
            }
        }
        root.recycle()

        // In main screen, ensure drawer is opened
        val mainRoot = rootInActiveWindowProvider()
        if (mainRoot != null) {
            val mainHamburger = findHamburgerNode(mainRoot)
            if (mainHamburger != null) {
                val desc = mainHamburger.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
                if (!desc.contains("navigate up") && !desc.contains("back")) {
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "Opening navigation drawer from main screen...")
                    mainHamburger.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    mainHamburger.recycle()
                    delay(1000L)
                } else {
                    mainHamburger.recycle()
                }
            }
            mainRoot.recycle()
        }

        // Step 2: In the opened drawer, locate "Classroom folders"
        val drawerRoot = rootInActiveWindowProvider() ?: return false
        var folderNode = findClassroomFolderDrawerNode(drawerRoot)

        if (folderNode == null) {
            // Scroll down inside the drawer in case "Classroom folders" is lower down
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "'Classroom folders' not immediately visible. Scrolling drawer down...")
            val drawerBounds = Rect()
            val scrollableDrawer = findFirstScrollableNode(drawerRoot)
            if (scrollableDrawer != null) {
                scrollableDrawer.getBoundsInScreen(drawerBounds)
                scrollableDrawer.recycle()
            } else {
                drawerRoot.getBoundsInScreen(drawerBounds)
            }
            val dm = context.resources.displayMetrics
            val swipeX = if (drawerBounds.width() > 0) drawerBounds.centerX().toFloat() else (dm.widthPixels * 0.35f)
            val startY = if (drawerBounds.height() > 0) (drawerBounds.top + drawerBounds.height() * 0.75f) else (dm.heightPixels * 0.70f)
            val endY = if (drawerBounds.height() > 0) (drawerBounds.top + drawerBounds.height() * 0.25f) else (dm.heightPixels * 0.25f)
            dispatchSwipeAction(swipeX, startY, swipeX, endY, 400L)
            delay(1000L)
            val scrolledDrawerRoot = rootInActiveWindowProvider()
            if (scrolledDrawerRoot != null) {
                folderNode = findClassroomFolderDrawerNode(scrolledDrawerRoot)
                scrolledDrawerRoot.recycle()
            }
        }

        if (folderNode != null) {
            val label = folderNode.text ?: folderNode.contentDescription ?: "Classroom folders"
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Found '$label' in Classroom menu. Clicking to launch Google Drive...")
            val clicked = if (folderNode.isClickable) {
                folderNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            } else {
                findClickableAncestor(folderNode)?.let {
                    val ok = it.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    it.recycle()
                    ok
                } ?: false
            }
            if (!clicked) {
                val r = Rect()
                folderNode.getBoundsInScreen(r)
                dispatchTapAction(r.centerX().toFloat(), r.centerY().toFloat())
            }
            folderNode.recycle()
            drawerRoot.recycle()
            return true
        }

        drawerRoot.recycle()
        CrawlerTraceLogger.log("DRIVE_HARVESTER", "Classroom folder option not found in drawer.")
        return false
    }

    private fun findClassworkTabNode(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val text = root.text?.toString()?.lowercase(Locale.US) ?: ""
        val desc = root.contentDescription?.toString()?.lowercase(Locale.US) ?: ""

        if (text == "classwork" || desc.contains("classwork")) {
            return if (root.isClickable) AccessibilityNodeInfo.obtain(root) else findClickableAncestor(root)
        }

        for (i in 0 until root.childCount) {
            val child = root.getChild(i) ?: continue
            val found = findClassworkTabNode(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun findClassDriveFolderButton(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val desc = root.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val viewId = root.viewIdResourceName?.lowercase(Locale.US) ?: ""

        val isDriveFolder = desc.contains("class drive folder") ||
                desc.contains("drive folder") ||
                (desc.contains("folder") && desc.contains("drive")) ||
                viewId.contains("drive_folder") ||
                viewId.contains("class_folder")

        if (isDriveFolder) {
            return if (root.isClickable) AccessibilityNodeInfo.obtain(root) else findClickableAncestor(root)
        }

        for (i in 0 until root.childCount) {
            val child = root.getChild(i) ?: continue
            val found = findClassDriveFolderButton(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun findClassroomFolderDrawerNode(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val text = root.text?.toString()?.lowercase(Locale.US) ?: ""
        val desc = root.contentDescription?.toString()?.lowercase(Locale.US) ?: ""

        val isFolderItem = (text.contains("classroom folder") || text.contains("classroom folders") ||
                desc.contains("classroom folder") || desc.contains("classroom folders") ||
                ((text.contains("folder") || desc.contains("folder")) && (text.contains("class") || desc.contains("class")))) &&
                !text.equals("google classroom", ignoreCase = true) &&
                !desc.equals("google classroom", ignoreCase = true)

        if (isFolderItem) {
            return if (root.isClickable) AccessibilityNodeInfo.obtain(root) else findClickableAncestor(root)
        }

        for (i in 0 until root.childCount) {
            val child = root.getChild(i) ?: continue
            val found = findClassroomFolderDrawerNode(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun findHamburgerNode(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val desc = root.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val text = root.text?.toString()?.lowercase(Locale.US) ?: ""
        val viewId = root.viewIdResourceName?.lowercase(Locale.US) ?: ""
        val r = Rect()
        val dm = context.resources.displayMetrics
        val maxLeft = (dm.widthPixels * 0.25f).toInt()
        val maxTop = (dm.heightPixels * 0.20f).toInt()
        val minBottom = (dm.density * 16).toInt()

        val isTopLeft = r.left < maxLeft && r.top < maxTop && r.bottom > minBottom

        if (isTopLeft && (
            desc.contains("navigate up") ||
            desc.contains("open navigation") ||
            desc.contains("drawer") ||
            desc.contains("menu") ||
            desc.contains("main menu") ||
            text.contains("menu") ||
            viewId.contains("open_drawer") ||
            viewId.contains("navigation_drawer") ||
            viewId.contains("home")
        )) {
            return if (root.isClickable) AccessibilityNodeInfo.obtain(root) else findClickableAncestor(root)
        }

        for (i in 0 until root.childCount) {
            val child = root.getChild(i) ?: continue
            val found = findHamburgerNode(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    /**
     * Navigates to the "Shared" tab on Google Drive's bottom navigation bar.
     *
     * In Google Drive for Android, when inside any folder (such as the Classroom folder),
     * the bottom navigation bar (Home, Starred, Shared, Files) is hidden.
     * To reach the "Shared" tab, we must first navigate up/back out of any folders
     * until the bottom navigation bar is visible.
     */
    private suspend fun navigateToSharedTab(): Boolean {
        CrawlerTraceLogger.log("DRIVE_HARVESTER", "Navigating to Shared tab in Google Drive...")
        crawlerOverlay?.updateStatus("Navigating to Shared Tab", "Finding Shared with me...")

        // Dismiss any full-screen viewer or media player that might be currently displayed
        dismissAnyActiveViewer()

        // Step A: If bottom navigation bar is not visible (e.g. inside a folder), navigate up/back to root
        var attempts = 0
        while (attempts < MAX_NAV_UP_ATTEMPTS && serviceScope.isActive) {
            val root = rootInActiveWindowProvider() ?: break
            val currentPkg = root.packageName?.toString() ?: ""
            if (!currentPkg.contains(DRIVE_PACKAGE_NAME)) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Active window is not Google Drive ($currentPkg). Bringing Drive to foreground (attempt ${attempts + 1})...")
                root.recycle()
                bringDriveToForeground()
                delay(SETTLING_DELAY_MS)
                attempts++
                continue
            }

            val sharedTabNode = findSharedTabNode(root)
            if (sharedTabNode != null) {
                // Bottom navigation bar is visible! Select the Shared tab.
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Bottom navigation bar detected. Selecting Shared tab...")
                val rect = Rect()
                sharedTabNode.getBoundsInScreen(rect)
                sharedTabNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                if (rect.width() > 0) {
                    dispatchTapAction(rect.centerX().toFloat(), rect.centerY().toFloat())
                }
                sharedTabNode.recycle()
                root.recycle()
                delay(SETTLING_DELAY_MS + 200L)
                return true
            }

            // Bottom bar not visible. Check if we are inside a folder (Navigate up / Back button present)
            val navUp = findNavigateUpButton(root)
            val folderTitle = findDriveCurrentFolderTitle(root)
            root.recycle()

            if (navUp != null) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Inside folder (bottom bar hidden). Navigating up toward root (attempt ${attempts + 1})...")
                val clicked = navUp.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                navUp.recycle()
                if (!clicked) {
                    dispatchBackAction()
                }
            } else if (folderTitle != null) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Inside folder \"$folderTitle\" without visible up button. Pressing Back toward root (attempt ${attempts + 1})...")
                dispatchBackAction()
            } else {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "No folder navigation detected. Awaiting bottom navigation bar render (attempt ${attempts + 1})...")
                delay(SETTLING_DELAY_MS)
            }

            delay(600L)
            attempts++
        }

        // Final attempt: check if Shared tab is now visible
        val finalRoot = rootInActiveWindowProvider() ?: return false
        val finalPkg = finalRoot.packageName?.toString() ?: ""
        if (!finalPkg.contains(DRIVE_PACKAGE_NAME)) {
            finalRoot.recycle()
            return false
        }
        val finalSharedTab = findSharedTabNode(finalRoot)
        if (finalSharedTab != null) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Selecting Shared tab after exiting folder...")
            val rect = Rect()
            finalSharedTab.getBoundsInScreen(rect)
            val clicked = finalSharedTab.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            if (!clicked && rect.width() > 0) {
                dispatchTapAction(rect.centerX().toFloat(), rect.centerY().toFloat())
            }
            finalSharedTab.recycle()
            finalRoot.recycle()
            delay(SETTLING_DELAY_MS + 200L)
            return true
        }
        finalRoot.recycle()
        CrawlerTraceLogger.log("DRIVE_HARVESTER", "Failed to locate Shared tab on bottom navigation bar.")
        return false
    }

    /**
     * Scans all visible items (files and folders) in the current Shared tab window.
     */
    private fun scanVisibleDriveItems(root: AccessibilityNodeInfo): List<DriveSharedItem> {
        val items = mutableListOf<DriveSharedItem>()

        // Strategy A: Find Drive items by their "More actions for <Name>" buttons (Grid layout)
        findItemsViaMoreActionsButtons(root, items)
        if (items.isNotEmpty()) {
            return items
        }

        // Strategy B: Find Drive items by their List view rows (where resource-id or desc is the file/folder title)
        findItemsViaListViewRows(root, items)
        if (items.isNotEmpty()) {
            return items
        }

        // Strategy C: Fallback recursive container collection
        collectDriveItemsRecursively(root, items)
        return items
    }

    private fun findItemsViaListViewRows(root: AccessibilityNodeInfo, outList: MutableList<DriveSharedItem>) {
        val rowCandidates = mutableListOf<AccessibilityNodeInfo>()
        collectListViewRowNodes(root, rowCandidates)

        val displayMetrics = context.resources.displayMetrics
        val containerBounds = Rect()
        val scrollContainer = findActualScrollableContainer(root)
        if (scrollContainer != null) {
            scrollContainer.getBoundsInScreen(containerBounds)
            scrollContainer.recycle()
        } else {
            val topBarHeight = (displayMetrics.density * 110).toInt()
            val bottomNavHeight = (displayMetrics.density * 80).toInt()
            containerBounds.set(0, topBarHeight, displayMetrics.widthPixels, displayMetrics.heightPixels - bottomNavHeight)
        }

        for (rowNode in rowCandidates) {
            val r = Rect()
            rowNode.getBoundsInScreen(r)
            if (r.top < containerBounds.top || r.bottom > containerBounds.bottom) {
                rowNode.recycle()
                continue
            }

            var title = rowNode.viewIdResourceName?.trim() ?: ""
            if (title.contains(":") || title.contains("/") || title == "DISPLAY_MODE_LIST" || title == "DISPLAY_MODE_GRID" || title == "single_column_header") {
                title = ""
            }
            if (title.isBlank()) {
                val descs = mutableListOf<String>()
                collectAllChildDescriptions(rowNode, descs)
                title = descs.firstOrNull { isLikelyFileOrFolderTitle(it) } ?: ""
            }

            if (title.isBlank() || isSystemHeaderTitle(title)) {
                rowNode.recycle()
                continue
            }

            val itemDescs = mutableListOf<String>()
            collectAllChildDescriptions(rowNode, itemDescs)

            val isFolder = isDriveFolder(
                title = title,
                descriptions = itemDescs,
                viewId = rowNode.viewIdResourceName ?: ""
            )
            val lowerDescs = itemDescs.map { it.trim().lowercase(Locale.US) }
            val hasFileBadge = lowerDescs.any { DRIVE_FILE_BADGES.contains(it) }

            outList.add(
                DriveSharedItem(
                    title = title,
                    subtitle = itemDescs.joinToString(", "),
                    isFolder = isFolder,
                    hasFileBadge = hasFileBadge,
                    node = rowNode,
                    bounds = r
                )
            )
        }
    }

    private fun collectListViewRowNodes(node: AccessibilityNodeInfo, outList: MutableList<AccessibilityNodeInfo>) {
        val r = Rect()
        node.getBoundsInScreen(r)
        val displayMetrics = context.resources.displayMetrics
        val minRowHeight = (displayMetrics.density * 28).toInt()
        val maxRowHeight = (displayMetrics.density * 160).toInt()
        val minRowWidth = (displayMetrics.widthPixels * 0.45f).toInt()
        val isRow = r.height() in minRowHeight..maxRowHeight && r.width() >= minRowWidth && (node.isCheckable || node.isClickable || node.isLongClickable)
        val rid = node.viewIdResourceName ?: ""
        val desc = node.contentDescription?.toString() ?: ""

        if (isRow && !rid.contains("navigation") && !rid.contains("search") && !desc.contains("tab,")) {
            outList.add(AccessibilityNodeInfo.obtain(node))
            return
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            collectListViewRowNodes(child, outList)
            child.recycle()
        }
    }

    private fun isLikelyFileOrFolderTitle(t: String): Boolean {
        val lower = t.trim().lowercase(Locale.US)
        if (isSystemHeaderTitle(lower)) return false
        return lower.endsWith(".pdf") || lower.endsWith(".mp3") || lower.endsWith(".doc") ||
                lower.endsWith(".docx") || lower.endsWith(".xls") || lower.endsWith(".xlsx") ||
                lower.endsWith(".png") || lower.endsWith(".jpg") || lower.contains("worksheet") ||
                lower.contains("grade") || lower.contains("notes") || lower.contains("colouring") ||
                lower.contains("text in ms word") || lower.length >= 6
    }

    private fun isSystemHeaderTitle(lower: String): Boolean {
        val clean = lower.trim().lowercase(Locale.US)
        return clean in setOf(
            "home", "starred", "shared", "files", "search", "search in drive",
            "more actions", "more options", "select all", "sort by", "view as list", "view as grid",
            "last week", "earlier this month", "earlier this year", "today", "yesterday",
            "display_mode_list", "display_mode_grid", "single_column_header", "scan document",
            "create new", "toggle menu", "shared folder", "pdf", "audio", "video", "image"
        ) || clean.startsWith("sort by") || clean.startsWith("shared by") || clean.startsWith("more actions for")
    }

    private fun findItemsViaMoreActionsButtons(root: AccessibilityNodeInfo, outList: MutableList<DriveSharedItem>) {
        val moreActionsNodes = mutableListOf<AccessibilityNodeInfo>()
        collectMoreActionsNodesRecursively(root, moreActionsNodes)

        for (actionNode in moreActionsNodes) {
            val desc = actionNode.contentDescription?.toString()?.trim() ?: ""
            val rawTitle = desc.substringAfter("More actions for ", "").trim()
            if (rawTitle.isBlank()) {
                actionNode.recycle()
                continue
            }

            val moreActionsBounds = Rect()
            actionNode.getBoundsInScreen(moreActionsBounds)

            val displayMetrics = context.resources.displayMetrics
            val maxContentBottom = (displayMetrics.heightPixels - 280).coerceAtLeast(1600)

            // Ignore buttons outside the content area (e.g. appbar/toolbar or navigation bar)
            if (moreActionsBounds.top < 100 || moreActionsBounds.bottom > maxContentBottom) {
                actionNode.recycle()
                continue
            }

            // Find the item card/row container: Walk up ancestors to find the clickable card or full row container
            var cardNode: AccessibilityNodeInfo? = null
            var bestRowContainer: AccessibilityNodeInfo? = null
            var currentAncestor: AccessibilityNodeInfo? = actionNode.parent
            while (currentAncestor != null) {
                val r = Rect()
                currentAncestor.getBoundsInScreen(r)
                if (r.height() in 60..800 && r.width() > 150) {
                    if (currentAncestor.isClickable) {
                        cardNode = AccessibilityNodeInfo.obtain(currentAncestor)
                        currentAncestor.recycle()
                        break
                    } else if (bestRowContainer == null && r.width() > 400) {
                        bestRowContainer = AccessibilityNodeInfo.obtain(currentAncestor)
                    }
                }
                val parent = currentAncestor.parent
                currentAncestor.recycle()
                currentAncestor = parent
            }
            if (cardNode == null && bestRowContainer != null) {
                cardNode = bestRowContainer
            }

            val cardBounds = Rect()
            if (cardNode != null) {
                cardNode.getBoundsInScreen(cardBounds)
            } else {
                actionNode.getBoundsInScreen(cardBounds)
            }

            // Check descriptions and text of all descendants in this card
            val itemDescs = mutableListOf<String>()
            val nodeToInspect = cardNode ?: actionNode
            collectAllChildDescriptions(nodeToInspect, itemDescs)

            val isFolder = isDriveFolder(
                title = rawTitle,
                descriptions = itemDescs,
                viewId = actionNode.viewIdResourceName ?: ""
            )

            val lowerDescs = itemDescs.map { it.trim().lowercase(Locale.US) }
            val hasFileBadge = lowerDescs.any { DRIVE_FILE_BADGES.contains(it) }

            val representativeNode = cardNode ?: AccessibilityNodeInfo.obtain(actionNode)
            actionNode.recycle()

            outList.add(
                DriveSharedItem(
                    title = rawTitle,
                    subtitle = itemDescs.joinToString(", "),
                    isFolder = isFolder,
                    hasFileBadge = hasFileBadge,
                    node = representativeNode,
                    bounds = cardBounds,
                    moreActionsBounds = moreActionsBounds
                )
            )
        }
    }

    private fun collectMoreActionsNodesRecursively(node: AccessibilityNodeInfo, outList: MutableList<AccessibilityNodeInfo>) {
        val desc = node.contentDescription?.toString()?.trim() ?: ""
        if (desc.startsWith("More actions for ", ignoreCase = true)) {
            outList.add(AccessibilityNodeInfo.obtain(node))
            return
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            collectMoreActionsNodesRecursively(child, outList)
            child.recycle()
        }
    }

    private fun collectAllChildDescriptions(node: AccessibilityNodeInfo, outList: MutableList<String>) {
        val desc = node.contentDescription?.toString()?.trim() ?: ""
        val text = node.text?.toString()?.trim() ?: ""
        if (desc.isNotBlank() && !desc.startsWith("More actions for ", ignoreCase = true)) {
            outList.add(desc)
        }
        if (text.isNotBlank()) {
            outList.add(text)
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            collectAllChildDescriptions(child, outList)
            child.recycle()
        }
    }

    private fun collectDriveItemsRecursively(node: AccessibilityNodeInfo, outList: MutableList<DriveSharedItem>) {
        val viewId = node.viewIdResourceName?.lowercase(Locale.US) ?: ""
        val desc = node.contentDescription?.toString()?.trim() ?: ""
        val text = node.text?.toString()?.trim() ?: ""
        val className = node.className?.toString() ?: ""

        val isContainer = node.isScrollable ||
                className.contains("RecyclerView") ||
                className.contains("ViewPager") ||
                className.contains("ScrollView") ||
                viewId.contains("recycler") ||
                viewId.contains("container") ||
                viewId.contains("content") ||
                viewId.contains("parent")

        val rect = Rect()
        node.getBoundsInScreen(rect)
        val isReasonableItemHeight = rect.height() in 40..500 && rect.width() > 100

        val displayMetrics = context.resources.displayMetrics
        val maxContentBottom = (displayMetrics.heightPixels - 280).coerceAtLeast(1600)

        // Exclude system areas (appbar, toolbar, bottom navigation)
        if (rect.top < 100 || rect.bottom > maxContentBottom) {
            return
        }

        // Check if this node represents an individual file or folder entry
        val isItemRoot = !isContainer && isReasonableItemHeight && (
                viewId.contains("item_root") ||
                viewId.contains("entry_view") ||
                viewId.contains("card_view") ||
                viewId.contains("doc_list_item") ||
                viewId.contains("file_list_item") ||
                viewId.contains("drive_entry") ||
                (node.isClickable && (desc.length > 3 || text.length > 3) && !viewId.contains("search") && !viewId.contains("tab"))
        )

        if (isItemRoot && (desc.isNotBlank() || text.isNotBlank())) {
            val titleText = (if (text.isNotBlank()) text else desc.substringBefore(",").substringBefore("\n")).trim()
            val subtitleText = desc.trim()

            // Guard against system navigation bar items, headers, and buttons
            val isSystemOrHeader = titleText.equals("home", ignoreCase = true) ||
                    titleText.equals("starred", ignoreCase = true) ||
                    titleText.equals("shared", ignoreCase = true) ||
                    titleText.equals("files", ignoreCase = true) ||
                    titleText.equals("search", ignoreCase = true) ||
                    titleText.equals("search in drive", ignoreCase = true) ||
                    titleText.equals("more actions", ignoreCase = true) ||
                    titleText.equals("more options", ignoreCase = true) ||
                    titleText.startsWith("more actions for", ignoreCase = true) ||
                    titleText.startsWith("sort by", ignoreCase = true) ||
                    titleText.equals("view as list", ignoreCase = true) ||
                    titleText.equals("view as grid", ignoreCase = true) ||
                    titleText.equals("last week", ignoreCase = true) ||
                    titleText.equals("earlier this month", ignoreCase = true) ||
                    titleText.equals("earlier this year", ignoreCase = true) ||
                    titleText.equals("today", ignoreCase = true) ||
                    titleText.equals("yesterday", ignoreCase = true) ||
                    desc.contains("tab,") || viewId.contains("navigation_bar") || viewId.contains("nav_button")

            if (isSystemOrHeader) {
                return
            }

            val itemDescs = mutableListOf<String>()
            collectAllChildDescriptions(node, itemDescs)

            val isFolder = isDriveFolder(
                title = titleText,
                descriptions = itemDescs,
                viewId = viewId
            )
            val lowerDescs = itemDescs.map { it.trim().lowercase(Locale.US) }
            val hasFileBadge = lowerDescs.any { DRIVE_FILE_BADGES.contains(it) }

            outList.add(
                DriveSharedItem(
                    title = titleText,
                    subtitle = subtitleText,
                    isFolder = isFolder,
                    hasFileBadge = hasFileBadge,
                    node = AccessibilityNodeInfo.obtain(node),
                    bounds = rect
                )
            )
            return // Do not inspect children of an already identified item container
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            collectDriveItemsRecursively(child, outList)
            child.recycle()
        }
    }

    /**
     * Matches a Google Drive item against pending attachments using:
     * 1. Primary: Normalized filename and extension compatibility.
     * 2. Disambiguation: Date/time matching against parent notice timestamp if multiple files share identical names.
     */
    private suspend fun matchDriveItemToPendingAttachment(
        item: DriveSharedItem,
        pendingAttachments: List<AttachmentEntity>
    ): AttachmentEntity? {
        return findBestCandidate(
            driveTitle = item.title,
            driveSubtitle = item.subtitle,
            pendingAttachments = pendingAttachments,
            noticeLookup = { noticeId ->
                val parentNotice = database.noticeDao().findById(noticeId)
                if (parentNotice != null) Pair(parentNotice.title, parentNotice.body) else null
            }
        )
    }

    /**
     * Selects multiple items in Google Drive and dispatches "Send a copy" -> "K.I.D.S. Vault".
     */
    private suspend fun selectAndDispatchBatch(batch: List<DriveSharedItem>): Boolean {
        if (batch.isEmpty()) return false

        // Optimization for single file: Try row's 3-dots button first (fast and reliable)
        if (batch.size == 1) {
            val singleItem = batch.first()
            val dispatchedSingle = dispatchSingleItemViaRowMenu(singleItem)
            if (dispatchedSingle) {
                singleItem.node.recycle()
                return true
            }
            // If row 3-dots wasn't found or failed, fall through to multi-select
        }

        // 1. Long-press first item to activate multi-select mode in Drive
        val firstItem = batch.first()
        var multiSelectActivated = firstItem.node.performAction(AccessibilityNodeInfo.ACTION_LONG_CLICK)
        if (!multiSelectActivated) {
            multiSelectActivated = dispatchLongPressAction(
                firstItem.bounds.centerX().toFloat(),
                firstItem.bounds.centerY().toFloat()
            )
        }
        firstItem.node.recycle()
        delay(600L) // Allow contextual action bar animation to complete

        // 2. Tap remaining items in the batch to include them in the selection
        for (i in 1 until batch.size) {
            val item = batch[i]
            val tapped = item.node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            if (!tapped) {
                dispatchTapAction(item.bounds.centerX().toFloat(), item.bounds.centerY().toFloat())
            }
            item.node.recycle()
            delay(250L)
        }

        // 3. Find and click Drive's top-right overflow menu (More options / ⋮)
        var overflowButton: AccessibilityNodeInfo? = null
        waitForConditionAction(2500L, 250L) {
            val overflowRoot = rootInActiveWindowProvider() ?: return@waitForConditionAction false
            overflowButton = findOverflowMenuButton(overflowRoot)
                ?: findTopRightActionButton(overflowRoot)
            overflowRoot.recycle()
            overflowButton != null
        }

        if (overflowButton == null) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Overflow menu button not found in Drive multi-select. Falling back to row-by-row dispatch...")
            dispatchBackAction()
            delay(500L)
            var individualSuccess = 0
            for (item in batch) {
                if (dispatchSingleItemViaRowMenu(item)) {
                    individualSuccess++
                    delay(800L)
                }
            }
            return individualSuccess > 0
        }

        val clickedOverflow = overflowButton?.performAction(AccessibilityNodeInfo.ACTION_CLICK) == true
        if (!clickedOverflow) {
            val rect = Rect()
            overflowButton?.getBoundsInScreen(rect)
            if (rect.width() > 0) {
                dispatchTapAction(rect.centerX().toFloat(), rect.centerY().toFloat())
            }
        }
        overflowButton?.recycle()
        delay(600L)

        // 4. Find and click "Send a copy" in the overflow popup menu
        var sendCopyNode: AccessibilityNodeInfo? = null
        waitForConditionAction(2500L, 200L) {
            val popupRoot = rootInActiveWindowProvider() ?: return@waitForConditionAction false
            sendCopyNode = findSendCopyNode(popupRoot)
            popupRoot.recycle()
            sendCopyNode != null
        }

        if (sendCopyNode == null) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "'Send a copy' option not found in Drive popup menu. Falling back to row-by-row dispatch...")
            dispatchBackAction()
            delay(400L)
            var individualSuccess = 0
            for (item in batch) {
                if (dispatchSingleItemViaRowMenu(item)) {
                    individualSuccess++
                    delay(800L)
                }
            }
            return individualSuccess > 0
        }

        val clickCopyOk = sendCopyNode?.performAction(AccessibilityNodeInfo.ACTION_CLICK) == true
        if (!clickCopyOk) {
            val r = Rect()
            sendCopyNode?.getBoundsInScreen(r)
            if (r.width() > 0) {
                dispatchTapAction(r.centerX().toFloat(), r.centerY().toFloat())
            }
        }
        sendCopyNode?.recycle()

        // 5. Select "K.I.D.S. Vault" in the Android system chooser
        selectKidsInChooserAction()

        // 6. Ensure Google Drive exits multi-select mode so subsequent swipes scroll the list
        dismissMultiSelectMode()
        return true
    }

    private suspend fun dismissMultiSelectMode() {
        delay(600L)
        val root = rootInActiveWindowProvider() ?: return
        val texts = mutableListOf<String>()
        collectAllChildDescriptions(root, texts)
        val combined = texts.joinToString(" ").lowercase(Locale.US)
        val isMultiSelectActive = combined.contains("selected") || combined.contains("clear selection")
        if (isMultiSelectActive) {
            val closeBtn = findCloseSelectionButton(root)
            if (closeBtn != null) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Dismissing multi-select mode via Close button...")
                val ok = closeBtn.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                if (!ok) {
                    val r = Rect()
                    closeBtn.getBoundsInScreen(r)
                    dispatchTapAction(r.centerX().toFloat(), r.centerY().toFloat())
                }
                closeBtn.recycle()
            } else {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Dismissing multi-select mode via Back action...")
                dispatchBackAction()
            }
            delay(400L)
        }
        root.recycle()
    }

    private fun findCloseSelectionButton(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val desc = root.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val text = root.text?.toString()?.lowercase(Locale.US) ?: ""
        if (desc.contains("clear selection") || desc.contains("close selection") ||
            desc.contains("cancel selection") || (desc == "close" && root.isClickable)) {
            return AccessibilityNodeInfo.obtain(root)
        }
        for (i in 0 until root.childCount) {
            val child = root.getChild(i) ?: continue
            val found = findCloseSelectionButton(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private suspend fun dispatchSingleItemViaRowMenu(item: DriveSharedItem): Boolean {
        val displayMetrics = context.resources.displayMetrics
        val screenWidth = displayMetrics.widthPixels.toFloat()

        // Tap the 3-dots menu button on this file row
        val tapX = item.moreActionsBounds?.centerX()?.toFloat()
            ?: ((screenWidth - 80f).coerceAtLeast(item.bounds.right - 100f))
        val tapY = item.moreActionsBounds?.centerY()?.toFloat()
            ?: item.bounds.centerY().toFloat()

        CrawlerTraceLogger.log("DRIVE_HARVESTER", "Opening item action sheet for \"${item.title}\" via 3-dots menu (tap at $tapX, $tapY)...")
        dispatchTapAction(tapX, tapY)
        delay(600L)

        // Find "Send a copy" in the opened bottom sheet
        var sendCopyNode: AccessibilityNodeInfo? = null
        waitForConditionAction(2000L, 150L) {
            val sheetRoot = rootInActiveWindowProvider() ?: return@waitForConditionAction false
            sendCopyNode = findSendCopyNode(sheetRoot)
            sheetRoot.recycle()
            sendCopyNode != null
        }

        if (sendCopyNode == null) {
            // Dismiss bottom sheet if opened
            dispatchBackAction()
            delay(400L)
            return false
        }

        val clicked = sendCopyNode?.performAction(AccessibilityNodeInfo.ACTION_CLICK) == true
        if (!clicked) {
            val r = Rect()
            sendCopyNode?.getBoundsInScreen(r)
            if (r.width() > 0) {
                dispatchTapAction(r.centerX().toFloat(), r.centerY().toFloat())
            }
        }
        sendCopyNode?.recycle()

        // Select K.I.D.S. Vault in the system share sheet
        selectKidsInChooserAction()
        return true
    }

    private suspend fun scrollSharedListForward() {
        // Ensure any remaining selection is cleared before scrolling so gestures scroll instead of selecting
        dismissMultiSelectMode()

        // Strategy 1: Attempt native accessibility scroll on the actual scrollable list (e.g. scrollList / RecyclerView)
        var scrolledNatively = false
        val containerBounds = Rect()
        val root = rootInActiveWindowProvider()
        if (root != null) {
            val container = findActualScrollableContainer(root)
            if (container != null) {
                container.getBoundsInScreen(containerBounds)
                scrolledNatively = container.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD)
                container.recycle()
            }
            root.recycle()
        }

        if (scrolledNatively) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Natively scrolled Shared list forward via ACTION_SCROLL_FORWARD.")
            delay(600L)
            return
        }

        val displayMetrics = context.resources.displayMetrics
        val swipeX = if (containerBounds.width() > 0) containerBounds.centerX().toFloat() else (displayMetrics.widthPixels * 0.5f)
        val startY = if (containerBounds.height() > 0) (containerBounds.top + containerBounds.height() * 0.70f) else (displayMetrics.heightPixels * 0.65f)
        val endY = if (containerBounds.height() > 0) (containerBounds.top + containerBounds.height() * 0.20f) else (displayMetrics.heightPixels * 0.22f)
        CrawlerTraceLogger.log("DRIVE_HARVESTER", "Dispatched forward swipe on Shared list (Y: ${startY.toInt()} -> ${endY.toInt()})...")

        // Physical touch drag is universally reliable across both Compose and View hierarchies
        dispatchSwipeAction(
            swipeX,
            startY,
            swipeX,
            endY,
            450L
        )
        delay(850L)
    }

    private fun findActualScrollableContainer(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val candidates = mutableListOf<AccessibilityNodeInfo>()
        collectAllScrollableNodes(root, candidates)
        val dm = context.resources.displayMetrics
        val minListHeight = (dm.heightPixels * 0.30f).toInt()
        val maxListHeight = dm.heightPixels - (dm.density * 60).toInt()
        val minListTop = (dm.density * 40).toInt()
        val best = candidates.firstOrNull { node ->
            val r = Rect()
            node.getBoundsInScreen(r)
            val rid = node.viewIdResourceName?.lowercase(Locale.US) ?: ""
            (rid.contains("scrolllist") || rid.contains("recycler") || rid.contains("list")) && r.height() in minListHeight..maxListHeight
        } ?: candidates.firstOrNull { node ->
            val r = Rect()
            node.getBoundsInScreen(r)
            r.top > minListTop && r.height() in minListHeight..maxListHeight
        }
        for (candidate in candidates) {
            if (candidate != best) {
                candidate.recycle()
            }
        }
        return best
    }

    private fun findFirstScrollableNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        if (node.isScrollable) {
            return AccessibilityNodeInfo.obtain(node)
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findFirstScrollableNode(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun collectAllScrollableNodes(node: AccessibilityNodeInfo, outList: MutableList<AccessibilityNodeInfo>) {
        if (node.isScrollable) {
            outList.add(AccessibilityNodeInfo.obtain(node))
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            collectAllScrollableNodes(child, outList)
            child.recycle()
        }
    }

    private suspend fun getPendingUncapturedAttachments(): List<AttachmentEntity> {
        val all = database.attachmentDao().getAllAttachmentsDirect()
        return all.filter { att ->
            att.localUri.isBlank() &&
                    (att.driveFileId.isNullOrBlank() || att.driveFileId.startsWith("virtual_")) &&
                    att.driveFileId?.startsWith("restricted_") != true
        }
    }

    private suspend fun dismissAnyActiveViewer() {
        var attempts = 0
        while (attempts < 4) {
            val root = rootInActiveWindowProvider() ?: break
            val isPlayerOrViewer = findNodeContainingText(root, "playback speed") != null ||
                    findNodeContainingText(root, "rewind") != null ||
                    findNodeContainingText(root, "fast forward") != null ||
                    findNodeContainingText(root, "annotation") != null ||
                    findNodeContainingText(root, "edit file") != null ||
                    findNodeContainingText(root, "find") != null ||
                    findNodeContainingText(root, "comments") != null ||
                    findNodeContainingText(root, "external badge") != null ||
                    findNodeContainingText(root, "external") != null
            root.recycle()
            if (isPlayerOrViewer) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Active file preview / media player detected. Pressing Back to return to Drive...")
                dispatchBackAction()
                delay(800L)
                attempts++
            } else {
                break
            }
        }
    }

    /**
     * Autonomous Auto-Recovery Pipeline for Pass 3 (Google Drive Harvester).
     *
     * Inspects active window hierarchy and self-heals from:
     * 1. Viewer / Editor / Player Displacement: Dismisses full-screen previews/editors via Navigate Up or Back.
     * 2. Stray Bottom Sheet / Modal Dialog: Dismisses popup cards and 3-dot menus.
     * 3. Stuck Multi-Select Mode: Clears stuck selection so scrolling and item scanning can proceed.
     * 4. Subfolder Orphan Displacement: Returns to the root Shared tab if trapped inside a subfolder outside folder traversal.
     * 5. Tab Displacement: Re-navigates to the "Shared" tab if displaced to Home, Starred, or Files tab.
     *
     * Returns true if an auto-recovery action was executed and the caller should re-sample the window.
     */
    suspend fun performDriveAutoRecoveryIfDisplaced(root: AccessibilityNodeInfo): Boolean {
        // 1. Check for Active Viewer / Document Editor / Media Player
        if (isDriveViewerOrEditorScreen(root)) {
            CrawlerTraceLogger.log(
                "DRIVE_AUTO_RECOVERY",
                "Displaced to document viewer/editor/player. Executing auto-recovery back to Drive list..."
            )
            crawlerOverlay?.updateStatus("Drive Auto-Recovery", "Returning from file preview...")
            dismissAnyActiveViewer()
            delay(SETTLING_DELAY_MS)
            return true
        }

        // 2. Check for Stray Modal Bottom Sheet / Dialog
        if (isStrayDriveBottomSheet(root)) {
            CrawlerTraceLogger.log(
                "DRIVE_AUTO_RECOVERY",
                "Stray modal bottom sheet/dialog detected. Dismissing..."
            )
            dispatchBackAction()
            delay(SETTLING_DELAY_MS)
            return true
        }

        // 3. Check for Stuck Multi-Select Mode (when not currently in a dispatch batch)
        if (isStuckMultiSelectMode(root)) {
            CrawlerTraceLogger.log(
                "DRIVE_AUTO_RECOVERY",
                "Stuck multi-selection mode detected. Auto-clearing selection..."
            )
            dismissMultiSelectMode()
            delay(500L)
            return true
        }

        // 4. Check for Subfolder Orphan Displacement (when activeHarvestingFolderName == null)
        if (activeHarvestingFolderName == null && isInsideFolderWithoutBottomNav(root)) {
            CrawlerTraceLogger.log(
                "DRIVE_AUTO_RECOVERY",
                "Trapped in subfolder outside active folder traversal. Auto-recovering to Shared root..."
            )
            crawlerOverlay?.updateStatus("Drive Auto-Recovery", "Returning to Shared root...")
            ensureAtDriveRoot()
            navigateToSharedTab()
            delay(SETTLING_DELAY_MS)
            return true
        }

        // 5. Check for Tab Displacement (Displaced from Shared tab to Home, Starred, or Files)
        if (activeHarvestingFolderName == null && isDisplacedFromSharedTab(root)) {
            CrawlerTraceLogger.log(
                "DRIVE_AUTO_RECOVERY",
                "Displaced to another Drive tab (Home/Starred/Files). Auto-navigating back to Shared tab..."
            )
            crawlerOverlay?.updateStatus("Drive Auto-Recovery", "Re-selecting Shared tab...")
            val recovered = navigateToSharedTab()
            delay(SETTLING_DELAY_MS)
            return recovered
        }

        return false
    }

    private fun isDriveViewerOrEditorScreen(root: AccessibilityNodeInfo): Boolean {
        val displayMetrics = context.resources.displayMetrics
        val minTabTop = (displayMetrics.heightPixels * 0.75f).toInt()
        val minTabLeft = (displayMetrics.widthPixels * 0.35f).toInt()
        val sharedTab = findSharedTabNodeInternal(root, minTabTop, minTabLeft)
        if (sharedTab != null) {
            sharedTab.recycle()
            return false
        }

        val texts = mutableListOf<String>()
        collectAllChildDescriptions(root, texts)
        val combined = texts.joinToString(" ").lowercase(Locale.US)

        return combined.contains("playback speed") ||
                combined.contains("page 1 of") ||
                combined.contains("page 1/") ||
                combined.contains("fit to width") ||
                combined.contains("fit to screen") ||
                combined.contains("edit file") ||
                combined.contains("annotation") ||
                combined.contains("mode switch") ||
                (combined.contains("view only") && findNavigateUpButton(root) != null)
    }

    private fun isStrayDriveBottomSheet(root: AccessibilityNodeInfo): Boolean {
        val texts = mutableListOf<String>()
        collectAllChildDescriptions(root, texts)
        val combined = texts.joinToString(" ").lowercase(Locale.US)

        val hasBottomSheetIndicators = combined.contains("details & activity") ||
                combined.contains("who has access") ||
                combined.contains("manage people and links") ||
                combined.contains("add to starred") ||
                combined.contains("make a copy")

        val displayMetrics = context.resources.displayMetrics
        val minTabTop = (displayMetrics.heightPixels * 0.75f).toInt()
        val minTabLeft = (displayMetrics.widthPixels * 0.35f).toInt()
        val sharedTab = findSharedTabNodeInternal(root, minTabTop, minTabLeft)
        val hasBottomTabs = sharedTab != null
        sharedTab?.recycle()

        return hasBottomSheetIndicators && !hasBottomTabs
    }

    private fun isStuckMultiSelectMode(root: AccessibilityNodeInfo): Boolean {
        val closeBtn = findCloseSelectionButton(root)
        if (closeBtn != null) {
            closeBtn.recycle()
            return true
        }
        val texts = mutableListOf<String>()
        collectAllChildDescriptions(root, texts)
        val combined = texts.joinToString(" ").lowercase(Locale.US)
        return combined.contains("selected") && combined.contains("clear selection")
    }

    private fun isInsideFolderWithoutBottomNav(root: AccessibilityNodeInfo): Boolean {
        if (isDriveViewerOrEditorScreen(root)) return false
        val displayMetrics = context.resources.displayMetrics
        val minTabTop = (displayMetrics.heightPixels * 0.75f).toInt()
        val minTabLeft = (displayMetrics.widthPixels * 0.35f).toInt()
        val sharedTab = findSharedTabNodeInternal(root, minTabTop, minTabLeft)
        val hasBottomTabs = sharedTab != null
        sharedTab?.recycle()

        val navUp = findNavigateUpButton(root)
        val isFolder = !hasBottomTabs && navUp != null
        navUp?.recycle()
        return isFolder
    }

    private fun isDisplacedFromSharedTab(root: AccessibilityNodeInfo): Boolean {
        val displayMetrics = context.resources.displayMetrics
        val minTabTop = (displayMetrics.heightPixels * 0.75f).toInt()
        val minTabLeft = (displayMetrics.widthPixels * 0.35f).toInt()
        val sharedTab = findSharedTabNodeInternal(root, minTabTop, minTabLeft) ?: return false
        val isSharedSelected = isNodeMarkedSelected(sharedTab)
        sharedTab.recycle()

        if (isSharedSelected) {
            return false
        }

        val otherSelectedTab = findSelectedNonSharedTab(root)
        val isDisplaced = otherSelectedTab != null
        otherSelectedTab?.recycle()
        return isDisplaced
    }

    private fun isNodeMarkedSelected(node: AccessibilityNodeInfo): Boolean {
        if (node.isSelected) return true
        val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        if (desc.startsWith("selected") || desc.contains(", selected") || desc.contains("selected,")) return true
        val parent = node.parent
        val isParentSelected = parent?.isSelected == true ||
                parent?.contentDescription?.toString()?.lowercase(Locale.US)?.startsWith("selected") == true ||
                parent?.contentDescription?.toString()?.lowercase(Locale.US)?.contains(", selected") == true
        parent?.recycle()
        return isParentSelected
    }

    private fun findSelectedNonSharedTab(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val displayMetrics = context.resources.displayMetrics
        val minTabTop = (displayMetrics.heightPixels * 0.75f).toInt()
        return findSelectedNonSharedTabInternal(root, minTabTop)
    }

    private fun findSelectedNonSharedTabInternal(node: AccessibilityNodeInfo, minTabTop: Int): AccessibilityNodeInfo? {
        val bounds = Rect()
        node.getBoundsInScreen(bounds)
        val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val text = node.text?.toString()?.lowercase(Locale.US) ?: ""
        val viewId = node.viewIdResourceName?.lowercase(Locale.US) ?: ""

        val isInBottomNavBar = bounds.top >= minTabTop
        val isNonSharedTab = isInBottomNavBar && (
                desc.contains("home") || desc.contains("starred") || desc.contains("files") ||
                viewId.contains("menu_navigation_home") || viewId.contains("menu_navigation_starred") || viewId.contains("menu_navigation_files") ||
                text == "home" || text == "starred" || text == "files"
        )

        if (isNonSharedTab && isNodeMarkedSelected(node)) {
            return AccessibilityNodeInfo.obtain(node)
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findSelectedNonSharedTabInternal(child, minTabTop)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun findSharedTabNode(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val displayMetrics = context.resources.displayMetrics
        val minTabTop = (displayMetrics.heightPixels * 0.75f).toInt()
        val minTabLeft = (displayMetrics.widthPixels * 0.35f).toInt()
        return findSharedTabNodeInternal(root, minTabTop, minTabLeft)
    }

    private fun findSharedTabNodeInternal(node: AccessibilityNodeInfo, minTabTop: Int, minTabLeft: Int): AccessibilityNodeInfo? {
        val bounds = Rect()
        node.getBoundsInScreen(bounds)

        val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val text = node.text?.toString()?.lowercase(Locale.US) ?: ""
        val viewId = node.viewIdResourceName?.lowercase(Locale.US) ?: ""

        val isInBottomNavBar = bounds.top >= minTabTop && bounds.left >= minTabLeft

        val isSharedTab = (isInBottomNavBar && (
                desc == "shared" || desc.contains("shared with me") ||
                desc.contains("tab, 3 of") || text == "shared"
        )) || viewId.contains("menu_navigation_shared")

        if (isSharedTab) {
            return if (node.isClickable) AccessibilityNodeInfo.obtain(node) else (findClickableAncestor(node) ?: AccessibilityNodeInfo.obtain(node))
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findSharedTabNodeInternal(child, minTabTop, minTabLeft)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    /**
     * Ensures Google Drive is configured for optimal harvesting:
     * 1. Layout Mode: Switches from Grid Layout to List Layout if currently in Grid.
     * 2. Sort Criterion: Sets sorting to "Date shared" (or "Shared date") so that recent school notices appear at the top.
     * 3. Sort Direction: Ensures reverse-chronological order (newest first) so that the academic year cutoff works reliably.
     */
    private suspend fun ensureProperViewAndSorting(): Boolean {
        ensureListLayout()
        ensureDateSharedSorting()
        ensureDescendingSortDirection()
        return true
    }

    /**
     * Ensures Google Drive is displaying items in List layout rather than Grid layout.
     * List layout provides full horizontal width for post titles and unambiguous date subtitles.
     */
    private suspend fun ensureListLayout(): Boolean {
        val root = rootInActiveWindowProvider() ?: return false
        val switchToListNode = findSwitchToListLayoutNode(root)
        if (switchToListNode != null) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Grid layout detected. Switching Google Drive to List layout...")
            val clicked = if (switchToListNode.isClickable) {
                switchToListNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            } else {
                findClickableAncestor(switchToListNode)?.let {
                    val ok = it.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    it.recycle()
                    ok
                } ?: false
            }
            if (!clicked) {
                val bounds = Rect()
                switchToListNode.getBoundsInScreen(bounds)
                dispatchTapAction(bounds.centerX().toFloat(), bounds.centerY().toFloat())
            }
            switchToListNode.recycle()
            root.recycle()
            delay(SETTLING_DELAY_MS)
            return true
        } else {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Google Drive is in List layout (or already optimal).")
        }
        root.recycle()
        return false
    }

    private fun findSwitchToListLayoutNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val text = node.text?.toString()?.lowercase(Locale.US) ?: ""

        val isSwitchToList = (desc.contains("switch to list") || desc.contains("list view") || text.contains("list view") ||
                desc.contains("view as list") || text.contains("view as list") || desc.contains("list layout")) &&
                !desc.contains("switch to grid") && !text.contains("grid view") && !desc.contains("view as grid")

        if (isSwitchToList) {
            return if (node.isClickable) AccessibilityNodeInfo.obtain(node) else (findClickableAncestor(node) ?: AccessibilityNodeInfo.obtain(node))
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findSwitchToListLayoutNode(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    /**
     * Checks if Drive is sorted by Date shared / Shared date, and if not, opens the sort dialog to select it.
     */
    private suspend fun ensureDateSharedSorting(): Boolean {
        val root = rootInActiveWindowProvider() ?: return false

        // Check if already sorted by Date shared
        val sortLabel = findCurrentSortLabel(root)
        if (sortLabel != null && (sortLabel.contains("date shared") || sortLabel.contains("shared date"))) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Google Drive is already sorted by: $sortLabel")
            root.recycle()
            return true
        }

        // Find sort trigger button/chip
        val sortButtonNode = findSortTriggerNode(root)
        if (sortButtonNode == null) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Sort button not detected in toolbar. Retaining current sorting.")
            root.recycle()
            return false
        }

        CrawlerTraceLogger.log("DRIVE_HARVESTER", "Opening Google Drive sort options dialog...")
        val clicked = if (sortButtonNode.isClickable) {
            sortButtonNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        } else {
            findClickableAncestor(sortButtonNode)?.let {
                val ok = it.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                it.recycle()
                ok
            } ?: false
        }
        if (!clicked) {
            val bounds = Rect()
            sortButtonNode.getBoundsInScreen(bounds)
            dispatchTapAction(bounds.centerX().toFloat(), bounds.centerY().toFloat())
        }
        sortButtonNode.recycle()
        root.recycle()

        delay(SETTLING_DELAY_MS)

        // Locate and select Date shared / Shared date in bottom sheet
        return selectDateSharedOptionInBottomSheet()
    }

    private fun findCurrentSortLabel(root: AccessibilityNodeInfo): String? {
        val candidates = mutableListOf<String>()
        collectTopHeaderTexts(root, candidates, maxDepth = 6, maxY = 850)
        return candidates.firstOrNull { candidate ->
            val lower = candidate.lowercase(Locale.US)
            lower.contains("date shared") || lower.contains("shared date") ||
                    lower.contains("last modified") || lower.contains("name")
        }
    }

    private fun collectTopHeaderTexts(node: AccessibilityNodeInfo, outList: MutableList<String>, maxDepth: Int, maxY: Int) {
        if (maxDepth <= 0) return
        val bounds = Rect()
        node.getBoundsInScreen(bounds)
        if (bounds.top <= maxY) {
            val text = node.text?.toString()?.trim() ?: ""
            val desc = node.contentDescription?.toString()?.trim() ?: ""
            if (text.isNotBlank()) outList.add(text)
            if (desc.isNotBlank()) outList.add(desc)
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            collectTopHeaderTexts(child, outList, maxDepth - 1, maxY)
            child.recycle()
        }
    }

    private fun findSortTriggerNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val text = node.text?.toString()?.lowercase(Locale.US) ?: ""
        val viewId = node.viewIdResourceName?.lowercase(Locale.US) ?: ""

        val bounds = Rect()
        node.getBoundsInScreen(bounds)

        val inHeaderZone = bounds.top < 850 && bounds.height() > 20

        val isSortTrigger = inHeaderZone && (
                desc.contains("sort by") || desc.contains("sort options") ||
                desc.startsWith("sort") || text.equals("sort", ignoreCase = true) ||
                viewId.contains("sort_button") || viewId.contains("sort_by") ||
                viewId.contains("sort_type") ||
                (node.isClickable && (text.contains("Date shared", ignoreCase = true) || text.contains("Shared date", ignoreCase = true) ||
                 text.contains("Last modified", ignoreCase = true) || text.contains("Name", ignoreCase = true) ||
                 desc.contains("Date shared", ignoreCase = true) || desc.contains("Shared date", ignoreCase = true) ||
                 desc.contains("Last modified", ignoreCase = true) || desc.contains("Name", ignoreCase = true)))
        )

        if (isSortTrigger) {
            return if (node.isClickable) AccessibilityNodeInfo.obtain(node) else (findClickableAncestor(node) ?: AccessibilityNodeInfo.obtain(node))
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findSortTriggerNode(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private suspend fun selectDateSharedOptionInBottomSheet(): Boolean {
        val sheetRoot = rootInActiveWindowProvider() ?: return false
        val dateOptionNode = findNodeContainingText(sheetRoot, "date shared")
            ?: findNodeContainingText(sheetRoot, "shared date")
            ?: findNodeContainingText(sheetRoot, "date")
            ?: findNodeContainingText(sheetRoot, "last modified")

        if (dateOptionNode != null) {
            val optionText = dateOptionNode.text?.toString() ?: dateOptionNode.contentDescription?.toString() ?: "Date shared"
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Selecting sort option: \"$optionText\"")
            val clicked = if (dateOptionNode.isClickable) {
                dateOptionNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            } else {
                findClickableAncestor(dateOptionNode)?.let {
                    val ok = it.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    it.recycle()
                    ok
                } ?: false
            }
            if (!clicked) {
                val bounds = Rect()
                dateOptionNode.getBoundsInScreen(bounds)
                dispatchTapAction(bounds.centerX().toFloat(), bounds.centerY().toFloat())
            }
            dateOptionNode.recycle()
            sheetRoot.recycle()
            delay(SETTLING_DELAY_MS)
            return true
        } else {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Date shared option not found in sort sheet. Dismissing sheet.")
            sheetRoot.recycle()
            dispatchBackAction()
            delay(300L)
            return false
        }
    }

    /**
     * Ensures sort order is descending (newest items on top).
     * If items are ascending (oldest on top), taps the sort direction toggle to reverse it.
     */
    private suspend fun ensureDescendingSortDirection(): Boolean {
        val root = rootInActiveWindowProvider() ?: return false

        // Check if items are currently ordered ascending
        val visibleItems = scanVisibleDriveItems(root)
        val datedItems = visibleItems.mapNotNull { item ->
            ClassroomDateParser.parse(item.subtitle)?.let { Pair(item, it) }
        }

        var isChronologicallyAscending = false
        if (datedItems.size >= 2) {
            val firstDateMs = datedItems[0].second.timestampMs
            val secondDateMs = datedItems[1].second.timestampMs
            // If top item is older than second item by more than 1 day, it is ordered oldest first (ascending)
            if (firstDateMs < secondDateMs - 86400000L) {
                isChronologicallyAscending = true
            }
        }

        // Check sort direction button
        val reverseSortButton = findReverseSortButton(root)

        // Recycle visible item nodes
        for (item in visibleItems) {
            item.node.recycle()
        }

        if (isChronologicallyAscending && reverseSortButton != null) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Ascending (oldest first) sort detected. Inverting sort direction to Newest first...")
            val clicked = if (reverseSortButton.isClickable) {
                reverseSortButton.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            } else {
                findClickableAncestor(reverseSortButton)?.let {
                    val ok = it.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    it.recycle()
                    ok
                } ?: false
            }
            if (!clicked) {
                val bounds = Rect()
                reverseSortButton.getBoundsInScreen(bounds)
                dispatchTapAction(bounds.centerX().toFloat(), bounds.centerY().toFloat())
            }
            reverseSortButton.recycle()
            root.recycle()
            delay(SETTLING_DELAY_MS)
            return true
        } else {
            reverseSortButton?.recycle()
            root.recycle()
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Sort direction is confirmed Newest first (descending).")
            return false
        }
    }

    private fun findReverseSortButton(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val viewId = node.viewIdResourceName?.lowercase(Locale.US) ?: ""

        val bounds = Rect()
        node.getBoundsInScreen(bounds)
        val inHeaderZone = bounds.top < 850

        val isReverseSort = inHeaderZone && (
                desc.contains("reverse sort") || desc.contains("change sort direction") ||
                desc.contains("sort direction") || desc.contains("oldest first") ||
                desc.contains("ascending") || viewId.contains("sort_direction") ||
                viewId.contains("reverse_sort")
        )

        if (isReverseSort) {
            return if (node.isClickable) AccessibilityNodeInfo.obtain(node) else (findClickableAncestor(node) ?: AccessibilityNodeInfo.obtain(node))
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findReverseSortButton(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun findAccountAvatarNode(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val desc = root.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val text = root.text?.toString()?.lowercase(Locale.US) ?: ""
        val viewId = root.viewIdResourceName?.lowercase(Locale.US) ?: ""

        val isAvatar = (desc.contains("google account") || desc.contains("signed in as") ||
                desc.contains("account and settings") || viewId.contains("selected_account_disc") ||
                viewId.contains("og_apd_ring_view") || viewId.contains("account_avatar")) &&
                !desc.contains("collapse account list") && !desc.contains("account list expanded")

        if (isAvatar) {
            val r = Rect()
            root.getBoundsInScreen(r)
            val dm = context.resources.displayMetrics
            val minSize = (dm.density * 24).toInt()
            val maxSize = (dm.density * 96).toInt()
            val maxTop = (dm.heightPixels * 0.25f).toInt()
            if (r.width() in minSize..maxSize && r.height() in minSize..maxSize && r.top < maxTop) {
                return AccessibilityNodeInfo.obtain(root)
            }
        }

        for (i in 0 until root.childCount) {
            val child = root.getChild(i) ?: continue
            val found = findAccountAvatarNode(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun findNodeContainingText(node: AccessibilityNodeInfo, query: String): AccessibilityNodeInfo? {
        val text = node.text?.toString()?.lowercase(Locale.US) ?: ""
        val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""

        if (text.contains(query) || desc.contains(query)) {
            return AccessibilityNodeInfo.obtain(node)
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findNodeContainingText(child, query)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun findOverflowMenuButton(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val text = node.text?.toString()?.lowercase(Locale.US) ?: ""
        val viewId = node.viewIdResourceName?.lowercase(Locale.US) ?: ""

        val isOverflow = desc.contains("more options") ||
                desc.contains("more actions") ||
                desc.contains("more") ||
                desc.contains("overflow") ||
                desc.contains("action menu") ||
                text.contains("more") ||
                viewId.contains("more_options") ||
                viewId.contains("overflow") ||
                viewId.contains("action_menu") ||
                viewId.contains("menu_overflow") ||
                viewId.contains("action_bar_overflow")

        if (isOverflow) {
            return if (node.isClickable) AccessibilityNodeInfo.obtain(node) else (findClickableAncestor(node) ?: AccessibilityNodeInfo.obtain(node))
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findOverflowMenuButton(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun findTopRightActionButton(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val dm = context.resources.displayMetrics
        val screenWidth = dm.widthPixels
        val rect = Rect()
        root.getBoundsInScreen(rect)

        val maxTop = (dm.heightPixels * 0.20f).toInt()
        val minRight = (screenWidth - dm.density * 96).toInt()
        val minDim = (dm.density * 24).toInt()
        val maxDim = (dm.density * 88).toInt()

        val isTopRightBar = rect.top < maxTop && rect.right > minRight && rect.width() in minDim..maxDim && rect.height() in minDim..maxDim
        if (isTopRightBar && root.isClickable) {
            return AccessibilityNodeInfo.obtain(root)
        }

        for (i in 0 until root.childCount) {
            val child = root.getChild(i) ?: continue
            val found = findTopRightActionButton(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun findSendCopyNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val text = node.text?.toString()?.lowercase(Locale.US) ?: ""
        val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""

        val isSendCopy = text.contains("send a copy") || text.contains("send file") ||
                desc.contains("send a copy") || desc.contains("send file")

        if (isSendCopy) {
            return if (node.isClickable) AccessibilityNodeInfo.obtain(node) else (findClickableAncestor(node) ?: AccessibilityNodeInfo.obtain(node))
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findSendCopyNode(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private val attachmentExts = listOf(
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".rtf", ".csv", ".epub",
        ".mp3", ".m4a", ".wav", ".aac", ".ogg", ".wma", ".flac",
        ".mp4", ".mov", ".avi", ".mkv", ".webm", ".3gp",
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg",
        ".zip", ".rar", ".7z"
    )

    private fun isEducationalFile(item: DriveSharedItem): Boolean {
        if (item.isFolder) return false
        if (item.hasFileBadge) return true
        val lower = item.title.trim().lowercase(Locale.US)
        return attachmentExts.any { lower.endsWith(it) } ||
                lower.contains(".pdf") || lower.contains(".doc") || lower.contains(".ppt") ||
                lower.contains(".xls") || lower.contains(".jpg") || lower.contains(".png")
    }

    private suspend fun harvestFolder(
        folderItem: DriveSharedItem,
        pendingAttachments: List<AttachmentEntity>,
        folderDepth: Int = 1
    ): Int {
        val maxFolderDepth = calculateDynamicFolderDepth(pendingAttachments.size)
        if (folderDepth > maxFolderDepth) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Maximum dynamic folder depth ($maxFolderDepth) reached for: \"${folderItem.title}\". Skipping deeper descent.")
            return 0
        }
        CrawlerTraceLogger.log("DRIVE_HARVESTER", "Entering folder (depth $folderDepth/$maxFolderDepth): \"${folderItem.title}\"")
        crawlerOverlay?.updateStatus("Entering Folder...", folderItem.title)

        val clicked = if (folderItem.node.isClickable) {
            folderItem.node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        } else {
            findClickableAncestor(folderItem.node)?.let {
                val ok = it.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                it.recycle()
                ok
            } ?: false
        }

        if (!clicked) {
            dispatchTapAction(folderItem.bounds.centerX().toFloat(), folderItem.bounds.centerY().toFloat())
        }

        delay(SETTLING_DELAY_MS + 400L)

        var harvestedInFolder = 0
        val previousActiveFolder = activeHarvestingFolderName
        activeHarvestingFolderName = folderItem.title
        try {
            ensureListLayout()
            var page = 0
            var consecutiveStaticPages = 0
            var lastVisibleTitles = listOf<String>()
            val processedInFolder = mutableSetOf<String>()
            val processedSubfolders = mutableSetOf<String>()
            val maxScrollPages = calculateDynamicScrollPageLimit(pendingAttachments.size)

            while (serviceScope.isActive && crawlerOverlay?.isAutoScrollingActive() == true && page < maxScrollPages) {
                var folderRoot: AccessibilityNodeInfo? = null
                var folderRetry = 0
                while (serviceScope.isActive && folderRoot == null && folderRetry < 10) {
                    val candidateRoot = rootInActiveWindowProvider()
                    val candidatePkg = candidateRoot?.packageName?.toString() ?: ""
                    if (candidateRoot != null && candidatePkg.contains(DRIVE_PACKAGE_NAME)) {
                        folderRoot = candidateRoot
                    } else {
                        candidateRoot?.recycle()
                        delay(200L)
                        folderRetry++
                    }
                }

                if (folderRoot == null) {
                    bringDriveToForeground()
                    delay(SETTLING_DELAY_MS)
                    continue
                }

                // In-Folder Auto-Recovery: dismiss accidental viewers or stray bottom sheets opened inside folder
                if (isDriveViewerOrEditorScreen(folderRoot) || isStrayDriveBottomSheet(folderRoot) || isStuckMultiSelectMode(folderRoot)) {
                    performDriveAutoRecoveryIfDisplaced(folderRoot)
                    folderRoot.recycle()
                    delay(SETTLING_DELAY_MS)
                    continue
                }

                val itemsInside = scanVisibleDriveItems(folderRoot)
                folderRoot.recycle()

                val visibleTitles = itemsInside.map { it.title }
                if (visibleTitles.isNotEmpty() && visibleTitles == lastVisibleTitles) {
                    consecutiveStaticPages++
                    if (consecutiveStaticPages >= 3) {
                        CrawlerTraceLogger.log("DRIVE_HARVESTER", "Folder \"${folderItem.title}\" reached bottom (same items across $consecutiveStaticPages swipes).")
                        for (item in itemsInside) item.node.recycle()
                        break
                    }
                } else {
                    consecutiveStaticPages = 0
                    if (visibleTitles.isNotEmpty()) {
                        lastVisibleTitles = visibleTitles
                    }
                }

                val batchInFolder = mutableListOf<DriveSharedItem>()
                for (item in itemsInside) {
                    if (!item.isFolder && (isEducationalFile(item) || matchDriveItemToPendingAttachment(item, pendingAttachments) != null)) {
                        if (!processedInFolder.contains(item.title)) {
                            batchInFolder.add(item)
                            if (batchInFolder.size >= MAX_BATCH_SELECTION_SIZE) {
                                break
                            }
                        }
                    }
                }

                if (batchInFolder.isNotEmpty()) {
                    CrawlerTraceLogger.log(
                        "DRIVE_HARVESTER",
                        "Batch harvesting ${batchInFolder.size} files inside folder \"${folderItem.title}\" (page ${page + 1})..."
                    )
                    crawlerOverlay?.updateStatus("Harvesting Folder...", "${batchInFolder.size} files in ${folderItem.title}")

                    val batchOk = selectAndDispatchBatch(batchInFolder)
                    if (batchOk) {
                        harvestedInFolder += batchInFolder.size
                        for (item in batchInFolder) {
                            processedInFolder.add(item.title)
                        }
                        delay(1000L)
                    }
                }

                // Check for unseen subfolders
                val subfoldersToExplore = itemsInside.filter { it.isFolder && !processedSubfolders.contains(it.title) }

                for (item in itemsInside) {
                    if (!batchInFolder.contains(item)) {
                        item.node.recycle()
                    }
                }

                for (subfolder in subfoldersToExplore) {
                    processedSubfolders.add(subfolder.title)
                    val currentWindowRoot = rootInActiveWindowProvider()
                    val freshSubfolderItem = currentWindowRoot?.let { root ->
                        val currentItems = scanVisibleDriveItems(root)
                        root.recycle()
                        val match = currentItems.find { it.isFolder && it.title == subfolder.title }
                        for (ci in currentItems) {
                            if (ci != match) ci.node.recycle()
                        }
                        match
                    }

                    if (freshSubfolderItem != null) {
                        val subHarvested = harvestFolder(freshSubfolderItem, pendingAttachments, folderDepth + 1)
                        harvestedInFolder += subHarvested
                        freshSubfolderItem.node.recycle()
                    }
                }

                page++
                scrollSharedListForward()
                delay(SETTLING_DELAY_MS)
            }
        } finally {
            activeHarvestingFolderName = previousActiveFolder
            returnOneFolderUp()
        }

        return harvestedInFolder
    }

    private suspend fun returnOneFolderUp(): Boolean {
        CrawlerTraceLogger.log("DRIVE_HARVESTER", "Navigating one level up from folder...")
        val root = rootInActiveWindowProvider()
        var clickedNavigateUp = false
        if (root != null) {
            val navUp = findNavigateUpButton(root)
            if (navUp != null) {
                clickedNavigateUp = navUp.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                navUp.recycle()
            }
            root.recycle()
        }

        if (!clickedNavigateUp) {
            dispatchBackAction()
        }

        delay(SETTLING_DELAY_MS + 300L)
        return true
    }

    private fun findNavigateUpButton(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val desc = root.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val text = root.text?.toString()?.lowercase(Locale.US) ?: ""
        val viewId = root.viewIdResourceName?.lowercase(Locale.US) ?: ""

        val isNavUp = (desc.contains("navigate up") || desc.contains("go back") ||
                viewId.contains("up_button") || viewId.contains("navigate_up")) &&
                !desc.contains("more actions") && !desc.contains("more options")

        if (isNavUp) {
            return if (root.isClickable) AccessibilityNodeInfo.obtain(root) else (findClickableAncestor(root) ?: AccessibilityNodeInfo.obtain(root))
        }

        val bounds = Rect()
        root.getBoundsInScreen(bounds)
        val dm = context.resources.displayMetrics
        val maxTop = (dm.heightPixels * 0.20f).toInt()
        val maxLeft = (dm.widthPixels * 0.25f).toInt()
        val minDim = (dm.density * 24).toInt()
        val maxDim = (dm.density * 88).toInt()

        val isTopLeftButton = bounds.top < maxTop && bounds.left < maxLeft && bounds.width() in minDim..maxDim && bounds.height() in minDim..maxDim
        if (isTopLeftButton && root.isClickable &&
            !desc.contains("account") && !desc.contains("avatar") && !desc.contains("search") && !desc.contains("menu") &&
            !desc.contains("more actions") && !desc.contains("more options") && !viewId.contains("more_actions") && !viewId.contains("nav_button") &&
            !text.contains("search") && !text.contains("drive")
        ) {
            return AccessibilityNodeInfo.obtain(root)
        }

        for (i in 0 until root.childCount) {
            val child = root.getChild(i) ?: continue
            val found = findNavigateUpButton(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun findDriveCurrentFolderTitle(root: AccessibilityNodeInfo): String? {
        val viewId = root.viewIdResourceName?.lowercase(Locale.US) ?: ""
        val text = root.text?.toString()?.trim() ?: ""
        if ((viewId.contains("title") || viewId.contains("action_bar") || viewId.contains("toolbar")) && text.isNotBlank()) {
            return text
        }
        val bounds = Rect()
        root.getBoundsInScreen(bounds)
        val dm = context.resources.displayMetrics
        val maxTop = (dm.heightPixels * 0.20f).toInt()
        val minLeft = (dm.density * 32).toInt()
        val maxLeft = (dm.widthPixels * 0.75f).toInt()
        val minH = (dm.density * 20).toInt()
        val maxH = (dm.density * 80).toInt()
        if (bounds.top < maxTop && bounds.left in minLeft..maxLeft && bounds.height() in minH..maxH && text.isNotBlank() && !text.contains("Search", ignoreCase = true)) {
            return text
        }
        for (i in 0 until root.childCount) {
            val child = root.getChild(i) ?: continue
            val found = findDriveCurrentFolderTitle(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private suspend fun harvestCurrentOpenFolder(folderTitle: String, pendingAttachments: List<AttachmentEntity>): Int {
        var harvested = 0
        ensureListLayout()
        val folderRoot = rootInActiveWindowProvider() ?: return 0
        val filesInside = scanVisibleDriveItems(folderRoot)
        folderRoot.recycle()

        val batch = mutableListOf<DriveSharedItem>()
        for (fileItem in filesInside) {
            if (!fileItem.isFolder && (isEducationalFile(fileItem) || matchDriveItemToPendingAttachment(fileItem, pendingAttachments) != null)) {
                batch.add(fileItem)
                if (batch.size >= MAX_BATCH_SELECTION_SIZE) break
            }
        }

        if (batch.isNotEmpty()) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Dispatching batch of ${batch.size} files from folder \"$folderTitle\"...")
            val ok = selectAndDispatchBatch(batch)
            if (ok) {
                harvested += batch.size
                delay(1200L)
            }
        }

        for (item in filesInside) {
            if (!batch.contains(item)) {
                item.node.recycle()
            }
        }
        return harvested
    }

    private fun findClickableAncestor(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        var current: AccessibilityNodeInfo? = node.parent
        while (current != null) {
            if (current.isClickable) {
                return current
            }
            val parent = current.parent
            current.recycle()
            current = parent
        }
        return null
    }
}
