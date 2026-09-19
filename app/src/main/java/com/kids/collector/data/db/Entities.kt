package com.kids.collector.data.db

import androidx.room.Entity
import androidx.room.Fts4
import androidx.room.Index
import androidx.room.PrimaryKey
import com.kids.collector.domain.model.ChannelConfig

@Entity(tableName = "child_profiles")
data class ChildProfileEntity(
    @PrimaryKey val childId: String,
    val firstName: String,
    val grade: String,
    val academicYear: String,
    val schoolName: String,
    val accountEmail: String?,
    val disambiguationTag: String?,
    val photoUri: String?,
    val channels: List<ChannelConfig> = emptyList(),
    val createdAtMs: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "notices",
    indices = [
        Index(value = ["hashSha256"], unique = true),
        Index(value = ["childId"]),
        Index(value = ["category"]),
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
    val driveFileId: String? = null,
    val attachmentCount: Int = 0
)

@Entity(
    tableName = "attachments",
    indices = [
        Index(value = ["noticeId"]),
        Index(value = ["fileHash"]),
        Index(value = ["syncStatus"])
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
    val ocrText: String? = null,
    val pageCount: Int = 1,
    val driveFileId: String? = null,
    val syncStatus: String
)

@Entity(tableName = "notices_fts")
@Fts4(contentEntity = NoticeEntity::class)
data class NoticeFtsEntity(
    val title: String,
    val body: String,
    val sender: String
)
