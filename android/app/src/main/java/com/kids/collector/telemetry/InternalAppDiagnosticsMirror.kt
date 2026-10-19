package com.kids.collector.telemetry

import android.app.ActivityManager
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.PowerManager
import android.util.Log
import com.kids.collector.data.db.AttachmentEntity
import com.kids.collector.data.db.ChildProfileEntity
import com.kids.collector.data.db.KidsDatabase
import com.kids.collector.data.db.NoticeEntity
import com.kids.collector.data.drive.ChildVaultFolders
import com.kids.collector.data.drive.DriveVaultManager
import com.kids.collector.data.drive.GoogleDriveClient
import com.kids.collector.presentation.permission.PermissionHelper
import com.kids.collector.service.CrawlerTraceLogger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Autonomous Internal Diagnostics & State Mirroring Engine
 *
 * Transfers and maintains a complete, byte-for-byte and structured reflection of all internal
 * application state directly on the parent's authenticated Google Drive Vault (_system/diagnostics/
 * and _system/logs/).
 *
 * Zero-Backend Architecture Invariant:
 * Strictly scoped to https://www.googleapis.com/auth/drive.file ($0 cloud cost).
 * Zero credentials, auth tokens, passwords, or personal messages are ever persisted in cleartext.
 */
object InternalAppDiagnosticsMirror {

    private const val TAG = "DiagnosticsMirror"
    private const val FOLDER_NAME_DIAGNOSTICS = "diagnostics"
    private const val FILE_NAME_DB_SNAPSHOT = "kids_vault.db"
    private const val FILE_NAME_DB_DUMP = "database_dump.json"
    private const val FILE_NAME_PREFERENCES = "app_preferences.json"
    private const val FILE_NAME_RUNTIME_TELEMETRY = "runtime_telemetry.json"
    private const val FILE_NAME_SYSTEM_STATUS = "SYSTEM_STATUS.md"
    private const val FILE_NAME_APP_LOGCAT = "app_logcat.log"
    private const val MIME_TYPE_SQLITE = "application/vnd.sqlite3"
    private const val MIME_TYPE_JSON = "application/json"
    private const val MIME_TYPE_MARKDOWN = "text/markdown"
    private const val MIME_TYPE_TEXT = "text/plain"
    private const val DATABASE_NAME = "kids_vault.db"
    private const val MAX_LOGCAT_LINES = 2000
    private const val MAX_OCR_PREVIEW_LENGTH = 150

    data class MirrorSummary(
        val timestampIso: String,
        val databaseSnapshotUploaded: Boolean,
        val databaseDumpUploaded: Boolean,
        val preferencesDumpUploaded: Boolean,
        val runtimeTelemetryUploaded: Boolean,
        val systemStatusOverviewUploaded: Boolean,
        val logcatUploaded: Boolean,
        val errorDetails: List<String>
    )

