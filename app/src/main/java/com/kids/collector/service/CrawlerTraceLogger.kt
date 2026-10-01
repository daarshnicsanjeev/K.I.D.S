package com.kids.collector.service

import android.content.Context
import android.util.Log
import kotlinx.coroutines.*
import java.io.File
import java.io.FileWriter
import java.io.PrintWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * High-fidelity, zero-truncation diagnostic telemetry logger for the Accessibility notice scroller/crawler.
 *
 * Captures granular step-by-step diagnostic traces:
 * - Scroller lifecycle and gestures (swipe coordinates, density, durations, status)
 * - Accessibility node traversals, text extraction, contentDescription checks
 * - Ingestion & classification acceptance/rejection decisions (with reason)
 * - Full attachment discovery, download, and verification events
 * - WorkManager dispatch and Google Drive sync status
 *
 * Every event is:
 * 1. Logged to Android Logcat (TAG: CrawlerTraceLogger)
 * 2. Appended immediately to persistent local storage on disk (zero data loss across crashes or memory pressure)
 * 3. Enqueued in a high-capacity memory buffer (up to 5,000 lines) for periodic upload to Google Drive Vault:
 *    G:\My Drive\K.I.D.S. Data\{AcademicYear}\{ChildName}\_system\logs\crawler_trace.log
 */
