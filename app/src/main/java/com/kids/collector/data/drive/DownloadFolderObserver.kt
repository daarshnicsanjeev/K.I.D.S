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
            val pendingAttachments = db.attachmentDao().getAllAttachmentsDirect()
                .filter { it.localUri.isBlank() || !File(it.localUri).exists() }

            if (pendingAttachments.isEmpty()) {
                CrawlerTraceLogger.log("DOWNLOAD_SCAN", "No pending attachments awaiting local files.")
                return@withContext 0
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

            CrawlerTraceLogger.log("DOWNLOAD_SCAN", "Scanning ${candidateDirs.size} storage folders for ${pendingAttachments.size} pending attachments...")

            for (dir in candidateDirs) {
                val files = dir.listFiles() ?: continue
                for (file in files) {
                    if (file.isDirectory || file.length() == 0L) continue
                    val fileName = file.name.lowercase()

                    for (att in pendingAttachments) {
                        val expected = att.fileName.trim().lowercase()
                        if (expected.isBlank()) continue

                        // Match full filename or core name prefix
                        val isMatch = fileName == expected ||
                                fileName.contains(expected) ||
                                expected.contains(fileName) ||
                                (expected.length > 8 && fileName.contains(expected.take(15)))

                        if (isMatch) {
                            val hash = deduplicationEngine.computeFileHash(file)
                            db.attachmentDao().updateLocalFile(
                                attachmentId = att.attachmentId,
                                localUri = file.absolutePath,
                                sizeBytes = file.length(),
                                fileHash = hash
                            )
                            matchedCount++
                            CrawlerTraceLogger.log(
                                "ATTACHMENT_MATCHED",
                                "Found local file on device: \"${file.name}\" (${file.length()} bytes) -> linked to attachment ${att.attachmentId.take(8)}"
                            )
                            break
                        }
                    }
                }
            }
            CrawlerTraceLogger.log("DOWNLOAD_SCAN", "Scan finished: Matched $matchedCount local files.")
        } catch (e: Exception) {
            Log.e(TAG, "Error scanning local attachment folders", e)
            CrawlerTraceLogger.log("DOWNLOAD_SCAN_ERROR", "Error scanning local folders: ${e.message}")
        }
        return@withContext matchedCount
    }
}