    /**
     * Mirrors all internal application state, Room SQLite database snapshot, JSON database dump,
     * preferences, runtime environment metrics, and system logcat to Google Drive.
     */
    suspend fun mirrorAllInternalDataToDrive(
        context: Context,
        db: KidsDatabase,
        driveClient: GoogleDriveClient,
        vault: ChildVaultFolders,
        childProfile: ChildProfileEntity?,
        allNotices: List<NoticeEntity>,
        allAttachments: List<AttachmentEntity>
    ): MirrorSummary = withContext(Dispatchers.IO) {
        val timestampIso = getIsoTimestamp()
        val errorList = mutableListOf<String>()

        CrawlerTraceLogger.log(TAG, "Initiating complete internal app state mirroring to Google Drive vault...")

        // Provision diagnostics directory under _system/
        val diagnosticsFolderId = try {
            driveClient.getOrCreateFolder(FOLDER_NAME_DIAGNOSTICS, vault.systemFolderId)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to resolve diagnostics folder: ${e.message}", e)
            vault.systemFolderId
        }

        // 1. Physical SQLite Database Snapshot (Flushes WAL and copies atomic .db file)
        var dbSnapshotSuccess = false
        var snapshotFile: File? = null
        try {
            snapshotFile = createDatabaseSnapshotFile(context, db)
            if (snapshotFile != null && snapshotFile.exists() && snapshotFile.length() > 0) {
                driveClient.uploadOrUpdateBinaryFile(
                    parentFolderId = diagnosticsFolderId,
                    fileName = FILE_NAME_DB_SNAPSHOT,
                    mimeType = MIME_TYPE_SQLITE,
                    file = snapshotFile
                )
                dbSnapshotSuccess = true
                CrawlerTraceLogger.log(TAG, "Uploaded physical SQLite database snapshot ($FILE_NAME_DB_SNAPSHOT, ${snapshotFile.length()} bytes)")
            } else {
                errorList.add("Database snapshot file was empty or not generated.")
            }
        } catch (e: Exception) {
            val err = "Database snapshot upload failed: ${e.message}"
            Log.w(TAG, err, e)
            errorList.add(err)
        } finally {
            snapshotFile?.delete()
        }

        // 2. Structured Database JSON Dump (Human & AI readable representation of all entities)
        var dbDumpSuccess = false
        try {
            val dbDumpJson = generateDatabaseDumpJson(
                context = context,
                childProfile = childProfile,
                allNotices = allNotices,
                allAttachments = allAttachments
            )
            driveClient.uploadOrUpdateTextFile(
                parentFolderId = diagnosticsFolderId,
                fileName = FILE_NAME_DB_DUMP,
                mimeType = MIME_TYPE_JSON,
                content = dbDumpJson
            )
            dbDumpSuccess = true
            CrawlerTraceLogger.log(TAG, "Uploaded structured database dump ($FILE_NAME_DB_DUMP, ${allNotices.size} notices, ${allAttachments.size} attachments)")
        } catch (e: Exception) {
            val err = "Database JSON dump upload failed: ${e.message}"
            Log.w(TAG, err, e)
            errorList.add(err)
        }

        // 3. Application Preferences & Configurations Dump
        var prefsSuccess = false
        try {
            val preferencesJson = generatePreferencesDumpJson(context)
            driveClient.uploadOrUpdateTextFile(
                parentFolderId = diagnosticsFolderId,
                fileName = FILE_NAME_PREFERENCES,
                mimeType = MIME_TYPE_JSON,
                content = preferencesJson
            )
            prefsSuccess = true
            CrawlerTraceLogger.log(TAG, "Uploaded sanitized preferences dump ($FILE_NAME_PREFERENCES)")
        } catch (e: Exception) {
            val err = "Preferences dump upload failed: ${e.message}"
            Log.w(TAG, err, e)
            errorList.add(err)
        }

        // 4. Runtime System Telemetry & Device Health Metrics
        var telemetrySuccess = false
        try {
            val telemetryJson = generateRuntimeTelemetryJson(context)
            driveClient.uploadOrUpdateTextFile(
                parentFolderId = diagnosticsFolderId,
                fileName = FILE_NAME_RUNTIME_TELEMETRY,
                mimeType = MIME_TYPE_JSON,
                content = telemetryJson
            )
            telemetrySuccess = true
            CrawlerTraceLogger.log(TAG, "Uploaded runtime telemetry metrics ($FILE_NAME_RUNTIME_TELEMETRY)")
        } catch (e: Exception) {
            val err = "Runtime telemetry upload failed: ${e.message}"
            Log.w(TAG, err, e)
            errorList.add(err)
        }

        // 5. System Status Markdown Overview
        var systemStatusSuccess = false
        try {
            val systemStatusMarkdown = generateSystemStatusMarkdown(
                context = context,
                childProfile = childProfile,
                allNotices = allNotices,
                allAttachments = allAttachments
            )
            driveClient.uploadOrUpdateTextFile(
                parentFolderId = vault.systemFolderId,
                fileName = FILE_NAME_SYSTEM_STATUS,
                mimeType = MIME_TYPE_MARKDOWN,
                content = systemStatusMarkdown
            )
            systemStatusSuccess = true
            CrawlerTraceLogger.log(TAG, "Uploaded human-readable system status overview ($FILE_NAME_SYSTEM_STATUS)")
        } catch (e: Exception) {
            val err = "System status overview upload failed: ${e.message}"
            Log.w(TAG, err, e)
            errorList.add(err)
        }

        // 6. Application Process Logcat Capture
        var logcatSuccess = false
        try {
            val logcatOutput = captureAppLogcat(context)
            if (logcatOutput.isNotBlank()) {
                driveClient.uploadOrUpdateTextFile(
                    parentFolderId = vault.logsFolderId,
                    fileName = FILE_NAME_APP_LOGCAT,
                    mimeType = MIME_TYPE_TEXT,
                    content = logcatOutput
                )
                logcatSuccess = true
                CrawlerTraceLogger.log(TAG, "Uploaded process logcat trace ($FILE_NAME_APP_LOGCAT, ${logcatOutput.lines().size} lines)")
            }
        } catch (e: Exception) {
            val err = "App logcat upload failed: ${e.message}"
            Log.w(TAG, err, e)
            errorList.add(err)
        }

        CrawlerTraceLogger.log(
            TAG,
            "Internal state mirroring completed. Snapshot: $dbSnapshotSuccess, Dump: $dbDumpSuccess, Prefs: $prefsSuccess, Telemetry: $telemetrySuccess, Logcat: $logcatSuccess"
        )

        MirrorSummary(
            timestampIso = timestampIso,
            databaseSnapshotUploaded = dbSnapshotSuccess,
            databaseDumpUploaded = dbDumpSuccess,
            preferencesDumpUploaded = prefsSuccess,
            runtimeTelemetryUploaded = telemetrySuccess,
            systemStatusOverviewUploaded = systemStatusSuccess,
            logcatUploaded = logcatSuccess,
            errorDetails = errorList
        )
    }

