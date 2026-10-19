package com.kids.collector

import com.google.common.truth.Truth.assertThat
import com.kids.collector.domain.graph.KotlinGraphifyEngine
import com.kids.collector.domain.model.Attachment
import com.kids.collector.domain.model.ChildProfile
import com.kids.collector.domain.model.ContentCategory
import com.kids.collector.domain.model.Notice
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class KnowledgeGraphBuilderTest {

    private lateinit var graphifyEngine: KotlinGraphifyEngine
    private val anvesha = ChildProfile(
        childId = "anvesha_01",
        firstName = "Anvesha",
        grade = "Grade 8",
        academicYear = "2026-2027",
        schoolName = "SJBHS"
    )

    private val atharva = ChildProfile(
        childId = "atharva_02",
        firstName = "Atharva",
        grade = "Grade 3",
        academicYear = "2026-2027",
        schoolName = "MyGlobal"
    )

    @BeforeEach
    fun setUp() {
        graphifyEngine = KotlinGraphifyEngine()
    }

    @Test
    fun `builds graph with child root node, notice, sender, and attachment edges`() {
        val noticeId = "notice_101"
        val notices = listOf(
            Notice(
                noticeId = noticeId,
                childId = anvesha.childId,
                sourceApp = "com.google.android.apps.classroom",
                category = ContentCategory.HOMEWORK,
                title = "Algebra Worksheet Chapter 4",
                body = "Complete questions 1 to 10.",
                sender = "Mr. Sharma",
                timestampMs = System.currentTimeMillis(),
                hashSha256 = "hash101"
            )
        )

        val attachments = listOf(
            Attachment(
                attachmentId = "att_201",
                noticeId = noticeId,
                fileName = "Chapter4_Worksheet.pdf",
                localUri = "/sdcard/Download/Chapter4_Worksheet.pdf",
                mimeType = "application/pdf",
                sizeBytes = 1048576L,
                fileHash = "filehash201",
                ocrText = "Chapter 4: Algebraic Expressions. Question 1: Simplify..."
            )
        )

        val graph = graphifyEngine.buildGraph(anvesha, notices, attachments)

        assertThat(graph.childId).isEqualTo(anvesha.childId)
        assertThat(graph.nodes).hasSize(4) // Child, Notice, Teacher, Attachment
        assertThat(graph.edges).hasSize(3) // Notice -> Child, Notice -> Teacher, Attachment -> Notice

        val json = graphifyEngine.exportToJson(graph)
        assertThat(json).contains("Chapter4_Worksheet.pdf")
        assertThat(json).contains("Mr. Sharma")
        assertThat(json).contains("BELONGS_TO")
        assertThat(json).contains("ATTACHED_TO")
    }

    @Test
    fun `generates valid markdown master digest and family digest`() {
        val notices = listOf(
            Notice(
                noticeId = "n1",
                childId = anvesha.childId,
                sourceApp = "com.whatsapp",
                category = ContentCategory.CIRCULAR,
                title = "Exam Timetable",
                body = "Half-yearly exam schedule.",
                sender = "Principal",
                timestampMs = System.currentTimeMillis(),
                hashSha256 = "hash2"
            )
        )

        val digest = graphifyEngine.generateMasterDigest(anvesha, notices)
        assertThat(digest).contains("# K.I.D.S. MASTER DIGEST: ANVESHA")
        assertThat(digest).contains("Exam Timetable")

        val familyDigest = graphifyEngine.generateFamilyDigest(
            listOf(
                anvesha to notices,
                atharva to emptyList()
            )
        )
        assertThat(familyDigest).contains("# K.I.D.S. FAMILY DIGEST")
        assertThat(familyDigest).contains("Anvesha")
        assertThat(familyDigest).contains("Atharva")
    }

    @Test
    fun `generates standalone interactive d3 html graph`() {
        val graph = graphifyEngine.buildGraph(anvesha, emptyList())
        val html = graphifyEngine.generateInteractiveHtml(anvesha, graph)

        assertThat(html).contains("<!DOCTYPE html>")
        assertThat(html).contains("d3.v7.min.js")
        assertThat(html).contains("K.I.D.S. Knowledge Graph: Anvesha")
    }
}
