/**
 * Developer Central Webhook - Ingests sanitized diagnostic reports into Google Sheets.
 */
function doPost(e) {
  try {
    var raw = e.postData.contents;
    var payload = JSON.parse(raw);

    var sheet = getOrCreateLogSheet();
    var fingerprint = payload.fingerprint || 'unknown';
    var errorDetails = payload.error_details || {};
    var timestamp = payload.timestamp || new Date().toISOString();

    var data = sheet.getDataRange().getValues();
    var foundRowIndex = -1;

    // Search for existing fingerprint (Col B / index 1)
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === fingerprint) {
        foundRowIndex = i + 1; // 1-based index
        break;
      }
    }

    if (foundRowIndex > 0) {
      // Increment occurrence count (Col I / index 8) and update last seen (Col J / index 9)
      var currentCount = Number(sheet.getRange(foundRowIndex, 9).getValue()) || 1;
      sheet.getRange(foundRowIndex, 9).setValue(currentCount + 1);
      sheet.getRange(foundRowIndex, 10).setValue(timestamp);
    } else {
      // Append new incident row
      sheet.appendRow([
        timestamp,
        fingerprint,
        errorDetails.domain || 'N/A',
        errorDetails.feature || 'N/A',
        errorDetails.error_name || 'Error',
        errorDetails.error_message || '',
        errorDetails.stack_trace || '',
        JSON.stringify(errorDetails.context || {}),
        1,
        timestamp
      ]);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, fingerprint: fingerprint }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: "Developer Error Webhook Active" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateLogSheet() {
  var props = PropertiesService.getUserProperties();
  var sheetId = props.getProperty('LOG_SHEET_ID');
  var ss;

  if (sheetId) {
    try {
      ss = SpreadsheetApp.openById(sheetId);
    } catch (e) {
      ss = null;
    }
  }

  if (!ss) {
    ss = SpreadsheetApp.create('School MCP Developer Error Registry');
    props.setProperty('LOG_SHEET_ID', ss.getId());
    var sheet = ss.getActiveSheet();
    sheet.setName('Sanitizer Incident Logs');
    sheet.appendRow([
      'First Timestamp',
      'Fingerprint',
      'Domain',
      'Feature',
      'Error Name',
      'Error Message',
      'Stack Trace',
      'Context Data',
      'Occurrence Count',
      'Last Seen'
    ]);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    return sheet;
  }

  return ss.getActiveSheet();
}
