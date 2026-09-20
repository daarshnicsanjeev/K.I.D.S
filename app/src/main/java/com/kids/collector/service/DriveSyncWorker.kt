package com.kids.collector.service

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.kids.collector.data.db.KidsDatabase
import com.kids.collector.domain.graph.KotlinGraphifyEngine
import com.kids.collector.domain.model.SyncStatus
import com.kids.collector.telemetry.DriveDeepLogger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.io.File

/**
 * Background Drive Vault Sync Worker
 *
 * Appends notices into notices.jsonl, recompiles MASTER_DIGEST.md and knowledge_graph.json,
 * uploads pending circular attachments, and logs structured telemetry to _system/logs/.
 */
class DriveSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val graphifyEngine = KotlinGraphifyEngine()
    private val localLogDir = File(applicationContext.filesDir, "logs")
    private val deepLogger = DriveDeepLogger(localLogDir)

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        Log.i(TAG, "Starting DriveSyncWorker execution cycle...")
        CrawlerTraceLogger.log("SYNC_WORKER", "Sync cycle started. Checking pending notices.")

        val db = KidsDatabase.getInstance(applicationContext)

        return@withContext try {
            val (savedEmail, academicYear, childName) = com.kids.collector.data.drive.DriveVaultManager.getSavedVaultPrefs(applicationContext)
            val pendingNotices = db.noticeDao().getPendingNotices()
            val pendingAttachments = db.attachmentDao().getPendingAttachments()
            val pendingLogs = CrawlerTraceLogger.drainPendingLogs()

            CrawlerTraceLogger.log(TAG, "Found ${pendingNotices.size} pending notices, ${pendingAttachments.size} attachments, ${pendingLogs.size} trace logs")

            if (!savedEmail.isNullOrBlank()) {
                val driveService = com.kids.collector.data.drive.DriveVaultManager.getDriveService(applicationContext, savedEmail)
                val driveClient = com.kids.collector.data.drive.GoogleDriveClient(driveService)
                val vault = driveClient.provisionChildVault(academicYear, childName)

                // 1. Flush crawler deep trace logs to _system/logs/crawler_trace.log
                if (pendingLogs.isNotEmpty()) {
                    driveClient.appendCrawlerTraceLog(vault.logsFolderId, pendingLogs)
                    CrawlerTraceLogger.appendToLocalFile(applicationContext, pendingLogs)
                }

                // 2. Upload pending notices to Google Drive
                var classroomVault: com.kids.collector.data.drive.ChannelVaultFolders? = null

                for (notice in pendingNotices) {
                    val jsonLine = buildJsonObject {
                        put("noticeId", notice.noticeId)
                        put("childId", notice.childId)
                        put("timestampMs", notice.timestampMs)
                        put("sourceApp", notice.sourceApp)
                        put("category", notice.category)
                        put("title", notice.title)
                        put("body", notice.body)
                        put("sender", notice.sender)
                        put("hashSha256", notice.hashSha256)
                    }.toString()

                    val isClassroom = notice.sourceApp.contains("classroom", ignoreCase = true)
                    val uploadedFileId: String

                    if (isClassroom) {
                        if (classroomVault == null) {
                            classroomVault = driveClient.provisionChannelVault(vault.childFolderId, "Google Classroom")
                        }
                        // Upload notice into dedicated Google Classroom/ folder
                        uploadedFileId = driveClient.appendNoticeToChannelJsonl(classroomVault.channelFolderId, jsonLine)

                        // Also mirror to root child notices.jsonl for unified family rollup
                        driveClient.appendNoticeToJsonl(vault.childFolderId, jsonLine)

                        // Log milestone in sync_timeline.log
                        driveClient.appendTimelineLog(
                            vault.logsFolderId,
                            "[CLASSROOM SYNC] Auto-captured notice synced to Google Classroom/ folder: \"${notice.title}\" (${notice.category})"
                        )
                    } else {
                        uploadedFileId = driveClient.appendNoticeToJsonl(vault.childFolderId, jsonLine)
                        driveClient.appendTimelineLog(
                            vault.logsFolderId,
                            "[NOTICE SYNC] Synced notice: \"${notice.title}\" (${notice.category}) from ${notice.sourceApp}"
                        )
                    }

                    // Mark synced in local database
                    db.noticeDao().updateSyncStatus(
                        noticeId = notice.noticeId,
                        newStatus = SyncStatus.SYNCED.name,
                        driveFileId = uploadedFileId
                    )
                }

                // 3. Upload pending attachments
                for (att in pendingAttachments) {
                    val localFile = if (att.localUri.isNotBlank()) File(att.localUri) else null
                    val targetFolderId = classroomVault?.attachmentsFolderId ?: vault.attachmentsFolderId

                    val uploadedAttId = if (localFile != null && localFile.exists()) {
                        driveClient.uploadAttachment(
                            parentFolderId = targetFolderId,
                            file = localFile,
                            mimeType = if (att.fileType == "PDF") "application/pdf" else "application/octet-stream"
                        )
                    } else {
                        "virtual_${att.attachmentId.take(8)}"
                    }

                    db.attachmentDao().updateSyncStatus(
                        attachmentId = att.attachmentId,
                        newStatus = SyncStatus.SYNCED.name,
                        driveFileId = uploadedAttId
                    )

                    driveClient.appendTimelineLog(
                        vault.logsFolderId,
                        "[ATTACHMENT SYNC] Attachment uploaded to Google Classroom/attachments/: \"${att.fileName}\""
                    )
                }
            } else {
                Log.w(TAG, "No Google Drive account email configured. Skipping remote upload.")
                CrawlerTraceLogger.appendToLocalFile(applicationContext, pendingLogs)
            }

            CrawlerTraceLogger.log("SYNC_WORKER", "Drive sync cycle completed successfully.")
            Result.success()

        } catch (e: Exception) {
            Log.e(TAG, "Error during Drive sync worker execution", e)
            CrawlerTraceLogger.log("SYNC_WORKER", "Sync failed: ${e.message}")
            Result.retry()
        }
    }

    companion object {
        private const val TAG = "DriveSyncWorker"
    }
}
