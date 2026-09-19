package com.kids.collector.presentation.wizard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.kids.collector.presentation.theme.*

enum class WizardStep(val stepNumber: Int, val title: String) {
    STEP_1_VAULT(1, "Cloud Vault & Child Profiles"),
    STEP_2_CLASSROOM(2, "Google Classroom Mapping"),
    STEP_3_PORTALS(3, "School Portals & ERPs"),
    STEP_4_WHATSAPP(4, "WhatsApp School Groups")
}

@Composable
fun OnboardingWizardScreen(
    onCompleteSetup: () -> Unit
) {
    var currentStep by remember { mutableStateOf(WizardStep.STEP_1_VAULT) }
    var childName by remember { mutableStateOf("Anvesha") }
    var academicYear by remember { mutableStateOf("2026-2027") }
    var grade by remember { mutableStateOf("Grade 8") }
    var schoolName by remember { mutableStateOf("SJBHS") }
    var studentEmail by remember { mutableStateOf("anvesharprasad@sjbhs.org") }
    var erpName by remember { mutableStateOf("CampusCare / Entab") }
    var whatsappGroup by remember { mutableStateOf("SJBHS 8B Parents") }

    Scaffold(
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DeepNavy)
                    .padding(horizontal = 20.dp, vertical = 16.dp)
            ) {
                Text(
                    text = "K.I.D.S. Onboarding",
                    style = MaterialTheme.typography.headlineMedium,
                    color = SurfaceWhite,
                    modifier = Modifier.semantics { heading() }
                )
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
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            when (currentStep) {
                WizardStep.STEP_1_VAULT -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("Child Profile Setup [Mandatory]", style = MaterialTheme.typography.titleMedium)
                            OutlinedTextField(
                                value = childName,
                                onValueChange = { childName = it },
                                label = { Text("Child First Name") },
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = grade,
                                onValueChange = { grade = it },
                                label = { Text("Grade / Class") },
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = schoolName,
                                onValueChange = { schoolName = it },
                                label = { Text("School Name") },
                                modifier = Modifier.fillMaxWidth()
                            )
                            Text("Academic Year: $academicYear", style = MaterialTheme.typography.bodyMedium)
                        }
                    }

                    Button(
                        onClick = { currentStep = WizardStep.STEP_2_CLASSROOM },
                        modifier = Modifier
                            .fillMaxWidth()
                            .defaultMinSize(minHeight = 48.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)
                    ) {
                        Text("Connect Vault & Continue", color = SurfaceWhite)
                    }
                }

                WizardStep.STEP_2_CLASSROOM -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("Google Classroom Mapping [Optional]", style = MaterialTheme.typography.titleMedium)
                            Text("Zero School OAuth Guarantee: K.I.D.S. never prompts for school account login or admin consent.", style = MaterialTheme.typography.bodyMedium)
                            OutlinedTextField(
                                value = studentEmail,
                                onValueChange = { studentEmail = it },
                                label = { Text("Student Routing Account Email") },
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedButton(
                            onClick = { currentStep = WizardStep.STEP_3_PORTALS },
                            modifier = Modifier.weight(1f).defaultMinSize(minHeight = 48.dp)
                        ) {
                            Text("Skip")
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
                            Text("School ERP & Portals [Optional]", style = MaterialTheme.typography.titleMedium)
                            OutlinedTextField(
                                value = erpName,
                                onValueChange = { erpName = it },
                                label = { Text("ERP App Package / Name") },
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedButton(
                            onClick = { currentStep = WizardStep.STEP_4_WHATSAPP },
                            modifier = Modifier.weight(1f).defaultMinSize(minHeight = 48.dp)
                        ) {
                            Text("Skip")
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
                            Text("WhatsApp Class Group Whitelist [Optional]", style = MaterialTheme.typography.titleMedium)
                            Text("Only messages from explicitly whitelisted groups are ingested. Personal chats are dropped instantly.", style = MaterialTheme.typography.bodyMedium)
                            OutlinedTextField(
                                value = whatsappGroup,
                                onValueChange = { whatsappGroup = it },
                                label = { Text("Parent Group Name") },
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }

                    Button(
                        onClick = onCompleteSetup,
                        modifier = Modifier
                            .fillMaxWidth()
                            .defaultMinSize(minHeight = 48.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AmberOrange)
                    ) {
                        Text("Complete Setup & Start Ingestion", color = TextPrimary)
                    }
                }
            }
        }
    }
}
