package com.kids.collector.data.drive

import com.google.api.client.http.ByteArrayContent
import com.google.api.client.http.FileContent
import com.google.api.services.drive.Drive
import com.google.api.services.drive.model.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.nio.charset.StandardCharsets

data class ChildVaultFolders(
    val rootKidsFolderId: String,
    val yearFolderId: String,
    val childFolderId: String,
    val attachmentsFolderId: String,
    val systemFolderId: String,
    val logsFolderId: String
)

data class ChannelVaultFolders(
    val channelFolderId: String,
    val attachmentsFolderId: String
)

data class DriveQuotaInfo(
    val limitBytes: Long,
    val usageBytes: Long,
    val freeBytes: Long
)

/**
 * Google Drive REST API Client (Privacy-First Scoped Pipeline)
 *
 * Strictly scoped to `https://www.googleapis.com/auth/drive.file`.
 * Zero third-party cloud servers.
 *
 * Structures vault hierarchy:
 * G:\My Drive\K.I.D.S. Data\{AcademicYear}\{ChildName}\
 *   ├── _system\logs\ (sync_timeline.log, diagnostic_snapshot.json)
 *   ├── _system\knowledge_graph.json
 *   ├── notices.jsonl (AI-friendly streaming index)
 *   ├── MASTER_DIGEST.md
 *   ├── graph.html
 *   └── attachments\
 */
