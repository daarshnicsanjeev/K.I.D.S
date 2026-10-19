package com.kids.collector

import com.google.common.truth.Truth.assertThat
import com.kids.collector.data.db.AttachmentEntity
import com.kids.collector.service.GoogleDriveSharedHarvester
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Test

class DriveAttachmentMatcherTest {

    private fun createAttachment(
        id: String,
        noticeId: String,
        fileName: String
    ): AttachmentEntity {
        return AttachmentEntity(
            attachmentId = id,
            noticeId = noticeId,
            fileName = fileName,
            localUri = "",
            mimeType = "application/pdf",
            sizeBytes = 1024L,
            fileHash = "hash_$id",
            ocrText = null,
            pageCount = 1,
            driveFileId = null,
            syncStatus = "PENDING"
        )
    }

    @Test
    fun `matches exact drive title and attachment filename`() {
        val matches = GoogleDriveSharedHarvester.matchesDriveItem(
            driveTitle = "Place Value Level 1.pdf",
            attachmentFileName = "Place Value Level 1.pdf"
        )
        assertThat(matches).isTrue()
    }

    @Test
    fun `matches drive item when drive title lacks file extension`() {
        val matches = GoogleDriveSharedHarvester.matchesDriveItem(
            driveTitle = "Listening audio 1",
            attachmentFileName = "Listening audio 1.mp3"
        )
        assertThat(matches).isTrue()
    }

    @Test
    fun `matches drive item when db attachment lacks file extension`() {
        val matches = GoogleDriveSharedHarvester.matchesDriveItem(
            driveTitle = "Combined Notes.pdf",
            attachmentFileName = "Combined Notes"
        )
        assertThat(matches).isTrue()
    }

    @Test
    fun `matches drive item when db attachment was truncated with ellipsis`() {
        val matches = GoogleDriveSharedHarvester.matchesDriveItem(
            driveTitle = "Read & write larger numbers,Know place value and Count on and back Notebook - Answer Key.pdf",
            attachmentFileName = "Read & write larger numbers,Know place value...pdf"
        )
        assertThat(matches).isTrue()
    }

    @Test
    fun `matches drive item when drive title has prefix of long db attachment`() {
        val matches = GoogleDriveSharedHarvester.matchesDriveItem(
            driveTitle = "Ordering Positive and Negative Numbers Differentiated Worksheet Answers.pdf",
            attachmentFileName = "Ordering Positive and Negative Numbers Differentiated Worksheet.pdf"
        )
        assertThat(matches).isTrue()
    }

    @Test
    fun `rejects incompatible file extensions`() {
        val matches = GoogleDriveSharedHarvester.matchesDriveItem(
            driveTitle = "Notes.pdf",
            attachmentFileName = "Notes.mp3"
        )
        assertThat(matches).isFalse()
    }

    @Test
    fun `rejects completely unrelated filenames`() {
        val matches = GoogleDriveSharedHarvester.matchesDriveItem(
            driveTitle = "Science Homework.pdf",
            attachmentFileName = "Mathematics Practice Sheet.pdf"
        )
        assertThat(matches).isFalse()
    }

    @Test
    fun `prefers exact match over loose substring match`() = runBlocking {
        val attGeneric = createAttachment("att_generic", "notice_generic", "Answer Key.pdf")
        val attSpecific = createAttachment("att_specific", "notice_specific", "answer key listening skill.pdf")

        val best = GoogleDriveSharedHarvester.findBestCandidate(
            driveTitle = "answer key listening skill.pdf",
            driveSubtitle = "Shared 24 Sep by Teacher",
            pendingAttachments = listOf(attGeneric, attSpecific)
        )

        assertThat(best).isNotNull()
        assertThat(best?.attachmentId).isEqualTo("att_specific")
    }

    @Test
    fun `disambiguates identical filenames by date`() = runBlocking {
        val attJuly = createAttachment("att_july", "notice_july", "PRACTICE SHEET - ANSWER KEY.pdf")
        val attAugust = createAttachment("att_august", "notice_august", "PRACTICE SHEET - ANSWER KEY.pdf")

        val noticeLookup: suspend (String) -> Pair<String, String>? = { noticeId ->
            when (noticeId) {
                "notice_july" -> Pair("Practice sheet - Place Value and Rounding Larger Numbers\nJul 31", "Body text")
                "notice_august" -> Pair("Negative numbers additional practice sheets\nAug 20", "Body text")
                else -> null
            }
        }

        // Test drive item from August 20
        val bestAugust = GoogleDriveSharedHarvester.findBestCandidate(
            driveTitle = "PRACTICE SHEET - ANSWER KEY.pdf",
            driveSubtitle = "Shared 20 Aug 2026 by Teacher",
            pendingAttachments = listOf(attJuly, attAugust),
            noticeLookup = noticeLookup
        )
        assertThat(bestAugust?.attachmentId).isEqualTo("att_august")

        // Test drive item from July 31
        val bestJuly = GoogleDriveSharedHarvester.findBestCandidate(
            driveTitle = "PRACTICE SHEET - ANSWER KEY.pdf",
            driveSubtitle = "Shared 31 Jul 2026 by Teacher",
            pendingAttachments = listOf(attJuly, attAugust),
            noticeLookup = noticeLookup
        )
        assertThat(bestJuly?.attachmentId).isEqualTo("att_july")
    }

