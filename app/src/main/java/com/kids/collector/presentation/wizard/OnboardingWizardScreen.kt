package com.kids.collector.presentation.wizard

import android.accounts.AccountManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import android.app.Activity
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.kids.collector.presentation.permission.PermissionHelper
import com.kids.collector.data.drive.DriveVaultManager
import com.kids.collector.data.drive.ProvisionStep1Result
import com.kids.collector.data.drive.SafVaultManager
import com.kids.collector.domain.model.ChannelConfig
import com.kids.collector.domain.model.ChannelType
import com.kids.collector.domain.model.ChildProfile
import com.kids.collector.presentation.theme.*
import com.kids.collector.service.KidsAccessibilityService
import kotlinx.coroutines.launch
import java.util.UUID

enum class WizardStep(val stepNumber: Int, val title: String) {
    STEP_0_PERMISSIONS(0, "System Permissions & Access"),
    STEP_1_VAULT(1, "Cloud Vault & Child Profile"),
    STEP_2_CLASSROOM(2, "Google Classroom Mapping"),
    STEP_3_PORTALS(3, "School App & ERP Picker"),
    STEP_4_WHATSAPP(4, "WhatsApp Group Capture")
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun OnboardingWizardScreen(
    childSequenceNumber: Int = 1,
    onFinishChildSetup: (ChildProfile) -> Unit,
    onCancel: (() -> Unit)? = null
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    val prefs = remember { context.getSharedPreferences("kids_vault_prefs", Context.MODE_PRIVATE) }
    val savedEmail = remember { prefs.getString("account_email", "") ?: "" }
    val savedChild = remember { prefs.getString("child_name", "") ?: "" }
    val savedYear = remember { prefs.getString("academic_year", "2026-2027") ?: "2026-2027" }
    val savedStepStr = remember { prefs.getString("wizard_current_step", null) }

    // Dynamic Permission Tracking with ON_RESUME observer
    var hasAccessibility by remember {
        mutableStateOf(PermissionHelper.isAccessibilityGranted(context))
    }
    var hasNotificationAccess by remember {
        mutableStateOf(PermissionHelper.isNotificationAccessGranted(context))
    }
    var hasStorageAccess by remember {
        mutableStateOf(PermissionHelper.hasStorageAccess(context))
    }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                hasAccessibility = PermissionHelper.isAccessibilityGranted(context)
                hasNotificationAccess = PermissionHelper.isNotificationAccessGranted(context)
                hasStorageAccess = PermissionHelper.hasStorageAccess(context)
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    val isNewChildSession = childSequenceNumber > 1
    val isAccessibilityActiveInitial = PermissionHelper.isAccessibilityGranted(context)
    val initialStep = remember {
        try {
            if (!isAccessibilityActiveInitial) {
                WizardStep.STEP_0_PERMISSIONS
            } else if (!isNewChildSession && savedEmail.isNotBlank() && savedChild.isNotBlank() && savedStepStr != null) {
                val step = WizardStep.valueOf(savedStepStr)
                if (step == WizardStep.STEP_0_PERMISSIONS) WizardStep.STEP_1_VAULT else step
            } else if (!isNewChildSession && savedEmail.isNotBlank() && savedChild.isNotBlank()) {
                WizardStep.STEP_2_CLASSROOM
            } else {
                WizardStep.STEP_1_VAULT
            }
        } catch (e: Exception) {
            if (!isAccessibilityActiveInitial) WizardStep.STEP_0_PERMISSIONS else WizardStep.STEP_1_VAULT
        }
    }

    var currentStep by rememberSaveable { mutableStateOf(initialStep) }
    var preRevocationStep by rememberSaveable { mutableStateOf<WizardStep?>(null) }

    LaunchedEffect(currentStep) {
        if (!isNewChildSession) {
            prefs.edit().putString("wizard_current_step", currentStep.name).apply()
        }
    }

    // Strict Invariant: If Accessibility is revoked, return to STEP_0_PERMISSIONS.
    // Cache the previous step so the parent resumes seamlessly once Accessibility is re-enabled.
    LaunchedEffect(hasAccessibility) {
        if (!hasAccessibility && currentStep != WizardStep.STEP_0_PERMISSIONS) {
            preRevocationStep = currentStep
            currentStep = WizardStep.STEP_0_PERMISSIONS
        } else if (hasAccessibility && preRevocationStep != null && currentStep == WizardStep.STEP_0_PERMISSIONS) {
            val resumeStep = preRevocationStep!!
            preRevocationStep = null
            currentStep = resumeStep
        }
    }

    // Hardware and Gesture Back Navigation
    BackHandler {
        when (currentStep) {
            WizardStep.STEP_0_PERMISSIONS -> onCancel?.invoke()
            WizardStep.STEP_1_VAULT -> {
                if (!hasAccessibility) {
                    currentStep = WizardStep.STEP_0_PERMISSIONS
                } else if (onCancel != null) {
                    onCancel()
                } else {
                    currentStep = WizardStep.STEP_0_PERMISSIONS
                }
            }
            WizardStep.STEP_2_CLASSROOM -> currentStep = WizardStep.STEP_1_VAULT
            WizardStep.STEP_3_PORTALS -> currentStep = WizardStep.STEP_2_CLASSROOM
            WizardStep.STEP_4_WHATSAPP -> currentStep = WizardStep.STEP_3_PORTALS
        }
    }

    // Real-time Drive Provisioning State
    var isProvisioning by remember { mutableStateOf(false) }
    var provisioningMessage by remember { mutableStateOf("") }

    // Step 1 State: Drive First & Minimal Child Info
    var driveAccountEmail by rememberSaveable { mutableStateOf(savedEmail) }
    var isDriveConnected by rememberSaveable { mutableStateOf(savedEmail.isNotBlank()) }
    var driveErrorMessage by rememberSaveable { mutableStateOf<String?>(null) }
    var childName by rememberSaveable { mutableStateOf(if (isNewChildSession) "" else savedChild) }
    val academicYears = remember { listOf("2026-2027", "2025-2026", "2027-2028") }
    var selectedYear by rememberSaveable { mutableStateOf(savedYear) }
    var photoUri by rememberSaveable { mutableStateOf<Uri?>(null) }

    LaunchedEffect(savedEmail) {
        if (savedEmail.isNotBlank() && driveAccountEmail.isBlank()) {
            driveAccountEmail = savedEmail
            isDriveConnected = true
        }
    }

    // Step 1 Direct Google Drive Account Picker Launcher (native Android AccountManager)
    val driveAccountPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val selectedEmail = result.data?.getStringExtra(AccountManager.KEY_ACCOUNT_NAME)
        if (!selectedEmail.isNullOrBlank()) {
            driveAccountEmail = selectedEmail
            isDriveConnected = true
            driveErrorMessage = null
            DriveVaultManager.currentAccountEmail = selectedEmail
            prefs.edit().putString("account_email", selectedEmail).apply()
            Toast.makeText(context, "Google Account connected: $selectedEmail", Toast.LENGTH_SHORT).show()
        }
    }

