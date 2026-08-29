/**
 * WorkspaceFetcher - Fetches Google Workspace data via read-only APIs.
 */
var WorkspaceFetcher = {
  getGoogleClassroomWork: function () {
    try {
      // Using Classroom API via UrlFetchApp or Advanced Service if enabled
      var response = UrlFetchApp.fetch('https://classroom.googleapis.com/v1/courses', {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });
      if (response.getResponseCode() !== 200) {
        return { courses: [], note: "Classroom API return code " + response.getResponseCode() };
      }
      var json = JSON.parse(response.getContentText());
      return { courses: json.courses || [] };
    } catch (err) {
      return { error: err.toString() };
    }
  },

  getCalendarEvents: function () {
    try {
      var calendarId = 'primary';
      var now = new Date();
      var future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      var url = 'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calendarId) + '/events?timeMin=' + now.toISOString() + '&timeMax=' + future.toISOString();
      
      var response = UrlFetchApp.fetch(url, {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });
      var json = JSON.parse(response.getContentText());
      return { events: json.items || [] };
    } catch (err) {
      return { error: err.toString() };
    }
  },

  getSchoolGmailMessages: function () {
    try {
      var query = 'label:school OR subject:homework OR subject:circular';
      var threads = GmailApp.search(query, 0, 10);
      var messages = [];
      for (var i = 0; i < threads.length; i++) {
        var msgs = threads[i].getMessages();
        if (msgs.length > 0) {
          var lastMsg = msgs[msgs.length - 1];
          messages.push({
            subject: lastMsg.getSubject(),
            from: lastMsg.getFrom(),
            date: lastMsg.getDate().toISOString(),
            snippet: lastMsg.getSnippet()
          });
        }
      }
      return { messages: messages };
    } catch (err) {
      return { error: err.toString() };
    }
  },

  /**
   * Parses a message date and time into structured { year, month, day, hour, minute, exactTimestampMs, dayTimestampMs }
   */
  parseMessageDate: function (m) {
    try {
      var dateStr = m.date || '';
      var tsStr = m.timestamp || '';
      var timeStr = m.time || '';
      var combined = dateStr + ' ' + tsStr + ' ' + timeStr;

      var y = 2026, mNum = 1, d = 1, hour = 12, min = 0;

      // 1. Match Date
      var slashMatch = combined.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
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
          var dashMatch = combined.match(/\b(\d{1,2})-(\d{1,2})-(\d{4})\b/);
          if (dashMatch) {
            d = parseInt(dashMatch[1], 10);
            mNum = parseInt(dashMatch[2], 10);
            y = parseInt(dashMatch[3], 10);
          }
        }
      }

      // 2. Match Time (e.g. 9:55 AM, 09:55:00, 21:40)
      var timeMatch = combined.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?\b/i);
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

  /**
   * Evaluates if a message matches temporal conditions across years, months, weeks, days, hours, and minutes.
   */
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

    // 1. Hourly Granularity: "in the last X hours", "past X hours", "last hour"
    var hoursMatch = queryLower.match(/\b(?:in the\s+|past\s+|last\s+)(\d{1,2})\s*hours?\b/);
    if (hoursMatch) {
      var hCount = parseInt(hoursMatch[1], 10);
      var diffH = nowMs - mParsed.exactTimestampMs;
      return diffH >= -oneMinMs && diffH <= (hCount * oneHourMs);
    }
    if (/\b(?:last|past)\s+hour\b/.test(queryLower)) {
      var diffH1 = nowMs - mParsed.exactTimestampMs;
      return diffH1 >= -oneMinMs && diffH1 <= oneHourMs;
    }

    // 2. Minute Granularity: "in the last X minutes", "past 30 minutes"
    var minsMatch = queryLower.match(/\b(?:in the\s+|past\s+|last\s+)(\d{1,3})\s*min(?:ute)?s?\b/);
    if (minsMatch) {
      var mCount = parseInt(minsMatch[1], 10);
      var diffM = nowMs - mParsed.exactTimestampMs;
      return diffM >= -30000 && diffM <= (mCount * oneMinMs);
    }

    // 3. Time of Day (Morning / Afternoon / Evening / Night)
    var isToday = mParsed.year === nowYear && mParsed.month === nowMonth && mParsed.day === nowDay;
    var ystDate = new Date(nowDayMs - oneDayMs);
    var isYesterday = mParsed.year === ystDate.getFullYear() && mParsed.month === (ystDate.getMonth() + 1) && mParsed.day === ystDate.getDate();

    if (/\bthis morning\b/.test(queryLower)) {
      return isToday && mParsed.hour >= 5 && mParsed.hour < 12;
    }
    if (/\byesterday morning\b/.test(queryLower)) {
      return isYesterday && mParsed.hour >= 5 && mParsed.hour < 12;
    }
    if (/\bthis afternoon\b/.test(queryLower)) {
      return isToday && mParsed.hour >= 12 && mParsed.hour < 17;
    }
    if (/\bthis evening\b/.test(queryLower)) {
      return isToday && mParsed.hour >= 17 && mParsed.hour < 22;
    }
    if (/\byesterday evening\b/.test(queryLower)) {
      return isYesterday && mParsed.hour >= 17 && mParsed.hour < 22;
    }
    if (/\btonight\b|\bat night\b/.test(queryLower)) {
      return (isToday || isYesterday) && (mParsed.hour >= 20 || mParsed.hour < 5);
    }

    // 4. "today"
    if (/\btoday\b/.test(queryLower)) {
      return isToday;
    }

    // 5. "yesterday"
    if (/\byesterday\b/.test(queryLower)) {
      return isYesterday;
    }

    // 6. "day before yesterday"
    if (/day before yesterday/.test(queryLower)) {
      var dby = new Date(nowDayMs - (2 * oneDayMs));
      return mParsed.year === dby.getFullYear() && mParsed.month === (dby.getMonth() + 1) && mParsed.day === dby.getDate();
    }

    // 7. "this week" / "past week" / "past 7 days"
    if (/this week|current week|past week|past 7 days|last 7 days|recent/.test(queryLower)) {
      var diffDays = (nowDayMs - mParsed.dayTimestampMs) / oneDayMs;
      return diffDays >= -1 && diffDays <= 7;
    }

    // 8. "last week" / "previous week"
    if (/last week|previous week/.test(queryLower)) {
      var diffDays2 = (nowDayMs - mParsed.dayTimestampMs) / oneDayMs;
      return diffDays2 > 7 && diffDays2 <= 14;
    }

    // 9. "this month" / "current month"
    if (/this month|current month/.test(queryLower)) {
      return mParsed.year === nowYear && mParsed.month === nowMonth;
    }

    // 10. "last month" / "previous month"
    if (/last month|previous month/.test(queryLower)) {
      var lastM = nowMonth === 1 ? 12 : nowMonth - 1;
      var lastMY = nowMonth === 1 ? nowYear - 1 : nowYear;
      return mParsed.year === lastMY && mParsed.month === lastM;
    }

    // 11. "this year" / "current year"
    if (/this year|current year/.test(queryLower)) {
      return mParsed.year === nowYear;
    }

    // 12. Specific Month Name & Explicit Dates
    var monthMap = {
      'january': 1, 'jan': 1, 'february': 2, 'feb': 2, 'march': 3, 'mar': 3, 'april': 4, 'apr': 4,
      'may': 5, 'june': 6, 'jun': 6, 'july': 7, 'jul': 7, 'august': 8, 'aug': 8,
      'september': 9, 'sep': 9, 'sept': 9, 'october': 10, 'oct': 10, 'november': 11, 'nov': 11, 'december': 12, 'dec': 12
    };

    var dMonthMatch = queryLower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\b/);
    if (dMonthMatch && monthMap[dMonthMatch[2]]) {
      var day = parseInt(dMonthMatch[1], 10);
      var month = monthMap[dMonthMatch[2]];
      return mParsed.month === month && mParsed.day === day;
    }
    var monthDMatch = queryLower.match(/\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
    if (monthDMatch && monthMap[monthDMatch[1]]) {
      var day2 = parseInt(monthDMatch[2], 10);
      var month2 = monthMap[monthDMatch[1]];
      return mParsed.month === month2 && mParsed.day === day2;
    }

    for (var mName in monthMap) {
      var mRegex = new RegExp('\\b' + mName + '\\b', 'i');
      if (mRegex.test(queryLower)) {
        return mParsed.month === monthMap[mName];
      }
    }

    return null;
  },

  /**
   * Strips temporal stop words to isolate topic keywords.
   */
  cleanTopicQuery: function (queryLower) {
    return queryLower
      .replace(/\b(?:in the\s+|past\s+|last\s+)\d{1,3}\s*(?:hours?|min(?:ute)?s?)\b/gi, '')
      .replace(/\b(today|tonight|yesterday|tomorrow|day before yesterday|this week|last week|past week|current week|this month|last month|current month|this year|current year|recent|latest)\b/gi, '')
      .replace(/\b(this morning|yesterday morning|this afternoon|this evening|yesterday evening|at night|morning|afternoon|evening|night)\b/gi, '')
      .replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/gi, '')
      .replace(/\b\d{1,2}(?:st|nd|rd|th)?\b/gi, '')
      .replace(/\b(updates?|notices?|messages?|posted|shared|from|in|on|at|the|for|by|what|is|are|any)\b/gi, '')
      .replace(/[^a-z0-9\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  /**
   * Search and retrieve school WhatsApp messages from Google Drive archive with Full Temporal Intelligence.
   */
  searchWhatsAppMessages: function (args) {
    try {
      args = args || {};
      var targetChild = args.child_name || 'Atharva';
      var query = args.query ? String(args.query).trim() : '';
      var queryLower = query.toLowerCase();
      var groupName = (args.group_name || args.chat_filter) ? String(args.group_name || args.chat_filter).trim().toLowerCase() : '';
      var category = args.category ? String(args.category).trim().toUpperCase() : '';
      var maxLimit = args.limit || args.max_count ? parseInt(args.limit || args.max_count, 10) : 60;

      var allMessages = [];
      var archiveFileName = targetChild + '_whatsapp_school_archive.json';
      var files = DriveApp.getFilesByName(archiveFileName);
      if (!files.hasNext()) {
        files = DriveApp.getFilesByName('whatsapp_school_archive.json');
      }

      if (files.hasNext()) {
        var file = files.next();
        var content = file.getBlob().getDataAsString();
        allMessages = JSON.parse(content);
      } else {
        return {
          success: false,
          message: 'Archive file "' + archiveFileName + '" not found in Google Drive.',
          resultsCount: 0,
          messages: []
        };
      }

      var now = new Date();
      var topicQuery = this.cleanTopicQuery(queryLower);
      var topicTerms = topicQuery ? topicQuery.split(/\s+/).filter(function (t) { return t.length > 2; }) : [];

      var self = this;
      var matched = allMessages.filter(function (m) {
        // Group Filter
        if (groupName && groupName !== 'official') {
          if (!m.chatName || m.chatName.toLowerCase().indexOf(groupName) === -1) {
            return false;
          }
        }

        // Category Filter
        if (category && m.category && m.category.toUpperCase().indexOf(category) === -1) {
          return false;
        }

        if (!query) return true;

        var mParsed = self.parseMessageDate(m);
        var temporalResult = self.matchesTemporalCondition(mParsed, queryLower, now);

        // If temporal constraint was evaluated and failed, filter out
        if (temporalResult === false) {
          return false;
        }

        // If temporal constraint passed
        if (temporalResult === true) {
          // If there were also topic terms (e.g. "homework this week"), verify topic terms
          if (topicTerms.length > 0) {
            var fullText = ((m.chatName || '') + ' ' + (m.sender || '') + ' ' + (m.body || '') + ' ' + (m.documentTitle || '') + ' ' + (m.category || '')).toLowerCase();
            return topicTerms.some(function (term) { return fullText.indexOf(term) !== -1; });
          }
          return true;
        }

        // Fallback: Standard keyword full-text matching
        var fullTextAll = ((m.chatName || '') + ' ' + (m.sender || '') + ' ' + (m.body || '') + ' ' + (m.documentTitle || '') + ' ' + (m.category || '') + ' ' + (m.timestamp || '') + ' ' + (m.date || '')).toLowerCase();
        if (fullTextAll.indexOf(queryLower) !== -1) return true;

        var terms = queryLower.split(/[\s,]+/).filter(function (t) { return t.length > 2; });
        if (terms.length > 0) {
          return terms.every(function (t) { return fullTextAll.indexOf(t) !== -1; });
        }

        return true;
      });

      matched.sort(function (a, b) {
        var pa = self.parseMessageDate(a);
        var pb = self.parseMessageDate(b);
        var ta = pa ? pa.exactTimestampMs : 0;
        var tb = pb ? pb.exactTimestampMs : 0;
        return tb - ta;
      });

      return {
        success: true,
        childName: targetChild,
        query: query || null,
        totalMatched: matched.length,
        returnedCount: Math.min(matched.length, maxLimit),
        messages: matched.slice(0, maxLimit)
      };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  /**
   * Fetch the semantic groups index manifest from Google Drive.
   */
  getGroupsManifest: function (args) {
    try {
      args = args || {};
      var targetChild = args.child_name || 'Atharva';
      var files = DriveApp.getFilesByName('groups_manifest.json');
      if (!files.hasNext()) {
        return {
          success: false,
          message: 'groups_manifest.json not found on Google Drive.',
          manifest: null
        };
      }
      var file = files.next();
      var content = file.getBlob().getDataAsString();
      var manifest = JSON.parse(content);
      return {
        success: true,
        childName: targetChild,
        manifest: manifest
      };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  /**
   * Fetch latest school notices from the archive.
   */
  getLatestSchoolNotices: function (args) {
    try {
      args = args || {};
      var targetChild = args.child_name || 'Atharva';
      var maxLimit = args.limit ? parseInt(args.limit, 10) : 25;
      var groupName = args.group_name ? String(args.group_name).trim().toLowerCase() : '';

      var archiveFileName = targetChild + '_whatsapp_school_archive.json';
      var files = DriveApp.getFilesByName(archiveFileName);
      if (!files.hasNext()) {
        files = DriveApp.getFilesByName('whatsapp_school_archive.json');
      }

      if (!files.hasNext()) {
        return { success: false, message: 'Archive not found.', notices: [] };
      }

      var file = files.next();
      var content = file.getBlob().getDataAsString();
      var allMessages = JSON.parse(content);

      if (groupName) {
        allMessages = allMessages.filter(function (m) {
          return m.chatName && m.chatName.toLowerCase().indexOf(groupName) !== -1;
        });
      }

      var self = this;
      allMessages.sort(function (a, b) {
        var pa = self.parseMessageDate(a);
        var pb = self.parseMessageDate(b);
        var ta = pa ? pa.exactTimestampMs : 0;
        var tb = pb ? pb.exactTimestampMs : 0;
        return tb - ta;
      });

      return {
        success: true,
        childName: targetChild,
        returnedCount: Math.min(allMessages.length, maxLimit),
        notices: allMessages.slice(0, maxLimit)
      };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  }
};