    @Test
    fun `correctly matches real dumps sample files`() = runBlocking {
        val attachments = listOf(
            createAttachment("1", "n1", "Spanish Pronoun.pdf"),
            createAttachment("2", "n2", "Voice_Modulation_Magic.pptx"),
            createAttachment("3", "n3", "La hora.pdf"),
            createAttachment("4", "n4", "Reference 1.png"),
            createAttachment("5", "n5", "Reading Grade 3 (1) (1).mp3")
        )

        val candidate1 = GoogleDriveSharedHarvester.findBestCandidate(
            driveTitle = "Write the correct Spanish pronoun.pdf",
            driveSubtitle = "Shared Sep 15",
            pendingAttachments = attachments
        )
        assertThat(candidate1?.attachmentId).isEqualTo("1")

        val candidate2 = GoogleDriveSharedHarvester.findBestCandidate(
            driveTitle = "Voice_Modulation_Magic.pptx",
            driveSubtitle = "Shared Sep 12",
            pendingAttachments = attachments
        )
        assertThat(candidate2?.attachmentId).isEqualTo("2")

        val candidate3 = GoogleDriveSharedHarvester.findBestCandidate(
            driveTitle = "La hora.pdf",
            driveSubtitle = "Shared Sep 10",
            pendingAttachments = attachments
        )
        assertThat(candidate3?.attachmentId).isEqualTo("3")

        val candidate4 = GoogleDriveSharedHarvester.findBestCandidate(
            driveTitle = "Reference 1.png",
            driveSubtitle = "Shared Sep 8",
            pendingAttachments = attachments
        )
        assertThat(candidate4?.attachmentId).isEqualTo("4")

        val candidate5 = GoogleDriveSharedHarvester.findBestCandidate(
            driveTitle = "Reading Grade 3 (1) (1).mp3",
            driveSubtitle = "Shared Sep 5",
            pendingAttachments = attachments
        )
        assertThat(candidate5?.attachmentId).isEqualTo("5")
    }

    @Test
    fun `classifies folder with extension-like name as folder when it has folder badge`() {
        val isFolderDot = GoogleDriveSharedHarvester.isDriveFolder(
            title = "Unit 1.2",
            descriptions = listOf("Unit 1.2", "Shared folder", "Shared by teacher")
        )
        assertThat(isFolderDot).isTrue()

        val isFolderDoc = GoogleDriveSharedHarvester.isDriveFolder(
            title = "Grade 3 Math.doc",
            descriptions = listOf("Grade 3 Math.doc", "Folder", "Modified Jun 18")
        )
        assertThat(isFolderDoc).isTrue()

        val isFolderDate = GoogleDriveSharedHarvester.isDriveFolder(
            title = "21/09/26_Formatting text in Ms Word",
            descriptions = listOf("21/09/26_Formatting text in Ms Word", "Shared folder", "Shared by sonal")
        )
        assertThat(isFolderDate).isTrue()
    }

    @Test
    fun `classifies file without extension as file when it has file badge`() {
        val isFolderAudio = GoogleDriveSharedHarvester.isDriveFolder(
            title = "Listening audio 1",
            descriptions = listOf("Listening audio 1", "Audio", "Shared by Chaitali")
        )
        assertThat(isFolderAudio).isFalse()

        val isFolderDoc = GoogleDriveSharedHarvester.isDriveFolder(
            title = "Chapter 3 Summary",
            descriptions = listOf("Chapter 3 Summary", "Google Docs", "Shared by teacher")
        )
        assertThat(isFolderDoc).isFalse()

        val isFolderPdf = GoogleDriveSharedHarvester.isDriveFolder(
            title = "Lesson 4 Notes",
            descriptions = listOf("Lesson 4 Notes", "PDF", "Shared by teacher")
        )
        assertThat(isFolderPdf).isFalse()
    }

    @Test
    fun `classifies Classroom root folder as folder`() {
        val isFolder = GoogleDriveSharedHarvester.isDriveFolder(
            title = "Classroom",
            descriptions = listOf("Classroom", "Folder", "Modified Jun 18, 2025")
        )
        assertThat(isFolder).isTrue()
    }

