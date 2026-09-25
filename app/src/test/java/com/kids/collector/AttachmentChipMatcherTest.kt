package com.kids.collector

import com.google.common.truth.Truth.assertThat
import com.kids.collector.service.KidsAccessibilityService
import org.junit.jupiter.api.Test

class AttachmentChipMatcherTest {

    @Test
    fun `matches exact attachment chip filename`() {
        val matches = KidsAccessibilityService.matchesAttachmentChipText(
            targetFileName = "Place Value Level 1.pdf",
            candidateText = "Place Value Level 1.pdf"
        )
        assertThat(matches).isTrue()
    }

    @Test
    fun `matches attachment chip with trailing file size and metadata`() {
        val matches = KidsAccessibilityService.matchesAttachmentChipText(
            targetFileName = "Class 2 - Subtraction Level 2.pdf",
            candidateText = "Class 2 - Subtraction Level 2.pdf 2.4 MB 1 page"
        )
        assertThat(matches).isTrue()
    }

    @Test
    fun `rejects attachment chip with different level numbers`() {
        val matches = KidsAccessibilityService.matchesAttachmentChipText(
            targetFileName = "Class 2 - Subtraction Level 2.pdf",
            candidateText = "Class 2 - Subtraction Level 1.pdf 2.4 MB"
        )
        assertThat(matches).isFalse()
    }

    @Test
    fun `rejects answer key when target is worksheet`() {
        val matches = KidsAccessibilityService.matchesAttachmentChipText(
            targetFileName = "Place Value Level 1.pdf",
            candidateText = "Place Value Level 1 answer key.pdf 500 KB"
        )
        assertThat(matches).isFalse()
    }

    @Test
    fun `accepts answer key when target explicitly specifies answer key`() {
        val matches = KidsAccessibilityService.matchesAttachmentChipText(
            targetFileName = "Place Value Level 1 answer key.pdf",
            candidateText = "Place Value Level 1 answer key.pdf 500 KB"
        )
        assertThat(matches).isTrue()
    }

    @Test
    fun `rejects polar antonym subject operations`() {
        val matches = KidsAccessibilityService.matchesAttachmentChipText(
            targetFileName = "Mathematics - Addition Level 1.pdf",
            candidateText = "Mathematics - Subtraction Level 1.pdf"
        )
        assertThat(matches).isFalse()
    }

    @Test
    fun `matches circular announcement without extension`() {
        val matches = KidsAccessibilityService.matchesAttachmentChipText(
            targetFileName = "Circular No 42 - Annual Sports Day.pdf",
            candidateText = "Circular No 42 - Annual Sports Day"
        )
        assertThat(matches).isTrue()
    }

    @Test
    fun `rejects circular announcement with mismatched circular number`() {
        val matches = KidsAccessibilityService.matchesAttachmentChipText(
            targetFileName = "Circular No 42 - Annual Sports Day.pdf",
            candidateText = "Circular No 43 - Annual Sports Day"
        )
        assertThat(matches).isFalse()
    }
}
