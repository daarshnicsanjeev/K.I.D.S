package com.kids.collector

import android.app.Notification
import android.os.Bundle
import android.service.notification.StatusBarNotification
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
        val sbn = mockk<StatusBarNotification>()
        val notification = mockk<Notification>()
        val extras = mockk<Bundle>()

        every { sbn.packageName } returns "com.google.android.apps.classroom"
        every { sbn.notification } returns notification
        every { sbn.postTime } returns 1726815600000L
        every { notification.extras } returns extras

        every { extras.getCharSequence(Notification.EXTRA_TITLE) } returns "Mathematics Announcement"
        every { extras.getCharSequence(Notification.EXTRA_TEXT) } returns "Short summary"
        every { extras.getCharSequence(Notification.EXTRA_BIG_TEXT) } returns "Full homework instructions for Chapter 4 Algebraic Expressions."
        every { extras.getCharSequence(Notification.EXTRA_SUB_TEXT) } returns null
        every { extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE) } returns "STD- VIII (B)"
        every { extras.getParcelable(any(), any<Class<Any>>()) } returns null
        every { extras.getParcelable(any()) } returns null

        val parsed = parser.parse(sbn)

        assertThat(parsed).isNotNull()
        assertThat(parsed?.packageName).isEqualTo("com.google.android.apps.classroom")
        assertThat(parsed?.title).isEqualTo("Mathematics Announcement")
        assertThat(parsed?.body).isEqualTo("Full homework instructions for Chapter 4 Algebraic Expressions.")
        assertThat(parsed?.conversationTitle).isEqualTo("STD- VIII (B)")
        assertThat(parsed?.sender).isEqualTo("STD- VIII (B)")
    }
}
