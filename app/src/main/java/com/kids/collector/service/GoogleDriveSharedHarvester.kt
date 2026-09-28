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
        private const val MAX_SCROLL_PAGES = 30
        private const val SETTLING_DELAY_MS = 600L

        @Volatile
        var isDriveHarvestingActive: Boolean = false

        @Volatile
        var activeHarvestingFolderName: String? = null
    }

    data class DriveSharedItem(
        val title: String,
        val subtitle: String,
        val isFolder: Boolean,
        val node: AccessibilityNodeInfo,
        val bounds: Rect
    )

    /**
     * Executes the full Google Drive Shared harvesting cycle.
     * Returns the total count of files successfully dispatched to K.I.D.S. Vault.
     */
    suspend fun executeHarvest(targetAccountEmail: String?): Int {
        CrawlerTraceLogger.log("DRIVE_HARVESTER", "Starting Google Drive Shared Tab Harvester...")
        crawlerOverlay?.updateStatus("Google Drive Harvester", "Launching Drive & verifying account...")

        isDriveHarvestingActive = true
        try {
            // Step 1: Launch Google Drive if not already in foreground
            try {
                val launchIntent = context.packageManager.getLaunchIntentForPackage(DRIVE_PACKAGE_NAME)?.apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                }
                if (launchIntent != null) {
                    context.startActivity(launchIntent)
                }
            } catch (e: Exception) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Failed to launch Drive: ${e.message}")
            }

            // Wait for Google Drive window
            val isDriveOpen = waitForConditionAction(8000L, 300L) {
                val root = rootInActiveWindowProvider() ?: return@waitForConditionAction false
                val pkg = root.packageName?.toString() ?: ""
                root.recycle()
                pkg.startsWith(DRIVE_PACKAGE_NAME)
            }

            if (!isDriveOpen) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Google Drive app window not detected. Halting.")
                return 0
            }

            // Step 2: Ensure Drive is logged into the child's school account
            if (!targetAccountEmail.isNullOrBlank()) {
                ensureDriveAccount(targetAccountEmail)
            }

            // Step 3: Navigate to "Shared" ("Shared with me") tab
            navigateToSharedTab()
            delay(SETTLING_DELAY_MS)

            // Step 4: Establish academic year date cutoff from earliest notice
            val allNotices = database.noticeDao().getAllNoticesDirect()
            val classroomNotices = allNotices.filter { it.sourceApp == "com.google.android.apps.classroom" }
            val earliestNoticeMs = classroomNotices.minOfOrNull { it.timestampMs }
                ?: allNotices.minOfOrNull { it.timestampMs }

            // Date cutoff: 3 days before earliest Classroom post (e.g. if 1st post is June 10, cutoff is June 7)
            val cutoffTimestampMs = if (earliestNoticeMs != null && earliestNoticeMs > 0L) {
                earliestNoticeMs - (3L * 24 * 60 * 60 * 1000L)
            } else {
                0L
            }

            if (cutoffTimestampMs > 0L) {
                val cutoffCal = Calendar.getInstance().apply { timeInMillis = cutoffTimestampMs }
                val cutoffMonth = ClassroomDateParser.MONTH_NAMES.getOrNull(cutoffCal.get(Calendar.MONTH))?.replaceFirstChar { it.uppercase(Locale.US) }
                val cutoffDay = cutoffCal.get(Calendar.DAY_OF_MONTH)
                CrawlerTraceLogger.log(
                    "DRIVE_HARVESTER",
                    "Academic year cutoff established: $cutoffMonth $cutoffDay. Files shared before this date will be ignored as old."
                )
            }

            // Step 5: Iterative Harvest Loop across Shared tab pages
            var totalHarvestedCount = 0
            var scrollPageCount = 0
            var consecutiveEmptyPages = 0
            var consecutiveOldItemsCount = 0
            val processedDriveTitles = mutableSetOf<String>()
            val processedFolderNames = mutableSetOf<String>()

            while (serviceScope.isActive && crawlerOverlay?.isAutoScrollingActive() == true && scrollPageCount < MAX_SCROLL_PAGES) {
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

                val currentRoot = rootInActiveWindowProvider() ?: break
                val visibleItems = scanVisibleDriveItems(currentRoot)
                currentRoot.recycle()

                val batchToSelect = mutableListOf<DriveSharedItem>()

                for (item in visibleItems) {
                    val parsedItemDate = ClassroomDateParser.parse(item.subtitle)
                    val isItemOld = cutoffTimestampMs > 0L && parsedItemDate != null && parsedItemDate.timestampMs < cutoffTimestampMs

                    if (isItemOld) {
                        CrawlerTraceLogger.log(
                            "DRIVE_HARVESTER",
                            "Item \"${item.title}\" (${parsedItemDate?.canonicalDate}) is older than academic cutoff. Skipping."
                        )
                        consecutiveOldItemsCount++
                        if (consecutiveOldItemsCount >= 5) {
                            CrawlerTraceLogger.log(
                                "DRIVE_HARVESTER",
                                "Encountered $consecutiveOldItemsCount consecutive items older than academic cutoff. Ending Shared tab scan."
                            )
                            break
                        }
                        continue
                    } else {
                        consecutiveOldItemsCount = 0
                    }

                    if (item.isFolder) {
                        // Folders cannot be multi-selected because Drive disables "Send a copy"
                        if (processedFolderNames.contains(item.title)) {
                            continue
                        }

                        // Determine if folder is relevant (mentioned in announcements, contains Drive link, or shared within academic year)
                        val isMentionedInNotice = allNotices.any { n ->
                            n.title.contains(item.title, ignoreCase = true) ||
                            n.body.contains(item.title, ignoreCase = true) ||
                            n.body.contains("drive.google.com", ignoreCase = true)
                        }
                        val isRecentSchoolFolder = parsedItemDate != null && (cutoffTimestampMs == 0L || parsedItemDate.timestampMs >= cutoffTimestampMs)

                        if (isMentionedInNotice || isRecentSchoolFolder) {
                            processedFolderNames.add(item.title)
                            val harvestedFromFolder = harvestFolder(item, pendingAttachments)
                            totalHarvestedCount += harvestedFromFolder
                        }
                        continue
                    }

                    if (processedDriveTitles.contains(item.title)) {
                        continue
                    }

                    val matchedAttachment = matchDriveItemToPendingAttachment(item, pendingAttachments)
                    if (matchedAttachment != null) {
                        batchToSelect.add(item)
                        if (batchToSelect.size >= MAX_BATCH_SELECTION_SIZE) {
                            break
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
                    delay(1200L)
                }
            } else {
                consecutiveEmptyPages++
            }

            // Recycle nodes of items not selected
            for (item in visibleItems) {
                if (!batchToSelect.contains(item)) {
                    item.node.recycle()
                }
            }

            if (consecutiveEmptyPages >= 4) {
                CrawlerTraceLogger.log(
                    "DRIVE_HARVESTER",
                    "No matching pending files found across $consecutiveEmptyPages consecutive pages. Concluding harvest."
                )
                break
            }

            // Scroll down in Shared tab to reveal older files
            scrollPageCount++
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
     * If not, automatically opens the OneGoogle account switcher and selects the child's account.
     */
    suspend fun ensureDriveAccount(targetEmail: String): Boolean {
        val cleanTarget = targetEmail.trim().lowercase(Locale.US)
        val root = rootInActiveWindowProvider() ?: return false
        val avatarNode = findAccountAvatarNode(root)

        if (avatarNode == null) {
            root.recycle()
            return true
        }

        val avatarDesc = avatarNode.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val avatarText = avatarNode.text?.toString()?.lowercase(Locale.US) ?: ""

        if (avatarDesc.contains(cleanTarget) || avatarText.contains(cleanTarget)) {
            // Already in the child's school account
            avatarNode.recycle()
            root.recycle()
            return true
        }

        CrawlerTraceLogger.log(
            "ACCOUNT_SWITCH",
            "Drive is open in wrong account ($avatarDesc). Auto-switching to $cleanTarget..."
        )
        crawlerOverlay?.updateStatus("Switching Account...", "Selecting $cleanTarget")

        val clicked = avatarNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        if (!clicked) {
            val rect = Rect()
            avatarNode.getBoundsInScreen(rect)
            dispatchTapAction(rect.centerX().toFloat(), rect.centerY().toFloat())
        }
        avatarNode.recycle()
        root.recycle()

        delay(800L)
        var accountSwitched = false
        val dialogAppeared = waitForConditionAction(4000L, 250L) {
            val dialogRoot = rootInActiveWindowProvider() ?: return@waitForConditionAction false
            val hasNode = findNodeContainingText(dialogRoot, cleanTarget) != null
            dialogRoot.recycle()
            hasNode
        }

        if (dialogAppeared) {
            val dialogRoot = rootInActiveWindowProvider()
            if (dialogRoot != null) {
                val targetNode = findNodeContainingText(dialogRoot, cleanTarget)
                if (targetNode != null) {
                    val selectOk = if (targetNode.isClickable) {
                        targetNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    } else {
                        findClickableAncestor(targetNode)?.let {
                            val ok = it.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                            it.recycle()
                            ok
                        } ?: false
                    }
                    if (!selectOk) {
                        val r = Rect()
                        targetNode.getBoundsInScreen(r)
                        dispatchTapAction(r.centerX().toFloat(), r.centerY().toFloat())
                    }
                    targetNode.recycle()
                    accountSwitched = true
                }
                dialogRoot.recycle()
            }
        }

        if (accountSwitched) {
            CrawlerTraceLogger.log("ACCOUNT_SWITCH", "Successfully switched Drive account to $cleanTarget")
            delay(1500L)
            return true
        } else {
            CrawlerTraceLogger.log("ACCOUNT_SWITCH", "Target account $cleanTarget not found in account list.")
            return false
        }
    }

    /**
     * Navigates to the "Shared" tab on Google Drive's bottom navigation bar.
     */
    private suspend fun navigateToSharedTab(): Boolean {
        val root = rootInActiveWindowProvider() ?: return false
        val sharedTabNode = findSharedTabNode(root)
        if (sharedTabNode != null) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Selecting Shared tab in Google Drive...")
            val clicked = sharedTabNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            if (!clicked) {
                val rect = Rect()
                sharedTabNode.getBoundsInScreen(rect)
                dispatchTapAction(rect.centerX().toFloat(), rect.centerY().toFloat())
            }
            sharedTabNode.recycle()
            root.recycle()
            return true
        }
        root.recycle()
        return false
    }

    /**
     * Scans all visible items (files and folders) in the current Shared tab window.
     */
    private fun scanVisibleDriveItems(root: AccessibilityNodeInfo): List<DriveSharedItem> {
        val items = mutableListOf<DriveSharedItem>()
        collectDriveItemsRecursively(root, items)
        return items
    }

    private fun collectDriveItemsRecursively(node: AccessibilityNodeInfo, outList: MutableList<DriveSharedItem>) {
        val viewId = node.viewIdResourceName?.lowercase(Locale.US) ?: ""
        val desc = node.contentDescription?.toString()?.trim() ?: ""
        val text = node.text?.toString()?.trim() ?: ""

        // Check if this node represents a file or folder entry
        val isItemRoot = viewId.contains("item_root") || viewId.contains("entry_view") ||
                viewId.contains("card_view") || viewId.contains("doc_list_item") ||
                (node.isClickable && (desc.length > 5 || text.length > 5))

        if (isItemRoot && (desc.isNotBlank() || text.isNotBlank())) {
            val titleText = if (text.isNotBlank()) text else desc.substringBefore(",").substringBefore("\n")
            val subtitleText = desc
            val isFolder = desc.contains("folder", ignoreCase = true) ||
                    titleText.contains("folder", ignoreCase = true) ||
                    viewId.contains("folder")

            val rect = Rect()
            node.getBoundsInScreen(rect)
            if (rect.height() > 30 && rect.width() > 100) {
                outList.add(
                    DriveSharedItem(
                        title = titleText.trim(),
                        subtitle = subtitleText.trim(),
                        isFolder = isFolder,
                        node = AccessibilityNodeInfo.obtain(node),
                        bounds = rect
                    )
                )
                return // Do not inspect children of an already identified item container
            }
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
        val cleanDriveTitle = item.title.trim().lowercase(Locale.US)
        val driveExtension = cleanDriveTitle.substringAfterLast('.', "")
        val driveBaseName = cleanDriveTitle.substringBeforeLast('.')

        val candidateMatches = pendingAttachments.filter { att ->
            val cleanAttName = att.fileName.replace("...", "").trim().lowercase(Locale.US)
            val attExtension = cleanAttName.substringAfterLast('.', "")
            val attBaseName = cleanAttName.substringBeforeLast('.')

            val isExtCompatible = driveExtension.isBlank() || attExtension.isBlank() || driveExtension == attExtension
            if (!isExtCompatible) return@filter false

            driveBaseName == attBaseName ||
                    driveBaseName.startsWith(attBaseName) ||
                    attBaseName.startsWith(driveBaseName) ||
                    (cleanDriveTitle.contains(cleanAttName) || cleanAttName.contains(cleanDriveTitle))
        }

        if (candidateMatches.isEmpty()) return null
        if (candidateMatches.size == 1) return candidateMatches.first()

        // Disambiguate by date and time:
        val parsedDriveDate = ClassroomDateParser.parse(item.subtitle)
        if (parsedDriveDate != null) {
            for (candidate in candidateMatches) {
                val parentNotice = database.noticeDao().findById(candidate.noticeId)
                if (parentNotice != null) {
                    val noticeDate = ClassroomDateParser.parse(parentNotice.title + " " + parentNotice.body.take(150))
                    if (noticeDate != null && parsedDriveDate.matchesMonthAndDay(noticeDate.month, noticeDate.day)) {
                        CrawlerTraceLogger.log(
                            "DRIVE_HARVESTER",
                            "Disambiguated identical file \"${item.title}\" by date ${parsedDriveDate.monthShortName} ${parsedDriveDate.day} -> Notice \"${parentNotice.title.take(30)}\""
                        )
                        return candidate
                    }
                }
            }
        }

        return candidateMatches.first()
    }

    /**
     * Selects multiple items in Google Drive and dispatches "Send a copy" -> "K.I.D.S. Vault".
     */
    private suspend fun selectAndDispatchBatch(batch: List<DriveSharedItem>): Boolean {
        if (batch.isEmpty()) return false

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
        delay(400L)

        // 2. Tap remaining items in the batch to include them in the selection
        for (i in 1 until batch.size) {
            val item = batch[i]
            val tapped = item.node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            if (!tapped) {
                dispatchTapAction(item.bounds.centerX().toFloat(), item.bounds.centerY().toFloat())
            }
            item.node.recycle()
            delay(200L)
        }

        // 3. Find and click Drive's top-right overflow menu (More options / ⋮)
        val overflowRoot = rootInActiveWindowProvider() ?: return false
        val overflowButton = findOverflowMenuButton(overflowRoot)
        overflowRoot.recycle()

        if (overflowButton == null) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Overflow menu button not found in Drive multi-select.")
            return false
        }

        val clickedOverflow = overflowButton.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        if (!clickedOverflow) {
            val rect = Rect()
            overflowButton.getBoundsInScreen(rect)
            dispatchTapAction(rect.centerX().toFloat(), rect.centerY().toFloat())
        }
        overflowButton.recycle()
        delay(500L)

        // 4. Find and click "Send a copy" in the overflow popup menu
        var sendCopyNode: AccessibilityNodeInfo? = null
        waitForConditionAction(1500L, 100L) {
            val popupRoot = rootInActiveWindowProvider() ?: return@waitForConditionAction false
            sendCopyNode = findSendCopyNode(popupRoot)
            popupRoot.recycle()
            sendCopyNode != null
        }

        if (sendCopyNode == null) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "'Send a copy' option not found in Drive popup menu.")
            return false
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
        return true
    }

    private suspend fun scrollSharedListForward() {
        val displayMetrics = context.resources.displayMetrics
        val screenWidth = displayMetrics.widthPixels.toFloat()
        val screenHeight = displayMetrics.heightPixels.toFloat()

        // Kinetic upward swipe to scroll forward through Drive items
        dispatchSwipeAction(
            screenWidth * 0.5f,
            screenHeight * 0.75f,
            screenWidth * 0.5f,
            screenHeight * 0.30f,
            350L
        )
    }

    private suspend fun getPendingUncapturedAttachments(): List<AttachmentEntity> {
        val all = database.attachmentDao().getAllAttachmentsDirect()
        return all.filter { att ->
            att.localUri.isBlank() &&
                    (att.driveFileId.isNullOrBlank() || att.driveFileId.startsWith("virtual_")) &&
                    att.driveFileId?.startsWith("restricted_") != true
        }
    }

    private fun findSharedTabNode(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val desc = root.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val text = root.text?.toString()?.lowercase(Locale.US) ?: ""

        val isSharedTab = desc == "shared" || desc.contains("shared with me") ||
                desc.contains("tab, 3 of") || text == "shared"

        if (isSharedTab) {
            return if (root.isClickable) AccessibilityNodeInfo.obtain(root) else findClickableAncestor(root)
        }

        for (i in 0 until root.childCount) {
            val child = root.getChild(i) ?: continue
            val found = findSharedTabNode(child)
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

        val isAvatar = desc.contains("google account") || desc.contains("signed in as") ||
                desc.contains("account and settings") || viewId.contains("og_apd_ring_view") ||
                viewId.contains("account_avatar")

        if (isAvatar) {
            return if (root.isClickable) AccessibilityNodeInfo.obtain(root) else findClickableAncestor(root)
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
        val viewId = node.viewIdResourceName?.lowercase(Locale.US) ?: ""

        val isOverflow = desc.contains("more options") || desc.contains("overflow") || viewId.contains("more_options")
        if (isOverflow) {
            return if (node.isClickable) AccessibilityNodeInfo.obtain(node) else findClickableAncestor(node)
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

    private fun findSendCopyNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val text = node.text?.toString()?.lowercase(Locale.US) ?: ""
        val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""

        val isSendCopy = text.contains("send a copy") || text.contains("send file") ||
                desc.contains("send a copy") || desc.contains("send file")

        if (isSendCopy) {
            return if (node.isClickable) AccessibilityNodeInfo.obtain(node) else findClickableAncestor(node)
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

    private fun isEducationalFile(fileName: String): Boolean {
        val lower = fileName.trim().lowercase(Locale.US)
        return attachmentExts.any { lower.endsWith(it) } ||
                lower.contains(".pdf") || lower.contains(".doc") || lower.contains(".ppt") ||
                lower.contains(".xls") || lower.contains(".jpg") || lower.contains(".png")
    }

    private suspend fun harvestFolder(folderItem: DriveSharedItem, pendingAttachments: List<AttachmentEntity>): Int {
        CrawlerTraceLogger.log("DRIVE_HARVESTER", "Entering shared folder: \"${folderItem.title}\"")
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
        activeHarvestingFolderName = folderItem.title
        try {
            val folderRoot = rootInActiveWindowProvider()
            if (folderRoot != null) {
                val filesInsideFolder = scanVisibleDriveItems(folderRoot)
                folderRoot.recycle()

                val batchInFolder = mutableListOf<DriveSharedItem>()
                for (fileItem in filesInsideFolder) {
                    if (!fileItem.isFolder && isEducationalFile(fileItem.title)) {
                        batchInFolder.add(fileItem)
                        if (batchInFolder.size >= MAX_BATCH_SELECTION_SIZE) {
                            break
                        }
                    }
                }

                if (batchInFolder.isNotEmpty()) {
                    CrawlerTraceLogger.log(
                        "DRIVE_HARVESTER",
                        "Batch harvesting ${batchInFolder.size} files inside folder \"${folderItem.title}\"..."
                    )
                    crawlerOverlay?.updateStatus("Harvesting Folder...", "${batchInFolder.size} files in ${folderItem.title}")

                    val batchOk = selectAndDispatchBatch(batchInFolder)
                    if (batchOk) {
                        harvestedInFolder += batchInFolder.size
                        delay(1200L)
                    }
                }

                for (item in filesInsideFolder) {
                    if (!batchInFolder.contains(item)) {
                        item.node.recycle()
                    }
                }
            }
        } finally {
            activeHarvestingFolderName = null
            returnFromFolderToSharedTab()
        }

        return harvestedInFolder
    }

    private suspend fun returnFromFolderToSharedTab(): Boolean {
        CrawlerTraceLogger.log("DRIVE_HARVESTER", "Navigating back from folder to Shared tab...")
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
        if (desc.contains("navigate up") || desc == "back") {
            return if (root.isClickable) AccessibilityNodeInfo.obtain(root) else findClickableAncestor(root)
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
