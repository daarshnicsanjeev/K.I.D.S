package com.kids.collector

import android.app.Notification
import android.graphics.Bitmap
import android.os.Bundle
import com.google.common.truth.Truth.assertThat
import com.kids.collector.domain.parser.NotificationParser
import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class NotificationParserTest {

    private lateinit var parser: NotificationParser

    @BeforeEach
    fun setUp() {
        parser = NotificationParser()
    }

    @Test
    fun `parses title, bigText and conversationTitle correctly`() {
        val extras = mockk<Bundle>()

        every { extras.getCharSequence(Notification.EXTRA_TITLE) } returns "Mathematics Announcement"
        every { extras.getCharSequence(Notification.EXTRA_TEXT) } returns "Short summary"
        every { extras.getCharSequence(Notification.EXTRA_BIG_TEXT) } returns "Full homework instructions for Chapter 4 Algebraic Expressions."
        every { extras.getCharSequence(Notification.EXTRA_SUB_TEXT) } returns null
        every { extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE) } returns "STD- VIII (B)"
        every { extras.getParcelable(Notification.EXTRA_PICTURE, Bitmap::class.java) } returns null
        @Suppress("DEPRECATION")
        every { extras.getParcelable<Bitmap>(Notification.EXTRA_PICTURE) } returns null

        val parsed = parser.parse(
            packageName = "com.google.android.apps.classroom",
            postTimeMs = 1726815600000L,
            extras = extras
        )

        assertThat(parsed).isNotNull()
        assertThat(parsed?.packageName).isEqualTo("com.google.android.apps.classroom")
        assertThat(parsed?.title).isEqualTo("Mathematics Announcement")
        assertThat(parsed?.body).isEqualTo("Full homework instructions for Chapter 4 Algebraic Expressions.")
        assertThat(parsed?.conversationTitle).isEqualTo("STD- VIII (B)")
        assertThat(parsed?.sender).isEqualTo("STD- VIII (B)")
    }
}
