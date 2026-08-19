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
  }
};
