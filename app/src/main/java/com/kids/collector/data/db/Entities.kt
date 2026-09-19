package com.kids.collector.data.db

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.kids.collector.domain.model.ContentCategory
import com.kids.collector.domain.model.SyncStatus

@Entity(tableName = "child_profiles")
data class ChildProfileEntity(
    @PrimaryKey val childId: String,
    val firstName: String,
    val grade: String,
    val academicYear: String,
    val schoolName: String,
    val accountEmail: String?,
    val disambiguationTag: String?,
    val photoUri: String?
)

@Entity(
    tableName = "notices",
    indices = [
        Index(value = ["hashSha256"], unique = true),
        Index(value = ["childId"]),
        Index(value = ["timestampMs"])
    ]
)
data class NoticeEntity(
    @PrimaryKey val noticeId: String,
    val childId: String,
    val sourceApp: String,
    val category: String,
    val title: String,
    val body: String,
    val sender: String,
    val timestampMs: Long,
    val hashSha256: String,
    val syncStatus: String,
    val driveFileId: String?
)

@Entity(
    tableName = "attachments",
    indices = [
        Index(value = ["noticeId"]),
        Index(value = ["fileHash"])
    ]
)
data class AttachmentEntity(
    @PrimaryKey val attachmentId: String,
    val noticeId: String,
    val fileName: String,
    val localUri: String,
    val mimeType: String,
    val sizeBytes: Long,
    val fileHash: String,
    val ocrText: String?,
    val driveFileId: String?,
    val syncStatus: String
)
