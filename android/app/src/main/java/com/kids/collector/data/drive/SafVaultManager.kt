package com.kids.collector.data.drive

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.documentfile.provider.DocumentFile
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Encapsulates the directory references for a child's vault managed via
 * Android's Storage Access Framework (SAF) DocumentFile provider.
 */
data class SafVaultFolders(
    val rootFolderUri: Uri,
    val yearFolderUri: Uri,
    val childFolderUri: Uri,
    val attachmentsFolderUri: Uri,
    val systemFolderUri: Uri,
    val logsFolderUri: Uri
)

/**
 * Storage Access Framework (SAF) Vault Manager
 *
 * Allows parents to select their Google Drive folder directly using Android's
 * native system file chooser (Storage Access Framework). Zero Google Cloud Console
 * registration required, 100% private, zero backend. Files created here are
 * automatically synced by the Google Drive Android app to the cloud.
 */
object SafVaultManager {
    private const val TAG = "SafVaultManager"

    @Volatile
    var currentSafVault: SafVaultFolders? = null

    @Volatile
    var rootTreeUri: Uri? = null

    suspend fun provisionStep1Saf(
        context: Context,
        treeUri: Uri,
        academicYear: String,
        childName: String
    ): Result<SafVaultFolders> = withContext(Dispatchers.IO) {
        try {
            rootTreeUri = treeUri
            val rootDoc = DocumentFile.fromTreeUri(context, treeUri)
                ?: return@withContext Result.failure(IllegalStateException("Cannot access selected folder."))

            // Create or get academicYear folder
            val yearDoc = rootDoc.findFile(academicYear)
                ?: rootDoc.createDirectory(academicYear)
                ?: return@withContext Result.failure(IllegalStateException("Failed to create $academicYear folder."))

            // Create or get childName folder
            val childDoc = yearDoc.findFile(childName)
                ?: yearDoc.createDirectory(childName)
                ?: return@withContext Result.failure(IllegalStateException("Failed to create $childName folder."))

            val attachmentsDoc = childDoc.findFile("attachments")
                ?: childDoc.createDirectory("attachments")
                ?: return@withContext Result.failure(IllegalStateException("Failed to create attachments folder."))

            val systemDoc = childDoc.findFile("_system")
                ?: childDoc.createDirectory("_system")
                ?: return@withContext Result.failure(IllegalStateException("Failed to create _system folder."))

            val logsDoc = systemDoc.findFile("logs")
                ?: systemDoc.createDirectory("logs")
                ?: return@withContext Result.failure(IllegalStateException("Failed to create logs folder."))

            val folders = SafVaultFolders(
                rootFolderUri = rootDoc.uri,
                yearFolderUri = yearDoc.uri,
                childFolderUri = childDoc.uri,
                attachmentsFolderUri = attachmentsDoc.uri,
                systemFolderUri = systemDoc.uri,
                logsFolderUri = logsDoc.uri
            )
            currentSafVault = folders

            val timeStampStr = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date())

            // 1. Initial MASTER_DIGEST.md
            val initialDigest = """
                # K.I.D.S. Master Digest — $childName
                **Academic Year:** $academicYear
                **Vault Initialized:** $timeStampStr
                
                ---
                
                ## Active Channels
                * Profile established via Onboarding Step 1 (Google Drive Vault).
                
                ## Recent Notices & Homework
                * Real-time push notification listener ready.
            """.trimIndent()
            writeTextFile(context, childDoc, "text/markdown", "MASTER_DIGEST.md", initialDigest)

            // 2. Initial notices.jsonl
            val initialJsonl = """{"event":"VAULT_INITIALIZED","childName":"$childName","academicYear":"$academicYear","timestamp":${System.currentTimeMillis()}}"""
            appendTextFile(context, childDoc, "text/plain", "notices.jsonl", initialJsonl)

            // 3. Initial _system/logs/sync_timeline.log
            appendTextFile(
                context,
                logsDoc,
                "text/plain",
                "sync_timeline.log",
                "[STEP 1 COMPLETE] Child vault provisioned for $childName in $academicYear ($timeStampStr)"
            )

            // 4. Initial _system/knowledge_graph.json
            val initialGraph = """
                {
                  "child": "$childName",
                  "academicYear": "$academicYear",
                  "nodes": [
                    {"id": "child_$childName", "label": "$childName", "type": "CHILD"},
                    {"id": "year_$academicYear", "label": "$academicYear", "type": "ACADEMIC_YEAR"}
                  ],
                  "edges": [
                    {"source": "child_$childName", "target": "year_$academicYear", "relation": "ENROLLED_IN"}
                  ]
                }
            """.trimIndent()
            writeTextFile(context, systemDoc, "application/json", "knowledge_graph.json", initialGraph)

            // 5. Initial FAMILY_DIGEST.md at academic year root
            val familyDigest = """
                # K.I.D.S. Family Rollup Digest — $academicYear
                **Last Updated:** $timeStampStr
                
                ## Enrolled Children
                * **$childName** (Vault: `$academicYear/$childName/`)
            """.trimIndent()
            writeTextFile(context, yearDoc, "text/markdown", "FAMILY_DIGEST.md", familyDigest)

            // 6. Initial graph.html
            val graphHtml = """
                <!DOCTYPE html>
                <html>
                <head>
                  <title>K.I.D.S. Knowledge Graph - $childName</title>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: sans-serif; background: #0F172A; color: #F8FAFC; padding: 20px; }
                    .badge { background: #ED8936; color: #0F172A; font-weight: bold; padding: 4px 8px; border-radius: 6px; }
                    .card { background: #1E293B; border-radius: 12px; padding: 16px; margin-top: 16px; }
                  </style>
                </head>
                <body>
                  <h1>K.I.D.S. Interactive Vault Graph</h1>
                  <span class="badge">$childName ($academicYear)</span>
                  <div class="card">
                    <h3>Child Vault Established</h3>
                    <p>Storage Provider: <strong>Google Drive (Storage Access Framework)</strong></p>
                    <p>Status: <strong>Active & Syncing directly to Google Drive</strong></p>
                  </div>
                </body>
                </html>
            """.trimIndent()
            writeTextFile(context, childDoc, "text/html", "graph.html", graphHtml)

            Log.i(TAG, "Step 1: Successfully created SAF Google Drive vault for $childName ($academicYear).")
            Result.success(folders)
        } catch (e: Exception) {
            Log.e(TAG, "Step 1: Failed to provision SAF vault", e)
            Result.failure(e)
        }
    }

    suspend fun provisionStep2ClassroomSaf(
        context: Context,
        studentEmail: String,
        isSkipped: Boolean
    ): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val vault = currentSafVault ?: return@withContext Result.success(Unit)
            val logsDoc = DocumentFile.fromTreeUri(context, vault.logsFolderUri)
            val systemDoc = DocumentFile.fromTreeUri(context, vault.systemFolderUri)

            val backfillActive = com.kids.collector.service.KidsAccessibilityService.isEnabled(context)
            val statusMsg = if (isSkipped) {
                "[STEP 2 SKIPPED] Google Classroom not enabled"
            } else {
                "[STEP 2 COMPLETE] Google Classroom mapped: $studentEmail | Historical Backfill Crawler: ${if (backfillActive) "ACTIVE" else "STANDBY"}"
            }
            if (logsDoc != null) {
                appendTextFile(context, logsDoc, "text/plain", "sync_timeline.log", statusMsg)
            }

            if (!isSkipped && studentEmail.isNotBlank() && systemDoc != null) {
                val graphUpdate = """
                    {
                      "channel": "GOOGLE_CLASSROOM",
                      "studentEmail": "$studentEmail",
                      "status": "ACTIVE"
                    }
                """.trimIndent()
                writeTextFile(context, systemDoc, "application/json", "classroom_channel.json", graphUpdate)
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Step 2: Failed to update SAF vault files", e)
            Result.failure(e)
        }
    }

    suspend fun provisionStep3ErpSaf(
        context: Context,
        appName: String,
        appPkg: String,
        tabs: List<String>,
        isSkipped: Boolean
    ): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val vault = currentSafVault ?: return@withContext Result.success(Unit)
            val logsDoc = DocumentFile.fromTreeUri(context, vault.logsFolderUri)

            val statusMsg = if (isSkipped) {
                "[STEP 3 SKIPPED] School ERP not enabled"
            } else {
                "[STEP 3 COMPLETE] School ERP mapped: $appName ($appPkg), tabs: ${tabs.joinToString()}"
            }
            if (logsDoc != null) {
                appendTextFile(context, logsDoc, "text/plain", "sync_timeline.log", statusMsg)
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Step 3: Failed to update SAF ERP files", e)
            Result.failure(e)
        }
    }

    suspend fun provisionStep4WhatsAppSaf(
        context: Context,
        childName: String,
        academicYear: String,
        groupName: String,
        isSkipped: Boolean
    ): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val vault = currentSafVault ?: return@withContext Result.success(Unit)
            val logsDoc = DocumentFile.fromTreeUri(context, vault.logsFolderUri)
            val childDoc = DocumentFile.fromTreeUri(context, vault.childFolderUri)

            val statusMsg = if (isSkipped) {
                "[STEP 4 SKIPPED] WhatsApp groups not enabled"
            } else {
                "[STEP 4 COMPLETE] WhatsApp group whitelisted: $groupName"
            }
            if (logsDoc != null) {
                appendTextFile(context, logsDoc, "text/plain", "sync_timeline.log", statusMsg)
                appendTextFile(context, logsDoc, "text/plain", "sync_timeline.log", "[ONBOARDING FINISHED] All vault files active.")
            }

            if (childDoc != null) {
                val graphHtml = """
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>K.I.D.S. Knowledge Graph - $childName</title>
                      <meta charset="utf-8">
                      <style>
                        body { font-family: sans-serif; background: #0F172A; color: #F8FAFC; padding: 20px; }
                        .badge { background: #ED8936; color: #0F172A; font-weight: bold; padding: 4px 8px; border-radius: 6px; }
                        .card { background: #1E293B; border-radius: 12px; padding: 16px; margin-top: 16px; }
                      </style>
                    </head>
                    <body>
                      <h1>K.I.D.S. Interactive Vault Graph</h1>
                      <span class="badge">$childName ($academicYear)</span>
                      <div class="card">
                        <h3>Connected Ingestion Channels</h3>
                        <p>WhatsApp Group: <strong>$groupName</strong></p>
                        <p>Storage Provider: <strong>Google Drive Vault</strong></p>
                        <p>Status: <strong>Active & Syncing directly to Google Drive</strong></p>
                      </div>
                    </body>
                    </html>
                """.trimIndent()
                writeTextFile(context, childDoc, "text/html", "graph.html", graphHtml)
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Step 4: Failed to finalize SAF vault files", e)
            Result.failure(e)
        }
    }

    fun writeTextFile(context: Context, parent: DocumentFile, mimeType: String, fileName: String, content: String) {
        val file = parent.findFile(fileName) ?: parent.createFile(mimeType, fileName)
        if (file != null) {
            context.contentResolver.openOutputStream(file.uri, "wt")?.use { out ->
                out.write(content.toByteArray(Charsets.UTF_8))
            }
        }
    }

    fun appendTextFile(context: Context, parent: DocumentFile, mimeType: String, fileName: String, line: String) {
        val file = parent.findFile(fileName) ?: parent.createFile(mimeType, fileName)
        if (file != null) {
            context.contentResolver.openOutputStream(file.uri, "wa")?.use { out ->
                out.write((line + "\n").toByteArray(Charsets.UTF_8))
            }
        }
    }
}
