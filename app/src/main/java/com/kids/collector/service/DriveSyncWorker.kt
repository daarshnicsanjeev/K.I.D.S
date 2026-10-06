package com.kids.collector.service

import android.content.Context
import android.util.Log
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
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

    override suspend fun getForegroundInfo(): ForegroundInfo {
        createSyncNotificationChannel()
        val notification = NotificationCompat.Builder(applicationContext, NOTIFICATION_CHANNEL_ID_SYNC)
            .setContentTitle("K.I.D.S. Cloud Vault Sync")
            .setContentText("Syncing notices and attachments to Google Drive...")
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
        return ForegroundInfo(SYNC_NOTIFICATION_ID, notification)
    }

    private fun createSyncNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID_SYNC,
                "K.I.D.S. Vault Sync",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Background synchronization of school notices to Google Drive"
                setShowBadge(false)
            }
            val nm = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            nm?.createNotificationChannel(channel)
        }
    }

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
            val effectiveChildId = com.kids.collector.data.drive.DriveVaultManager.canonicalChildId(childName)

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

            consolidateDuplicateChildProfiles(db, effectiveChildId)
            consolidateDuplicateNoticesAndStaleStubs(db, effectiveChildId)

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

            // 1. Guaranteed Google Classroom channel vault provisioning
            val classroomVault = driveClient.provisionChannelVault(vault.childFolderId, CHANNEL_NAME_CLASSROOM)

            val virtualResetCount = db.attachmentDao().resetVirtualAttachmentsToPending()
            if (virtualResetCount > 0) {
                CrawlerTraceLogger.log("SYNC_WORKER", "Reset $virtualResetCount virtual attachment references back to PENDING for physical capture & sync.")
            }

            // 2. IMMEDIATE PHYSICAL ATTACHMENT UPLOADS (Zero latency reflection in Drive!)
            val refreshedPendingAttachments = db.attachmentDao().getPendingAttachments()
            if (refreshedPendingAttachments.isNotEmpty()) {
                var physicalUploadCount = 0
                var pendingCount = 0
                val ocrParser = com.kids.collector.data.ocr.MLKitOcrParser(applicationContext)

                for (pendingAttachment in refreshedPendingAttachments) {
                    val localFile = if (pendingAttachment.localUri.isNotBlank()) File(pendingAttachment.localUri) else null
                    val targetFolderId = classroomVault.attachmentsFolderId

                    if (localFile != null && localFile.exists()) {
                        val cleanPhysicalName = if (localFile.name.startsWith("shared_")) {
                            localFile.name.replace(Regex("^shared_\\d+_"), "")
                        } else localFile.name

                        val targetUploadName = if (cleanPhysicalName.isNotBlank() &&
                            (pendingAttachment.fileName.endsWith("...") ||
                             pendingAttachment.fileName.length < 8 && cleanPhysicalName.length >= 8 ||
                             cleanPhysicalName.contains(pendingAttachment.fileName.substringBeforeLast('.')))
                        ) {
                            cleanPhysicalName
                        } else {
                            pendingAttachment.fileName
                        }

                        // STEP 1: PHYSICAL UPLOAD FIRST! File immediately reflects on Google Drive!
                        val uploadedAttId = driveClient.uploadAttachment(
                            parentFolderId = targetFolderId,
                            file = localFile,
                            mimeType = pendingAttachment.mimeType,
                            customName = targetUploadName
                        )

                        if (targetUploadName != pendingAttachment.fileName) {
                            db.attachmentDao().insertAttachment(pendingAttachment.copy(fileName = targetUploadName))
                        }

                        db.attachmentDao().updateSyncStatus(
                            attachmentId = pendingAttachment.attachmentId,
                            newStatus = SyncStatus.SYNCED.name,
                            driveFileId = uploadedAttId
                        )
                        db.noticeDao().markNoticePending(pendingAttachment.noticeId)
                        physicalUploadCount++

                        // Propagate uploaded Drive ID to any sibling pending attachments referencing this file or name
                        val pendingCleanName = com.kids.collector.service.KidsAccessibilityService.sanitizeAttachmentFileName(pendingAttachment.fileName)
                        val siblingAttachments = refreshedPendingAttachments.filter { sibling ->
                            sibling.attachmentId != pendingAttachment.attachmentId && (
                                sibling.localUri == pendingAttachment.localUri ||
                                (sibling.fileHash.isNotBlank() && sibling.fileHash == pendingAttachment.fileHash) ||
                                com.kids.collector.service.KidsAccessibilityService.sanitizeAttachmentFileName(sibling.fileName).equals(pendingCleanName, ignoreCase = true)
                            )
                        }
                        for (sibling in siblingAttachments) {
                            db.attachmentDao().updateSyncStatus(
                                attachmentId = sibling.attachmentId,
                                newStatus = SyncStatus.SYNCED.name,
                                driveFileId = uploadedAttId
                            )
                            if (sibling.sizeBytes == 0L && pendingAttachment.sizeBytes > 0) {
                                db.attachmentDao().updateLocalFileWithFileName(
                                    attachmentId = sibling.attachmentId,
                                    fileName = targetUploadName,
                                    localUri = pendingAttachment.localUri,
                                    sizeBytes = pendingAttachment.sizeBytes,
                                    fileHash = pendingAttachment.fileHash
                                )
                            }
                            db.noticeDao().markNoticePending(sibling.noticeId)
                            CrawlerTraceLogger.log(
                                "ATTACHMENT_SYNC",
                                "Propagated Drive file $uploadedAttId to sibling attachment \"${sibling.fileName}\" under notice ${sibling.noticeId.take(8)}"
                            )
                        }

                        // STEP 2: OCR runs AFTER physical file is safely on Drive (does not delay Drive appearance)
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

                // 5. Autonomous Internal App Data & Diagnostics Mirroring
                try {
                    val mirrorNotices = db.noticeDao().getAllNoticesDirect()
                    val mirrorAttachments = db.attachmentDao().getAllAttachmentsDirect()
                    com.kids.collector.telemetry.InternalAppDiagnosticsMirror.mirrorAllInternalDataToDrive(
                        context = applicationContext,
                        db = db,
                        driveClient = driveClient,
                        vault = vault,
                        childProfile = primaryChildEntity,
                        allNotices = mirrorNotices,
                        allAttachments = mirrorAttachments
                    )
                } catch (diagEx: Throwable) {
                    Log.w(TAG, "Non-fatal error mirroring internal app data to Drive: ${diagEx.message}", diagEx)
                    CrawlerTraceLogger.log("DIAGNOSTICS_WARN", "Diagnostics mirror warning: ${diagEx.message}")
                }

                // 6. Autonomous self-healing: purge stray folders and reconcile any duplicate files across vault folders
                purgeStrayLegacyFolders(driveService, vault.yearFolderId, vault.childFolderId, classroomVault.attachmentsFolderId)
                reconcileAndDeduplicateVaultFolders(
                    driveService,
                    classroomVault.channelFolderId to "Google Classroom",
                    classroomVault.attachmentsFolderId to "Google Classroom/attachments",
                    vault.childFolderId to "Child Vault",
                    vault.yearFolderId to "Academic Year Vault",
                    vault.systemFolderId to "System Vault",
                    vault.logsFolderId to "Logs Vault"
                )

                CrawlerTraceLogger.log("SYNC_WORKER", "Drive sync cycle completed successfully.")
                val finalLogs = CrawlerTraceLogger.drainPendingLogs()
                if (finalLogs.isNotEmpty()) {
                    driveClient.appendCrawlerTraceLog(vault.logsFolderId, finalLogs)
                }

            Result.success()

        } catch (t: Throwable) {
            Log.e(TAG, "Error during Drive sync worker execution", t)
            CrawlerTraceLogger.log("SYNC_WORKER", "Sync failed: ${t.message}")
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

    private suspend fun consolidateDuplicateChildProfiles(db: KidsDatabase, canonicalId: String) {
        try {
            val allNotices = db.noticeDao().getAllNoticesDirect()
            val nonCanonicalNotices = allNotices.filter {
                it.childId.equals(canonicalId, ignoreCase = true) && it.childId != canonicalId
            }
            if (nonCanonicalNotices.isEmpty()) return

            val canonicalNotices = allNotices.filter { it.childId == canonicalId }
            val canonicalByTitle = canonicalNotices.associateBy { it.title }

            for (nonCan in nonCanonicalNotices) {
                val matchingCan = canonicalByTitle[nonCan.title]
                if (matchingCan != null) {
                    val nonCanAtts = db.attachmentDao().getAttachmentsForNotice(nonCan.noticeId)
                    val canAtts = db.attachmentDao().getAttachmentsForNotice(matchingCan.noticeId)
                    val canAttsByName = canAtts.associateBy { it.fileName }

                    for (att in nonCanAtts) {
                        val matchingCanAtt = canAttsByName[att.fileName]
                        if (matchingCanAtt != null) {
                            if (att.sizeBytes > 0 && matchingCanAtt.sizeBytes == 0L) {
                                db.attachmentDao().updateLocalFile(
                                    attachmentId = matchingCanAtt.attachmentId,
                                    localUri = att.localUri,
                                    sizeBytes = att.sizeBytes,
                                    fileHash = att.fileHash
                                )
                                if (att.syncStatus == SyncStatus.SYNCED.name) {
                                    db.attachmentDao().updateSyncStatus(
                                        attachmentId = matchingCanAtt.attachmentId,
                                        newStatus = SyncStatus.SYNCED.name,
                                        driveFileId = att.driveFileId
                                    )
                                }
                            }
                        } else {
                            db.attachmentDao().insertAttachment(att.copy(noticeId = matchingCan.noticeId))
                        }
                    }
                    db.attachmentDao().deleteAttachmentsForNotice(nonCan.noticeId)
                    db.noticeDao().deleteNoticeById(nonCan.noticeId)
                } else {
                    db.noticeDao().updateChildId(nonCan.noticeId, canonicalId)
                }
            }
            CrawlerTraceLogger.log("DATABASE_HEAL", "Consolidated ${nonCanonicalNotices.size} notices into canonical child '$canonicalId'")
        } catch (e: Exception) {
            Log.w(TAG, "Consolidation notice check: ${e.message}")
        }
    }

    private suspend fun consolidateDuplicateNoticesAndStaleStubs(db: KidsDatabase, canonicalId: String) {
        try {
            val allNotices = db.noticeDao().getAllNoticesDirect().filter {
                it.childId.equals(canonicalId, ignoreCase = true)
            }
            if (allNotices.isEmpty()) return

            // 1. Consolidate duplicate notices with identical normalized title under the child
            val noticesByTitle = allNotices.groupBy {
                it.title.trim().lowercase().replace(Regex("""\s+"""), " ")
            }

            for ((_, noticesGroup) in noticesByTitle) {
                if (noticesGroup.size > 1) {
                    // Pick the primary notice: prefer the one with physical/synced attachments or earlier timestamp
                    val primaryNotice = noticesGroup.maxByOrNull { notice ->
                        val atts = db.attachmentDao().getAttachmentsForNotice(notice.noticeId)
                        atts.count { it.sizeBytes > 0 } * 100 + atts.size
                    } ?: noticesGroup.first()

                    val secondaryNotices = noticesGroup.filter { it.noticeId != primaryNotice.noticeId }
                    val primaryAtts = db.attachmentDao().getAttachmentsForNotice(primaryNotice.noticeId).toMutableList()

                    for (secNotice in secondaryNotices) {
                        val secAtts = db.attachmentDao().getAttachmentsForNotice(secNotice.noticeId)
                        for (secAtt in secAtts) {
                            val secClean = com.kids.collector.service.KidsAccessibilityService.sanitizeAttachmentFileName(secAtt.fileName)
                            val matchInPrimary = primaryAtts.firstOrNull { prim ->
                                val primClean = com.kids.collector.service.KidsAccessibilityService.sanitizeAttachmentFileName(prim.fileName)
                                primClean.equals(secClean, ignoreCase = true)
                            }

                            if (matchInPrimary != null) {
                                if (secAtt.sizeBytes > 0 && matchInPrimary.sizeBytes == 0L) {
                                    db.attachmentDao().updateLocalFile(
                                        attachmentId = matchInPrimary.attachmentId,
                                        localUri = secAtt.localUri,
                                        sizeBytes = secAtt.sizeBytes,
                                        fileHash = secAtt.fileHash
                                    )
                                    if (secAtt.syncStatus == SyncStatus.SYNCED.name && secAtt.driveFileId != null) {
                                        db.attachmentDao().updateSyncStatus(
                                            attachmentId = matchInPrimary.attachmentId,
                                            newStatus = SyncStatus.SYNCED.name,
                                            driveFileId = secAtt.driveFileId
                                        )
                                    }
                                }
                            } else {
                                db.attachmentDao().insertAttachment(secAtt.copy(noticeId = primaryNotice.noticeId))
                                primaryAtts.add(secAtt.copy(noticeId = primaryNotice.noticeId))
                            }
                        }
                        db.attachmentDao().deleteAttachmentsForNotice(secNotice.noticeId)
                        db.noticeDao().deleteNoticeById(secNotice.noticeId)
                        CrawlerTraceLogger.log(
                            "DATABASE_HEAL",
                            "Consolidated duplicate notice \"${secNotice.title.take(40)}\" (${secNotice.noticeId.take(8)}) into ${primaryNotice.noticeId.take(8)}"
                        )
                    }

                    val updatedCount = db.attachmentDao().getAttachmentsForNotice(primaryNotice.noticeId).size
                    db.noticeDao().update(primaryNotice.copy(attachmentCount = updatedCount))
                }
            }

            // 2. Heal duplicate 0-byte stubs inside the same notice (e.g. "Addition Level 1.pdf" when "Addition Level 1..pdf" is synced)
            val allAttachments = db.attachmentDao().getAllAttachmentsDirect()
            val attachmentsByNotice = allAttachments.groupBy { it.noticeId }

            for ((noticeId, noticeAtts) in attachmentsByNotice) {
                if (noticeAtts.size > 1) {
                    val syncedAtts = noticeAtts.filter { it.sizeBytes > 0 || it.syncStatus == SyncStatus.SYNCED.name }
                    val zeroByteStubs = noticeAtts.filter { it.sizeBytes == 0L && it.localUri.isBlank() && it.syncStatus == SyncStatus.PENDING.name }

                    for (stub in zeroByteStubs) {
                        val stubClean = com.kids.collector.service.KidsAccessibilityService.sanitizeAttachmentFileName(stub.fileName)
                        val matchingSynced = syncedAtts.firstOrNull { syn ->
                            val synClean = com.kids.collector.service.KidsAccessibilityService.sanitizeAttachmentFileName(syn.fileName)
                            synClean.equals(stubClean, ignoreCase = true)
                        }

                        if (matchingSynced != null) {
                            db.attachmentDao().deleteAttachmentById(stub.attachmentId)
                            CrawlerTraceLogger.log(
                                "DATABASE_HEAL",
                                "Removed redundant 0-byte stub \"${stub.fileName}\" under notice $noticeId (synced counterpart: \"${matchingSynced.fileName}\")"
                            )
                        }
                    }

                    val currentNotice = db.noticeDao().findById(noticeId)
                    if (currentNotice != null) {
                        val freshCount = db.attachmentDao().getAttachmentsForNotice(noticeId).size
                        if (currentNotice.attachmentCount != freshCount) {
                            db.noticeDao().update(currentNotice.copy(attachmentCount = freshCount))
                        }
                    }
                }
            }

            // 3. Heal re-posted notices where the same physical file exists and is SYNCED in another notice (e.g. "The-Articles.pdf")
            // 3. Heal re-posted notices where the same physical file exists and is SYNCED in another notice (e.g. "The-Articles.pdf", "Grade 3 Bones and Muscles PPT (3).pdf")
            val freshPending = db.attachmentDao().getPendingAttachments().filter { pending ->
                val localFile = if (pending.localUri.isNotBlank()) File(pending.localUri) else null
                pending.sizeBytes == 0L || localFile == null || !localFile.exists()
            }
            if (freshPending.isNotEmpty()) {
                val freshAll = db.attachmentDao().getAllAttachmentsDirect()
                val syncedPool = freshAll.filter { it.syncStatus == SyncStatus.SYNCED.name && it.driveFileId != null && it.sizeBytes > 0 }

                for (pendingStub in freshPending) {
                    val stubClean = com.kids.collector.service.KidsAccessibilityService.sanitizeAttachmentFileName(pendingStub.fileName)
                    val matchingSynced = syncedPool.firstOrNull { syn ->
                        val synClean = com.kids.collector.service.KidsAccessibilityService.sanitizeAttachmentFileName(syn.fileName)
                        synClean.equals(stubClean, ignoreCase = true) ||
                        (pendingStub.fileHash.isNotBlank() && pendingStub.fileHash == syn.fileHash)
                    }

                    if (matchingSynced != null) {
                        db.attachmentDao().updateLocalFileWithFileName(
                            attachmentId = pendingStub.attachmentId,
                            fileName = matchingSynced.fileName,
                            localUri = matchingSynced.localUri,
                            sizeBytes = matchingSynced.sizeBytes,
                            fileHash = matchingSynced.fileHash
                        )
                        db.attachmentDao().updateSyncStatus(
                            attachmentId = pendingStub.attachmentId,
                            newStatus = SyncStatus.SYNCED.name,
                            driveFileId = matchingSynced.driveFileId
                        )
                        db.noticeDao().markNoticePending(pendingStub.noticeId)
                        CrawlerTraceLogger.log(
                            "DATABASE_HEAL",
                            "Auto-healed re-posted attachment \"${pendingStub.fileName}\" under notice ${pendingStub.noticeId.take(8)} using Drive file ID ${matchingSynced.driveFileId}"
                        )
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Consolidation error: ${e.message}")
        }
    }

    private fun purgeStrayLegacyFolders(
        driveService: com.google.api.services.drive.Drive,
        yearFolderId: String,
        childFolderId: String,
        targetAttachmentsFolderId: String
    ) {
        // Autonomous self-healing: Purge any stray legacy "New Folder" on Drive if present
        try {
            val strayFolders = driveService.files().list()
                .setQ("'$yearFolderId' in parents and mimeType = 'application/vnd.google-apps.folder' and (name = 'New Folder' or name contains 'New Folder (') and trashed = false")
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

        // Autonomous self-healing: Purge stray child-level "attachments" folder if present from legacy runs
        try {
            val strayChildAttachments = driveService.files().list()
                .setQ("'$childFolderId' in parents and mimeType = 'application/vnd.google-apps.folder' and name = 'attachments' and trashed = false")
                .setFields("files(id, name)")
                .execute()
            for (stray in strayChildAttachments.files.orEmpty()) {
                try {
                    val filesInside = driveService.files().list()
                        .setQ("'${stray.id}' in parents and trashed = false")
                        .setFields("files(id, name)")
                        .execute()
                    for (strayFile in filesInside.files.orEmpty()) {
                        val cleanName = strayFile.name.replace("\\", "\\\\").replace("'", "\\'")
                        val existingInTarget = driveService.files().list()
                            .setQ("'$targetAttachmentsFolderId' in parents and name = '$cleanName' and trashed = false")
                            .setFields("files(id)")
                            .execute().files.orEmpty()

                        if (existingInTarget.isNotEmpty()) {
                            // Target folder already contains this file! Delete stray copy to prevent duplicate
                            driveService.files().delete(strayFile.id).execute()
                            Log.i(TAG, "Autonomous deduplication: deleted stray attachment '${strayFile.name}' as it already exists in target folder.")
                        } else {
                            driveService.files().update(strayFile.id, null)
                                .setAddParents(targetAttachmentsFolderId)
                                .setRemoveParents(stray.id)
                                .setFields("id, parents")
                                .execute()
                            Log.i(TAG, "Relocated stray attachment '${strayFile.name}' to Google Classroom/attachments/")
                        }
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
    }

    private fun reconcileAndDeduplicateVaultFolders(
        driveService: com.google.api.services.drive.Drive,
        vararg folders: Pair<String, String>
    ) {
        for ((folderId, folderLabel) in folders) {
            if (folderId.isBlank()) continue
            try {
                val fileListResponse = driveService.files().list()
                    .setQ("'$folderId' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false")
                    .setFields("files(id, name, size, md5Checksum, modifiedTime)")
                    .setPageSize(500)
                    .execute()

                val files = fileListResponse.files.orEmpty()
                val filesByName = files.groupBy { it.name }
                for ((name, duplicateList) in filesByName) {
                    if (duplicateList.size > 1) {
                        Log.i(TAG, "Reconciliation: found ${duplicateList.size} duplicate entries for '$name' in $folderLabel ($folderId). Deduplicating...")
                        val sorted = duplicateList.sortedWith(
                            compareByDescending<com.google.api.services.drive.model.File> { it.modifiedTime?.value ?: 0L }
                                .thenByDescending { it.size?.toLong() ?: 0L }
                        )
                        val keeper = sorted.first()
                        for (redundant in sorted.drop(1)) {
                            try {
                                driveService.files().delete(redundant.id).execute()
                                Log.i(TAG, "Autonomous deduplication: purged redundant duplicate '$name' (id: ${redundant.id}, size: ${redundant.size}) from $folderLabel (retained id: ${keeper.id}, size: ${keeper.size})")
                                CrawlerTraceLogger.log("DEDUPE", "Purged redundant duplicate file '$name' (${redundant.id}) from $folderLabel")
                            } catch (delEx: Exception) {
                                Log.w(TAG, "Could not delete redundant duplicate ${redundant.id}: ${delEx.message}")
                            }
                        }
                    }
                }
            } catch (folderEx: Exception) {
                Log.w(TAG, "Non-fatal error reconciling duplicates in $folderLabel: ${folderEx.message}")
            }
        }
    }

    companion object {
        private const val TAG = "DriveSyncWorker"
        private const val APP_KEYWORD_CLASSROOM = "classroom"
        private const val CHANNEL_NAME_CLASSROOM = "Google Classroom"
        private const val VIRTUAL_DRIVE_ID_PREFIX = "virtual_"
        private const val MAX_OCR_SUMMARY_PREVIEW_LENGTH = 120
        private const val GOOGLE_DRIVE_FILE_VIEW_URL_TEMPLATE = "https://drive.google.com/file/d/%s/view"
        private const val SYNC_NOTIFICATION_ID = 4001
        private const val NOTIFICATION_CHANNEL_ID_SYNC = "kids_drive_vault_sync"
        private const val DEFAULT_FALLBACK_GRADE = "General"
        private const val DEFAULT_FALLBACK_SCHOOL_NAME = "School Vault"
    }
}
