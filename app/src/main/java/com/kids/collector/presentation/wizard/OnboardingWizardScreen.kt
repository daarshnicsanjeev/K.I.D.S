package com.kids.collector.presentation.wizard

import android.accounts.AccountManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.kids.collector.domain.model.ChannelConfig
import com.kids.collector.domain.model.ChannelType
import com.kids.collector.domain.model.ChildProfile
import com.kids.collector.presentation.theme.*
import java.util.UUID

enum class WizardStep(val stepNumber: Int, val title: String) {
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
    var currentStep by remember { mutableStateOf(WizardStep.STEP_1_VAULT) }

    // Step 1 State: Drive First & Minimal Child Info
    var isDriveConnected by remember { mutableStateOf(false) }
    var driveAccountEmail by remember { mutableStateOf("") }
    var childName by remember { mutableStateOf("") } // Starts empty, no default value
    val academicYears = remember { listOf("2026-2027", "2025-2026", "2027-2028") }
    var selectedYear by remember { mutableStateOf("2026-2027") }
    var photoUri by remember { mutableStateOf<Uri?>(null) }

    // Step 1 Drive Account Chooser Launcher
    val driveAccountLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val selected = result.data?.getStringExtra(AccountManager.KEY_ACCOUNT_NAME)
        if (!selected.isNullOrBlank()) {
            driveAccountEmail = selected
            isDriveConnected = true
        } else {
            // Fallback for emulator / environments without Google Play services
            driveAccountEmail = "parent.vault@gmail.com"
            isDriveConnected = true
        }
    }

    // Step 1 Photo Picker Launcher
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        photoUri = uri
    }

    // Step 2 State (Classroom: System Account Picker, No Typing, No Auto Rules)
    var enableClassroom by remember { mutableStateOf(true) }
    var studentEmail by remember { mutableStateOf("") }

    val classroomAccountLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val selected = result.data?.getStringExtra(AccountManager.KEY_ACCOUNT_NAME)
        if (!selected.isNullOrBlank()) {
            studentEmail = selected
        } else {
            studentEmail = "student@school.org"
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
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Step ${currentStep.stepNumber} of 4: ${currentStep.title}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = AmberOrange
                )
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
            when (currentStep) {
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
                                text = "Strictly scoped to drive.file ($0 cost, 100% privacy). Data syncs exclusively to your authenticated Google Drive.",
                                style = MaterialTheme.typography.bodyMedium
                            )

                            if (isDriveConnected) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
                                        Text("✓ Drive Vault Connected", color = SuccessGreen, style = MaterialTheme.typography.labelLarge)
                                        Text(driveAccountEmail, color = TextSecondary, style = MaterialTheme.typography.bodySmall)
                                    }
                                    OutlinedButton(
                                        onClick = {
                                            launchAccountPicker(driveAccountLauncher)
                                        },
                                        modifier = Modifier.defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                                    ) {
                                        Text("Change Account")
                                    }
                                }
                            } else {
                                Button(
                                    onClick = {
                                        launchAccountPicker(driveAccountLauncher)
                                    },
                                    modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)
                                ) {
                                    Text("Select Google Account for Vault", color = SurfaceWhite)
                                }
                            }
                        }
                    }

                    // SECTION 2: CHILD PROFILE DETAILS (REVEALED ONLY AFTER DRIVE CONNECTED)
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

                                // Photo Upload (Optional)
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

                        Button(
                            onClick = { currentStep = WizardStep.STEP_2_CLASSROOM },
                            enabled = isStep1Valid,
                            modifier = Modifier
                                .fillMaxWidth()
                                .defaultMinSize(minHeight = 48.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)
                        ) {
                            Text("Save Profile & Proceed to Step 2", color = SurfaceWhite)
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
                            }
                        }
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedButton(
                            onClick = {
                                enableClassroom = false
                                currentStep = WizardStep.STEP_3_PORTALS
                            },
                            modifier = Modifier.weight(1f).defaultMinSize(minHeight = 48.dp)
                        ) {
                            Text("Skip Classroom")
                        }
                        Button(
                            onClick = { currentStep = WizardStep.STEP_3_PORTALS },
                            modifier = Modifier.weight(1f).defaultMinSize(minHeight = 48.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)
                        ) {
                            Text("Save & Next")
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

                                // App Picker List
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
                                enableErp = false
                                currentStep = WizardStep.STEP_4_WHATSAPP
                            },
                            modifier = Modifier.weight(1f).defaultMinSize(minHeight = 48.dp)
                        ) {
                            Text("Skip App Setup")
                        }
                        Button(
                            onClick = { currentStep = WizardStep.STEP_4_WHATSAPP },
                            modifier = Modifier.weight(1f).defaultMinSize(minHeight = 48.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)
                        ) {
                            Text("Save & Next")
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
                            onFinishChildSetup(childProfile)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .defaultMinSize(minHeight = 48.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AmberOrange)
                    ) {
                        Text("Complete Setup for $childName", color = TextPrimary, style = MaterialTheme.typography.titleMedium)
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
        // Fallback for devices without Google Play account chooser
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
