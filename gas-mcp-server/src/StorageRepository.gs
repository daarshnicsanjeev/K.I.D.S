var StorageRepository = {
  getRegisteredTools: function () {
    var props = PropertiesService.getUserProperties();
    var raw = props.getProperty('REGISTERED_PORTAL_TOOLS');
    return raw ? JSON.parse(raw) : [];
  },

  saveTool: function (domain, feature, endpointSpec, authSpec, domSnapshot) {
    var tools = this.getRegisteredTools();
    var toolName = ('portal_' + domain + '_' + feature).toLowerCase().replace(/[^a-z0-9_]/g, '_');

    // Replace feature if already registered to avoid duplicates
    tools = tools.filter(function (t) {
      return !(t.domain.toLowerCase() === domain.toLowerCase() && t.feature.toLowerCase() === feature.toLowerCase());
    });

    tools.push({
      name: toolName,
      domain: domain,
      feature: feature,
      endpoint_spec: endpointSpec,
      auth_spec: authSpec,
      dom_snapshot: domSnapshot || '',
      registeredAt: new Date().toISOString()
    });

    var props = PropertiesService.getUserProperties();
    props.setProperty('REGISTERED_PORTAL_TOOLS', JSON.stringify(tools));
    return toolName;
  },

  deleteTool: function (domain, feature) {
    var tools = this.getRegisteredTools();
    tools = tools.filter(function (t) {
      return !(t.domain.toLowerCase() === domain.toLowerCase() && t.feature.toLowerCase() === feature.toLowerCase());
    });
    var props = PropertiesService.getUserProperties();
    props.setProperty('REGISTERED_PORTAL_TOOLS', JSON.stringify(tools));
    return true;
  },

  renameTool: function (domain, oldFeature, newFeature) {
    var tools = this.getRegisteredTools();
    var oldToolName = ('portal_' + domain + '_' + oldFeature).toLowerCase().replace(/[^a-z0-9_]/g, '_');
    var newToolName = ('portal_' + domain + '_' + newFeature).toLowerCase().replace(/[^a-z0-9_]/g, '_');

    tools = tools.map(function (t) {
      if (t.domain.toLowerCase() === domain.toLowerCase() && (t.name === oldToolName || t.feature.toLowerCase() === oldFeature.toLowerCase())) {
        t.feature = newFeature;
        t.name = newToolName;
      }
      return t;
    });

    var props = PropertiesService.getUserProperties();
    props.setProperty('REGISTERED_PORTAL_TOOLS', JSON.stringify(tools));
    return true;
  }
};

var DriveFolderManager = {
  FOLDER_NAME: 'School Portal MCP Intelligence',

  getExistingMcpFolder: function () {
    var props = PropertiesService.getUserProperties();
    var folderId = props.getProperty('MCP_ROOT_FOLDER_ID');
    if (folderId) {
      try {
        var existing = DriveApp.getFolderById(folderId);
        if (existing && !existing.isTrashed()) return existing;
      } catch (e) {}
    }

    var folders = DriveApp.getFoldersByName(this.FOLDER_NAME);
    while (folders.hasNext()) {
      var f = folders.next();
      if (!f.isTrashed()) {
        props.setProperty('MCP_ROOT_FOLDER_ID', f.getId());
        return f;
      }
    }
    return null;
  },

  getOrCreateMcpFolder: function () {
    var existing = this.getExistingMcpFolder();
    if (existing) return existing;

    var newFolder = DriveApp.createFolder(this.FOLDER_NAME);
    newFolder.setDescription('Stores persistent school intelligence cache (WhatsApp messages, PDFs, images, configurations). Modifying or deleting files in this folder directly affects Gemini Spark.');
    PropertiesService.getUserProperties().setProperty('MCP_ROOT_FOLDER_ID', newFolder.getId());
    return newFolder;
  },

  getFolderInfo: function () {
    var folder = this.getExistingMcpFolder();
    var userEmail = '';
    try {
      userEmail = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '';
    } catch (e) {}

    if (!folder) {
      return {
        isCreated: false,
        accountEmail: userEmail,
        folderName: this.FOLDER_NAME,
        folderUrl: '',
        message: 'Awaiting first verified school group capture before creating Google Drive folder.'
      };
    }
    return {
      isCreated: true,
      accountEmail: userEmail,
      folderId: folder.getId(),
      folderName: folder.getName(),
      folderUrl: folder.getUrl(),
      notice: '⚠️ Notice: This Google Drive folder stores your persistent school intelligence cache (WhatsApp messages, PDFs, images, configurations). Modifying or deleting files in this folder will directly alter or remove data used by Gemini Spark.'
    };
  }
};

