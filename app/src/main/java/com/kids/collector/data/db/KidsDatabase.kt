package com.kids.collector.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(
    entities = [
        ChildProfileEntity::class,
        NoticeEntity::class,
        AttachmentEntity::class,
        NoticeFtsEntity::class
    ],
    version = 2,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class KidsDatabase : RoomDatabase() {
    abstract fun childProfileDao(): ChildProfileDao
    abstract fun noticeDao(): NoticeDao
    abstract fun attachmentDao(): AttachmentDao

    companion object {
        @Volatile
        private var INSTANCE: KidsDatabase? = null

        fun getInstance(context: Context): KidsDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    KidsDatabase::class.java,
                    "kids_vault.db"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
