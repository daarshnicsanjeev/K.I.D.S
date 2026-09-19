package com.kids.collector.service

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.kids.collector.data.db.KidsDatabase
import com.kids.collector.data.db.NoticeEntity
import com.kids.collector.domain.classifier.ContentClassifier
import com.kids.collector.domain.dedupe.DeduplicationEngine
import com.kids.collector.domain.filter.PrivacyFilter
import com.kids.collector.domain.model.SyncStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * Ambient, 24/7 Notification Listener Service
 *
 * Intercepts school announcements in real-time from Google Classroom, WhatsApp,
 * and School ERPs, applying strict privacy boundary checks and SHA-256 deduplication.
 */
class KidsNotificationListenerService : NotificationListenerService() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val privacyFilter = PrivacyFilter()
    private val classifier = ContentClassifier()
    private val deduplicationEngine = DeduplicationEngine()

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val packageName = sbn.packageName ?: return
        val extras = sbn.notification?.extras ?: return

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString().orEmpty()
        val body = if (bigText.isNotBlank()) bigText else text
        val conversationTitle = extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)?.toString()

        // 1. Critical Privacy Boundary Check
        if (!privacyFilter.shouldIngest(packageName, conversationTitle, "$title $body")) {
            // Drop immediately: Zero disk write, zero logging
            return
        }

        serviceScope.launch {
            try {
                val db = KidsDatabase.getInstance(applicationContext)
                val category = classifier.classify(title, body)

                // Default routing key
                val defaultChildId = "default_child"
                val hash = deduplicationEngine.computeNoticeHash(
                    childId = defaultChildId,
                    sourceApp = packageName,
                    title = title,
                    body = body
                )

                // 2. SHA-256 Deduplication check
                val existing = db.noticeDao().findByHash(hash)
                if (existing != null) {
                    Log.d(TAG, "Duplicate notice ignored: $hash")
                    return@launch
                }

                val noticeEntity = NoticeEntity(
                    noticeId = UUID.randomUUID().toString(),
                    childId = defaultChildId,
                    sourceApp = packageName,
                    category = category.name,
                    title = title,
                    body = body,
                    sender = conversationTitle ?: packageName,
                    timestampMs = sbn.postTime,
                    hashSha256 = hash,
                    syncStatus = SyncStatus.PENDING.name,
                    driveFileId = null
                )

                db.noticeDao().insert(noticeEntity)
                Log.i(TAG, "Successfully captured notice: $title ($category)")

            } catch (e: Exception) {
                Log.e(TAG, "Error ingesting notice", e)
            }
        }
    }

    companion object {
        private const val TAG = "KidsNotificationListener"
    }
}