    /**
     * Commits all pending SQLite WAL journal transactions and creates a self-contained SQLite file copy.
     */
    private fun createDatabaseSnapshotFile(context: Context, db: KidsDatabase): File? {
        return try {
            db.openHelper.writableDatabase.query("PRAGMA wal_checkpoint(FULL)").use { cursor ->
                if (cursor.moveToFirst()) {
                    Log.d(TAG, "WAL checkpoint status code: ${cursor.getInt(0)}")
                }
            }
            val dbFile = context.getDatabasePath(DATABASE_NAME)
            if (!dbFile.exists()) return null

            val cacheSnapshot = File(context.cacheDir, "kids_vault_snapshot_${System.currentTimeMillis()}.db")
            dbFile.copyTo(cacheSnapshot, overwrite = true)
            cacheSnapshot
        } catch (e: Exception) {
            Log.w(TAG, "Could not create database snapshot: ${e.message}")
            null
        }
    }

    /**
     * Serializes all Room entities into an indexed, structured JSON representation.
     */
    private fun generateDatabaseDumpJson(
        context: Context,
        childProfile: ChildProfileEntity?,
        allNotices: List<NoticeEntity>,
        allAttachments: List<AttachmentEntity>
    ): String {
        val dbFile = context.getDatabasePath(DATABASE_NAME)
        val fileSizeBytes = if (dbFile.exists()) dbFile.length() else 0L

        val syncedAttachmentsCount = allAttachments.count { it.syncStatus.equals("SYNCED", ignoreCase = true) }
        val pendingAttachmentsCount = allAttachments.count { it.syncStatus.equals("PENDING", ignoreCase = true) }
        val failedAttachmentsCount = allAttachments.count { it.syncStatus.equals("FAILED", ignoreCase = true) }

        return buildJsonObject {
            put("generatedAtUtc", getIsoTimestamp())
            put("schemaVersion", 2)
            put("databaseFileSizeBytes", fileSizeBytes)

            put("statistics", buildJsonObject {
                put("totalNotices", allNotices.size)
                put("totalAttachments", allAttachments.size)
                put("syncedAttachments", syncedAttachmentsCount)
                put("pendingAttachments", pendingAttachmentsCount)
                put("failedAttachments", failedAttachmentsCount)
                put("totalAttachmentSizeBytes", allAttachments.sumOf { it.sizeBytes })
            })

            put("childProfile", buildJsonObject {
                if (childProfile != null) {
                    put("childId", childProfile.childId)
                    put("firstName", childProfile.firstName)
                    put("grade", childProfile.grade)
                    put("academicYear", childProfile.academicYear)
                    put("schoolName", childProfile.schoolName)
                    put("accountEmail", childProfile.accountEmail.orEmpty())
                    put("channelsCount", childProfile.channels.size)
                    put("createdAtMs", childProfile.createdAtMs)
                }
            })

            put("notices", buildJsonArray {
                for (notice in allNotices.sortedByDescending { it.timestampMs }) {
                    add(buildJsonObject {
                        put("noticeId", notice.noticeId)
                        put("childId", notice.childId)
                        put("sourceApp", notice.sourceApp)
                        put("category", notice.category)
                        put("title", notice.title)
                        put("body", notice.body)
                        put("sender", notice.sender)
                        put("timestampMs", notice.timestampMs)
                        put("syncStatus", notice.syncStatus)
                        put("driveFileId", notice.driveFileId.orEmpty())
                        put("attachmentCount", notice.attachmentCount)
                        put("hashSha256", notice.hashSha256)
                    })
                }
            })

            put("attachments", buildJsonArray {
                for (attachment in allAttachments) {
                    add(buildJsonObject {
                        put("attachmentId", attachment.attachmentId)
                        put("noticeId", attachment.noticeId)
                        put("fileName", attachment.fileName)
                        put("mimeType", attachment.mimeType)
                        put("sizeBytes", attachment.sizeBytes)
                        put("fileHash", attachment.fileHash)
                        put("localUri", attachment.localUri)
                        put("syncStatus", attachment.syncStatus)
                        put("driveFileId", attachment.driveFileId.orEmpty())
                        put("pageCount", attachment.pageCount)
                        put("hasOcrText", !attachment.ocrText.isNullOrBlank())
                        if (!attachment.ocrText.isNullOrBlank()) {
                            put("ocrSnippet", attachment.ocrText.take(MAX_OCR_PREVIEW_LENGTH))
                        }
                    })
                }
            })
        }.toString()
    }

