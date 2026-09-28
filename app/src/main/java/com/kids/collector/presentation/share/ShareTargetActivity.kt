package com.kids.collector.presentation.share

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.util.Log
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.kids.collector.data.db.AttachmentEntity
import com.kids.collector.data.db.KidsDatabase
import com.kids.collector.data.db.NoticeEntity
import com.kids.collector.domain.dedupe.DeduplicationEngine
import com.kids.collector.domain.model.SyncStatus
import com.kids.collector.service.CrawlerTraceLogger
import com.kids.collector.service.DriveSyncWorker
import com.kids.collector.service.GoogleDriveSharedHarvester
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

/**
 * Silent, transparent Share Target Activity.
 * Receives shared attachments directly from Android's system share sheet (e.g. when shared
 * from Google Classroom / Docs / Drive viewer) and stages them into private vault storage
 * without displaying any intrusive UI to the user.
 */
class ShareTargetActivity : Activity() {

    companion object {
        private const val TAG = "ShareTargetActivity"
        private val NON_ALPHANUMERIC_REGEX = Regex("[^a-z0-9]")
        private val FILENAME_SANITIZATION_REGEX = Regex("[^a-zA-Z0-9._-]")
        private const val MIN_PREFIX_MATCH_LENGTH = 6
        private const val PREFIX_SLICE_LENGTH = 12
        private const val MIN_SUBSTRING_MATCH_LENGTH = 8
    }

    private val deduplicationEngine = DeduplicationEngine()
    private val activityScope = CoroutineScope(kotlinx.coroutines.SupervisorJob() + Dispatchers.IO)

