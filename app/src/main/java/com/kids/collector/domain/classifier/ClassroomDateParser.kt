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

    private val DATE_REGEX = Regex(
        """(?:Posted|Edited|Due|Shared)?\s*([A-Za-z]{3,9})\s+(\d{1,2})(?:,?\s*(\d{4}))?(?:,?\s*(\d{1,2}):(\d{2})\s*(AM|PM)?)?""",
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
     * Examples: "Jun 12", "Posted Jun 10 (Edited Jun 11)", "Shared Aug 15 by Teacher", "Aug 15, 10:30 AM".
     */
    fun parse(rawText: String?, fallbackYear: Int = Calendar.getInstance().get(Calendar.YEAR)): ParsedDate? {
        if (rawText.isNullOrBlank()) return null
        val match = DATE_REGEX.find(rawText) ?: return null

        val monthStr = match.groupValues[1].take(3).lowercase(Locale.US)
        val monthIndex = MONTH_NAMES.indexOf(monthStr)
        if (monthIndex == -1) return null
        val month = monthIndex + 1

        val day = match.groupValues[2].toIntOrNull() ?: return null
        if (day !in 1..31) return null

        val year = match.groupValues[3].toIntOrNull() ?: fallbackYear
        val hour = match.groupValues[4].toIntOrNull() ?: 12
        val minute = match.groupValues[5].toIntOrNull() ?: 0
        val isPm = match.groupValues[6].equals("pm", ignoreCase = true)

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
            month = month,
            day = day,
            year = year,
            timestampMs = calendar.timeInMillis
        )
    }
}
