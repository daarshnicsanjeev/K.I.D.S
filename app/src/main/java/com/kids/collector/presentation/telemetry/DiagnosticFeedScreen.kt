package com.kids.collector.presentation.telemetry

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kids.collector.presentation.theme.*

data class LogEntry(
    val timestamp: String,
    val step: String,
    val level: String,
    val message: String
)

@Composable
fun DiagnosticFeedScreen(
    onRunHealthProbe: () -> Unit
) {
    val sampleLogs = remember {
        listOf(
            LogEntry("08:00:15", "STEP1_VAULT", "INFO", "OAuth token verified. Drive folder ready: K.I.D.S. Data/2026-2027/Anvesha/"),
            LogEntry("08:02:10", "STEP2_CLASSROOM", "INFO", "Classroom notice captured: 'Exam Schedule'. Extracted 1 Drive link."),
            LogEntry("08:05:22", "STEP3_PORTAL", "INFO", "CampusCare notice parsed: 'Term 1 Report Cards' -> Tagged CIRCULAR."),
            LogEntry("08:12:44", "STEP4_WHATSAPP", "INFO", "Matched whitelisted group 'SJBHS 8B Parents'."),
            LogEntry("08:13:01", "OCR_ENGINE", "SUCCESS", "ML Kit OCR completed in 218ms for 'Circular_Oct2026.pdf' (342 words)."),
            LogEntry("08:13:08", "DRIVE_UPLOAD", "SUCCESS", "Uploaded attachment to Google Drive Vault and appended Sheet row.")
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
                Text(
                    text = "Live Telemetry & Diagnostics",
                    style = MaterialTheme.typography.titleLarge,
                    color = SurfaceWhite
                )
                Text(
                    text = "Real-time sync timeline & health probe",
                    style = MaterialTheme.typography.bodyMedium,
                    color = AmberOrange
                )
            }
        },
        bottomBar = {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = SurfaceWhite,
                shadowElevation = 8.dp
            ) {
                Button(
                    onClick = onRunHealthProbe,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                        .defaultMinSize(minHeight = 48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)
                ) {
                    Text("Execute 5-Point Cloud Health Probe", color = SurfaceWhite)
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(sampleLogs) { log ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
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
                                .background(badgeColor, RoundedCornerShape(4.dp))
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "[${log.timestamp}] [${log.step}]",
                                style = MaterialTheme.typography.bodySmall,
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
