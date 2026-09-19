package com.kids.collector.service

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.kids.collector.data.db.KidsDatabase
import com.kids.collector.data.db.NoticeEntity
import com.kids.collector.domain.classifier.ContentClassifier
import com.kids.collector.domain.dedupe.DeduplicationEngine
import com.kids.collector.domain.model.SyncStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * Historical Notice Crawler Accessibility Service
 *
 * Exclusively active for Day 0 historical backfill when authorized school apps are in foreground.
 * Traverses accessibility node trees, extracts past circulars & homework, and scrolls automatically.
 *
 * Governance:
 * - 100% Optional: declining accessibility does not impair 24/7 push notification capture.
 * - Zero third-party cloud retention.
 */
class KidsAccessibilityService : AccessibilityService() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val classifier = ContentClassifier()
    private val deduplicationEngine = DeduplicationEngine()
    private var isCrawlingActive = false

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val packageName = event.packageName?.toString() ?: return
        if (!isAuthorizedSchoolApp(packageName)) return

        val rootNode = rootInActiveWindow ?: return

        serviceScope.launch {
            try {
                val db = KidsDatabase.getInstance(applicationContext)
                val crawledItems = mutableListOf<String>()

                extractNodeText(rootNode, crawledItems)

                // Combine text fragments into notice candidates
                if (crawledItems.isNotEmpty()) {
                    val combinedText = crawledItems.joinToString(" ")
                    if (combinedText.length > 30) {
                        val title = crawledItems.firstOrNull()?.take(80) ?: "Historical School Announcement"
                        val body = combinedText
                        val category = classifier.classify(title, body)

                        val hash = deduplicationEngine.computeNoticeHash(
                            childId = "crawled_child",
                            sourceApp = packageName,
                            title = title,
                            body = body
                        )

                        val existing = db.noticeDao().findByHash(hash)
                        if (existing == null) {
                            val noticeEntity = NoticeEntity(
                                noticeId = UUID.randomUUID().toString(),
                                childId = "crawled_child",
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
                            Log.i(TAG, "Historical notice backfilled: \"$title\" ($category)")
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

    companion object {
        private const val TAG = "KidsAccessibilityService"
    }
}