    // Step 1 Google OAuth User Consent Launcher (handles UserRecoverableAuthIOException / UserRecoverableAuthException)
    val driveConsentLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            Toast.makeText(context, "Permission granted! Initializing vault on Google Drive...", Toast.LENGTH_SHORT).show()
            scope.launch {
                isProvisioning = true
                provisioningMessage = "Creating K.I.D.S. Data/$selectedYear/${childName.trim()}/ on Google Drive..."
                when (val provResult = DriveVaultManager.provisionStep1(context, driveAccountEmail, selectedYear, childName.trim())) {
                    is ProvisionStep1Result.Success -> {
                        isProvisioning = false
                        Toast.makeText(context, "✓ Step 1: Vault created on Google Drive!", Toast.LENGTH_SHORT).show()
                        currentStep = WizardStep.STEP_2_CLASSROOM
                    }
                    is ProvisionStep1Result.UserConsentRequired -> {
                        isProvisioning = false
                        driveErrorMessage = "Additional consent required. Please tap save to retry."
                    }
                    is ProvisionStep1Result.Failure -> {
                        isProvisioning = false
                        driveErrorMessage = provResult.userMessage
                        Toast.makeText(context, "Drive Error: ${provResult.userMessage}", Toast.LENGTH_LONG).show()
                    }
                }
            }
        } else {
            Toast.makeText(context, "Google Drive access was not approved.", Toast.LENGTH_LONG).show()
        }
    }

    // Step 1 Photo Picker Launcher
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        photoUri = uri
    }

    // Step 2 State (Classroom: System Account Picker, No Typing, No Auto Rules)
    val savedStudentEmail = remember { prefs.getString("wizard_student_email", "") ?: "" }
    var enableClassroom by rememberSaveable { mutableStateOf(true) }
    var studentEmail by rememberSaveable { mutableStateOf(savedStudentEmail) }

    LaunchedEffect(studentEmail) {
        if (studentEmail.isNotBlank()) {
            prefs.edit().putString("wizard_student_email", studentEmail).apply()
        }
    }

    val classroomAccountLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val selected = result.data?.getStringExtra(AccountManager.KEY_ACCOUNT_NAME)
        if (!selected.isNullOrBlank()) {
            studentEmail = selected
            prefs.edit().putString("wizard_student_email", selected).apply()
        }
    }

    // Step 3 State (School Portals: Installed App Picker)
    var enableErp by remember { mutableStateOf(true) }
    val installedApps = remember {
        queryInstalledLauncherApps(context)
    }
    var selectedAppPackage by remember {
        mutableStateOf(installedApps.firstOrNull()?.second ?: "com.campuscare.parent")
    }
    var selectedAppName by remember {
        mutableStateOf(installedApps.firstOrNull()?.first ?: "CampusCare / School ERP")
    }
    val availableTabs = remember { listOf("Homework", "Circulars", "Attendance", "Fee Receipts") }
    val selectedTabs = remember { mutableStateListOf("Homework", "Circulars") }

    // Step 4 State (WhatsApp: Auto-Captured Group, Zero Typing)
    var enableWhatsApp by remember { mutableStateOf(true) }
    val detectedGroups = remember {
        listOf(
            "School Parents Official Group 2026-27",
            "Grade Activity & Homework Updates",
            "Class Circulars & Announcements"
        )
    }
    var selectedGroup by remember { mutableStateOf(detectedGroups.first()) }
    var isListeningForNotification by remember { mutableStateOf(false) }

    val isStep1Valid = isDriveConnected && childName.isNotBlank()

    Scaffold(
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DeepNavy)
                    .padding(horizontal = 20.dp, vertical = 18.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (currentStep != WizardStep.STEP_0_PERMISSIONS || onCancel != null) {
                        IconButton(
                            onClick = {
                                when (currentStep) {
                                    WizardStep.STEP_0_PERMISSIONS -> onCancel?.invoke()
                                    WizardStep.STEP_1_VAULT -> {
                                        if (!hasAccessibility) currentStep = WizardStep.STEP_0_PERMISSIONS
                                        else onCancel?.invoke() ?: run { currentStep = WizardStep.STEP_0_PERMISSIONS }
                                    }
                                    WizardStep.STEP_2_CLASSROOM -> currentStep = WizardStep.STEP_1_VAULT
                                    WizardStep.STEP_3_PORTALS -> currentStep = WizardStep.STEP_2_CLASSROOM
                                    WizardStep.STEP_4_WHATSAPP -> currentStep = WizardStep.STEP_3_PORTALS
                                }
                            },
                            modifier = Modifier.size(48.dp)
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Navigate Back",
                                tint = SurfaceWhite
                            )
                        }
                        Spacer(modifier = Modifier.width(4.dp))
                    }

                    Row(
                        modifier = Modifier.weight(1f),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "K.I.D.S. Onboarding",
                            style = MaterialTheme.typography.titleLarge,
                            color = SurfaceWhite,
                            modifier = Modifier.semantics { heading() }
                        )
                        Badge(containerColor = AmberOrange, contentColor = TextPrimary) {
                            Text("Child #$childSequenceNumber")
                        }
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = if (currentStep == WizardStep.STEP_0_PERMISSIONS) {
                        "Prerequisite: ${currentStep.title}"
                    } else {
                        "Step ${currentStep.stepNumber} of 4: ${currentStep.title}"
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = AmberOrange
                )

                // Live Provisioning Banner
                if (isProvisioning) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(DeepNavy, RoundedCornerShape(8.dp))
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = AmberOrange,
                            strokeWidth = 2.dp
                        )
                        Text(
                            text = provisioningMessage,
                            style = MaterialTheme.typography.bodySmall,
                            color = SurfaceWhite
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(20.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            if (currentStep != WizardStep.STEP_0_PERMISSIONS && !hasNotificationAccess) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = AmberOrange.copy(alpha = 0.12f)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "⚠️ Notification Access Needed",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = DeepNavy
                            )
                            Text(
                                text = "Required to capture incoming notices silently.",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary
                            )
                        }
                        Button(
                            onClick = {
                                PermissionHelper.openNotificationListenerSettings(context)
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = DeepNavy),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp),
                            modifier = Modifier.defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                        ) {
                            Text("Enable", style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
            }

            when (currentStep) {
                WizardStep.STEP_0_PERMISSIONS -> {
                    // SECTION 0: ADVANCE PERMISSION (ALLOW RESTRICTED SETTINGS) - ONLY ON ANDROID 13+
                    if (PermissionHelper.isRestrictedSettingsLikelyRequired() && (!hasAccessibility || !hasNotificationAccess)) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                            shape = RoundedCornerShape(12.dp),
                            border = androidx.compose.foundation.BorderStroke(1.5.dp, DeepNavy)
                        ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "⚠️ Advance Permission (Android 13+)",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = DeepNavy,
                                    fontWeight = FontWeight.Bold
                                )
                                Surface(
                                    color = AmberOrange.copy(alpha = 0.2f),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = "DO FIRST",
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = DeepNavy,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }

                            Text(
                                text = "Because K.I.D.S. is directly installed (sideloaded APK), Android locks Accessibility and Notification settings by default until you enable Restricted Settings in App Info.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextPrimary
                            )

                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(OffWhiteCanvas, RoundedCornerShape(8.dp))
                                    .padding(10.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text("1. Tap 'Open App Settings (⋮)' below.", style = MaterialTheme.typography.bodySmall, color = TextPrimary)
                                Text("2. Tap the 3 dots (⋮) in the top-right corner of the App Info page.", style = MaterialTheme.typography.bodySmall, color = TextPrimary)
                                Text("3. Tap 'Allow restricted settings' and confirm with your PIN/fingerprint.", style = MaterialTheme.typography.bodySmall, color = TextPrimary)
                            }

                            Button(
                                onClick = {
                                    Toast.makeText(context, "Tap top-right 3 dots (⋮) -> 'Allow restricted settings'", Toast.LENGTH_LONG).show()
                                    PermissionHelper.openAppDetailsSettings(context)
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .defaultMinSize(minHeight = 48.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)
                            ) {
                                Text("Open App Settings (⋮ \u2192 Allow restricted settings)", color = SurfaceWhite)
                            }
                        }
                    }
                }

                    // SECTION 1: ACCESSIBILITY SERVICE (MANDATORY BEFORE STEP 1)
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = if (hasAccessibility) SuccessGreen.copy(alpha = 0.06f) else SurfaceWhite
                        ),
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(
                            width = 1.5.dp,
                            color = if (hasAccessibility) SuccessGreen else MaterialTheme.colorScheme.error
                        )
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "1. Accessibility Service",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = DeepNavy,
                                    fontWeight = FontWeight.Bold
                                )
                                Surface(
                                    color = if (hasAccessibility) SuccessGreen else MaterialTheme.colorScheme.error,
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = if (hasAccessibility) "\u2713 ACTIVE" else "MANDATORY",
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }

                            Text(
                                text = "Powers autonomous notice backfill directly from Google Classroom & School ERPs into your personal Drive vault. 100% on-device, zero cloud proxy.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextSecondary
                            )

                            if (hasAccessibility) {
                                Surface(
                                    color = SuccessGreen.copy(alpha = 0.15f),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = "\u2713 Accessibility Service is active. You are ready to proceed to Step 1!",
                                        modifier = Modifier.padding(10.dp),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = DeepNavy,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            } else {
                                Text(
                                    text = "How to enable:\n1. Tap 'Enable Accessibility Service' below.\n2. Under 'Downloaded apps' or 'Installed services', tap 'K.I.D.S.'.\n3. Turn the switch ON.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextPrimary
                                )

                                Button(
                                    onClick = {
                                        Toast.makeText(context, "Under Downloaded Apps, turn on 'K.I.D.S.'", Toast.LENGTH_LONG).show()
                                        PermissionHelper.openAccessibilitySettings(context)
                                    },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .defaultMinSize(minHeight = 48.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                                ) {
                                    Text("Enable Accessibility Service \u2192", color = SurfaceWhite)
                                }
                            }
                        }
                    }

                    // SECTION 2: NOTIFICATION LISTENER SERVICE
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = if (hasNotificationAccess) SuccessGreen.copy(alpha = 0.06f) else SurfaceWhite
                        ),
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(
                            width = 1.dp,
                            color = if (hasNotificationAccess) SuccessGreen else LightSlate
                        )
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "2. Notification Listener Service",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = DeepNavy,
                                    fontWeight = FontWeight.Bold
                                )
                                Surface(
                                    color = if (hasNotificationAccess) SuccessGreen else AmberOrange,
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = if (hasNotificationAccess) "\u2713 ACTIVE" else "RECOMMENDED",
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }

                            Text(
                                text = "Enables 24/7 background capture of homework, circulars, and announcements from school WhatsApp groups and school app push notifications.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextSecondary
                            )

                            if (hasNotificationAccess) {
                                Surface(
                                    color = SuccessGreen.copy(alpha = 0.15f),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = "\u2713 Notification access is active. Real-time capture is ready.",
                                        modifier = Modifier.padding(10.dp),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = DeepNavy,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            } else {
                                OutlinedButton(
                                    onClick = {
                                        Toast.makeText(context, "Find 'K.I.D.S.' and toggle ON", Toast.LENGTH_LONG).show()
                                        PermissionHelper.openNotificationListenerSettings(context)
                                    },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .defaultMinSize(minHeight = 48.dp)
                                ) {
                                    Text("Enable Notification Access \u2192")
                                }
                            }
                        }
                    }

                    // SECTION 3: STORAGE & DOWNLOADS ACCESS
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = if (hasStorageAccess) SuccessGreen.copy(alpha = 0.06f) else SurfaceWhite
                        ),
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(
                            width = 1.dp,
                            color = if (hasStorageAccess) SuccessGreen else LightSlate
                        )
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "3. Storage & Downloads Access",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = DeepNavy,
                                    fontWeight = FontWeight.Bold
                                )
                                Surface(
                                    color = if (hasStorageAccess) SuccessGreen else AmberOrange,
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = if (hasStorageAccess) "\u2713 ACTIVE" else "RECOMMENDED",
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }

                            Text(
                                text = "Allows K.I.D.S. to detect downloaded circulars, worksheets, and textbooks to sync them to your Drive vault without cluttering your phone storage.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextSecondary
                            )

                            if (hasStorageAccess) {
                                Surface(
                                    color = SuccessGreen.copy(alpha = 0.15f),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = "\u2713 Storage access granted. Auto-sync for downloads is ready.",
                                        modifier = Modifier.padding(10.dp),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = DeepNavy,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            } else {
                                OutlinedButton(
                                    onClick = {
                                        PermissionHelper.openStorageAccessSettings(context)
                                    },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .defaultMinSize(minHeight = 48.dp)
                                ) {
                                    Text("Enable Storage Access \u2192")
                                }
                            }
                        }
                    }

                    // PROCEED GATE BUTTON (MANDATORY ACCESSIBILITY CHECK)
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (!hasAccessibility) {
                            Surface(
                                color = MaterialTheme.colorScheme.error.copy(alpha = 0.12f),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = "⚠️ Accessibility Service is mandatory before Step 1. Please enable it above to unlock Step 1.",
                                    modifier = Modifier.padding(12.dp),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.error,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        Button(
                            onClick = {
                                currentStep = WizardStep.STEP_1_VAULT
                            },
                            enabled = hasAccessibility,
                            modifier = Modifier
                                .fillMaxWidth()
                                .defaultMinSize(minHeight = 48.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)
                        ) {
                            Text(
                                text = "Continue to Step 1: Cloud Vault & Profile \u2192",
                                color = SurfaceWhite,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                WizardStep.STEP_1_VAULT -> {
                    // SECTION 1: GOOGLE DRIVE VAULT ACCOUNT (REQUIRED 1ST)
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text(
                                text = "1. Private Google Drive Vault [Connect First]",
                                style = MaterialTheme.typography.titleMedium,
                                color = DeepNavy
                            )
                            Text(
                                text = "Strictly scoped to drive.file ($0 cost, 100% privacy). Files & folders will be created directly on your Google Drive as you complete each step.",
                                style = MaterialTheme.typography.bodyMedium
                            )

                            if (isDriveConnected) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "✓ Google Account Connected",
                                            color = SuccessGreen,
                                            style = MaterialTheme.typography.labelLarge
                                        )
                                        Text(driveAccountEmail, color = TextSecondary, style = MaterialTheme.typography.bodySmall)
                                    }
                                    OutlinedButton(
                                        onClick = {
                                            isDriveConnected = false
                                            driveErrorMessage = null
                                        },
                                        modifier = Modifier.defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                                    ) {
                                        Text("Change")
                                    }
                                }
                            } else {
                                Button(
                                    onClick = {
                                        launchAccountPicker(driveAccountPickerLauncher)
                                    },
                                    modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)
                                ) {
                                    Text("Select Google Account for Vault", color = SurfaceWhite)
                                }
                            }
                        }
                    }

                    // SECTION 2: CHILD DETAILS (REVEALED ONLY AFTER DRIVE CONNECTED)
                    if (isDriveConnected) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text(
                                    text = "2. Child Details",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = DeepNavy
                                )

                                OutlinedTextField(
                                    value = childName,
                                    onValueChange = { childName = it },
                                    label = { Text("Child First Name *") },
                                    placeholder = { Text("Enter child's first name") },
                                    modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp)
                                )

                                Text(
                                    text = "Academic Year *",
                                    style = MaterialTheme.typography.labelLarge,
                                    color = TextPrimary
                                )
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    academicYears.forEach { yr ->
                                        FilterChip(
                                            selected = selectedYear == yr,
                                            onClick = { selectedYear = yr },
                                            label = { Text(yr) },
                                            modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                                        )
                                    }
                                }

                                Text(
                                    text = "Child Photo (Optional)",
                                    style = MaterialTheme.typography.labelLarge,
                                    color = TextPrimary
                                )
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    OutlinedButton(
                                        onClick = {
                                            photoPickerLauncher.launch(
                                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                            )
                                        },
                                        modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                                    ) {
                                        Text(if (photoUri != null) "✓ Photo Selected" else "Choose Photo")
                                    }
                                    if (photoUri != null) {
                                        TextButton(onClick = { photoUri = null }) {
                                            Text("Remove", color = MaterialTheme.colorScheme.error)
                                        }
                                    }
                                }
                            }
                        }

                        if (driveErrorMessage != null) {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = AmberOrange.copy(alpha = 0.12f)),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text(
                                        text = "Google Drive Authorization Setup",
                                        style = MaterialTheme.typography.titleSmall,
                                        color = DeepNavy,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = driveErrorMessage ?: "",
                                        color = MaterialTheme.colorScheme.error,
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Text(
                                        text = "To allow automatic vault creation without manual folder selection, register this SHA-1 once in your Google Cloud Console project:",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = TextPrimary
                                    )
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .background(SurfaceWhite, RoundedCornerShape(8.dp))
                                            .padding(10.dp),
                                        verticalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Text("• Package Name: com.kids.collector.debug", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                                        Text("• SHA-1: D7:6F:AA:F1:98:E2:88:E8:AB:79:17:5B:65:13:BA:84:9F:E1:6E:88", style = MaterialTheme.typography.labelSmall, color = DeepNavy, fontWeight = FontWeight.Bold)
                                    }
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        OutlinedButton(
                                            onClick = {
                                                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                                                val clip = android.content.ClipData.newPlainText("SHA-1", "D7:6F:AA:F1:98:E2:88:E8:AB:79:17:5B:65:13:BA:84:9F:E1:6E:88")
                                                clipboard.setPrimaryClip(clip)
                                                Toast.makeText(context, "SHA-1 copied to clipboard!", Toast.LENGTH_SHORT).show()
                                            },
                                            modifier = Modifier.weight(1f).defaultMinSize(minHeight = 48.dp)
                                        ) {
                                            Text("Copy SHA-1")
                                        }
                                        Button(
                                            onClick = {
                                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://console.cloud.google.com/apis/credentials"))
                                                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                                                context.startActivity(intent)
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = DeepNavy),
                                            modifier = Modifier.weight(1f).defaultMinSize(minHeight = 48.dp)
                                        ) {
                                            Text("Open Console")
                                        }
                                    }
                                }
                            }
                        }

                        Button(
                            onClick = {
                                scope.launch {
                                    isProvisioning = true
                                    provisioningMessage = "Creating K.I.D.S. Data/$selectedYear/${childName.trim()}/ on Google Drive..."
                                    driveErrorMessage = null

                                    when (val result = DriveVaultManager.provisionStep1(context, driveAccountEmail, selectedYear, childName.trim())) {
                                        is ProvisionStep1Result.Success -> {
                                            isProvisioning = false
                                            Toast.makeText(context, "✓ Step 1: Vault created on Google Drive!", Toast.LENGTH_SHORT).show()
                                            currentStep = WizardStep.STEP_2_CLASSROOM
                                        }
                                        is ProvisionStep1Result.UserConsentRequired -> {
                                            isProvisioning = false
                                            Toast.makeText(context, "Please approve Google Drive permission...", Toast.LENGTH_SHORT).show()
                                            driveConsentLauncher.launch(result.consentIntent)
                                        }
                                        is ProvisionStep1Result.Failure -> {
                                            isProvisioning = false
                                            driveErrorMessage = result.userMessage
                                            Toast.makeText(context, "Drive Error: ${result.userMessage}", Toast.LENGTH_LONG).show()
                                        }
                                    }
                                }
                            },
                            enabled = isStep1Valid && !isProvisioning,
                            modifier = Modifier
                                .fillMaxWidth()
                                .defaultMinSize(minHeight = 48.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)
                        ) {
                            Text("Save Profile & Create Vault on Drive \u2192", color = SurfaceWhite)
                        }
                    }
                }

                WizardStep.STEP_2_CLASSROOM -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Google Classroom Mapping", style = MaterialTheme.typography.titleMedium, color = DeepNavy)
                                Switch(checked = enableClassroom, onCheckedChange = { enableClassroom = it })
                            }

                            if (enableClassroom) {
                                Text(
                                    text = "Select the student account signed in on this device. No school password or re-authentication required.",
                                    style = MaterialTheme.typography.bodyMedium
                                )

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("Student Account:", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                                        Text(
                                            text = if (studentEmail.isNotBlank()) studentEmail else "No account selected yet",
                                            style = MaterialTheme.typography.bodyLarge,
                                            color = TextPrimary
                                        )
                                    }
                                    Button(
                                        onClick = {
                                            launchAccountPicker(classroomAccountLauncher)
                                        },
                                        modifier = Modifier.defaultMinSize(minHeight = 48.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)
                                    ) {
                                        Text(if (studentEmail.isNotBlank()) "Change" else "Select Account")
                                    }
                                }

                                HorizontalDivider(color = LightSlate)

                                // Historical Data Backfill Section
                                Text(
                                    text = "Historical Data Backfill (Past Notices)",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = DeepNavy
                                )
                                Text(
                                    text = "When you open Classroom, a floating K.I.D.S. Assistant pill appears with a one-tap Auto-Capture button (scrolling at the calibrated optimal pace) to extract and sync past notices.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextSecondary
                                )

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    if (hasAccessibility) {
                                        Surface(
                                            color = SuccessGreen.copy(alpha = 0.15f),
                                            shape = RoundedCornerShape(8.dp)
                                        ) {
                                            Text(
                                                text = "✓ Backfill Assistant Active",
                                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                                style = MaterialTheme.typography.labelMedium,
                                                color = DeepNavy
                                            )
                                        }
                                        OutlinedButton(
                                            onClick = {
                                                val launchIntent = context.packageManager.getLaunchIntentForPackage("com.google.android.apps.classroom")
                                                if (launchIntent != null) {
                                                    context.startActivity(launchIntent)
                                                } else {
                                                    Toast.makeText(context, "Google Classroom is not installed", Toast.LENGTH_SHORT).show()
                                                }
                                            },
                                            modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                                        ) {
                                            Text("Open Classroom")
                                        }
                                    } else {
                                        OutlinedButton(
                                            onClick = {
                                                try {
                                                    val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                                                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                                                    }
                                                    context.startActivity(intent)
                                                    Toast.makeText(context, "Turn on 'K.I.D.S.' under Downloaded Apps / Accessibility", Toast.LENGTH_LONG).show()
                                                } catch (e: Exception) {
                                                    Toast.makeText(context, "Could not open Accessibility Settings", Toast.LENGTH_SHORT).show()
                                                }
                                            },
                                            modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                                        ) {
                                            Text("Enable Backfill Assistant")
                                        }
                                    }
                                }

                                HorizontalDivider(color = LightSlate)

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "Storage & Downloads Access",
                                            style = MaterialTheme.typography.labelLarge,
                                            color = DeepNavy,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            text = "Allows K.I.D.S. to detect downloaded circulars & worksheets to sync physical PDFs into your vault.",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = TextSecondary
                                        )
                                    }
                                    if (hasStorageAccess) {
                                        Surface(color = SuccessGreen.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp)) {
                                            Text("✓ Granted", modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, color = DeepNavy)
                                        }
                                    } else {
                                        OutlinedButton(
                                            onClick = {
                                                PermissionHelper.openStorageAccessSettings(context)
                                            },
                                            modifier = Modifier.defaultMinSize(minHeight = 48.dp, minWidth = 48.dp)
                                        ) {
                                            Text("Enable")
                                        }
                                    }
                                }

                                Surface(
                                    color = DeepNavy.copy(alpha = 0.05f),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(modifier = Modifier.padding(10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Text("💡", style = MaterialTheme.typography.bodyMedium)
                                        Text(
                                            text = "Tip: Run Auto-Capture across both the Stream tab (for circulars & announcements) and the Classwork tab (for all subject worksheets & textbooks).",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = TextPrimary
                                        )
                                    }
                                }
                            }
                        }
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedButton(
                            onClick = {
                                scope.launch {
                                    isProvisioning = true
                                    provisioningMessage = "Updating vault on Google Drive..."
                                    DriveVaultManager.provisionStep2Classroom(context, driveAccountEmail, DriveVaultManager.currentChildVault, "", isSkipped = true)
                                    isProvisioning = false
                                    enableClassroom = false
                                    currentStep = WizardStep.STEP_3_PORTALS
                                }
                            },
                            enabled = !isProvisioning,
                            modifier = Modifier.weight(1f).defaultMinSize(minHeight = 48.dp)
                        ) {
                            Text("Skip Classroom")
                        }
                        Button(
                            onClick = {
                                scope.launch {
                                    try {
                                        isProvisioning = true
                                        provisioningMessage = "Updating Google Drive with Classroom mapping..."
                                        val res = DriveVaultManager.provisionStep2Classroom(context, driveAccountEmail, DriveVaultManager.currentChildVault, studentEmail, isSkipped = !enableClassroom)
                                        isProvisioning = false
                                        if (res.isSuccess) {
                                            Toast.makeText(context, "✓ Step 2: Classroom mapped on Google Drive", Toast.LENGTH_SHORT).show()
                                        } else {
                                            val err = res.exceptionOrNull()?.localizedMessage ?: "Drive update warning"
                                            Toast.makeText(context, "Drive note: $err", Toast.LENGTH_SHORT).show()
                                        }
                                        currentStep = WizardStep.STEP_3_PORTALS
                                    } catch (t: Throwable) {
                                        isProvisioning = false
                                        Log.e("OnboardingWizardScreen", "Error during Step 2 next", t)
                                        currentStep = WizardStep.STEP_3_PORTALS
                                    }
                                }
                            },
                            enabled = !isProvisioning,
                            modifier = Modifier.weight(1f).defaultMinSize(minHeight = 48.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)
                        ) {
                            Text("Save & Next \u2192")
                        }
                    }
                }

                WizardStep.STEP_3_PORTALS -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("School App & ERP Picker", style = MaterialTheme.typography.titleMedium, color = DeepNavy)
                                Switch(checked = enableErp, onCheckedChange = { enableErp = it })
                            }

                            if (enableErp) {
                                Text(
                                    text = "Select your installed school portal application from your device (no typing required):",
                                    style = MaterialTheme.typography.bodyMedium
                                )

                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    installedApps.take(6).forEach { (appName, appPkg) ->
                                        val isSelected = selectedAppPackage == appPkg
                                        FilterChip(
                                            selected = isSelected,
                                            onClick = {
                                                selectedAppPackage = appPkg
                                                selectedAppName = appName
                                            },
                                            label = { Text(appName) },
                                            modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp)
                                        )
                                    }
                                }

                                Text("Selected Features for $selectedAppName:", style = MaterialTheme.typography.labelLarge)
                                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    availableTabs.forEach { tab ->
                                        val isChecked = selectedTabs.contains(tab)
                                        FilterChip(
                                            selected = isChecked,
                                            onClick = {
                                                if (isChecked) selectedTabs.remove(tab) else selectedTabs.add(tab)
                                            },
                                            label = { Text(tab) },
                                            modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedButton(
                            onClick = {
                                scope.launch {
                                    isProvisioning = true
                                    provisioningMessage = "Updating vault on Google Drive..."
                                    DriveVaultManager.provisionStep3Erp(context, driveAccountEmail, DriveVaultManager.currentChildVault, "", "", emptyList(), isSkipped = true)
                                    isProvisioning = false
                                    enableErp = false
                                    currentStep = WizardStep.STEP_4_WHATSAPP
                                }
                            },
                            enabled = !isProvisioning,
                            modifier = Modifier.weight(1f).defaultMinSize(minHeight = 48.dp)
                        ) {
                            Text("Skip App Setup")
                        }
                        Button(
                            onClick = {
                                scope.launch {
                                    isProvisioning = true
                                    provisioningMessage = "Updating Google Drive with School ERP setup..."
                                    val res = DriveVaultManager.provisionStep3Erp(context, driveAccountEmail, DriveVaultManager.currentChildVault, selectedAppName, selectedAppPackage, selectedTabs.toList(), isSkipped = !enableErp)
                                    isProvisioning = false
                                    if (res.isSuccess) {
                                        Toast.makeText(context, "✓ Step 3: School app updated on Google Drive", Toast.LENGTH_SHORT).show()
                                    } else {
                                        val err = res.exceptionOrNull()?.localizedMessage ?: "Failed to update Google Drive"
                                        Toast.makeText(context, "Drive update warning: $err", Toast.LENGTH_LONG).show()
                                    }
                                    currentStep = WizardStep.STEP_4_WHATSAPP
                                }
                            },
                            enabled = !isProvisioning,
                            modifier = Modifier.weight(1f).defaultMinSize(minHeight = 48.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)
                        ) {
                            Text("Save & Next \u2192")
                        }
                    }
                }

                WizardStep.STEP_4_WHATSAPP -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("WhatsApp Group Capture", style = MaterialTheme.typography.titleMedium, color = DeepNavy)
                                Switch(checked = enableWhatsApp, onCheckedChange = { enableWhatsApp = it })
                            }

                            if (enableWhatsApp) {
                                Text(
                                    text = "Zero-Typing Group Capture: Select a detected school group below, or auto-capture via incoming message.",
                                    style = MaterialTheme.typography.bodyMedium
                                )

                                Text("Detected School Groups:", style = MaterialTheme.typography.labelLarge)
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    detectedGroups.forEach { group ->
                                        val isSelected = selectedGroup == group
                                        FilterChip(
                                            selected = isSelected,
                                            onClick = { selectedGroup = group },
                                            label = { Text(group) },
                                            modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp)
                                        )
                                    }
                                }

                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedButton(
                                        onClick = { isListeningForNotification = true },
                                        modifier = Modifier.weight(1f).defaultMinSize(minHeight = 48.dp)
                                    ) {
                                        Text(if (isListeningForNotification) "✓ Listening..." else "Listen for Message")
                                    }
                                }
                            }
                        }
                    }

                    Button(
                        onClick = {
                            scope.launch {
                                isProvisioning = true
                                provisioningMessage = "Finalizing vault and graph.html on Google Drive..."
                                val res = DriveVaultManager.provisionStep4WhatsApp(
                                    context,
                                    driveAccountEmail,
                                    DriveVaultManager.currentChildVault,
                                    childName.trim(),
                                    selectedYear,
                                    selectedGroup,
                                    isSkipped = !enableWhatsApp
                                )
                                isProvisioning = false
                                if (res.isFailure) {
                                    val err = res.exceptionOrNull()?.localizedMessage ?: "Failed to finalize Google Drive"
                                    Toast.makeText(context, "Drive update warning: $err", Toast.LENGTH_LONG).show()
                                }

                                val channelsList = mutableListOf<ChannelConfig>()
                                if (enableClassroom && studentEmail.isNotBlank()) {
                                    channelsList.add(
                                        ChannelConfig(
                                            channelType = ChannelType.GOOGLE_CLASSROOM,
                                            isEnabled = true,
                                            studentAccountEmail = studentEmail
                                        )
                                    )
                                }
                                if (enableErp) {
                                    channelsList.add(
                                        ChannelConfig(
                                            channelType = ChannelType.SCHOOL_ERP,
                                            isEnabled = true,
                                            erpPackageName = selectedAppPackage,
                                            trackedTabs = selectedTabs.toList()
                                        )
                                    )
                                }
                                if (enableWhatsApp) {
                                    channelsList.add(
                                        ChannelConfig(
                                            channelType = ChannelType.WHATSAPP,
                                            isEnabled = true,
                                            whitelistedGroupName = selectedGroup
                                        )
                                    )
                                }

                                val childProfile = ChildProfile(
                                    childId = UUID.randomUUID().toString(),
                                    firstName = childName.trim(),
                                    academicYear = selectedYear,
                                    accountEmail = studentEmail.trim().takeIf { enableClassroom && it.isNotBlank() },
                                    photoUri = photoUri?.toString(),
                                    channels = channelsList
                                )
                                prefs.edit().remove("wizard_current_step").remove("wizard_student_email").apply()
                                onFinishChildSetup(childProfile)
                            }
                        },
                        enabled = !isProvisioning,
                        modifier = Modifier
                            .fillMaxWidth()
                            .defaultMinSize(minHeight = 48.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AmberOrange)
                    ) {
                        Text("Complete Setup for $childName \u2713", color = TextPrimary, style = MaterialTheme.typography.titleMedium)
                    }
                }
            }
        }
    }
}

