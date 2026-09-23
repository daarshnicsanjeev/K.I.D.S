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
import com.kids.collector.data.db.KidsDatabase
import com.kids.collector.domain.dedupe.DeduplicationEngine
import com.kids.collector.service.CrawlerTraceLogger
import com.kids.collector.service.DriveSyncWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream

/**
 * Silent, transparent Share Target Activity.
 * Receives shared attachments directly from Android's system share sheet (e.g. when shared
 * from Google Classroom / Docs / Drive viewer) and stages them into private vault storage
 * without displaying any intrusive UI to the user.
 */
class ShareTargetActivity : Activity() {

    companion object {
        private const val TAG = "ShareTargetActivity"
    }

    private val deduplicationEngine = DeduplicationEngine()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            when (intent?.action) {
                Intent.ACTION_SEND -> {
                    val uri = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
                    if (uri != null) {
                        processIncomingUri(uri)
                    } else {
                        finish()
                    }
                }
                Intent.ACTION_SEND_MULTIPLE -> {
                    val uris = intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)
                    if (!uris.isNullOrEmpty()) {
                        for (u in uris) {
                            processIncomingUri(u)
                        }
                    }
                    finish()
                }
                else -> finish()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling incoming share intent: ${e.message}", e)
            finish()
        }
    }

    private fun processIncomingUri(uri: Uri) {
        val appCtx = applicationContext
        // Launch in background so we don't block the caller or cause ANR
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val resolvedFileName = queryFileName(uri) ?: "attachment_${System.currentTimeMillis()}.pdf"
                val safeFileName = resolvedFileName.replace(Regex("[^a-zA-Z0-9._-]"), "_")

                val stagingDir = File(appCtx.getExternalFilesDir(null), "vault_attachments").apply {
                    if (!exists()) mkdirs()
                }

                // Deterministic staged file prefix
                val stagedFile = File(stagingDir, "shared_${System.currentTimeMillis().toString().takeLast(6)}_$safeFileName")

                appCtx.contentResolver.openInputStream(uri)?.use { input ->
                    FileOutputStream(stagedFile).use { output ->
                        input.copyTo(output)
                    }
                }

                if (stagedFile.exists() && stagedFile.length() > 0L) {
                    val fileHash = deduplicationEngine.computeFileHash(stagedFile)
                    val db = KidsDatabase.getInstance(appCtx)
                    val allAtts = db.attachmentDao().getAllAttachmentsDirect()

                    // Match against pending attachment entities by filename or prefix
                    val targetBaseName = safeFileName.substringBeforeLast('.').lowercase()
                    val targetExt = safeFileName.substringAfterLast('.', "").lowercase()

                    val matchingAtt = allAtts.firstOrNull { att ->
                        val cleanExpected = att.fileName.replace("...", "").trim().lowercase()
                        val expBase = cleanExpected.substringBeforeLast('.')
                        val expExt = cleanExpected.substringAfterLast('.', "")
                        (expExt.isBlank() || expExt == targetExt) &&
                                (expBase == targetBaseName ||
                                        (expBase.length >= 8 && targetBaseName.startsWith(expBase.take(15))) ||
                                        (targetBaseName.length >= 8 && expBase.startsWith(targetBaseName.take(15))))
                    }

                    if (matchingAtt != null) {
                        db.attachmentDao().updateLocalFile(
                            attachmentId = matchingAtt.attachmentId,
                            localUri = stagedFile.absolutePath,
                            sizeBytes = stagedFile.length(),
                            fileHash = fileHash
                        )
                        CrawlerTraceLogger.log(
                            "SHARE_INGEST",
                            "Linked shared attachment \"$safeFileName\" (${stagedFile.length()} bytes) to attachment ${matchingAtt.attachmentId.take(8)}"
                        )
                    } else {
                        CrawlerTraceLogger.log(
                            "SHARE_INGEST",
                            "Captured unlinked shared attachment \"$safeFileName\" (${stagedFile.length()} bytes) in staging."
                        )
                    }

                    // Trigger immediate Drive sync
                    val constraints = Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                    val syncRequest = OneTimeWorkRequestBuilder<DriveSyncWorker>()
                        .setConstraints(constraints)
                        .build()
                    WorkManager.getInstance(appCtx).enqueueUniqueWork(
                        "DriveVaultSyncWork",
                        ExistingWorkPolicy.APPEND_OR_REPLACE,
                        syncRequest
                    )
                }
            } catch (e: Exception) {
                CrawlerTraceLogger.log("SHARE_INGEST", "Failed processing shared URI: ${e.message}")
            }
        }
        finish()
    }

    private fun queryFileName(uri: Uri): String? {
        var name: String? = null
        if (uri.scheme == "content") {
            try {
                contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                        if (idx >= 0) {
                            name = cursor.getString(idx)
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
}
