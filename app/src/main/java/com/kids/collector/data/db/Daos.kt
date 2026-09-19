package com.kids.collector.data.db

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ChildProfileDao {
    @Query("SELECT * FROM child_profiles")
    fun getAllChildren(): Flow<List<ChildProfileEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(child: ChildProfileEntity)

    @Delete
    suspend fun delete(child: ChildProfileEntity)
}

@Dao
interface NoticeDao {
    @Query("SELECT * FROM notices WHERE childId = :childId ORDER BY timestampMs DESC")
    fun getNoticesForChild(childId: String): Flow<List<NoticeEntity>>

    @Query("SELECT * FROM notices WHERE hashSha256 = :hash LIMIT 1")
    suspend fun findByHash(hash: String): NoticeEntity?

    @Query("SELECT * FROM notices WHERE syncStatus = 'PENDING'")
    suspend fun getPendingNotices(): List<NoticeEntity>

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(notice: NoticeEntity): Long

    @Update
    suspend fun update(notice: NoticeEntity)
}

@Dao
interface AttachmentDao {
    @Query("SELECT * FROM attachments WHERE noticeId = :noticeId")
    suspend fun getAttachmentsForNotice(noticeId: String): List<AttachmentEntity>

    @Query("SELECT * FROM attachments WHERE fileHash = :fileHash LIMIT 1")
    suspend fun findByFileHash(fileHash: String): AttachmentEntity?

    @Query("SELECT * FROM attachments WHERE syncStatus = 'PENDING'")
    suspend fun getPendingAttachments(): List<AttachmentEntity>

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(attachment: AttachmentEntity): Long

    @Update
    suspend fun update(attachment: AttachmentEntity)
}
