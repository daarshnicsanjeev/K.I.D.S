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
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
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
    private const val PROVISIONING_AWAIT_TIMEOUT_MS = 6_000L
    const val DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file"
    const val GOOGLE_CLIENT_ID = "378609737196-c7bsdma5l20d1vf9r5dm7vahneai10am.apps.googleusercontent.com"

    @Volatile
    var currentChildVault: ChildVaultFolders? = null

    @Volatile
    var currentAccountEmail: String? = null

    @Volatile
    var activeProvisioningDeferred: CompletableDeferred<ChildVaultFolders>? = null

    fun saveVaultPrefs(context: Context, accountEmail: String, academicYear: String, childName: String) {
        context.getSharedPreferences("kids_vault_prefs", Context.MODE_PRIVATE).edit()
            .putString("account_email", accountEmail)
            .putString("academic_year", academicYear)
            .putString("child_name", childName)
            .apply()
    }

    fun getSavedVaultPrefs(context: Context): Triple<String?, String, String> {
        val prefs = context.getSharedPreferences("kids_vault_prefs", Context.MODE_PRIVATE)
        val email = prefs.getString("account_email", null) ?: currentAccountEmail
        val year = prefs.getString("academic_year", null) ?: "2026-2027"
        var child = prefs.getString("child_name", null) ?: ""
        if (child.isBlank()) {
            try {
                val db = com.kids.collector.data.db.KidsDatabase.getInstance(context)
                val firstChild = kotlinx.coroutines.runBlocking(Dispatchers.IO) {
                    db.childProfileDao().getAllChildrenDirect().firstOrNull()
                }
                if (firstChild != null && firstChild.firstName.isNotBlank()) {
                    child = firstChild.firstName
                    prefs.edit().putString("child_name", child).apply()
                }
            } catch (e: Exception) {
                Log.w(TAG, "Could not resolve child name fallback from DB: ${e.message}")
            }
        }
        return Triple(email, year, child)
    }

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

    fun saveGlobalFolderIds(context: Context, rootId: String, academicYear: String, yearId: String) {
        val cleanYear = academicYear.trim().ifBlank { "2026-2027" }
        context.getSharedPreferences("kids_vault_prefs", Context.MODE_PRIVATE).edit()
            .putString("global_root_kids_folder_id", rootId)
            .putString("global_year_folder_id_$cleanYear", yearId)
            .apply()
    }

    fun getSavedGlobalRootFolderId(context: Context): String? {
        return context.getSharedPreferences("kids_vault_prefs", Context.MODE_PRIVATE)
            .getString("global_root_kids_folder_id", null)
    }

    fun getSavedGlobalYearFolderId(context: Context, academicYear: String): String? {
        val cleanYear = academicYear.trim().ifBlank { "2026-2027" }
        return context.getSharedPreferences("kids_vault_prefs", Context.MODE_PRIVATE)
            .getString("global_year_folder_id_$cleanYear", null)
    }

    fun saveVaultFolderPrefs(context: Context, accountEmail: String, academicYear: String, childName: String, folders: ChildVaultFolders) {
        val cleanYear = academicYear.trim().ifBlank { "2026-2027" }
        val prefix = "vault_${accountEmail}_${cleanYear}_${childName.trim().lowercase()}_"
        context.getSharedPreferences("kids_vault_prefs", Context.MODE_PRIVATE).edit()
            .putString("account_email", accountEmail)
            .putString("academic_year", cleanYear)
            .putString("child_name", childName)
            .putString("global_root_kids_folder_id", folders.rootKidsFolderId)
            .putString("global_year_folder_id_$cleanYear", folders.yearFolderId)
            .putString("${prefix}rootKidsFolderId", folders.rootKidsFolderId)
            .putString("${prefix}yearFolderId", folders.yearFolderId)
            .putString("${prefix}childFolderId", folders.childFolderId)
            .putString("${prefix}attachmentsFolderId", folders.attachmentsFolderId)
            .putString("${prefix}systemFolderId", folders.systemFolderId)
            .putString("${prefix}logsFolderId", folders.logsFolderId)
            .apply()
    }

    fun getSavedVaultFolders(context: Context, accountEmail: String, academicYear: String, childName: String): ChildVaultFolders? {
        val prefs = context.getSharedPreferences("kids_vault_prefs", Context.MODE_PRIVATE)
        val prefix = "vault_${accountEmail}_${academicYear}_${childName.trim().lowercase()}_"
        val rootId = prefs.getString("${prefix}rootKidsFolderId", null) ?: return null
        val yearId = prefs.getString("${prefix}yearFolderId", null) ?: return null
        val childId = prefs.getString("${prefix}childFolderId", null) ?: return null
        val attachmentsFolderId = prefs.getString("${prefix}attachmentsFolderId", null) ?: return null
        val systemFolderId = prefs.getString("${prefix}systemFolderId", null) ?: return null
        val logsFolderId = prefs.getString("${prefix}logsFolderId", null) ?: return null
        return ChildVaultFolders(rootId, yearId, childId, attachmentsFolderId, systemFolderId, logsFolderId)
    }

    /**
     * Step 1: Provisions K.I.D.S. Data/{AcademicYear}/{ChildName}/ folders
     * and seeds initial template files. Transitions to Step 2 within ~1-2 seconds
     * (or < 50ms if cached) by seeding template files asynchronously in the background.
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

        if (childName.trim().isBlank()) {
            return@withContext ProvisionStep1Result.Failure(
                IllegalArgumentException("Child name cannot be blank."),
                "Please enter your child's name first."
            )
        }

        val deferred = CompletableDeferred<ChildVaultFolders>()
        activeProvisioningDeferred = deferred

        try {
            // Fast-path: If vault folders are already cached, transition immediately without network lag
            val cachedFolders = getSavedVaultFolders(context, accountEmail, academicYear, childName)
            if (cachedFolders != null) {
                currentChildVault = cachedFolders
                currentAccountEmail = accountEmail
                saveVaultPrefs(context, accountEmail, academicYear, childName)
                deferred.complete(cachedFolders)
                Log.i(TAG, "Step 1: Found existing cached vault folders. Transitioning immediately.")
                return@withContext ProvisionStep1Result.Success(cachedFolders)
            }

            val driveService = getDriveService(context, accountEmail)
            val driveClient = GoogleDriveClient(driveService)

            val cachedRootId = getSavedGlobalRootFolderId(context)
            val cachedYearId = getSavedGlobalYearFolderId(context, academicYear)

            Log.i(TAG, "Step 1: Rapidly provisioning child vault folders on Google Drive for $childName ($academicYear)...")
            val folders = driveClient.provisionChildVault(
                academicYear = academicYear,
                childName = childName,
                cachedRootKidsFolderId = cachedRootId,
                cachedYearFolderId = cachedYearId
            )
            currentChildVault = folders
            currentAccountEmail = accountEmail
            saveVaultFolderPrefs(context, accountEmail, academicYear, childName, folders)
            deferred.complete(folders)

            // Seed initial placeholder files asynchronously in background without blocking UI
            CoroutineScope(Dispatchers.IO).launch {
                try {
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

                    Log.i(TAG, "Step 1: Background initial file seeding completed successfully.")
                } catch (e: Exception) {
                    Log.w(TAG, "Step 1: Non-fatal error during background initial file seeding: ${e.message}")
                }
            }

            Log.i(TAG, "Step 1: Vault folders verified. Transitioning to Step 2 immediately.")
            ProvisionStep1Result.Success(folders)
        } catch (e: UserRecoverableAuthIOException) {
            deferred.completeExceptionally(e)
            Log.w(TAG, "User consent required for Google Drive access via UserRecoverableAuthIOException", e)
            ProvisionStep1Result.UserConsentRequired(e.intent)
        } catch (e: UserRecoverableAuthException) {
            deferred.completeExceptionally(e)
            Log.w(TAG, "User consent required for Google Drive access via UserRecoverableAuthException", e)
            val intent = e.intent ?: Intent()
            ProvisionStep1Result.UserConsentRequired(intent)
        } catch (e: Exception) {
            deferred.completeExceptionally(e)
            Log.e(TAG, "Step 1: Failed to provision Google Drive vault", e)
            val cause = e.cause
            if (cause is UserRecoverableAuthException) {
                Log.w(TAG, "Unwrapped UserRecoverableAuthException from cause", cause)
                val intent = cause.intent ?: Intent()
                ProvisionStep1Result.UserConsentRequired(intent)
            } else {
                val causeMsg = cause?.message
                val userMsg = if (!causeMsg.isNullOrBlank()) {
                    "${e.javaClass.simpleName}: $causeMsg"
                } else {
                    e.localizedMessage ?: e.javaClass.simpleName
                }
                ProvisionStep1Result.Failure(e, userMsg)
            }
        }
    }

    /**
     * Pre-warms the Google Drive OAuth token and resolves the global root and year folder IDs
     * in the background when the parent selects their Google Account in Step 1.
     */
    suspend fun preWarmOAuthAndFolders(context: Context, accountEmail: String, academicYear: String) = withContext(Dispatchers.IO) {
        if (accountEmail.isBlank()) return@withContext
        try {
            val driveService = getDriveService(context, accountEmail)
            val driveClient = GoogleDriveClient(driveService)
            val cachedRootId = getSavedGlobalRootFolderId(context)
            val rootId = if (!cachedRootId.isNullOrBlank()) {
                cachedRootId
            } else {
                driveClient.getOrCreateFolder("K.I.D.S. Data", null)
            }
            val cleanYear = academicYear.trim().ifBlank { "2026-2027" }
            val cachedYearId = getSavedGlobalYearFolderId(context, cleanYear)
            val yearId = if (!cachedYearId.isNullOrBlank()) {
                cachedYearId
            } else {
                driveClient.getOrCreateFolder(cleanYear, rootId)
            }
            saveGlobalFolderIds(context, rootId, cleanYear, yearId)
            Log.i(TAG, "Step 1: Successfully pre-warmed OAuth & cached global root ($rootId) and year ($yearId) folders.")
        } catch (preWarmError: Throwable) {
            Log.w(TAG, "Step 1: Background pre-warm note: ${preWarmError.message}")
        }
    }

    /**
     * Resolves child vault folders from in-memory cache, awaiting any in-flight background
     * provisioning, or falling back to remote resolution if necessary.
     */
    private suspend fun resolveOrAwaitChildVault(
        context: Context,
        explicitFolders: ChildVaultFolders?,
        accountEmail: String?
    ): ChildVaultFolders? {
        val email = accountEmail ?: currentAccountEmail ?: getSavedVaultPrefs(context).first
        var vault = explicitFolders ?: currentChildVault
        if (vault == null && activeProvisioningDeferred != null) {
            vault = try {
                withTimeoutOrNull(PROVISIONING_AWAIT_TIMEOUT_MS) { activeProvisioningDeferred?.await() }
            } catch (e: Exception) {
                null
            }
            if (vault != null) {
                currentChildVault = vault
            }
        }
        if (vault == null && !email.isNullOrBlank()) {
            val (_, academicYear, childName) = getSavedVaultPrefs(context)
            val driveClient = GoogleDriveClient(getDriveService(context, email))
            val cachedRootKidsFolderId = getSavedGlobalRootFolderId(context)
            val cachedYearFolderId = getSavedGlobalYearFolderId(context, academicYear)
            vault = driveClient.provisionChildVault(
                academicYear = academicYear,
                childName = childName,
                cachedRootKidsFolderId = cachedRootKidsFolderId,
                cachedYearFolderId = cachedYearFolderId
            )
            currentChildVault = vault
            currentAccountEmail = email
        }
        return vault
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
        try {
            // Also update SAF vault if active
            SafVaultManager.provisionStep2ClassroomSaf(context, studentEmail, isSkipped)

            val vault = resolveOrAwaitChildVault(context, folders, accountEmail)
            val email = accountEmail ?: currentAccountEmail ?: getSavedVaultPrefs(context).first
            if (email.isNullOrBlank() || vault == null) return@withContext Result.success(Unit)

            val driveClient = GoogleDriveClient(getDriveService(context, email))

            val backfillActive = com.kids.collector.service.KidsAccessibilityService.isEnabled(context)
            if (!isSkipped) {
                // Provision dedicated Google Classroom vault folder & attachments subfolder
                val classroomVault = driveClient.provisionChannelVault(vault.childFolderId, "Google Classroom")
                val timeStampStr = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date())
                val initialDigest = """
                    # Google Classroom Digest
                    **Student Account:** $studentEmail
                    **Status:** Active & Monitoring
                    **Configured:** $timeStampStr

                    ---

                    ## Announcements & Assignments
                    * Real-time monitoring and historical backfill crawler active.
                """.trimIndent()
                driveClient.uploadOrUpdateChannelDigest(classroomVault.channelFolderId, initialDigest)
            }

            val statusMsg = if (isSkipped) {
                "[STEP 2 SKIPPED] Google Classroom not enabled"
            } else {
                "[STEP 2 COMPLETE] Google Classroom mapped: $studentEmail | Vault: Google Classroom/ (attachments/) | Historical Backfill Crawler: ${if (backfillActive) "ACTIVE" else "STANDBY"}"
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
        } catch (t: Throwable) {
            Log.e(TAG, "Step 2: Failed to update Google Classroom vault files", t)
            Result.failure(Exception(t.message ?: "Step 2 update warning", t))
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
        try {
            // Also update SAF vault if active
            SafVaultManager.provisionStep3ErpSaf(context, appName, appPkg, tabs, isSkipped)

            val vault = resolveOrAwaitChildVault(context, folders, accountEmail)
            val email = accountEmail ?: currentAccountEmail ?: getSavedVaultPrefs(context).first
            if (email.isNullOrBlank() || vault == null) return@withContext Result.success(Unit)

            val driveClient = GoogleDriveClient(getDriveService(context, email))

            val statusMsg = if (isSkipped) {
                "[STEP 3 SKIPPED] School ERP not enabled"
            } else {
                "[STEP 3 COMPLETE] School ERP mapped: $appName ($appPkg), tabs: ${tabs.joinToString()}"
            }
            driveClient.appendTimelineLog(vault.logsFolderId, statusMsg)
            Result.success(Unit)
        } catch (t: Throwable) {
            Log.e(TAG, "Step 3: Failed to update School ERP vault files", t)
            Result.failure(Exception(t.message ?: "Step 3 update warning", t))
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
        try {
            // Also update SAF vault if active
            SafVaultManager.provisionStep4WhatsAppSaf(context, childName, academicYear, groupName, isSkipped)

            val vault = resolveOrAwaitChildVault(context, folders, accountEmail)
            val email = accountEmail ?: currentAccountEmail ?: getSavedVaultPrefs(context).first
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
        } catch (t: Throwable) {
            Log.e(TAG, "Step 4: Failed to finalize vault files", t)
            Result.failure(Exception(t.message ?: "Step 4 update warning", t))
        }
    }
}
