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

            // 2. WhatsApp Documents & Images (if accessible)
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
                val isPublicDownloadDir = dir.absolutePath.contains("Download", ignoreCase = true)

                for (file in files) {
                    if (file.isDirectory || file.length() == 0L) continue
                    val fileName = file.name.lowercase()

                    // A. Check against pending attachments needing a local file
                    var matchedPending = false
                    for (att in pendingAttachments) {
                        val expected = att.fileName.trim().lowercase()
                        if (expected.isBlank()) continue

                        // Match full filename or core name prefix
                        val isMatch = fileName == expected ||
                                fileName.contains(expected) ||
                                expected.contains(fileName) ||
                                (expected.length > 8 && fileName.contains(expected.take(15)))

                        if (isMatch) {
                            val targetFile = if (isPublicDownloadDir) {
                                // Move out of public Downloads into private app staging to prevent clutter
                                val destFile = File(stagingDir, file.name)
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
                                "Moved \"${file.name}\" out of public Downloads into private vault staging (${targetFile.length()} bytes) -> linked to attachment ${att.attachmentId.take(8)}"
                            )
                            break
                        }
                    }

                    // B. If not pending, check if it is an already-synced file lingering in public Downloads
                    if (!matchedPending && isPublicDownloadDir) {
                        for (syncedAtt in alreadySyncedAttachments) {
                            val expected = syncedAtt.fileName.trim().lowercase()
                            if (expected.isBlank()) continue

                            val isMatch = fileName == expected ||
                                    fileName.contains(expected) ||
                                    expected.contains(fileName) ||
                                    (expected.length > 8 && fileName.contains(expected.take(15)))

                            if (isMatch) {
                                try {
                                    if (file.delete()) {
                                        CrawlerTraceLogger.log(
                                            "DOWNLOAD_CLEANUP",
                                            "Cleaned up already-synced file \"${file.name}\" from public Downloads folder"
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
