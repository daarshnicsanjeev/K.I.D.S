package com.kids.collector

import com.kids.collector.domain.classifier.ClassroomDateParser
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ClassroomDateParserTest {

    @Test
    fun testParseClassroomPostDates() {
        val date1 = ClassroomDateParser.parse("New material: L1. Operating System Jun 12", 2026)
        assertNotNull(date1)
        assertEquals(6, date1!!.month)
        assertEquals(12, date1.day)
        assertEquals(2026, date1.year)
        assertEquals("Jun", date1.monthShortName)

        val date2 = ClassroomDateParser.parse("Posted Jun 10 (Edited Jun 11)", 2026)
        assertNotNull(date2)
        assertEquals(6, date2!!.month)
        assertEquals(10, date2.day)

        val date3 = ClassroomDateParser.parse("Aug 15, 10:30 AM", 2026)
        assertNotNull(date3)
        assertEquals(8, date3!!.month)
        assertEquals(15, date3.day)

        val date4 = ClassroomDateParser.parse("Due Sep 2", 2026)
        assertNotNull(date4)
        assertEquals(9, date4!!.month)
        assertEquals(2, date4.day)

        val date5 = ClassroomDateParser.parse("Important Reminder\n* Prefect Selections will be held on 12th June 2026.", 2026)
        assertNotNull(date5)
        assertEquals(6, date5!!.month)
        assertEquals(12, date5.day)
        assertEquals(2026, date5.year)

        val date6 = ClassroomDateParser.parse("Posted 15-Aug-2026", 2026)
        assertNotNull(date6)
        assertEquals(8, date6!!.month)
        assertEquals(15, date6.day)
    }

    @Test
    fun testParseGoogleDriveSharedDates() {
        val driveDate1 = ClassroomDateParser.parse("Shared Jun 12 by Preeti Sharma", 2026)
        assertNotNull(driveDate1)
        assertEquals(6, driveDate1!!.month)
        assertEquals(12, driveDate1.day)

        val classroomDate = ClassroomDateParser.parse("New material: L1. Operating System Jun 12", 2026)
        assertNotNull(classroomDate)

        assertTrue(driveDate1.matchesMonthAndDay(classroomDate!!.month, classroomDate.day))
    }

    @Test
    fun testCanonicalDateAndComparison() {
        val earliestNoticeDate = ClassroomDateParser.parse("Posted Jun 10", 2026)
        assertNotNull(earliestNoticeDate)
        assertEquals("Jun 10", earliestNoticeDate!!.canonicalDate)

        // 3 days prior cutoff
        val cutoffTimestamp = earliestNoticeDate.timestampMs - (3L * 24 * 60 * 60 * 1000L)

        val oldItemDate = ClassroomDateParser.parse("Shared May 25 by Teacher", 2026)
        assertNotNull(oldItemDate)
        assertTrue(oldItemDate!!.timestampMs < cutoffTimestamp, "May 25 should be older than June 7 cutoff")

        val recentItemDate = ClassroomDateParser.parse("Shared Jun 12 by Teacher", 2026)
        assertNotNull(recentItemDate)
        assertTrue(recentItemDate!!.timestampMs >= cutoffTimestamp, "Jun 12 should be newer than June 7 cutoff")
    }
}