    @Test
    fun `classifies standard file with extension and badge as file`() {
        val isFolder = GoogleDriveSharedHarvester.isDriveFolder(
            title = "G.P Answer Key Worksheet 1.pdf",
            descriptions = listOf("G.P Answer Key Worksheet 1.pdf", "PDF", "Shared by teacher")
        )
        assertThat(isFolder).isFalse()
    }

    @Test
    fun `matches filenames containing dots that are not extensions`() {
        val matchesL1 = GoogleDriveSharedHarvester.matchesDriveItem(
            driveTitle = "L1. Operating System",
            attachmentFileName = "L1. Operating System.pdf"
        )
        assertThat(matchesL1).isTrue()

        val matchesUnit = GoogleDriveSharedHarvester.matchesDriveItem(
            driveTitle = "Unit 1.2 Fractions",
            attachmentFileName = "Unit 1.2 Fractions.pdf"
        )
        assertThat(matchesUnit).isTrue()
    }

    @Test
    fun `matches filenames with spaces before extensions and double dots`() {
        val matchesSpace = GoogleDriveSharedHarvester.matchesDriveItem(
            driveTitle = "July - Place Value and Rounding Larger Numbers.pdf",
            attachmentFileName = "July - Place Value and Rounding Larger Numbers .pdf"
        )
        assertThat(matchesSpace).isTrue()

        val matchesDoubleDot = GoogleDriveSharedHarvester.matchesDriveItem(
            driveTitle = "Addition Level 1",
            attachmentFileName = "Addition Level 1..pdf"
        )
        assertThat(matchesDoubleDot).isTrue()
    }

    @Test
    fun `matches converted office documents with double extensions`() {
        val matchesDocxPdf = GoogleDriveSharedHarvester.matchesDriveItem(
            driveTitle = "GRADE 3 JUNE MONTH END 2026 – 2027.docx",
            attachmentFileName = "GRADE 3 JUNE MONTH END 2026 – 2027.docx.pdf"
        )
        assertThat(matchesDocxPdf).isTrue()

        val matchesDocToPdf = GoogleDriveSharedHarvester.matchesDriveItem(
            driveTitle = "Dance- Daily Life Moves.docx",
            attachmentFileName = "Dance- Daily Life Moves.pdf"
        )
        assertThat(matchesDocToPdf).isTrue()
    }

    @Test
    fun `matches filenames with unicode Hindi characters`() {
        val matchesHindi = GoogleDriveSharedHarvester.matchesDriveItem(
            driveTitle = "Grade 3 गुड़िया बोली (Textbook PDF)",
            attachmentFileName = "Grade 3 गुड़िया बोली (Textbook PDF).pdf"
        )
        assertThat(matchesHindi).isTrue()
    }

    @Test
    fun `identifies curriculum question papers and exam revision files accurately`() {
        assertThat(GoogleDriveSharedHarvester.isCurriculumResourceFile("Grade4_Maths_HalfYearly_QP.pdf")).isTrue()
        assertThat(GoogleDriveSharedHarvester.isCurriculumResourceFile("Science_Question_Paper_Term1.pdf")).isTrue()
        assertThat(GoogleDriveSharedHarvester.isCurriculumResourceFile("English_Literature_Practice.pdf")).isTrue()
        assertThat(GoogleDriveSharedHarvester.isCurriculumResourceFile("Hindi_Sample_Paper.docx")).isTrue()
        assertThat(GoogleDriveSharedHarvester.isCurriculumResourceFile("Mathematics_Model_Paper_Set_1.pdf")).isTrue()
        assertThat(GoogleDriveSharedHarvester.isCurriculumResourceFile("Class4_EVS_Revision_Worksheet.pdf")).isTrue()
        assertThat(GoogleDriveSharedHarvester.isCurriculumResourceFile("Computer_Midterm_Test.pptx")).isTrue()
    }

    @Test
    fun `rejects individual classmate homework submissions as curriculum resources`() {
        assertThat(GoogleDriveSharedHarvester.isCurriculumResourceFile("Kiyansh_Vora.docx")).isFalse()
        assertThat(GoogleDriveSharedHarvester.isCurriculumResourceFile("Kiara.docx")).isFalse()
        assertThat(GoogleDriveSharedHarvester.isCurriculumResourceFile("Param.docx")).isFalse()
        assertThat(GoogleDriveSharedHarvester.isCurriculumResourceFile("Rohan_Homework.pdf")).isFalse()
        assertThat(GoogleDriveSharedHarvester.isCurriculumResourceFile("Aarav_Submission.docx")).isFalse()
    }
}

