package com.kids.collector.presentation.permission

import android.content.Context
import android.content.Intent
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.kids.collector.service.KidsAccessibilityService

/**
 * Utility to verify system permissions for 24/7 Push Capture and Historical Backfill,
 * and dispatch direct intents to the corresponding Android Settings pages.
 */
object PermissionHelper {

    fun isNotificationAccessGranted(context: Context): Boolean {
        return NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)
    }

    fun isAccessibilityGranted(context: Context): Boolean {
        return KidsAccessibilityService.isEnabled(context)
    }

    fun openNotificationListenerSettings(context: Context) {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            val intent = Intent(Settings.ACTION_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        }
    }

    fun openAccessibilitySettings(context: Context) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            val intent = Intent(Settings.ACTION_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        }
    }

    fun openAppDetailsSettings(context: Context) {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = android.net.Uri.fromParts("package", context.packageName, null)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            val intent = Intent(Settings.ACTION_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        }
    }

    fun canDrawOverlays(context: Context): Boolean {
        return android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.M ||
                Settings.canDrawOverlays(context)
    }

    fun openOverlaySettings(context: Context) {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    android.net.Uri.parse("package:${context.packageName}")
                ).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            }
        } catch (e: Exception) {
            openAppDetailsSettings(context)
        }
    }

    fun hasStorageAccess(context: Context): Boolean {
        return if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            android.os.Environment.isExternalStorageManager()
        } else {
            androidx.core.content.ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.READ_EXTERNAL_STORAGE
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED
        }
    }

    fun openStorageAccessSettings(context: Context) {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,
                    android.net.Uri.parse("package:${context.packageName}")
                ).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            } else {
                openAppDetailsSettings(context)
            }
        } catch (e: Exception) {
            openAppDetailsSettings(context)
        }
    }
}
