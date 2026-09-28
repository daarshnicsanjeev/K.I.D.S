package com.kids.collector

import com.kids.collector.domain.classifier.ClassroomDateParser
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

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
}
