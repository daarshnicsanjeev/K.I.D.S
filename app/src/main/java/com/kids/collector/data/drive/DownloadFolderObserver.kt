package com.kids.collector.data.drive

import android.content.Context
import android.os.Environment
import android.util.Log
import com.kids.collector.data.db.KidsDatabase
import com.kids.collector.domain.dedupe.DeduplicationEngine
import com.kids.collector.service.CrawlerTraceLogger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Autonomous scanner for local storage (Downloads and WhatsApp Media).
 * Automatically links downloaded physical files (PDFs, images, worksheets)
 * with pending AttachmentEntity records in SQLite so they can be synced
 * to the child's Google Drive vault.
 */
object DownloadFolderObserver {
    private const val TAG = "DownloadFolderObserver"
    private val SHARED_PREFIX_REGEX = Regex("^shared_\\d+_")
    private val HASH_PREFIX_REGEX = Regex("^[a-f0-9]{8}_")
    private val NON_ALPHANUMERIC_REGEX = Regex("[^a-z0-9]")
    private const val MIN_PREFIX_MATCH_LENGTH = 6
    private const val PREFIX_SLICE_LENGTH = 12
    private const val MIN_SUBSTRING_MATCH_LENGTH = 8

    private val deduplicationEngine = DeduplicationEngine()