    override fun onDestroy() {
        super.onDestroy()
        activityScope.cancel()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            when (intent?.action) {
                Intent.ACTION_SEND -> {
                    val uri = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
                    if (uri != null) {
                        processIncomingUris(listOf(uri))
                    } else {
                        finishAndRemoveTask()
                    }
                }
                Intent.ACTION_SEND_MULTIPLE -> {
                    val uris = intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)
                    if (!uris.isNullOrEmpty()) {
                        processIncomingUris(uris)
                    } else {
                        finishAndRemoveTask()
                    }
                }
                else -> finishAndRemoveTask()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling incoming share intent: ${e.message}", e)
            finishAndRemoveTask()
        }
    }

    private fun processIncomingUris(uris: List<Uri>) {
        val appContext = applicationContext
        val resolver = contentResolver
        // Process in background while keeping Activity alive until copy completes
        activityScope.launch {
            try {
                for (uri in uris) {
                    processSingleUri(uri, appContext, resolver)
                }
            } finally {
                withContext(Dispatchers.Main) {
                    finishAndRemoveTask()
                }
            }
        }
    }

    private suspend fun processSingleUri(
        uri: Uri,
        appContext: android.content.Context,
        resolver: android.content.ContentResolver
    ) {
            try {
                val resolvedFileName = queryFileName(uri) ?: "attachment_${System.currentTimeMillis()}.pdf"
                val safeFileName = resolvedFileName.replace(FILENAME_SANITIZATION_REGEX, "_")

                val stagingDir = File(appContext.getExternalFilesDir(null), "vault_attachments").apply {
                    if (!exists()) mkdirs()
                }

                // Deterministic staged file prefix
                val stagedFile = File(stagingDir, "shared_${System.currentTimeMillis().toString().takeLast(6)}_$safeFileName")

                resolver.openInputStream(uri)?.use { input ->
                    FileOutputStream(stagedFile).use { output ->
                        input.copyTo(output)
                    }
                }

                if (stagedFile.exists() && stagedFile.length() > 0L) {
                    val fileHash = deduplicationEngine.computeFileHash(stagedFile)
                    val db = KidsDatabase.getInstance(appContext)
                    val activeNoticeId = com.kids.collector.service.KidsAccessibilityService.activeTargetNoticeId
                    val activeFileName = com.kids.collector.service.KidsAccessibilityService.activeTargetAttachmentFileName

                    var matchingAttachment: com.kids.collector.data.db.AttachmentEntity? = null

                    if (!activeNoticeId.isNullOrBlank()) {
                        val noticeAttachments = db.attachmentDao().getAttachmentsForNotice(activeNoticeId)
                        if (noticeAttachments.isNotEmpty()) {
                            // 1. Try matching against active target attachment filename if known
                            if (!activeFileName.isNullOrBlank()) {
                                val cleanActive = activeFileName.replace("...", "").trim().lowercase()
                                matchingAttachment = noticeAttachments.firstOrNull { att ->
                                    val cleanAtt = att.fileName.replace("...", "").trim().lowercase()
                                    cleanAtt == cleanActive || cleanAtt.contains(cleanActive) || cleanActive.contains(cleanAtt)
                                }
                            }
                            // 2. If no name match, link to first unlinked attachment belonging to this active notice
                            if (matchingAttachment == null) {
                                matchingAttachment = noticeAttachments.firstOrNull { it.localUri.isBlank() }
                            }
                            if (matchingAttachment != null) {
                                CrawlerTraceLogger.log(
                                    "SHARE_INGEST",
                                    "Deterministically matched shared file \"$safeFileName\" to active notice $activeNoticeId attachment \"${matchingAttachment.fileName}\""
                                )
                            }
                        }
                    }

                    if (matchingAttachment == null) {
                        val allAttachments = db.attachmentDao().getAllAttachmentsDirect()

                        // Match against pending attachment entities by normalized filename or prefix
                        val targetBaseName = safeFileName.substringBeforeLast('.').lowercase()
                        val targetExtension = safeFileName.substringAfterLast('.', "").lowercase()
                        val normalizedTargetBaseName = normalizeForMatching(targetBaseName)

                        // Prioritize attachment entities that currently lack a local file
                        val unlinkedAttachments = allAttachments.filter { it.localUri.isBlank() }
                        val candidatePool = if (unlinkedAttachments.isNotEmpty()) unlinkedAttachments else allAttachments

                        val matchingCandidates = candidatePool.filter { attachmentEntity ->
                            val cleanExpected = attachmentEntity.fileName.replace("...", "").trim().lowercase()
                            val expectedBaseName = cleanExpected.substringBeforeLast('.')
                            val expectedExtension = cleanExpected.substringAfterLast('.', "")
                            val normalizedExpectedBaseName = normalizeForMatching(expectedBaseName)

                            val isExtensionCompatible = expectedExtension.isBlank() || targetExtension.isBlank() || expectedExtension == targetExtension
                            if (!isExtensionCompatible) return@filter false

                            val targetDigits = Regex("\\d+").findAll(normalizedTargetBaseName).map { it.value }.toList()
                            val expectedDigits = Regex("\\d+").findAll(normalizedExpectedBaseName).map { it.value }.toList()
                            val isDigitsCompatible = targetDigits == expectedDigits

                            // 1. Direct or normalized match
                            if (expectedBaseName == targetBaseName || normalizedExpectedBaseName == normalizedTargetBaseName) return@filter true

                            // 2. Substantial prefix match (strictly requiring matching digits)
                            if (isDigitsCompatible && normalizedExpectedBaseName.length >= MIN_PREFIX_MATCH_LENGTH && normalizedTargetBaseName.startsWith(normalizedExpectedBaseName)) return@filter true
                            if (isDigitsCompatible && normalizedTargetBaseName.length >= MIN_PREFIX_MATCH_LENGTH && normalizedExpectedBaseName.startsWith(normalizedTargetBaseName)) return@filter true

                            // 3. Substring containment (strictly requiring matching digits and tight length bounds)
                            if (isDigitsCompatible && Math.abs(normalizedTargetBaseName.length - normalizedExpectedBaseName.length) <= 4 &&
                                (normalizedTargetBaseName.contains(normalizedExpectedBaseName) || normalizedExpectedBaseName.contains(normalizedTargetBaseName))) return@filter true

                            false
                        }

                        matchingAttachment = when {
                            matchingCandidates.size == 1 -> matchingCandidates.first()
                            matchingCandidates.size > 1 -> {
                                val fileLastModified = queryFileLastModified(resolver, uri)
                                if (fileLastModified != null && fileLastModified > 0L) {
                                    var bestCandidate: com.kids.collector.data.db.AttachmentEntity? = null
                                    var minDiff = Long.MAX_VALUE
                                    for (cand in matchingCandidates) {
                                        val parentNotice = db.noticeDao().findById(cand.noticeId)
                                        if (parentNotice != null) {
                                            val diff = Math.abs(parentNotice.timestampMs - fileLastModified)
                                            if (diff < minDiff) {
                                                minDiff = diff
                                                bestCandidate = cand
                                            }
                                        }
                                    }
                                    bestCandidate ?: matchingCandidates.first()
                                } else {
                                    matchingCandidates.first()
                                }
                            }
                            else -> if (unlinkedAttachments.size == 1) {
                                val singleAttachment = unlinkedAttachments.first()
                                val cleanExpected = singleAttachment.fileName.replace("...", "").trim().lowercase()
                                val expectedExtension = cleanExpected.substringAfterLast('.', "")
                                if (expectedExtension.isBlank() || targetExtension.isBlank() || expectedExtension == targetExtension) singleAttachment else null
                            } else null
                        }
                    }

                    if (matchingAttachment != null) {
                        db.attachmentDao().updateLocalFile(
                            attachmentId = matchingAttachment.attachmentId,
                            localUri = stagedFile.absolutePath,
                            sizeBytes = stagedFile.length(),
                            fileHash = fileHash
                        )
                        CrawlerTraceLogger.log(
                            "SHARE_INGEST",
                            "Linked shared attachment \"$safeFileName\" (${stagedFile.length()} bytes) to attachment ${matchingAttachment.attachmentId.take(8)}"
                        )
                    } else {
                        // File does not match pre-indexed attachment:
                        // Represents a file inside a shared Google Drive folder or linked announcement across any platform
                        val folderName = GoogleDriveSharedHarvester.activeHarvestingFolderName
                        val fileLastModified = queryFileLastModified(resolver, uri) ?: System.currentTimeMillis()

                        val allNotices = db.noticeDao().getAllNoticesDirect()
                        var targetNotice = if (!folderName.isNullOrBlank()) {
                            allNotices.firstOrNull { notice ->
                                notice.title.contains(folderName, ignoreCase = true) ||
                                notice.body.contains(folderName, ignoreCase = true)
                            }
                        } else null

                        if (targetNotice == null && allNotices.isNotEmpty()) {
                            targetNotice = allNotices.minByOrNull { Math.abs(it.timestampMs - fileLastModified) }
                        }

                        val child = db.childProfileDao().getAllChildrenDirect().firstOrNull()
                        val childId = child?.childId ?: "child_default"

                        val finalNoticeId = if (targetNotice != null && Math.abs(targetNotice.timestampMs - fileLastModified) < 30L * 86400000L) {
                            targetNotice.noticeId
                        } else {
                            val noticeTitle = if (!folderName.isNullOrBlank()) "Shared Folder: $folderName" else "Google Drive Shared Resources"
                            val newNoticeId = UUID.randomUUID().toString()
                            val newNotice = NoticeEntity(
                                noticeId = newNoticeId,
                                childId = childId,
                                sourceApp = "com.google.android.apps.docs",
                                category = "HOMEWORK",
                                title = noticeTitle,
                                body = "Educational materials harvested from Google Drive Shared Folder \"${folderName ?: "Shared with me"}\".",
                                sender = "Google Drive",
                                timestampMs = fileLastModified,
                                hashSha256 = "${childId}_drive_folder_${folderName}_$fileLastModified".hashCode().toString(),
                                syncStatus = SyncStatus.PENDING.name,
                                driveFileId = null,
                                attachmentCount = 1
                            )
                            db.noticeDao().insert(newNotice)
                            newNoticeId
                        }

                        val newAtt = AttachmentEntity(
                            attachmentId = UUID.randomUUID().toString(),
                            noticeId = finalNoticeId,
                            fileName = safeFileName.take(200),
                            localUri = stagedFile.absolutePath,
                            mimeType = when {
                                safeFileName.endsWith(".pdf", true) -> "application/pdf"
                                safeFileName.matches(Regex(".*\\.(jpg|jpeg|png|gif|webp|bmp|svg)$", RegexOption.IGNORE_CASE)) -> "image/jpeg"
                                safeFileName.matches(Regex(".*\\.(mp3|m4a|wav|aac|ogg|wma|flac)$", RegexOption.IGNORE_CASE)) -> "audio/mpeg"
                                safeFileName.matches(Regex(".*\\.(mp4|mov|avi|mkv|webm|3gp)$", RegexOption.IGNORE_CASE)) -> "video/mp4"
                                safeFileName.matches(Regex(".*\\.(docx?|rtf|txt|epub)$", RegexOption.IGNORE_CASE)) -> "application/msword"
                                safeFileName.matches(Regex(".*\\.(xlsx?|csv)$", RegexOption.IGNORE_CASE)) -> "application/vnd.ms-excel"
                                safeFileName.matches(Regex(".*\\.(pptx?)$", RegexOption.IGNORE_CASE)) -> "application/vnd.ms-powerpoint"
                                safeFileName.matches(Regex(".*\\.(zip|rar|7z)$", RegexOption.IGNORE_CASE)) -> "application/zip"
                                else -> "application/octet-stream"
                            },
                            sizeBytes = stagedFile.length(),
                            fileHash = fileHash,
                            ocrText = null,
                            pageCount = 1,
                            driveFileId = null,
                            syncStatus = SyncStatus.PENDING.name
                        )
                        db.attachmentDao().insert(newAtt)

                        val count = db.attachmentDao().getAttachmentsForNotice(finalNoticeId).size
                        val parentNotice = db.noticeDao().findById(finalNoticeId)
                        if (parentNotice != null) {
                            db.noticeDao().update(parentNotice.copy(attachmentCount = count))
                        }

                        CrawlerTraceLogger.log(
                            "SHARE_INGEST",
                            "Created and staged attachment \"$safeFileName\" (${stagedFile.length()} bytes) under notice $finalNoticeId (folder: $folderName)"
                        )
                    }

                    // Trigger immediate Drive sync
                    val constraints = Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                    val syncRequest = OneTimeWorkRequestBuilder<DriveSyncWorker>()
                        .setConstraints(constraints)
                        .build()
                    WorkManager.getInstance(appContext).enqueueUniqueWork(
                        "DriveVaultSyncWork",
                        ExistingWorkPolicy.APPEND_OR_REPLACE,
                        syncRequest
                    )
                }
            } catch (e: Exception) {
                CrawlerTraceLogger.log("SHARE_INGEST", "Failed processing shared URI: ${e.message}")
            }
    }

    private fun queryFileName(uri: Uri): String? {
        var name: String? = null
        if (uri.scheme == "content") {
            try {
                contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        val displayNameColumnIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                        if (displayNameColumnIndex >= 0) {
                            name = cursor.getString(displayNameColumnIndex)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error querying display name: ${e.message}")
            }
        }
        if (name.isNullOrBlank()) {
            name = uri.lastPathSegment
        }
        return name
    }

    private fun queryFileLastModified(resolver: android.content.ContentResolver, uri: Uri): Long? {
        return try {
            resolver.query(uri, null, null, null, null)?.use { cursor ->
                val colIndex = cursor.getColumnIndex("last_modified")
                val altIndex = if (colIndex == -1) cursor.getColumnIndex(android.provider.DocumentsContract.Document.COLUMN_LAST_MODIFIED) else colIndex
                if (altIndex != -1 && cursor.moveToFirst()) {
                    cursor.getLong(altIndex)
                } else null
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun normalizeForMatching(input: String): String {
        return input.lowercase().replace(NON_ALPHANUMERIC_REGEX, "")
    }
}
