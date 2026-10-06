package com.kids.collector

import com.google.common.truth.Truth.assertThat
import com.kids.collector.data.db.NoticeEntity
import com.kids.collector.domain.model.StreamItemStatus
import com.kids.collector.domain.model.StreamManifest
import com.kids.collector.domain.router.NoticeReconciliationEngine
import org.junit.jupiter.api.Test

class NoticeReconciliationEngineTest {

    @Test
    fun `findMatchingNoticeForAttachment matches Spanish Pronoun to Los pronombres`() {
        val candidates = listOf(
            NoticeEntity(
                noticeId = "notice_1",
                childId = "child_1",
                sourceApp = "com.google.android.apps.classroom",
                category = "HOMEWORK",
                title = "Los pronombres- The Pronouns",
                body = "Kindly find the attached PPT on pronouns for your reference.",
                sender = "Chaitali Chavan",
                timestampMs = 1723000000000L,
                hashSha256 = "hash1",
                syncStatus = "PENDING",
                driveFileId = null,
                attachmentCount = 0
            ),
            NoticeEntity(
                noticeId = "notice_2",
                childId = "child_1",
                sourceApp = "com.google.android.apps.classroom",
                category = "CIRCULAR",
                title = "Heavy Rainfall Advisory",
                body = "School closed due to heavy rain.",
                sender = "Admin",
                timestampMs = 1723000000000L,
                hashSha256 = "hash2",
                syncStatus = "PENDING",
                driveFileId = null,
                attachmentCount = 0
            )
        )

        val matched = NoticeReconciliationEngine.findMatchingNoticeForAttachment(
            "Spanish Pronoun.pdf",
            candidates
        )

        assertThat(matched).isNotNull()
        assertThat(matched?.noticeId).isEqualTo("notice_1")
    }

    @Test
    fun `findMatchingNoticeForAttachment matches Addition and Subtraction Practice sheet`() {
        val candidates = listOf(
            NoticeEntity(
                noticeId = "notice_math",
                childId = "child_1",
                sourceApp = "com.google.android.apps.classroom",
                category = "HOMEWORK",
                title = "Addition and Subtraction Practice sheets",
                body = "Math worksheet attached.",
                sender = "Math Teacher",
                timestampMs = 1723000000000L,
                hashSha256 = "hash_math",
                syncStatus = "PENDING",
                driveFileId = null,
                attachmentCount = 0
            ),
            NoticeEntity(
                noticeId = "notice_sst",
                childId = "child_1",
                sourceApp = "com.google.android.apps.classroom",
                category = "HOMEWORK",
                title = "Chapter 1 - Early Humans",
                body = "Early humans notes.",
                sender = "SST Teacher",
                timestampMs = 1723000000000L,
                hashSha256 = "hash_sst",
                syncStatus = "PENDING",
                driveFileId = null,
                attachmentCount = 0
            )
        )

        val matchedMath = NoticeReconciliationEngine.findMatchingNoticeForAttachment(
            "Addition & Subtraction Practice sheet.pdf",
            candidates
        )
        assertThat(matchedMath?.noticeId).isEqualTo("notice_math")

        val matchedSst = NoticeReconciliationEngine.findMatchingNoticeForAttachment(
            "Early Humans PPT.pdf",
            candidates
        )
        assertThat(matchedSst?.noticeId).isEqualTo("notice_sst")
    }

    @Test
    fun `findMatchingNoticeForAttachment matches Time ws to Time- La hora`() {
        val candidates = listOf(
            NoticeEntity(
                noticeId = "notice_time",
                childId = "child_1",
                sourceApp = "com.google.android.apps.classroom",
                category = "HOMEWORK",
                title = "Time- La hora",
                body = "Spanish time worksheet.",
                sender = "Spanish Teacher",
                timestampMs = 1723000000000L,
                hashSha256 = "hash_time",
                syncStatus = "PENDING",
                driveFileId = null,
                attachmentCount = 0
            )
        )

        val matched = NoticeReconciliationEngine.findMatchingNoticeForAttachment(
            "time ws.pdf",
            candidates
        )
        assertThat(matched?.noticeId).isEqualTo("notice_time")
    }

    @Test
    fun `isSharedResourceNotice correctly identifies placeholder titles`() {
        assertThat(NoticeReconciliationEngine.isSharedResourceNotice("Google Drive Shared Resources")).isTrue()
        assertThat(NoticeReconciliationEngine.isSharedResourceNotice("Shared Folder: Grade 3 Resources")).isTrue()
        assertThat(NoticeReconciliationEngine.isSharedResourceNotice("shared resources")).isTrue()
        assertThat(NoticeReconciliationEngine.isSharedResourceNotice("Los pronombres- The Pronouns")).isFalse()
        assertThat(NoticeReconciliationEngine.isSharedResourceNotice("Addition and Subtraction")).isFalse()
    }

    @Test
    fun `stream manifest sequentially prioritizes pending items for duplicate titles`() {
        val manifest = StreamManifest()
        val added1 = manifest.addItem(
            fingerprint = "fp_pronouns_1",
            title = "New material: Los pronombres- The Pronouns",
            previewText = "Post 1 preview",
            isAlreadyCaptured = false
        )
        val added2 = manifest.addItem(
            fingerprint = "fp_pronouns_2",
            title = "New material: Los pronombres- The Pronouns",
            previewText = "Post 2 preview",
            isAlreadyCaptured = false
        )

        assertThat(added1).isTrue()
        assertThat(added2).isTrue()
        assertThat(manifest.totalCount).isEqualTo(2)

        // Matching with preferPending = true should pick the first pending item
        val match1 = manifest.findMatchingItem(
            fingerprint = "fp_different_or_rescan",
            title = "Los pronombres- The Pronouns",
            cardText = "Los pronombres- The Pronouns Aug 7"
        )
        assertThat(match1?.index).isEqualTo(1)

        // Mark item 1 completed
        manifest.markItemCompleted(1)

        // Now matching should pick item 2 which is still pending
        val match2 = manifest.findMatchingItem(
            fingerprint = "fp_different_or_rescan",
            title = "Los pronombres- The Pronouns",
            cardText = "Los pronombres- The Pronouns Aug 7"
        )
        assertThat(match2?.index).isEqualTo(2)
        assertThat(match2?.status).isEqualTo(StreamItemStatus.PENDING)
    }
}
