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

@Serializable
data class ChildProfile(
    val childId: String,
    val firstName: String,
    val grade: String,
    val academicYear: String,
    val schoolName: String,
    val accountEmail: String? = null,
    val disambiguationTag: String? = null,
    val photoUri: String? = null
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
    val driveFileId: String? = null
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
    val driveFileId: String? = null,
    val syncStatus: SyncStatus = SyncStatus.PENDING
)
