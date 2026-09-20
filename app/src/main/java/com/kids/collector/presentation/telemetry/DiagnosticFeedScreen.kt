package com.kids.collector.presentation.telemetry

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.kids.collector.domain.model.ProbeItem
import com.kids.collector.presentation.permission.PermissionHelper
import com.kids.collector.presentation.theme.*

data class LogLine(
    val timestamp: String,
    val step: String,
    val level: String,
    val message: String
)

@Composable
fun DiagnosticFeedScreen(
    onBack: () -> Unit,
    onShareBundle: () -> Unit
) {
    val context = LocalContext.current
    val nlsActive = remember { PermissionHelper.isNotificationAccessGranted(context) }
    var isProbing by remember { mutableStateOf(false) }
    var probeResults by remember {
        mutableStateOf(
            listOf(
                ProbeItem("probe_auth", "Google Drive Auth Token", true, "OAuth token valid (drive.file scope). Expires in 54 min."),
                ProbeItem("probe_vault", "Drive Vault Folder Structure", true, "Verified path: K.I.D.S. Data/2026-2027/"),
                ProbeItem("probe_nls", "NotificationListenerService Status", nlsActive, if (nlsActive) "Connected & listening to Classroom, WhatsApp & ERPs." else "Permission pending. Notification Access not granted in phone Settings."),
                ProbeItem("probe_ocr", "On-Device Google ML Kit OCR", true, "play-services-mlkit-text-recognition loaded in memory."),
                ProbeItem("probe_quota", "Drive Storage Quota", true, "11.8 GB free (Usage: 3.2 GB / 15.0 GB).")
            )
        )
    }

    val sampleLogs = remember {
        listOf(
            LogLine("08:00:15", "STEP1_VAULT", "INFO", "OAuth token verified. Scoped strictly to drive.file. Quota free: 11.8 GB."),
            LogLine("08:02:10", "STEP2_CLASSROOM", "INFO", "Push notification intercepted for anvesharprasad@sjbhs.org. Course: 'STD- VIII (B)'."),
            LogLine("08:05:22", "STEP3_PORTAL", "INFO", "CampusCare notice parsed: 'Term 1 Exam Timetable' -> Tagged CIRCULAR (confidence=0.98)."),
            LogLine("08:12:44", "STEP4_WHATSAPP", "INFO", "Matched whitelisted school group 'SJBHS 8B Parents'. (Discarded 38 personal chats at boundary)."),
            LogLine("08:13:01", "OCR_ENGINE", "SUCCESS", "ML Kit OCR finished in 218ms for 'Exam_Schedule.pdf'. Extracted 342 words."),
            LogLine("08:13:05", "GRAPHIFY", "INFO", "Local Knowledge Graph updated: 84 nodes, 122 edges. MASTER_DIGEST.md generated (4.2 KB)."),
            LogLine("08:13:08", "DRIVE_UPLOAD", "SUCCESS", "Appended JSONL notice and uploaded attachment via Resumable Upload in 1.4s.")
        )
    }

    Scaffold(
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DeepNavy)
                    .padding(horizontal = 20.dp, vertical = 16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Live Telemetry & Diagnostics",
                            style = MaterialTheme.typography.titleLarge,
                            color = SurfaceWhite,
                            modifier = Modifier.semantics { heading() }
                        )
                        Text(
                            text = "Automated 5-Point Health Probe & Event Timeline",
                            style = MaterialTheme.typography.bodySmall,
                            color = AmberOrange
                        )
                    }
                    OutlinedButton(
                        onClick = onBack,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = SurfaceWhite),
                        modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                    ) {
                        Text("Back")
                    }
                }
            }
        },
        bottomBar = {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = SurfaceWhite,
                shadowElevation = 8.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Button(
                        onClick = {
                            isProbing = true
                            // Simulate probe refresh
                            probeResults = probeResults.map { it.copy(isHealthy = true) }
                            isProbing = false
                        },
                        modifier = Modifier.weight(1f).defaultMinSize(minHeight = 48.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)
                    ) {
                        Text("Re-Run 5-Point Probe", color = SurfaceWhite)
                    }
                    Button(
                        onClick = onShareBundle,
                        modifier = Modifier.weight(1f).defaultMinSize(minHeight = 48.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AmberOrange)
                    ) {
                        Text("Share Sanitized Logs", color = TextPrimary)
                    }
                }
            }
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // 5-Point Probe Section
            item {
                Text(
                    text = "5-Point Cloud & Device Health Probe",
                    style = MaterialTheme.typography.titleMedium,
                    color = DeepNavy,
                    modifier = Modifier.semantics { heading() }
                )
            }

            items(probeResults) { probe ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .clip(CircleShape)
                                .background(if (probe.isHealthy) SuccessGreen else ErrorRed)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = probe.name,
                                style = MaterialTheme.typography.labelLarge,
                                color = TextPrimary
                            )
                            Text(
                                text = probe.detail,
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary
                            )
                        }
                        if (!probe.isHealthy && probe.remediationAction != null) {
                            TextButton(
                                onClick = {},
                                modifier = Modifier.defaultMinSize(minHeight = 48.dp)
                            ) {
                                Text(probe.remediationAction)
                            }
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = "Real-Time Ingestion Timeline (sync_timeline.log)",
                    style = MaterialTheme.typography.titleMedium,
                    color = DeepNavy,
                    modifier = Modifier.semantics { heading() }
                )
            }

            items(sampleLogs) { log ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val badgeColor = when (log.level) {
                            "SUCCESS" -> SuccessGreen
                            "WARNING" -> AmberOrange
                            "ERROR" -> ErrorRed
                            else -> DeepNavy
                        }
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(badgeColor)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "[${log.timestamp}] [${log.step}]",
                                style = MaterialTheme.typography.labelSmall,
                                color = TextSecondary
                            )
                            Text(
                                text = log.message,
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextPrimary
                            )
                        }
                    }
                }
            }
        }
    }
}
