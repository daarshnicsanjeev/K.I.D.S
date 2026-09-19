package com.kids.collector.service

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.work.Constraints
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.kids.collector.data.db.KidsDatabase
import com.kids.collector.data.db.NoticeEntity
import com.kids.collector.domain.classifier.ContentClassifier
import com.kids.collector.domain.dedupe.DeduplicationEngine
import com.kids.collector.domain.filter.PrivacyFilter
import com.kids.collector.domain.model.ChildProfile
import com.kids.collector.domain.model.SyncStatus
import com.kids.collector.domain.parser.NotificationParser
import com.kids.collector.domain.router.MultiChildRouter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * Ambient, 24/7 Notification Ingestion Service
 *
 * Runs passively in the background, capturing announcements the exact millisecond they broadcast.
 * Enforces strict memory boundary privacy drops, multi-child attribution, SHA-256 deduplication,
 * and schedules expedited WorkManager tasks for Drive Vault streaming.
 */
class KidsNotificationListenerService : NotificationListenerService() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val notificationParser = NotificationParser()
    private val classifier = ContentClassifier()
    private val deduplicationEngine = DeduplicationEngine()

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val parsed = notificationParser.parse(sbn) ?: return

        serviceScope.launch {
            try {
                val db = KidsDatabase.getInstance(applicationContext)

                // 1. Fetch configured children for privacy group whitelisting and routing
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

                // Gather whitelisted WhatsApp groups across all configured children
                val whitelistedGroups = children.flatMap { child ->
                    child.channels.mapNotNull { it.whitelistedGroupName }
                }.toSet()

                val privacyFilter = PrivacyFilter(whitelistedChatGroups = whitelistedGroups)

                // 2. Memory Boundary Privacy Check (Critical Safety Gate)
                if (!privacyFilter.shouldIngest(parsed.packageName, parsed.conversationTitle, "${parsed.title} ${parsed.body}")) {
                    // SILENT DROP: Zero disk write, zero logging, zero network traffic
                    return@launch
                }

                // 3. Multi-Child Disambiguation
                val router = MultiChildRouter(children)
                val targetChild = router.route(
                    senderOrGroup = parsed.sender,
                    title = parsed.title,
                    body = parsed.body,
                    accountEmail = null
                )

                val targetChildId = targetChild?.childId ?: "unassigned_child"

                // 4. Content Classification
                val category = classifier.classify(parsed.title, parsed.body)

                // 5. SHA-256 Deduplication Fingerprint
                val hash = deduplicationEngine.computeNoticeHash(
                    childId = targetChildId,
                    sourceApp = parsed.packageName,
                    title = parsed.title,
                    body = parsed.body
                )

                val existing = db.noticeDao().findByHash(hash)
                if (existing != null) {
                    Log.d(TAG, "Duplicate notice broadcast dropped: $hash")
                    return@launch
                }

                // 6. Insert Notice into Room DB
                val noticeId = UUID.randomUUID().toString()
                val noticeEntity = NoticeEntity(
                    noticeId = noticeId,
                    childId = targetChildId,
                    sourceApp = parsed.packageName,
                    category = category.name,
                    title = parsed.title,
                    body = parsed.body,
                    sender = parsed.sender,
                    timestampMs = parsed.postTimeMs,
                    hashSha256 = hash,
                    syncStatus = SyncStatus.PENDING.name,
                    driveFileId = null,
                    attachmentCount = if (parsed.hasAttachmentPreview) 1 else 0
                )

                db.noticeDao().insert(noticeEntity)
                Log.i(TAG, "Notice ingested: \"${parsed.title}\" ($category) -> Child: ${targetChild?.firstName ?: "Default"}")

                // 7. Schedule WorkManager Expedited Sync
                val constraints = Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()

                val syncRequest = OneTimeWorkRequestBuilder<DriveSyncWorker>()
                    .setConstraints(constraints)
                    .build()

                WorkManager.getInstance(applicationContext).enqueue(syncRequest)

            } catch (e: Exception) {
                Log.e(TAG, "Error in notification ingestion pipeline", e)
            }
        }
    }

    companion object {
        private const val TAG = "KidsNotificationListener"
    }
}