class GoogleDriveClient(
    private val driveService: Drive
) {

    /**
     * Provisions the complete nested folder structure for a given child.
     */
    suspend fun provisionChildVault(academicYear: String, childName: String): ChildVaultFolders = withContext(Dispatchers.IO) {
        val rootKidsFolderId = getOrCreateFolder("K.I.D.S. Data", null)
        val yearFolderId = getOrCreateFolder(academicYear, rootKidsFolderId)
        val childFolderId = getOrCreateFolder(childName, yearFolderId)
        val attachmentsFolderId = getOrCreateFolder("attachments", childFolderId)
        val systemFolderId = getOrCreateFolder("_system", childFolderId)
        val logsFolderId = getOrCreateFolder("logs", systemFolderId)

        ChildVaultFolders(
            rootKidsFolderId = rootKidsFolderId,
            yearFolderId = yearFolderId,
            childFolderId = childFolderId,
            attachmentsFolderId = attachmentsFolderId,
            systemFolderId = systemFolderId,
            logsFolderId = logsFolderId
        )
    }

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

    /**
     * Appends a JSON line to notices.jsonl in the child vault folder.
     * AI-native format ideal for streaming ingestion into LLM context windows and MCP tools.
     */
    suspend fun appendNoticeToJsonl(childFolderId: String, jsonLine: String): String = withContext(Dispatchers.IO) {
        val fileName = "notices.jsonl"
        val existingFileId = findFileIdByName(fileName, childFolderId)

        val newLineBytes = (jsonLine.trim() + "\n").toByteArray(StandardCharsets.UTF_8)

        if (existingFileId == null) {
            // Create new notices.jsonl
            val fileMetadata = File().apply {
                name = fileName
                parents = listOf(childFolderId)
                mimeType = "application/x-ndjson"
            }
            val content = ByteArrayContent("application/x-ndjson", newLineBytes)
            val created = driveService.files().create(fileMetadata, content).setFields("id").execute()
            created.id
        } else {
            // Append by reading existing content and updating
            val outputStream = ByteArrayOutputStream()
            driveService.files().get(existingFileId).executeMediaAndDownloadTo(outputStream)
            val combinedBytes = outputStream.toByteArray() + newLineBytes

            val updateContent = ByteArrayContent("application/x-ndjson", combinedBytes)
            val updated = driveService.files().update(existingFileId, File(), updateContent).setFields("id").execute()
            updated.id
        }
    }

    /**
     * Uploads or updates MASTER_DIGEST.md in the child vault.
     */
    suspend fun uploadOrUpdateMasterDigest(childFolderId: String, markdownContent: String): String = withContext(Dispatchers.IO) {
        uploadOrUpdateTextFile(childFolderId, "MASTER_DIGEST.md", "text/markdown", markdownContent)
    }

    /**
     * Uploads or updates FAMILY_DIGEST.md at the academic year level.
     */
    suspend fun uploadOrUpdateFamilyDigest(yearFolderId: String, markdownContent: String): String = withContext(Dispatchers.IO) {
        uploadOrUpdateTextFile(yearFolderId, "FAMILY_DIGEST.md", "text/markdown", markdownContent)
    }

    /**
     * Uploads or updates _system/knowledge_graph.json.
     */
    suspend fun uploadOrUpdateKnowledgeGraph(systemFolderId: String, graphJson: String): String = withContext(Dispatchers.IO) {
        uploadOrUpdateTextFile(systemFolderId, "knowledge_graph.json", "application/json", graphJson)
    }

    /**
     * Uploads or updates graph.html.
     */
    suspend fun uploadOrUpdateGraphHtml(childFolderId: String, htmlContent: String): String = withContext(Dispatchers.IO) {
        uploadOrUpdateTextFile(childFolderId, "graph.html", "text/html", htmlContent)
    }

    /**
     * Appends a log line to _system/logs/sync_timeline.log.
     */
    suspend fun appendTimelineLog(logsFolderId: String, logLine: String): String = withContext(Dispatchers.IO) {
        val fileName = "sync_timeline.log"
        val existingFileId = findFileIdByName(fileName, logsFolderId)
        val lineBytes = (logLine.trim() + "\n").toByteArray(StandardCharsets.UTF_8)

        if (existingFileId == null) {
            val fileMetadata = File().apply {
                name = fileName
                parents = listOf(logsFolderId)
                mimeType = "text/plain"
            }
            val content = ByteArrayContent("text/plain", lineBytes)
            val created = driveService.files().create(fileMetadata, content).setFields("id").execute()
            created.id
        } else {
            val outputStream = ByteArrayOutputStream()
            driveService.files().get(existingFileId).executeMediaAndDownloadTo(outputStream)
            val combined = outputStream.toByteArray() + lineBytes
            val updateContent = ByteArrayContent("text/plain", combined)
            val updated = driveService.files().update(existingFileId, File(), updateContent).setFields("id").execute()
            updated.id
        }
    }

    /**
     * Uploads or updates diagnostic_snapshot.json in _system/logs/.
     */
    suspend fun uploadDiagnosticSnapshot(logsFolderId: String, snapshotJson: String): String = withContext(Dispatchers.IO) {
        uploadOrUpdateTextFile(logsFolderId, "diagnostic_snapshot.json", "application/json", snapshotJson)
    }

    /**
     * Uploads binary attachment using Resumable Upload protocol.
     */
    suspend fun uploadAttachment(
        parentFolderId: String,
        file: java.io.File,
        mimeType: String
    ): String = withContext(Dispatchers.IO) {
        val fileMetadata = File().apply {
            name = file.name
            parents = listOf(parentFolderId)
        }
        val mediaContent = FileContent(mimeType, file)
        val uploaded = driveService.files().create(fileMetadata, mediaContent)
            .setFields("id, name, size")
            .execute()
        uploaded.id
    }

    /**
     * Retrieves Drive storage quota information for the 5-point probe.
     */
    suspend fun getStorageQuota(): DriveQuotaInfo = withContext(Dispatchers.IO) {
        val about = driveService.about().get().setFields("storageQuota").execute()
        val quota = about.storageQuota
        val limit = quota?.limit ?: 15_000_000_000L
        val usage = quota?.usage ?: 0L
        DriveQuotaInfo(
            limitBytes = limit,
            usageBytes = usage,
            freeBytes = (limit - usage).coerceAtLeast(0L)
        )
    }

    /**
     * Provisions a dedicated channel subfolder (e.g. "Google Classroom") and its "attachments" folder.
     */
    suspend fun provisionChannelVault(childFolderId: String, channelName: String): ChannelVaultFolders = withContext(Dispatchers.IO) {
        val channelFolderId = getOrCreateFolder(channelName, childFolderId)
        val attachmentsFolderId = getOrCreateFolder("attachments", channelFolderId)
        ChannelVaultFolders(
            channelFolderId = channelFolderId,
            attachmentsFolderId = attachmentsFolderId
        )
    }

    /**
     * Appends a notice record to a channel-specific notices.jsonl file.
     */
    suspend fun appendNoticeToChannelJsonl(channelFolderId: String, jsonLine: String): String = withContext(Dispatchers.IO) {
        val fileName = "notices.jsonl"
        val existingFileId = findFileIdByName(fileName, channelFolderId)
        val newLineBytes = (jsonLine.trim() + "\n").toByteArray(StandardCharsets.UTF_8)

        if (existingFileId == null) {
            val fileMetadata = File().apply {
                name = fileName
                parents = listOf(channelFolderId)
                mimeType = "application/x-ndjson"
            }
            val content = ByteArrayContent("application/x-ndjson", newLineBytes)
            val created = driveService.files().create(fileMetadata, content).setFields("id").execute()
            created.id
        } else {
            val outputStream = ByteArrayOutputStream()
            driveService.files().get(existingFileId).executeMediaAndDownloadTo(outputStream)
            val combinedBytes = outputStream.toByteArray() + newLineBytes
            val updateContent = ByteArrayContent("application/x-ndjson", combinedBytes)
            val updated = driveService.files().update(existingFileId, File(), updateContent).setFields("id").execute()
            updated.id
        }
    }

    /**
     * Uploads or updates a channel digest (e.g. CLASSROOM_DIGEST.md).
     */
    suspend fun uploadOrUpdateChannelDigest(channelFolderId: String, markdownContent: String): String = withContext(Dispatchers.IO) {
        uploadOrUpdateTextFile(channelFolderId, "CLASSROOM_DIGEST.md", "text/markdown", markdownContent)
    }

    /**
     * Appends deep scroller telemetry trace lines to _system/logs/crawler_trace.log.
     */
    suspend fun appendCrawlerTraceLog(logsFolderId: String, logLines: List<String>): String = withContext(Dispatchers.IO) {
        if (logLines.isEmpty()) return@withContext ""
        val fileName = "crawler_trace.log"
        val existingFileId = findFileIdByName(fileName, logsFolderId)
        val combinedText = logLines.joinToString("\n") + "\n"
        val lineBytes = combinedText.toByteArray(StandardCharsets.UTF_8)

        if (existingFileId == null) {
            val fileMetadata = File().apply {
                name = fileName
                parents = listOf(logsFolderId)
                mimeType = "text/plain"
            }
            val content = ByteArrayContent("text/plain", lineBytes)
            val created = driveService.files().create(fileMetadata, content).setFields("id").execute()
            created.id
        } else {
            val outputStream = ByteArrayOutputStream()
            driveService.files().get(existingFileId).executeMediaAndDownloadTo(outputStream)
            val combined = outputStream.toByteArray() + lineBytes
            val updateContent = ByteArrayContent("text/plain", combined)
            val updated = driveService.files().update(existingFileId, File(), updateContent).setFields("id").execute()
            updated.id
        }
    }

    private fun findFileIdByName(name: String, parentFolderId: String): String? {
        val query = "name = '$name' and '$parentFolderId' in parents and trashed = false"
        val list = driveService.files().list().setQ(query).setFields("files(id)").execute()
        return list.files?.firstOrNull()?.id
    }

    private fun uploadOrUpdateTextFile(
        parentFolderId: String,
        fileName: String,
        mimeType: String,
        content: String
    ): String {
        val existingFileId = findFileIdByName(fileName, parentFolderId)
        val contentBytes = content.toByteArray(StandardCharsets.UTF_8)
        val mediaContent = ByteArrayContent(mimeType, contentBytes)

        return if (existingFileId == null) {
            val fileMetadata = File().apply {
                this.name = fileName
                this.parents = listOf(parentFolderId)
                this.mimeType = mimeType
            }
            val created = driveService.files().create(fileMetadata, mediaContent).setFields("id").execute()
            created.id
        } else {
            val updated = driveService.files().update(existingFileId, File(), mediaContent).setFields("id").execute()
            updated.id
        }
    }
}
