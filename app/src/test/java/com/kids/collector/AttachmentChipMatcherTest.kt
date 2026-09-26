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

    @Test
    fun `matches combined topic with both addition and subtraction`() {
        val matches = KidsAccessibilityService.matchesAttachmentChipText(
            targetFileName = "Chapter 8 - Addition and Subtraction.pdf",
            candidateText = "Chapter 8 - Addition and Subtraction"
        )
        assertThat(matches).isTrue()
    }

    @Test
    fun `matches combined topic with trailing metadata and file size`() {
        val matches = KidsAccessibilityService.matchesAttachmentChipText(
            targetFileName = "Chapter 8 - Addition and Subtraction.pdf",
            candidateText = "Chapter 8 - Addition and Subtraction 1.2 MB 2 pages"
        )
        assertThat(matches).isTrue()
    }

    @Test
    fun `still rejects polar antonym if target only has one operation`() {
        val matches = KidsAccessibilityService.matchesAttachmentChipText(
            targetFileName = "Chapter 8 - Addition.pdf",
            candidateText = "Chapter 8 - Subtraction"
        )
        assertThat(matches).isFalse()
    }

    @Test
    fun `matches audio mp3 attachment chip filename`() {
        val matches = KidsAccessibilityService.matchesAttachmentChipText(
            targetFileName = "Listening Audio 1 - Joey.mp3",
            candidateText = "Listening Audio 1 - Joey.mp3 3.5 MB"
        )
        assertThat(matches).isTrue()
    }

    @Test
    fun `matches long filename containing answer key`() {
        val matches = KidsAccessibilityService.matchesAttachmentChipText(
            targetFileName = "Read & write larger numbers,Know place value and Count on and back Notebook - Answer Key.pdf",
            candidateText = "Read & write larger numbers,Know place value and Count on and back Notebook - Answer Key.pdf 1.8 MB"
        )
        assertThat(matches).isTrue()
    }

    @Test
    fun `matches hindi filename across composed and decomposed unicode forms`() {
        // NFD vs NFC (nukta representation differences)
        val targetWithComposedNukta = "Grade 3 गुड़िया बोली (Textbook PDF).pdf"
        val candidateWithDecomposedNukta = "Grade 3 गुड़िया बोली (Textbook PDF).pdf 2.4 MB"
        val matches = KidsAccessibilityService.matchesAttachmentChipText(
            targetFileName = targetWithComposedNukta,
            candidateText = candidateWithDecomposedNukta
        )
        assertThat(matches).isTrue()
    }

    @Test
    fun `matches hindi notes with plural diacritic differences`() {
        val targetWithNukta = "Grade 3 तीन गुड़ियाँ Notebook Notes.pdf"
        val candidateWithCombiningNukta = "Grade 3 तीन गुड़ियाँ Notebook Notes.pdf 1.5 MB"
        val matches = KidsAccessibilityService.matchesAttachmentChipText(
            targetFileName = targetWithNukta,
            candidateText = candidateWithCombiningNukta
        )
        assertThat(matches).isTrue()
    }
}