var WhatsAppStorage = {
  ARCHIVE_FILE_NAME: 'whatsapp_school_archive.json',

  getArchiveFileId: function () {
    var props = PropertiesService.getUserProperties();
    var targetChild = (typeof CONFIG !== 'undefined' && CONFIG.childName) ? CONFIG.childName : 'Child';
    var childArchiveName = targetChild + '_whatsapp_school_archive.json';

    // 1. Always prioritize finding child-specific archive file first
    var childFiles = DriveApp.getFilesByName(childArchiveName);
    while (childFiles.hasNext()) {
      var cf = childFiles.next();
      if (!cf.isTrashed()) {
        props.setProperty('WHATSAPP_ARCHIVE_FILE_ID', cf.getId());
        return cf.getId();
      }
    }

    // 2. Check cached file ID if still valid
    var fileId = props.getProperty('WHATSAPP_ARCHIVE_FILE_ID');
    if (fileId) {
      try {
        var existing = DriveApp.getFileById(fileId);
        if (existing && !existing.isTrashed()) return fileId;
      } catch (e) {}
    }

    // 3. Try finding inside MCP folder
    var folder = DriveFolderManager.getExistingMcpFolder();
    if (folder) {
      var files = folder.getFilesByName(childArchiveName);
      if (files.hasNext()) {
        var id = files.next().getId();
        props.setProperty('WHATSAPP_ARCHIVE_FILE_ID', id);
        return id;
      }
      var defaultFiles = folder.getFilesByName(this.ARCHIVE_FILE_NAME);
      if (defaultFiles.hasNext()) {
        var defId = defaultFiles.next().getId();
        props.setProperty('WHATSAPP_ARCHIVE_FILE_ID', defId);
        return defId;
      }
    }

    // 4. Fallback: Search globally on Drive
    var globalFiles = DriveApp.getFilesByName(this.ARCHIVE_FILE_NAME);
    while (globalFiles.hasNext()) {
      var gf = globalFiles.next();
      if (!gf.isTrashed()) {
        props.setProperty('WHATSAPP_ARCHIVE_FILE_ID', gf.getId());
        return gf.getId();
      }
    }

    return null;
  },

  getGroupsManifest: function () {
    try {
      var files = DriveApp.getFilesByName('groups_manifest.json');
      while (files.hasNext()) {
        var f = files.next();
        if (!f.isTrashed()) {
          var content = f.getBlob().getDataAsString();
          return content ? JSON.parse(content) : null;
        }
      }
    } catch (e) {}
    return null;
  },

  saveAttachment: function (fileName, base64Data, mimeType, messageContext) {
    var folder = DriveFolderManager.getOrCreateMcpFolder();
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, mimeType || 'application/pdf', fileName);
    var file = folder.createFile(blob);
    var fileId = file.getId();

    var ocrText = '';
    try {
      if (typeof DocumentOcrService !== 'undefined') {
        var docRec = DocumentOcrService.indexDocument(folder, file, 'whatsapp');
        if (docRec && docRec.text) ocrText = docRec.text;
      } else if (typeof DriveContentExtractor !== 'undefined') {
        var ocrRes = DriveContentExtractor.extractText(fileId, 4000);
        if (ocrRes && ocrRes.text) ocrText = ocrRes.text;
      }
    } catch (ocrErr) {
      McpLogger.log('WARN', 'attachment:ocr_failed', { fileId: fileId, error: ocrErr.toString() });
    }

    var fileRecord = {
      fileId: fileId,
      fileName: fileName,
      fileUrl: file.getUrl(),
      mimeType: mimeType,
      ocrText: ocrText,
      uploadedAt: new Date().toISOString()
    };

    if (messageContext) {
      messageContext.attachment = fileRecord;
      if (ocrText) {
        messageContext.body = (messageContext.body || '') + '\\n[Auto-OCR Extracted from ' + fileName + ']:\\n' + ocrText;
      }
      this.saveMessages([messageContext]);
    }

    McpLogger.log('INFO', 'attachment:saved_and_ocr', { fileName: fileName, fileId: fileId, ocrChars: ocrText.length });
    return { success: true, fileId: fileId, fileUrl: file.getUrl(), ocrTextLength: ocrText.length };
  },

  saveMessages: function (newMessages) {
    if (!newMessages || !Array.isArray(newMessages) || newMessages.length === 0) {
      return { saved: 0 };
    }
    var fileId = this.getArchiveFileId();
    var existing = [];
    if (fileId) {
      try {
        var content = DriveApp.getFileById(fileId).getBlob().getDataAsString();
        existing = content ? JSON.parse(content) : [];
      } catch (e) {
        existing = [];
      }
    }

    var seen = {};
    existing.forEach(function (m) {
      seen[(m.chatName || '') + '_' + (m.timestamp || '') + '_' + (m.body || '')] = true;
    });

    var addedCount = 0;
    newMessages.forEach(function (m) {
      var key = (m.chatName || '') + '_' + (m.timestamp || '') + '_' + (m.body || '');
      if (!seen[key]) {
        seen[key] = true;
        existing.push(m);
        addedCount++;
      }
    });

    // Enforce newest-first chronological ordering
    var self = this;
    existing.sort(function (a, b) {
      var pa = self.parseMessageDate(a);
      var pb = self.parseMessageDate(b);
      var ta = pa ? pa.exactTimestampMs : 0;
      var tb = pb ? pb.exactTimestampMs : 0;
      return tb - ta;
    });

    if (existing.length > 50000) existing = existing.slice(0, 50000);

    var jsonStr = JSON.stringify(existing, null, 2);
    if (fileId) {
      DriveApp.getFileById(fileId).setContent(jsonStr);
    } else {
      var folder = DriveFolderManager.getOrCreateMcpFolder();
      var targetChild = (typeof CONFIG !== 'undefined' && CONFIG.childName) ? CONFIG.childName : 'Child';
      var newFile = folder.createFile(targetChild + '_whatsapp_school_archive.json', jsonStr, 'application/json');
      PropertiesService.getUserProperties().setProperty('WHATSAPP_ARCHIVE_FILE_ID', newFile.getId());
    }

    McpLogger.log('INFO', 'whatsapp:archived', { added: addedCount, totalArchived: existing.length });
    return { saved: addedCount, total: existing.length };
  },

  getAllMessages: function () {
    var fileId = this.getArchiveFileId();
    if (!fileId) return [];
    try {
      var content = DriveApp.getFileById(fileId).getBlob().getDataAsString();
      var list = content ? JSON.parse(content) : [];
      var self = this;
      list.sort(function (a, b) {
        var pa = self.parseMessageDate(a);
        var pb = self.parseMessageDate(b);
        var ta = pa ? pa.exactTimestampMs : 0;
        var tb = pb ? pb.exactTimestampMs : 0;
        return tb - ta;
      });
      return list;
    } catch (e) {
      return [];
    }
  },

  parseMessageDate: function (m) {
    try {
      var dateStr = m.date || '';
      var tsStr = m.timestamp || '';
      var timeStr = m.time || '';
      var combined = dateStr + ' ' + tsStr + ' ' + timeStr;

      var y = 2026, mNum = 1, d = 1, hour = 12, min = 0;

      var slashMatch = combined.match(new RegExp('\\b(\\d{1,2})/(\\d{1,2})/(\\d{4})\\b'));
      if (slashMatch) {
        mNum = parseInt(slashMatch[1], 10);
        d = parseInt(slashMatch[2], 10);
        y = parseInt(slashMatch[3], 10);
      } else {
        var isoMatch = combined.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
        if (isoMatch) {
          y = parseInt(isoMatch[1], 10);
          mNum = parseInt(isoMatch[2], 10);
          d = parseInt(isoMatch[3], 10);
        } else {
          var dashMatch = combined.match(/\\b(\\d{1,2})-(\\d{1,2})-(\\d{4})\\b/);
          if (dashMatch) {
            d = parseInt(dashMatch[1], 10);
            mNum = parseInt(dashMatch[2], 10);
            y = parseInt(dashMatch[3], 10);
          }
        }
      }

      var timeMatch = combined.match(/\\b(\\d{1,2}):(\\d{2})(?::(\\d{2}))?\\s*(am|pm)?\\b/i);
      if (timeMatch) {
        hour = parseInt(timeMatch[1], 10);
        min = parseInt(timeMatch[2], 10);
        var ampm = (timeMatch[4] || '').toLowerCase();
        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
      }

      var exactMs = new Date(y, mNum - 1, d, hour, min).getTime();
      return {
        year: y,
        month: mNum,
        day: d,
        hour: hour,
        minute: min,
        exactTimestampMs: exactMs,
        dayTimestampMs: new Date(y, mNum - 1, d).getTime()
      };
    } catch (e) {}
    return null;
  },

  matchesTemporalCondition: function (mParsed, queryLower, now) {
    if (!mParsed) return null;

    var nowYear = now.getFullYear();
    var nowMonth = now.getMonth() + 1;
    var nowDay = now.getDate();
    var nowMs = now.getTime();
    var nowDayMs = new Date(nowYear, nowMonth - 1, nowDay).getTime();
    var oneDayMs = 86400000;
    var oneHourMs = 3600000;
    var oneMinMs = 60000;

    var hoursMatch = queryLower.match(/\\b(?:in the\\s+|past\\s+|last\\s+)(\\d{1,2})\\s*hours?\\b/);
    if (hoursMatch) {
      var hCount = parseInt(hoursMatch[1], 10);
      var diffH = nowMs - mParsed.exactTimestampMs;
      return diffH >= -oneMinMs && diffH <= (hCount * oneHourMs);
    }
    if (/\\b(?:last|past)\\s+hour\\b/.test(queryLower)) {
      var diffH1 = nowMs - mParsed.exactTimestampMs;
      return diffH1 >= -oneMinMs && diffH1 <= oneHourMs;
    }

    var minsMatch = queryLower.match(/\\b(?:in the\\s+|past\\s+|last\\s+)(\\d{1,3})\\s*min(?:ute)?s?\\b/);
    if (minsMatch) {
      var mCount = parseInt(minsMatch[1], 10);
      var diffM = nowMs - mParsed.exactTimestampMs;
      return diffM >= -30000 && diffM <= (mCount * oneMinMs);
    }

    var isToday = mParsed.year === nowYear && mParsed.month === nowMonth && mParsed.day === nowDay;
    var ystDate = new Date(nowDayMs - oneDayMs);
    var isYesterday = mParsed.year === ystDate.getFullYear() && mParsed.month === (ystDate.getMonth() + 1) && mParsed.day === ystDate.getDate();

    if (/\\bthis morning\\b/.test(queryLower)) {
      return isToday && mParsed.hour >= 5 && mParsed.hour < 12;
    }
    if (/\\byesterday morning\\b/.test(queryLower)) {
      return isYesterday && mParsed.hour >= 5 && mParsed.hour < 12;
    }
    if (/\\bthis afternoon\\b/.test(queryLower)) {
      return isToday && mParsed.hour >= 12 && mParsed.hour < 17;
    }
    if (/\\bthis evening\\b/.test(queryLower)) {
      return isToday && mParsed.hour >= 17 && mParsed.hour < 22;
    }
    if (/\\byesterday evening\\b/.test(queryLower)) {
      return isYesterday && mParsed.hour >= 17 && mParsed.hour < 22;
    }
    if (/\\btonight\\b|\\bat night\\b/.test(queryLower)) {
      return (isToday || isYesterday) && (mParsed.hour >= 20 || mParsed.hour < 5);
    }

    if (/\\btoday\\b/.test(queryLower)) {
      return isToday;
    }
    if (/\\byesterday\\b/.test(queryLower)) {
      return isYesterday;
    }
    if (/day before yesterday/.test(queryLower)) {
      var dby = new Date(nowDayMs - (2 * oneDayMs));
      return mParsed.year === dby.getFullYear() && mParsed.month === (dby.getMonth() + 1) && mParsed.day === dby.getDate();
    }
    if (/this week|current week|past week|past 7 days|last 7 days|recent/.test(queryLower)) {
      var diffDays = (nowDayMs - mParsed.dayTimestampMs) / oneDayMs;
      return diffDays >= -1 && diffDays <= 7;
    }
    if (/last week|previous week/.test(queryLower)) {
      var diffDays2 = (nowDayMs - mParsed.dayTimestampMs) / oneDayMs;
      return diffDays2 > 7 && diffDays2 <= 14;
    }
    if (/this month|current month/.test(queryLower)) {
      return mParsed.year === nowYear && mParsed.month === nowMonth;
    }
    if (/last month|previous month/.test(queryLower)) {
      var lastM = nowMonth === 1 ? 12 : nowMonth - 1;
      var lastMY = nowMonth === 1 ? nowYear - 1 : nowYear;
      return mParsed.year === lastMY && mParsed.month === lastM;
    }
    if (/this year|current year/.test(queryLower)) {
      return mParsed.year === nowYear;
    }

    var monthMap = {
      'january': 1, 'jan': 1, 'february': 2, 'feb': 2, 'march': 3, 'mar': 3, 'april': 4, 'apr': 4,
      'may': 5, 'june': 6, 'jun': 6, 'july': 7, 'jul': 7, 'august': 8, 'aug': 8,
      'september': 9, 'sep': 9, 'sept': 9, 'october': 10, 'oct': 10, 'november': 11, 'nov': 11, 'december': 12, 'dec': 12
    };

    var dMonthMatch = queryLower.match(/\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+([a-z]+)\\b/);
    if (dMonthMatch && monthMap[dMonthMatch[2]]) {
      var day = parseInt(dMonthMatch[1], 10);
      var month = monthMap[dMonthMatch[2]];
      return mParsed.month === month && mParsed.day === day;
    }
    var monthDMatch = queryLower.match(/\\b([a-z]+)\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b/);
    if (monthDMatch && monthMap[monthDMatch[1]]) {
      var day2 = parseInt(monthDMatch[2], 10);
      var month2 = monthMap[monthDMatch[1]];
      return mParsed.month === month2 && mParsed.day === day2;
    }

    for (var mName in monthMap) {
      var mRegex = new RegExp('\\\\b' + mName + '\\\\b', 'i');
      if (mRegex.test(queryLower)) {
        return mParsed.month === monthMap[mName];
      }
    }

    return null;
  },

  cleanTopicQuery: function (queryLower) {
    return queryLower
      .replace(/\\b(?:in the\\s+|past\\s+|last\\s+)\\d{1,3}\\s*(?:hours?|min(?:ute)?s?)\\b/gi, '')
      .replace(/\\b(today|tonight|yesterday|tomorrow|day before yesterday|this week|last week|past week|current week|this month|last month|current month|this year|current year|recent|latest)\\b/gi, '')
      .replace(/\\b(this morning|yesterday morning|this afternoon|this evening|yesterday evening|at night|morning|afternoon|evening|night)\\b/gi, '')
      .replace(/\\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\\b/gi, '')
      .replace(/\\b\\d{1,2}(?:st|nd|rd|th)?\\b/gi, '')
      .replace(/\\b(updates?|notices?|messages?|posted|shared|from|in|on|at|the|for|by|what|is|are|any)\\b/gi, '')
      .replace(/[^a-z0-9\\s]/gi, ' ')
      .replace(/\\s+/g, ' ')
      .trim();
  },

  getRecentMessages: function (chatFilter, maxCount) {
    maxCount = maxCount || 40;
    var list = this.getAllMessages();

    if (chatFilter && chatFilter.trim() && chatFilter.toLowerCase().trim() !== 'official') {
      var query = chatFilter.toLowerCase().trim();
      var terms = query.split(/[\\s,]+/);
      list = list.filter(function (m) {
        var text = ((m.chatName || '') + ' ' + (m.body || '') + ' ' + (m.sender || '') + ' ' + (m.timestamp || '')).toLowerCase();
        return terms.some(function(t) { return t.length > 1 && text.indexOf(t) !== -1; }) || text.indexOf(query) !== -1;
      });
    }

    return list.slice(0, maxCount).map(function (m) {
      var body = m.body || '';
      var isHomework = /homework|assignment|worksheet|submission|due|deadline|task|subject:|practice sheet|chapter/i.test(body);
      var ts = m.timestamp || '';
      var parts = ts.includes(',') ? ts.split(',') : [ts];
      return {
        chatName: m.chatName,
        sender: m.sender,
        timestamp: ts,
        date: m.date || (parts.length > 1 ? parts[1].trim() : undefined),
        time: m.time || (parts.length > 1 ? parts[0].trim() : ts),
        category: isHomework ? 'HOMEWORK_OR_TASK_ANNOUNCEMENT' : (m.category || 'CLASS_ANNOUNCEMENT'),
        body: body,
        driveAttachmentUrl: m.driveAttachmentUrl || undefined,
        driveFileName: m.driveFileName || undefined
      };
    });
  },

  queryHistory: function (query, maxCount) {
    maxCount = maxCount || 60;
    var list = this.getAllMessages();
    if (!query || !query.trim()) return list.slice(0, maxCount);

    var q = query.toLowerCase().trim();
    var now = new Date();
    var topicQuery = this.cleanTopicQuery(q);
    var topicTerms = topicQuery ? topicQuery.split(/\\s+/).filter(function (t) { return t.length > 2; }) : [];

    var self = this;
    var results = list.filter(function (m) {
      var mParsed = self.parseMessageDate(m);
      var temporalResult = self.matchesTemporalCondition(mParsed, q, now);

      if (temporalResult === false) return false;
      if (temporalResult === true) {
        if (topicTerms.length > 0) {
          var fullText = ((m.chatName || '') + ' ' + (m.body || '') + ' ' + (m.sender || '') + ' ' + (m.documentTitle || '') + ' ' + (m.category || '')).toLowerCase();
          return topicTerms.some(function (term) { return fullText.indexOf(term) !== -1; });
        }
        return true;
      }

      var fullTextAll = ((m.chatName || '') + ' ' + (m.body || '') + ' ' + (m.sender || '') + ' ' + (m.timestamp || '') + ' ' + (m.date || '')).toLowerCase();
      if (fullTextAll.indexOf(q) !== -1) return true;

      var terms = q.split(/[\\s,]+/).filter(function (t) { return t.length > 2; });
      if (terms.length > 0) {
        return terms.every(function (t) { return fullTextAll.indexOf(t) !== -1; });
      }
      return true;
    });

    return results.slice(0, maxCount).map(function (m) {
      var body = m.body || '';
      var isHomework = /homework|assignment|worksheet|submission|due|deadline|task|subject:|practice sheet|chapter/i.test(body);
      var ts = m.timestamp || '';
      var parts = ts.includes(',') ? ts.split(',') : [ts];
      return {
        chatName: m.chatName,
        sender: m.sender,
        timestamp: ts,
        date: m.date || (parts.length > 1 ? parts[1].trim() : undefined),
        time: m.time || (parts.length > 1 ? parts[0].trim() : ts),
        category: isHomework ? 'HOMEWORK_OR_TASK_ANNOUNCEMENT' : (m.category || 'CLASS_ANNOUNCEMENT'),
        body: body,
        driveAttachmentUrl: m.driveAttachmentUrl || undefined,
        driveFileName: m.driveFileName || undefined
      };
    });
  }
};

