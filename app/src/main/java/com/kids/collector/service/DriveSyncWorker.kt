package com.kids.collector.service

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.room.withTransaction
import com.kids.collector.data.db.KidsDatabase
import com.kids.collector.data.db.NoticeEntity
import com.kids.collector.data.db.AttachmentEntity
import com.kids.collector.data.db.ChildProfileEntity
import com.kids.collector.domain.graph.KotlinGraphifyEngine
import com.kids.collector.domain.model.ChannelConfig
import com.kids.collector.domain.model.ChannelType
import com.kids.collector.domain.model.SyncStatus
import com.kids.collector.telemetry.DriveDeepLogger
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonArray
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
            val (savedEmail, academicYear, prefChildName) = com.kids.collector.data.drive.DriveVaultManager.getSavedVaultPrefs(applicationContext)
            val dbChildren = db.childProfileDao().getAllChildrenDirect()
            val primaryChildEntity = dbChildren.firstOrNull()
            val childName = primaryChildEntity?.firstName?.trim()
                ?: prefChildName.trim()
            val effectiveChildId = primaryChildEntity?.childId
                ?: "child_${childName.lowercase(Locale.US).replace(" ", "_")}"

            if (savedEmail.isNullOrBlank() || childName.isBlank()) {
                Log.w(TAG, "Sync deferred: Neither child profile nor vault preferences established.")
                CrawlerTraceLogger.log("SYNC_WORKER", "Sync deferred: Child profile not yet established in preferences or database.")
                return@withContext Result.success()
            }

            // Auto-seed baseline child profile if missing so all downstream queries and UI locate the active child
            if (primaryChildEntity == null && childName.isNotBlank()) {
                try {
                    val studentEmail = applicationContext.getSharedPreferences(
                        com.kids.collector.data.drive.DriveVaultManager.PREFS_NAME,
                        Context.MODE_PRIVATE
                    ).getString("wizard_student_email", "") ?: ""
                    val newChild = ChildProfileEntity(
                        childId = effectiveChildId,
                        firstName = childName,
                        grade = "Grade 3",
                        academicYear = academicYear,
                        schoolName = "School",
                        accountEmail = studentEmail,
                        disambiguationTag = "",
                        photoUri = null,
                        channels = listOf(
                            ChannelConfig(
                                channelType = ChannelType.GOOGLE_CLASSROOM,
                                isEnabled = true,
                                studentAccountEmail = studentEmail
                            )
                        ),
                    )
                    db.childProfileDao().insert(newChild)
                    Log.i(TAG, "Auto-seeded ChildProfile for '$childName' into database.")
                    CrawlerTraceLogger.log("SYNC_WORKER", "Auto-seeded ChildProfile for '$childName' in database.")
                } catch (dbEx: Exception) {
                    Log.w(TAG, "Could not auto-seed child profile: ${dbEx.message}")
                }
            }

            val pendingNotices = db.noticeDao().getPendingNotices()
            val pendingAttachments = db.attachmentDao().getPendingAttachments()
            val pendingLogs = CrawlerTraceLogger.drainPendingLogs()

            CrawlerTraceLogger.log(TAG, "Found ${pendingNotices.size} pending notices, ${pendingAttachments.size} attachments, ${pendingLogs.size} trace logs")

            val driveService = com.kids.collector.data.drive.DriveVaultManager.getDriveService(applicationContext, savedEmail)
            val driveClient = com.kids.collector.data.drive.GoogleDriveClient(driveService)
            val vault = com.kids.collector.data.drive.DriveVaultManager.getSavedVaultFolders(applicationContext, savedEmail, academicYear, childName)
                ?: driveClient.provisionChildVault(academicYear, childName).also {
                    com.kids.collector.data.drive.DriveVaultManager.saveVaultFolderPrefs(applicationContext, savedEmail, academicYear, childName, it)
                }

            // Autonomous self-healing: Purge any stray legacy "New Folder" on Drive if present
            try {
                val strayFolders = driveService.files().list()
                    .setQ("'${vault.yearFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and (name = 'New Folder' or name contains 'New Folder (') and trashed = false")
                    .setFields("files(id, name)")
                    .execute()
                for (stray in strayFolders.files.orEmpty()) {
                    try {
                        driveService.files().delete(stray.id).execute()
                        Log.i(TAG, "Purged stray empty folder from Google Drive: ${stray.name}")
                    } catch (e: Exception) {
                        Log.w(TAG, "Could not purge stray folder: ${stray.name}")
                    }
                }
            } catch (folderListingException: Exception) {
                Log.w(TAG, "Non-fatal error listing stray folders: ${folderListingException.message}")
            }

            // 1. Guaranteed Google Classroom channel vault provisioning
            val classroomVault = driveClient.provisionChannelVault(vault.childFolderId, CHANNEL_NAME_CLASSROOM)

            // Autonomous self-healing: Purge stray child-level "attachments" folder if present from legacy runs
            try {
                val strayChildAttachments = driveService.files().list()
                    .setQ("'${vault.childFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = 'attachments' and trashed = false")
                    .setFields("files(id, name)")
                    .execute()
                for (stray in strayChildAttachments.files.orEmpty()) {
                    try {
                        val filesInside = driveService.files().list()
                            .setQ("'${stray.id}' in parents and trashed = false")
                            .setFields("files(id, name)")
                            .execute()
                        for (strayFile in filesInside.files.orEmpty()) {
                            driveService.files().update(strayFile.id, null)
                                .setAddParents(classroomVault.attachmentsFolderId)
                                .setRemoveParents(stray.id)
                                .setFields("id, parents")
                                .execute()
                            Log.i(TAG, "Relocated stray attachment '${strayFile.name}' to Google Classroom/attachments/")
                        }
                        driveService.files().delete(stray.id).execute()
                        Log.i(TAG, "Purged legacy child-level attachments folder from Google Drive: ${stray.name}")
                    } catch (e: Exception) {
                        Log.w(TAG, "Could not purge child-level attachments folder: ${e.message}")
                    }
                }
            } catch (attachmentListingException: Exception) {
                Log.w(TAG, "Non-fatal error listing stray child attachments: ${attachmentListingException.message}")
            }


            val virtualResetCount = db.attachmentDao().resetVirtualAttachmentsToPending()
            if (virtualResetCount > 0) {
                CrawlerTraceLogger.log("SYNC_WORKER", "Reset $virtualResetCount virtual attachment references back to PENDING for physical capture & sync.")
            }

            val refreshedPendingAttachments = db.attachmentDao().getPendingAttachments()
            if (refreshedPendingAttachments.isNotEmpty()) {
                var physicalUploadCount = 0
                var pendingCount = 0
                val ocrParser = com.kids.collector.data.ocr.MLKitOcrParser(applicationContext)

                for (pendingAttachment in refreshedPendingAttachments) {
                    val localFile = if (pendingAttachment.localUri.isNotBlank()) File(pendingAttachment.localUri) else null
                    val targetFolderId = classroomVault.attachmentsFolderId

                    if (localFile != null && localFile.exists()) {
                        if (pendingAttachment.ocrText.isNullOrBlank()) {
                            try {
                                val ocrResult = if (pendingAttachment.mimeType == "application/pdf" || localFile.name.endsWith(".pdf", ignoreCase = true)) {
                                    ocrParser.extractTextFromPdfFile(localFile)
                                } else if (pendingAttachment.mimeType.startsWith("image/") || localFile.name.matches(Regex(".*\\.(jpg|jpeg|png)$", RegexOption.IGNORE_CASE))) {
                                    ocrParser.extractTextFromImageUri(android.net.Uri.fromFile(localFile))
                                } else null

                                if (ocrResult != null && ocrResult.fullText.isNotBlank()) {
                                    db.attachmentDao().updateOcrText(
                                        attachmentId = pendingAttachment.attachmentId,
                                        ocrText = ocrResult.fullText,
                                        pageCount = ocrResult.pageCount
                                    )
                                }
                            } catch (e: Exception) {
                                Log.w(TAG, "OCR extraction skipped for ${localFile.name}: ${e.message}")
                            }
                        }

                        val uploadedAttId = driveClient.uploadAttachment(
                            parentFolderId = targetFolderId,
                            file = localFile,
                            mimeType = pendingAttachment.mimeType,
                            customName = pendingAttachment.fileName
                        )

                        db.attachmentDao().updateSyncStatus(
                            attachmentId = pendingAttachment.attachmentId,
                            newStatus = SyncStatus.SYNCED.name,
                            driveFileId = uploadedAttId
                        )
                        db.noticeDao().markNoticePending(pendingAttachment.noticeId)
                        physicalUploadCount++

                        val stagingDir = File(applicationContext.getExternalFilesDir(null), "vault_attachments")
                        if (localFile.parentFile == stagingDir) {
                            try {
                                if (localFile.delete()) {
                                    CrawlerTraceLogger.log("STAGING_CLEANUP", "Uploaded \"${localFile.name}\" to Drive and cleared staging copy.")
                                }
                            } catch (e: Exception) {
                                Log.w(TAG, "Could not clean staging file: ${e.message}")
                            }
                        }
                    } else {
                        // Invariant: Attachments without physical files remain PENDING until captured
                        pendingCount++
                    }
                }

                val targetPrefix = "$CHANNEL_NAME_CLASSROOM/attachments/"
                val logMessage = if (physicalUploadCount > 0) {
                    "[ATTACHMENT BATCH SYNC] Uploaded $physicalUploadCount physical files to $targetPrefix ($pendingCount still awaiting capture/sync)"
                } else {
                    "[ATTACHMENT BATCH SYNC] $pendingCount attachments registered in vault, awaiting physical download/capture."
                }

                driveClient.appendTimelineLog(vault.logsFolderId, logMessage)
            }

            // 3. Batch upload pending notices to Google Drive with EMBEDDED ATTACHMENTS
            val noticesToSync = db.noticeDao().getPendingNotices()
            if (noticesToSync.isNotEmpty()) {
                val attachmentsByNoticeId = db.attachmentDao().getAllAttachmentsDirect().groupBy { it.noticeId }
                val classroomNotices = noticesToSync.filter { it.sourceApp.contains(APP_KEYWORD_CLASSROOM, ignoreCase = true) }
                val standardNotices = noticesToSync.filter { !it.sourceApp.contains(APP_KEYWORD_CLASSROOM, ignoreCase = true) }

                if (classroomNotices.isNotEmpty()) {
                    val batchClassroomJsonl = serializeNoticesToJsonl(classroomNotices, attachmentsByNoticeId)

                    val uploadedFileId = driveClient.appendNoticeToChannelJsonl(classroomVault.channelFolderId, batchClassroomJsonl)
                    driveClient.appendNoticeToJsonl(vault.childFolderId, batchClassroomJsonl)

                    driveClient.appendTimelineLog(
                        vault.logsFolderId,
                        "[CLASSROOM BATCH SYNC] Synced ${classroomNotices.size} notices into Google Classroom/ folder"
                    )

                    db.withTransaction {
                        for (notice in classroomNotices) {
                            db.noticeDao().updateSyncStatus(
                                noticeId = notice.noticeId,
                                newStatus = SyncStatus.SYNCED.name,
                                driveFileId = uploadedFileId
                            )
                        }
                    }
                }

                if (standardNotices.isNotEmpty()) {
                    val batchStandardJsonl = serializeNoticesToJsonl(standardNotices, attachmentsByNoticeId)

                    val uploadedFileId = driveClient.appendNoticeToJsonl(vault.childFolderId, batchStandardJsonl)
                    driveClient.appendTimelineLog(
                        vault.logsFolderId,
                        "[NOTICE BATCH SYNC] Synced ${standardNotices.size} notices"
                    )

                    db.withTransaction {
                        for (notice in standardNotices) {
                            db.noticeDao().updateSyncStatus(
                                noticeId = notice.noticeId,
                                newStatus = SyncStatus.SYNCED.name,
                                driveFileId = uploadedFileId
                            )
                        }
                    }
                }
            }

            // 4. Flush deep crawler trace logs (memory + persistent disk) to Google Drive
            val logsToUpload = if (pendingLogs.isNotEmpty()) {
                pendingLogs
            } else {
                CrawlerTraceLogger.getFullLocalLog(applicationContext)
            }
            if (logsToUpload.isNotEmpty()) {
                driveClient.appendCrawlerTraceLog(vault.logsFolderId, logsToUpload)
            }

                // 4. Synthesize and update Knowledge Graph, Master Digest, Family Digest, and graph.html
                try {
                    val allNoticeEntities = db.noticeDao().getNoticesForChildDirect(effectiveChildId)
                        .ifEmpty { db.noticeDao().getAllNoticesDirect() }
                    val allAttachmentEntities = db.attachmentDao().getAllAttachmentsDirect()

                    val allNotices = allNoticeEntities.map { noticeEntity ->
                        com.kids.collector.domain.model.Notice(
                            noticeId = noticeEntity.noticeId,
                            childId = noticeEntity.childId,
                            sourceApp = noticeEntity.sourceApp,
                            category = try {
                                com.kids.collector.domain.model.ContentCategory.valueOf(noticeEntity.category)
                            } catch (_: Exception) {
                                com.kids.collector.domain.model.ContentCategory.UNKNOWN
                            },
                            title = noticeEntity.title,
                            body = noticeEntity.body,
                            sender = noticeEntity.sender,
                            timestampMs = noticeEntity.timestampMs,
                            hashSha256 = noticeEntity.hashSha256
                        )
                    }

                    val allAttachments = allAttachmentEntities.map { attachmentEntity ->
                        com.kids.collector.domain.model.Attachment(
                            attachmentId = attachmentEntity.attachmentId,
                            noticeId = attachmentEntity.noticeId,
                            fileName = attachmentEntity.fileName,
                            localUri = attachmentEntity.localUri,
                            mimeType = attachmentEntity.mimeType,
                            sizeBytes = attachmentEntity.sizeBytes,
                            fileHash = attachmentEntity.fileHash,
                            ocrText = attachmentEntity.ocrText,
                            pageCount = attachmentEntity.pageCount
                        )
                    }

                    val childProfile = com.kids.collector.domain.model.ChildProfile(
                        childId = effectiveChildId,
                        firstName = childName,
                        grade = primaryChildEntity?.grade?.takeIf { it.isNotBlank() } ?: DEFAULT_FALLBACK_GRADE,
                        academicYear = primaryChildEntity?.academicYear?.takeIf { it.isNotBlank() } ?: academicYear,
                        schoolName = primaryChildEntity?.schoolName?.takeIf { it.isNotBlank() } ?: DEFAULT_FALLBACK_SCHOOL_NAME,
                        accountEmail = primaryChildEntity?.accountEmail?.takeIf { it.isNotBlank() } ?: savedEmail
                    )

                    val knowledgeGraph = graphifyEngine.buildGraph(childProfile, allNotices, allAttachments)
                    val graphJson = graphifyEngine.exportToJson(knowledgeGraph)
                    val masterDigest = graphifyEngine.generateMasterDigest(childProfile, allNotices, allAttachments)
                    val familyDigest = graphifyEngine.generateFamilyDigest(listOf(childProfile to allNotices))
                    val graphHtml = graphifyEngine.generateInteractiveHtml(childProfile, knowledgeGraph)

                    // Upload / Update the core AI files (Self-Healing on every sync cycle)
                    driveClient.uploadOrUpdateKnowledgeGraph(vault.systemFolderId, graphJson)
                    driveClient.uploadOrUpdateMasterDigest(vault.childFolderId, masterDigest)
                    driveClient.uploadOrUpdateFamilyDigest(vault.yearFolderId, familyDigest)
                    driveClient.uploadOrUpdateGraphHtml(vault.childFolderId, graphHtml)

                    val classroomNotices = allNotices.filter { it.sourceApp.contains(APP_KEYWORD_CLASSROOM, ignoreCase = true) }
                    val classroomDigest = graphifyEngine.generateMasterDigest(childProfile, classroomNotices, allAttachments)
                    driveClient.uploadOrUpdateChannelDigest(classroomVault.channelFolderId, classroomDigest)

                    // Check and upload crash log if present
                    val localCrashLog = File(applicationContext.filesDir, "crash.log")
                    if (localCrashLog.exists() && localCrashLog.length() > 0) {
                        driveClient.uploadDiagnosticSnapshot(vault.logsFolderId, localCrashLog.readText())
                        localCrashLog.delete()
                    }

                    CrawlerTraceLogger.log("GRAPHIFY", "Synthesized Knowledge Graph (${knowledgeGraph.nodes.size} nodes, ${knowledgeGraph.edges.size} edges) & Digests updated.")
                } catch (graphEx: Throwable) {
                    Log.w(TAG, "Non-fatal error generating Knowledge Graph and digests", graphEx)
                    CrawlerTraceLogger.log("GRAPHIFY_WARN", "Digest generation warning: ${graphEx.message}")
                }

                CrawlerTraceLogger.log("SYNC_WORKER", "Drive sync cycle completed successfully.")
                val finalLogs = CrawlerTraceLogger.drainPendingLogs()
                if (finalLogs.isNotEmpty()) {
                    driveClient.appendCrawlerTraceLog(vault.logsFolderId, finalLogs)
                    CrawlerTraceLogger.appendToLocalFile(applicationContext, finalLogs)
                }

            Result.success()

        } catch (t: Throwable) {
            Log.e(TAG, "Error during Drive sync worker execution", t)
            CrawlerTraceLogger.log("SYNC_WORKER", "Sync failed: ${t.message}")
            CrawlerTraceLogger.appendToLocalFile(applicationContext, CrawlerTraceLogger.drainPendingLogs())
            Result.retry()
        }
    }

    /**
     * Serializes a batch of notices and their embedded attachments into newline-delimited JSON (JSONL).
     */
    private fun serializeNoticesToJsonl(
        notices: List<NoticeEntity>,
        attachmentsByNoticeId: Map<String, List<AttachmentEntity>>
    ): String = notices.joinToString("\n") { notice ->
        val noticeAttachments = attachmentsByNoticeId[notice.noticeId].orEmpty()
        buildJsonObject {
            put("noticeId", notice.noticeId)
            put("childId", notice.childId)
            put("timestampMs", notice.timestampMs)
            put("sourceApp", notice.sourceApp)
            put("category", notice.category)
            put("title", notice.title)
            put("body", notice.body)
            put("sender", notice.sender)
            put("hashSha256", notice.hashSha256)
            put("attachmentCount", noticeAttachments.size)
            put("attachments", buildJsonArray {
                for (attachment in noticeAttachments) {
                    add(buildJsonObject {
                        put("attachmentId", attachment.attachmentId)
                        put("fileName", attachment.fileName)
                        put("mimeType", attachment.mimeType)
                        put("sizeBytes", attachment.sizeBytes)
                        put("driveFileId", attachment.driveFileId.orEmpty())
                        if (!attachment.driveFileId.isNullOrBlank() && !attachment.driveFileId.startsWith(VIRTUAL_DRIVE_ID_PREFIX)) {
                            put("driveUrl", formatDriveFileUrl(attachment.driveFileId))
                        }
                        if (!attachment.ocrText.isNullOrBlank()) {
                            put("ocrSummary", attachment.ocrText.take(MAX_OCR_SUMMARY_PREVIEW_LENGTH))
                        }
                    })
                }
            })
        }.toString()
    }

    private fun formatDriveFileUrl(driveFileId: String): String =
        GOOGLE_DRIVE_FILE_VIEW_URL_TEMPLATE.format(driveFileId)

    companion object {
        private const val TAG = "DriveSyncWorker"
        private const val APP_KEYWORD_CLASSROOM = "classroom"
        private const val CHANNEL_NAME_CLASSROOM = "Google Classroom"
        private const val VIRTUAL_DRIVE_ID_PREFIX = "virtual_"
        private const val MAX_OCR_SUMMARY_PREVIEW_LENGTH = 120
        private const val GOOGLE_DRIVE_FILE_VIEW_URL_TEMPLATE = "https://drive.google.com/file/d/%s/view"
        private const val DEFAULT_FALLBACK_GRADE = "General"
        private const val DEFAULT_FALLBACK_SCHOOL_NAME = "School Vault"
    }
}
