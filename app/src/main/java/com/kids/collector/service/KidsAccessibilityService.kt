package com.kids.collector.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.accessibilityservice.GestureDescription
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
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
import com.kids.collector.domain.model.StreamItemStatus
import com.kids.collector.domain.model.StreamManifest
import com.kids.collector.domain.model.StreamManifestItem
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

    companion object {
        private const val TAG = "KidsAccessibility"
        private const val POST_RETURN_PACING_DELAY_MILLIS = 500L
        private const val INTER_POST_SETTLING_DELAY_MILLIS = 600L
        private const val ANR_RESOLUTION_WAIT_DELAY_MILLIS = 1_000L

        fun matchesAttachmentChipText(targetFileName: String, candidateText: String): Boolean {
            val cleanTarget = targetFileName.replace("...", "").trim()
            val targetBase = cleanTarget.substringBeforeLast('.').lowercase()

            val candidateCleaned = candidateText
                .replace(Regex("""\b\d+(\.\d+)?\s*(kb|mb|gb|b|bytes?|pages?|words?|items?|attachments?)\b""", RegexOption.IGNORE_CASE), "")
                .replace(Regex("""\b\d{1,2}:\d{2}(\s*[ap]m)?\b""", RegexOption.IGNORE_CASE), "")
                .lowercase()

            val wordRegex = Regex("""[a-z]{3,}""")
            val targetWords = wordRegex.findAll(targetBase).map { it.value }.toSet()
            val candidateWords = wordRegex.findAll(candidateCleaned).map { it.value }.toSet()

            val numRegex = Regex("""\b\d+\b""")
            val targetNums = numRegex.findAll(targetBase).map { it.value }.toSet()
            val candidateNums = numRegex.findAll(candidateCleaned).map { it.value }.toSet()

            val romanRegex = Regex("""\b(i|ii|iii|iv|v|vi|vii|viii|ix|x)\b""")
            val targetRoman = romanRegex.findAll(targetBase).map { it.value }.toSet()
            val candidateRoman = romanRegex.findAll(candidateCleaned).map { it.value }.toSet()

            // Strict numeric concordance
            if (targetNums.isNotEmpty() && !targetNums.all { candidateNums.contains(it) }) {
                return false
            }
            if (candidateNums.isNotEmpty() && targetNums.isNotEmpty() && !candidateNums.all { targetNums.contains(it) }) {
                return false
            }

            // Roman numerals concordance
            if (targetRoman.isNotEmpty() && !targetRoman.all { candidateRoman.contains(it) }) {
                return false
            }
            if (candidateRoman.isNotEmpty() && targetRoman.isNotEmpty() && !candidateRoman.all { targetRoman.contains(it) }) {
                return false
            }

            // Polar antonym checks
            if ("addition" in targetWords && "subtraction" in candidateWords) return false
            if ("subtraction" in targetWords && "addition" in candidateWords) return false
            if ("multiplying" in targetWords && "dividing" in candidateWords) return false
            if ("dividing" in targetWords && "multiplying" in candidateWords) return false
            if ("multiplication" in targetWords && "division" in candidateWords) return false
            if ("division" in targetWords && "multiplication" in candidateWords) return false

            // Answer key / solution distinction
            val isTargetAnswerKey = "answer" in targetWords || targetBase.contains("answerkey") || targetBase.contains("solution")
            val isCandidateAnswerKey = "answer" in candidateWords || candidateCleaned.contains("answerkey") || candidateCleaned.contains("solution")
            if (isTargetAnswerKey != isCandidateAnswerKey) {
                return false
            }

            // Exact substring containment
            val targetTrimmed = targetBase.trim()
            val candTrimmed = candidateCleaned.trim()
            if (targetTrimmed.isNotBlank() && (candTrimmed.contains(targetTrimmed) || targetTrimmed.contains(candTrimmed))) {
                return true
            }

            // Majority token overlap (>= 70% of meaningful words)
            if (targetWords.isEmpty()) return false
            val matchedWords = targetWords.intersect(candidateWords)
            val minRequired = (targetWords.size * 0.70).toInt().coerceAtLeast(1)
            return matchedWords.size >= minRequired
        }
        private const val APP_EXIT_DEBOUNCE_MILLIS = 3_000L
        private const val APP_RELAUNCH_RECOVERY_DELAY_MILLIS = 2_000L
        private const val MIN_COURSE_CARD_WIDTH_PX = 300
        private const val MIN_COURSE_CARD_HEIGHT_PX = 150
        private const val SAFE_CARD_TAP_HORIZONTAL_RATIO = 0.35f
        private const val STREAM_TAB_FALLBACK_HORIZONTAL_RATIO = 0.16f
        private const val STREAM_TAB_FALLBACK_VERTICAL_RATIO = 0.94f
        private const val BOTTOM_NAV_BAR_MARGIN_PX = 320
        const val ACTION_START_CRAWL = "com.kids.collector.ACTION_START_CRAWL"
        const val ACTION_STOP_CRAWL = "com.kids.collector.ACTION_STOP_CRAWL"
        const val ACTION_SHOW_OVERLAY = "com.kids.collector.ACTION_SHOW_OVERLAY"

        private val AUTHORIZED_SCHOOL_PACKAGES = setOf(
            "com.google.android.apps.classroom",
            "com.entab.campuscare",
            "com.toddleapp",
            "com.edunext.student"
        )
        private val ATTACHMENT_HEADER_REGEX = Regex("""^attachments?(\s*[\(:\d].*)?$""", RegexOption.IGNORE_CASE)

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

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val classifier = ContentClassifier()
    private val deduplicationEngine = DeduplicationEngine()

    private var crawlerOverlay: FloatingCrawlerOverlay? = null
    private var lastActiveSchoolPackage: String? = null
    private var exitDebounceJob: Job? = null

    private var crawlerJob: Job? = null
    private val visitedPostFingerprints = ConcurrentHashMap.newKeySet<String>()
    private val capturedAttachmentNames = ConcurrentHashMap.newKeySet<String>()
    @Volatile var isDispatchingCrawlerGesture: Boolean = false

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

    private val crawlerControlReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                ACTION_START_CRAWL -> {
                    CrawlerTraceLogger.log("CONTROL", "Received ACTION_START_CRAWL via broadcast")
                    getOrCreateOverlay().startAutoScroll()
                }
                ACTION_STOP_CRAWL -> {
                    CrawlerTraceLogger.log("CONTROL", "Received ACTION_STOP_CRAWL via broadcast")
                    getOrCreateOverlay().stopAutoScroll(isUserInitiated = true, reason = "Broadcast command")
                }
                ACTION_SHOW_OVERLAY -> {
                    CrawlerTraceLogger.log("CONTROL", "Received ACTION_SHOW_OVERLAY via broadcast")
                    getOrCreateOverlay().show()
                }
            }
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.i(TAG, "KidsAccessibilityService connected")

        val controlFilter = IntentFilter().apply {
            addAction(ACTION_START_CRAWL)
            addAction(ACTION_STOP_CRAWL)
            addAction(ACTION_SHOW_OVERLAY)
        }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(crawlerControlReceiver, controlFilter, Context.RECEIVER_EXPORTED)
        } else {
            registerReceiver(crawlerControlReceiver, controlFilter)
        }

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

        // 0. Drop our own app events so we never self-trigger or interfere with our own overlay
        if (packageName == applicationContext.packageName) {
            return
        }

        // 0b. Detect and auto-resolve system ANR ("App isn't responding") dialogs
        if (packageName == "android" || packageName.startsWith("android.")) {
            val sourceNode = event.source
            if (sourceNode != null) {
                val isHandled = handleSystemAnrDialogIfPresent(sourceNode)
                sourceNode.recycle()
                if (isHandled) return
            } else {
                val activeNode = rootInActiveWindow
                if (activeNode != null) {
                    val isHandled = handleSystemAnrDialogIfPresent(activeNode)
                    activeNode.recycle()
                    if (isHandled) return
                }
            }
        }

        // 1. If in an authorized school app, maintain/restore active session
        if (isAuthorizedSchoolApp(packageName)) {
            exitDebounceJob?.cancel()
            exitDebounceJob = null
            lastActiveSchoolPackage = packageName

            if (crawlerOverlay == null || crawlerOverlay?.isShowing() != true) {
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

    private fun relaunchSchoolApp() {
        try {
            val targetPackageName = lastActiveSchoolPackage ?: "com.google.android.apps.classroom"
            val launchIntent = packageManager.getLaunchIntentForPackage(targetPackageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            }
            if (launchIntent != null) {
                startActivity(launchIntent)
                CrawlerTraceLogger.log("DEEP_CRAWLER", "Re-launched school app ($targetPackageName) to foreground")
            }
        } catch (e: Exception) {
            CrawlerTraceLogger.log("DEEP_CRAWLER", "Failed to relaunch school app: ${e.message}")
        }
    }

    private fun handleSystemAnrDialogIfPresent(node: AccessibilityNodeInfo?): Boolean {
        if (node == null) return false
        try {
            val texts = mutableListOf<String>()
            collectQuickText(node, texts)
            val combined = texts.joinToString(" ").lowercase()
            val isAnr = (combined.contains("isn't responding") ||
                    combined.contains("not responding") ||
                    combined.contains("stopped responding") ||
                    combined.contains("has stopped")) &&
                    (combined.contains("wait") || combined.contains("close app") || combined.contains("ok"))

            if (isAnr) {
                CrawlerTraceLogger.log("ANR_RECOVERY", "System ANR dialog detected: \"${combined.take(80)}\"")
                // Search for "Wait" button
                val waitNodes = node.findAccessibilityNodeInfosByText("Wait")
                var waitButton: AccessibilityNodeInfo? = null
                for (waitCandidate in waitNodes) {
                    val clickable = if (waitCandidate.isClickable) AccessibilityNodeInfo.obtain(waitCandidate) else findClickableAncestor(waitCandidate)
                    if (clickable != null) {
                        waitButton = clickable
                        break
                    }
                }
                for (waitCandidate in waitNodes) {
                    waitCandidate.recycle()
                }

                if (waitButton == null) {
                    val byId = node.findAccessibilityNodeInfosByViewId("android:id/aerr_wait")
                    for (waitCandidate in byId) {
                        val clickable = if (waitCandidate.isClickable) AccessibilityNodeInfo.obtain(waitCandidate) else findClickableAncestor(waitCandidate)
                        if (clickable != null) {
                            waitButton = clickable
                            break
                        }
                    }
                    for (waitCandidate in byId) {
                        waitCandidate.recycle()
                    }
                }

                if (waitButton != null) {
                    CrawlerTraceLogger.log("ANR_RECOVERY", "Autonomous ANR resolution: Clicking 'Wait' button to allow app to recover")
                    val clicked = waitButton.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    if (!clicked) {
                        val bounds = Rect()
                        waitButton.getBoundsInScreen(bounds)
                        serviceScope.launch {
                            dispatchTap(bounds.centerX().toFloat(), bounds.centerY().toFloat())
                        }
                    }
                    waitButton.recycle()
                    return true
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error checking ANR dialog: ${e.message}")
        }
        return false
    }

    private fun checkAndDismissSystemAnr(): Boolean {
        var isDismissed = false
        try {
            val activeRoot = rootInActiveWindow
            if (activeRoot != null) {
                if (handleSystemAnrDialogIfPresent(activeRoot)) {
                    isDismissed = true
                }
                activeRoot.recycle()
            }
            if (!isDismissed) {
                for (window in windows) {
                    val windowRoot = window.root ?: continue
                    if (handleSystemAnrDialogIfPresent(windowRoot)) {
                        isDismissed = true
                        windowRoot.recycle()
                        break
                    }
                    windowRoot.recycle()
                }
            }
        } catch (e: Exception) {
            // Ignore window inspection issues
        }
        return isDismissed
    }

    private fun handleAppExitEvent(foreignPackage: String) {
        if (exitDebounceJob?.isActive == true) return

        exitDebounceJob = serviceScope.launch {
            // Immediate graceful halt if user explicitly pressed Home or switched to Home Launcher
            if (isHomeScreenOrLauncher(foreignPackage)) {
                if (checkAndDismissSystemAnr()) {
                    CrawlerTraceLogger.log("DEEP_CRAWLER", "Dismissed system ANR before home exit check. Relaunching school app...")
                    relaunchSchoolApp()
                    return@launch
                }
                CrawlerTraceLogger.log("DEEP_CRAWLER", "User navigated to Home/Launcher. Halting crawler and dismissing overlay.")
                stopDeepCrawl()
                crawlerOverlay?.stopAutoScroll(isUserInitiated = false, reason = "User navigated to Home")
                crawlerOverlay?.dismissAndRemove()
                triggerDriveSync(applicationContext)
                return@launch
            }

            delay(APP_EXIT_DEBOUNCE_MILLIS)
            val currentPackageName = rootInActiveWindow?.packageName?.toString() ?: ""
            if (isAuthorizedSchoolApp(currentPackageName)) {
                CrawlerTraceLogger.log("DEEP_CRAWLER", "Cancelled exit event - already back inside $currentPackageName")
                return@launch
            }

            // Inspect active windows list with proper node recycling
            try {
                val hasSchoolWindow = windows.any { window ->
                    val windowRootNode = window.root
                    try {
                        windowRootNode?.packageName?.toString()?.let { isAuthorizedSchoolApp(it) } == true
                    } finally {
                        windowRootNode?.recycle()
                    }
                }
                if (hasSchoolWindow) {
                    CrawlerTraceLogger.log("DEEP_CRAWLER", "Cancelled exit event - authorized school app window detected")
                    return@launch
                }
            } catch (e: Exception) {
                // Ignore window query failure
            }

            if (crawlerOverlay?.isAutoScrollingActive() == true) {
                // If auto-crawl is running, self-heal and bring Classroom back before giving up!
                CrawlerTraceLogger.log(
                    "DEEP_CRAWLER",
                    "Displaced to \"$foreignPackage\" during active crawl. Attempting autonomous recovery back to Classroom..."
                )
                relaunchSchoolApp()
                delay(APP_RELAUNCH_RECOVERY_DELAY_MILLIS)
                val recoveredPackageName = rootInActiveWindow?.packageName?.toString() ?: ""
                if (isAuthorizedSchoolApp(recoveredPackageName)) {
                    CrawlerTraceLogger.log("DEEP_CRAWLER", "Autonomous recovery succeeded! Back in $recoveredPackageName")
                    return@launch
                }
            }

            // Only confirm exit if currentPackageName is genuinely a non-empty, non-school, non-transient package
            // NEVER dismiss when currentPackageName is blank (momentary transition or null root) or transient!
            val isGenuineNonSchoolApp = currentPackageName.isNotBlank() &&
                    !isAuthorizedSchoolApp(currentPackageName) &&
                    !isTransientOrSystemPackage(currentPackageName)

            if (isGenuineNonSchoolApp) {
                CrawlerTraceLogger.log(
                    "DEEP_CRAWLER",
                    "Confirmed exit from school app to \"$foreignPackage\" (active: \"$currentPackageName\"). Auto-stopping capture, closing overlay, and triggering Drive sync."
                )
                stopDeepCrawl()
                crawlerOverlay?.stopAutoScroll(isUserInitiated = false, reason = "Exited school app to $foreignPackage")
                crawlerOverlay?.dismissAndRemove()
                triggerDriveSync(applicationContext)
            }
        }
    }

    private fun getOrCreateOverlay(): FloatingCrawlerOverlay {
        return crawlerOverlay ?: FloatingCrawlerOverlay(
            service = this,
            onStartAutoCapture = {
                startDeepCrawl()
            },
            onStopAutoCapture = {
                stopDeepCrawl()
            }
        ).also { crawlerOverlay = it }
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

    private suspend fun ensureAtStreamTop() {
        CrawlerTraceLogger.log("STREAM_SURVEY", "Checking stream top alignment before survey...")
        var steps = 0
        val maxSteps = 15
        while (serviceScope.isActive && steps < maxSteps) {
            val root = rootInActiveWindow
            if (root == null) {
                delay(300)
                steps++
                continue
            }
            if (!isStreamOrClassworkView(root)) {
                root.recycle()
                delay(400)
                steps++
                continue
            }
            val title = extractCourseTitle(root)
            root.recycle()
            if (title != null) {
                CrawlerTraceLogger.log("STREAM_SURVEY", "Confirmed at stream top (header banner: \"$title\"). Ready for survey.")
                return
            }
            CrawlerTraceLogger.log("STREAM_SURVEY", "Course header banner not visible. Swiping backward to rewind to stream top (step ${steps + 1}/$maxSteps)...")
            crawlerOverlay?.updateStatus("Rewinding to Top...", "Aligning stream for survey (${steps + 1}/$maxSteps)")
            stepScrollStream(isScrollForward = false)
            delay(500)
            steps++
        }
    }

    private suspend fun runDeepCrawlLoop() {
        val manifest = StreamManifest()
        val surveyStartTime = System.currentTimeMillis()
        val db = KidsDatabase.getInstance(applicationContext)
        val child = db.childProfileDao().getAllChildren().firstOrNull()?.firstOrNull()
        val activeCourseGrade = child?.grade
        var activeCourseTitle: String? = null

        // =========================================================================
        // PASS 1: PRE-FLIGHT STREAM SURVEY (Discover Start, End, and Total Count)
        // =========================================================================
        ensureAtStreamTop()
        crawlerOverlay?.updateStatus("Status: Surveying Stream...", "Indexing stream notices...")
        CrawlerTraceLogger.log("STREAM_SURVEY", "Beginning Pass 1: Pre-flight stream survey...")

        var surveyZeroCount = 0
        var lastVisibleFingerprints = listOf<String>()
        var identicalScreenCount = 0
        var isFirstCardLogged = false

        while (serviceScope.isActive && crawlerOverlay?.isAutoScrollingActive() == true) {
            val root = rootInActiveWindow
            if (root == null) {
                delay(300)
                continue
            }

            val currentPkg = root.packageName?.toString() ?: ""
            val isClassroom = isAuthorizedSchoolApp(currentPkg)
            val isTransient = isTransientOrSystemPackage(currentPkg)

            if (!isClassroom && !isTransient) {
                crawlerOverlay?.updateStatus("Status: Paused (External App)", currentPkg)
                root.recycle()
                delay(1000)
                continue
            }

            if (isTransient) {
                CrawlerTraceLogger.log("VIEWER_RECOVERY", "Active window in survey is transient component ($currentPkg). Returning to Classroom...")
                performReturnToStream(root)
                root.recycle()
                delay(600)
                continue
            }

            // AUTO-RECOVERY: If displaced to People or Classwork tab, re-select Stream tab!
            if (isPeopleOrClassworkTabActive(root)) {
                CrawlerTraceLogger.log("STREAM_RECOVERY", "Displaced to People/Classwork tab in survey. Switching back to Stream...")
                switchToStreamTab(root)
                root.recycle()
                delay(1000)
                continue
            }

            // AUTO-RECOVERY: If displaced 1 screen behind stream to Classes List, re-enter course stream!
            if (isClassesListScreen(root)) {
                recoverToStreamFromClassesList(root, activeCourseTitle, activeCourseGrade)
                root.recycle()
                delay(1200)
                continue
            }

            // Lock active course title from stream header
            if (activeCourseTitle == null && isStreamOrClassworkView(root)) {
                activeCourseTitle = extractCourseTitle(root)
                if (activeCourseTitle != null) {
                    CrawlerTraceLogger.log("DEEP_CRAWLER", "Locked active course title from stream: \"$activeCourseTitle\"")
                }
            }

            // Survey all visible cards on current screen
            val currentVisible = getVisibleCardFingerprints(root)
            val newItemsCount = surveyVisibleCards(root, manifest)
            root.recycle()

            if (!isFirstCardLogged && manifest.startItemTitle != null) {
                CrawlerTraceLogger.logSurveyStart(manifest.startItemTitle ?: "Top Card")
                isFirstCardLogged = true
            }

            if (newItemsCount > 0) {
                surveyZeroCount = 0
                identicalScreenCount = 0
                crawlerOverlay?.updateStatus(
                    "Surveying (${manifest.totalCount} found)...",
                    "Discovered ${manifest.totalCount} notices (${manifest.completedCount} already synced)"
                )
            } else {
                surveyZeroCount++
                if (currentVisible.isNotEmpty() && currentVisible == lastVisibleFingerprints) {
                    identicalScreenCount++
                } else {
                    identicalScreenCount = 0
                }
            }
            lastVisibleFingerprints = currentVisible

            // Smart bottom detection:
            // Only conclude bottom if the screen is PHYSICALLY STATIC across multiple scrolls,
            // with a network pagination grace delay. Never terminate while the viewport is actively moving!
            if (identicalScreenCount >= 5) {
                val surveyDuration = System.currentTimeMillis() - surveyStartTime
                CrawlerTraceLogger.logSurveyEnd(
                    manifest.totalCount,
                    manifest.endItemTitle ?: "Bottom Post",
                    surveyDuration
                )
                break
            }

            // Kinetic scroll forward to reveal next batch
            var scrollDone = false
            crawlerOverlay?.performScroll { scrollDone = true }
            waitForCondition(timeoutMs = 1500, pollIntervalMs = 150) { scrollDone }
            // If the screen appeared static on this swipe, give Classroom 1,200ms to fetch older posts from network
            val postScrollDelay = if (identicalScreenCount > 0) 1200L else if (surveyZeroCount > 0) 700L else 450L
            delay(postScrollDelay)
        }

        if (!serviceScope.isActive || crawlerOverlay?.isAutoScrollingActive() != true) {
            CrawlerTraceLogger.log("STREAM_SURVEY", "Survey aborted by user or service.")
            return
        }

        val total = manifest.totalCount
        val startTitle = manifest.startItemTitle ?: "First Post"
        val endTitle = manifest.endItemTitle ?: "Last Post"

        if (total == 0 || manifest.pendingCount == 0) {
            crawlerOverlay?.updateStatus("✓ Stream Up to Date", "All $total notices already captured")
            delay(2000)
            stopDeepCrawl()
            triggerDriveSync(applicationContext)
            return
        }

        // =========================================================================
        // PASS 2: MANIFEST-DRIVEN REVERSE INGESTION (Bottom-to-Top)
        // We are already at the bottom of the stream after Pass 1!
        // We capture from oldest to newest directly upwards, eliminating 37+ redundant rewind swipes.
        // =========================================================================
        crawlerOverlay?.updateStatus("Status: Capturing Notices...", "Ingesting from bottom upwards ($total notices)")
        CrawlerTraceLogger.log("STREAM_SURVEY", "Beginning Pass 2: Manifest-driven reverse deep ingestion (Bottom-to-Top)...")
        var lastRecoveryMinIndex: Int? = null
        var consecutiveStaticRecoveryCount = 0
        var lastTargetIndex = -1
        var consecutiveTargetAttempts = 0
        var consecutiveTransientCount = 0
        val recentScrollDirections = ArrayDeque<Boolean>(6) // true = forward, false = backward

        while (serviceScope.isActive && crawlerOverlay?.isAutoScrollingActive() == true) {
            val nextItem = manifest.getNextPendingItemReverse()
            if (nextItem == null) {
                CrawlerTraceLogger.log("STREAM_SURVEY", "All manifest items processed! Manifest finished.")
                break
            }

            val root = rootInActiveWindow
            if (root == null) {
                delay(300)
                continue
            }

            val currentPkg = root.packageName?.toString() ?: ""
            val isClassroom = isAuthorizedSchoolApp(currentPkg)
            val isTransient = isTransientOrSystemPackage(currentPkg)

            if (!isClassroom && !isTransient) {
                crawlerOverlay?.updateStatus("Status: Paused (External App)", currentPkg)
                root.recycle()
                delay(1000)
                continue
            }

            if (isTransient) {
                consecutiveTransientCount++
                CrawlerTraceLogger.log("VIEWER_RECOVERY", "Active window in Pass 2 is viewer or system component ($currentPkg, count=$consecutiveTransientCount). Returning to Classroom...")
                crawlerOverlay?.updateStatus("Processing File...", currentPkg)
                if (consecutiveTransientCount >= 3) {
                    CrawlerTraceLogger.log("VIEWER_RECOVERY", "Persistent system component ($currentPkg). Relaunching school app to regain stream focus.")
                    relaunchSchoolApp()
                    consecutiveTransientCount = 0
                    root.recycle()
                    delay(1200)
                    continue
                }
                performReturnToStream(root)
                root.recycle()
                delay(600)
                continue
            }
            consecutiveTransientCount = 0

            // AUTO-RECOVERY: If displaced to People or Classwork tab, re-select Stream tab!
            if (isPeopleOrClassworkTabActive(root)) {
                CrawlerTraceLogger.log("STREAM_RECOVERY", "Displaced to People/Classwork tab in crawl. Switching back to Stream...")
                switchToStreamTab(root)
                root.recycle()
                delay(1000)
                continue
            }

            // AUTO-RECOVERY: If displaced 1 screen behind stream to Classes List, autonomously re-enter the course stream!
            if (isClassesListScreen(root)) {
                recoverToStreamFromClassesList(root, activeCourseTitle, activeCourseGrade)
                root.recycle()
                delay(1200)
                continue
            }

            // AUTO-RECOVERY: If trapped in comments dialog or unclosed detail view, return to stream
            // Strictly check !isStreamOrClassworkView(root) so stream announcements are never misclassified!
            if (!isStreamOrClassworkView(root)) {
                if (isCommentsOnlyScreen(root) || isPostDetailView(root)) {
                    CrawlerTraceLogger.log("CRAWLER_RECOVERY", "Active window is comments dialog or unclosed detail view. Returning to stream...")
                    performReturnToStream(root)
                    root.recycle()
                    delay(700)
                    continue
                }

                // If in Classroom but neither stream, comments, detail, nor classes list:
                if (currentPkg == "com.google.android.apps.classroom") {
                    val navigateUpNode = findNavigateUpButton(root)
                    if (navigateUpNode != null) {
                        navigateUpNode.recycle()
                        CrawlerTraceLogger.log("STREAM_RECOVERY", "Active window has Navigate Up button. Returning to stream...")
                        performReturnToStream(root)
                    } else {
                        // Might be in transition between fragments! Wait briefly and re-inspect before sending blind back gesture
                        CrawlerTraceLogger.log("STREAM_RECOVERY", "Classroom window in transition. Waiting for UI to settle...")
                        root.recycle()
                        delay(600)
                        continue
                    }
                } else {
                    // If external non-transient window, perform guarded return
                    CrawlerTraceLogger.log("STREAM_RECOVERY", "Active window is not stream view ($currentPkg). Returning to stream...")
                    performReturnToStream(root)
                }
                root.recycle()
                delay(700)
                continue
            }

            // Locked active course title from stream view
            if (activeCourseTitle == null) {
                activeCourseTitle = extractCourseTitle(root)
                if (activeCourseTitle != null) {
                    CrawlerTraceLogger.log("DEEP_CRAWLER", "Locked active course title from stream: \"$activeCourseTitle\"")
                }
            }

            // Look for target card on screen: first check opportunistic visible pending, then targetItem
            val visiblePendingCard = findAnyPendingCardOnScreen(root, manifest)
            val targetItem = visiblePendingCard?.item ?: nextItem
            val unvisitedCard = visiblePendingCard?.card ?: findCardForTarget(root, targetItem)
            root.recycle()

            val isMaterialOrAssignment = targetItem.title.contains("material", ignoreCase = true) ||
                    targetItem.title.contains("assignment", ignoreCase = true) ||
                    targetItem.title.contains("question", ignoreCase = true) ||
                    targetItem.title.contains("quiz", ignoreCase = true) ||
                    targetItem.previewText.contains("new material", ignoreCase = true) ||
                    targetItem.previewText.contains("new assignment", ignoreCase = true) ||
                    targetItem.previewText.contains("new question", ignoreCase = true)

            if (unvisitedCard != null) {
                // Target card found! Reset recovery tracking
                lastRecoveryMinIndex = null
                consecutiveStaticRecoveryCount = 0
                recentScrollDirections.clear()

                val title = unvisitedCard.title
                val fingerprint = unvisitedCard.fingerprint
                val bounds = unvisitedCard.bounds
                val clickableNode = unvisitedCard.clickableNode
                val fullText = unvisitedCard.fullText

                val cardIsMaterial = isMaterialOrAssignment ||
                        title.contains("material", ignoreCase = true) ||
                        title.contains("assignment", ignoreCase = true) ||
                        title.contains("question", ignoreCase = true) ||
                        fullText.contains("new material", ignoreCase = true) ||
                        fullText.contains("new assignment", ignoreCase = true) ||
                        fullText.contains("new question", ignoreCase = true)

                if (!cardIsMaterial) {
                    // ANNOUNCEMENT / CIRCULAR: In Google Classroom, announcements have no separate detail screen.
                    // The announcement body is directly on the stream card. Tapping the card either does nothing or opens comments.
                    CrawlerTraceLogger.log(
                        "STREAM_SURVEY",
                        "Notice #${targetItem.index} (\"$title\") is a stream announcement (no detail screen). Ingesting directly from stream card."
                    )
                    ingestNoticeDirect(title, fullText, fingerprint)
                    manifest.markItemCompleted(targetItem.index)
                    manifest.markCompleted(fingerprint)
                    manifest.markCompleted(targetItem.fingerprint)
                    visitedPostFingerprints.add(fingerprint)
                    visitedPostFingerprints.add(targetItem.fingerprint)
                    crawlerOverlay?.incrementNoticeCount()
                    crawlerOverlay?.updateStatus(
                        "Captured (${targetItem.index}/$total - ${manifest.progressPercent}%)...",
                        title
                    )
                    clickableNode.recycle()
                    delay(300)
                    continue
                }

                // If this material post is already fully captured and ALL its attachments are physically verified in Drive, skip detail view!
                if (isNoticeFullyCapturedInDb(title)) {
                    CrawlerTraceLogger.log(
                        "STREAM_SURVEY",
                        "Notice #${targetItem.index} (\"$title\") already has all attachments synced to Drive. Skipping detail view."
                    )
                    manifest.markItemCompleted(targetItem.index)
                    manifest.markCompleted(fingerprint)
                    manifest.markCompleted(targetItem.fingerprint)
                    visitedPostFingerprints.add(fingerprint)
                    visitedPostFingerprints.add(targetItem.fingerprint)
                    crawlerOverlay?.incrementNoticeCount()
                    crawlerOverlay?.updateStatus(
                        "Captured (${targetItem.index}/$total - ${manifest.progressPercent}%)...",
                        title
                    )
                    clickableNode.recycle()
                    delay(200)
                    continue
                }

                val displayMetrics = resources.displayMetrics
                val minTop = 140
                val maxBottom = displayMetrics.heightPixels - BOTTOM_NAV_BAR_MARGIN_PX

                // Guard against tapping cards that are cut off at the bottom near the bottom navigation bar
                if (bounds.top > maxBottom - 100) {
                    CrawlerTraceLogger.log(
                        "DEEP_CRAWLER",
                        "Card #${targetItem.index} partially cut off at bottom (top=${bounds.top}, maxBottom=$maxBottom). Nudging forward into full view..."
                    )
                    stepScrollStream(isScrollForward = true)
                    clickableNode.recycle()
                    continue
                }

                crawlerOverlay?.updateStatus(
                    "Capturing (${targetItem.index}/$total - ${manifest.progressPercent}%)...",
                    title
                )

                // Dispatch physical tap safely: target the title node itself, or top safe third of the card
                // NEVER tap the bottom where comments or "Add class comment" are located!
                val titleNode = findTitleNodeInCard(clickableNode, title)
                val (safeTapX, safeTapY) = if (titleNode != null) {
                    val titleRect = Rect()
                    titleNode.getBoundsInScreen(titleRect)
                    titleNode.recycle()
                    val tapX = titleRect.centerX().toFloat().coerceIn(bounds.left.toFloat() + 20f, bounds.right.toFloat() - 20f)
                    val tapY = titleRect.centerY().toFloat().coerceIn(minTop + 20f, maxBottom - 20f)
                    Pair(tapX, tapY)
                } else {
                    val safeY = (bounds.top + 50).coerceIn(minTop + 20, maxBottom - 20).toFloat()
                    Pair(bounds.centerX().toFloat(), safeY)
                }

                val nodeDesc = clickableNode.contentDescription?.toString()?.lowercase() ?: ""
                val nodeText = clickableNode.text?.toString()?.lowercase() ?: ""
                val isCommentNode = nodeDesc.contains("comment") || nodeText.contains("comment")

                val openStart = System.currentTimeMillis()
                val clicked = if (!isCommentNode && clickableNode.isClickable) {
                    clickableNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                } else {
                    false
                }
                if (!clicked) {
                    dispatchTap(safeTapX, safeTapY)
                }
                clickableNode.recycle()

                // Check if detail view opened with 2500ms timeout & retry
                var enteredDetail = waitForCondition(timeoutMs = 1200, pollIntervalMs = 150) {
                    val active = rootInActiveWindow ?: return@waitForCondition false
                    val isDetail = isPostDetailView(active)
                    active.recycle()
                    isDetail
                }

                if (!enteredDetail) {
                    CrawlerTraceLogger.log(
                        "DEEP_CRAWLER",
                        "Detail transition pending after 1200ms for #${targetItem.index}. Retrying physical tap at ($safeTapX, $safeTapY)"
                    )
                    dispatchTap(safeTapX, safeTapY)
                    enteredDetail = waitForCondition(timeoutMs = 1500, pollIntervalMs = 150) {
                        val active = rootInActiveWindow ?: return@waitForCondition false
                        val isDetail = isPostDetailView(active)
                        active.recycle()
                        isDetail
                    }
                }
                val openLatency = System.currentTimeMillis() - openStart
                CrawlerTraceLogger.logPostOpen(targetItem.index, total, title, openLatency, enteredDetail)

                if (!enteredDetail) {
                    // Check if comments dialog opened by accident and dismiss it
                    val activeAfter = rootInActiveWindow
                    if (activeAfter != null) {
                        if (isCommentsOnlyScreen(activeAfter)) {
                            CrawlerTraceLogger.log("DEEP_CRAWLER", "Comments dialog detected instead of post detail. Dismissing comments dialog...")
                            performReturnToStream(activeAfter)
                            delay(800) // Allow dismissal transition to complete before re-evaluating window
                        }
                        activeAfter.recycle()
                    }

                    val attempts = manifest.incrementAttempt(fingerprint)

                    if (attempts < 2) {
                        CrawlerTraceLogger.log(
                            "DEEP_CRAWLER",
                            "Notice #${targetItem.index} (\"$title\") did not open detail view. Retrying (Attempt $attempts/2)..."
                        )
                        ingestNoticeDirect(title, fullText, fingerprint)
                    } else {
                        CrawlerTraceLogger.log(
                            "DEEP_CRAWLER",
                            "Card did not open detail view (Attempts: $attempts). Ingesting directly from stream: \"$title\""
                        )
                        ingestNoticeDirect(title, fullText, fingerprint)
                        manifest.markItemCompleted(targetItem.index)
                        manifest.markCompleted(fingerprint)
                        manifest.markCompleted(targetItem.fingerprint)
                        visitedPostFingerprints.add(fingerprint)
                        visitedPostFingerprints.add(targetItem.fingerprint)
                        crawlerOverlay?.incrementNoticeCount()
                    }
                    delay(300)
                    continue
                }

                // In detail view: Extract details and download attachments
                crawlerOverlay?.updateStatus("Reading Detail (${targetItem.index}/$total)...", title)
                val detailRoot = rootInActiveWindow
                var savedAttCount = 0
                if (detailRoot != null) {
                    try {
                        savedAttCount = processPostDetailAndDownload(detailRoot, title)
                    } catch (e: Exception) {
                        CrawlerTraceLogger.log("DEEP_CRAWLER", "Error extracting detail: ${e.message}")
                    } finally {
                        detailRoot.recycle()
                    }
                }

                // Return to stream
                crawlerOverlay?.updateStatus("Returning to Stream...")
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

                waitForCondition(timeoutMs = 2000, pollIntervalMs = 200) {
                    val active = rootInActiveWindow ?: return@waitForCondition false
                    val isStream = isStreamOrClassworkView(active)
                    active.recycle()
                    isStream
                }

                manifest.markItemCompleted(targetItem.index, savedAttCount)
                manifest.markCompleted(fingerprint, savedAttCount)
                manifest.markCompleted(targetItem.fingerprint, savedAttCount)
                visitedPostFingerprints.add(fingerprint)
                visitedPostFingerprints.add(targetItem.fingerprint)
                crawlerOverlay?.incrementNoticeCount()
                CrawlerTraceLogger.logPostCompleted(targetItem.index, total, title, savedAttCount)
                delay(INTER_POST_SETTLING_DELAY_MILLIS)
            } else {
                // =====================================================================
                // AUTO-RECOVERY: Target card is not on screen! Determine displacement
                // =====================================================================
                val checkRoot = rootInActiveWindow
                if (checkRoot != null) {
                    val isAtStreamTop = isStreamOrClassworkView(checkRoot) && extractCourseTitle(checkRoot) != null
                    val visibleItems = getVisibleManifestItems(checkRoot, manifest)
                    checkRoot.recycle()

                    val visibleIndices = visibleItems.map { it.index }
                    val minVisibleIndex = visibleIndices.minOrNull()
                    val maxVisibleIndex = visibleIndices.maxOrNull()

                    // Bounded target check: If target is bounded by visible cards, it IS on screen!
                    if (minVisibleIndex != null && maxVisibleIndex != null && manifest.isTargetBounded(nextItem.index, visibleIndices)) {
                        val boundedAttempts = manifest.incrementAttempt(nextItem.fingerprint)
                        CrawlerTraceLogger.log(
                            "AUTO_RECOVERY",
                            "Target #${nextItem.index} is bounded within visible screen range [${minVisibleIndex}..${maxVisibleIndex}]! (Bounded attempt $boundedAttempts/3)"
                        )

                        if (boundedAttempts >= 3) {
                            CrawlerTraceLogger.log(
                                "AUTO_RECOVERY",
                                "Target #${nextItem.index} (\"${nextItem.title}\") failed detail transition after $boundedAttempts attempts. Ingesting directly from stream and advancing."
                            )
                            ingestNoticeDirect(nextItem.title, nextItem.previewText, nextItem.fingerprint)
                            manifest.markItemCompleted(nextItem.index)
                            manifest.markCompleted(nextItem.fingerprint)
                            visitedPostFingerprints.add(nextItem.fingerprint)
                            crawlerOverlay?.incrementNoticeCount()
                            delay(400)
                            continue
                        }

                        val recoveryRoot = rootInActiveWindow
                        val candidateCard = recoveryRoot?.let { rRoot ->
                            try {
                                findBestCandidateCardOnScreen(rRoot, nextItem)
                            } finally {
                                rRoot.recycle()
                            }
                        }
                        if (candidateCard != null) {
                            val displayMetrics = resources.displayMetrics
                            val minTop = 140
                            val maxBottom = displayMetrics.heightPixels - BOTTOM_NAV_BAR_MARGIN_PX
                            val candSafeTapY = (candidateCard.bounds.top + 50).coerceIn(minTop + 20, maxBottom - 20)
                            val clicked = candidateCard.clickableNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                            if (!clicked) {
                                dispatchTap(candidateCard.bounds.centerX().toFloat(), candSafeTapY.toFloat())
                            }
                            candidateCard.clickableNode.recycle()
                            delay(800)
                            continue
                        }
                    }

                    // Adaptive swiping & oscillation detection
                    // In Pass 2 reverse crawl, we are traversing bottom-to-top towards post #1 (top of stream).
                    // If at the stream top banner, target can NEVER be backward (upward).
                    // If target index is greater than maxVisibleIndex, target is further down (forward).
                    // Otherwise, target is towards the top (backward).
                    val targetAhead = when {
                        isAtStreamTop -> true
                        maxVisibleIndex != null && nextItem.index > maxVisibleIndex -> true
                        else -> false // Default in bottom-to-top pass: scroll backward towards the top!
                    }
                    val distance = if (minVisibleIndex != null) Math.abs(nextItem.index - minVisibleIndex) else 5

                    recentScrollDirections.addLast(targetAhead)
                    if (recentScrollDirections.size > 6) recentScrollDirections.removeFirst()

                    val isOscillating = recentScrollDirections.size >= 4 &&
                            recentScrollDirections.zipWithNext().all { (a, b) -> a != b }

                    if (isOscillating) {
                        CrawlerTraceLogger.log(
                            "AUTO_RECOVERY",
                            "Oscillation detected around target #${nextItem.index}! Engaging micro-nudge."
                        )
                        manifest.incrementAttempt(nextItem.fingerprint)
                    }

                    // Viewport static tracking
                    val isStatic = (minVisibleIndex != null && minVisibleIndex == lastRecoveryMinIndex)
                    lastRecoveryMinIndex = minVisibleIndex

                    if (isStatic) {
                        consecutiveStaticRecoveryCount++
                    } else {
                        consecutiveStaticRecoveryCount = 0
                    }

                    val attempts = if (isStatic && consecutiveStaticRecoveryCount >= 3) {
                        manifest.incrementAttempt(nextItem.fingerprint)
                    } else {
                        manifest.findByFingerprint(nextItem.fingerprint)?.attemptCount ?: 0
                    }

                    if (attempts >= 4) {
                        CrawlerTraceLogger.log(
                            "AUTO_RECOVERY",
                            "Skipping post #${nextItem.index} (\"${nextItem.title}\") after recovery attempts exceeded ($attempts attempts)."
                        )
                        manifest.markItemCompleted(nextItem.index)
                        manifest.markSkipped(nextItem.fingerprint)
                        visitedPostFingerprints.add(nextItem.fingerprint)
                        lastRecoveryMinIndex = null
                        consecutiveStaticRecoveryCount = 0
                        recentScrollDirections.clear()
                        continue
                    }

                    if (!targetAhead) {
                        CrawlerTraceLogger.log(
                            "AUTO_RECOVERY",
                            "Displaced: visible items [${minVisibleIndex}..${maxVisibleIndex}] are after target #${nextItem.index}. Stepping backward..."
                        )
                        crawlerOverlay?.updateStatus(
                            "Seeking Notice...",
                            "#${nextItem.index}/$total: ${nextItem.title.take(30)}"
                        )
                        stepScrollStream(isScrollForward = false)
                    } else {
                        val fastForwarding = nextItem.index > 1 && (manifest.completedCount >= (nextItem.index - 1))
                        val statusTitle = if (fastForwarding) "Fast-Forwarding Synced Notices..." else "Navigating to Post..."
                        val statusDetail = if (fastForwarding) "Seeking #${nextItem.index}/$total (${manifest.completedCount} already synced)" else "Seeking post #${nextItem.index}/$total"

                        CrawlerTraceLogger.log(
                            "AUTO_RECOVERY",
                            "Target #${nextItem.index} is ahead. Stepping forward (fastForwarding=$fastForwarding)..."
                        )
                        crawlerOverlay?.updateStatus(statusTitle, statusDetail)
                        stepScrollStream(isScrollForward = true)
                    }
                } else {
                    delay(500)
                }
            }
        }

        // Completion
        val finalCompleted = manifest.completedCount
        val totalFiles = crawlerOverlay?.getCapturedAttachmentsCount() ?: capturedAttachmentNames.size
        CrawlerTraceLogger.log("DEEP_CRAWLER", "Auto-capture complete: $finalCompleted/$total notices processed, $totalFiles files saved.")
        crawlerOverlay?.showCompletion(finalCompleted, totalFiles) {
            stopDeepCrawl()
            triggerDriveSync(applicationContext)
        }
    }

    private suspend fun processPostDetailAndDownload(detailRoot: AccessibilityNodeInfo, fallbackTitle: String): Int {
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

        // 4. Discover and register attachments
        val allAttachments = mutableListOf<ExtractedAttachmentDetail>()
        val initialAtts = extractDetailAttachments(detailRoot)
        allAttachments.addAll(initialAtts)

        // Detail View Scrolling: scroll down within detail view to discover any below-the-fold attachments
        var detailScrolls = 0
        while (detailScrolls < 2) {
            var scrollDone = false
            crawlerOverlay?.performDetailScrollDown { scrollDone = true }
            waitForCondition(timeoutMs = 1200, pollIntervalMs = 150) { scrollDone }
            delay(400)

            val scrolledRoot = rootInActiveWindow
            if (scrolledRoot != null) {
                val scrolledAtts = extractDetailAttachments(scrolledRoot)
                for (att in scrolledAtts) {
                    if (allAttachments.none { it.fileName == att.fileName }) {
                        allAttachments.add(att)
                    } else {
                        att.downloadNode?.recycle()
                        att.clickableChip?.recycle()
                    }
                }
                scrolledRoot.recycle()
            }
            detailScrolls++
        }

        CrawlerTraceLogger.log(
            "DEEP_CRAWLER",
            "Discovered ${allAttachments.size} attachments for \"$title\""
        )

        for (att in allAttachments) {
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

        val pendingTargetFileNames = allAttachments.map { it.fileName }
        for (att in allAttachments) {
            att.downloadNode?.recycle()
            att.clickableChip?.recycle()
        }

        // Autonomous Attachment Ingestion: Systematically re-query fresh nodes for each attachment chip,
        // bring onto screen using ACTION_SHOW_ON_SCREEN, open the viewer, and trigger Share to "K.I.D.S. Vault"
        for ((index, fileName) in pendingTargetFileNames.withIndex()) {
            val fileHash = "${noticeId}_${fileName}".hashCode().toString()
            val existingAttachment = db.attachmentDao().findByFileHash(fileHash)
            if (existingAttachment != null && existingAttachment.syncStatus == SyncStatus.SYNCED.name &&
                !existingAttachment.driveFileId.isNullOrBlank() && !existingAttachment.driveFileId.startsWith("virtual_")) {
                continue // Already physically downloaded and synced
            }

            // Fresh window inspection: Locate the chip in the currently active detail window
            val freshRoot = rootInActiveWindow ?: continue
            var targetChip: AccessibilityNodeInfo? = findAttachmentChipByFileName(freshRoot, fileName)

            // Dynamic Boundary-Aware Detail Search:
            // Replaces arbitrary hardcoded swipe counts with physical boundary detection.
            // Scrolls dynamically until target chip is found or container reaches the physical limit!
            if (targetChip == null) {
                // Phase 1: Downward boundary-aware search
                var previousBottomFingerprint = ""
                while (targetChip == null && serviceScope.isActive && crawlerOverlay?.isAutoScrollingActive() == true) {
                    val currentRoot = rootInActiveWindow ?: break
                    val currentFingerprint = computeViewportContentFingerprint(currentRoot)
                    val container = findScrollableNode(currentRoot)

                    val canScrollMore = if (container != null) {
                        val scrolled = container.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD)
                        container.recycle()
                        delay(450)
                        scrolled
                    } else {
                        var scrollDone = false
                        crawlerOverlay?.performDetailScrollDown { scrollDone = true }
                        waitForCondition(timeoutMs = 1500, pollIntervalMs = 150) { scrollDone }
                        delay(400) // Essential settling delay for RecyclerView item binding
                        true
                    }
                    currentRoot.recycle()

                    val afterScrollRoot = rootInActiveWindow ?: break
                    val newFingerprint = computeViewportContentFingerprint(afterScrollRoot)
                    targetChip = findAttachmentChipByFileName(afterScrollRoot, fileName)
                    afterScrollRoot.recycle()

                    // Dynamic Bottom Boundary Detection:
                    // If container reported cannot scroll forward, or viewport contents remained completely static
                    val hasHitBottomBoundary = !canScrollMore || (newFingerprint == currentFingerprint) || (newFingerprint == previousBottomFingerprint)
                    previousBottomFingerprint = currentFingerprint

                    if (targetChip != null || hasHitBottomBoundary) {
                        break
                    }
                }

                // Phase 2: If chip wasn't below, dynamically rewind upward until chip is found or physical top reached
                if (targetChip == null) {
                    var previousTopFingerprint = ""
                    while (targetChip == null && serviceScope.isActive && crawlerOverlay?.isAutoScrollingActive() == true) {
                        val currentRoot = rootInActiveWindow ?: break
                        val currentFingerprint = computeViewportContentFingerprint(currentRoot)
                        val container = findScrollableNode(currentRoot)

                        val canScrollMore = if (container != null) {
                            val scrolled = container.performAction(AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD)
                            container.recycle()
                            delay(450)
                            scrolled
                        } else {
                            var rewindDone = false
                            crawlerOverlay?.performDetailScrollUp { rewindDone = true }
                            waitForCondition(timeoutMs = 1500, pollIntervalMs = 150) { rewindDone }
                            delay(400)
                            true
                        }
                        currentRoot.recycle()

                        val afterRewindRoot = rootInActiveWindow ?: break
                        val newFingerprint = computeViewportContentFingerprint(afterRewindRoot)
                        targetChip = findAttachmentChipByFileName(afterRewindRoot, fileName)
                        afterRewindRoot.recycle()

                        // Dynamic Top Boundary Detection:
                        // If container reported cannot scroll backward, or viewport contents remained completely static
                        val hasHitTopBoundary = !canScrollMore || (newFingerprint == currentFingerprint) || (newFingerprint == previousTopFingerprint)
                        previousTopFingerprint = currentFingerprint

                        if (targetChip != null || hasHitTopBoundary) {
                            break
                        }
                    }
                }
            }
            freshRoot.recycle()

            if (targetChip != null) {
                crawlerOverlay?.updateStatus("Sharing (${index + 1}/${pendingTargetFileNames.size})...", fileName)
                CrawlerTraceLogger.log("ATTACHMENT_AUTO_TAP", "Targeting fresh attachment chip for \"$fileName\"")

                // Bring to screen and focus with zero guessing!
                targetChip.performAction(AccessibilityNodeInfo.AccessibilityAction.ACTION_SHOW_ON_SCREEN.id)
                targetChip.performAction(AccessibilityNodeInfo.ACTION_ACCESSIBILITY_FOCUS)
                delay(200)

                val clicked = targetChip.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                if (!clicked) {
                    val chipBounds = Rect()
                    targetChip.getBoundsInScreen(chipBounds)
                    dispatchTap(chipBounds.centerX().toFloat(), chipBounds.centerY().toFloat())
                }
                targetChip.recycle()
                delay(800)

                // Automate Share to "K.I.D.S. Vault" inside viewer and return to detail view
                automateViewerShareOrDownload(fileName)

                // Check if file was captured by ShareTargetActivity
                val updatedAtt = db.attachmentDao().findByFileHash(fileHash)
                if (updatedAtt != null && updatedAtt.localUri.isNotBlank() && File(updatedAtt.localUri).exists()) {
                    if (capturedAttachmentNames.add(fileName)) {
                        crawlerOverlay?.incrementAttachmentCount()
                    }
                }
                // Ensure detail view UI tree is firmly restored before querying next attachment
                waitForCondition(timeoutMs = 3000, pollIntervalMs = 250) {
                    val checkRoot = rootInActiveWindow ?: return@waitForCondition false
                    val isDetail = isPostDetailView(checkRoot)
                    checkRoot.recycle()
                    isDetail
                }
                delay(400)
            } else {
                CrawlerTraceLogger.log("ATTACHMENT_AUTO_TAP", "Could not locate chip for \"$fileName\" in detail view")
            }
        }

        if (allAttachments.isNotEmpty()) {
            delay(1000) // Allow file staging to finalize
            val stagedCount = com.kids.collector.data.drive.DownloadFolderObserver.scanLocalAttachments(applicationContext)
            repeat(stagedCount) {
                crawlerOverlay?.incrementAttachmentCount()
            }
        }
        return capturedAttachmentNames.size
    }

    /**
     * Autonomously triggers Share or Download from document viewer/preview screen,
     * selects "K.I.D.S. Vault" from the system share sheet if opened,
     * and returns back to Classroom detail view.
     */
    private suspend fun automateViewerShareOrDownload(fileName: String) {
        // Dynamically scale timeout: PowerPoint (.pptx), images (.jpg/.png), and heavy documents require extra conversion time
        val isHeavyDocument = fileName.contains(Regex("""\.(pptx|docx|xlsx|jpg|png|zip)""", RegexOption.IGNORE_CASE))
        val viewerTimeoutMs = if (isHeavyDocument) 7000L else 5500L

        // Wait up to viewerTimeoutMs for viewer or preview to open
        val openedViewer = waitForCondition(timeoutMs = viewerTimeoutMs, pollIntervalMs = 200) {
            val root = rootInActiveWindow ?: return@waitForCondition false
            val isNotDetail = !isPostDetailView(root) && !isStreamOrClassworkView(root)
            root.recycle()
            isNotDetail
        }

        if (!openedViewer) {
            CrawlerTraceLogger.log("ATTACHMENT_SHARE", "No external/internal viewer opened for \"$fileName\" within ${viewerTimeoutMs}ms")
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

                        var popupShare: AccessibilityNodeInfo? = null
                        val popupRoot = rootInActiveWindow
                        if (popupRoot != null) {
                            popupShare = findShareButton(popupRoot) ?: findDownloadButtonNode(popupRoot)
                            popupRoot.recycle()
                        }
                        if (popupShare == null) {
                            for (w in windows) {
                                val r = w.root ?: continue
                                popupShare = findShareButton(r) ?: findDownloadButtonNode(r)
                                if (popupShare != null) {
                                    r.recycle()
                                    break
                                }
                                r.recycle()
                            }
                        }
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

        // Step C: Guarded return to detail view
        delay(600)
        var returnAttempts = 0
        while (returnAttempts < 4) {
            val cur = rootInActiveWindow
            if (cur == null) {
                delay(300)
                returnAttempts++
                continue
            }
            if (isPostDetailView(cur) || isStreamOrClassworkView(cur)) {
                cur.recycle()
                break
            }
            CrawlerTraceLogger.log(
                "ATTACHMENT_SHARE",
                "Closing document viewer to return to post detail view (attempt ${returnAttempts + 1})..."
            )
            performReturnToStream(cur)
            cur.recycle()
            delay(1000)
            returnAttempts++
        }
    }

    private fun findShareButton(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val desc = node.contentDescription?.toString()?.lowercase() ?: ""
        val text = node.text?.toString()?.lowercase() ?: ""
        val viewId = node.viewIdResourceName?.lowercase() ?: ""

        val isShare = (desc == "share" || desc.contains("share") || desc.contains("send a copy") || desc.contains("send file") || desc.contains("export")) ||
                (text == "share" || text.contains("send a copy") || text.contains("send file") || text.contains("export")) ||
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
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
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
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun isKidsVaultLabel(raw: String?): Boolean {
        if (raw.isNullOrBlank()) return false
        val clean = raw.lowercase().replace(".", "").replace(" ", "").replace("_", "")
        return clean.contains("kidsvault") ||
                clean == "kids" ||
                clean.startsWith("kids") ||
                clean.contains("kidscollector") ||
                clean.contains("kidscollect") ||
                clean.contains("collector")
    }

    private fun findKidsShareTarget(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val pkg = node.packageName?.toString()?.lowercase() ?: ""
        // CRITICAL: Reject our own app's nodes to prevent tapping FloatingCrawlerOverlay!
        if (pkg == applicationContext.packageName.lowercase()) {
            return null
        }

        val text = node.text?.toString()
        val desc = node.contentDescription?.toString()

        val isTarget = isKidsVaultLabel(text) || isKidsVaultLabel(desc)

        if (isTarget) {
            // Walk up to find the clickable app tile or container in the share sheet
            var current: AccessibilityNodeInfo? = node
            while (current != null) {
                if (current.isClickable) {
                    val result = AccessibilityNodeInfo.obtain(current)
                    if (current != node) current.recycle()
                    return result
                }
                val parentNode = current.parent
                if (current != node) current.recycle()
                current = parentNode
            }
            return AccessibilityNodeInfo.obtain(node)
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findKidsShareTarget(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private fun findKidsShareTargetInAllWindows(): AccessibilityNodeInfo? {
        val allRoots = mutableListOf<AccessibilityNodeInfo>()
        val collectorPackageName = applicationContext.packageName.lowercase()
        try {
            // 1. Inspect all accessibility windows (handles system dialogs & bottom sheets)
            val currentWindows = windows
            for (window in currentWindows) {
                val windowRoot = window.root ?: continue
                val windowPackage = windowRoot.packageName?.toString()?.lowercase() ?: ""
                if (windowPackage == collectorPackageName) {
                    windowRoot.recycle()
                    continue
                }
                allRoots.add(windowRoot)
            }
            // 2. Also inspect active window if not our own app
            rootInActiveWindow?.let { activeRoot ->
                val activePackage = activeRoot.packageName?.toString()?.lowercase() ?: ""
                if (activePackage != collectorPackageName && allRoots.none { it == activeRoot }) {
                    allRoots.add(activeRoot)
                } else {
                    activeRoot.recycle()
                }
            }

            for (root in allRoots) {
                val target = findKidsShareTarget(root)
                if (target != null) {
                    return target
                }
            }
        } catch (e: Exception) {
            CrawlerTraceLogger.log("ATTACHMENT_SHARE", "Error scanning windows for share target: ${e.message}")
        } finally {
            for (root in allRoots) {
                root.recycle()
            }
        }
        return null
    }

    private fun computeChooserContentFingerprint(): String {
        val textList = mutableListOf<String>()
        val collectorPkg = applicationContext.packageName.lowercase()
        try {
            for (window in windows) {
                val windowRoot = window.root ?: continue
                val pkg = windowRoot.packageName?.toString()?.lowercase().orEmpty()
                if (pkg != collectorPkg) {
                    collectQuickText(windowRoot, textList)
                }
                windowRoot.recycle()
            }
            rootInActiveWindow?.let { activeRoot ->
                val pkg = activeRoot.packageName?.toString()?.lowercase().orEmpty()
                if (pkg != collectorPkg) {
                    collectQuickText(activeRoot, textList)
                }
                activeRoot.recycle()
            }
        } catch (_: Exception) {}
        return textList.joinToString("|").hashCode().toString()
    }

    private suspend fun selectKidsInSystemChooser() {
        var target: AccessibilityNodeInfo? = null

        // Wait up to 3500ms for system chooser to appear and locate K.I.D.S. Vault dynamically
        waitForCondition(timeoutMs = 3500, pollIntervalMs = 200) {
            target = findKidsShareTargetInAllWindows()
            target != null
        }

        // If not found in immediate view, scroll the sharesheet horizontally, then dynamically vertically until found or boundary reached
        if (target == null) {
            CrawlerTraceLogger.log("ATTACHMENT_SHARE", "K.I.D.S. Vault not visible in initial chooser view. Dispatching scroll search...")
            val displayMetrics = resources.displayMetrics
            val screenWidth = displayMetrics.widthPixels
            val screenHeight = displayMetrics.heightPixels

            // Step 1: Horizontal swipe across apps row (bottom 15-20% of screen)
            dispatchSwipe(screenWidth * 0.85f, screenHeight * 0.85f, screenWidth * 0.15f, screenHeight * 0.85f, 300)
            delay(500)
            target = findKidsShareTargetInAllWindows()

            // Step 2: Dynamic vertical scroll to expand and traverse chooser apps
            var previousChooserFingerprint = ""
            var unchangedFingerprintCount = 0
            while (target == null && serviceScope.isActive && crawlerOverlay?.isAutoScrollingActive() == true) {
                val currentChooserFingerprint = computeChooserContentFingerprint()

                // Drag upward from 75% to 30% height to expand bottom sheet and reveal app grid
                dispatchSwipe(screenWidth * 0.50f, screenHeight * 0.75f, screenWidth * 0.50f, screenHeight * 0.30f, 400)
                delay(600)
                target = findKidsShareTargetInAllWindows()
                if (target != null) break

                val newChooserFingerprint = computeChooserContentFingerprint()

                // Boundary Detection: Require 2 consecutive unchanged samples before concluding end of chooser
                if (newChooserFingerprint == currentChooserFingerprint || newChooserFingerprint == previousChooserFingerprint) {
                    unchangedFingerprintCount++
                    if (unchangedFingerprintCount >= 2) {
                        break
                    }
                } else {
                    unchangedFingerprintCount = 0
                }
                previousChooserFingerprint = currentChooserFingerprint
            }
        }

        target?.let { shareTargetNode ->
            val bounds = Rect()
            shareTargetNode.getBoundsInScreen(bounds)
            CrawlerTraceLogger.log(
                "ATTACHMENT_SHARE",
                "Dynamically located \"K.I.D.S. Vault\" in share sheet at bounds ($bounds). Selecting it."
            )
            val isClickDispatched = shareTargetNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            if (!isClickDispatched) {
                dispatchTap(bounds.centerX().toFloat(), bounds.centerY().toFloat())
            }
            shareTargetNode.recycle()
            delay(800) // Allow ShareTargetActivity to process intent and stage file
        } ?: run {
            CrawlerTraceLogger.log("ATTACHMENT_SHARE", "K.I.D.S. Vault could not be found in system share sheet after scrolling. Dismissing share sheet.")
            performGlobalAction(GLOBAL_ACTION_BACK)
            delay(800)
        }
    }

    private suspend fun performReturnToStream(root: AccessibilityNodeInfo) {
        if (isStreamOrClassworkView(root)) {
            CrawlerTraceLogger.log("DEEP_CRAWLER", "Already on Stream/Classwork view. Skipping return action.")
            return
        }
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
            val pkg = root.packageName?.toString() ?: ""
            if (!isAuthorizedSchoolApp(pkg) && !isTransientOrSystemPackage(pkg)) {
                CrawlerTraceLogger.log("DEEP_CRAWLER", "Outside school app ($pkg), restoring Classroom instead of dispatching BACK")
                relaunchSchoolApp()
                return
            }
            CrawlerTraceLogger.log("DEEP_CRAWLER", "Dispatching GLOBAL_ACTION_BACK to return to stream")
            performGlobalAction(GLOBAL_ACTION_BACK)
        }
        delay(POST_RETURN_PACING_DELAY_MILLIS)
    }

    private suspend fun stepScrollStream(isScrollForward: Boolean) {
        val root = rootInActiveWindow
        if (root != null) {
            val isAtTop = isStreamOrClassworkView(root) && extractCourseTitle(root) != null
            if (!isScrollForward && isAtTop) {
                CrawlerTraceLogger.log("SCROLLER", "Already at top of stream (course header visible). Suppressing backward scroll to prevent pull-to-refresh.")
                root.recycle()
                return
            }
            val container = findScrollableNode(root)
            var scrolledNatively = false
            if (container != null) {
                val action = if (isScrollForward) AccessibilityNodeInfo.ACTION_SCROLL_FORWARD else AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
                scrolledNatively = container.performAction(action)
                container.recycle()
            }
            root.recycle()
            if (scrolledNatively) {
                delay(400)
                return
            }
        }
        if (!isScrollForward) {
            val checkAgain = rootInActiveWindow
            if (checkAgain != null) {
                val isAtTop = isStreamOrClassworkView(checkAgain) && extractCourseTitle(checkAgain) != null
                checkAgain.recycle()
                if (isAtTop) {
                    CrawlerTraceLogger.log("SCROLLER", "Top of stream confirmed before gesture. Suppressing backward drag.")
                    return
                }
            }
        }
        // Controlled zero-fling drag fallback (moves ~1 card height with zero kinetic inertia)
        var scrollDone = false
        crawlerOverlay?.performControlledDrag(isScrollForward) { scrollDone = true }
        waitForCondition(timeoutMs = 1500, pollIntervalMs = 150) { scrollDone }
    }

    private fun findAttachmentChipByFileName(rootNode: AccessibilityNodeInfo, fileName: String): AccessibilityNodeInfo? {
        val cleanFileName = fileName.replace("...", "").trim()
        val withoutParentheses = cleanFileName.replace(Regex("""\([^)]*\)"""), "").trim()
        val baseFileName = cleanFileName.substringBeforeLast('.')
        val baseWithoutParens = withoutParentheses.substringBeforeLast('.')

        val searchQueries = linkedSetOf(
            cleanFileName,
            withoutParentheses,
            baseWithoutParens,
            baseFileName
        ).filter { it.length >= 3 }

        for (searchQuery in searchQueries) {
            val matchedNodes = rootNode.findAccessibilityNodeInfosByText(searchQuery)
            for (matchNode in matchedNodes) {
                val clickableNode = when {
                    matchNode.isClickable -> AccessibilityNodeInfo.obtain(matchNode)
                    else -> findClickableAncestor(matchNode)
                }

                if (clickableNode != null) {
                    val texts = mutableListOf<String>()
                    collectQuickText(clickableNode, texts)
                    val combinedText = texts.joinToString(" ")
                    if (matchesAttachmentChipText(fileName, combinedText)) {
                        for (nodeToRecycle in matchedNodes) {
                            nodeToRecycle.recycle()
                        }
                        return clickableNode
                    }
                    clickableNode.recycle()
                }
            }
            for (nodeToRecycle in matchedNodes) {
                nodeToRecycle.recycle()
            }
        }

        // Recursive tree inspection fallback with strict numeric and token matching
        return findAttachmentChipRecursively(rootNode, fileName)
    }

    private fun findAttachmentChipRecursively(node: AccessibilityNodeInfo, targetFileName: String): AccessibilityNodeInfo? {
        val nodeText = node.text?.toString()?.trim() ?: ""
        val nodeDesc = node.contentDescription?.toString()?.trim() ?: ""
        val immediateText = "$nodeText $nodeDesc".trim()

        if (immediateText.length >= 3 && matchesAttachmentChipText(targetFileName, immediateText)) {
            val clickable = if (node.isClickable) AccessibilityNodeInfo.obtain(node) else findClickableAncestor(node)
            if (clickable != null) {
                return clickable
            }
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findAttachmentChipRecursively(child, targetFileName)
            child.recycle()
            if (found != null) return found
        }
        return null
    }

    private suspend fun dispatchTap(x: Float, y: Float): Boolean {
        isDispatchingCrawlerGesture = true
        val path = Path().apply {
            moveTo(x, y)
        }
        val stroke = GestureDescription.StrokeDescription(path, 0, 50)
        val gesture = GestureDescription.Builder().addStroke(stroke).build()
        var completed = false
        val dispatched = try {
            dispatchGesture(gesture, object : AccessibilityService.GestureResultCallback() {
                override fun onCompleted(gestureDescription: GestureDescription?) {
                    completed = true
                }

                override fun onCancelled(gestureDescription: GestureDescription?) {
                    completed = false
                }
            }, null)
        } finally {
            // Keep flag active slightly past gesture completion to swallow any synthetic touch events
        }
        delay(150)
        isDispatchingCrawlerGesture = false
        return dispatched && completed
    }

    private suspend fun dispatchSwipe(startX: Float, startY: Float, endX: Float, endY: Float, durationMs: Long = 300): Boolean {
        isDispatchingCrawlerGesture = true
        val path = Path().apply {
            moveTo(startX, startY)
            lineTo(endX, endY)
        }
        val stroke = GestureDescription.StrokeDescription(path, 0, durationMs)
        val gesture = GestureDescription.Builder().addStroke(stroke).build()
        var completed = false
        val dispatched = try {
            dispatchGesture(gesture, object : AccessibilityService.GestureResultCallback() {
                override fun onCompleted(gestureDescription: GestureDescription?) {
                    completed = true
                }

                override fun onCancelled(gestureDescription: GestureDescription?) {
                    completed = false
                }
            }, null)
        } finally {
        }
        delay(150)
        isDispatchingCrawlerGesture = false
        return dispatched && completed
    }

    private data class UnvisitedCard(
        val title: String,
        val fullText: String,
        val fingerprint: String,
        val clickableNode: AccessibilityNodeInfo,
        val bounds: Rect
    )

    private data class VisiblePendingCard(
        val card: UnvisitedCard,
        val item: StreamManifestItem
    )

    private fun findAnyPendingCardOnScreen(
        rootNode: AccessibilityNodeInfo,
        manifest: StreamManifest
    ): VisiblePendingCard? {
        val displayMetrics = resources.displayMetrics
        val minTop = 140
        val maxBottom = displayMetrics.heightPixels - BOTTOM_NAV_BAR_MARGIN_PX
        val rect = Rect()

        val postCards = findPostCards(rootNode)
        for (card in postCards) {
            val cardItems = mutableListOf<String>()
            collectQuickText(card, cardItems)
            val combinedText = cardItems.joinToString(" ")
            val lowerCombined = combinedText.lowercase().trim()

            val isStandaloneComment = lowerCombined.matches(Regex("""^(?:\d+\s+)?class\s+comments?.*""")) && combinedText.length < 35
            if (combinedText.length > 20 && !isStandaloneComment) {
                val titleCandidate = cardItems.firstOrNull { item ->
                    val lower = item.trim().lowercase()
                    !excludedChrome.contains(lower) &&
                            !excludedChrome.any { lower.startsWith(it) } &&
                            !lower.startsWith("tab ") &&
                            !lower.startsWith("signed in as") &&
                            !lower.startsWith("tasks due") &&
                            !lower.startsWith("class options for") &&
                            !lower.contains("class comments") &&
                            item.trim().length > 3
                }
                val title = titleCandidate?.take(80) ?: "Classroom Notice"
                val fingerprint = computeCardFingerprint(cardItems)

                val matchedItem = manifest.findMatchingItem(fingerprint, title, combinedText)
                if (matchedItem != null && matchedItem.status == StreamItemStatus.PENDING) {
                    card.getBoundsInScreen(rect)
                    // Check if card is comfortably inside safe tap zone and not overlapping bottom bar
                    if (rect.top in minTop..(maxBottom - 100)) {
                        val safeCenterY = rect.centerY().coerceIn(minTop + 40, maxBottom - 40)
                        val cardBounds = Rect(rect.left, safeCenterY - 20, rect.right, safeCenterY + 20)
                        for (other in postCards) {
                            if (other != card) other.recycle()
                        }
                        return VisiblePendingCard(
                            UnvisitedCard(matchedItem.title, combinedText, fingerprint, card, cardBounds),
                            matchedItem
                        )
                    }
                }
            }
            card.recycle()
        }
        return null
    }

    private fun findNextUnvisitedPost(rootNode: AccessibilityNodeInfo): UnvisitedCard? {
        val postCards = findPostCards(rootNode)
        val displayMetrics = resources.displayMetrics
        val minTop = 140
        val maxBottom = displayMetrics.heightPixels - BOTTOM_NAV_BAR_MARGIN_PX

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
            // Standalone comment chip check (only drop if the node contains exclusively comments and nothing else)
            if (lowerCombined.matches(Regex("""^(?:\d+\s+)?class\s+comments?.*""")) && combinedText.length < 35) {
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

    private fun findCardForTarget(rootNode: AccessibilityNodeInfo, targetItem: StreamManifestItem): UnvisitedCard? {
        val displayMetrics = resources.displayMetrics
        val minTop = 140
        val maxBottom = displayMetrics.heightPixels - BOTTOM_NAV_BAR_MARGIN_PX
        val rect = Rect()

        // Fast-path: Native Accessibility text search for target title (finds partially clipped and pre-fetched cards!)
        val cleanTargetTitle = targetItem.title.trim()
        val queryCandidate = cleanTargetTitle.substringAfter(":").trim().take(30)
        val searchQuery = if (queryCandidate.length >= 6) queryCandidate else cleanTargetTitle.take(30)

        if (searchQuery.length >= 6) {
            val fastMatches = rootNode.findAccessibilityNodeInfosByText(searchQuery)
            for (match in fastMatches) {
                val clickable = findClickableAncestor(match)
                if (clickable != null) {
                    val cardItems = mutableListOf<String>()
                    collectQuickText(clickable, cardItems)
                    val combinedText = cardItems.joinToString(" ")
                    val fingerprint = computeCardFingerprint(cardItems)

                    val cleanCardTitle = cardItems.firstOrNull { it.trim().length > 3 }?.take(80) ?: targetItem.title
                    val isMatch = fingerprint == targetItem.fingerprint ||
                            cleanCardTitle.contains(searchQuery, ignoreCase = true) ||
                            combinedText.contains(searchQuery, ignoreCase = true)

                    if (isMatch) {
                        CrawlerTraceLogger.log("CARD_MATCH", "Matched target #${targetItem.index} via Fast-Path Native Search (\"$searchQuery\")")
                        clickable.performAction(AccessibilityNodeInfo.AccessibilityAction.ACTION_SHOW_ON_SCREEN.id)
                        clickable.performAction(AccessibilityNodeInfo.ACTION_ACCESSIBILITY_FOCUS)
                        clickable.getBoundsInScreen(rect)
                        val safeCenterY = rect.centerY().coerceIn(minTop + 40, maxBottom - 40)
                        val cardBounds = Rect(rect.left, safeCenterY - 20, rect.right, safeCenterY + 20)
                        for (m in fastMatches) m.recycle()
                        return UnvisitedCard(targetItem.title, combinedText, fingerprint, clickable, cardBounds)
                    }
                    clickable.recycle()
                }
            }
            for (m in fastMatches) m.recycle()
        }

        val postCards = findPostCards(rootNode)
        var matchedCard: UnvisitedCard? = null

        for (card in postCards) {
            if (matchedCard == null) {
                card.getBoundsInScreen(rect)

                val cardItems = mutableListOf<String>()
                collectQuickText(card, cardItems)
                val combinedText = cardItems.joinToString(" ")
                val lowerCombined = combinedText.lowercase().trim()

                val isStandaloneComment = lowerCombined.matches(Regex("""^(?:\d+\s+)?class\s+comments?.*""")) && combinedText.length < 35
                if (combinedText.length > 20 && !isStandaloneComment) {
                    val titleCandidate = cardItems.firstOrNull { item ->
                        val lower = item.trim().lowercase()
                        !excludedChrome.contains(lower) &&
                                !excludedChrome.any { lower.startsWith(it) } &&
                                !lower.startsWith("tab ") &&
                                !lower.startsWith("signed in as") &&
                                !lower.startsWith("tasks due") &&
                                !lower.startsWith("class options for") &&
                                !lower.contains("class comments") &&
                                item.trim().length > 3
                    }
                    val title = titleCandidate?.take(80) ?: "Classroom Notice"
                    val fingerprint = computeCardFingerprint(cardItems)

                    // Resilient Multi-Factor Matching: Fingerprint -> Title -> Content Overlap
                    val isFingerprintMatch = (fingerprint == targetItem.fingerprint)
                    val cleanCardTitle = title.trim().lowercase()
                    val targetLower = cleanTargetTitle.lowercase()
                    val isTitleMatch = targetLower.isNotBlank() && (
                            cleanCardTitle == targetLower ||
                            (cleanCardTitle.length >= 15 && targetLower.startsWith(cleanCardTitle.take(25))) ||
                            (targetLower.length >= 15 && cleanCardTitle.startsWith(targetLower.take(25)))
                    )
                    val isContentMatch = targetLower.length >= 20 && combinedText.contains(targetLower.take(25), ignoreCase = true)

                    if (isFingerprintMatch || isTitleMatch || isContentMatch) {
                        val matchReason = if (isFingerprintMatch) "Fingerprint ($fingerprint)"
                        else if (isTitleMatch) "Title (\"${title.take(35)}\")"
                        else "Content Overlap"

                        CrawlerTraceLogger.log(
                            "CARD_MATCH",
                            "Matched target #${targetItem.index} via $matchReason"
                        )

                        val clickable = findClickableAncestor(card) ?: AccessibilityNodeInfo.obtain(card)
                        clickable.performAction(AccessibilityNodeInfo.AccessibilityAction.ACTION_SHOW_ON_SCREEN.id)
                        clickable.performAction(AccessibilityNodeInfo.ACTION_ACCESSIBILITY_FOCUS)
                        val safeCenterY = rect.centerY().coerceIn(minTop + 40, maxBottom - 40)
                        val cardBounds = Rect(rect.left, safeCenterY - 20, rect.right, safeCenterY + 20)
                        matchedCard = UnvisitedCard(title, combinedText, fingerprint, clickable, cardBounds)
                    }
                }
            }
            card.recycle()
        }
        return matchedCard
    }

    private fun findBestCandidateCardOnScreen(rootNode: AccessibilityNodeInfo?, targetItem: StreamManifestItem): UnvisitedCard? {
        if (rootNode == null) return null
        val postCards = findPostCards(rootNode)
        if (postCards.isEmpty()) return null

        val displayMetrics = resources.displayMetrics
        val minTop = 140
        val maxBottom = displayMetrics.heightPixels - BOTTOM_NAV_BAR_MARGIN_PX

        var bestCard: UnvisitedCard? = null
        var bestScore = -1f

        val cleanTargetTitle = targetItem.title.trim().lowercase()
        val targetTokens = cleanTargetTitle.split(Regex("""[\s\p{Punct}]+""")).filter { it.length > 2 }.toSet()

        val rect = Rect()
        for (card in postCards) {
            card.getBoundsInScreen(rect)
            val cardItems = mutableListOf<String>()
            collectQuickText(card, cardItems)
            val combined = cardItems.joinToString(" ")
            if (combined.length <= 15) {
                card.recycle()
                continue
            }
            val titleCandidate = cardItems.firstOrNull { item ->
                val lower = item.trim().lowercase()
                !excludedChrome.contains(lower) && !excludedChrome.any { lower.startsWith(it) } && item.trim().length > 3
            }
            val title = titleCandidate?.take(80) ?: "Classroom Notice"
            val fp = computeCardFingerprint(cardItems)

            // Multi-factor candidate scoring
            var score = 0f
            if (fp == targetItem.fingerprint) score += 100f
            val cleanTitle = title.trim().lowercase()
            if (cleanTitle == cleanTargetTitle) score += 80f
            else if (cleanTargetTitle.startsWith(cleanTitle.take(20)) || cleanTitle.startsWith(cleanTargetTitle.take(20))) score += 50f

            if (targetTokens.isNotEmpty()) {
                val cardTokens = cleanTitle.split(Regex("""[\s\p{Punct}]+""")).filter { it.length > 2 }.toSet()
                val commonTokens = targetTokens.intersect(cardTokens)
                val tokenRatio = commonTokens.size.toFloat() / maxOf(targetTokens.size, 1)
                score += tokenRatio * 40f
            }

            if (rect.centerY() in (minTop + 50)..(maxBottom - 50)) {
                score += 10f
            }

            if (score > bestScore || bestCard == null) {
                bestCard?.clickableNode?.recycle()
                val clickable = findClickableAncestor(card) ?: AccessibilityNodeInfo.obtain(card)
                val safeCenterY = rect.centerY().coerceIn(minTop + 40, maxBottom - 40)
                val cardBounds = Rect(rect.left, safeCenterY - 20, rect.right, safeCenterY + 20)
                bestCard = UnvisitedCard(title, combined, fp, clickable, cardBounds)
                bestScore = score
            }
            card.recycle()
        }
        return bestCard
    }

    private fun getVisibleManifestItems(rootNode: AccessibilityNodeInfo, manifest: StreamManifest): List<StreamManifestItem> {
        val postCards = findPostCards(rootNode)
        val matchedItems = mutableListOf<StreamManifestItem>()
        for (card in postCards) {
            val cardItems = mutableListOf<String>()
            collectQuickText(card, cardItems)
            val combined = cardItems.joinToString(" ")
            if (combined.length > 20) {
                val fp = computeCardFingerprint(cardItems)
                val titleCandidate = cardItems.firstOrNull { item ->
                    val lower = item.trim().lowercase()
                    !excludedChrome.contains(lower) &&
                            !excludedChrome.any { lower.startsWith(it) } &&
                            item.trim().length > 3
                }
                val title = titleCandidate?.take(80) ?: ""
                val matched = manifest.findMatchingItem(fp, title, combined)
                if (matched != null && !matchedItems.contains(matched)) {
                    matchedItems.add(matched)
                }
            }
            card.recycle()
        }
        return matchedItems
    }

    private suspend fun isNoticeFullyCapturedInDb(title: String): Boolean {
        val db = KidsDatabase.getInstance(applicationContext)
        val cleanTitle = title.trim()
        val notice = db.noticeDao().getAllNoticesDirect().firstOrNull { existing ->
            val existingTitle = existing.title.trim()
            if (existingTitle.equals(cleanTitle, ignoreCase = true)) {
                return@firstOrNull true
            }
            // If the card title was truncated with ellipsis, match by prefix only if non-truncated part is substantial (>=45 chars)
            val isTruncated = cleanTitle.endsWith("...") || cleanTitle.endsWith("…")
            if (isTruncated) {
                val cleanPrefix = cleanTitle.removeSuffix("...").removeSuffix("…").trim()
                if (cleanPrefix.length >= 45 && existingTitle.startsWith(cleanPrefix, ignoreCase = true)) {
                    return@firstOrNull true
                }
            }
            false
        } ?: return false

        val atts = db.attachmentDao().getAttachmentsForNotice(notice.noticeId)
        if (atts.isNotEmpty()) {
            // Must verify that EVERY registered attachment is physically synced and verified in Drive
            return atts.all { attachment ->
                attachment.syncStatus == SyncStatus.SYNCED.name &&
                        !attachment.driveFileId.isNullOrBlank() &&
                        !attachment.driveFileId.startsWith("virtual_")
            }
        }

        val isLikelyMaterial = cleanTitle.contains("material", true) ||
                cleanTitle.contains("worksheet", true) ||
                cleanTitle.contains("notes", true) ||
                cleanTitle.contains("answer key", true) ||
                cleanTitle.contains("assignment", true)

        // If it is a material or worksheet post but has 0 attachments registered, never assume it is fully captured
        if (isLikelyMaterial) {
            return false
        }

        return notice.body.length > 120
    }

    private suspend fun surveyVisibleCards(rootNode: AccessibilityNodeInfo, manifest: StreamManifest): Int {
        val postCards = findPostCards(rootNode)
        var addedCount = 0
        val db = KidsDatabase.getInstance(applicationContext)

        for (card in postCards) {
            val cardItems = mutableListOf<String>()
            collectQuickText(card, cardItems)
            val combinedText = cardItems.joinToString(" ")
            if (combinedText.length <= 15) {
                card.recycle()
                continue
            }

            val lowerCombined = combinedText.lowercase().trim()
            // Standalone comment chip check (only drop if the node contains exclusively comments and nothing else)
            if (lowerCombined.matches(Regex("""^(?:\d+\s+)?class\s+comments?.*""")) && combinedText.length < 35) {
                card.recycle()
                continue
            }

            val titleCandidate = cardItems.firstOrNull { item ->
                val lower = item.trim().lowercase()
                !excludedChrome.contains(lower) &&
                        !excludedChrome.any { lower.startsWith(it) } &&
                        !lower.startsWith("tab ") &&
                        !lower.startsWith("signed in as") &&
                        !lower.startsWith("tasks due") &&
                        !lower.startsWith("class options for") &&
                        !lower.contains("class comments") &&
                        item.trim().length > 3
            }
            val title = titleCandidate?.take(80) ?: "Classroom Notice"
            val fingerprint = computeCardFingerprint(cardItems)

            val existingNotice = db.noticeDao().findByHash(fingerprint)
            val isAlreadyCaptured = (visitedPostFingerprints.contains(fingerprint) || existingNotice != null) && isNoticeFullyCapturedInDb(title)
            val added = manifest.addItem(fingerprint, title, combinedText, isAlreadyCaptured)
            if (added) {
                addedCount++
                CrawlerTraceLogger.logSurveyCard(
                    manifest.totalCount,
                    manifest.totalCount,
                    title,
                    fingerprint,
                    isAlreadyCaptured
                )
            }
            card.recycle()
        }
        return addedCount
    }

    private fun getVisibleCardFingerprints(rootNode: AccessibilityNodeInfo): List<String> {
        val postCards = findPostCards(rootNode)
        val fingerprints = mutableListOf<String>()
        for (card in postCards) {
            val cardItems = mutableListOf<String>()
            collectQuickText(card, cardItems)
            if (cardItems.joinToString(" ").length > 20) {
                val fp = computeCardFingerprint(cardItems)
                fingerprints.add(fp)
            }
            card.recycle()
        }
        return fingerprints
    }

    private fun isItemVisible(rootNode: AccessibilityNodeInfo, targetFingerprint: String): Boolean {
        return getVisibleCardFingerprints(rootNode).contains(targetFingerprint)
    }

    private suspend fun ingestNoticeDirect(title: String, fullText: String, fingerprint: String) {
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
            CrawlerTraceLogger.log("SCROLLER_ACCEPTED", "Notice backfilled from stream: \"$title\"")
        }
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

        val isSectionHeader = (text != null && ATTACHMENT_HEADER_REGEX.matches(text)) ||
                (desc != null && ATTACHMENT_HEADER_REGEX.matches(desc))

        val candidate = when {
            isOptionsButton || isSectionHeader -> null
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

    private fun isPeopleOrClassworkTabActive(rootNode: AccessibilityNodeInfo): Boolean {
        val streamTabNode = findStreamTabButton(rootNode)
        if (streamTabNode != null) {
            val isStreamSelected = streamTabNode.isSelected
            streamTabNode.recycle()
            if (isStreamSelected) {
                // Stream tab is explicitly selected - we are NOT displaced!
                return false
            }
        }
        return isDisplacedBottomTabSelected(rootNode)
    }

    private fun isDisplacedBottomTabSelected(node: AccessibilityNodeInfo): Boolean {
        val nodeText = node.text?.toString()?.lowercase().orEmpty()
        val nodeContentDescription = node.contentDescription?.toString()?.lowercase().orEmpty()
        val isAlternateTabCandidate = (nodeContentDescription.contains("classwork") ||
                nodeContentDescription.contains("tab 2 of") ||
                nodeContentDescription.contains("people") ||
                nodeContentDescription.contains("tab 3 of") ||
                nodeText == "classwork" || nodeText == "people")

        if (isAlternateTabCandidate && node.isSelected) {
            return true
        }

        for (childIndex in 0 until node.childCount) {
            val child = node.getChild(childIndex) ?: continue
            val isChildTabSelected = isDisplacedBottomTabSelected(child)
            child.recycle()
            if (isChildTabSelected) return true
        }
        return false
    }

    private fun findStreamTabButton(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val text = node.text?.toString()?.lowercase().orEmpty()
        val desc = node.contentDescription?.toString()?.lowercase().orEmpty()
        val isStreamLabel = text == "stream" || desc.contains("stream") || desc.contains("tab 1 of")

        if (isStreamLabel) {
            if (node.isClickable) {
                return AccessibilityNodeInfo.obtain(node)
            }
            val parentNode = node.parent
            if (parentNode != null) {
                val isParentClickable = parentNode.isClickable
                val result = if (isParentClickable) AccessibilityNodeInfo.obtain(parentNode) else null
                parentNode.recycle()
                if (result != null) return result
            }
        }
        for (childIndex in 0 until node.childCount) {
            val child = node.getChild(childIndex) ?: continue
            val found = findStreamTabButton(child)
            child.recycle()
            if (found != null) return found
        }
        return null
    }

    private suspend fun switchToStreamTab(rootNode: AccessibilityNodeInfo): Boolean {
        val streamTabButtonNode = findStreamTabButton(rootNode)
        if (streamTabButtonNode != null) {
            CrawlerTraceLogger.log("STREAM_RECOVERY", "Found Stream tab button. Clicking to restore Stream view...")
            val clicked = streamTabButtonNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            val bounds = Rect()
            streamTabButtonNode.getBoundsInScreen(bounds)
            streamTabButtonNode.recycle()
            if (!clicked && bounds.width() > 0) {
                dispatchTap(bounds.centerX().toFloat(), bounds.centerY().toFloat())
            }
            delay(1000)
            return true
        }
        val displayMetrics = resources.displayMetrics
        val tapX = displayMetrics.widthPixels * STREAM_TAB_FALLBACK_HORIZONTAL_RATIO
        val tapY = displayMetrics.heightPixels * STREAM_TAB_FALLBACK_VERTICAL_RATIO
        CrawlerTraceLogger.log("STREAM_RECOVERY", "Dispatching gesture tap to restore Stream tab at ($tapX, $tapY)...")
        dispatchTap(tapX, tapY)
        delay(1000)
        return true
    }

    private fun isStreamOrClassworkView(rootNode: AccessibilityNodeInfo): Boolean {
        if (isPeopleOrClassworkTabActive(rootNode)) return false
        val textList = mutableListOf<String>()
        collectQuickText(rootNode, textList)
        val combined = textList.joinToString(" ").lowercase()
        val hasBottomTabs = (combined.contains("stream") && combined.contains("classwork")) ||
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
                lower.contains("send file") ||
                lower.contains("open with") ||
                lower.contains("drive shortcut") ||
                lower.contains("save to drive")
    }

    private fun isCommentsOnlyScreen(combinedText: String): Boolean {
        val lower = combinedText.lowercase()
        // Never flag the main Stream or Classwork view as comments only!
        val hasBottomTabs = (lower.contains("stream") && lower.contains("classwork")) ||
                lower.contains("tab 1 of 3") ||
                lower.contains("tab 2 of 3") ||
                lower.contains("people")
        if (hasBottomTabs) return false

        val hasCommentHeader = lower.contains("class comment") ||
                lower.contains("add class comment") ||
                lower.contains("no class comments") ||
                lower.contains("0 class comments") ||
                lower.contains("class comments (")
        val hasPostDetailFeatures = lower.contains("new material") ||
                lower.contains("new assignment") ||
                lower.contains("new question") ||
                lower.contains("your work") ||
                lower.contains("assigned") ||
                lower.contains("attachments") ||
                lower.contains("attachment") ||
                lower.contains("save all files offline") ||
                lower.contains("save all") ||
                lower.contains("save offline") ||
                lower.contains("for your reference") ||
                lower.contains("points")
        return hasCommentHeader && !hasPostDetailFeatures
    }

    private fun isClassesListScreen(root: AccessibilityNodeInfo): Boolean {
        if (isStreamOrClassworkView(root) || isPostDetailView(root)) return false
        val textList = mutableListOf<String>()
        collectQuickText(root, textList)
        val combined = textList.joinToString(" ").lowercase()
        return combined.contains("class options for") ||
                (combined.contains("google classroom") && !combined.contains("tab 1 of")) ||
                (combined.contains("classes") && (combined.contains("grade") || combined.contains("enrolled") || combined.contains("teaching") || combined.contains("joined")))
    }

    private fun extractCourseTitle(rootNode: AccessibilityNodeInfo): String? {
        val scrollable = findScrollableNode(rootNode) ?: rootNode
        for (i in 0 until scrollable.childCount) {
            val child = scrollable.getChild(i) ?: continue
            val textList = mutableListOf<String>()
            collectQuickText(child, textList)
            val combined = textList.joinToString(" ").trim()
            val lower = combined.lowercase()
            // Course header banner contains the class name/year (e.g. "Grade 3B CAIE 2026-27")
            if (combined.length in 4..60 &&
                !hasPostDateOrTimestamp(lower) &&
                !lower.contains("new material") &&
                !lower.contains("new assignment") &&
                !lower.contains("class comment") &&
                !excludedChrome.contains(lower)
            ) {
                if (lower.contains("grade") || lower.contains("class") || lower.contains("caie") || lower.contains("section") || lower.contains("202")) {
                    child.recycle()
                    if (scrollable != rootNode) scrollable.recycle()
                    return combined
                }
            }
            child.recycle()
        }
        if (scrollable != rootNode) scrollable.recycle()
        return null
    }

    private fun collectCourseCardNodes(
        node: AccessibilityNodeInfo,
        collectedCardNodes: MutableList<AccessibilityNodeInfo>
    ) {
        val desc = node.contentDescription?.toString()?.lowercase() ?: ""
        val className = node.className?.toString() ?: ""

        // Case A: Options button ("class options for...") -> climb up to parent card container
        if (desc.startsWith("class options for") || desc.contains("class options")) {
            var current: AccessibilityNodeInfo? = node.parent
            var depth = 1
            while (current != null && depth <= 5) {
                if (current.isClickable) {
                    val rect = Rect()
                    current.getBoundsInScreen(rect)
                    // Card container must be substantive, completely rejecting the 132x132 3-dots button!
                    if (rect.width() > MIN_COURSE_CARD_WIDTH_PX && rect.height() > MIN_COURSE_CARD_HEIGHT_PX) {
                        if (collectedCardNodes.none { it == current }) {
                            collectedCardNodes.add(AccessibilityNodeInfo.obtain(current))
                        }
                        break
                    }
                }
                val parentNode = current.parent
                current.recycle()
                current = parentNode
                depth++
            }
            current?.recycle()
        }

        // Case B: Direct clickable CardView or class item container
        if (node.isClickable && (className.contains("CardView") || className.contains("ViewGroup") || className.contains("FrameLayout"))) {
            val rect = Rect()
            node.getBoundsInScreen(rect)
            if (rect.width() > MIN_COURSE_CARD_WIDTH_PX && rect.height() > MIN_COURSE_CARD_HEIGHT_PX) {
                val nodeText = mutableListOf<String>()
                collectQuickText(node, nodeText)
                val combined = nodeText.joinToString(" ").lowercase()
                if (combined.contains("grade") || combined.contains("class") || combined.contains("caie") || combined.contains("section")) {
                    if (collectedCardNodes.none { it == node }) {
                        collectedCardNodes.add(AccessibilityNodeInfo.obtain(node))
                    }
                }
            }
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            collectCourseCardNodes(child, collectedCardNodes)
            child.recycle()
        }
    }

    private fun findCourseCardInClassesList(
        rootNode: AccessibilityNodeInfo,
        targetCourseTitle: String?,
        targetGrade: String?
    ): AccessibilityNodeInfo? {
        val candidates = mutableListOf<AccessibilityNodeInfo>()
        collectCourseCardNodes(rootNode, candidates)

        if (candidates.isEmpty()) return null

        // 1. Exact or prefix match against targetCourseTitle
        if (!targetCourseTitle.isNullOrBlank()) {
            val cleanTarget = targetCourseTitle.trim().lowercase()
            val matched = candidates.firstOrNull { card ->
                val textList = mutableListOf<String>()
                collectQuickText(card, textList)
                val combined = textList.joinToString(" ").lowercase()
                combined.contains(cleanTarget) || (cleanTarget.length >= 6 && combined.contains(cleanTarget.take(10)))
            }
            if (matched != null) {
                candidates.filter { it != matched }.forEach { it.recycle() }
                return matched
            }
        }

        // 2. Match against child's grade (e.g. "Grade 3")
        if (!targetGrade.isNullOrBlank()) {
            val cleanGrade = targetGrade.trim().lowercase()
            val matched = candidates.firstOrNull { card ->
                val textList = mutableListOf<String>()
                collectQuickText(card, textList)
                val combined = textList.joinToString(" ").lowercase()
                combined.contains(cleanGrade)
            }
            if (matched != null) {
                candidates.filter { it != matched }.forEach { it.recycle() }
                return matched
            }
        }

        // 3. Fallback: Return the first course card found
        val first = candidates.first()
        candidates.drop(1).forEach { it.recycle() }
        return first
    }

    private suspend fun recoverToStreamFromClassesList(
        root: AccessibilityNodeInfo,
        targetCourseTitle: String?,
        targetGrade: String?
    ): Boolean {
        CrawlerTraceLogger.log(
            "STREAM_RECOVERY",
            "Displaced 1 screen behind stream to Classes List. Seeking target class card ('${targetCourseTitle ?: targetGrade ?: "Primary Class"}')..."
        )
        crawlerOverlay?.updateStatus("Recovering Stream...", targetCourseTitle ?: "Re-entering class...")

        val card = findCourseCardInClassesList(root, targetCourseTitle, targetGrade)
        if (card != null) {
            val rect = Rect()
            card.getBoundsInScreen(rect)
            CrawlerTraceLogger.log(
                "STREAM_RECOVERY",
                "Found target class card at $rect. Clicking to re-enter stream..."
            )
            // Tap the card in the safe left-center area (35% across width, 50% height)
            // NEVER tap near the top-right corner where the 3-dots options menu button lives!
            val safeClickX = rect.left + (rect.width() * SAFE_CARD_TAP_HORIZONTAL_RATIO)
            val safeClickY = rect.centerY().toFloat()

            var isReentrySuccessful = dispatchTap(safeClickX, safeClickY)
            if (!isReentrySuccessful) {
                isReentrySuccessful = card.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            }
            card.recycle()
            delay(1500) // Allow class stream to load
            return isReentrySuccessful
        }
        return false
    }

    private fun isCommentsOnlyScreen(rootNode: AccessibilityNodeInfo): Boolean {
        val textList = mutableListOf<String>()
        collectQuickText(rootNode, textList)
        val combined = textList.joinToString(" ").lowercase()
        return isCommentsOnlyScreen(combined)
    }

    private fun isPostDetailView(rootNode: AccessibilityNodeInfo): Boolean {
        val textList = mutableListOf<String>()
        collectQuickText(rootNode, textList)
        val combined = textList.joinToString(" ").lowercase()

        // 1. If it has document viewer controls, it is a document viewer, not post detail
        if (isDocumentViewerScreen(combined)) {
            return false
        }

        // 2. If it is purely a class comments view, it is NOT post detail
        if (isCommentsOnlyScreen(combined)) {
            return false
        }

        val hasBottomTabs = (combined.contains("stream") && combined.contains("classwork")) ||
                combined.contains("tab 1 of 3") ||
                combined.contains("tab 2 of 3") ||
                combined.contains("people")
        val hasBackArrow = hasNavigateUpButton(rootNode)

        // Stream and Classwork views ALWAYS display bottom tabs and NEVER have a Navigate Up back arrow.
        // Detail View NEVER has bottom tabs and ALWAYS has a Navigate Up back arrow.
        if (hasBottomTabs || !hasBackArrow) {
            return false
        }

        val hasDetailIndicators = combined.contains("your work") ||
                combined.contains("assigned") ||
                combined.contains("attachments") ||
                combined.contains("attachment") ||
                combined.contains("save all files offline") ||
                combined.contains("save all") ||
                combined.contains("save offline") ||
                combined.contains("for your reference") ||
                combined.contains("points") ||
                combined.contains("new material") ||
                combined.contains("new assignment") ||
                combined.contains("new question") ||
                combined.contains("class comment") ||
                combined.contains("add class comment")

        // A Post Detail screen in Google Classroom strictly requires at least one structural post detail indicator.
        // Document preview screens displaying PDF contents (without post indicators) must never be identified as post detail.
        return hasDetailIndicators
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


    private fun clearFocusIfInputFocused(rootNode: AccessibilityNodeInfo) {
        val input = findInputNode(rootNode)
        if (input != null) {
            if (input.isFocused) {
                input.performAction(AccessibilityNodeInfo.ACTION_CLEAR_FOCUS)
            }
            input.recycle()
        }
    }

    private fun findTitleNodeInCard(cardNode: AccessibilityNodeInfo, targetTitle: String): AccessibilityNodeInfo? {
        val queryCandidate = targetTitle.substringAfter(":").trim().take(30)
        val searchQuery = if (queryCandidate.length >= 6) queryCandidate else targetTitle.trim().take(30)
        if (searchQuery.length >= 4) {
            val matches = cardNode.findAccessibilityNodeInfosByText(searchQuery)
            for (m in matches) {
                val text = m.text?.toString()?.lowercase() ?: ""
                val desc = m.contentDescription?.toString()?.lowercase() ?: ""
                if (!text.contains("comment") && !desc.contains("comment")) {
                    for (other in matches) {
                        if (other != m) other.recycle()
                    }
                    return m
                }
                m.recycle()
            }
        }
        for (i in 0 until cardNode.childCount) {
            val child = cardNode.getChild(i) ?: continue
            val text = child.text?.toString()?.lowercase() ?: ""
            val desc = child.contentDescription?.toString()?.lowercase() ?: ""
            if (!text.contains("comment") && !desc.contains("comment") && (text.length > 5 || desc.length > 5)) {
                return child
            }
            child.recycle()
        }
        return null
    }

    private fun findInputNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val className = node.className?.toString() ?: ""
        if (className.contains("EditText", ignoreCase = true)) {
            return AccessibilityNodeInfo.obtain(node)
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findInputNode(child)
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
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
            checkAndDismissSystemAnr()
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
            if (found != null) {
                child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    private val streamDateKeywords = setOf(
        "yesterday", "today", "tomorrow", "posted", "edited", "due"
    )
    private val streamMonthRegex = Regex(
        """\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b""",
        RegexOption.IGNORE_CASE
    )
    private val streamTimeRegex = Regex("""\b\d{1,2}:\d{2}\s*(?:am|pm)?\b""", RegexOption.IGNORE_CASE)
    private val streamRelativeTimeRegex = Regex("""\b\d+\s+(?:min(?:ute)?s?|hours?|days?|weeks?|months?)\s+ago\b""", RegexOption.IGNORE_CASE)

    private fun hasPostDateOrTimestamp(lowerText: String): Boolean {
        if (streamDateKeywords.any { lowerText.contains(it) }) return true
        if (streamMonthRegex.containsMatchIn(lowerText)) return true
        if (streamTimeRegex.containsMatchIn(lowerText)) return true
        if (streamRelativeTimeRegex.containsMatchIn(lowerText)) return true
        return false
    }

    private fun isStreamPostCard(node: AccessibilityNodeInfo): Boolean {
        val textList = mutableListOf<String>()
        collectQuickText(node, textList)
        val combinedText = textList.joinToString(" ").trim()
        if (combinedText.length <= 15) return false

        val lowerCombined = combinedText.lowercase()

        // 1. Explicit Exclusions: Composer boxes, navigation shortcuts, or bottom tabs
        if (lowerCombined.contains("announce something to your class") ||
            lowerCombined.contains("share with your class") ||
            lowerCombined.contains("view to-do list")
        ) {
            return false
        }

        // 2. Reject nodes that are purely standalone comment chips/counters without post body
        val isOnlyComment = lowerCombined.matches(Regex("""^(?:\d+\s+)?class\s+comments?.*""")) ||
                lowerCombined == "add class comment" ||
                (lowerCombined.contains("class comment") && combinedText.length < 35)
        if (isOnlyComment) {
            return false
        }

        // 3. Reject explicit course header banner view IDs if exposed
        val viewId = node.viewIdResourceName?.lowercase() ?: ""
        if (viewId.contains("course_header") ||
            viewId.contains("class_header") ||
            viewId.contains("cover_view") ||
            viewId.contains("header_banner") ||
            viewId.contains("banner_view")
        ) {
            return false
        }

        // 4. Positive Post Indicators:
        // Category A: Activity post type prefix
        val hasPostCategory = lowerCombined.contains("new material:") ||
                lowerCombined.contains("new material") ||
                lowerCombined.contains("new assignment:") ||
                lowerCombined.contains("new assignment") ||
                lowerCombined.contains("new question:") ||
                lowerCombined.contains("new question") ||
                lowerCombined.contains("new quiz:") ||
                lowerCombined.contains("assignment:") ||
                lowerCombined.contains("material:")

        // Category B: Date or relative timestamp
        val hasDatePattern = hasPostDateOrTimestamp(lowerCombined)

        // Category C: Comments action or indicator
        val hasComments = lowerCombined.contains("class comment") ||
                lowerCombined.contains("class comments") ||
                lowerCombined.contains("add class comment")

        // 5. Header Banner vs. Post Invariant:
        // A course header banner contains ONLY class name and year (e.g. "Grade 3B CAIE 2026-27").
        // It has NO date/timestamp, NO post category, and NO comments action.
        // A valid stream post MUST satisfy at least one post indicator:
        if (!hasPostCategory && !hasDatePattern && !hasComments) {
            return false
        }

        return true
    }

    private fun findPostCards(rootNode: AccessibilityNodeInfo): List<AccessibilityNodeInfo> {
        val scrollable = findScrollableNode(rootNode)
        if (scrollable != null && scrollable.childCount > 0) {
            val cards = mutableListOf<AccessibilityNodeInfo>()
            for (i in 0 until scrollable.childCount) {
                val child = scrollable.getChild(i) ?: continue
                if (isStreamPostCard(child)) {
                    cards.add(child)
                } else {
                    child.recycle()
                }
            }
            scrollable.recycle()
            return cards
        }
        return emptyList()
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

    private fun collectQuickText(node: AccessibilityNodeInfo, outList: MutableList<String>) {
        node.text?.toString()?.trim()?.let { if (it.length > 2) outList.add(it) }
        node.contentDescription?.toString()?.trim()?.let { if (it.length > 2) outList.add(it) }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            collectQuickText(child, outList)
            child.recycle()
        }
    }

    private fun computeViewportContentFingerprint(rootNode: AccessibilityNodeInfo): String {
        val texts = mutableListOf<String>()
        collectQuickText(rootNode, texts)
        return texts.joinToString("||").hashCode().toString()
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
                val clickableNode = AccessibilityNodeInfo.obtain(current)
                if (current != node) {
                    current.recycle()
                }
                return clickableNode
            }
            val parentNode = current.parent
            if (current != node) {
                current.recycle()
            }
            current = parentNode
        }
        return null
    }

    private fun isAuthorizedSchoolApp(packageName: String): Boolean {
        val lower = packageName.lowercase()
        return AUTHORIZED_SCHOOL_PACKAGES.contains(lower) ||
                lower == "com.google.android.apps.classroom" ||
                lower.endsWith(".classroom") ||
                lower.endsWith(".campuscare") ||
                lower.endsWith(".toddle") ||
                lower.endsWith(".edunext")
    }

    private fun isHomeScreenOrLauncher(packageName: String): Boolean {
        val lower = packageName.lowercase()
        return lower.contains("launcher") ||
                lower.contains("home") ||
                lower.contains("miui.home")
    }

    private fun isTransientOrSystemPackage(packageName: String): Boolean {
        // Home launchers represent deliberate user departures, not transient system overlays
        if (isHomeScreenOrLauncher(packageName)) return false

        val lower = packageName.lowercase()
        return lower == "android" ||
                lower == "com.android.systemui" ||
                lower == "com.android.documentsui" ||
                lower == "com.android.intentresolver" ||
                lower == "com.google.android.inputmethod.latin" ||
                lower == "com.touchtype.swiftkey" ||
                lower == "com.samsung.android.honeyboard" ||
                lower.contains("inputmethod") ||
                lower.contains("gboard") ||
                lower.contains("keyboard") ||
                lower.contains("resolver") ||
                lower.contains("chooser") ||
                lower == "com.google.android.gms" ||
                lower.startsWith("com.google.android.apps.docs") ||
                lower.startsWith("com.adobe.reader") ||
                lower.startsWith("cn.wps.moffice") ||
                lower.startsWith("com.microsoft.office") ||
                lower == "com.google.android.apps.nbu.files" ||
                lower == "com.sec.android.app.myfiles" ||
                lower == "com.miui.powerkeeper" ||
                lower == "com.miui.securityadd" ||
                lower == "com.miui.joyose"
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
        try {
            unregisterReceiver(crawlerControlReceiver)
        } catch (e: Exception) {
            // ignore if not registered
        }
        exitDebounceJob?.cancel()
        exitDebounceJob = null
        stopDeepCrawl()
        crawlerOverlay?.dismissAndRemove()
        crawlerOverlay = null
    }
}
