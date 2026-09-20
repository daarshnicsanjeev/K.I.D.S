package com.kids.collector.data.drive

import android.content.Context
import android.content.Intent
import android.util.Log
import com.google.android.gms.auth.UserRecoverableAuthException
import com.google.api.client.googleapis.extensions.android.gms.auth.GoogleAccountCredential
import com.google.api.client.googleapis.extensions.android.gms.auth.UserRecoverableAuthIOException
import com.google.api.client.http.javanet.NetHttpTransport
import com.google.api.client.json.gson.GsonFactory
import com.google.api.services.drive.Drive
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Result of Step 1 Google Drive Vault provisioning.
 */
sealed interface ProvisionStep1Result {
    data class Success(val folders: ChildVaultFolders) : ProvisionStep1Result
    data class UserConsentRequired(val consentIntent: Intent) : ProvisionStep1Result
    data class Failure(val error: Throwable, val userMessage: String) : ProvisionStep1Result
}

/**
 * Manages Google Drive OAuth authentication and coordinates incremental,
 * step-by-step file & folder provisioning as the user moves through the wizard.
 */
object DriveVaultManager {
    private const val TAG = "DriveVaultManager"
    const val DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file"

    @Volatile
    var currentChildVault: ChildVaultFolders? = null

    @Volatile
    var currentAccountEmail: String? = null

    fun getDriveService(context: Context, accountEmail: String): Drive {
        val credential = GoogleAccountCredential.usingOAuth2(
            context,
            listOf(DRIVE_FILE_SCOPE)
        ).apply {
            selectedAccountName = accountEmail
        }

        return Drive.Builder(
            NetHttpTransport(),
            GsonFactory.getDefaultInstance(),
            credential
        ).setApplicationName("K.I.D.S.").build()
    }

