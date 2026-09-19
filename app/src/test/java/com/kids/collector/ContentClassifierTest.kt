package com.kids.collector

import com.google.common.truth.Truth.assertThat
import com.kids.collector.domain.classifier.ContentClassifier
import com.kids.collector.domain.model.ContentCategory
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class ContentClassifierTest {

    private lateinit var classifier: ContentClassifier

    @BeforeEach
    fun setUp() {
        classifier = ContentClassifier()
    }

    @Test
    fun `classifies homework assignment correctly`() {
        val category = classifier.classify(
            title = "Math HW due Monday",
            body = "Complete exercises 4.1 to 4.5 in Chapter 4 Algebraic Expressions worksheet."
        )
        assertThat(category).isEqualTo(ContentCategory.HOMEWORK)
    }

    @Test
    fun `classifies circular announcement correctly`() {
        val category = classifier.classify(
            title = "Circular: Half-Yearly Exam Timetable",
            body = "Dear Parents, please find the examination schedule attached. School will remain closed on Friday."
        )
        assertThat(category).isEqualTo(ContentCategory.CIRCULAR)
    }

    @Test
    fun `classifies fee reminder correctly`() {
        val category = classifier.classify(
            title = "Term 2 Fee Due Payment Notice",
            body = "Kindly pay online tuition fee installment before the due date to avoid penalty."
        )
        assertThat(category).isEqualTo(ContentCategory.FEES)
    }

    @Test
    fun `classifies attendance alert correctly`() {
        val category = classifier.classify(
            title = "Attendance Alert",
            body = "Your ward was marked absent today for the morning assembly."
        )
        assertThat(category).isEqualTo(ContentCategory.ATTENDANCE)
    }
}
