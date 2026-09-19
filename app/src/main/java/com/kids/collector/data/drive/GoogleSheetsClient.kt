package com.kids.collector.data.drive

import com.google.api.services.sheets.v4.Sheets
import com.google.api.services.sheets.v4.model.ValueRange
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Google Sheets API Client
 *
 * Appends captured school notices directly into the parent's spreadsheet.
 * Columns: Timestamp, Source, Category, Title, Notice Text / OCR, Attachment Link
 */
class GoogleSheetsClient(
    private val sheetsService: Sheets
) {

    suspend fun appendNoticeRow(
        spreadsheetId: String,
        range: String = "Sheet1!A:F",
        rowValues: List<Any>
    ): Unit = withContext(Dispatchers.IO) {
        val body = ValueRange().setValues(listOf(rowValues))
        sheetsService.spreadsheets().values()
            .append(spreadsheetId, range, body)
            .setValueInputOption("USER_ENTERED")
            .execute()
    }
}
