package com.kids.collector.service

import android.content.Context
import android.util.Log
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * Thread-safe deep telemetry logger for the Accessibility notice scroller/crawler.
 *
 * Captures granular step-by-step diagnostic traces:
 * - Scroller lifecycle and gestures (swipe coordinates, density, durations, status)
 * - Accessibility node traversals, text extraction, contentDescription checks
 * - Ingestion & classification acceptance/rejection decisions (with reason)
 * - WorkManager dispatch and Google Drive sync status
 *
 * Buffer is persisted locally and periodically flushed to:
 * G:\My Drive\K.I.D.S. Data\{AcademicYear}\{ChildName}\_system\logs\crawler_trace.log
 */
object CrawlerTraceLogger {
    private const val TAG = "CrawlerTraceLogger"
    private val memoryQueue = ConcurrentLinkedQueue<String>()
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US)

    fun log(category: String, message: String) {
        val timestamp = dateFormat.format(Date())
        val formatted = "[$timestamp] [$category] $message"
        Log.i(TAG, formatted)
        memoryQueue.offer(formatted)
        // Keep queue bounded in memory
        while (memoryQueue.size > 200) {
            memoryQueue.poll()
        }
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
     * Appends trace line to local cache file for offline resilience.
     */
    fun appendToLocalFile(context: Context, lines: List<String>) {
        if (lines.isEmpty()) return
        try {
            val logDir = File(context.filesDir, "logs")
            if (!logDir.exists()) logDir.mkdirs()
            val traceFile = File(logDir, "crawler_trace.log")
            traceFile.appendText(lines.joinToString("\n") + "\n")
        } catch (e: Exception) {
            Log.w(TAG, "Failed writing to local trace file", e)
        }
    }
}
