package com.kids.collector

import android.app.Application
import android.util.Log

/**
 * Main application class initializing logging and local database instances.
 */
class KidsApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "Initializing K.I.D.S. (Zero-Backend Privacy Engine)")
        com.kids.collector.service.CrawlerTraceLogger.init(this)

        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            Log.e("FATAL_CRASH", "Uncaught exception in thread ${thread.name}", throwable)
            try {
                val crashFile = java.io.File(filesDir, "crash.log")
                crashFile.appendText("${java.util.Date()}: [Thread: ${thread.name}] ${throwable.stackTraceToString()}\n\n")
                com.kids.collector.service.CrawlerTraceLogger.log("FATAL_CRASH", "Thread: ${thread.name} - ${throwable.message}")
                com.kids.collector.service.CrawlerTraceLogger.appendToLocalFile(
                    applicationContext,
                    listOf("FATAL_CRASH [Thread: ${thread.name}]: ${throwable.message}")
                )
            } catch (_: Throwable) {}
            defaultHandler?.uncaughtException(thread, throwable)
        }
    }

    companion object {
        const val TAG = "KidsApplication"
    }
}
