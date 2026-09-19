package com.kids.collector.presentation.wizard

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
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.Role
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
    STEP_3_PORTALS(3, "School Portals & ERPs"),
    STEP_4_WHATSAPP(4, "WhatsApp School Groups")
}

@Composable
fun OnboardingWizardScreen(
    childSequenceNumber: Int = 1,
    onFinishChildSetup: (ChildProfile) -> Unit,
    onCancel: (() -> Unit)? = null
) {
    var currentStep by remember { mutableStateOf(WizardStep.STEP_1_VAULT) }

    // Step 1 State
    var isDriveConnected by remember { mutableStateOf(true) }
    var childName by remember { mutableStateOf(if (childSequenceNumber == 1) "Anvesha" else "Atharva") }
    val academicYears = remember { listOf("2025-2026", "2026-2027", "2027-2028") }
    var selectedYear by remember { mutableStateOf("2026-2027") }
    var grade by remember { mutableStateOf(if (childSequenceNumber == 1) "Grade 8" else "Grade 3") }
    var schoolName by remember { mutableStateOf(if (childSequenceNumber == 1) "St. Joseph's Boys High School" else "MyGlobal School") }
    var disambiguationTag by remember { mutableStateOf(if (childSequenceNumber == 1) "8B" else "3B") }

    // Step 2 State (Classroom)
    var enableClassroom by remember { mutableStateOf(true) }
    var studentEmail by remember { mutableStateOf(if (childSequenceNumber == 1) "anvesharprasad@sjbhs.org" else "atharva.chaodhari@myglobal.school") }
    var activeCourse by remember { mutableStateOf(if (childSequenceNumber == 1) "STD- VIII (B)" else "Grade 3B CAIE") }

    // Step 3 State (ERP)
    var enableErp by remember { mutableStateOf(true) }
    var erpName by remember { mutableStateOf(if (childSequenceNumber == 1) "CampusCare / Entab" else "Toddle Family") }
    val availableTabs = remember { listOf("Homework", "Circulars", "Attendance", "Fee Receipts") }
    val selectedTabs = remember { mutableStateListOf("Homework", "Circulars") }

    // Step 4 State (WhatsApp)
    var enableWhatsApp by remember { mutableStateOf(true) }
    var whatsappGroup by remember { mutableStateOf(if (childSequenceNumber == 1) "SJBHS 8B Parents" else "Grade 3B CAIE Parents") }
    var catchUpMethod by remember { mutableStateOf("ACCESSIBILITY") } // or "FILE_IMPORT"

    val isStep1Valid = childName.isNotBlank() && grade.isNotBlank() && schoolName.isNotBlank() && isDriveConnected

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
                    // Drive Vault Card
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text(
                                text = "1. Parent Google Drive Vault [Mandatory]",
                                style = MaterialTheme.typography.titleMedium,
                                color = DeepNavy
                            )
                            Text(
                                text = "Strictly scoped to drive.file ($0 cost, 100% privacy). Notices are stored directly in your Google Drive as AI-native JSONL & Markdown.",
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = if (isDriveConnected) "✓ Drive Vault Connected" else "Drive Not Connected",
                                    color = if (isDriveConnected) SuccessGreen else TextSecondary,
                                    style = MaterialTheme.typography.labelLarge
                                )
                                OutlinedButton(
                                    onClick = { isDriveConnected = true },
                                    modifier = Modifier.defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                                ) {
                                    Text(if (isDriveConnected) "Change Account" else "Connect Google Drive")
                                }
                            }
                        }
                    }

                    // Child Profile Form
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text(
                                text = "Child Profile Details",
                                style = MaterialTheme.typography.titleMedium,
                                color = DeepNavy
                            )

                            OutlinedTextField(
                                value = childName,
                                onValueChange = { childName = it },
                                label = { Text("Child First Name *") },
                                modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp)
                            )

                            OutlinedTextField(
                                value = grade,
                                onValueChange = { grade = it },
                                label = { Text("Grade / Section *") },
                                modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp)
                            )

                            OutlinedTextField(
                                value = schoolName,
                                onValueChange = { schoolName = it },
                                label = { Text("School Name *") },
                                modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp)
                            )

                            OutlinedTextField(
                                value = disambiguationTag,
                                onValueChange = { disambiguationTag = it },
                                label = { Text("Disambiguation Tag (e.g. 8B vs 3B)") },
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
                        Text("Save Profile & Proceed to Channels", color = SurfaceWhite)
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
                                Text("Google Classroom Ingestion", style = MaterialTheme.typography.titleMedium, color = DeepNavy)
                                Switch(checked = enableClassroom, onCheckedChange = { enableClassroom = it })
                            }
                            Text(
                                text = "Zero School OAuth Guarantee: K.I.D.S. never requires school admin authorization. Ingestion runs ambiently from device push notifications and historical auto-crawl.",
                                style = MaterialTheme.typography.bodyMedium
                            )

                            if (enableClassroom) {
                                OutlinedTextField(
                                    value = studentEmail,
                                    onValueChange = { studentEmail = it },
                                    label = { Text("Student Account Email (Routing Tag)") },
                                    modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp)
                                )
                                OutlinedTextField(
                                    value = activeCourse,
                                    onValueChange = { activeCourse = it },
                                    label = { Text("Active Classroom Course (e.g. STD- VIII (B))") },
                                    modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp)
                                )
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
                                Text("School Portals & ERPs", style = MaterialTheme.typography.titleMedium, color = DeepNavy)
                                Switch(checked = enableErp, onCheckedChange = { enableErp = it })
                            }
                            Text(
                                text = "Tracks notices, circulars, homework assignments, and fee receipts across school ERP portals (CampusCare, Toddle, Edunext).",
                                style = MaterialTheme.typography.bodyMedium
                            )

                            if (enableErp) {
                                OutlinedTextField(
                                    value = erpName,
                                    onValueChange = { erpName = it },
                                    label = { Text("School ERP App Name / Package") },
                                    modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp)
                                )
                                Text("Tracked Tabs & Sections:", style = MaterialTheme.typography.labelLarge)
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
                            Text("Skip ERP")
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
                                Text("WhatsApp Parent Groups", style = MaterialTheme.typography.titleMedium, color = DeepNavy)
                                Switch(checked = enableWhatsApp, onCheckedChange = { enableWhatsApp = it })
                            }

                            if (enableWhatsApp) {
                                Text(
                                    text = "Strict Privacy Filter: Only the whitelisted group name is ingested. Personal chats, family groups, OTPs, and banking alerts are dropped instantly at the memory boundary.",
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                OutlinedTextField(
                                    value = whatsappGroup,
                                    onValueChange = { whatsappGroup = it },
                                    label = { Text("Whitelisted Parent Group Title *") },
                                    modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 48.dp)
                                )

                                Text("Day 0 Catch-Up Option:", style = MaterialTheme.typography.labelLarge)
                                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    FilterChip(
                                        selected = catchUpMethod == "ACCESSIBILITY",
                                        onClick = { catchUpMethod = "ACCESSIBILITY" },
                                        label = { Text("1-Tap Auto-Catch Up (Accessibility)") },
                                        modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                                    )
                                    FilterChip(
                                        selected = catchUpMethod == "FILE_IMPORT",
                                        onClick = { catchUpMethod = "FILE_IMPORT" },
                                        label = { Text("Import Chat Export (.txt / .zip)") },
                                        modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                                    )
                                }
                            }
                        }
                    }

                    Button(
                        onClick = {
                            val channelsList = mutableListOf<ChannelConfig>()
                            if (enableClassroom) {
                                channelsList.add(
                                    ChannelConfig(
                                        channelType = ChannelType.GOOGLE_CLASSROOM,
                                        isEnabled = true,
                                        studentAccountEmail = studentEmail,
                                        activeCourseName = activeCourse
                                    )
                                )
                            }
                            if (enableErp) {
                                channelsList.add(
                                    ChannelConfig(
                                        channelType = ChannelType.SCHOOL_ERP,
                                        isEnabled = true,
                                        erpPackageName = erpName,
                                        trackedTabs = selectedTabs.toList()
                                    )
                                )
                            }
                            if (enableWhatsApp) {
                                channelsList.add(
                                    ChannelConfig(
                                        channelType = ChannelType.WHATSAPP,
                                        isEnabled = true,
                                        whitelistedGroupName = whatsappGroup
                                    )
                                )
                            }

                            val childProfile = ChildProfile(
                                childId = UUID.randomUUID().toString(),
                                firstName = childName.trim(),
                                grade = grade.trim(),
                                academicYear = selectedYear,
                                schoolName = schoolName.trim(),
                                accountEmail = studentEmail.trim().takeIf { enableClassroom },
                                disambiguationTag = disambiguationTag.trim(),
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
