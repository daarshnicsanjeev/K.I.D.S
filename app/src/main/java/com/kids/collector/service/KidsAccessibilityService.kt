package com.kids.collector.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityManager
import android.view.accessibility.AccessibilityNodeInfo
import androidx.work.Constraints
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

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.i(TAG, "KidsAccessibilityService connected")
        crawlerOverlay = FloatingCrawlerOverlay(this) {
            // Manual "Grab Screen" trigger from floating button
            val root = rootInActiveWindow ?: return@FloatingCrawlerOverlay
            val pkg = lastActiveSchoolPackage ?: "com.google.android.apps.classroom"
            processRootNode(root, pkg)
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val packageName = event.packageName?.toString() ?: return

        if (isAuthorizedSchoolApp(packageName)) {
            lastActiveSchoolPackage = packageName
            crawlerOverlay?.show()

            val rootNode = rootInActiveWindow ?: return
            processRootNode(rootNode, packageName)
        } else {
            // When exiting school apps or returning to launcher, hide the floating assistant
            crawlerOverlay?.hide()
        }
    }

    private fun processRootNode(rootNode: AccessibilityNodeInfo, packageName: String) {
        serviceScope.launch {
            try {
                val db = KidsDatabase.getInstance(applicationContext)
                val crawledItems = mutableListOf<String>()

                extractNodeText(rootNode, crawledItems)

                if (crawledItems.isNotEmpty()) {
                    val combinedText = crawledItems.joinToString(" ")
                    if (combinedText.length > 30) {
                        val title = crawledItems.firstOrNull()?.take(80) ?: "Historical School Announcement"
                        val body = combinedText
                        val category = classifier.classify(title, body)

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

                        val router = MultiChildRouter(children)
                        val targetChild = router.route(packageName, title, body)
                        val targetChildId = targetChild?.childId ?: children.firstOrNull()?.childId ?: "default"

                        val hash = deduplicationEngine.computeNoticeHash(
                            childId = targetChildId,
                            sourceApp = packageName,
                            title = title,
                            body = body
                        )

                        val existing = db.noticeDao().findByHash(hash)
                        if (existing == null) {
                            val noticeEntity = NoticeEntity(
                                noticeId = UUID.randomUUID().toString(),
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
                                attachmentCount = 0
                            )
                            db.noticeDao().insert(noticeEntity)
                            Log.i(TAG, "Historical notice backfilled: \"$title\" ($category) -> Child: ${targetChild?.firstName ?: "Default"}")

                            // Update overlay counter badge in real time
                            crawlerOverlay?.incrementNoticeCount()

                            // 2. Schedule WorkManager Expedited Sync to Google Drive
                            val constraints = Constraints.Builder()
                                .setRequiredNetworkType(NetworkType.CONNECTED)
                                .build()

                            val syncRequest = OneTimeWorkRequestBuilder<DriveSyncWorker>()
                                .setConstraints(constraints)
                                .build()

                            WorkManager.getInstance(applicationContext).enqueue(syncRequest)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error during accessibility crawl", e)
            }
        }
    }

    private fun extractNodeText(node: AccessibilityNodeInfo, outList: MutableList<String>) {
        val text = node.text?.toString()?.trim()
        if (!text.isNullOrBlank() && text.length > 5) {
            outList.add(text)
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            extractNodeText(child, outList)
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
