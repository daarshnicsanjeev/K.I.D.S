package com.kids.collector

import com.google.common.truth.Truth.assertThat
import com.kids.collector.service.GoogleDriveSearchHarvester
import com.kids.collector.service.GoogleDriveSharedHarvester
import org.junit.jupiter.api.Test

class GoogleDriveSearchHarvesterTest {

    @Test
    fun `buildSearchQueries generates exact filename base name and normalized variant`() {
        val fileName = "Division by 10 and 100-Ans.jpg"
        val queries = GoogleDriveSearchHarvester.buildSearchQueries(fileName)

        assertThat(queries).containsExactly(
            "Division by 10 and 100-Ans.jpg",
            "Division by 10 and 100-Ans",
            "Division by 10 and 100 Ans"
        ).inOrder()
    }

    @Test
    fun `buildSearchQueries handles filenames with underscores and complex separators`() {
        val fileName = "Grade_3-Math_Practice_Sheet-Part_1.pdf"
        val queries = GoogleDriveSearchHarvester.buildSearchQueries(fileName)

        assertThat(queries).contains("Grade_3-Math_Practice_Sheet-Part_1.pdf")
        assertThat(queries).contains("Grade_3-Math_Practice_Sheet-Part_1")
        assertThat(queries).contains("Grade 3 Math Practice Sheet Part 1")
    }

    @Test
    fun `buildSearchQueries returns single query when filename has no extension and no separators`() {
        val fileName = "Announcement"
        val queries = GoogleDriveSearchHarvester.buildSearchQueries(fileName)

        assertThat(queries).containsExactly("Announcement")
    }

    @Test
    fun `buildSearchQueries strips surrounding whitespace and eliminates duplicate queries`() {
        val fileName = "   SimpleNotes.pdf   "
        val queries = GoogleDriveSearchHarvester.buildSearchQueries(fileName)

        assertThat(queries).contains("SimpleNotes.pdf")
        assertThat(queries).contains("SimpleNotes")
        assertThat(queries.size).isEqualTo(2)
    }

    @Test
    fun `matchesDriveItem recognizes search results matching missing target attachment`() {
        val targetAttachment = "Division by 10 and 100-Ans.jpg"
        val driveSearchResultTitle = "Division by 10 and 100-Ans.jpg"

        val matches = GoogleDriveSharedHarvester.matchesDriveItem(driveSearchResultTitle, targetAttachment)
        assertThat(matches).isTrue()
    }

    @Test
    fun `matchesDriveItem recognizes search results when drive title omits image extension`() {
        val targetAttachment = "Division by 10 and 100-Ans.jpg"
        val driveSearchResultTitle = "Division by 10 and 100-Ans"

        val matches = GoogleDriveSharedHarvester.matchesDriveItem(driveSearchResultTitle, targetAttachment)
        assertThat(matches).isTrue()
    }

    @Test
    fun `matchesDriveItem rejects unrelated search results`() {
        val targetAttachment = "Division by 10 and 100-Ans.jpg"
        val driveSearchResultTitle = "Multiplication Word Problems.pdf"

        val matches = GoogleDriveSharedHarvester.matchesDriveItem(driveSearchResultTitle, targetAttachment)
        assertThat(matches).isFalse()
    }
}