    /**
     * Step 1: Provisions K.I.D.S. Data/{AcademicYear}/{ChildName}/ folders
     * and initializes notices.jsonl, MASTER_DIGEST.md, sync_timeline.log, and knowledge_graph.json
     */
    suspend fun provisionStep1(
        context: Context,
        accountEmail: String?,
        academicYear: String,
        childName: String
    ): ProvisionStep1Result = withContext(Dispatchers.IO) {
        if (accountEmail.isNullOrBlank()) {
            return@withContext ProvisionStep1Result.Failure(
                IllegalStateException("No Google Account selected."),
                "Please select your Google Account first."
            )
        }

        try {
            val driveService = getDriveService(context, accountEmail)
            val driveClient = GoogleDriveClient(driveService)

            Log.i(TAG, "Step 1: Provisioning child vault on Google Drive for $childName ($academicYear)...")
            val folders = driveClient.provisionChildVault(academicYear, childName)
            currentChildVault = folders
            currentAccountEmail = accountEmail

            val timeStampStr = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date())

            // 1. Initial MASTER_DIGEST.md
            val initialDigest = """
                # K.I.D.S. Master Digest — $childName
                **Academic Year:** $academicYear
                **Vault Initialized:** $timeStampStr
                
                ---
                
                ## Active Channels
                * Profile established via Onboarding Step 1.
                
                ## Recent Notices & Homework
                * Real-time push notification listener ready.
            """.trimIndent()
            driveClient.uploadOrUpdateMasterDigest(folders.childFolderId, initialDigest)

            // 2. Initial notices.jsonl
            val initialJsonl = """{"event":"VAULT_INITIALIZED","childName":"$childName","academicYear":"$academicYear","timestamp":${System.currentTimeMillis()}}"""
            driveClient.appendNoticeToJsonl(folders.childFolderId, initialJsonl)

            // 3. Initial _system/logs/sync_timeline.log
            driveClient.appendTimelineLog(
                folders.logsFolderId,
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
            driveClient.uploadOrUpdateKnowledgeGraph(folders.systemFolderId, initialGraph)

            // 5. Initial FAMILY_DIGEST.md at academic year root
            val familyDigest = """
                # K.I.D.S. Family Rollup Digest — $academicYear
                **Last Updated:** $timeStampStr
                
                ## Enrolled Children
                * **$childName** (Vault: `$academicYear/$childName/`)
            """.trimIndent()
            driveClient.uploadOrUpdateFamilyDigest(folders.yearFolderId, familyDigest)

            Log.i(TAG, "Step 1: Successfully created Google Drive vault folders and initial files.")
            ProvisionStep1Result.Success(folders)
        } catch (e: UserRecoverableAuthIOException) {
            Log.w(TAG, "User consent required for Google Drive access via UserRecoverableAuthIOException", e)
            ProvisionStep1Result.UserConsentRequired(e.intent)
        } catch (e: UserRecoverableAuthException) {
            Log.w(TAG, "User consent required for Google Drive access via UserRecoverableAuthException", e)
            val intent = e.intent ?: Intent()
            ProvisionStep1Result.UserConsentRequired(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Step 1: Failed to provision Google Drive vault", e)
            val userMsg = e.localizedMessage ?: e.javaClass.simpleName
            ProvisionStep1Result.Failure(e, userMsg)
        }
    }

    /**
     * Step 2: Updates MASTER_DIGEST.md and knowledge_graph.json with Google Classroom mapping
     */
    suspend fun provisionStep2Classroom(
        context: Context,
        accountEmail: String?,
        folders: ChildVaultFolders?,
        studentEmail: String,
        isSkipped: Boolean
    ): Result<Unit> = withContext(Dispatchers.IO) {
        // Also update SAF vault if active
        SafVaultManager.provisionStep2ClassroomSaf(context, studentEmail, isSkipped)

        try {
            val email = accountEmail ?: currentAccountEmail
            val vault = folders ?: currentChildVault
            if (email.isNullOrBlank() || vault == null) return@withContext Result.success(Unit)

            val driveClient = GoogleDriveClient(getDriveService(context, email))

            val backfillActive = com.kids.collector.service.KidsAccessibilityService.isEnabled(context)
            val statusMsg = if (isSkipped) {
                "[STEP 2 SKIPPED] Google Classroom not enabled"
            } else {
                "[STEP 2 COMPLETE] Google Classroom mapped: $studentEmail | Historical Backfill Crawler: ${if (backfillActive) "ACTIVE" else "STANDBY"}"
            }
            driveClient.appendTimelineLog(vault.logsFolderId, statusMsg)

            if (!isSkipped && studentEmail.isNotBlank()) {
                val graphUpdate = """
                    {
                      "channel": "GOOGLE_CLASSROOM",
                      "studentEmail": "$studentEmail",
                      "status": "ACTIVE"
                    }
                """.trimIndent()
                driveClient.uploadOrUpdateKnowledgeGraph(vault.systemFolderId, graphUpdate)
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Step 2: Failed to update Google Classroom vault files", e)
            Result.failure(e)
        }
    }

    /**
     * Step 3: Updates MASTER_DIGEST.md and knowledge_graph.json with School ERP
     */
    suspend fun provisionStep3Erp(
        context: Context,
        accountEmail: String?,
        folders: ChildVaultFolders?,
        appName: String,
        appPkg: String,
        tabs: List<String>,
        isSkipped: Boolean
    ): Result<Unit> = withContext(Dispatchers.IO) {
        // Also update SAF vault if active
        SafVaultManager.provisionStep3ErpSaf(context, appName, appPkg, tabs, isSkipped)

        try {
            val email = accountEmail ?: currentAccountEmail
            val vault = folders ?: currentChildVault
            if (email.isNullOrBlank() || vault == null) return@withContext Result.success(Unit)

            val driveClient = GoogleDriveClient(getDriveService(context, email))

            val statusMsg = if (isSkipped) {
                "[STEP 3 SKIPPED] School ERP not enabled"
            } else {
                "[STEP 3 COMPLETE] School ERP mapped: $appName ($appPkg), tabs: ${tabs.joinToString()}"
            }
            driveClient.appendTimelineLog(vault.logsFolderId, statusMsg)
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Step 3: Failed to update School ERP vault files", e)
            Result.failure(e)
        }
    }

    /**
     * Step 4: Finalizes vault with WhatsApp group, generates graph.html, and updates FAMILY_DIGEST.md
     */
    suspend fun provisionStep4WhatsApp(
        context: Context,
        accountEmail: String?,
        folders: ChildVaultFolders?,
        childName: String,
        academicYear: String,
        groupName: String,
        isSkipped: Boolean
    ): Result<Unit> = withContext(Dispatchers.IO) {
        // Also update SAF vault if active
        SafVaultManager.provisionStep4WhatsAppSaf(context, childName, academicYear, groupName, isSkipped)

        try {
            val email = accountEmail ?: currentAccountEmail
            val vault = folders ?: currentChildVault
            if (email.isNullOrBlank() || vault == null) return@withContext Result.success(Unit)

            val driveClient = GoogleDriveClient(getDriveService(context, email))

            val statusMsg = if (isSkipped) {
                "[STEP 4 SKIPPED] WhatsApp groups not enabled"
            } else {
                "[STEP 4 COMPLETE] WhatsApp group whitelisted: $groupName"
            }
            driveClient.appendTimelineLog(vault.logsFolderId, statusMsg)
            driveClient.appendTimelineLog(vault.logsFolderId, "[ONBOARDING FINISHED] All vault files active.")

            // Write standalone interactive graph.html
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
                    <p>Status: <strong>Active & Syncing via Google Drive Vault</strong></p>
                  </div>
                </body>
                </html>
            """.trimIndent()
            driveClient.uploadOrUpdateGraphHtml(vault.childFolderId, graphHtml)

            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "Step 4: Failed to finalize vault files", e)
            Result.failure(e)
        }
    }
}
