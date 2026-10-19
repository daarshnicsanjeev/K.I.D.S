package com.kids.collector

import com.google.common.truth.Truth.assertThat
import com.kids.collector.domain.filter.PrivacyFilter
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class PrivacyFilterTest {

    private lateinit var privacyFilter: PrivacyFilter

    @BeforeEach
    fun setUp() {
        privacyFilter = PrivacyFilter(
            whitelistedPackages = setOf(
                "com.google.android.apps.classroom",
                "com.whatsapp",
                "com.entab.campuscare"
            ),
            whitelistedChatGroups = setOf(
                "SJBHS 8B Parents",
                "Grade 3B CAIE Parents"
            )
        )
    }

    @Test
    fun `whitelisted classroom announcement is accepted`() {
        val result = privacyFilter.shouldIngest(
            packageName = "com.google.android.apps.classroom",
            conversationTitle = null,
            text = "STD- VIII (B) - Mathematics Revision Worksheet"
        )
        assertThat(result).isTrue()
    }

    @Test
    fun `non-whitelisted package is immediately dropped`() {
        val result = privacyFilter.shouldIngest(
            packageName = "com.random.app",
            conversationTitle = null,
            text = "Important school notice"
        )
        assertThat(result).isFalse()
    }

    @Test
    fun `whatsapp message from whitelisted school group is accepted`() {
        val result = privacyFilter.shouldIngest(
            packageName = "com.whatsapp",
            conversationTitle = "SJBHS 8B Parents",
            text = "Tomorrow is a school holiday on account of sports day."
        )
        assertThat(result).isTrue()
    }

    @Test
    fun `whatsapp message from personal contact or non-whitelisted group is dropped`() {
        val result = privacyFilter.shouldIngest(
            packageName = "com.whatsapp",
            conversationTitle = "Family Group",
            text = "Dinner plans tonight?"
        )
        assertThat(result).isFalse()
    }

    @Test
    fun `banking alert with OTP keyword is dropped even from school app`() {
        val result = privacyFilter.shouldIngest(
            packageName = "com.google.android.apps.classroom",
            conversationTitle = null,
            text = "Your OTP for payment verification code is 492019"
        )
        assertThat(result).isFalse()
    }
}
