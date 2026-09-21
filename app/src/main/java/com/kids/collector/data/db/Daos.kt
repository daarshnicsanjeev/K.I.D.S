package com.kids.collector.data.db

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ChildProfileDao {
    @Query("SELECT * FROM child_profiles ORDER BY createdAtMs ASC")
    fun getAllChildren(): Flow<List<ChildProfileEntity>>

    @Query("SELECT * FROM child_profiles WHERE childId = :childId LIMIT 1")
    suspend fun getChildById(childId: String): ChildProfileEntity?

    @Query("SELECT COUNT(*) FROM child_profiles")
    suspend fun getChildCount(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(child: ChildProfileEntity)

    @Update
    suspend fun update(child: ChildProfileEntity)

    @Delete
    suspend fun delete(child: ChildProfileEntity)
}

@Dao
interface NoticeDao {
    @Query("SELECT * FROM notices WHERE childId = :childId ORDER BY timestampMs DESC")
    fun getNoticesForChild(childId: String): Flow<List<NoticeEntity>>

    @Query("SELECT * FROM notices WHERE childId = :childId ORDER BY timestampMs DESC")
    suspend fun getNoticesForChildDirect(childId: String): List<NoticeEntity>

    @Query("SELECT * FROM notices ORDER BY timestampMs DESC")
    suspend fun getAllNoticesDirect(): List<NoticeEntity>

    @Query("SELECT * FROM notices ORDER BY timestampMs DESC LIMIT 50")
    fun getRecentNotices(): Flow<List<NoticeEntity>>

    @Query("SELECT * FROM notices WHERE hashSha256 = :hash LIMIT 1")
    suspend fun findByHash(hash: String): NoticeEntity?

    @Query("SELECT * FROM notices WHERE syncStatus = 'PENDING'")
    suspend fun getPendingNotices(): List<NoticeEntity>

    @Query("SELECT COUNT(*) FROM notices WHERE childId = :childId")
    suspend fun countNoticesForChild(childId: String): Int

    @Query("SELECT COUNT(*) FROM notices")
    suspend fun getTotalNoticeCount(): Int

    // Full-Text Search via FTS4
    @Query("""
        SELECT notices.* FROM notices
        JOIN notices_fts ON notices.rowid = notices_fts.rowid
        WHERE notices_fts MATCH :searchQuery
        ORDER BY notices.timestampMs DESC
    """)
    fun searchNotices(searchQuery: String): Flow<List<NoticeEntity>>

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(notice: NoticeEntity): Long

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAll(notices: List<NoticeEntity>): List<Long>

    @Update
    suspend fun update(notice: NoticeEntity)

    @Query("UPDATE notices SET syncStatus = :newStatus, driveFileId = :driveFileId WHERE noticeId = :noticeId")
    suspend fun updateSyncStatus(noticeId: String, newStatus: String, driveFileId: String?)
}

@Dao
interface AttachmentDao {
    @Query("SELECT * FROM attachments WHERE noticeId = :noticeId")
    suspend fun getAttachmentsForNotice(noticeId: String): List<AttachmentEntity>

    @Query("SELECT * FROM attachments")
    suspend fun getAllAttachmentsDirect(): List<AttachmentEntity>

    @Query("SELECT * FROM attachments WHERE fileHash = :fileHash LIMIT 1")
    suspend fun findByFileHash(fileHash: String): AttachmentEntity?

    @Query("SELECT * FROM attachments WHERE syncStatus = 'PENDING'")
    suspend fun getPendingAttachments(): List<AttachmentEntity>

    @Query("SELECT COUNT(*) FROM attachments")
    suspend fun getTotalAttachmentCount(): Int

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(attachment: AttachmentEntity): Long

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAll(attachments: List<AttachmentEntity>): List<Long>

    @Update
    suspend fun update(attachment: AttachmentEntity)

    @Query("UPDATE attachments SET ocrText = :ocrText, pageCount = :pageCount WHERE attachmentId = :attachmentId")
    suspend fun updateOcrText(attachmentId: String, ocrText: String, pageCount: Int)

    @Query("UPDATE attachments SET syncStatus = :newStatus, driveFileId = :driveFileId WHERE attachmentId = :attachmentId")
    suspend fun updateSyncStatus(attachmentId: String, newStatus: String, driveFileId: String?)

    @Query("SELECT * FROM attachments WHERE fileName LIKE '%' || :name || '%' LIMIT 1")
    suspend fun findByFileNameLike(name: String): AttachmentEntity?

    @Query("UPDATE attachments SET localUri = :localUri, sizeBytes = :sizeBytes, fileHash = :fileHash, syncStatus = 'PENDING' WHERE attachmentId = :attachmentId")
    suspend fun updateLocalFile(attachmentId: String, localUri: String, sizeBytes: Long, fileHash: String)
}
