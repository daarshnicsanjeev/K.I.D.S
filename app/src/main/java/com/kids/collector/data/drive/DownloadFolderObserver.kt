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
                val isPublicDownloadDir = dir.absolutePath.contains("Download", ignoreCase = true) ||
                        dir.absolutePath.contains("Documents", ignoreCase = true)

                for (file in files) {
                    if (file.isDirectory || file.length() == 0L) continue
                    val fileName = file.name.lowercase()
                    val fileExt = file.extension.lowercase()
                    val fileBaseName = file.nameWithoutExtension.lowercase()

                    // A. Check against pending attachments needing a local file
                    var matchedPending = false
                    for (att in pendingAttachments) {
                        val rawExpected = att.fileName.trim().lowercase()
                        val cleanExpected = rawExpected.replace("...", "").trim()
                        if (cleanExpected.isBlank()) continue

                        val expectedExt = cleanExpected.substringAfterLast('.', "")
                        val isExtensionCompatible = fileExt.isNotBlank() && (expectedExt.isBlank() || fileExt == expectedExt)
                        val expectedBaseName = cleanExpected.substringBeforeLast('.').lowercase()

                        // Strict, safe matching: requires matching extension and either exact name or substantial prefix (>= 8 chars)
                        val isMatch = isExtensionCompatible && (
                            fileBaseName == expectedBaseName ||
                            fileName == cleanExpected ||
                            (fileBaseName.length >= 8 && fileBaseName.startsWith(expectedBaseName.take(15))) ||
                            (expectedBaseName.length >= 8 && expectedBaseName.startsWith(fileBaseName.take(15)))
                        )

                        if (isMatch) {
                            val targetFile = if (isPublicDownloadDir) {
                                // Sanitize leaf filename and avoid directory traversal
                                val safeName = file.name.replace(Regex("[^a-zA-Z0-9._-]"), "_")
                                val stagedName = "${att.attachmentId.take(8)}_$safeName"
                                val destFile = File(stagingDir, stagedName)

                                // Assert canonical path boundary
                                if (!destFile.canonicalPath.startsWith(stagingDir.canonicalPath + File.separator)) {
                                    Log.e(TAG, "Path traversal attempt blocked for: ${file.name}")
                                    continue
                                }

                                val moved = try {
                                    if (file.renameTo(destFile)) {
                                        true
                                    } else {
                                        file.copyTo(destFile, overwrite = true)
                                        file.delete()
                                        true
                                    }
                                } catch (e: Exception) {
                                    Log.w(TAG, "Failed moving ${file.name} to staging: ${e.message}")
                                    false
                                }
                                if (moved && destFile.exists()) destFile else file
                            } else {
                                // Keep WhatsApp files intact in their original chat location
                                file
                            }

                            val hash = deduplicationEngine.computeFileHash(targetFile)
                            db.attachmentDao().updateLocalFile(
                                attachmentId = att.attachmentId,
                                localUri = targetFile.absolutePath,
                                sizeBytes = targetFile.length(),
                                fileHash = hash
                            )
                            matchedCount++
                            matchedPending = true
                            CrawlerTraceLogger.log(
                                "DOWNLOAD_MOVE",
                                "Moved \"${file.name}\" out of public storage into private vault staging (${targetFile.length()} bytes) -> linked to attachment ${att.attachmentId.take(8)}"
                            )
                            break
                        }
                    }

                    // B. If not pending, check if it is an already-synced file lingering in public storage
                    if (!matchedPending && isPublicDownloadDir) {
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
