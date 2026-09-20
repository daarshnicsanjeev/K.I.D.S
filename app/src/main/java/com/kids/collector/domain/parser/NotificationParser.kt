package com.kids.collector.domain.parser

import android.app.Notification
import android.graphics.Bitmap
import android.os.Build
import android.os.Bundle
import android.service.notification.StatusBarNotification

data class ParsedNotification(
    val packageName: String,
    val title: String,
    val body: String,
    val conversationTitle: String?,
    val sender: String,
    val postTimeMs: Long,
    val pictureBitmap: Bitmap? = null,
    val hasAttachmentPreview: Boolean = false
)

/**
 * Robust extractor for incoming StatusBarNotification extras across
 * Google Classroom, WhatsApp, and School ERP applications.
 */
class NotificationParser {

    fun parse(sbn: StatusBarNotification): ParsedNotification? {
        val packageName = sbn.packageName ?: return null
        val notification = sbn.notification ?: return null
        val extras: Bundle = notification.extras ?: return null
        return parse(packageName, sbn.postTime, extras)
    }

    fun parse(packageName: String, postTimeMs: Long, extras: Bundle): ParsedNotification? {
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim().orEmpty()
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim().orEmpty()
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()?.trim()

        val conversationTitle = extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)?.toString()?.trim()

        // Extract primary message body prioritizing bigText over standard text
        val body = when {
            bigText.isNotBlank() -> bigText
            text.isNotBlank() -> text
            else -> title
        }

        // Determine sender identifier
        val sender = when {
            !conversationTitle.isNullOrBlank() -> conversationTitle
            !subText.isNullOrBlank() -> subText
            else -> packageName
        }

        // Extract picture extra if circular is broadcast as an image
        val pictureBitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            extras.getParcelable(Notification.EXTRA_PICTURE, Bitmap::class.java)
        } else {
            @Suppress("DEPRECATION")
            extras.getParcelable(Notification.EXTRA_PICTURE) as? Bitmap
        }

        val hasAttachment = pictureBitmap != null ||
                body.contains(".pdf", ignoreCase = true) ||
                body.contains("photo", ignoreCase = true) ||
                body.contains("attached", ignoreCase = true)

        return ParsedNotification(
            packageName = packageName,
            title = title,
            body = body,
            conversationTitle = conversationTitle,
            sender = sender,
            postTimeMs = postTimeMs,
            pictureBitmap = pictureBitmap,
            hasAttachmentPreview = hasAttachment
        )
    }
}
