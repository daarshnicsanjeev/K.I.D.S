package com.kids.collector.telemetry

import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

@Serializable
data class DeviceInfo(
    val model: String,
    val androidVersion: Int,
    val appVersion: String,
    val batteryOptimizationIgnored: Boolean,
    val notificationListenerConnected: Boolean
)

@Serializable
data class StepStatus(
    val step1VaultAuth: String = "HEALTHY",
    val step2Classroom: String = "ACTIVE",
    val step3Portals: String = "ACTIVE",
    val step4Messaging: String = "ACTIVE"
)

@Serializable
data class PipelineMetrics(
    val totalNoticesCaptured: Long = 0,
    val totalAttachmentsUploaded: Long = 0,
    val totalOcrWordsIndexed: Long = 0,
    val totalNonSchoolMessagesDiscarded: Long = 0,
    val knowledgeGraphNodes: Int = 0,
    val knowledgeGraphEdges: Int = 0
)

@Serializable
data class DiagnosticSnapshot(
    val childName: String,
    val academicYear: String,
    val lastSyncTimestamp: String,
    val deviceInfo: DeviceInfo,
    val stepStatus: StepStatus,
    val metrics: PipelineMetrics,
    val recentErrors: List<String> = emptyList()
)

/**
 * Drive Deep-Logging Telemetry Engine
 *
 * Writes structured chronological timeline logs and health snapshots directly to:
 * G:\My Drive\K.I.D.S. Data\{AcademicYear}\{ChildName}\_system\logs\
 */
class DriveDeepLogger(
    private val localLogDir: File
) {

    private val json = Json { prettyPrint = true }
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    init {
        if (!localLogDir.exists()) {
            localLogDir.mkdirs()
        }
    }

    @Synchronized
    fun log(stepTag: String, level: String, message: String) {
        val timestamp = dateFormat.format(Date())
        val sanitized = sanitize(message)
        val line = "[$timestamp] [$level] [$stepTag] $sanitized\n"

        val timelineFile = File(localLogDir, "sync_timeline.log")
        timelineFile.appendText(line)
    }

    fun writeSnapshot(snapshot: DiagnosticSnapshot) {
        val snapshotFile = File(localLogDir, "diagnostic_snapshot.json")
        snapshotFile.writeText(json.encodeToString(snapshot))
    }

    /**
     * Privacy Guardrail: Strips auth tokens, credentials, and passwords
     */
    private fun sanitize(input: String): String {
        return input.replace(Regex("Bearer\\s+[A-Za-z0-9_.-]+"), "Bearer tok_***")
            .replace(Regex("password=[^&\\s]+"), "password=***")
    }
}
