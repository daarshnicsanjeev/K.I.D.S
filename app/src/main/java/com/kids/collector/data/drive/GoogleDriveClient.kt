package com.kids.collector.data.drive

import com.google.api.client.http.FileContent
import com.google.api.services.drive.Drive
import com.google.api.services.drive.model.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Google Drive REST API Client (Privacy-First Scoped Pipeline)
 *
 * Strictly scoped to `https://www.googleapis.com/auth/drive.file`.
 * Automatically structures folders:
 * G:\My Drive\K.I.D.S. Data\{AcademicYear}\{ChildName}\
 */
class GoogleDriveClient(
    private val driveService: Drive
) {

    suspend fun getOrCreateFolder(folderName: String, parentFolderId: String? = null): String = withContext(Dispatchers.IO) {
        var query = "name = '$folderName' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        if (parentFolderId != null) {
            query += " and '$parentFolderId' in parents"
        }

        val existing = driveService.files().list()
            .setQ(query)
            .setFields("files(id, name)")
            .execute()

        if (!existing.files.isNullOrEmpty()) {
            return@withContext existing.files[0].id
        }

        val folderMetadata = File().apply {
            name = folderName
            mimeType = "application/vnd.google-apps.folder"
            if (parentFolderId != null) {
                parents = listOf(parentFolderId)
            }
        }

        val created = driveService.files().create(folderMetadata)
            .setFields("id")
            .execute()

        created.id
    }

    suspend fun uploadFile(
        file: java.io.File,
        mimeType: String,
        parentFolderId: String
    ): String = withContext(Dispatchers.IO) {
        val fileMetadata = File().apply {
            name = file.name
            parents = listOf(parentFolderId)
        }
        val mediaContent = FileContent(mimeType, file)
        val uploaded = driveService.files().create(fileMetadata, mediaContent)
            .setFields("id")
            .execute()
        uploaded.id
    }
}
