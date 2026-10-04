package com.kids.collector.service

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.graphics.Rect
import android.util.DisplayMetrics
import android.view.accessibility.AccessibilityNodeInfo
import com.kids.collector.data.db.AttachmentEntity
import com.kids.collector.data.db.KidsDatabase
import com.kids.collector.data.drive.DriveVaultManager
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
    private val selectKidsInChooserAction: suspend () -> Boolean,
    private val waitForConditionAction: suspend (Long, Long, () -> Boolean) -> Boolean,
    private val dispatchBackAction: suspend () -> Boolean = { true },
    private val dispatchHomeAction: (suspend () -> Boolean)? = null
) {

    companion object {
        const val DRIVE_PACKAGE_NAME = "com.google.android.apps.docs"
        private const val MAX_BATCH_SELECTION_SIZE = 15
        private const val DEFAULT_MINIMUM_SCROLL_PAGE_BUDGET = 150
        private const val PAGES_PER_PENDING_ATTACHMENT_MULTIPLIER = 3
        private const val MAX_CONSECUTIVE_STATIC_PAGES = 5
        private const val MAX_CONSECUTIVE_EMPTY_PAGES = 50
        private const val MAX_EMPTY_PAGE_RETRIES = 3
        private const val MAX_CONSECUTIVE_WINDOW_FAILURES = 5
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

        val CURRICULUM_SUBJECT_KEYWORDS = setOf(
            "math", "maths", "mathematics", "science", "physics", "chemistry", "biology",
            "evs", "environmental", "english", "hindi", "social", "history", "geography",
            "civics", "computer", "ict", "sanskrit", "french", "spanish", "art", "music"
        )

        val CURRICULUM_EXAM_KEYWORDS = setOf(
            "qp", "paper", "exam", "test", "revision", "worksheet", "assessment",
            "sample", "model", "practice", "syllabus", "portion", "half yearly", "annual",
            "midterm", "periodic", "pt1", "pt2", "pt3", "prelim", "term 1", "term 2",
            "term1", "term2", "question paper", "blueprint"
        )

        val CURRICULUM_FOLDER_KEYWORDS = setOf(
            "question paper", "question papers", "past paper", "past papers",
            "sample paper", "sample papers", "model paper", "model papers",
            "revision", "syllabus", "blueprint", "exam", "exams", "test",
            "worksheet", "worksheets", "study material", "notes", "term 1", "term 2",
            "half yearly", "annual", "periodic test", "midterm", "practice paper",
            "question upload", "qp upload", "exam upload"
        )

        fun isCurriculumResourceFile(fileName: String): Boolean {
            val (base, ext) = splitTitleAndExtension(fileName)
            if (ext.isBlank() || !KNOWN_FILE_EXTENSIONS.contains(ext.lowercase(Locale.ROOT))) return false
            val normBase = normalizeBaseName(base)

            val hasSubject = CURRICULUM_SUBJECT_KEYWORDS.any { normBase.contains(it) }
            val hasExamKeyword = CURRICULUM_EXAM_KEYWORDS.any { normBase.contains(it) }

            val isExplicitPaper = normBase.contains("question paper") ||
                    normBase.contains("sample paper") ||
                    normBase.contains("past paper") ||
                    normBase.contains("model paper") ||
                    normBase.contains("practice paper") ||
                    normBase.contains("revision worksheet") ||
                    normBase.contains("blueprint")

            return (hasSubject && hasExamKeyword) || isExplicitPaper
        }

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

    private var isContinuousMultiSelecting: Boolean = false

    private fun isMultiSelectActive(root: AccessibilityNodeInfo?): Boolean {
        if (root == null) return false
        val closeBtn = findCloseSelectionButton(root)
        if (closeBtn != null) {
            closeBtn.recycle()
            return true
        }
        val texts = mutableListOf<String>()
        collectAllChildDescriptions(root, texts)
        val combined = texts.joinToString(" ").lowercase(Locale.US)
        return combined.contains("selected") || combined.contains("clear selection") || combined.contains("close selection")
    }

    private suspend fun resolveDynamicAcademicCutoffMs(): Long {
        val dbOldest = database.noticeDao().getOldestNoticeTimestamp()
        if (dbOldest != null && dbOldest > 0L) {
            // Apply a 7-day grace margin prior to the earliest Classroom announcement
            val graceMarginMs = 7L * 24L * 60L * 60L * 1000L
            return dbOldest - graceMarginMs
        }

        // Fallback when no notices are indexed yet: derive start of the academic cycle dynamically from Calendar
        val cal = Calendar.getInstance()
        val currentYear = cal.get(Calendar.YEAR)
        val currentMonth = cal.get(Calendar.MONTH) // 0-based
        val academicStartYear = if (currentMonth >= Calendar.MAY) currentYear else (currentYear - 1)
        cal.set(academicStartYear, Calendar.APRIL, 1, 0, 0, 0)
        cal.set(Calendar.MILLISECOND, 0)
        return cal.timeInMillis
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
     * Brings Google Drive to the foreground using an explicit system intent with RESET_TASK_IF_NEEDED.
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
                Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
            )
            context.startActivity(launchIntent)
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Dispatched Google Drive launch intent.")
            true
        } catch (e: Exception) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Failed to bring Google Drive to foreground: ${e.message}")
            false
        }
    }

    private fun performVerifiedAccessibilityClick(node: AccessibilityNodeInfo?): Boolean {
        if (node == null) return false
        if (node.isClickable) {
            val success = node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            if (success) return true
        }
        var current: AccessibilityNodeInfo? = node.parent
        var depth = 0
        while (current != null && depth < 6) {
            if (current.isClickable) {
                val result = current.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                current.recycle()
                if (result) return true
            }
            val parentNode = current.parent
            current.recycle()
            current = parentNode
            depth++
        }
        current?.recycle()
        return false
    }

    private fun performVerifiedAccessibilityLongClick(node: AccessibilityNodeInfo?): Boolean {
        if (node == null) return false
        if (node.isLongClickable) {
            val success = node.performAction(AccessibilityNodeInfo.ACTION_LONG_CLICK)
            if (success) return true
        }
        var current: AccessibilityNodeInfo? = node.parent
        var depth = 0
        while (current != null && depth < 6) {
            if (current.isLongClickable) {
                val result = current.performAction(AccessibilityNodeInfo.ACTION_LONG_CLICK)
                current.recycle()
                if (result) return true
            }
            val parentNode = current.parent
            current.recycle()
            current = parentNode
            depth++
        }
        current?.recycle()
        return false
    }

    /**
     * Executes the full Google Drive Shared harvesting cycle.
     * Returns the total count of files successfully dispatched to K.I.D.S. Vault.
     */
    suspend fun executeHarvest(targetAccountEmail: String?): Int {
        CrawlerTraceLogger.startCloudStreaming(serviceScope, context, targetAccountEmail)
        CrawlerTraceLogger.log("DRIVE_HARVESTER", "Starting Google Drive Shared Tab Harvester...")
        crawlerOverlay?.updateStatus("Google Drive Harvester", "Launching Drive & verifying account...")

        isDriveHarvestingActive = true
        try {
            // Step 1: Open Google Drive via Classroom with Auto-Recovery
            var isDriveOpen = false
            var launchAttempts = 0
            val maxLaunchAttempts = 3

            while (serviceScope.isActive && !isDriveOpen && launchAttempts < maxLaunchAttempts) {
                launchAttempts++

                val currentRoot = rootInActiveWindowProvider()
                val currentPkg = currentRoot?.packageName?.toString() ?: ""
                currentRoot?.recycle()

                if (currentPkg.contains(DRIVE_PACKAGE_NAME)) {
                    isDriveOpen = true
                    break
                }

                // Strategy 1: If Classroom is active in foreground, open Drive via Classroom drawer menu ("Classroom folders").
                // Because this click occurs inside the foreground app, Classroom itself launches Google Drive as an allowed foreground transition!
                if (currentPkg.contains("classroom")) {
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "Classroom active in foreground. Launching Drive via Classroom folders menu (attempt $launchAttempts/$maxLaunchAttempts)...")
                    val openedViaClassroom = openDriveViaClassroom()
                    if (openedViaClassroom) {
                        isDriveOpen = waitForConditionAction(8000L, 300L) {
                            val root = rootInActiveWindowProvider() ?: return@waitForConditionAction false
                            val pkg = root.packageName?.toString() ?: ""
                            root.recycle()
                            pkg.contains(DRIVE_PACKAGE_NAME)
                        }
                    }
                }

                // Strategy 2: If Drive is still not open, return to Android Home screen to clear foreground app, then launch Drive
                if (!isDriveOpen) {
                    if (dispatchHomeAction != null) {
                        CrawlerTraceLogger.log("DRIVE_HARVESTER", "Dispatching GLOBAL_ACTION_HOME to clear foreground app before launching Drive...")
                        dispatchHomeAction.invoke()
                        delay(800L)
                    }
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "Launching Google Drive directly via launcher intent (attempt $launchAttempts/$maxLaunchAttempts)...")
                    bringDriveToForeground()
                    isDriveOpen = waitForConditionAction(6000L, 300L) {
                        val root = rootInActiveWindowProvider() ?: return@waitForConditionAction false
                        val pkg = root.packageName?.toString() ?: ""
                        root.recycle()
                        pkg.contains(DRIVE_PACKAGE_NAME)
                    }
                }

                if (!isDriveOpen) {
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "Checking for app chooser / resolver or retrying...")
                    handleDriveChooserIfPresent()
                    delay(1000L)
                    val retryRoot = rootInActiveWindowProvider()
                    val retryPkg = retryRoot?.packageName?.toString() ?: ""
                    retryRoot?.recycle()
                    if (retryPkg.contains(DRIVE_PACKAGE_NAME)) {
                        isDriveOpen = true
                        break
                    }
                }
            }

            // Fallback: If not open, attempt direct launcher intent with retry
            if (!isDriveOpen) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Retrying direct launcher intent for Google Drive...")
                bringDriveToForeground()
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

            // Step 4: Continuous Multi-Selection Harvest Loop across Shared tab
            val dynamicCutoffMs = resolveDynamicAcademicCutoffMs()
            CrawlerTraceLogger.log(
                "DRIVE_HARVESTER",
                "Commencing single-pass multi-selection sweep. Dynamic academic cutoff: timestamp $dynamicCutoffMs."
            )

            isContinuousMultiSelecting = true
            var isMultiSelectInitialized = false
            val selectedDriveTitles = mutableSetOf<String>()
            val processedFolderNames = mutableSetOf<String>()
            var reachedCutoffDate = false
            var consecutiveOlderThanCutoffCount = 0
            var scrollPageCount = 0
            var consecutiveStaticPages = 0
            var consecutiveWindowFailures = 0
            var lastVisibleTitles = listOf<String>()

            val initialPendingAttachments = getPendingUncapturedAttachments()
            val dynamicMaxScrollPages = calculateDynamicScrollPageLimit(initialPendingAttachments.size)
            CrawlerTraceLogger.log(
                "DRIVE_HARVESTER",
                "Harvest budget: max $dynamicMaxScrollPages scroll pages for ${initialPendingAttachments.size} pending attachments."
            )

            try {
                while (serviceScope.isActive && crawlerOverlay?.isAutoScrollingActive() == true && scrollPageCount < dynamicMaxScrollPages) {
                    crawlerOverlay?.updateStatus(
                        "Selecting Files (Page ${scrollPageCount + 1})...",
                        "${selectedDriveTitles.size} selected so far"
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
                            if (candidateRoot != null && !candidatePkg.contains(DRIVE_PACKAGE_NAME) && candidatePkg.isNotBlank()) {
                                if (candidatePkg.contains("youtube") || candidatePkg.contains("chrome") || candidatePkg.contains("viewer")) {
                                    CrawlerTraceLogger.log(
                                        "DRIVE_AUTO_RECOVERY",
                                        "Displaced to external app '$candidatePkg' during harvest. Pressing Back to return to Drive..."
                                    )
                                    dispatchBackAction()
                                }
                            }
                            candidateRoot?.recycle()
                            delay(250L)
                            rootRetry++
                        }
                    }
                    if (currentRoot == null) {
                        consecutiveWindowFailures++
                        val activePkg = rootInActiveWindowProvider()?.let {
                            val p = it.packageName?.toString() ?: ""
                            it.recycle()
                            p
                        } ?: "null"
                        if (consecutiveWindowFailures >= MAX_CONSECUTIVE_WINDOW_FAILURES) {
                            CrawlerTraceLogger.log(
                                "DRIVE_HARVESTER",
                                "Drive window unavailable after $consecutiveWindowFailures consecutive attempts (active window: '$activePkg'). Safely concluding Drive harvest pass."
                            )
                            crawlerOverlay?.updateStatus("Drive Unavailable", "Harvest concluded safely")
                            break
                        }
                        CrawlerTraceLogger.log(
                            "DRIVE_HARVESTER",
                            "Drive window unavailable on page ${scrollPageCount + 1} (attempt $consecutiveWindowFailures/$MAX_CONSECUTIVE_WINDOW_FAILURES, active window: '$activePkg'). Re-bringing Drive to front..."
                        )
                        bringDriveToForeground()
                        delay(SETTLING_DELAY_MS)
                        continue
                    }
                    consecutiveWindowFailures = 0

                    // Check displacement (ignoring stuck multi-select because continuous multi-selection is active)
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

                    // Check if Drive list reached the bottom (same items across consecutive swipes)
                    if (visibleTitles.isNotEmpty() && visibleTitles == lastVisibleTitles) {
                        consecutiveStaticPages++
                        if (consecutiveStaticPages >= MAX_CONSECUTIVE_STATIC_PAGES) {
                            CrawlerTraceLogger.log(
                                "DRIVE_HARVESTER",
                                "Drive list reached the bottom (same items across $consecutiveStaticPages swipes). Concluding selection pass."
                            )
                            for (item in visibleItems) {
                                item.node.recycle()
                            }
                            currentRoot?.recycle()
                            break
                        }
                    } else {
                        consecutiveStaticPages = 0
                        if (visibleTitles.isNotEmpty()) {
                            lastVisibleTitles = visibleTitles
                        }
                    }

                    // Multi-Select Activation Check
                    var isCurrentlyInMultiSelect = isMultiSelectActive(currentRoot)

                    // If not yet in multi-select mode, activate it by long-pressing the first non-folder item
                    if (!isCurrentlyInMultiSelect) {
                        val firstSelectable = visibleItems.firstOrNull { !it.isFolder }
                        if (firstSelectable != null) {
                            CrawlerTraceLogger.log(
                                "DRIVE_HARVESTER",
                                "Initiating multi-selection by long-pressing: \"${firstSelectable.title}\"..."
                            )
                            performVerifiedAccessibilityLongClick(firstSelectable.node)
                            delay(500L)
                            var rootCheck = rootInActiveWindowProvider()
                            isCurrentlyInMultiSelect = rootCheck?.let { isMultiSelectActive(it) } == true
                            rootCheck?.recycle()

                            if (!isCurrentlyInMultiSelect) {
                                val clickableAncestor = findClickableAncestor(firstSelectable.node)
                                if (clickableAncestor != null) {
                                    performVerifiedAccessibilityLongClick(clickableAncestor)
                                    clickableAncestor.recycle()
                                    delay(500L)
                                    rootCheck = rootInActiveWindowProvider()
                                    isCurrentlyInMultiSelect = rootCheck?.let { isMultiSelectActive(it) } == true
                                    rootCheck?.recycle()
                                }
                            }

                            if (isCurrentlyInMultiSelect) {
                                isMultiSelectInitialized = true
                                selectedDriveTitles.add(firstSelectable.title)
                                crawlerOverlay?.updateStatus("Multi-Select Active", "Selected 1 file...")
                                CrawlerTraceLogger.log(
                                    "DRIVE_HARVESTER",
                                    "✓ Multi-selection activated via long-press on \"${firstSelectable.title}\"!"
                                )
                            } else {
                                CrawlerTraceLogger.log(
                                    "DRIVE_HARVESTER",
                                    "Warning: Long press did not activate multi-select mode. Retrying next iteration..."
                                )
                            }
                        }
                    }

                    // If multi-select is active, single-click to select all eligible non-folder files
                    if (isCurrentlyInMultiSelect) {
                        for (item in visibleItems) {
                            if (!serviceScope.isActive || crawlerOverlay?.isAutoScrollingActive() == false) {
                                break
                            }

                            // 1. Exclude folders completely
                            if (item.isFolder) {
                                if (!processedFolderNames.contains(item.title)) {
                                    processedFolderNames.add(item.title)
                                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "Excluding folder from selection: \"${item.title}\"")
                                }
                                continue
                            }

                            // 2. Avoid re-tapping items already selected (which would unselect them)
                            if (selectedDriveTitles.contains(item.title)) {
                                continue
                            }

                            // 3. Evaluate cutoff date from subtitle
                            val parsedDate = ClassroomDateParser.parse(item.subtitle)
                            if (parsedDate != null && parsedDate.timestampMs < dynamicCutoffMs) {
                                CrawlerTraceLogger.log(
                                    "DRIVE_HARVESTER",
                                    "Item \"${item.title}\" date (${parsedDate.canonicalDate}, ${parsedDate.timestampMs}) is older than cutoff ($dynamicCutoffMs). Skipping."
                                )
                                consecutiveOlderThanCutoffCount++
                                if (consecutiveOlderThanCutoffCount >= 3) {
                                    reachedCutoffDate = true
                                    CrawlerTraceLogger.log(
                                        "DRIVE_HARVESTER",
                                        "Academic cutoff date reached (3 consecutive older items). Concluding selection pass."
                                    )
                                }
                                continue
                            }
                            consecutiveOlderThanCutoffCount = 0

                            // 4. Select the file with pure accessibility click
                            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Selecting file: \"${item.title}\"")
                            val clicked = performVerifiedAccessibilityClick(item.node)
                            if (!clicked) {
                                val clickableAncestor = findClickableAncestor(item.node)
                                if (clickableAncestor != null) {
                                    performVerifiedAccessibilityClick(clickableAncestor)
                                    clickableAncestor.recycle()
                                }
                            }
                            selectedDriveTitles.add(item.title)
                            crawlerOverlay?.updateStatus(
                                "Selected ${selectedDriveTitles.size} Files",
                                item.title
                            )
                            delay(120L)
                        }
                    }

                    // Recycle item nodes
                    for (item in visibleItems) {
                        item.node.recycle()
                    }
                    currentRoot?.recycle()

                    if (reachedCutoffDate) {
                        break
                    }

                    // Scroll down to reveal older items while preserving current multi-selection
                    scrollPageCount++
                    scrollSharedListForward(preserveSelection = true)
                    delay(SETTLING_DELAY_MS)
                }

                // Step 5: Dispatch the multi-selection as a copy to K.I.D.S. Vault
                CrawlerTraceLogger.log(
                    "DRIVE_HARVESTER",
                    "Selection pass completed. Total files selected: ${selectedDriveTitles.size}."
                )

                if (selectedDriveTitles.isNotEmpty()) {
                    crawlerOverlay?.updateStatus("Dispatching Files", "Sending ${selectedDriveTitles.size} files to K.I.D.S. Vault...")
                    val dispatched = dispatchCurrentMultiSelectionAsCopy()
                    if (dispatched) {
                        totalHarvestedCount = selectedDriveTitles.size
                        CrawlerTraceLogger.log(
                            "DRIVE_HARVESTER",
                            "✓ Successfully dispatched $totalHarvestedCount files to K.I.D.S. Vault in a single operation!"
                        )
                        crawlerOverlay?.updateStatus(
                            "✓ Dispatched to Vault",
                            "Sent $totalHarvestedCount files to Vault."
                        )
                        delay(POST_BATCH_SETTLING_DELAY_MS)
                        // Trigger vault sync worker to upload received files
                        KidsAccessibilityService.triggerDriveSync(context)
                    } else {
                        CrawlerTraceLogger.log(
                            "DRIVE_HARVESTER",
                            "Failed to dispatch selected files via top overflow menu. Clearing selection..."
                        )
                        dismissMultiSelectMode()
                    }
                } else {
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "No files were selected during harvest pass.")
                    dismissMultiSelectMode()
                }
            } finally {
                isContinuousMultiSelecting = false
            }

            // Step 6: Harvest Discovered Folders (e.g. Teacher Assignment & Subject Folders)
            if (processedFolderNames.isNotEmpty() && serviceScope.isActive && crawlerOverlay?.isAutoScrollingActive() == true) {
                val pendingAfterRoot = getPendingUncapturedAttachments()
                val folderHarvested = harvestDiscoveredFolders(processedFolderNames, pendingAfterRoot)
                totalHarvestedCount += folderHarvested
            }

            CrawlerTraceLogger.log(
                "DRIVE_HARVESTER",
                "Google Drive Shared Tab Harvest completed: $totalHarvestedCount files dispatched to K.I.D.S. Vault."
            )
            return totalHarvestedCount
        } finally {
            isDriveHarvestingActive = false
            CrawlerTraceLogger.flushRemainingToCloud(context, targetAccountEmail)
            CrawlerTraceLogger.stopCloudStreaming()
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
                    CrawlerTraceLogger.log("ACCOUNT_SWITCH", "Clicking Shared tab to force top search bar uncollapse...")
                    performVerifiedAccessibilityClick(sharedTab)
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

        // 3. Open OneGoogle Account switcher via pure accessibility click
        val clickedAvatar = performVerifiedAccessibilityClick(avatarNode)
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
                    CrawlerTraceLogger.log("ACCOUNT_SWITCH", "Found target account row at $r. Dispatching accessibility click...")
                    val clicked = performVerifiedAccessibilityClick(targetRow)
                    targetRow.recycle()
                    isAccountTapped = clicked
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
    private fun isClassroomDrawerOpen(root: AccessibilityNodeInfo): Boolean {
        val texts = mutableListOf<String>()
        collectAllChildDescriptions(root, texts)
        val combined = texts.joinToString(" ").lowercase(Locale.US)
        return (combined.contains("classes") && combined.contains("calendar")) ||
                combined.contains("classroom folder") ||
                combined.contains("offline files") ||
                (combined.contains("settings") && combined.contains("help & feedback"))
    }

    private suspend fun openDriveViaClassroom(): Boolean {
        CrawlerTraceLogger.log("DRIVE_HARVESTER", "Attempting to open Google Drive via Classroom main menu folder...")
        crawlerOverlay?.updateStatus("Opening Drive...", "Accessing Classroom folder...")

        val root = rootInActiveWindowProvider() ?: return false
        val pkg = root.packageName?.toString() ?: ""
        if (!pkg.contains("classroom")) {
            root.recycle()
            return false
        }

        var isDrawerOpened = isClassroomDrawerOpen(root)

        // Step 1: If drawer is not open, check if we are inside a Course view or on the main Classes screen
        if (!isDrawerOpened) {
            val texts = mutableListOf<String>()
            collectAllChildDescriptions(root, texts)
            val combined = texts.joinToString(" ").lowercase(Locale.US)
            val isInsideCourse = (combined.contains("stream") && combined.contains("classwork")) ||
                    combined.contains("tab 1 of") ||
                    (combined.contains("stream") && combined.contains("people"))

            if (isInsideCourse) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Currently inside Classroom Course view. Navigating up to main Classes menu...")
                val upNode = findHamburgerNode(root)
                var clickedUp = false
                if (upNode != null) {
                    clickedUp = performVerifiedAccessibilityClick(upNode)
                    upNode.recycle()
                }
                if (!clickedUp) {
                    dispatchBackAction()
                }
                delay(1200L)
            } else {
                // On main Classes screen: click the hamburger menu icon
                val hamburgerNode = findHamburgerNode(root)
                if (hamburgerNode != null) {
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "Clicking Classroom main menu hamburger icon...")
                    performVerifiedAccessibilityClick(hamburgerNode)
                    hamburgerNode.recycle()
                    delay(1000L)
                }
            }
        }
        root.recycle()

        // Check if drawer is open on main screen; if still closed, use left-edge swipe gesture
        val checkRoot = rootInActiveWindowProvider()
        if (checkRoot != null) {
            isDrawerOpened = isClassroomDrawerOpen(checkRoot)
            if (!isDrawerOpened) {
                val hamburgerNode = findHamburgerNode(checkRoot)
                val desc = hamburgerNode?.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
                val isNavUp = desc.contains("navigate up") || desc.contains("back")
                if (hamburgerNode != null && !isNavUp) {
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "Clicking main menu drawer button...")
                    performVerifiedAccessibilityClick(hamburgerNode)
                    hamburgerNode.recycle()
                    delay(1000L)
                } else {
                    hamburgerNode?.recycle()
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "Dispatching left-edge swipe to open Classroom drawer...")
                    val dm = context.resources.displayMetrics
                    val startX = dm.density * 5f
                    val endX = dm.widthPixels * 0.65f
                    val swipeY = dm.heightPixels * 0.45f
                    dispatchSwipeAction(startX, swipeY, endX, swipeY, 350L)
                    delay(1000L)
                }
            }
            checkRoot.recycle()
        }

        // Verify the drawer is actually open before searching for drawer items to prevent touching post views
        val drawerCheckRoot = rootInActiveWindowProvider() ?: return false
        val verifiedDrawerOpen = isClassroomDrawerOpen(drawerCheckRoot)
        if (!verifiedDrawerOpen) {
            drawerCheckRoot.recycle()
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Classroom drawer is not open. Skipping drawer item scan to prevent mis-clicks.")
            return false
        }

        // Step 2: In the verified open drawer, locate "Classroom folders"
        var folderNode = findClassroomFolderDrawerNode(drawerCheckRoot)

        if (folderNode == null) {
            // Scroll down inside the drawer in case "Classroom folders" is lower down
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "'Classroom folders' not immediately visible. Scrolling drawer down...")
            val dm = context.resources.displayMetrics
            val swipeX = dm.widthPixels * 0.40f
            val startY = dm.heightPixels * 0.70f
            val endY = dm.heightPixels * 0.25f
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
            performVerifiedAccessibilityClick(folderNode)
            folderNode.recycle()
            drawerCheckRoot.recycle()
            return true
        }

        drawerCheckRoot.recycle()
        CrawlerTraceLogger.log("DRIVE_HARVESTER", "Classroom folder option not found in drawer.")
        return false
    }

    private fun findClassroomFolderDrawerNode(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val text = root.text?.toString()?.lowercase(Locale.US) ?: ""
        val desc = root.contentDescription?.toString()?.lowercase(Locale.US) ?: ""

        val isForbiddenTab = text.contains("classwork") || desc.contains("classwork") ||
                text.contains("stream") || desc.contains("stream") ||
                text.contains("people") || desc.contains("people") ||
                desc.contains("tab,") || desc.contains("search")

        if (isForbiddenTab) {
            return null
        }

        val isFolderItem = (text.contains("classroom folder") || text.contains("classroom folders") ||
                desc.contains("classroom folder") || desc.contains("classroom folders") ||
                text.contains("google drive folder") || desc.contains("google drive folder") ||
                text.contains("drive folder") || desc.contains("drive folder")) &&
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
            desc.contains("back") ||
            text.contains("menu") ||
            text.contains("back") ||
            viewId.contains("open_drawer") ||
            viewId.contains("navigation_drawer") ||
            viewId.contains("home") ||
            viewId.contains("up") ||
            viewId.contains("back")
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
     * Resiliently acquires the Google Drive active window root node, retrying up to [maxRetries] times
     * with an adaptive settling interval to accommodate Android activity and fragment transition animations.
     */
    private suspend fun acquireDriveRootWithRetry(maxRetries: Int = 10, intervalMs: Long = 250L): AccessibilityNodeInfo? {
        var retries = 0
        while (serviceScope.isActive && retries < maxRetries) {
            val candidate = rootInActiveWindowProvider()
            if (candidate != null) {
                val pkg = candidate.packageName?.toString() ?: ""
                if (pkg.contains(DRIVE_PACKAGE_NAME)) {
                    return candidate
                }
                if (retries >= 5) {
                    return candidate
                }
                candidate.recycle()
            }
            delay(intervalMs)
            retries++
        }
        return rootInActiveWindowProvider()
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

        // Fast check: verify if Google Drive is ALREADY on the Shared tab screen
        val initialRoot = acquireDriveRootWithRetry(maxRetries = 4, intervalMs = 200L)
        if (initialRoot != null) {
            val pkg = initialRoot.packageName?.toString() ?: ""
            if (pkg.contains(DRIVE_PACKAGE_NAME) && isCurrentlyOnSharedScreen(initialRoot)) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Google Drive is already on the Shared tab screen. Proceeding to harvest!")
                initialRoot.recycle()
                return true
            }
            initialRoot.recycle()
        }

        // Step A: If bottom navigation bar is not visible (e.g. inside a folder), navigate up/back to root
        var attempts = 0
        while (attempts < MAX_NAV_UP_ATTEMPTS && serviceScope.isActive) {
            val root = acquireDriveRootWithRetry()
            if (root == null) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Drive window not yet available during transition (attempt ${attempts + 1}). Bringing Drive to foreground...")
                bringDriveToForeground()
                delay(SETTLING_DELAY_MS)
                attempts++
                continue
            }
            val currentPkg = root.packageName?.toString() ?: ""
            if (!currentPkg.contains(DRIVE_PACKAGE_NAME)) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Active window is not Google Drive ($currentPkg). Bringing Drive to foreground (attempt ${attempts + 1})...")
                root.recycle()
                bringDriveToForeground()
                delay(SETTLING_DELAY_MS)
                attempts++
                continue
            }

            if (isCurrentlyOnSharedScreen(root)) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Confirmed on Shared tab screen (attempt ${attempts + 1}). Proceeding to harvest!")
                root.recycle()
                return true
            }

            val sharedTabNode = findSharedTabNode(root)
            if (sharedTabNode != null) {
                // Bottom navigation bar is visible! Select the Shared tab.
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Bottom navigation bar detected. Selecting Shared tab...")
                performVerifiedAccessibilityClick(sharedTabNode)
                sharedTabNode.recycle()
                root.recycle()
                delay(SETTLING_DELAY_MS + 200L)

                // Verify that Shared tab is selected
                val checkRoot = acquireDriveRootWithRetry(maxRetries = 6, intervalMs = 200L)
                val isStillDisplaced = if (checkRoot != null) {
                    val d = isDisplacedFromSharedTab(checkRoot)
                    checkRoot.recycle()
                    d
                } else false

                if (!isStillDisplaced) {
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "Shared tab active and verified. Proceeding to harvest!")
                    return true
                }
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Shared tab click did not switch active tab; attempting retry...")
                attempts++
                continue
            }

            // If Shared tab node was not matched by text, but another bottom tab is selected, locate and click Shared tab directly
            val otherSelectedTab = findSelectedNonSharedTab(root)
            if (otherSelectedTab != null) {
                otherSelectedTab.recycle()
                val targetTab = findSharedTabNode(root) ?: findNodeContainingText(root, "shared")
                root.recycle()
                if (targetTab != null) {
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "Bottom navigation bar detected. Selecting Shared tab node...")
                    performVerifiedAccessibilityClick(targetTab)
                    targetTab.recycle()
                }
                delay(SETTLING_DELAY_MS + 200L)

                val checkRoot = acquireDriveRootWithRetry(maxRetries = 6, intervalMs = 200L)
                val isStillDisplaced = if (checkRoot != null) {
                    val d = isDisplacedFromSharedTab(checkRoot)
                    checkRoot.recycle()
                    d
                } else false

                if (!isStillDisplaced) {
                    return true
                }
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Tab selection did not switch active tab; retrying...")
                attempts++
                continue
            }

            // Bottom bar not visible. Check if we are inside a folder (Navigate up / Back button present)
            val navUp = findNavigateUpButton(root)
            val folderTitle = findDriveCurrentFolderTitle(root)
            root.recycle()

            if (navUp != null) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Inside folder (bottom bar hidden). Navigating up toward root (attempt ${attempts + 1})...")
                val clickedNavUp = performVerifiedAccessibilityClick(navUp)
                navUp.recycle()
                if (!clickedNavUp) {
                    dispatchBackAction()
                }
            } else if (folderTitle != null && !isTopLevelDriveTitle(folderTitle)) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Inside subfolder \"$folderTitle\" without visible up button. Pressing Back toward root (attempt ${attempts + 1})...")
                dispatchBackAction()
            } else {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "At root level or awaiting bottom navigation bar render (attempt ${attempts + 1})...")
                if (attempts >= 1) {
                    val debugRoot = acquireDriveRootWithRetry(maxRetries = 2, intervalMs = 100L)
                    if (debugRoot != null) {
                        logDriveNavigationDebugSnapshot(debugRoot)
                        debugRoot.recycle()
                    }
                }
                delay(SETTLING_DELAY_MS)
            }

            delay(600L)
            attempts++
        }

        // Final attempt: check if Shared tab is now visible with retry
        val finalRoot = acquireDriveRootWithRetry(maxRetries = 8, intervalMs = 250L) ?: return false
        val finalPkg = finalRoot.packageName?.toString() ?: ""
        if (!finalPkg.contains(DRIVE_PACKAGE_NAME)) {
            finalRoot.recycle()
            return false
        }
        val finalSharedTab = findSharedTabNode(finalRoot)
        if (finalSharedTab != null) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Selecting Shared tab after exiting folder...")
            performVerifiedAccessibilityClick(finalSharedTab)
            finalSharedTab.recycle()
            finalRoot.recycle()
            delay(SETTLING_DELAY_MS + 200L)

            val checkRoot = acquireDriveRootWithRetry(maxRetries = 6, intervalMs = 200L)
            val isStillDisplaced = if (checkRoot != null) {
                val d = isDisplacedFromSharedTab(checkRoot)
                checkRoot.recycle()
                d
            } else false
            return !isStillDisplaced
        }

        // Final check: find Shared tab directly
        val finalOtherTab = findSelectedNonSharedTab(finalRoot)
        if (finalOtherTab != null) {
            finalOtherTab.recycle()
            val targetTab = findSharedTabNode(finalRoot) ?: findNodeContainingText(finalRoot, "shared")
            finalRoot.recycle()
            if (targetTab != null) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Selecting Shared tab node on final check...")
                performVerifiedAccessibilityClick(targetTab)
                targetTab.recycle()
            }
            delay(SETTLING_DELAY_MS + 200L)

            val checkRoot = acquireDriveRootWithRetry(maxRetries = 6, intervalMs = 200L)
            val isStillDisplaced = if (checkRoot != null) {
                val d = isDisplacedFromSharedTab(checkRoot)
                checkRoot.recycle()
                d
            } else false
            return !isStillDisplaced
        }

        if (isCurrentlyOnSharedScreen(finalRoot)) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Confirmed on Shared tab screen via active files/header. Proceeding to harvest!")
            finalRoot.recycle()
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

            var rowMoreActionsBounds: Rect? = null
            val moreNode = findMoreActionsNodeInRow(rowNode)
            if (moreNode != null) {
                val rMore = Rect()
                moreNode.getBoundsInScreen(rMore)
                if (rMore.width() > 0 && rMore.height() > 0) {
                    rowMoreActionsBounds = rMore
                }
                moreNode.recycle()
            }

            outList.add(
                DriveSharedItem(
                    title = title,
                    subtitle = itemDescs.joinToString(", "),
                    isFolder = isFolder,
                    hasFileBadge = hasFileBadge,
                    node = rowNode,
                    bounds = r,
                    moreActionsBounds = rowMoreActionsBounds
                )
            )
        }
    }

    private fun findMoreActionsNodeInRow(row: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val desc = row.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val text = row.text?.toString()?.lowercase(Locale.US) ?: ""
        val viewId = row.viewIdResourceName?.lowercase(Locale.US) ?: ""

        val isDirectMore = desc.startsWith("more action") || desc.contains("more action") ||
                desc.startsWith("more option") || desc.contains("more option") ||
                desc.startsWith("options for") || desc.contains("action menu") ||
                desc.contains("overflow") || desc == "more" || desc == "options" || text == "⋮" ||
                viewId.contains("more_actions") || viewId.contains("more_options") ||
                viewId.contains("entry_overflow") || viewId.contains("overflow") ||
                viewId.contains("menu_button") || viewId.contains("action_more") ||
                viewId.contains("three_dots")

        if (isDirectMore) {
            return if (row.isClickable) AccessibilityNodeInfo.obtain(row) else (findClickableAncestor(row) ?: AccessibilityNodeInfo.obtain(row))
        }

        // Geometric detection: If this child is on the far right edge of the row container
        val r = Rect()
        row.getBoundsInScreen(r)
        val displayMetrics = context.resources.displayMetrics
        val minTargetDimension = (displayMetrics.density * 24).toInt()
        val maxTargetDimension = (displayMetrics.density * 80).toInt()
        val isRightEdgeButton = (row.isClickable || row.className?.toString()?.contains("Image") == true) &&
                r.width() in minTargetDimension..maxTargetDimension && r.height() in minTargetDimension..maxTargetDimension

        for (i in 0 until row.childCount) {
            val child = row.getChild(i) ?: continue
            val found = findMoreActionsNodeInRow(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }

        if (isRightEdgeButton) {
            val parent = row.parent
            if (parent != null) {
                val pr = Rect()
                parent.getBoundsInScreen(pr)
                parent.recycle()
                if (pr.width() > 0 && r.right >= pr.right - (displayMetrics.density * 48).toInt()) {
                    return if (row.isClickable) AccessibilityNodeInfo.obtain(row) else (findClickableAncestor(row) ?: AccessibilityNodeInfo.obtain(row))
                }
            }
        }

        return null
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
        ) || clean.startsWith("sort by") || clean.startsWith("shared by") || clean.startsWith("more actions for") ||
        clean.startsWith("more options for") || clean.startsWith("options for") || clean.startsWith("action menu for")
    }

    private fun findItemsViaMoreActionsButtons(root: AccessibilityNodeInfo, outList: MutableList<DriveSharedItem>) {
        val moreActionsNodes = mutableListOf<AccessibilityNodeInfo>()
        collectMoreActionsNodesRecursively(root, moreActionsNodes)

        for (actionNode in moreActionsNodes) {
            val desc = actionNode.contentDescription?.toString()?.trim() ?: ""
            val rawTitle = when {
                desc.startsWith("More actions for ", ignoreCase = true) -> desc.substringAfter("More actions for ", "").trim()
                desc.startsWith("More options for ", ignoreCase = true) -> desc.substringAfter("More options for ", "").trim()
                desc.startsWith("Options for ", ignoreCase = true) -> desc.substringAfter("Options for ", "").trim()
                desc.startsWith("Action menu for ", ignoreCase = true) -> desc.substringAfter("Action menu for ", "").trim()
                else -> ""
            }
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
        val lower = desc.lowercase(Locale.US)
        if (lower.startsWith("more actions for") || lower.startsWith("more options for") ||
            lower.startsWith("options for") || lower.startsWith("action menu for")) {
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
        val isMoreActionsDesc = desc.startsWith("More actions for ", ignoreCase = true) ||
                desc.startsWith("More options for ", ignoreCase = true) ||
                desc.startsWith("Options for ", ignoreCase = true) ||
                desc.startsWith("Action menu for ", ignoreCase = true)
        if (desc.isNotBlank() && !isMoreActionsDesc) {
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
     * Dispatches items in Google Drive exclusively using each item's dedicated 3-dots overflow menu
     * ("Send a copy" -> "K.I.D.S. Vault").
     *
     * ZERO-CLICK / ZERO-LONGPRESS INVARIANT: Row bodies and thumbnails are NEVER clicked or long-pressed directly.
     * This permanently eliminates the issue where long-pressing or tapping a file opens it into a full-screen
     * audio player or document viewer.
     */
    private suspend fun selectAndDispatchBatch(
        batch: List<DriveSharedItem>,
        onItemDispatched: ((String) -> Unit)? = null,
        onItemFailed: ((String) -> Unit)? = null
    ): Int {
        if (batch.isEmpty()) return 0

        var successCount = 0
        for (item in batch) {
            if (!serviceScope.isActive || crawlerOverlay?.isAutoScrollingActive() == false) {
                item.node.recycle()
                break
            }

            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Dispatching item strictly via 3-dots menu: \"${item.title}\"")
            val dispatched = dispatchSingleItemViaRowMenu(item)
            item.node.recycle()

            if (dispatched) {
                successCount++
                onItemDispatched?.invoke(item.title)
                delay(600L)
            } else {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Failed to dispatch \"${item.title}\" via 3-dots menu. Skipping row click to avoid opening media player.")
                onItemFailed?.invoke(item.title)
            }
        }

        dismissMultiSelectMode()
        return successCount
    }

    private suspend fun dismissMultiSelectMode() {
        delay(300L)
        val root = rootInActiveWindowProvider() ?: return
        val texts = mutableListOf<String>()
        collectAllChildDescriptions(root, texts)
        val combined = texts.joinToString(" ").lowercase(Locale.US)
        val isMultiSelectActive = combined.contains("selected") || combined.contains("clear selection")
        if (isMultiSelectActive) {
            val closeBtn = findCloseSelectionButton(root)
            if (closeBtn != null) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Dismissing multi-select mode via Close button...")
                performVerifiedAccessibilityClick(closeBtn)
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

    private fun findMoreActionsNodeForItem(root: AccessibilityNodeInfo, itemTitle: String): AccessibilityNodeInfo? {
        val lowerTitle = itemTitle.trim().lowercase(Locale.US)
        val desc = root.contentDescription?.toString()?.lowercase(Locale.US) ?: ""

        val isMatchByDesc = (desc.contains("more action") || desc.contains("more option") || desc.contains("option") || desc.contains("overflow")) &&
                (desc.contains(lowerTitle) || (lowerTitle.length >= 6 && desc.contains(lowerTitle.take(12))))
        if (isMatchByDesc) {
            return if (root.isClickable) AccessibilityNodeInfo.obtain(root) else (findClickableAncestor(root) ?: AccessibilityNodeInfo.obtain(root))
        }

        // Direct search: If node contains the item's title in text, desc, or viewId, find its row container and get the 3-dots node in that row
        val text = root.text?.toString()?.lowercase(Locale.US) ?: ""
        val viewId = root.viewIdResourceName?.lowercase(Locale.US) ?: ""
        val matchesTitle = text == lowerTitle || desc == lowerTitle || viewId.contains(lowerTitle) ||
                (lowerTitle.length >= 8 && (text.contains(lowerTitle.take(16)) || desc.contains(lowerTitle.take(16)) || viewId.contains(lowerTitle.take(16))))
        if (matchesTitle && !desc.contains("more action") && !desc.contains("more option")) {
            var rowAncestor: AccessibilityNodeInfo? = root.parent
            val displayMetrics = context.resources.displayMetrics
            val minRowHeight = (displayMetrics.density * 28).toInt()
            val maxRowHeight = (displayMetrics.density * 160).toInt()
            while (rowAncestor != null) {
                val r = Rect()
                rowAncestor.getBoundsInScreen(r)
                if (r.height() in minRowHeight..maxRowHeight && r.width() >= (displayMetrics.widthPixels * 0.45f).toInt()) {
                    val moreInRow = findMoreActionsNodeInRow(rowAncestor)
                    if (moreInRow != null) {
                        rowAncestor.recycle()
                        return moreInRow
                    }
                }
                val nextParent = rowAncestor.parent
                rowAncestor.recycle()
                rowAncestor = nextParent
            }
        }

        for (i in 0 until root.childCount) {
            val child = root.getChild(i) ?: continue
            val found = findMoreActionsNodeForItem(child, itemTitle)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private suspend fun dispatchSingleItemViaRowMenu(item: DriveSharedItem): Boolean {
        var openedActionSheet = false

        // Strategy A: Find dedicated 3-dots button for item in active window
        val root = rootInActiveWindowProvider()
        if (root != null) {
            val moreActionsNode = findMoreActionsNodeForItem(root, item.title)
                ?: findMoreActionsNodeInRow(item.node)
            if (moreActionsNode != null) {
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Clicking dedicated 3-dots button for \"${item.title}\"...")
                openedActionSheet = performVerifiedAccessibilityClick(moreActionsNode)
                moreActionsNode.recycle()
            }
            root.recycle()
        }

        if (!openedActionSheet) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Could not locate 3-dots button for \"${item.title}\". Skipping row click to avoid opening file.")
            return false
        }

        delay(600L)

        // Find "Send a copy" in the opened bottom sheet
        var sendCopyNode: AccessibilityNodeInfo? = null
        waitForConditionAction(2500L, 150L) {
            val sheetRoot = rootInActiveWindowProvider() ?: return@waitForConditionAction false
            sendCopyNode = findSendCopyNode(sheetRoot)
            sheetRoot.recycle()
            sendCopyNode != null
        }

        if (sendCopyNode == null) {
            val checkRoot = rootInActiveWindowProvider()
            if (checkRoot != null) {
                if (isDriveViewerOrEditorScreen(checkRoot)) {
                    val trackTitle = findAudioPlayerTrackTitle(checkRoot) ?: item.title
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "Viewer/player opened instead of action sheet for \"$trackTitle\". Dismissing immediately...")
                    dismissAnyActiveViewer()
                } else {
                    dispatchBackAction()
                }
                checkRoot.recycle()
            } else {
                dispatchBackAction()
            }
            delay(400L)
            return false
        }

        performVerifiedAccessibilityClick(sendCopyNode)
        sendCopyNode?.recycle()

        // Select K.I.D.S. Vault in the system share sheet
        selectKidsInChooserAction()

        // Wait for Google Drive to regain foreground focus after ShareTargetActivity finishes
        waitForDriveForeground()
        return true
    }

    private suspend fun waitForDriveForeground(maxWaitMs: Long = 5000L) {
        val start = System.currentTimeMillis()
        while (serviceScope.isActive && (System.currentTimeMillis() - start) < maxWaitMs) {
            val checkRoot = rootInActiveWindowProvider()
            val pkg = checkRoot?.packageName?.toString() ?: ""
            val isDrive = pkg.contains(DRIVE_PACKAGE_NAME)
            checkRoot?.recycle()
            if (isDrive) {
                delay(300L)
                return
            }
            delay(250L)
        }
    }

    private suspend fun dispatchCurrentMultiSelectionAsCopy(): Boolean {
        // 1. Find Drive's top-right overflow menu button (⋮)
        var overflowButton: AccessibilityNodeInfo? = null
        val root = rootInActiveWindowProvider()
        if (root != null) {
            overflowButton = findOverflowMenuButton(root)
            root.recycle()
        }

        var clickedOverflow = performVerifiedAccessibilityClick(overflowButton)
        overflowButton?.recycle()

        if (!clickedOverflow) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Could not locate top overflow menu button.")
            return false
        }

        delay(600L)

        // 2. Locate and tap "Send a copy" in the overflow popup menu
        var sendCopyNode: AccessibilityNodeInfo? = null
        waitForConditionAction(3000L, 150L) {
            val popupRoot = rootInActiveWindowProvider() ?: return@waitForConditionAction false
            sendCopyNode = findSendCopyNode(popupRoot)
            popupRoot.recycle()
            sendCopyNode != null
        }

        if (sendCopyNode == null) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "'Send a copy' option not found in top overflow menu.")
            return false
        }

        performVerifiedAccessibilityClick(sendCopyNode)
        sendCopyNode?.recycle()

        // 3. Select K.I.D.S. in the Android system share sheet
        val dispatched = selectKidsInChooserAction()
        if (!dispatched) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Failed to select K.I.D.S. in system chooser.")
            return false
        }

        // 4. Wait for Google Drive to regain foreground focus
        waitForDriveForeground(10000L)
        return true
    }

    private suspend fun scrollSharedListForward(preserveSelection: Boolean = false) {
        if (!preserveSelection) {
            // Ensure any remaining selection is cleared before scrolling so gestures scroll instead of selecting
            dismissMultiSelectMode()
        }

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

    private fun dumpVisibleScreenSummary(root: AccessibilityNodeInfo): String {
        val texts = mutableListOf<String>()
        collectAllChildDescriptions(root, texts)
        return texts.filter { it.isNotBlank() }.distinct().take(15).joinToString(" | ")
    }

    private fun findAudioPlayerTrackTitle(root: AccessibilityNodeInfo): String? {
        val texts = mutableListOf<String>()
        collectAllChildDescriptions(root, texts)
        val knownExtensions = setOf(
            ".mp3", ".m4a", ".wav", ".aac", ".ogg", ".flac", ".opus", ".m4p", ".wma",
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".jpg", ".png"
        )
        val explicitTrack = texts.firstOrNull { t ->
            val lower = t.trim().lowercase(Locale.US)
            knownExtensions.any { lower.endsWith(it) } ||
                    ((lower.contains("audio") || lower.contains("track") || lower.contains("recording") || lower.contains("lesson") || lower.contains("chapter")) &&
                     !lower.contains("playback speed") && !lower.contains("rewind") && !lower.contains("forward") && !lower.contains("seconds"))
        }
        if (explicitTrack != null) return explicitTrack.trim()

        return texts.firstOrNull { t ->
            val lower = t.trim().lowercase(Locale.US)
            lower.length >= 4 && !isSystemHeaderTitle(lower) && !lower.contains("playback") && !lower.contains("pause") && !lower.contains("seconds") && !lower.contains("speed")
        }?.trim()
    }

    private suspend fun dismissAnyActiveViewer() {
        var attempts = 0
        while (attempts < 3) {
            val root = rootInActiveWindowProvider() ?: break
            val isViewer = isDriveViewerOrEditorScreen(root)
            if (isViewer) {
                val trackTitle = findAudioPlayerTrackTitle(root) ?: "Unknown Document/Audio"
                val summary = dumpVisibleScreenSummary(root)
                CrawlerTraceLogger.log("DRIVE_HARVESTER", "Active file preview / media player detected for: \"$trackTitle\". Screen nodes: [$summary]. Navigating back to Drive list...")
                val audioDismissed = dismissAudioPlayerIfActive(root)
                if (audioDismissed) {
                    root.recycle()
                    delay(500L)
                    attempts++
                    continue
                }

                val navUp = findNavigateUpButton(root)
                val clickedNavUp = performVerifiedAccessibilityClick(navUp)
                navUp?.recycle()
                root.recycle()
                if (!clickedNavUp) {
                    dispatchBackAction()
                }
                delay(800L)
                attempts++
            } else {
                root.recycle()
                break
            }
        }
    }

    private suspend fun dismissAudioPlayerIfActive(root: AccessibilityNodeInfo): Boolean {
        var dismissed = false
        val trackTitle = findAudioPlayerTrackTitle(root)

        // A. If pause button is present (media actively playing), halt playback
        val pauseButton = findAudioPauseButton(root)
        if (pauseButton != null) {
            CrawlerTraceLogger.log("AUDIO_RECOVERY", "Found active audio Pause button for \"${trackTitle ?: "Audio"}\". Halting playback...")
            performVerifiedAccessibilityClick(pauseButton)
            pauseButton.recycle()
            dismissed = true
            delay(250L)
        }

        // B. Find dedicated Close / Dismiss button for audio player (mini-player or full-screen)
        val closeButton = findAudioPlayerDismissButton(root)
        if (closeButton != null) {
            CrawlerTraceLogger.log("AUDIO_RECOVERY", "Found audio player Close/Dismiss button for \"${trackTitle ?: "Audio"}\". Dismissing media player...")
            performVerifiedAccessibilityClick(closeButton)
            closeButton.recycle()
            dismissed = true
            delay(400L)
        }

        return dismissed
    }

    private fun findAudioPauseButton(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val text = node.text?.toString()?.lowercase(Locale.US) ?: ""
        val viewId = node.viewIdResourceName?.lowercase(Locale.US) ?: ""

        val isPause = (desc.contains("pause") || text.equals("pause", ignoreCase = true) || viewId.contains("pause")) &&
                !desc.contains("more actions") && !desc.contains("more options")

        if (isPause) {
            return if (node.isClickable) AccessibilityNodeInfo.obtain(node) else (findClickableAncestor(node) ?: AccessibilityNodeInfo.obtain(node))
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findAudioPauseButton(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun findAudioPlayerDismissButton(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val displayMetrics = context.resources.displayMetrics
        val minBottomY = (displayMetrics.heightPixels * 0.65f).toInt()
        val maxHeaderTop = (displayMetrics.density * 100).toInt()
        return findAudioPlayerDismissButtonInternal(node, displayMetrics, minBottomY, maxHeaderTop)
    }

    private fun findAudioPlayerDismissButtonInternal(
        node: AccessibilityNodeInfo,
        displayMetrics: DisplayMetrics,
        minBottomY: Int,
        maxHeaderTop: Int
    ): AccessibilityNodeInfo? {
        val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val text = node.text?.toString()?.lowercase(Locale.US) ?: ""
        val viewId = node.viewIdResourceName?.lowercase(Locale.US) ?: ""

        val bounds = Rect()
        node.getBoundsInScreen(bounds)

        // Case 1: Close button on bottom docked mini-player
        val isInBottomZone = bounds.centerY() >= minBottomY && bounds.height() > 0
        val isBottomClose = isInBottomZone && (
                desc.contains("close") || desc.contains("dismiss") || desc == "x" ||
                desc.contains("stop") || viewId.contains("close") || viewId.contains("dismiss") ||
                viewId.contains("cancel") || (text == "✕" || text == "x")
        ) && !desc.contains("more actions") && !desc.contains("more options")

        if (isBottomClose) {
            return if (node.isClickable) AccessibilityNodeInfo.obtain(node) else (findClickableAncestor(node) ?: AccessibilityNodeInfo.obtain(node))
        }

        // Case 2: Close/collapse button on full-screen audio player
        val isInHeaderZone = bounds.top <= maxHeaderTop && bounds.left <= displayMetrics.widthPixels * 0.35f
        val isHeaderClose = isInHeaderZone && (
                desc.contains("close") || desc.contains("collapse") || desc.contains("navigate up") ||
                desc == "back" || viewId.contains("close") || viewId.contains("collapse")
        ) && !desc.contains("more actions") && !desc.contains("more options")

        if (isHeaderClose) {
            return if (node.isClickable) AccessibilityNodeInfo.obtain(node) else (findClickableAncestor(node) ?: AccessibilityNodeInfo.obtain(node))
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findAudioPlayerDismissButtonInternal(child, displayMetrics, minBottomY, maxHeaderTop)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
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
            val trackTitle = findAudioPlayerTrackTitle(root) ?: "Unknown Document/Audio"
            val summary = dumpVisibleScreenSummary(root)
            CrawlerTraceLogger.log(
                "DRIVE_AUTO_RECOVERY",
                "Displaced to document viewer/editor/player for file: \"$trackTitle\". Screen nodes: [$summary]. Executing auto-recovery back to Drive list..."
            )
            crawlerOverlay?.updateStatus("Drive Auto-Recovery", "Returning from: $trackTitle")
            dismissAnyActiveViewer()
            delay(SETTLING_DELAY_MS)
            return true
        }

        // 1b. Check if an audio mini-player or lingering audio controls are docked at the bottom while browsing
        if (dismissAudioPlayerIfActive(root)) {
            CrawlerTraceLogger.log(
                "DRIVE_AUTO_RECOVERY",
                "Active audio player controls dismissed while on browsing screen."
            )
            delay(400L)
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

        // 3. Check for Stuck Multi-Select Mode (when not currently in a deliberate multi-select pass)
        if (!isContinuousMultiSelecting && isStuckMultiSelectMode(root)) {
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

        // 6. Check for Stray Google Drive Dialogs / Prompts (e.g. "Storage full", "Not now", "Cancel")
        if (handleStrayDriveDialogIfPresent(root)) {
            delay(SETTLING_DELAY_MS)
            return true
        }

        // 7. Check for Network Retry prompt ("Tap to retry", "Try again")
        if (handleDriveNetworkRetryPrompt(root)) {
            delay(SETTLING_DELAY_MS)
            return true
        }

        return false
    }

    private suspend fun handleDriveChooserIfPresent(): Boolean {
        val root = rootInActiveWindowProvider() ?: return false
        val pkg = root.packageName?.toString()?.lowercase(Locale.US) ?: ""
        if (!pkg.contains("resolver") && !pkg.contains("chooser") && !pkg.contains("intentresolver")) {
            root.recycle()
            return false
        }
        CrawlerTraceLogger.log("DRIVE_AUTO_RECOVERY", "App chooser / resolver detected. Looking for Drive...")
        val driveNodes = root.findAccessibilityNodeInfosByText("Drive")
        for (node in driveNodes) {
            val clickable = if (node.isClickable) AccessibilityNodeInfo.obtain(node) else findClickableAncestor(node)
            if (clickable != null) {
                CrawlerTraceLogger.log("DRIVE_AUTO_RECOVERY", "Found Drive option in app chooser. Selecting...")
                performVerifiedAccessibilityClick(clickable)
                clickable.recycle()
                for (other in driveNodes) { other.recycle() }
                root.recycle()
                return true
            }
            node.recycle()
        }
        root.recycle()
        return false
    }

    private suspend fun handleStrayDriveDialogIfPresent(root: AccessibilityNodeInfo): Boolean {
        val dismissTexts = listOf("not now", "no thanks", "dismiss", "cancel", "close", "skip", "got it", "later")
        for (txt in dismissTexts) {
            val nodes = root.findAccessibilityNodeInfosByText(txt)
            for (node in nodes) {
                val text = node.text?.toString()?.lowercase(Locale.US) ?: ""
                val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
                if (text == txt || desc == txt || text.contains(txt) || desc.contains(txt)) {
                    val clickable = if (node.isClickable) AccessibilityNodeInfo.obtain(node) else findClickableAncestor(node)
                    if (clickable != null) {
                        CrawlerTraceLogger.log("DRIVE_AUTO_RECOVERY", "Stray prompt detected with \"$txt\". Auto-dismissing...")
                        performVerifiedAccessibilityClick(clickable)
                        clickable.recycle()
                        for (other in nodes) { other.recycle() }
                        return true
                    }
                }
                node.recycle()
            }
        }
        return false
    }

    private suspend fun handleDriveNetworkRetryPrompt(root: AccessibilityNodeInfo): Boolean {
        val retryTexts = listOf("tap to retry", "try again", "retry")
        for (txt in retryTexts) {
            val nodes = root.findAccessibilityNodeInfosByText(txt)
            for (node in nodes) {
                val clickable = if (node.isClickable) AccessibilityNodeInfo.obtain(node) else findClickableAncestor(node)
                if (clickable != null) {
                    CrawlerTraceLogger.log("DRIVE_AUTO_RECOVERY", "Found network retry prompt: '$txt'. Clicking retry...")
                    performVerifiedAccessibilityClick(clickable)
                    clickable.recycle()
                    for (other in nodes) { other.recycle() }
                    return true
                }
                node.recycle()
            }
        }
        return false
    }

    private fun hasDriveSearchBar(root: AccessibilityNodeInfo): Boolean {
        val dm = context.resources.displayMetrics
        val maxSearchBottom = (dm.density * 130).toInt()
        return hasDriveSearchBarInternal(root, maxSearchBottom)
    }

    private fun hasDriveSearchBarInternal(node: AccessibilityNodeInfo, maxBottom: Int): Boolean {
        val bounds = Rect()
        node.getBoundsInScreen(bounds)
        if (bounds.bottom <= maxBottom && bounds.width() > 0) {
            val text = node.text?.toString()?.lowercase(Locale.US) ?: ""
            val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
            val rid = node.viewIdResourceName?.lowercase(Locale.US) ?: ""
            if (text.contains("search in drive") || desc.contains("search in drive") ||
                rid.contains("search_src_text") || rid.contains("search_box") || rid.contains("open_search_bar")
            ) {
                return true
            }
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            if (hasDriveSearchBarInternal(child, maxBottom)) {
                child.recycle()
                return true
            }
            child.recycle()
        }
        return false
    }

    private fun hasVisibleDriveFileList(root: AccessibilityNodeInfo): Boolean {
        val container = findActualScrollableContainer(root)
        if (container != null) {
            container.recycle()
            return true
        }
        val items = scanVisibleDriveItems(root)
        val hasItems = items.isNotEmpty()
        for (item in items) {
            item.node.recycle()
        }
        return hasItems
    }

    private fun isDriveViewerOrEditorScreen(root: AccessibilityNodeInfo): Boolean {
        val sharedTab = findSharedTabNode(root)
        if (sharedTab != null) {
            sharedTab.recycle()
            return false
        }
        val otherSelectedTab = findSelectedNonSharedTab(root)
        if (otherSelectedTab != null) {
            otherSelectedTab.recycle()
            return false // We are viewing a bottom nav tab (Home, Starred, Files), not inside a full-screen file preview
        }

        // If a scrollable Drive file list or search bar is visible, this is a file list / browsing screen, NOT a full-screen viewer
        if (hasVisibleDriveFileList(root) || hasDriveSearchBar(root)) {
            return false
        }

        val texts = mutableListOf<String>()
        collectAllChildDescriptions(root, texts)
        val combined = texts.joinToString(" ").lowercase(Locale.US)

        val isViewer = combined.contains("playback speed") ||
                combined.contains("rewind 10") ||
                combined.contains("forward 10") ||
                (combined.contains("pause") && combined.contains("playback")) ||
                (combined.contains("now playing") && findNavigateUpButton(root) != null) ||
                (combined.contains("audio") && (combined.contains("pause") || combined.contains("play"))) ||
                findAudioPauseButton(root) != null ||
                findAudioPlayerDismissButton(root) != null ||
                combined.contains("page 1 of") ||
                combined.contains("page 1/") ||
                combined.contains("fit to width") ||
                combined.contains("fit to screen") ||
                combined.contains("edit file") ||
                combined.contains("annotation") ||
                (combined.contains("view only") && findNavigateUpButton(root) != null)

        if (isViewer) {
            val triggers = listOf("playback speed", "rewind 10", "forward 10", "pause", "audio", "now playing", "page 1 of", "fit to width", "edit file", "annotation", "view only")
                .filter { combined.contains(it) }
            CrawlerTraceLogger.log("DRIVE_VIEWER_CHECK", "Identified full-screen viewer/editor by triggers: $triggers")
        }

        return isViewer
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

        val sharedTab = findSharedTabNode(root)
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
        val navUp = findNavigateUpButton(root)
        val hasNavUp = navUp != null
        navUp?.recycle()
        return hasNavUp
    }

    private fun isCurrentlyOnSharedScreen(root: AccessibilityNodeInfo): Boolean {
        // 1. If any non-shared bottom tab is selected, we are NOT on Shared
        val otherSelectedTab = findSelectedNonSharedTab(root)
        if (otherSelectedTab != null) {
            otherSelectedTab.recycle()
            return false
        }

        // 2. If bottom bar is visible and Shared tab is found
        val sharedTab = findSharedTabNode(root)
        if (sharedTab != null) {
            sharedTab.recycle()
            return true
        }

        // 3. Check top header / toolbar / title
        val title = findDriveCurrentFolderTitle(root)?.lowercase(Locale.US) ?: ""
        if (title == "shared" || title == "shared with me") {
            return true
        }

        // 4. Check all child descriptions / texts for Shared indicators
        val texts = mutableListOf<String>()
        collectAllChildDescriptions(root, texts)
        val combined = texts.joinToString(" ").lowercase(Locale.US)
        if (combined.contains("shared with me") || combined.contains("search in shared")) {
            return true
        }

        // 5. Check if visible files have "Shared by" indicators and NOT in full-screen viewer
        if (combined.contains("shared by") && !isDriveViewerOrEditorScreen(root)) {
            return true
        }

        return false
    }

    private fun isDisplacedFromSharedTab(root: AccessibilityNodeInfo): Boolean {
        // 1. If any non-shared tab (Home, Starred, Files) is marked as selected, we are DEFINITELY displaced!
        val otherSelectedTab = findSelectedNonSharedTab(root)
        if (otherSelectedTab != null) {
            val desc = otherSelectedTab.contentDescription?.toString() ?: otherSelectedTab.text?.toString() ?: "non-shared tab"
            CrawlerTraceLogger.log("DRIVE_AUTO_RECOVERY", "Displaced tab confirmed active: \"$desc\"")
            otherSelectedTab.recycle()
            return true
        }

        // 2. If we are currently on the Shared screen (via header, bottom tab, or visible shared files)
        if (isCurrentlyOnSharedScreen(root)) {
            return false
        }

        // 3. If neither tab is present and not on shared screen (e.g. inside a folder or displaced viewer), we ARE displaced from Shared root!
        return true
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

    private fun isInDriveNavigationRailOrBar(bounds: Rect, displayMetrics: DisplayMetrics): Boolean {
        val isLandscape = displayMetrics.widthPixels > displayMetrics.heightPixels
        val maxTabWidth = (displayMetrics.widthPixels * 0.35f).toInt()
        val minTabHeight = (displayMetrics.density * 28).toInt()
        val maxTabHeight = (displayMetrics.density * 120).toInt()
        return if (isLandscape) {
            bounds.right <= displayMetrics.widthPixels * 0.25f && bounds.width() in 1..maxTabWidth
        } else {
            bounds.width() in 1..maxTabWidth &&
                    bounds.height() in minTabHeight..maxTabHeight &&
                    bounds.centerY() >= displayMetrics.heightPixels * 0.78f
        }
    }

    private fun findClickableAncestorInNavZone(node: AccessibilityNodeInfo, displayMetrics: DisplayMetrics): AccessibilityNodeInfo? {
        var current: AccessibilityNodeInfo? = node.parent
        while (current != null) {
            val b = Rect()
            current.getBoundsInScreen(b)
            if (isInDriveNavigationRailOrBar(b, displayMetrics) || current.viewIdResourceName?.contains("menu_navigation_shared") == true) {
                if (current.isClickable) {
                    return current
                }
            }
            val parent = current.parent
            current.recycle()
            current = parent
        }
        return null
    }

    /**
     * Checks if the node is inside a scrollable list container (RecyclerView, ListView).
     * Bottom navigation tabs live strictly outside scrollable file list containers.
     */
    private fun isInsideScrollableList(node: AccessibilityNodeInfo): Boolean {
        var current = node.parent
        while (current != null) {
            val cls = current.className?.toString() ?: ""
            if (cls.contains("RecyclerView") || cls.contains("ListView")) {
                current.recycle()
                return true
            }
            val next = current.parent
            current.recycle()
            current = next
        }
        return false
    }

    /**
     * Verifies that the element type represents a genuine navigation tab or navigation rail item.
     * Incorporates element className, roleDescription ("tab"), and navigation container hierarchy
     * to eliminate misidentification of file list rows, filter chips ("Shared by"), and search inputs.
     */
    private fun isNavigationTabElementType(node: AccessibilityNodeInfo): Boolean {
        val className = node.className?.toString() ?: ""
        val roleDesc = node.extras?.getCharSequence("AccessibilityNodeInfo.roleDescription")?.toString()?.lowercase(Locale.US) ?: ""
        val viewId = node.viewIdResourceName?.lowercase(Locale.US) ?: ""

        // Exclude filter chips ("Shared by", "Shared with") and search fields
        if (className.contains("Chip") || className.contains("EditText")) {
            return false
        }

        // Direct tab indicators
        if (roleDesc.contains("tab") ||
            className.contains("BottomNavigationItem") ||
            className.contains("TabItem") ||
            viewId.contains("menu_navigation_") ||
            viewId.contains("bottom_nav") ||
            viewId.contains("navigation_bar_item")
        ) {
            return true
        }

        // Ancestor hierarchy check: verify that an immediate parent is a navigation bar or tab container
        var current = node.parent
        var depth = 0
        val maxAncestorScanDepth = 4
        while (current != null && depth < maxAncestorScanDepth) {
            val parentClass = current.className?.toString() ?: ""
            val parentRole = current.extras?.getCharSequence("AccessibilityNodeInfo.roleDescription")?.toString()?.lowercase(Locale.US) ?: ""
            val parentId = current.viewIdResourceName?.lowercase(Locale.US) ?: ""

            if (parentRole.contains("tab") ||
                parentClass.contains("BottomNavigation") ||
                parentClass.contains("NavigationBar") ||
                parentClass.contains("TabLayout") ||
                parentId.contains("bottom_nav") ||
                parentId.contains("navigation_bar") ||
                parentId.contains("menu_navigation_")
            ) {
                current.recycle()
                return true
            }
            val next = current.parent
            current.recycle()
            current = next
            depth++
        }
        current?.recycle()

        // Fallback for custom FrameLayout / ViewGroup tab containers in Material 3
        return className.contains("FrameLayout") || className.contains("ViewGroup") ||
                className.contains("TextView") || className.contains("ImageView")
    }

    private fun findSelectedNonSharedTab(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val displayMetrics = context.resources.displayMetrics
        return findSelectedNonSharedTabInternal(root, displayMetrics)
    }

    private fun findSelectedNonSharedTabInternal(node: AccessibilityNodeInfo, displayMetrics: DisplayMetrics): AccessibilityNodeInfo? {
        val cls = node.className?.toString() ?: ""
        // Prune scrollable file lists: bottom tabs are never inside RecyclerView/ListView
        if (cls.contains("RecyclerView") || cls.contains("ListView")) {
            return null
        }

        val bounds = Rect()
        node.getBoundsInScreen(bounds)
        val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val text = node.text?.toString()?.lowercase(Locale.US) ?: ""
        val viewId = node.viewIdResourceName?.lowercase(Locale.US) ?: ""

        val isInsideFileList = isInsideScrollableList(node)
        val isTabElement = isNavigationTabElementType(node)
        val inNavZone = isInDriveNavigationRailOrBar(bounds, displayMetrics) ||
                viewId.contains("menu_navigation_home") ||
                viewId.contains("menu_navigation_starred") ||
                viewId.contains("menu_navigation_drives") ||
                viewId.contains("menu_navigation_files")

        val isNonSharedTab = !isInsideFileList && isTabElement && inNavZone && (
                viewId.contains("menu_navigation_home") ||
                viewId.contains("menu_navigation_starred") ||
                viewId.contains("menu_navigation_drives") ||
                viewId.contains("menu_navigation_files") ||
                text.equals("home", ignoreCase = true) ||
                text.equals("starred", ignoreCase = true) ||
                text.equals("files", ignoreCase = true) ||
                text.equals("drives", ignoreCase = true) ||
                desc.equals("home", ignoreCase = true) ||
                desc.equals("starred", ignoreCase = true) ||
                desc.equals("files", ignoreCase = true) ||
                desc.startsWith("home,") ||
                desc.startsWith("starred,") ||
                desc.startsWith("files,")
        )

        if (isNonSharedTab && isNodeMarkedSelected(node)) {
            val clickable = if (node.isClickable) AccessibilityNodeInfo.obtain(node) else findClickableAncestorInNavZone(node, displayMetrics)
            return clickable ?: AccessibilityNodeInfo.obtain(node)
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findSelectedNonSharedTabInternal(child, displayMetrics)
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
        return findSharedTabNodeInternal(root, displayMetrics)
    }

    private fun findSharedTabNodeInternal(node: AccessibilityNodeInfo, displayMetrics: DisplayMetrics): AccessibilityNodeInfo? {
        val cls = node.className?.toString() ?: ""
        // Prune scrollable file lists: bottom tabs are never inside RecyclerView/ListView
        if (cls.contains("RecyclerView") || cls.contains("ListView")) {
            return null
        }

        val bounds = Rect()
        node.getBoundsInScreen(bounds)

        val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val text = node.text?.toString()?.lowercase(Locale.US) ?: ""
        val viewId = node.viewIdResourceName?.lowercase(Locale.US) ?: ""

        val isExcludedSubtitle = desc.contains("shared by") || desc.contains("shared on") ||
                desc.contains("shared yesterday") || desc.contains("shared today") ||
                text.contains("shared by") || text.contains("shared on") ||
                text.contains("shared yesterday") || text.contains("shared today") ||
                desc.endsWith(".pdf") || desc.endsWith(".mp3") || desc.endsWith(".m4a") ||
                text.endsWith(".pdf") || text.endsWith(".mp3") || text.endsWith(".m4a") ||
                desc.contains("worksheet") || text.contains("worksheet")

        val isInsideFileList = isInsideScrollableList(node)
        val isTabElement = isNavigationTabElementType(node)
        val inNavZone = isInDriveNavigationRailOrBar(bounds, displayMetrics) || viewId.contains("menu_navigation_shared")

        if (!isInsideFileList && isTabElement && !isExcludedSubtitle && inNavZone) {
            val isOtherTab = viewId.contains("menu_navigation_home") ||
                    viewId.contains("menu_navigation_starred") ||
                    viewId.contains("menu_navigation_files") ||
                    viewId.contains("menu_navigation_drives") ||
                    text.equals("home", ignoreCase = true) ||
                    text.equals("starred", ignoreCase = true) ||
                    text.equals("files", ignoreCase = true) ||
                    text.equals("drives", ignoreCase = true) ||
                    desc.startsWith("home") ||
                    desc.startsWith("starred") ||
                    desc.startsWith("files")

            val isSharedTab = !isOtherTab && (
                    viewId.contains("shared") ||
                    text.contains("shared", ignoreCase = true) ||
                    desc.contains("shared", ignoreCase = true) ||
                    desc.contains("tab 3 of") || desc.contains("tab, 3 of") || desc.contains("3 of 4")
            )

            if (isSharedTab) {
                val clickable = if (node.isClickable) AccessibilityNodeInfo.obtain(node) else findClickableAncestorInNavZone(node, displayMetrics)
                if (clickable != null) {
                    return clickable
                }
            }
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findSharedTabNodeInternal(child, displayMetrics)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun logDriveNavigationDebugSnapshot(root: AccessibilityNodeInfo) {
        val dm = context.resources.displayMetrics
        val minTop = (dm.heightPixels * 0.70f).toInt()
        val bottomNodes = mutableListOf<String>()
        collectBottomZoneNodes(root, minTop, bottomNodes)
        if (bottomNodes.isNotEmpty()) {
            val sample = bottomNodes.take(10).joinToString(" | ")
            CrawlerTraceLogger.log("DRIVE_TAB_DEBUG", "Bottom zone elements: $sample")
        }
    }

    private fun collectBottomZoneNodes(node: AccessibilityNodeInfo, minTop: Int, result: MutableList<String>) {
        val b = Rect()
        node.getBoundsInScreen(b)
        val text = node.text?.toString()?.trim() ?: ""
        val desc = node.contentDescription?.toString()?.trim() ?: ""
        val id = node.viewIdResourceName ?: ""
        val cls = node.className?.toString()?.substringAfterLast('.') ?: ""
        if (b.top >= minTop && (text.isNotBlank() || desc.isNotBlank() || id.isNotBlank())) {
            val label = listOfNotNull(
                if (text.isNotBlank()) "text='$text'" else null,
                if (desc.isNotBlank()) "desc='$desc'" else null,
                if (id.isNotBlank()) "id='${id.substringAfterLast('/')}'" else null
            ).joinToString(",")
            result.add("$cls($label, bounds=$b)")
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            collectBottomZoneNodes(child, minTop, result)
            child.recycle()
        }
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
            performVerifiedAccessibilityClick(switchToListNode)
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
        performVerifiedAccessibilityClick(sortButtonNode)
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
            performVerifiedAccessibilityClick(dateOptionNode)
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
            performVerifiedAccessibilityClick(reverseSortButton)
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

        val isSendCopy = text.contains("send a copy") || text.contains("send copy") || text.contains("send file") ||
                text.contains("share a copy") || desc.contains("send a copy") || desc.contains("send copy") ||
                desc.contains("send file") || desc.contains("share a copy")

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

    private suspend fun getEnrolledChildNames(): Set<String> {
        val names = mutableSetOf<String>()
        val savedChild = DriveVaultManager.getSavedVaultPrefs(context).third.trim().lowercase(Locale.US)
        if (savedChild.isNotBlank()) {
            names.add(savedChild)
        }
        try {
            val children = database.childProfileDao().getAllChildrenDirect()
            for (child in children) {
                val firstName = child.firstName.trim().lowercase(Locale.US)
                if (firstName.isNotBlank()) {
                    names.add(firstName)
                }
            }
        } catch (_: Exception) {
            // Room DB fallback
        }
        return names
    }

    private suspend fun isTeacherCuratedFolder(folderTitle: String): Boolean {
        val cleanFolder = folderTitle.trim().lowercase(Locale.US)
        if (cleanFolder.isBlank()) return false
        if (CURRICULUM_FOLDER_KEYWORDS.any { cleanFolder.contains(it) }) {
            return true
        }
        return try {
            val allNotices = database.noticeDao().getAllNoticesDirect()
            allNotices.any { notice ->
                val titleLower = notice.title.lowercase(Locale.US)
                val bodyLower = notice.body.lowercase(Locale.US)
                titleLower.contains(cleanFolder) || bodyLower.contains(cleanFolder)
            }
        } catch (_: Exception) {
            false
        }
    }

    private suspend fun harvestDiscoveredFolders(
        folderNames: Set<String>,
        pendingAttachments: List<AttachmentEntity>
    ): Int {
        if (folderNames.isEmpty()) return 0
        CrawlerTraceLogger.log(
            "DRIVE_HARVESTER",
            "Commencing dynamic child-aware folder harvest for ${folderNames.size} folders: $folderNames"
        )
        var totalFromFolders = 0

        // Ensure we start from the top of the Shared feed
        scrollToTopOfSharedList()
        delay(SETTLING_DELAY_MS)

        for (folderTitle in folderNames) {
            if (!serviceScope.isActive || crawlerOverlay?.isAutoScrollingActive() == false) break

            val folderItem = findFolderItemInSharedList(folderTitle)
            if (folderItem != null) {
                val harvested = harvestFolder(folderItem, pendingAttachments)
                folderItem.node.recycle()
                totalFromFolders += harvested
                CrawlerTraceLogger.log(
                    "DRIVE_HARVESTER",
                    "Harvested $harvested items from folder \"$folderTitle\""
                )
                delay(SETTLING_DELAY_MS)
            } else {
                CrawlerTraceLogger.log(
                    "DRIVE_HARVESTER",
                    "Folder \"$folderTitle\" could not be located in Shared tab list."
                )
                scrollToTopOfSharedList()
                delay(SETTLING_DELAY_MS)
            }
        }
        return totalFromFolders
    }

    private suspend fun scrollToTopOfSharedList() {
        CrawlerTraceLogger.log("DRIVE_HARVESTER", "Returning to top of Shared tab...")
        val root = rootInActiveWindowProvider()
        if (root != null) {
            val sharedTab = findSharedTabNode(root)
            if (sharedTab != null) {
                performVerifiedAccessibilityClick(sharedTab)
                sharedTab.recycle()
            }
            root.recycle()
        }
        delay(SETTLING_DELAY_MS)

        var previousTitles = listOf<String>()
        var staticTopCount = 0
        var scrollSteps = 0
        val maxScrollSteps = 3
        while (serviceScope.isActive && crawlerOverlay?.isAutoScrollingActive() == true && scrollSteps < maxScrollSteps) {
            val checkRoot = rootInActiveWindowProvider() ?: break
            val items = scanVisibleDriveItems(checkRoot)
            val currentTitles = items.map { it.title }
            for (i in items) i.node.recycle()
            checkRoot.recycle()

            if (currentTitles.isNotEmpty() && currentTitles == previousTitles) {
                staticTopCount++
                if (staticTopCount >= 2) break
            } else {
                staticTopCount = 0
                if (currentTitles.isNotEmpty()) previousTitles = currentTitles
            }

            var scrolled = false
            val scrollRoot = rootInActiveWindowProvider()
            if (scrollRoot != null) {
                val container = findActualScrollableContainer(scrollRoot)
                if (container != null) {
                    scrolled = container.performAction(AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD)
                    container.recycle()
                }
                scrollRoot.recycle()
            }
            if (!scrolled) {
                val dm = context.resources.displayMetrics
                val swipeX = dm.widthPixels * 0.5f
                val swipeStartY = dm.heightPixels * 0.35f
                val swipeEndY = dm.heightPixels * 0.75f
                dispatchSwipeAction(swipeX, swipeStartY, swipeX, swipeEndY, 450L)
            }
            delay(SETTLING_DELAY_MS)
            scrollSteps++
        }
    }

    private suspend fun findFolderItemInSharedList(folderTitle: String): DriveSharedItem? {
        val dynamicScrollLimit = calculateDynamicScrollPageLimit(10).coerceAtMost(25)
        var page = 0
        var lastVisibleTitles = listOf<String>()
        var consecutiveStaticPages = 0

        while (serviceScope.isActive && crawlerOverlay?.isAutoScrollingActive() == true && page < dynamicScrollLimit) {
            val root = rootInActiveWindowProvider() ?: return null
            val items = scanVisibleDriveItems(root)
            val match = items.find { it.isFolder && it.title.equals(folderTitle, ignoreCase = true) }
            if (match != null) {
                for (item in items) {
                    if (item != match) item.node.recycle()
                }
                root.recycle()
                return match
            }

            val visibleTitles = items.map { it.title }
            if (visibleTitles.isNotEmpty() && visibleTitles == lastVisibleTitles) {
                consecutiveStaticPages++
                if (consecutiveStaticPages >= MAX_CONSECUTIVE_STATIC_PAGES) {
                    CrawlerTraceLogger.log("DRIVE_HARVESTER", "Reached bottom of Shared list while looking for folder \"$folderTitle\".")
                    for (item in items) item.node.recycle()
                    root.recycle()
                    break
                }
            } else {
                consecutiveStaticPages = 0
                if (visibleTitles.isNotEmpty()) lastVisibleTitles = visibleTitles
            }

            for (item in items) item.node.recycle()
            root.recycle()
            page++
            scrollSharedListForward(preserveSelection = false)
            delay(SETTLING_DELAY_MS)
        }
        return null
    }

    private suspend fun isFolderItemRelevant(
        item: DriveSharedItem,
        isFolderTeacherCurated: Boolean,
        pendingAttachments: List<AttachmentEntity>,
        childNames: Set<String>
    ): Boolean {
        if (item.isFolder) return false

        // 1. Direct match with Classroom post attachment
        if (matchDriveItemToPendingAttachment(item, pendingAttachments) != null) {
            return true
        }

        // 2. Child-specific submission (contains enrolled child's name)
        val isChildSpecific = childNames.any { name ->
            name.length >= 3 && item.title.lowercase(Locale.US).contains(name)
        }
        if (isChildSpecific) {
            return true
        }

        // 3. Curriculum / Examination resource file (e.g. Maths_QP.pdf, Science_HalfYearly.pdf)
        if (isCurriculumResourceFile(item.title)) {
            return true
        }

        // 4. In a verified teacher-curated folder (e.g. "Old Question Papers" or "Master Question Upload"):
        // Ingest educational files if they match a curriculum subject or exam keyword
        if (isFolderTeacherCurated) {
            val (base, ext) = splitTitleAndExtension(item.title)
            if (ext.isNotBlank() && KNOWN_FILE_EXTENSIONS.contains(ext.lowercase(Locale.ROOT))) {
                val normBase = normalizeBaseName(base)
                val matchesSubject = CURRICULUM_SUBJECT_KEYWORDS.any { normBase.contains(it) }
                val matchesExam = CURRICULUM_EXAM_KEYWORDS.any { normBase.contains(it) }
                if (matchesSubject || matchesExam) {
                    return true
                }
            }
        }

        return false
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

        performVerifiedAccessibilityClick(folderItem.node)
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
            val folderItemFailureCounts = mutableMapOf<String, Int>()
            val maxScrollPages = calculateDynamicScrollPageLimit(pendingAttachments.size)
            val childNames = getEnrolledChildNames()
            val isFolderTeacherCurated = isTeacherCuratedFolder(folderItem.title)

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
                    if (isFolderItemRelevant(item, isFolderTeacherCurated, pendingAttachments, childNames)) {
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
                        "Harvesting ${batchInFolder.size} files inside folder \"${folderItem.title}\" (page ${page + 1}) via 3-dots menu..."
                    )
                    crawlerOverlay?.updateStatus("Harvesting Folder...", "${batchInFolder.size} files in ${folderItem.title}")

                    val harvestedInFolderBatch = selectAndDispatchBatch(
                        batch = batchInFolder,
                        onItemDispatched = { title ->
                            processedInFolder.add(title)
                            harvestedInFolder++
                        },
                        onItemFailed = { title ->
                            val fails = (folderItemFailureCounts[title] ?: 0) + 1
                            folderItemFailureCounts[title] = fails
                            if (fails >= 2) {
                                CrawlerTraceLogger.log(
                                    "DRIVE_HARVESTER",
                                    "Item \"$title\" failed dispatch $fails times in folder \"${folderItem.title}\". Skipping to prevent loop."
                                )
                                processedInFolder.add(title)
                            }
                        }
                    )
                    if (harvestedInFolderBatch > 0) {
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
                clickedNavigateUp = performVerifiedAccessibilityClick(navUp)
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
        val dm = context.resources.displayMetrics
        val maxHeaderTop = (dm.density * 90).toInt()
        return findNavigateUpButtonInternal(root, dm, maxHeaderTop)
    }

    private fun findNavigateUpButtonInternal(node: AccessibilityNodeInfo, dm: DisplayMetrics, maxHeaderTop: Int): AccessibilityNodeInfo? {
        val desc = node.contentDescription?.toString()?.lowercase(Locale.US) ?: ""
        val text = node.text?.toString()?.lowercase(Locale.US) ?: ""
        val viewId = node.viewIdResourceName?.lowercase(Locale.US) ?: ""

        val bounds = Rect()
        node.getBoundsInScreen(bounds)

        // Strict Guard: NEVER match any node that represents a file, card, or list entry!
        val isFileOrCard = desc.endsWith(".pdf") || desc.endsWith(".mp3") || desc.endsWith(".m4a") ||
                desc.endsWith(".doc") || desc.endsWith(".docx") || desc.endsWith(".xls") || desc.endsWith(".xlsx") ||
                desc.contains("shared by") || desc.contains("shared on") || desc.contains("shared with") ||
                desc.contains("more actions for") || viewId.contains("item_root") || viewId.contains("entry_view") ||
                viewId.contains("card_view") || viewId.contains("recycler") || desc.contains("worksheet")

        if (isFileOrCard) {
            return null
        }

        // Strict navigation semantics: Must explicitly represent Navigate Up, Back, Close, or Collapse
        val hasNavSemantics = (
                desc.contains("navigate up") || desc.contains("go back") ||
                desc == "back" || desc.startsWith("back,") || desc == "close" ||
                desc == "collapse" || text == "close" || text == "back" ||
                viewId.contains("up_button") || viewId.contains("navigate_up") ||
                viewId.contains("action_bar_up") || viewId.contains("toolbar_nav") ||
                (viewId.endsWith(":id/up") && node.isClickable)
        ) && !desc.contains("more actions") && !desc.contains("more options") && !desc.contains("search")

        // Must be in the top toolbar area (strictly above file list) and on the left portion of the display
        if (hasNavSemantics && bounds.top < maxHeaderTop && bounds.left <= dm.widthPixels * 0.35f && bounds.height() > 0) {
            return if (node.isClickable) AccessibilityNodeInfo.obtain(node) else (findClickableAncestor(node) ?: AccessibilityNodeInfo.obtain(node))
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findNavigateUpButtonInternal(child, dm, maxHeaderTop)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun isTopLevelDriveTitle(title: String): Boolean {
        val clean = title.trim().lowercase(Locale.US)
        return clean in setOf(
            "home", "starred", "shared", "shared with me", "files", "google drive", "search", "search in drive", "my drive", "computers", "drive"
        )
    }

    private fun findDriveCurrentFolderTitle(root: AccessibilityNodeInfo): String? {
        val viewId = root.viewIdResourceName?.lowercase(Locale.US) ?: ""
        val text = root.text?.toString()?.trim() ?: ""
        val isNonFolderTitle = isTopLevelDriveTitle(text)
        if (!isNonFolderTitle && (viewId.contains("title") || viewId.contains("action_bar") || viewId.contains("toolbar")) && text.isNotBlank()) {
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
        if (!isNonFolderTitle && bounds.top < maxTop && bounds.left in minLeft..maxLeft && bounds.height() in minH..maxH && text.isNotBlank() && !text.contains("Search", ignoreCase = true)) {
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

        val childNames = getEnrolledChildNames()
        val isFolderTeacherCurated = isTeacherCuratedFolder(folderTitle)
        val batch = mutableListOf<DriveSharedItem>()
        for (fileItem in filesInside) {
            if (isFolderItemRelevant(fileItem, isFolderTeacherCurated, pendingAttachments, childNames)) {
                batch.add(fileItem)
                if (batch.size >= MAX_BATCH_SELECTION_SIZE) break
            }
        }

        if (batch.isNotEmpty()) {
            CrawlerTraceLogger.log("DRIVE_HARVESTER", "Dispatching batch of ${batch.size} files from folder \"$folderTitle\" via 3-dots menu...")
            val count = selectAndDispatchBatch(
                batch = batch,
                onItemDispatched = { harvested++ }
            )
            if (count > 0) {
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
