package com.kids.collector.domain.model

import kotlinx.serialization.Serializable

enum class SyncStatus {
    PENDING,
    SYNCED,
    FAILED,
    DROPPED
}

enum class ContentCategory {
    CIRCULAR,
    HOMEWORK,
    ATTENDANCE,
    FEES,
    UNKNOWN
}

enum class ChannelType {
    GOOGLE_CLASSROOM,
    SCHOOL_ERP,
    WHATSAPP,
    FILE_IMPORT
}

@Serializable
data class ChannelConfig(
    val channelType: ChannelType,
    val isEnabled: Boolean,
    val studentAccountEmail: String? = null,
    val activeCourseName: String? = null,
    val erpPackageName: String? = null,
    val trackedTabs: List<String> = emptyList(), // e.g. ["Homework", "Circulars", "Attendance", "Fees"]
    val whitelistedGroupName: String? = null,
    val lastCrawlTimestampMs: Long? = null
)

@Serializable
data class ChildProfile(
    val childId: String,
    val firstName: String,
    val grade: String = "",
    val academicYear: String,
    val schoolName: String = "",
    val accountEmail: String? = null,
    val disambiguationTag: String? = null,
    val photoUri: String? = null,
    val channels: List<ChannelConfig> = emptyList(),
    val createdAtMs: Long = System.currentTimeMillis()
)

@Serializable
data class Notice(
    val noticeId: String,
    val childId: String,
    val sourceApp: String,
    val category: ContentCategory,
    val title: String,
    val body: String,
    val sender: String,
    val timestampMs: Long,
    val hashSha256: String,
    val syncStatus: SyncStatus = SyncStatus.PENDING,
    val driveFileId: String? = null,
    val attachmentCount: Int = 0
)

@Serializable
data class Attachment(
    val attachmentId: String,
    val noticeId: String,
    val fileName: String,
    val localUri: String,
    val mimeType: String,
    val sizeBytes: Long,
    val fileHash: String,
    val ocrText: String? = null,
    val pageCount: Int = 1,
    val driveFileId: String? = null,
    val syncStatus: SyncStatus = SyncStatus.PENDING
)

@Serializable
data class ProbeItem(
    val id: String,
    val name: String,
    val isHealthy: Boolean,
    val detail: String,
    val remediationAction: String? = null
)

@Serializable
data class CloudHealthReport(
    val timestampMs: Long = System.currentTimeMillis(),
    val probes: List<ProbeItem>,
    val isAllHealthy: Boolean = probes.all { it.isHealthy }
)