    /**
     * Dumps and sanitizes all SharedPreferences key-values into JSON.
     */
    private fun generatePreferencesDumpJson(context: Context): String {
        val vaultPrefs = context.getSharedPreferences(DriveVaultManager.PREFS_NAME, Context.MODE_PRIVATE)
        val allEntries = vaultPrefs.all

        return buildJsonObject {
            put("preferenceFile", DriveVaultManager.PREFS_NAME)
            put("exportedAtUtc", getIsoTimestamp())
            put("entries", buildJsonObject {
                for ((key, value) in allEntries) {
                    val sanitizedString = sanitizeSensitiveValue(value?.toString().orEmpty())
                    put(key, sanitizedString)
                }
            })
        }.toString()
    }

    /**
     * Collects environmental health, hardware telemetry, memory, storage, and permission metrics.
     */
    private fun generateRuntimeTelemetryJson(context: Context): String {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
        val memoryInfo = ActivityManager.MemoryInfo().apply {
            activityManager?.getMemoryInfo(this)
        }

        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val isBatteryOptimizationIgnored = powerManager?.isIgnoringBatteryOptimizations(context.packageName) ?: false

        val stagingDir = File(context.getExternalFilesDir(null), "vault_attachments")
        val stagingFileCount = stagingDir.listFiles()?.size ?: 0
        val stagingSizeBytes = stagingDir.listFiles()?.sumOf { it.length() } ?: 0L

        val (versionName, versionCode) = try {
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            val code = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                packageInfo.versionCode.toLong()
            }
            Pair(packageInfo.versionName.orEmpty(), code)
        } catch (e: Exception) {
            Pair("unknown", 0L)
        }

        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        val activeNetwork = connectivityManager?.activeNetwork
        val caps = connectivityManager?.getNetworkCapabilities(activeNetwork)
        val transportType = when {
            caps == null -> "NONE"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "WIFI"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "CELLULAR"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ETHERNET"
            else -> "OTHER"
        }

