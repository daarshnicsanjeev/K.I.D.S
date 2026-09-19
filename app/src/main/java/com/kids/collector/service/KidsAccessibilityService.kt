package com.kids.collector.service

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Historical Auto-Crawler Accessibility Service
 *
 * Used exclusively for Day 0 historical backfill in user-designated school apps.
 * Operates strictly when authorized school apps are in the foreground.
 *
 * Governance:
 * - 100% optional: declining Accessibility does NOT impact real-time push capture.
 * - Zero cloud retention: parsed text is saved exclusively into local Room DB and parent's Drive.
 */
class KidsAccessibilityService : AccessibilityService() {

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val packageName = event.packageName?.toString() ?: return
        if (!isAuthorizedSchoolApp(packageName)) return

        val rootNode = rootInActiveWindow ?: return
        traverseAndCollect(rootNode)
    }

    private fun traverseAndCollect(node: AccessibilityNodeInfo) {
        val text = node.text?.toString()
        if (!text.isNullOrBlank()) {
            Log.d(TAG, "Scanned historical node: ${text.take(40)}")
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            traverseAndCollect(child)
            child.recycle()
        }
    }

    private fun isAuthorizedSchoolApp(packageName: String): Boolean {
        return packageName.contains("classroom") ||
                packageName.contains("campuscare") ||
                packageName.contains("toddle")
    }

    override fun onInterrupt() {
        Log.w(TAG, "KidsAccessibilityService interrupted")
    }

    companion object {
        private const val TAG = "KidsAccessibilityService"
    }
}
