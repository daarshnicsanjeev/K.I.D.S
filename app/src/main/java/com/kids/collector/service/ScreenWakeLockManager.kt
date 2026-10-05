package com.kids.collector.service

import android.content.Context
import android.graphics.PixelFormat
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import com.kids.collector.service.KidsAccessibilityService

/**
 * Screen and CPU WakeLock Controller for Autonomous Crawling.
 *
 * Prevents the Android device from dimming, timing out, or locking during lengthy multi-pass crawls
 * (Pass 1 Survey, Pass 2 Card Ingestion, Pass 3 Shared Harvesting, and Pass 4 Search Harvesting).
 *
 * Uses a dual-redundancy approach:
 * 1. Attaches a 1px x 1px non-focusable, non-touchable accessibility overlay window with [WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON].
 *    This is the official, zero-battery-waste Android WindowManager mechanism to prevent screen timeout.
 * 2. Acquires a CPU [PowerManager.PARTIAL_WAKE_LOCK] with an automatic safety timeout to ensure background
 *    coroutines and network I/O are never throttled by Doze mode.
 */
class ScreenWakeLockManager {

    companion object {
        private const val WAKE_LOCK_TAG = "KIDS:CrawlerActiveWakeLock"
        private const val WAKE_UP_TAG = "KIDS:ScreenWakeUpTrigger"
        private const val WAKE_LOCK_SAFETY_TIMEOUT_MILLIS = 30 * 60 * 1000L // 30 minutes
        private const val OVERLAY_DIMENSION_PIXELS = 1
    }

    private var activeCpuWakeLock: PowerManager.WakeLock? = null
    private var keepAwakeOverlayView: View? = null
    private var windowManager: WindowManager? = null
    private val mainThreadHandler = Handler(Looper.getMainLooper())

    @Volatile
    private var isWakeLockEngaged = false

    /**
     * Engages screen keep-awake flags and CPU wake lock for the duration of the crawl.
     */
    fun acquireWakeLock(service: KidsAccessibilityService) {
        if (isWakeLockEngaged) {
            CrawlerTraceLogger.log("WAKELOCK", "Screen keep-awake already engaged. Re-arming safety timeout.")
            return
        }
        isWakeLockEngaged = true

        // 1. Wake screen if currently non-interactive
        try {
            val powerManager = service.getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (powerManager?.isInteractive == false) {
                @Suppress("DEPRECATION")
                val wakeUpLock = powerManager.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
                    WAKE_UP_TAG
                )
                wakeUpLock.acquire(1000L)
            }

            // 2. Acquire CPU partial wake lock to prevent Doze throttling
            activeCpuWakeLock = powerManager?.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                WAKE_LOCK_TAG
            )?.apply {
                setReferenceCounted(false)
                acquire(WAKE_LOCK_SAFETY_TIMEOUT_MILLIS)
            }
            CrawlerTraceLogger.log("WAKELOCK", "CPU WakeLock acquired successfully.")
        } catch (e: Exception) {
            CrawlerTraceLogger.log("WAKELOCK", "Warning: Could not acquire CPU WakeLock: ${e.message}")
        }

        // 3. Attach 1px transparent keep-awake overlay with FLAG_KEEP_SCREEN_ON
        mainThreadHandler.post {
            try {
                if (keepAwakeOverlayView != null) return@post

                val wm = service.getSystemService(Context.WINDOW_SERVICE) as? WindowManager ?: return@post
                windowManager = wm

                val overlayView = View(service)
                val layoutParams = WindowManager.LayoutParams(
                    OVERLAY_DIMENSION_PIXELS,
                    OVERLAY_DIMENSION_PIXELS,
                    WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                            WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                    PixelFormat.TRANSLUCENT
                ).apply {
                    gravity = Gravity.TOP or Gravity.START
                    x = 0
                    y = 0
                }

                wm.addView(overlayView, layoutParams)
                keepAwakeOverlayView = overlayView
                CrawlerTraceLogger.log("WAKELOCK", "✓ Screen keep-awake overlay attached (FLAG_KEEP_SCREEN_ON active). Screen will not lock.")
            } catch (e: Exception) {
                CrawlerTraceLogger.log("WAKELOCK", "Warning: Could not attach keep-awake overlay: ${e.message}")
            }
        }
    }

    /**
     * Releases screen keep-awake flags and CPU wake lock when the crawl finishes or is halted.
     */
    fun releaseWakeLock() {
        if (!isWakeLockEngaged) return
        isWakeLockEngaged = false

        // 1. Release CPU wake lock
        try {
            if (activeCpuWakeLock?.isHeld == true) {
                activeCpuWakeLock?.release()
                CrawlerTraceLogger.log("WAKELOCK", "CPU WakeLock released.")
            }
        } catch (e: Exception) {
            CrawlerTraceLogger.log("WAKELOCK", "Warning: Could not release CPU WakeLock: ${e.message}")
        } finally {
            activeCpuWakeLock = null
        }

        // 2. Remove keep-awake overlay from WindowManager
        mainThreadHandler.post {
            val view = keepAwakeOverlayView
            val wm = windowManager
            if (view != null && wm != null) {
                try {
                    wm.removeViewImmediate(view)
                    CrawlerTraceLogger.log("WAKELOCK", "✓ Screen keep-awake overlay removed. Normal screen timeout restored.")
                } catch (e: Exception) {
                    try {
                        wm.removeView(view)
                    } catch (_: Exception) {}
                }
            }
            keepAwakeOverlayView = null
            windowManager = null
        }
    }

    /**
     * Returns true if screen keep-awake is currently engaged.
     */
    fun isWakeLockActive(): Boolean = isWakeLockEngaged
}
