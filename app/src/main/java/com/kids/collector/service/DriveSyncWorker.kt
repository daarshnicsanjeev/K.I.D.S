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
            val (savedEmail, academicYear, prefChildName) = com.kids.collector.data.drive.DriveVaultManager.getSavedVaultPrefs(applicationContext)
            val childName = if (prefChildName.isNotBlank()) {
                prefChildName
            } else {
                val dbChildren = db.childProfileDao().getAllChildrenDirect()
                dbChildren.firstOrNull()?.firstName ?: ""
            }

            if (savedEmail.isNullOrBlank() || childName.isBlank()) {
                Log.w(TAG, "Sync deferred: Child profile not yet established or childName is blank.")
                CrawlerTraceLogger.log("SYNC_WORKER", "Sync deferred: Child profile not yet established.")
                return@withContext Result.success()
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
            } catch (_: Exception) {
            }

            // 1. Flush crawler deep trace logs to _system/logs/crawler_trace.log
            if (pendingLogs.isNotEmpty()) {
                driveClient.appendCrawlerTraceLog(vault.logsFolderId, pendingLogs)
                CrawlerTraceLogger.appendToLocalFile(applicationContext, pendingLogs)
            }

                // 2. Batch upload pending notices to Google Drive
                var classroomVault: com.kids.collector.data.drive.ChannelVaultFolders? = null

                if (pendingNotices.isNotEmpty()) {
                    val classroomNotices = pendingNotices.filter { it.sourceApp.contains("classroom", ignoreCase = true) }
                    val otherNotices = pendingNotices.filter { !it.sourceApp.contains("classroom", ignoreCase = true) }

                    if (classroomNotices.isNotEmpty()) {
                        classroomVault = driveClient.provisionChannelVault(vault.childFolderId, "Google Classroom")
                        val batchClassroomJsonl = classroomNotices.joinToString("\n") { notice ->
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
                            }.toString()
                        }

                        val uploadedFileId = driveClient.appendNoticeToChannelJsonl(classroomVault.channelFolderId, batchClassroomJsonl)
                        driveClient.appendNoticeToJsonl(vault.childFolderId, batchClassroomJsonl)

                        driveClient.appendTimelineLog(
                            vault.logsFolderId,
                            "[CLASSROOM BATCH SYNC] Synced ${classroomNotices.size} notices into Google Classroom/ folder"
                        )

                        for (notice in classroomNotices) {
                            db.noticeDao().updateSyncStatus(
                                noticeId = notice.noticeId,
                                newStatus = SyncStatus.SYNCED.name,
                                driveFileId = uploadedFileId
                            )
                        }
                    }

                    if (otherNotices.isNotEmpty()) {
                        val batchOtherJsonl = otherNotices.joinToString("\n") { notice ->
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
                            }.toString()
                        }

                        val uploadedFileId = driveClient.appendNoticeToJsonl(vault.childFolderId, batchOtherJsonl)
                        driveClient.appendTimelineLog(
                            vault.logsFolderId,
                            "[NOTICE BATCH SYNC] Synced ${otherNotices.size} notices"
                        )

                        for (notice in otherNotices) {
                            db.noticeDao().updateSyncStatus(
                                noticeId = notice.noticeId,
                                newStatus = SyncStatus.SYNCED.name,
                                driveFileId = uploadedFileId
                            )
                        }
                    }
                }

                // 3. Scan local download directories and upload pending attachments
                try {
                    com.kids.collector.data.drive.DownloadFolderObserver.scanLocalAttachments(applicationContext)
                } catch (e: Exception) {
                    Log.w(TAG, "Error scanning local downloads: ${e.message}")
                }

                val refreshedPendingAttachments = db.attachmentDao().getPendingAttachments()
                if (refreshedPendingAttachments.isNotEmpty()) {
                    var physicalUploadCount = 0
                    var virtualCount = 0
                    val ocrParser = com.kids.collector.data.ocr.MLKitOcrParser(applicationContext)

                    for (att in refreshedPendingAttachments) {
                        val localFile = if (att.localUri.isNotBlank()) File(att.localUri) else null
                        val targetFolderId = classroomVault?.attachmentsFolderId ?: vault.attachmentsFolderId

                        if (localFile != null && localFile.exists()) {
                            // Run on-device ML Kit OCR for AI knowledge graph if missing
                            if (att.ocrText.isNullOrBlank()) {
                                try {
                                    val ocrResult = if (att.mimeType == "application/pdf" || localFile.name.endsWith(".pdf", ignoreCase = true)) {
                                        ocrParser.extractTextFromPdfFile(localFile)
                                    } else if (att.mimeType.startsWith("image/") || localFile.name.matches(Regex(".*\\.(jpg|jpeg|png)$", RegexOption.IGNORE_CASE))) {
                                        ocrParser.extractTextFromImageUri(android.net.Uri.fromFile(localFile))
                                    } else null

                                    if (ocrResult != null && ocrResult.fullText.isNotBlank()) {
                                        db.attachmentDao().updateOcrText(
                                            attachmentId = att.attachmentId,
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
                                mimeType = att.mimeType
                            )

                            db.attachmentDao().updateSyncStatus(
                                attachmentId = att.attachmentId,
                                newStatus = SyncStatus.SYNCED.name,
                                driveFileId = uploadedAttId
                            )
                            physicalUploadCount++

                            // Clear private staging file now that it is safely uploaded to Google Drive
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
                            db.attachmentDao().updateSyncStatus(
                                attachmentId = att.attachmentId,
                                newStatus = SyncStatus.SYNCED.name,
                                driveFileId = "virtual_${att.attachmentId.take(8)}"
                            )
                            virtualCount++
                        }
                    }

                    val targetPrefix = if (classroomVault != null) "Google Classroom/attachments/" else "attachments/"
                    val logMessage = if (physicalUploadCount > 0) {
                        "[ATTACHMENT BATCH SYNC] Uploaded $physicalUploadCount physical files to $targetPrefix (plus $virtualCount indexed references)"
                    } else {
                        "[ATTACHMENT BATCH SYNC] Indexed $virtualCount attachment references in digest (0 physical files on disk yet)"
                    }

                    driveClient.appendTimelineLog(
                        vault.logsFolderId,
                        logMessage
                    )
                }

                // 4. Synthesize and update Knowledge Graph, Master Digest, Family Digest, and graph.html
                try {
                    val allNoticeEntities = db.noticeDao().getNoticesForChildDirect("child_$childName")
                        .ifEmpty { db.noticeDao().getAllNoticesDirect() }
                    val allAttachmentEntities = db.attachmentDao().getAllAttachmentsDirect()

                    val allNotices = allNoticeEntities.map { n ->
                        com.kids.collector.domain.model.Notice(
                            noticeId = n.noticeId,
                            childId = n.childId,
                            sourceApp = n.sourceApp,
                            category = try {
                                com.kids.collector.domain.model.ContentCategory.valueOf(n.category)
                            } catch (_: Exception) {
                                com.kids.collector.domain.model.ContentCategory.UNKNOWN
                            },
                            title = n.title,
                            body = n.body,
                            sender = n.sender,
                            timestampMs = n.timestampMs,
                            hashSha256 = n.hashSha256
                        )
                    }

                    val allAttachments = allAttachmentEntities.map { a ->
                        com.kids.collector.domain.model.Attachment(
                            attachmentId = a.attachmentId,
                            noticeId = a.noticeId,
                            fileName = a.fileName,
                            localUri = a.localUri,
                            mimeType = a.mimeType,
                            sizeBytes = a.sizeBytes,
                            fileHash = a.fileHash,
                            ocrText = a.ocrText,
                            pageCount = a.pageCount
                        )
                    }

                    val childProfile = com.kids.collector.domain.model.ChildProfile(
                        childId = "child_$childName",
                        firstName = childName,
                        grade = "Grade 3",
                        academicYear = academicYear,
                        schoolName = "School Vault",
                        accountEmail = savedEmail
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

                    if (classroomVault != null) {
                        val classroomNotices = allNotices.filter { it.sourceApp.contains("classroom", ignoreCase = true) }
                        val classroomDigest = graphifyEngine.generateMasterDigest(childProfile, classroomNotices, allAttachments)
                        driveClient.uploadOrUpdateChannelDigest(classroomVault.channelFolderId, classroomDigest)
                    }

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

    companion object {
        private const val TAG = "DriveSyncWorker"
    }
}
