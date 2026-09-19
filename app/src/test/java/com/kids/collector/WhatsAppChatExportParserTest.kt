package com.kids.collector

import com.google.common.truth.Truth.assertThat
import com.kids.collector.domain.importer.WhatsAppChatExportParser
import com.kids.collector.domain.model.ContentCategory
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.io.ByteArrayInputStream

class WhatsAppChatExportParserTest {

    private lateinit var parser: WhatsAppChatExportParser

    @BeforeEach
    fun setUp() {
        parser = WhatsAppChatExportParser()
    }

    @Test
    fun `parses multi-line chat export and detects attachments and circulars`() {
        val rawChat = """
            [15/09/26, 09:30:00 AM] Class Teacher: Dear Parents, please find the Exam Timetable attached.
            Circular_HalfYearly_Sep2026.pdf (file attached)
            Kindly ensure your ward prepares as per the syllabus.
            [15/09/26, 11:15:00 AM] Math Teacher: Homework for today: Complete Worksheet Chapter 4 questions 1-10.
            [15/09/26, 02:00:00 PM] Admin: Tuition fee installment is due on 25th September. Kindly pay online.
        """.trimIndent()

        val records = parser.parseChatExport(ByteArrayInputStream(rawChat.toByteArray()))

        assertThat(records).hasSize(3)

        // Record 1: Circular with attachment
        val r1 = records[0]
        assertThat(r1.sender).isEqualTo("Class Teacher")
        assertThat(r1.attachmentFileName).isEqualTo("Circular_HalfYearly_Sep2026.pdf")
        assertThat(r1.category).isEqualTo(ContentCategory.CIRCULAR)
        assertThat(r1.messageText).contains("Exam Timetable attached")

        // Record 2: Homework
        val r2 = records[1]
        assertThat(r2.sender).isEqualTo("Math Teacher")
        assertThat(r2.category).isEqualTo(ContentCategory.HOMEWORK)

        // Record 3: Fees
        val r3 = records[2]
        assertThat(r3.category).isEqualTo(ContentCategory.FEES)
    }

    @Test
    fun `discards administrative noise messages`() {
        val noiseChat = """
            [12/09/26, 08:00:00 AM] System: Messages and calls are end-to-end encrypted.
            [12/09/26, 08:05:00 AM] Admin: Admin added you to the group.
            [12/09/26, 09:00:00 AM] Teacher: Today is sports day practice.
        """.trimIndent()

        val records = parser.parseChatExport(ByteArrayInputStream(noiseChat.toByteArray()))

        assertThat(records).hasSize(1)
        assertThat(records[0].messageText).isEqualTo("Today is sports day practice.")
    }
}