var LiveTabStorage = {
  saveTabContent: function (tabData) {
    if (!tabData || !tabData.url) return { saved: false };
    PropertiesService.getUserProperties().setProperty('LATEST_LIVE_TAB_' + encodeURIComponent(tabData.domain || 'general'), JSON.stringify(tabData));
    McpLogger.log('INFO', 'live_tab:cached', { domain: tabData.domain, title: tabData.title });
    return { saved: true, domain: tabData.domain };
  },
  getTabContent: function (domainOrKeyword) {
    var props = PropertiesService.getUserProperties();
    if (domainOrKeyword && domainOrKeyword.trim()) {
      var key = 'LATEST_LIVE_TAB_' + encodeURIComponent(domainOrKeyword.toLowerCase().trim());
      var val = props.getProperty(key);
      if (val) return JSON.parse(val);
    }
    var allKeys = props.getKeys();
    for (var k = 0; k < allKeys.length; k++) {
      if (allKeys[k].indexOf('LATEST_LIVE_TAB_') === 0) {
        var raw = props.getProperty(allKeys[k]);
        if (raw && (!domainOrKeyword || raw.toLowerCase().indexOf(domainOrKeyword.toLowerCase()) !== -1)) {
          return JSON.parse(raw);
        }
      }
    }
    return null;
  }
};
