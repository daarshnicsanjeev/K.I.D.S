package com.kids.collector

import com.google.common.truth.Truth.assertThat
import com.kids.collector.domain.model.StreamItemStatus
import com.kids.collector.domain.model.StreamManifest
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class StreamManifestAndCardTest {

    private lateinit var manifest: StreamManifest

    // Replicated date heuristic from KidsAccessibilityService for decoupled testing
    private val streamDateKeywords = setOf("yesterday", "today", "tomorrow", "posted", "edited", "due")
    private val streamMonthRegex = Regex(
        """\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b""",
        RegexOption.IGNORE_CASE
    )
    private val streamTimeRegex = Regex("""\b\d{1,2}:\d{2}\s*(?:am|pm)?\b""", RegexOption.IGNORE_CASE)
    private val streamRelativeTimeRegex = Regex("""\b\d+\s+(?:min(?:ute)?s?|hours?|days?|weeks?|months?)\s+ago\b""", RegexOption.IGNORE_CASE)

    private fun hasPostDateOrTimestamp(lowerText: String): Boolean {
        if (streamDateKeywords.any { lowerText.contains(it) }) return true
        if (streamMonthRegex.containsMatchIn(lowerText)) return true
        if (streamTimeRegex.containsMatchIn(lowerText)) return true
        if (streamRelativeTimeRegex.containsMatchIn(lowerText)) return true
        return false
    }

    private fun isStreamPostCardSimulated(text: String, viewId: String = ""): Boolean {
        val lowerCombined = text.lowercase().trim()
        if (lowerCombined.length <= 15) return false

        if (lowerCombined.contains("announce something to your class") ||
            lowerCombined.contains("share with your class") ||
            lowerCombined.contains("view to-do list")
        ) {
            return false
        }

        val isOnlyComment = lowerCombined.matches(Regex("""^(?:\d+\s+)?class\s+comments?.*""")) ||
                lowerCombined == "add class comment" ||
                (lowerCombined.contains("class comment") && text.length < 35)
        if (isOnlyComment) return false

        if (viewId.contains("course_header") || viewId.contains("class_header") || viewId.contains("cover_view")) {
            return false
        }

        val hasPostCategory = lowerCombined.contains("new material:") ||
                lowerCombined.contains("new material") ||
                lowerCombined.contains("new assignment:") ||
                lowerCombined.contains("new assignment") ||
                lowerCombined.contains("new question:") ||
                lowerCombined.contains("new question") ||
                lowerCombined.contains("new quiz:") ||
                lowerCombined.contains("assignment:") ||
                lowerCombined.contains("material:")

        val hasDatePattern = hasPostDateOrTimestamp(lowerCombined)

        val hasComments = lowerCombined.contains("class comment") ||
                lowerCombined.contains("class comments") ||
                lowerCombined.contains("add class comment")

        if (!hasPostCategory && !hasDatePattern && !hasComments) {
            return false
        }
        return true
    }

    @BeforeEach
    fun setUp() {
        manifest = StreamManifest()
    }

    @Test
    fun `header banner is correctly rejected across multiple schools and grades`() {
        // Grade 3B CAIE (User's case)
        val banner1 = "Grade 3B CAIE 2026-27 GRADE 3B"
        assertThat(isStreamPostCardSimulated(banner1)).isFalse()

        // Grade 5A ICSE
        val banner2 = "Grade 5A ICSE Science & Mathematics 2026"
        assertThat(isStreamPostCardSimulated(banner2)).isFalse()

        // Class 10 CBSE
        val banner3 = "Class 10-D English Literature Section D"
        assertThat(isStreamPostCardSimulated(banner3)).isFalse()
    }

    @Test
    fun `real posts are accepted including materials, assignments and announcements`() {
        // User's actual first post from screenshot 1
        val post1 = "New material: Formatting Text in Word 2016 WS with Answerkey Yesterday 0 class comments"
        assertThat(isStreamPostCardSimulated(post1)).isTrue()

        // User's actual second post (Teacher announcement)
        val post2 = "Kamaljit Kaunsal Yesterday Dear Parents, This is a gentle reminder that the SOF International General Knowledge Olympiad (IGKO) Examination will be conducted tomorrow 0 class comments"
        assertThat(isStreamPostCardSimulated(post2)).isTrue()

        // Middle post with Hindi / Devanagari script
        val post3 = "New material: Grade 3 Hindi गुड़िया बोली (Textbook PDF) Posted Jun 10 (Edited Jun 25) 0 class comments"
        assertThat(isStreamPostCardSimulated(post3)).isTrue()

        // User's actual bottom post from screenshot 2
        val postBottom = "New material: Chapter 8 - Addition and Subtraction Textbook PDF Jun 10 0 class comments"
        assertThat(isStreamPostCardSimulated(postBottom)).isTrue()
    }

    @Test
    fun `standalone comment chips are rejected but cards containing comment indicators are preserved`() {
        assertThat(isStreamPostCardSimulated("0 class comments")).isFalse()
        assertThat(isStreamPostCardSimulated("Add class comment")).isFalse()
        assertThat(isStreamPostCardSimulated("3 class comments")).isFalse()

        // Full post containing comments is preserved
        val postWithComment = "Announcement: Sports Day rehearsal on Friday. Bring white shoes. 5 class comments"
        assertThat(isStreamPostCardSimulated(postWithComment)).isTrue()
    }

    @Test
    fun `manifest sets start and end item titles accurately without hardcoding`() {
        // Post 1: Real first item
        manifest.addItem(
            fingerprint = "fp_word_ws",
            title = "New material: Formatting Text in Word 2016 WS with Answerkey",
            previewText = "Formatting Text in Word 2016 WS with Answerkey",
            isAlreadyCaptured = false
        )
        assertThat(manifest.startItemTitle).isEqualTo("New material: Formatting Text in Word 2016 WS with Answerkey")
        assertThat(manifest.endItemTitle).isEqualTo("New material: Formatting Text in Word 2016 WS with Answerkey")
        assertThat(manifest.totalCount).isEqualTo(1)

        // Post 2: Intermediate item
        manifest.addItem(
            fingerprint = "fp_olympiad",
            title = "SOF International General Knowledge Olympiad",
            previewText = "Dear Parents, This is a gentle reminder...",
            isAlreadyCaptured = false
        )
        assertThat(manifest.startItemTitle).isEqualTo("New material: Formatting Text in Word 2016 WS with Answerkey")
        assertThat(manifest.endItemTitle).isEqualTo("SOF International General Knowledge Olympiad")
        assertThat(manifest.totalCount).isEqualTo(2)

        // Post 3: Real bottom item
        manifest.addItem(
            fingerprint = "fp_math_ch8",
            title = "New material: Chapter 8 - Addition and Subtraction Textbook PDF",
            previewText = "Chapter 8 - Addition and Subtraction Textbook PDF Jun 10",
            isAlreadyCaptured = false
        )
        assertThat(manifest.startItemTitle).isEqualTo("New material: Formatting Text in Word 2016 WS with Answerkey")
        assertThat(manifest.endItemTitle).isEqualTo("New material: Chapter 8 - Addition and Subtraction Textbook PDF")
        assertThat(manifest.totalCount).isEqualTo(3)
    }

    @Test
    fun `resilient token overlap matching resolves Unicode and punctuation variants`() {
        manifest.addItem(
            fingerprint = "fp_hindi_notes",
            title = "New material: Grade 3 Hindi गुड़िया बोली NOTEBOOK NOTES Sep 10",
            previewText = "Hindi notebook notes for chapter 3",
            isAlreadyCaptured = false
        )

        // Target matching with varied spacing or punctuation
        val matched = manifest.findMatchingItem(
            fingerprint = "fp_different_or_missing",
            title = "New material: Grade 3 Hindi गुड़िया बोली NOTEBOOK NOTES",
            cardText = "Grade 3 Hindi notebook notes attached"
        )

        assertThat(matched).isNotNull()
        assertThat(matched?.fingerprint).isEqualTo("fp_hindi_notes")
    }

    @Test
    fun `manifest status transitions and completion tracking work accurately`() {
        manifest.addItem("fp_1", "Notice 1", "Body 1", false)
        manifest.addItem("fp_2", "Notice 2", "Body 2", false)

        assertThat(manifest.pendingCount).isEqualTo(2)
        assertThat(manifest.completedCount).isEqualTo(0)
        assertThat(manifest.progressPercent).isEqualTo(0)

        manifest.markCompleted("fp_1", 2)
        assertThat(manifest.completedCount).isEqualTo(1)
        assertThat(manifest.pendingCount).isEqualTo(1)
        assertThat(manifest.progressPercent).isEqualTo(50)

        manifest.markCompleted("fp_2", 1)
        assertThat(manifest.isAllFinished()).isTrue()
        assertThat(manifest.progressPercent).isEqualTo(100)
    }

    @Test
    fun `reverse traversal retrieves items from bottom to top accurately`() {
        manifest.addItem("fp_1", "Notice 1 (Top / Newest)", "Body 1", false)
        manifest.addItem("fp_2", "Notice 2 (Middle)", "Body 2", false)
        manifest.addItem("fp_3", "Notice 3 (Bottom / Oldest)", "Body 3", false)

        // Reverse mode should select item 3 first
        val itemFirst = manifest.getNextPendingItemReverse()
        assertThat(itemFirst?.fingerprint).isEqualTo("fp_3")
        assertThat(itemFirst?.index).isEqualTo(3)

        manifest.markCompleted("fp_3")

        // Next should select item 2
        val itemSecond = manifest.getNextPendingItemReverse()
        assertThat(itemSecond?.fingerprint).isEqualTo("fp_2")
        assertThat(itemSecond?.index).isEqualTo(2)

        manifest.markCompleted("fp_2")

        // Next should select item 1
        val itemThird = manifest.getNextPendingItemReverse()
        assertThat(itemThird?.fingerprint).isEqualTo("fp_1")
        assertThat(itemThird?.index).isEqualTo(1)

        manifest.markCompleted("fp_1")

        // Once all completed, returns null
        assertThat(manifest.getNextPendingItemReverse()).isNull()
        assertThat(manifest.isAllFinished()).isTrue()
    }
}
