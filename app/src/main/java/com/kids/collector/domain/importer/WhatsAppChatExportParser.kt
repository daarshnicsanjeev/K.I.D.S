package com.kids.collector.domain.importer

import com.kids.collector.domain.classifier.ContentClassifier
import com.kids.collector.domain.model.ContentCategory
import java.io.InputStream
import java.text.SimpleDateFormat
import java.util.*
import java.util.regex.Pattern

data class ImportedNoticeRecord(
    val timestampMs: Long,
    val sender: String,
    val messageText: String,
    val attachmentFileName: String?,
    val category: ContentCategory
)

/**
 * Parses native exported WhatsApp chat .txt files (with or without media attachments).
 * Acts as a 100% offline, zero-cloud fallback for Day 0 historical backfill.
 */
class WhatsAppChatExportParser(
    private val classifier: ContentClassifier = ContentClassifier()
) {

    // Matches standard WhatsApp date formats:
    // [15/09/26, 10:30:15 AM] Teacher Name: Message
    // 15/09/26, 10:30 - Teacher Name: Message
    private val bracketPattern = Pattern.compile(
        "^\\[?(\\d{1,4}[/.-]\\d{1,2}[/.-]\\d{2,4},\\s+\\d{1,2}:\\d{2}(?::\\d{2})?(?:\\s+[APap][Mm])?)\\]?\\s*[-:]?\\s*([^:]+):\\s*(.*)$"
    )

    // Matches attachment markers: "IMG-20260915-WA0001.jpg (file attached)" or "<attached: Circular.pdf>"
    private val attachmentPattern = Pattern.compile("([\\w-]+\\.(?:pdf|png|jpg|jpeg|webp|docx?|xlsx?))\\s*(?:\\(file attached\\)|<attached)", Pattern.CASE_INSENSITIVE)

    fun parseChatExport(inputStream: InputStream): List<ImportedNoticeRecord> {
        val records = mutableListOf<ImportedNoticeRecord>()
        val reader = inputStream.bufferedReader()

        var currentTimestampMs = System.currentTimeMillis()
        var currentSender = "School Group"
        var currentBody = StringBuilder()
        var currentAttachment: String? = null

        val flushRecord = {
            val body = currentBody.toString().trim()
            if (body.isNotBlank() && !isAdministrativeChatNoise(body)) {
                val category = classifier.classify(title = body.take(60), body = body)
                records.add(
                    ImportedNoticeRecord(
                        timestampMs = currentTimestampMs,
                        sender = currentSender,
                        messageText = body,
                        attachmentFileName = currentAttachment,
                        category = category
                    )
                )
            }
            currentBody.clear()
            currentAttachment = null
        }

        reader.forEachLine { line ->
            val matcher = bracketPattern.matcher(line)
            if (matcher.find()) {
                // New message starting, flush previous
                flushRecord()

                val rawDate = matcher.group(1).orEmpty()
                currentSender = matcher.group(2)?.trim().orEmpty()
                val messagePart = matcher.group(3)?.trim().orEmpty()

                currentTimestampMs = parseTimestamp(rawDate)

                // Check for attachment reference
                val attachMatch = attachmentPattern.matcher(messagePart)
                if (attachMatch.find()) {
                    currentAttachment = attachMatch.group(1)
                }

                currentBody.append(messagePart)
            } else {
                // Continuation line of multi-line circular/homework description
                if (currentBody.isNotEmpty()) {
                    currentBody.append("\n").append(line)
                }
            }
        }

        flushRecord()
        return records
    }

    private fun parseTimestamp(raw: String): Long {
        val dateFormats = listOf(
            "dd/MM/yy, hh:mm:ss a",
            "dd/MM/yy, hh:mm a",
            "dd/MM/yyyy, hh:mm:ss a",
            "dd/MM/yyyy, hh:mm a",
            "yyyy/MM/dd, HH:mm",
            "MM/dd/yy, hh:mm:ss a",
            "MM/dd/yy, hh:mm a"
        )
        for (pattern in dateFormats) {
            try {
                val sdf = SimpleDateFormat(pattern, Locale.US)
                val date = sdf.parse(raw)
                if (date != null) return date.time
            } catch (_: Exception) {}
        }
        return System.currentTimeMillis()
    }

    private fun isAdministrativeChatNoise(text: String): Boolean {
        val lower = text.lowercase()
        return lower.contains("messages and calls are end-to-end encrypted") ||
                lower.contains("created group") ||
                lower.contains("added you") ||
                lower.contains("left group") ||
                lower.contains("<media omitted>")
    }
}