object CrawlerTraceLogger {
    private const val TAG = "CrawlerTraceLogger"
    private val memoryQueue = ConcurrentLinkedQueue<String>()
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US)

    @Volatile
    private var appContext: Context? = null
    private val fileLock = Any()
    private val EMAIL_REGEX = Regex("""([a-zA-Z0-9_.+-])[a-zA-Z0-9_.+-]*@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)""")

    fun maskPii(message: String): String {
        return message.replace(EMAIL_REGEX) { match ->
            val firstChar = match.groupValues[1]
            val domain = match.groupValues[2]
            "$firstChar***@$domain"
        }
    }

    /**
     * Initializes the logger with the application context to enable immediate disk streaming.
     */
    fun init(context: Context) {
        appContext = context.applicationContext
    }

    fun log(category: String, message: String) {
        val timestamp = dateFormat.format(Date())
        val sanitized = maskPii(message)
        val formatted = "[$timestamp] [$category] $sanitized"
        try {
            Log.i(TAG, formatted)
        } catch (_: Throwable) {
            println(formatted)
        }
        memoryQueue.offer(formatted)

        // Keep high-capacity queue (up to 5,000 lines per run) to never drop survey/rewind milestones
        while (memoryQueue.size > 5000) {
            memoryQueue.poll()
        }

        // Stream immediately to local persistent disk file so logs survive crashes and service interruptions
        appContext?.let { ctx ->
            try {
                synchronized(fileLock) {
                    val logDir = File(ctx.filesDir, "logs")
                    if (!logDir.exists()) logDir.mkdirs()
                    val traceFile = File(logDir, "crawler_trace.log")
                    PrintWriter(FileWriter(traceFile, true)).use { out ->
                        out.println(formatted)
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed immediate disk write for trace line: ${e.message}")
            }
        }
    }

    // =========================================================================
    // STRUCTURED MILESTONE HELPERS
    // =========================================================================

    fun logSurveyStart(topNoticeTitle: String) {
        log("SURVEY_START", "=== PASS 1: STREAM SURVEY STARTED === Top Landmark: \"$topNoticeTitle\"")
    }

    fun logSurveyCard(index: Int, total: Int, title: String, fingerprint: String, isAlreadyCaptured: Boolean) {
        log(
            "SURVEY_CARD",
            "Discovered #$index: \"$title\" [Fingerprint: $fingerprint, Status: ${if (isAlreadyCaptured) "ALREADY_SYNCED" else "PENDING"}]"
        )
    }

    fun logSurveyEnd(totalDiscovered: Int, bottomTitle: String, durationMs: Long) {
        log(
            "SURVEY_END",
            "=== PASS 1 COMPLETE === Discovered $totalDiscovered total items in ${durationMs}ms. Bottom Post: \"$bottomTitle\""
        )
    }

    fun logRewindStart(totalCount: Int) {
        log("REWIND_START", "=== PASS 1.5: REWIND TO TOP STARTED === Returning from bottom ($totalCount items ahead)")
    }

    fun logRewindComplete(swipesCount: Int, durationMs: Long) {
        log("REWIND_COMPLETE", "=== PASS 1.5 COMPLETE === Rewound to top in $swipesCount swipes (${durationMs}ms)")
    }

    fun logPostOpen(index: Int, total: Int, title: String, latencyMs: Long, enteredDetail: Boolean) {
        log(
            "POST_OPEN",
            "Post #$index/$total: \"$title\" | Transition Latency: ${latencyMs}ms | Entered Detail: $enteredDetail"
        )
    }

    fun logAttachmentDetected(noticeTitle: String, fileName: String, hasSaveAllOffline: Boolean) {
        log(
            "ATTACHMENT_DETECTED",
            "Attachment for \"$noticeTitle\": \"$fileName\" (Master 'Save all files offline' available: $hasSaveAllOffline)"
        )
    }

    fun logAttachmentDownloaded(fileName: String, bytesOnDisk: Long) {
        log("ATTACHMENT_DOWNLOADED", "Attachment verified on disk: \"$fileName\" ($bytesOnDisk bytes)")
    }

    fun logPostCompleted(index: Int, total: Int, title: String, attachmentsCount: Int) {
        val attText = if (attachmentsCount > 0) " ($attachmentsCount attachments cataloged & queued for Drive harvest)" else ""
        log(
            "POST_COMPLETED",
            "Notice #$index/$total completed: \"$title\"$attText"
        )
    }

    /**
     * Retrieves all pending log lines from the memory buffer and clears it.
     */
    fun drainPendingLogs(): List<String> {
        val result = mutableListOf<String>()
        while (true) {
            val item = memoryQueue.poll() ?: break
            result.add(item)
        }
        return result
    }

    /**
     * Retrieves the entire persistent local log file from device disk.
     */
    fun getFullLocalLog(context: Context): List<String> {
        return try {
            val logDir = File(context.filesDir, "logs")
            val traceFile = File(logDir, "crawler_trace.log")
            if (traceFile.exists()) traceFile.readLines() else emptyList()
        } catch (e: Exception) {
            Log.w(TAG, "Failed reading local trace file: ${e.message}")
            emptyList()
        }
    }

    /**
     * Appends trace lines to local cache file for offline resilience.
     */
    fun appendToLocalFile(context: Context, lines: List<String>) {
        if (lines.isEmpty()) return
        try {
            synchronized(fileLock) {
                val logDir = File(context.filesDir, "logs")
                if (!logDir.exists()) logDir.mkdirs()
                val traceFile = File(logDir, "crawler_trace.log")
                traceFile.appendText(lines.joinToString("\n") + "\n")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed writing to local trace file", e)
        }
    }

    @Volatile
    private var streamJob: kotlinx.coroutines.Job? = null

    @Volatile
    private var lastSyncedLogLength: Long = 0L

    /**
     * Starts background real-time cloud log synchronization to Google Drive Vault.
     * Periodically updates _system/logs/crawler_trace.log via Google Drive REST API.
     */
    fun startCloudStreaming(
        scope: CoroutineScope,
        context: Context,
        targetEmail: String? = null
    ) {
        if (streamJob?.isActive == true) return

        streamJob = scope.launch(Dispatchers.IO) {
            val email = targetEmail
                ?: com.kids.collector.data.drive.DriveVaultManager.getSavedVaultPrefs(context).first
                ?: return@launch
            val academicYear = com.kids.collector.data.drive.DriveVaultManager.resolveDefaultAcademicYear(context)
            val childName = com.kids.collector.data.drive.DriveVaultManager.getSavedVaultPrefs(context).third.ifBlank {
                try {
                    val db = com.kids.collector.data.db.KidsDatabase.getInstance(context)
                    db.childProfileDao().getAllChildrenDirect().firstOrNull()?.firstName ?: "Child"
                } catch (_: Exception) {
                    "Child"
                }
            }

            val driveService = try {
                com.kids.collector.data.drive.DriveVaultManager.getDriveService(context, email)
            } catch (e: Exception) {
                log("REALTIME_LOG", "Drive service initialization deferred: ${e.message}")
                return@launch
            }

            val driveClient = com.kids.collector.data.drive.GoogleDriveClient(driveService)
            val vault = com.kids.collector.data.drive.DriveVaultManager.getSavedVaultFolders(context, email, academicYear, childName)
            val logsFolderId = vault?.logsFolderId
            if (logsFolderId.isNullOrBlank()) {
                log("REALTIME_LOG", "Vault logs folder not yet created; streaming standby.")
                return@launch
            }

            val localLogFile = File(File(context.filesDir, "logs"), "crawler_trace.log")
            log("REALTIME_LOG", "Real-time Google Drive log streaming active (syncing every 5s to Drive Vault)...")

            // Initial sync on crawler start
            if (localLogFile.exists() && localLogFile.length() > 0L) {
                try {
                    driveClient.syncLocalCrawlerTraceLog(logsFolderId, localLogFile)
                    lastSyncedLogLength = localLogFile.length()
                } catch (e: Exception) {
                    Log.w(TAG, "Initial real-time log sync failed: ${e.message}")
                }
            }

            while (isActive) {
                delay(5000L)
                if (localLogFile.exists() && localLogFile.length() > lastSyncedLogLength) {
                    try {
                        driveClient.syncLocalCrawlerTraceLog(logsFolderId, localLogFile)
                        lastSyncedLogLength = localLogFile.length()
                    } catch (e: Exception) {
                        Log.w(TAG, "Periodic real-time log sync failed: ${e.message}")
                    }
                }
            }
        }
    }

    /**
     * Flushes any remaining local trace logs to Google Drive before session shutdown.
     */
    suspend fun flushRemainingToCloud(context: Context, targetEmail: String? = null) = withContext(Dispatchers.IO) {
        val email = targetEmail ?: com.kids.collector.data.drive.DriveVaultManager.getSavedVaultPrefs(context).first ?: return@withContext
        val academicYear = com.kids.collector.data.drive.DriveVaultManager.resolveDefaultAcademicYear(context)
        val childName = com.kids.collector.data.drive.DriveVaultManager.getSavedVaultPrefs(context).third.ifBlank {
            try {
                val db = com.kids.collector.data.db.KidsDatabase.getInstance(context)
                db.childProfileDao().getAllChildrenDirect().firstOrNull()?.firstName ?: "Child"
            } catch (_: Exception) {
                "Child"
            }
        }
        val vault = com.kids.collector.data.drive.DriveVaultManager.getSavedVaultFolders(context, email, academicYear, childName)
        val logsFolderId = vault?.logsFolderId ?: return@withContext
        val driveService = try {
            com.kids.collector.data.drive.DriveVaultManager.getDriveService(context, email)
        } catch (_: Exception) {
            return@withContext
        }
        val driveClient = com.kids.collector.data.drive.GoogleDriveClient(driveService)
        val localLogFile = File(File(context.filesDir, "logs"), "crawler_trace.log")
        if (localLogFile.exists() && localLogFile.length() > 0L) {
            try {
                driveClient.syncLocalCrawlerTraceLog(logsFolderId, localLogFile)
                lastSyncedLogLength = localLogFile.length()
            } catch (e: Exception) {
                Log.w(TAG, "Final real-time log flush failed: ${e.message}")
            }
        }
    }

    /**
     * Stops the real-time cloud log synchronization coroutine.
     */
    fun stopCloudStreaming() {
        streamJob?.cancel()
        streamJob = null
    }
}