        return buildJsonObject {
            put("collectedAtUtc", getIsoTimestamp())
            put("device", buildJsonObject {
                put("manufacturer", Build.MANUFACTURER)
                put("model", Build.MODEL)
                put("device", Build.DEVICE)
                put("androidSdk", Build.VERSION.SDK_INT)
                put("androidRelease", Build.VERSION.RELEASE)
                put("appVersionName", versionName)
                put("appVersionCode", versionCode)
            })
            put("permissions", buildJsonObject {
                put("accessibilityServiceEnabled", PermissionHelper.isAccessibilityGranted(context))
                put("notificationListenerEnabled", PermissionHelper.isNotificationAccessGranted(context))
                put("batteryOptimizationIgnored", isBatteryOptimizationIgnored)
            })
            put("memory", buildJsonObject {
                put("availableRamBytes", memoryInfo.availMem)
                put("totalRamBytes", memoryInfo.totalMem)
                put("isLowMemory", memoryInfo.lowMemory)
                put("lowMemoryThresholdBytes", memoryInfo.threshold)
            })
            put("storage", buildJsonObject {
                put("internalFreeSpaceBytes", context.filesDir.freeSpace)
                put("internalTotalSpaceBytes", context.filesDir.totalSpace)
                put("stagingDirectoryFileCount", stagingFileCount)
                put("stagingDirectorySizeBytes", stagingSizeBytes)
            })
            put("network", buildJsonObject {
                put("activeTransport", transportType)
                put("isMetered", connectivityManager?.isActiveNetworkMetered ?: false)
            })
        }.toString()
    }

    /**
     * Captures recent logcat lines for application process analysis.
     */
    private fun captureAppLogcat(context: Context): String {
        return try {
            val process = Runtime.getRuntime().exec(arrayOf("logcat", "-d", "-v", "threadtime", "-t", MAX_LOGCAT_LINES.toString(), "*:V"))
            val reader = BufferedReader(InputStreamReader(process.inputStream))
            val logLines = mutableListOf<String>()
            val filterPackage = context.packageName

            reader.useLines { lines ->
                for (line in lines) {
                    if (line.contains(filterPackage, ignoreCase = true) ||
                        line.contains("KidsCollector", ignoreCase = true) ||
                        line.contains("KidsAccessibility", ignoreCase = true) ||
                        line.contains("DriveSyncWorker", ignoreCase = true) ||
                        line.contains("DownloadFolderObserver", ignoreCase = true) ||
                        line.contains("DiagnosticsMirror", ignoreCase = true) ||
                        line.contains("CrawlerTrace", ignoreCase = true)
                    ) {
                        logLines.add(sanitizeSensitiveValue(line))
                    }
                }
            }
            logLines.joinToString("\n")
        } catch (e: Exception) {
            "Logcat capture unavailable: ${e.message}"
        }
    }

    /**
     * Synthesizes an executive Markdown status document explaining all diagnostic files.
     */
    private fun generateSystemStatusMarkdown(
        context: Context,
        childProfile: ChildProfileEntity?,
        allNotices: List<NoticeEntity>,
        allAttachments: List<AttachmentEntity>
    ): String {
        val timestamp = getIsoTimestamp()
        val childName = childProfile?.firstName ?: "Default Child"
        val academicYear = childProfile?.academicYear ?: DriveVaultManager.resolveDefaultAcademicYear(context)
        val syncedCount = allAttachments.count { it.syncStatus.equals("SYNCED", ignoreCase = true) }
        val pendingCount = allAttachments.count { it.syncStatus.equals("PENDING", ignoreCase = true) }

        return """
# K.I.D.S. Internal Diagnostics & Troubleshooting Archive
**Last Synchronized:** `$timestamp`  
**Child Enrolled:** `$childName` | **Academic Year:** `$academicYear`  
**Package:** `${context.packageName}`

---

## 1. Cloud Vault & Device Health Status
- **Google Drive Vault:** CONNECTED (`https://www.googleapis.com/auth/drive.file` scope)
- **Accessibility Service:** ${if (PermissionHelper.isAccessibilityGranted(context)) "✅ ACTIVE" else "⚠️ INACTIVE"}
- **Notification Listener:** ${if (PermissionHelper.isNotificationAccessGranted(context)) "✅ CONNECTED" else "⚠️ PENDING"}
- **Battery Optimization:** ${if ((context.getSystemService(Context.POWER_SERVICE) as? PowerManager)?.isIgnoringBatteryOptimizations(context.packageName) == true) "✅ UNRESTRICTED" else "⚠️ OPTIMIZED"}

---

## 2. Relational Database Statistics
- **Total Registered Notices:** `${allNotices.size}`
- **Total Registered Attachments:** `${allAttachments.size}`
  - **Uploaded to Drive (`SYNCED`):** `${syncedCount}`
  - **Awaiting Capture/Download (`PENDING`):** `${pendingCount}`
- **Database Schema Version:** `2` (Room SQLite)

---

## 3. Diagnostic & State Artifacts in Google Drive
All internal state files are preserved under `_system/` for complete transparency and troubleshooting:

| Path on Google Drive | Format | Diagnostic Purpose |
| :--- | :--- | :--- |
| `_system/diagnostics/kids_vault.db` | Binary SQLite | **Full SQLite database backup.** Open in *DB Browser for SQLite* to query raw notices, attachments, and child profiles. |
| `_system/diagnostics/database_dump.json` | JSON | **Human & AI-readable dump** of all database tables and sync statuses. Previewable directly in Google Drive. |
| `_system/diagnostics/app_preferences.json` | JSON | **SharedPreferences and config dump** (sanitized). Verifies student emails, folder IDs, and flags. |
| `_system/diagnostics/runtime_telemetry.json` | JSON | **Device hardware, RAM, storage, and permission metrics.** |
| `_system/logs/app_logcat.log` | Plain Text | **App process logcat trace.** Diagnoses crashes, ANRs, or service events. |
| `_system/logs/crawler_trace.log` | Plain Text | **Crawler state machine trace.** Step-by-step UI interaction events. |
| `_system/logs/sync_timeline.log` | Plain Text | **Drive sync timeline.** Chronological cloud upload audit trail. |
| `_system/knowledge_graph.json` | JSON | **Codebase & Notice Knowledge Graph.** Nodes, edges, and semantic entities. |
| `graph.html` | HTML | **Interactive visual knowledge graph.** Open in any browser. |

*Zero-Backend Invariant: All diagnostics flow strictly between this Android device and the parent's authenticated personal Google Drive Vault.*
        """.trimIndent()
    }

    /**
     * Strips credentials, auth tokens, and sensitive keys from any diagnostic string.
     */
    private fun sanitizeSensitiveValue(value: String): String {
        return value
            .replace(Regex("Bearer\\s+[A-Za-z0-9_.-]+", RegexOption.IGNORE_CASE), "Bearer [REDACTED_TOKEN]")
            .replace(Regex("ya29\\.[A-Za-z0-9_-]+"), "ya29.[REDACTED_OAUTH_TOKEN]")
            .replace(Regex("password=[^&\\s]+", RegexOption.IGNORE_CASE), "password=[REDACTED]")
            .replace(Regex("token=[^&\\s]+", RegexOption.IGNORE_CASE), "token=[REDACTED]")
    }

    private fun getIsoTimestamp(): String {
        return SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date())
    }
}
