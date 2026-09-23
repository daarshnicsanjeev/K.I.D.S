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
import kotlinx.coroutines.withContext
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
        kotlinx.coroutines.cancel(activityScope)
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
                        finish()
                    }
                }
                Intent.ACTION_SEND_MULTIPLE -> {
                    val uris = intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)
                    if (!uris.isNullOrEmpty()) {
                        processIncomingUris(uris)
                    } else {
                        finish()
                    }
                }
                else -> finish()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling incoming share intent: ${e.message}", e)
            finish()
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
                    finish()
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
                    val allAttachments = db.attachmentDao().getAllAttachmentsDirect()

                    // Match against pending attachment entities by normalized filename or prefix
                    val targetBaseName = safeFileName.substringBeforeLast('.').lowercase()
                    val targetExtension = safeFileName.substringAfterLast('.', "").lowercase()
                    val normalizedTargetBaseName = normalizeForMatching(targetBaseName)

                    // Prioritize attachment entities that currently lack a local file
                    val unlinkedAttachments = allAttachments.filter { it.localUri.isBlank() }
                    val candidatePool = if (unlinkedAttachments.isNotEmpty()) unlinkedAttachments else allAttachments

                    val matchingAttachment = candidatePool.firstOrNull { attachmentEntity ->
                        val cleanExpected = attachmentEntity.fileName.replace("...", "").trim().lowercase()
                        val expectedBaseName = cleanExpected.substringBeforeLast('.')
                        val expectedExtension = cleanExpected.substringAfterLast('.', "")
                        val normalizedExpectedBaseName = normalizeForMatching(expectedBaseName)

                        val isExtensionCompatible = expectedExtension.isBlank() || targetExtension.isBlank() || expectedExtension == targetExtension
                        if (!isExtensionCompatible) return@firstOrNull false

                        // 1. Direct or normalized match
                        if (expectedBaseName == targetBaseName || normalizedExpectedBaseName == normalizedTargetBaseName) return@firstOrNull true

                        // 2. Substantial prefix match
                        if (normalizedExpectedBaseName.length >= MIN_PREFIX_MATCH_LENGTH && normalizedTargetBaseName.startsWith(normalizedExpectedBaseName.take(PREFIX_SLICE_LENGTH))) return@firstOrNull true
                        if (normalizedTargetBaseName.length >= MIN_PREFIX_MATCH_LENGTH && normalizedExpectedBaseName.startsWith(normalizedTargetBaseName.take(PREFIX_SLICE_LENGTH))) return@firstOrNull true

                        // 3. Substring containment
                        if (normalizedExpectedBaseName.length >= MIN_SUBSTRING_MATCH_LENGTH && normalizedTargetBaseName.contains(normalizedExpectedBaseName)) return@firstOrNull true
                        if (normalizedTargetBaseName.length >= MIN_SUBSTRING_MATCH_LENGTH && normalizedExpectedBaseName.contains(normalizedTargetBaseName)) return@firstOrNull true

                        false
                    } ?: if (unlinkedAttachments.size == 1) {
                        // Fallback: Exactly 1 attachment is awaiting a local file with compatible extension
                        val singleAttachment = unlinkedAttachments.first()
                        val cleanExpected = singleAttachment.fileName.replace("...", "").trim().lowercase()
                        val expectedExtension = cleanExpected.substringAfterLast('.', "")
                        if (expectedExtension.isBlank() || targetExtension.isBlank() || expectedExtension == targetExtension) singleAttachment else null
                    } else null

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

    private fun normalizeForMatching(input: String): String {
        return input.lowercase().replace(NON_ALPHANUMERIC_REGEX, "")
    }
}
