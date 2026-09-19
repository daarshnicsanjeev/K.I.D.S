package com.kids.collector

import android.app.Application
import android.util.Log

/**
 * Main application class initializing logging and local database instances.
 */
class KidsApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "Initializing K.I.D.S. Android Collector (Zero-Backend Privacy Engine)")
    }

    companion object {
        const val TAG = "KidsApplication"
    }
}