private fun launchAccountPicker(launcher: androidx.activity.result.ActivityResultLauncher<Intent>) {
    try {
        val intent = AccountManager.newChooseAccountIntent(
            null, null, arrayOf("com.google"), null, null, null, null
        )
        launcher.launch(intent)
    } catch (_: Exception) {
        val fallbackIntent = Intent(Intent.ACTION_MAIN)
        launcher.launch(fallbackIntent)
    }
}

private fun queryInstalledLauncherApps(context: Context): List<Pair<String, String>> {
    return try {
        val pm = context.packageManager
        val intent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        val activities = pm.queryIntentActivities(intent, 0)
        val list = activities.map {
            it.loadLabel(pm).toString() to it.activityInfo.packageName
        }.distinctBy { it.second }.sortedBy { it.first }

        if (list.isNotEmpty()) list else getDefaultSchoolAppList()
    } catch (_: Exception) {
        getDefaultSchoolAppList()
    }
}

private fun getDefaultSchoolAppList(): List<Pair<String, String>> {
    return listOf(
        "CampusCare / Entab" to "com.entab.campuscare",
        "Toddle Family Portal" to "com.toddle.family",
        "Edunext Parent Portal" to "com.edunext.parent",
        "Microsoft Teams" to "com.microsoft.teams"
    )
}