    suspend fun scanLocalAttachments(context: Context): Int = withContext(Dispatchers.IO) {
        var matchedCount = 0
        try {
            val db = KidsDatabase.getInstance(context)
            val allAttachments = db.attachmentDao().getAllAttachmentsDirect()

            val pendingAttachments = allAttachments.filter {
                (it.driveFileId.isNullOrBlank() || it.driveFileId.startsWith("virtual_")) &&
                (it.localUri.isBlank() || !File(it.localUri).exists())
            }

            val alreadySyncedAttachments = allAttachments.filter {
                !it.driveFileId.isNullOrBlank() && !it.driveFileId.startsWith("virtual_")
            }

            if (pendingAttachments.isEmpty() && alreadySyncedAttachments.isEmpty()) {
                CrawlerTraceLogger.log("DOWNLOAD_SCAN", "No attachments registered in database.")
                return@withContext 0
            }

            val stagingDir = File(context.getExternalFilesDir(null), "vault_attachments").apply {
                if (!exists()) mkdirs()
            }

            val candidateDirs = mutableListOf<File>()

            // 0. Private staging directory (for shared attachments received via Share Sheet)
            if (stagingDir.exists()) {
                candidateDirs.add(stagingDir)
            }

            // 1. Standard Downloads directory
            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            if (downloadsDir != null && downloadsDir.exists()) {
                candidateDirs.add(downloadsDir)
                val classroomSubdir = File(downloadsDir, "Classroom")
                if (classroomSubdir.exists()) candidateDirs.add(classroomSubdir)
            }

            // 2. Documents directory
            val documentsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS)
            if (documentsDir != null && documentsDir.exists()) {
                candidateDirs.add(documentsDir)
                val classroomDocs = File(documentsDir, "Classroom")
                if (classroomDocs.exists()) candidateDirs.add(classroomDocs)
            }

            // 3. WhatsApp Documents & Images (if accessible)
            val externalStorage = Environment.getExternalStorageDirectory()
            if (externalStorage != null && externalStorage.exists()) {
                val waDocs = File(externalStorage, "Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Documents")
                if (waDocs.exists()) candidateDirs.add(waDocs)
                val waImages = File(externalStorage, "Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images")
                if (waImages.exists()) candidateDirs.add(waImages)
            }

            CrawlerTraceLogger.log(
                "DOWNLOAD_SCAN",
                "Scanning ${candidateDirs.size} storage folders for ${pendingAttachments.size} pending attachments (${alreadySyncedAttachments.size} already synced)..."
            )

            for (dir in candidateDirs) {
                val files = dir.listFiles() ?: continue
                val isStagingDir = dir.absolutePath == stagingDir.absolutePath
                val isPublicDownloadDir = !isStagingDir && (
                        dir.absolutePath.contains("Download", ignoreCase = true) ||
                        dir.absolutePath.contains("Documents", ignoreCase = true)
                )

                for (file in files) {
                    if (file.isDirectory || file.length() == 0L) continue
                    val fileName = file.name.lowercase()
                    val fileExt = file.extension.lowercase()
                    val fileBaseName = file.nameWithoutExtension.lowercase()
                    val cleanFileBaseName = fileBaseName
                        .replace(SHARED_PREFIX_REGEX, "")
                        .replace(HASH_PREFIX_REGEX, "")
                    val normalizedFileBaseName = cleanFileBaseName.replace(NON_ALPHANUMERIC_REGEX, "")

                    // A. Check against pending attachments needing a local file
                    var hasMatchedPendingAttachment = false
                    for (pendingAttachment in pendingAttachments) {
                        val rawExpected = pendingAttachment.fileName.trim().lowercase()
                        val cleanExpected = rawExpected.replace("...", "").trim()
                        if (cleanExpected.isBlank()) continue

                        val expectedExtension = cleanExpected.substringAfterLast('.', "")
                        val isExtensionCompatible = fileExt.isNotBlank() && (expectedExtension.isBlank() || fileExt == expectedExtension)
                        val expectedBaseName = cleanExpected.substringBeforeLast('.').lowercase()
                        val normalizedExpectedBaseName = expectedBaseName.replace(NON_ALPHANUMERIC_REGEX, "")

                        // Robust normalized matching: tolerates spaces vs underscores, hyphens, and truncations
                        val isMatch = isExtensionCompatible && (
                            fileBaseName == expectedBaseName ||
                            cleanFileBaseName == expectedBaseName ||
                            normalizedFileBaseName == normalizedExpectedBaseName ||
                            (normalizedFileBaseName.length >= MIN_PREFIX_MATCH_LENGTH && normalizedExpectedBaseName.startsWith(normalizedFileBaseName.take(PREFIX_SLICE_LENGTH))) ||
                            (normalizedExpectedBaseName.length >= MIN_PREFIX_MATCH_LENGTH && normalizedFileBaseName.startsWith(normalizedExpectedBaseName.take(PREFIX_SLICE_LENGTH))) ||
                            (normalizedFileBaseName.length >= MIN_SUBSTRING_MATCH_LENGTH && normalizedExpectedBaseName.contains(normalizedFileBaseName)) ||
                            (normalizedExpectedBaseName.length >= MIN_SUBSTRING_MATCH_LENGTH && normalizedFileBaseName.contains(normalizedExpectedBaseName))
                        )

                        if (isMatch) {
                            val targetFile = if (isStagingDir) {
                                file
                            } else if (isPublicDownloadDir) {
                                // Sanitize leaf filename and avoid directory traversal
                                val safeName = file.name.replace(Regex("[^a-zA-Z0-9._-]"), "_")
                                val stagedName = "${pendingAttachment.attachmentId.take(8)}_$safeName"
                                val destinationFile = File(stagingDir, stagedName)

                                // Assert canonical path boundary
                                if (!destinationFile.canonicalPath.startsWith(stagingDir.canonicalPath + File.separator)) {
                                    Log.e(TAG, "Path traversal attempt blocked for: ${file.name}")
                                    continue
                                }

                                val isFileRelocatedSuccessfully = try {
                                    if (file.renameTo(destinationFile)) {
                                        true
                                    } else {
                                        file.copyTo(destinationFile, overwrite = true)
                                        file.delete()
                                        true
                                    }
                                } catch (e: Exception) {
                                    Log.w(TAG, "Failed moving ${file.name} to staging: ${e.message}")
                                    false
                                }
                                if (isFileRelocatedSuccessfully && destinationFile.exists()) destinationFile else file
                            } else {
                                // Keep WhatsApp files intact in their original chat location
                                file
                            }

                            val hash = deduplicationEngine.computeFileHash(targetFile)
                            db.attachmentDao().updateLocalFile(
                                attachmentId = pendingAttachment.attachmentId,
                                localUri = targetFile.absolutePath,
                                sizeBytes = targetFile.length(),
                                fileHash = hash
                            )
                            matchedCount++
                            hasMatchedPendingAttachment = true
                            CrawlerTraceLogger.log(
                                if (isStagingDir) "STAGING_LINK" else "DOWNLOAD_MOVE",
                                if (isStagingDir) {
                                    "Linked staged attachment \"${file.name}\" (${targetFile.length()} bytes) -> attachment ${pendingAttachment.attachmentId.take(8)}"
                                } else {
                                    "Moved \"${file.name}\" out of public storage into private vault staging (${targetFile.length()} bytes) -> linked to attachment ${pendingAttachment.attachmentId.take(8)}"
                                }
                            )
                            break
                        }
                    }

                    // B. If not pending, check if it is an already-synced file lingering in public storage
                    if (!hasMatchedPendingAttachment && isPublicDownloadDir && !isStagingDir) {
                        for (syncedAtt in alreadySyncedAttachments) {
                            val expected = syncedAtt.fileName.trim().lowercase()
                            if (expected.isBlank()) continue

                            val expectedExt = expected.substringAfterLast('.', "")
                            val isExtensionCompatible = fileExt.isNotBlank() && (expectedExt.isBlank() || fileExt == expectedExt)
                            val expectedBaseName = expected.substringBeforeLast('.').lowercase()

                            // Strict match for cleanup: only delete if exact name or full prefix matches
                            val isCleanMatch = isExtensionCompatible && (
                                fileBaseName == expectedBaseName ||
                                fileName == expected
                            )

                            if (isCleanMatch) {
                                try {
                                    if (file.delete()) {
                                        CrawlerTraceLogger.log(
                                            "DOWNLOAD_CLEANUP",
                                            "Cleaned up already-synced file \"${file.name}\" from public storage folder"
                                        )
                                    }
                                } catch (e: Exception) {
                                    Log.w(TAG, "Failed to delete already synced file: ${e.message}")
                                }
                                break
                            }
                        }
                    }
                }
            }
            CrawlerTraceLogger.log("DOWNLOAD_SCAN", "Scan finished: Staged $matchedCount local files.")
        } catch (e: Exception) {
            Log.e(TAG, "Error scanning local attachment folders", e)
            CrawlerTraceLogger.log("DOWNLOAD_SCAN_ERROR", "Error scanning local folders: ${e.message}")
        }
        return@withContext matchedCount
    }
}
