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
        private const val MAX_SCROLL_PAGES = 60
        private const val SETTLING_DELAY_MS = 800L

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
        val bounds: Rect,
        val moreActionsBounds: Rect? = null
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

            // Step 2: Ensure Drive is logged into the child's school account
            if (!targetAccountEmail.isNullOrBlank()) {
                ensureDriveAccount(targetAccountEmail)
            }

            var totalHarvestedCount = 0

            // Step 2b: Check if Drive opened directly into a Folder (e.g. from Class Drive folder or Classroom folder)
            val initialDriveRoot = rootInActiveWindowProvider()
            val currentFolderTitle = initialDriveRoot?.let { findDriveCurrentFolderTitle(it) } ?: "Classroom"
            val hasSharedTabAlready = initialDriveRoot?.let { findSharedTabNode(it) != null } ?: false
            val hasNavUp = initialDriveRoot?.let { findNavigateUpButton(it) != null } ?: false
            initialDriveRoot?.recycle()

            if (!hasSharedTabAlready && hasNavUp) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Google Drive opened directly into folder: \"$currentFolderTitle\"")
                crawlerOverlay?.updateStatus("Harvesting Class Folder", currentFolderTitle)
                val pending = getPendingUncapturedAttachments()
                if (pending.isNotEmpty()) {
                    val folderHarvested = harvestCurrentOpenFolder(currentFolderTitle, pending)
                    totalHarvestedCount += folderHarvested
                }
            }

            // Step 3: Navigate to "Shared" ("Shared with me") tab
            navigateToSharedTab()
            delay(SETTLING_DELAY_MS)

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

                // Resiliently acquire active window with retries to prevent premature termination during activity switches
                var currentRoot: AccessibilityNodeInfo? = null
                var rootRetry = 0
                while (serviceScope.isActive && currentRoot == null && rootRetry < 12) {
                    currentRoot = rootInActiveWindowProvider()
                    if (currentRoot == null) {
                        delay(250L)
                        rootRetry++
                    }
                }
                if (currentRoot == null) {
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "Window root unavailable on page ${scrollPageCount + 1}. Scrolling to re-attempt...")
                    scrollPageCount++
                    scrollSharedListForward()
                    delay(SETTLING_DELAY_MS)
                    continue
                }

                val visibleItems = scanVisibleDriveItems(currentRoot)
                currentRoot.recycle()

                val visibleTitles = visibleItems.map { it.title }
                CrawlerTraceLogger.log(
                    "DRIVE_HARVESTER",
                    "Page ${scrollPageCount + 1}: ${visibleItems.size} items visible: ${visibleTitles.take(4)}"
                )

                // Check if list has stopped moving (reached the bottom)
                if (visibleTitles.isNotEmpty() && visibleTitles == lastVisibleTitles) {
                    consecutiveStaticPages++
                    if (consecutiveStaticPages >= 5) {
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

                val batchToSelect = mutableListOf<DriveSharedItem>()

                for (item in visibleItems) {
                    if (item.isFolder) {
                        // Folders cannot be multi-selected because Drive disables "Send a copy"
                        if (processedFolderNames.contains(item.title)) {
                            continue
                        }
                        processedFolderNames.add(item.title)
                        val harvestedFromFolder = harvestFolder(item, pendingAttachments)
                        totalHarvestedCount += harvestedFromFolder
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
                        // Explicitly wait for Google Drive to regain foreground focus after ShareTargetActivity finishes
                        var waitDriveAttempts = 0
                        while (serviceScope.isActive && waitDriveAttempts < 15) {
                            val waitRoot = rootInActiveWindowProvider()
                            val pkg = waitRoot?.packageName?.toString() ?: ""
                            waitRoot?.recycle()
                            if (pkg.contains("apps.docs")) {
                                break
                            }
                            delay(300L)
                            waitDriveAttempts++
                        }
                        delay(SETTLING_DELAY_MS)
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

                if (consecutiveEmptyPages >= 50) {
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
            dispatchSwipeAction(300f, 1500f, 300f, 600f, 400L)
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
        root.getBoundsInScreen(r)

        val isTopLeft = r.left < 250 && r.top < 350 && r.bottom > 50

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

        // Step A: If bottom navigation bar is not visible (e.g. inside a folder), navigate up/back to root
        var attempts = 0
        while (attempts < 6) {
            val root = rootInActiveWindowProvider() ?: break
            val sharedTabNode = findSharedTabNode(root)
            if (sharedTabNode != null) {
                // Bottom navigation bar is visible! Select the Shared tab.
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Bottom navigation bar detected. Selecting Shared tab...")
                val clicked = sharedTabNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                if (!clicked) {
                    val rect = Rect()
                    sharedTabNode.getBoundsInScreen(rect)
                    dispatchTapAction(rect.centerX().toFloat(), rect.centerY().toFloat())
                }
                sharedTabNode.recycle()
                root.recycle()
                delay(SETTLING_DELAY_MS + 200L)
                return true
            }

            // Bottom bar not visible. Check if we are inside a folder (Navigate up / Back button present)
            val navUp = findNavigateUpButton(root)
            root.recycle()

            if (navUp != null) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Inside folder (bottom bar hidden). Navigating up toward root (attempt ${attempts + 1})...")
                val clicked = navUp.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                navUp.recycle()
                if (!clicked) {
                    dispatchBackAction()
                }
            } else {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "No navigate up button found. Pressing Back to reach Drive root (attempt ${attempts + 1})...")
                dispatchBackAction()
            }

            delay(600L)
            attempts++
        }

        // Final attempt: check if Shared tab is now visible
        val finalRoot = rootInActiveWindowProvider() ?: return false
        val finalSharedTab = findSharedTabNode(finalRoot)
        if (finalSharedTab != null) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Selecting Shared tab after exiting folder...")
            val clicked = finalSharedTab.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            if (!clicked) {
                val rect = Rect()
                finalSharedTab.getBoundsInScreen(rect)
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

        // Strategy A: Find Drive items by their "More actions for <Name>" buttons.
        // In Google Drive for Android (both List and Grid layouts), every educational file and folder
        // possesses a context menu button with contentDescription="More actions for <Name>".
        // This provides 100% precision on title and the exact click target for single-file dispatch.
        findItemsViaMoreActionsButtons(root, items)

        if (items.isNotEmpty()) {
            return items
        }

        // Strategy B: Fallback recursive container collection
        collectDriveItemsRecursively(root, items)
        return items
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

            // Ignore buttons outside the content area (e.g. appbar/toolbar or navigation bar)
            if (moreActionsBounds.top < 250 || moreActionsBounds.bottom > 2350) {
                actionNode.recycle()
                continue
            }

            // Find the item card/row container: Walk up ancestors to find the clickable card
            var cardNode: AccessibilityNodeInfo? = null
            var currentAncestor: AccessibilityNodeInfo? = actionNode.parent
            while (currentAncestor != null) {
                val r = Rect()
                currentAncestor.getBoundsInScreen(r)
                if (currentAncestor.isClickable && r.height() in 60..800 && r.width() > 150) {
                    cardNode = AccessibilityNodeInfo.obtain(currentAncestor)
                    currentAncestor.recycle()
                    break
                }
                val parent = currentAncestor.parent
                currentAncestor.recycle()
                currentAncestor = parent
            }

            val cardBounds = Rect()
            if (cardNode != null) {
                cardNode.getBoundsInScreen(cardBounds)
            } else {
                actionNode.getBoundsInScreen(cardBounds)
            }

            // Check if this item is a folder:
            // Check descriptions and text of all descendants in this card
            val itemDescs = mutableListOf<String>()
            val nodeToInspect = cardNode ?: actionNode
            collectAllChildDescriptions(nodeToInspect, itemDescs)

            val hasFileExtension = attachmentExts.any { rawTitle.lowercase(Locale.US).endsWith(it) }
            val hasFileBadge = itemDescs.any {
                it.equals("pdf", ignoreCase = true) ||
                it.equals("document", ignoreCase = true) ||
                it.equals("spreadsheet", ignoreCase = true) ||
                it.equals("presentation", ignoreCase = true) ||
                it.equals("audio", ignoreCase = true) ||
                it.equals("video", ignoreCase = true) ||
                it.equals("image", ignoreCase = true)
            }
            val hasFolderBadge = itemDescs.any { it.contains("folder", ignoreCase = true) }

            val isFolder = hasFolderBadge || (!hasFileExtension && !hasFileBadge)

            val representativeNode = cardNode ?: AccessibilityNodeInfo.obtain(actionNode)
            actionNode.recycle()

            outList.add(
                DriveSharedItem(
                    title = rawTitle,
                    subtitle = itemDescs.joinToString(", "),
                    isFolder = isFolder,
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

        // Exclude system areas (appbar, toolbar, bottom navigation)
        if (rect.top < 250 || rect.bottom > 2350) {
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

            val hasFileExtension = attachmentExts.any { titleText.lowercase(Locale.US).endsWith(it) }
            val isFolder = !hasFileExtension ||
                    desc.contains("folder", ignoreCase = true) ||
                    titleText.contains("folder", ignoreCase = true) ||
                    viewId.contains("folder")

            outList.add(
                DriveSharedItem(
                    title = titleText,
                    subtitle = subtitleText,
                    isFolder = isFolder,
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
        val cleanDriveTitle = item.title.trim().lowercase(Locale.US)
        val driveExtension = cleanDriveTitle.substringAfterLast('.', "")
        val driveBaseName = cleanDriveTitle.substringBeforeLast('.')

        val candidateMatches = pendingAttachments.filter { att ->
            val cleanAttName = att.fileName.replace("...", "").trim().lowercase(Locale.US)
            val attExtension = cleanAttName.substringAfterLast('.', "")
            val attBaseName = cleanAttName.substringBeforeLast('.')

            val isExtCompatible = driveExtension.isBlank() || attExtension.isBlank() || driveExtension == attExtension
            if (!isExtCompatible) return@filter false

            val isExactOrPrefix = driveBaseName == attBaseName ||
                    (driveBaseName.length >= 8 && attBaseName.startsWith(driveBaseName)) ||
                    (attBaseName.length >= 8 && driveBaseName.startsWith(attBaseName))
            val isSubstring = cleanDriveTitle.length >= 8 && cleanAttName.length >= 8 &&
                    (cleanDriveTitle.contains(cleanAttName) || cleanAttName.contains(cleanDriveTitle))

            isExactOrPrefix || isSubstring
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
        return true
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
        val displayMetrics = context.resources.displayMetrics
        val screenWidth = displayMetrics.widthPixels.toFloat()
        val screenHeight = displayMetrics.heightPixels.toFloat()

        // Kinetic upward swipe in center of Drive items list (from 70% to 25% height)
        dispatchSwipeAction(
            screenWidth * 0.5f,
            screenHeight * 0.70f,
            screenWidth * 0.5f,
            screenHeight * 0.25f,
            380L
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
            return if (node.isClickable) AccessibilityNodeInfo.obtain(node) else findClickableAncestor(node)
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
            return if (node.isClickable) AccessibilityNodeInfo.obtain(node) else findClickableAncestor(node)
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
            return if (node.isClickable) AccessibilityNodeInfo.obtain(node) else findClickableAncestor(node)
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

    private fun findTopRightActionButton(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val displayMetrics = context.resources.displayMetrics
        val screenWidth = displayMetrics.widthPixels
        val rect = Rect()
        root.getBoundsInScreen(rect)

        val isTopRightBar = rect.top < 350 && rect.right > screenWidth - 250 && rect.width() in 40..250 && rect.height() in 40..250
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
            ensureListLayout()
            var page = 0
            val processedInFolder = mutableSetOf<String>()

            while (serviceScope.isActive && crawlerOverlay?.isAutoScrollingActive() == true && page < 6) {
                val folderRoot = rootInActiveWindowProvider() ?: break
                val itemsInside = scanVisibleDriveItems(folderRoot)
                folderRoot.recycle()

                val batchInFolder = mutableListOf<DriveSharedItem>()
                for (item in itemsInside) {
                    if (!item.isFolder && (isEducationalFile(item.title) || matchDriveItemToPendingAttachment(item, pendingAttachments) != null)) {
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

                // Check for subfolders (e.g. English, Maths, Science)
                for (subItem in itemsInside) {
                    if (subItem.isFolder && !processedInFolder.contains(subItem.title)) {
                        processedInFolder.add(subItem.title)
                        val subHarvested = harvestFolder(subItem, pendingAttachments)
                        harvestedInFolder += subHarvested
                    }
                }

                for (item in itemsInside) {
                    if (!batchInFolder.contains(item)) {
                        item.node.recycle()
                    }
                }

                if (batchInFolder.isEmpty()) {
                    break
                }
                scrollSharedListForward()
                delay(SETTLING_DELAY_MS)
                page++
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
        val text = root.text?.toString()?.lowercase(Locale.US) ?: ""
        val viewId = root.viewIdResourceName?.lowercase(Locale.US) ?: ""

        val isNavUp = desc.contains("navigate up") || desc.contains("back") ||
                desc == "up" || desc.contains("go back") || desc.contains("close") ||
                viewId.contains("up_button") || viewId.contains("navigate_up")

        if (isNavUp) {
            return if (root.isClickable) AccessibilityNodeInfo.obtain(root) else findClickableAncestor(root)
        }

        val bounds = Rect()
        root.getBoundsInScreen(bounds)
        val isTopLeftButton = bounds.top < 350 && bounds.left < 250 && bounds.width() in 40..250 && bounds.height() in 40..250
        if (isTopLeftButton && root.isClickable &&
            !desc.contains("account") && !desc.contains("avatar") && !desc.contains("search") && !desc.contains("menu") &&
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
        if (bounds.top < 350 && bounds.left in 100..600 && bounds.height() in 30..200 && text.isNotBlank() && !text.contains("Search", ignoreCase = true)) {
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
            if (!fileItem.isFolder && (isEducationalFile(fileItem.title) || matchDriveItemToPendingAttachment(fileItem, pendingAttachments) != null)) {
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
