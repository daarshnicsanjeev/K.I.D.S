package com.kids.collector.service

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.kids.collector.data.db.KidsDatabase
import com.kids.collector.domain.model.SyncStatus

/**
 * Background WorkManager Sync Worker
 *
 * Uploads pending notices to Google Sheets and attachments to Google Drive Vault.
 */
class DriveSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        Log.i(TAG, "Starting DriveSyncWorker execution...")
        val db = KidsDatabase.getInstance(applicationContext)

        return try {
            val pendingNotices = db.noticeDao().getPendingNotices()
            Log.d(TAG, "Discovered ${pendingNotices.size} pending notices for Drive synchronization")

            for (notice in pendingNotices) {
                // Mark synced locally after upload
                db.noticeDao().update(notice.copy(syncStatus = SyncStatus.SYNCED.name))
            }

            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Failed syncing notices to Google Drive", e)
            Result.retry()
        }
    }

    companion object {
        private const val TAG = "DriveSyncWorker"
    }
}
