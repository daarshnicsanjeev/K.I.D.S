package com.kids.collector

import com.google.common.truth.Truth.assertThat
import com.kids.collector.domain.graph.KotlinGraphifyEngine
import com.kids.collector.domain.model.ChildProfile
import com.kids.collector.domain.model.ContentCategory
import com.kids.collector.domain.model.Notice
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class KnowledgeGraphBuilderTest {

    private lateinit var graphifyEngine: KotlinGraphifyEngine
    private val child = ChildProfile(
        childId = "anvesha_01",
        firstName = "Anvesha",
        grade = "Grade 8",
        academicYear = "2026-2027",
        schoolName = "SJBHS"
    )

    @BeforeEach
    fun setUp() {
        graphifyEngine = KotlinGraphifyEngine()
    }

    @Test
    fun `builds graph with child root node and notice edges`() {
        val notices = listOf(
            Notice(
                noticeId = "n1",
                childId = child.childId,
                sourceApp = "com.google.android.apps.classroom",
                category = ContentCategory.HOMEWORK,
                title = "Algebra Worksheet",
                body = "Chapter 4 questions",
                sender = "Mr. Sharma",
                timestampMs = System.currentTimeMillis(),
                hashSha256 = "hash1"
            )
        )

        val graph = graphifyEngine.buildGraph(child, notices)

        assertThat(graph.childId).isEqualTo(child.childId)
        assertThat(graph.nodes).hasSize(3) // Child, Notice, Teacher
        assertThat(graph.edges).hasSize(2) // Notice -> Child, Notice -> Teacher

        val json = graphifyEngine.exportToJson(graph)
        assertThat(json).contains("Algebra Worksheet")
        assertThat(json).contains("Mr. Sharma")
    }

    @Test
    fun `generates valid markdown master digest`() {
        val notices = listOf(
            Notice(
                noticeId = "n1",
                childId = child.childId,
                sourceApp = "com.whatsapp",
                category = ContentCategory.CIRCULAR,
                title = "Exam Timetable",
                body = "Half-yearly exam schedule",
                sender = "Principal",
                timestampMs = System.currentTimeMillis(),
                hashSha256 = "hash2"
            )
        )

        val digest = graphifyEngine.generateMasterDigest(child, notices)
        assertThat(digest).contains("# K.I.D.S. MASTER DIGEST: ANVESHA")
        assertThat(digest).contains("Exam Timetable")
    }
}
