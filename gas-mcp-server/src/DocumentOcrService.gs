/**
 * DocumentOcrService.gs - Intelligent Two-Tier OCR & Document Search Engine
 * Automatically extracts, indexes, and enables full-text search across:
 * - Google Classroom worksheets & assignment attachments
 * - Gmail circulars & administrative notices
 * - WhatsApp school chat images, blackboard photos, and scanned documents
 *
 * Smart Pre-Flight Filter:
 * - Google Docs/Sheets/Slides & Text/CSV/JSON -> Native direct extraction (Zero OCR calls, 0ms)
 * - Native Digital PDFs -> Native stream text extraction (Zero OCR calls)
 * - Scanned Raster PDFs & Camera Images -> Google Drive Native OCR (copy?ocr=true)
 */

var DocumentOcrService = {
  INDEX_FILE_NAME: 'ocr_search_index.json',
  STATUS_FILE_NAME: 'ocr_job_status.json',

  /**
   * Fast Pre-Flight Check: Inspects PDF stream to detect if it has a native selectable text layer.
   * Scanned PDFs contain only /XObject /Image bitmaps and lack text operators.
   */
  hasNativeTextLayer: function(blob) {
    if (!blob) return { hasText: false, extractedText: '' };
    try {
      var rawString = blob.getDataAsString();
      if (!rawString || rawString.length < 50) return { hasText: false, extractedText: '' };

      var textPieces = [];
      
      // 1. Check for standard PDF text showing operators: (text) Tj, (text)', (text)"
      var tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
      var match;
      var totalChars = 0;
      while ((match = tjRegex.exec(rawString)) !== null && totalChars < 5000) {
        var str = match[1].replace(/\\([()\\])/g, '$1');
        textPieces.push(str);
        totalChars += str.length;
      }

      // 2. Check for kerning array text operators: [(text) -20 (more)] TJ
      var arrayTjRegex = /\[([^\]]+)\]\s*TJ/g;
      while ((match = arrayTjRegex.exec(rawString)) !== null && totalChars < 5000) {
        var inner = match[1];
        var innerParenRegex = /\(([^)]+)\)/g;
        var innerMatch;
        while ((innerMatch = innerParenRegex.exec(inner)) !== null) {
          var str2 = innerMatch[1].replace(/\\([()\\])/g, '$1');
          textPieces.push(str2);
          totalChars += str2.length;
        }
      }

      var extracted = textPieces.join(' ').replace(/\s+/g, ' ').trim();
      // Check if extracted text contains genuine legible words (not random binary noise from a compressed deflate stream)
      var words = extracted.match(/[a-zA-Z0-9\u0900-\u097F]{2,}/g) || [];
      var readableChars = words.join('').length;
      var ratio = readableChars / Math.max(1, extracted.length);

      // If we find 50+ legible characters AND at least 50% readable text ratio, it's a genuine native digital PDF!
      if (readableChars >= 50 && ratio >= 0.50) {
        return { hasText: true, extractedText: extracted };
      }
    } catch (e) {
      // Stream parsing error; fallback to safe scan check
    }
    return { hasText: false, extractedText: '' };
  },

  /**
   * Executes Drive Native OCR on raster images or scanned PDFs.
   * Zero cost, zero external API keys.
   */
  performDriveOcr: function(fileId, fileName) {
    if (!fileId) return null;
    var maxChars = 8000;
    var copyId = null;

    try {
      var token = ScriptApp.getOAuthToken();
      var resource = {
        title: 'temp_ocr_' + (fileName || fileId).replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30),
        mimeType: 'application/vnd.google-apps.document'
      };

      // Strategy 1: Drive API v2 Copy with ocr=true
      if (typeof Drive !== 'undefined' && Drive.Files && Drive.Files.copy) {
        var copy = Drive.Files.copy(resource, fileId, { ocr: true, ocrLanguage: 'en,hi', supportsAllDrives: true });
        if (copy && copy.id) copyId = copy.id;
      } else {
        var copyRes = UrlFetchApp.fetch('https://www.googleapis.com/drive/v2/files/' + fileId + '/copy?ocr=true&ocrLanguage=en,hi&supportsAllDrives=true', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify(resource),
          muteHttpExceptions: true
        });
        if (copyRes.getResponseCode() === 200) {
          var copyData = JSON.parse(copyRes.getContentText());
          if (copyData && copyData.id) copyId = copyData.id;
        }
      }

      if (copyId) {
        // Read plain text directly via DocumentApp or export
        var text = '';
        try {
          var doc = DocumentApp.openById(copyId);
          text = doc.getBody().getText();
        } catch (docErr) {
          // Fallback to plain text export endpoint
          try {
            var exportRes = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + copyId + '/export?mimeType=text/plain', {
              headers: { 'Authorization': 'Bearer ' + token },
              muteHttpExceptions: true
            });
            if (exportRes.getResponseCode() === 200) {
              text = exportRes.getContentText();
            }
          } catch (expErr) {}
        }

        if (text && text.trim()) {
          return text.trim().substring(0, maxChars);
        }
      }
    } catch (err) {
      McpLogger.log('WARN', 'OCR_CONVERT_FAIL', 'OCR conversion failed for ' + (fileName || fileId) + ': ' + err.toString());
    } finally {
      if (copyId) {
        try {
          if (typeof Drive !== 'undefined' && Drive.Files && Drive.Files.remove) {
            Drive.Files.remove(copyId);
          } else {
            DriveApp.getFileById(copyId).setTrashed(true);
          }
        } catch (delErr) {
          try { DriveApp.getFileById(copyId).setTrashed(true); } catch (e) {}
        }
      }
    }
    return null;
  },

  /**
   * Smart Text Extractor:
   * Extracts text from any document with optimal routing (skipping OCR for searchable files).
   */
  extractDocumentText: function(file) {
    if (!file) return { text: '', isOcr: false };

    var fileId = file.getId ? file.getId() : file.id;
    var fileName = (file.getName ? file.getName() : file.name || '').toLowerCase();
    var mime = (file.getMimeType ? file.getMimeType() : file.mimeType || '').toLowerCase();

    // 1. Google Workspace Native Docs / Sheets / Slides -> Zero OCR
    if (mime === 'application/vnd.google-apps.document') {
      try {
        var docText = DocumentApp.openById(fileId).getBody().getText();
        return { text: (docText || '').trim().substring(0, 8000), isOcr: false };
      } catch (e) {}
    }
    if (mime === 'application/vnd.google-apps.spreadsheet') {
      try {
        var ss = SpreadsheetApp.openById(fileId);
        var sheets = ss.getSheets();
        var rows = [];
        for (var s = 0; s < Math.min(sheets.length, 2); s++) {
          var data = sheets[s].getDataRange().getDisplayValues();
          for (var r = 0; r < Math.min(data.length, 25); r++) {
            rows.push(data[r].join(' | '));
          }
        }
        return { text: rows.join('\n').substring(0, 8000), isOcr: false };
      } catch (e) {}
    }

    // 2. Plain Text / CSV / JSON / HTML -> Zero OCR
    if (mime.indexOf('text/') === 0 || mime === 'application/json' || mime === 'application/csv' || /\.(txt|csv|json|html|md)$/i.test(fileName)) {
      try {
        var rawText = file.getBlob().getDataAsString();
        return { text: (rawText || '').trim().substring(0, 8000), isOcr: false };
      } catch (e) {}
    }

    // 3. PDF Documents -> Pre-flight text inspection
    if (mime === 'application/pdf' || fileName.endsWith('.pdf')) {
      try {
        var blob = file.getBlob();
        var pdfCheck = this.hasNativeTextLayer(blob);
        if (pdfCheck.hasText) {
          // Native text layer exists! Zero OCR needed!
          return { text: pdfCheck.extractedText.substring(0, 8000), isOcr: false };
        }
      } catch (e) {}
      // Scanned raster PDF without selectable text layer -> Run Drive OCR
      var ocrPdfText = this.performDriveOcr(fileId, fileName);
      return { text: ocrPdfText || '', isOcr: true };
    }

    // 4. Raster Images -> Run Drive OCR
    if (mime.indexOf('image/') === 0 || /\.(jpg|jpeg|png|webp|heic|bmp|tiff)$/i.test(fileName)) {
      var ocrImgText = this.performDriveOcr(fileId, fileName);
      return { text: ocrImgText || '', isOcr: true };
    }

    return { text: '', isOcr: false };
  },

  /**
   * Loads or creates the unified ocr_search_index.json for a child's vault folder.
   */
  getOrCreateIndexFile: function(kidFolder) {
    if (!kidFolder) return null;
    var fIt = kidFolder.getFilesByName(this.INDEX_FILE_NAME);
    if (fIt.hasNext()) {
      return fIt.next();
    }
    var initialPayload = JSON.stringify({
      version: '1.0.0',
      lastUpdatedAt: new Date().toISOString(),
      totalIndexed: 0,
      documents: []
    }, null, 2);
    return kidFolder.createFile(this.INDEX_FILE_NAME, initialPayload, 'application/json');
  },

  /**
   * Indexes a single document into ocr_search_index.json in real-time.
   */
  indexDocument: function(kidFolder, file, sourceContext) {
    if (!kidFolder || !file) return null;

    try {
      var fileId = file.getId ? file.getId() : file.id;
      var fileName = file.getName ? file.getName() : file.name;
      var fileUrl = file.getUrl ? file.getUrl() : ('https://drive.google.com/file/d/' + fileId + '/view');

      var indexFile = this.getOrCreateIndexFile(kidFolder);
      var indexData = { documents: [] };
      try {
        indexData = JSON.parse(indexFile.getContent());
      } catch (e) {}

      var docs = indexData.documents || [];
      var existingIdx = -1;
      for (var i = 0; i < docs.length; i++) {
        if (docs[i].fileId === fileId) {
          existingIdx = i;
          break;
        }
      }

      // If already indexed and has non-empty text, return cached entry
      if (existingIdx !== -1 && docs[existingIdx].text && docs[existingIdx].text.length > 0) {
        return docs[existingIdx];
      }

      // Extract text via Smart Pre-Flight routing
      var extraction = this.extractDocumentText(file);
      var text = extraction.text || '';
      var wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
      var snippet = text.length > 180 ? text.substring(0, 180) + '...' : text;

      var docRecord = {
        fileId: fileId,
        fileName: fileName,
        source: sourceContext || 'classroom',
        mimeType: file.getMimeType ? file.getMimeType() : 'application/octet-stream',
        isOcr: extraction.isOcr,
        wordCount: wordCount,
        snippet: snippet,
        text: text,
        driveUrl: fileUrl,
        indexedAt: new Date().toISOString()
      };

      if (existingIdx !== -1) {
        docs[existingIdx] = docRecord;
      } else {
        docs.push(docRecord);
      }

      indexData.lastUpdatedAt = new Date().toISOString();
      indexData.totalIndexed = docs.length;
      indexData.documents = docs;

      indexFile.setContent(JSON.stringify(indexData, null, 2));
      McpLogger.log('INFO', 'DOC_INDEXED', 'Indexed ' + fileName + ' (' + sourceContext + ', OCR=' + extraction.isOcr + ', words=' + wordCount + ')');
      return docRecord;
    } catch (err) {
      McpLogger.log('WARN', 'DOC_INDEX_ERROR', 'Failed to index document: ' + err.toString());
      return null;
    }
  },

  /**
   * Helper to index by file ID (used by WhatsApp media RPC).
   */
  indexDocumentById: function(fileId, childName, sourceContext) {
    if (!fileId) return { success: false, error: 'Missing fileId' };
    try {
      var file = DriveApp.getFileById(fileId);
      var parents = file.getParents();
      var kidFolder = parents.hasNext() ? parents.next() : null;

      // If parent is a subfolder (e.g. attachments/ or whatsapp/), climb up to kid folder
      if (kidFolder && (kidFolder.getName() === 'attachments' || kidFolder.getName() === 'whatsapp')) {
        var grandParents = kidFolder.getParents();
        if (grandParents.hasNext()) {
          var gp = grandParents.next();
          if (gp.getName() === 'whatsapp') {
            var ggp = gp.getParents();
            if (ggp.hasNext()) kidFolder = ggp.next();
          } else {
            kidFolder = gp;
          }
        }
      }

      if (!kidFolder) {
        return { success: false, error: 'Could not resolve parent vault folder' };
      }

      var record = this.indexDocument(kidFolder, file, sourceContext || 'whatsapp');
      return { success: true, record: record };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  /**
   * Automated 1-Time Clean Vault Indexer:
   * Scans all attachments across classroom, emails, and whatsapp.
   * Processes unindexed files in safe chunks without timeouts.
   */
  runAutomatedVaultIndexing: function(kidFolder, maxBatch) {
    if (!kidFolder) return { count: 0, status: 'no_folder' };
    maxBatch = maxBatch || 12;

    var indexFile = this.getOrCreateIndexFile(kidFolder);
    var indexData = { documents: [] };
    try {
      indexData = JSON.parse(indexFile.getContent());
    } catch (e) {}

    var indexedMap = {};
    (indexData.documents || []).forEach(function(d) {
      if (d && d.fileId) indexedMap[d.fileId] = true;
    });

    var pendingFiles = [];

    // 1. Discover unindexed files
    try {
      // Classroom attachments
      var cIt = kidFolder.getFoldersByName('classroom');
      if (cIt.hasNext()) {
        var caIt = cIt.next().getFoldersByName('attachments');
        if (caIt.hasNext()) {
          var cfIt = caIt.next().getFiles();
          while (cfIt.hasNext()) {
            var cf = cfIt.next();
            if (!indexedMap[cf.getId()]) pendingFiles.push({ file: cf, source: 'classroom' });
          }
        }
      }

      // Email attachments
      var eIt = kidFolder.getFoldersByName('emails');
      if (eIt.hasNext()) {
        var eaIt = eIt.next().getFoldersByName('attachments');
        if (eaIt.hasNext()) {
          var efIt = eaIt.next().getFiles();
          while (efIt.hasNext()) {
            var ef = efIt.next();
            if (!indexedMap[ef.getId()]) pendingFiles.push({ file: ef, source: 'email' });
          }
        }
      }

      // WhatsApp media
      var wIt = kidFolder.getFoldersByName('whatsapp');
      if (wIt.hasNext()) {
        var wfIt = wIt.next().getFiles();
        while (wfIt.hasNext()) {
          var wf = wfIt.next();
          var wName = wf.getName().toLowerCase();
          if (wName !== 'whatsapp_school_archive.json' && !indexedMap[wf.getId()]) {
            pendingFiles.push({ file: wf, source: 'whatsapp' });
          }
        }
      }
    } catch (scanErr) {
      McpLogger.log('WARN', 'INDEX_SCAN_WARN', scanErr.toString());
    }

    var processed = 0;
    for (var p = 0; p < pendingFiles.length && p < maxBatch; p++) {
      var item = pendingFiles[p];
      this.indexDocument(kidFolder, item.file, item.source);
      processed++;
    }

    return {
      success: true,
      processed: processed,
      totalPendingRemaining: Math.max(0, pendingFiles.length - processed),
      totalIndexed: (indexData.documents || []).length + processed
    };
  },

  /**
   * Search Vault Documents Tool (Exposed to Gemini Spark & Parent Dashboard).
   */
  searchVaultDocuments: function(kidFolder, query) {
    if (!kidFolder || !query) return { results: [], count: 0 };
    var cleanQuery = query.toLowerCase().trim();
    var terms = cleanQuery.split(/\s+/).filter(Boolean);

    var indexFile = this.getOrCreateIndexFile(kidFolder);
    var indexData = { documents: [] };
    try {
      indexData = JSON.parse(indexFile.getContent());
    } catch (e) {
      return { results: [], count: 0 };
    }

    var docs = indexData.documents || [];
    var scoredResults = [];

    for (var i = 0; i < docs.length; i++) {
      var d = docs[i];
      if (!d) continue;

      var textLower = (d.text || '').toLowerCase();
      var nameLower = (d.fileName || '').toLowerCase();
      var sourceLower = (d.source || '').toLowerCase();

      var matchScore = 0;
      var matchedTerms = [];

      for (var t = 0; t < terms.length; t++) {
        var term = terms[t];
        if (nameLower.indexOf(term) !== -1) {
          matchScore += 10;
          matchedTerms.push(term);
        }
        if (textLower.indexOf(term) !== -1) {
          matchScore += 5;
          matchedTerms.push(term);
        }
        if (sourceLower.indexOf(term) !== -1) {
          matchScore += 2;
          matchedTerms.push(term);
        }
      }

      if (matchScore > 0) {
        // Extract relevant excerpt around matching term
        var excerpt = d.snippet || '';
        if (d.text && terms.length > 0) {
          var firstIdx = textLower.indexOf(terms[0]);
          if (firstIdx !== -1) {
            var start = Math.max(0, firstIdx - 60);
            var end = Math.min(d.text.length, firstIdx + 140);
            excerpt = (start > 0 ? '...' : '') + d.text.substring(start, end).replace(/\s+/g, ' ') + (end < d.text.length ? '...' : '');
          }
        }

        scoredResults.push({
          fileId: d.fileId,
          fileName: d.fileName,
          source: d.source,
          isOcr: d.isOcr,
          wordCount: d.wordCount,
          excerpt: excerpt,
          driveUrl: d.driveUrl,
          score: matchScore,
          matchedTerms: matchedTerms
        });
      }
    }

    scoredResults.sort(function(a, b) { return b.score - a.score; });

    return {
      query: query,
      count: scoredResults.length,
      results: scoredResults.slice(0, 15)
    };
  }
};
