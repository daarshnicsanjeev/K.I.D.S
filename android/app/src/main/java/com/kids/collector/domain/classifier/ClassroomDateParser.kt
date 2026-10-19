package com.kids.collector.domain.classifier

import java.util.Calendar
import java.util.Locale

/**
 * Deterministic date parser for Google Classroom announcements and Google Drive shared item timestamps.
 * Enables exact post-to-file attribution across identical filenames (e.g. "Worksheet.pdf").
 */
object ClassroomDateParser {

    val MONTH_NAMES = listOf(
        "jan", "feb", "mar", "apr", "may", "jun",
        "jul", "aug", "sep", "oct", "nov", "dec"
    )

    // Matches Day first: "12th June", "12 Jun", "12-Jun-2026", "12 June 2026"
    private val DAY_FIRST_REGEX = Regex(
        """\b(\d{1,2})(?:st|nd|rd|th)?[\s\-\/]+([A-Za-z]{3,9})(?:[\s\-\/,]+(\d{4}))?(?:,?\s*(\d{1,2}):(\d{2})\s*(AM|PM)?)?\b""",
        RegexOption.IGNORE_CASE
    )

    // Matches Month first: "Jun 12", "June 12", "Posted Jun 10", "Shared Aug 15"
    private val MONTH_FIRST_REGEX = Regex(
        """\b([A-Za-z]{3,9})[\s\-\/]+(\d{1,2})(?:st|nd|rd|th)?(?!\d)(?:[\s\-\/,]+(\d{4}))?(?:,?\s*(\d{1,2}):(\d{2})\s*(AM|PM)?)?\b""",
        RegexOption.IGNORE_CASE
    )

    data class ParsedDate(
        val month: Int, // 1-12
        val day: Int,
        val year: Int,
        val timestampMs: Long
    ) {
        val monthShortName: String
            get() = MONTH_NAMES.getOrNull(month - 1)?.replaceFirstChar { it.uppercase(Locale.US) } ?: ""

        val canonicalDate: String
            get() = "$monthShortName $day"

        fun matchesMonthAndDay(otherMonth: Int, otherDay: Int): Boolean {
            return this.month == otherMonth && this.day == otherDay
        }
    }

    /**
     * Parses a human-readable date string from Classroom post cards or Google Drive item subtitles.
     * Examples: "Jun 12", "12th June 2026", "Posted Jun 10 (Edited Jun 11)", "Shared Aug 15 by Teacher", "Aug 15, 10:30 AM".
     */
    fun parse(rawText: String?, fallbackYear: Int = Calendar.getInstance().get(Calendar.YEAR)): ParsedDate? {
        if (rawText.isNullOrBlank()) return null

        // 1. Try Day First: e.g. "12th June 2026", "12 Jun", "12-Jun-2026"
        val dayFirstMatches = DAY_FIRST_REGEX.findAll(rawText)
        for (match in dayFirstMatches) {
            val day = match.groupValues[1].toIntOrNull()
            val monthStr = match.groupValues[2].take(3).lowercase(Locale.US)
            val monthIndex = MONTH_NAMES.indexOf(monthStr)
            if (day != null && day in 1..31 && monthIndex != -1) {
                val year = match.groupValues[3].toIntOrNull() ?: fallbackYear
                val hour = match.groupValues[4].toIntOrNull() ?: 12
                val minute = match.groupValues[5].toIntOrNull() ?: 0
                val isPm = match.groupValues[6].equals("pm", ignoreCase = true)
                return buildParsedDate(year, monthIndex, day, hour, minute, isPm)
            }
        }

        // 2. Try Month First: e.g. "Jun 12", "June 10, 2026"
        val monthFirstMatches = MONTH_FIRST_REGEX.findAll(rawText)
        for (match in monthFirstMatches) {
            val monthStr = match.groupValues[1].take(3).lowercase(Locale.US)
            val monthIndex = MONTH_NAMES.indexOf(monthStr)
            if (monthIndex != -1) {
                val day = match.groupValues[2].toIntOrNull()
                if (day != null && day in 1..31) {
                    val year = match.groupValues[3].toIntOrNull() ?: fallbackYear
                    val hour = match.groupValues[4].toIntOrNull() ?: 12
                    val minute = match.groupValues[5].toIntOrNull() ?: 0
                    val isPm = match.groupValues[6].equals("pm", ignoreCase = true)
                    return buildParsedDate(year, monthIndex, day, hour, minute, isPm)
                }
            }
        }

        return null
    }

    private fun buildParsedDate(year: Int, monthIndex: Int, day: Int, hour: Int, minute: Int, isPm: Boolean): ParsedDate {
        val calendar = Calendar.getInstance().apply {
            set(Calendar.YEAR, year)
            set(Calendar.MONTH, monthIndex)
            set(Calendar.DAY_OF_MONTH, day)
            val adjustedHour = if (isPm && hour < 12) hour + 12 else if (!isPm && hour == 12) 0 else hour
            set(Calendar.HOUR_OF_DAY, adjustedHour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        return ParsedDate(
            month = monthIndex + 1,
            day = day,
            year = year,
            timestampMs = calendar.timeInMillis
        )
    }
}
