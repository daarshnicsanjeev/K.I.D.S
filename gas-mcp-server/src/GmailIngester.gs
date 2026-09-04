/**
 * GmailIngester.gs - School Domain Gmail Ingestion Engine
 * Queries genuine school-domain circulars, newsletters, and teacher messages.
 * Strictly excludes automated Google Classroom alert notifications.
 */
var GmailIngester = {
  sync: function(targetFolderId, childName, academicYear, schoolDomain, isIncremental) {
    try {
      McpLogger.log('INFO', 'GMAIL_SYNC_START', 'Starting Gmail circular sync for ' + childName + ' (Domain: ' + (schoolDomain || 'auto') + ')');

      var parentFolder = DriveApp.getFolderById(targetFolderId);
      var emailsFolder = this.getOrCreateSubfolder(parentFolder, 'emails');
      var attachFolder = this.getOrCreateSubfolder(emailsFolder, 'attachments');

      var domainFilter = schoolDomain ? 'from:(@' + schoolDomain.replace(/^@/, '') + ')' : '';
      var query = (domainFilter ? domainFilter + ' ' : '') + '-from:(classroom.google.com) -subject:("New assignment" OR "Graded" OR "Due tomorrow")';
      
      if (isIncremental) {
        var props = PropertiesService.getScriptProperties();
        var lastSync = props.getProperty('last_gmail_sync_time');
        if (lastSync) {
          var afterEpoch = Math.floor(new Date(lastSync).getTime() / 1000);
          query += ' after:' + afterEpoch;
        }
      }

      var threads = GmailApp.search(query, 0, 40);
      var emailList = [];
      var totalAttachments = 0;

      for (var t = 0; t < threads.length; t++) {
        var msgs = threads[t].getMessages();
        for (var m = 0; m < msgs.length; m++) {
          var msg = msgs[m];
          var sender = msg.getFrom();
          var subject = msg.getSubject() || 'Untitled Notice';
          var date = msg.getDate();

          var item = {
            id: msg.getId(),
            threadId: threads[t].getId(),
            from: sender,
            to: msg.getTo(),
            subject: subject,
            date: date ? date.toISOString() : '',
            snippet: msg.getPlainBody().substring(0, 300),
            body: msg.getPlainBody().substring(0, 4000),
            attachments: []
          };

          var attachments = msg.getAttachments();
          for (var a = 0; a < attachments.length; a++) {
            var att = attachments[a];
            var cleanSubject = subject.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
            var attName = cleanSubject + '_' + att.getName();

            var existing = attachFolder.getFilesByName(attName);
            if (existing.hasNext()) {
              var exFile = existing.next();
              item.attachments.push({
                name: att.getName(),
                fileId: exFile.getId(),
                driveUrl: exFile.getUrl(),
                mimeType: att.getContentType(),
                size: att.getSize()
              });
            } else {
              try {
                var savedFile = attachFolder.createFile(att.copyBlob().setName(attName));
                item.attachments.push({
                  name: att.getName(),
                  fileId: savedFile.getId(),
                  driveUrl: savedFile.getUrl(),
                  mimeType: att.getContentType(),
                  size: att.getSize()
                });
                totalAttachments++;
              } catch (attErr) {}
            }
          }

          // Scan email body for embedded Google Drive links
          var emailBody = msg.getPlainBody();
          if (emailBody) {
            var linkedDocs = this.scanTextForDriveFiles(emailBody, attachFolder, 'EmailNotice', subject);
            for (var ld = 0; ld < linkedDocs.length; ld++) {
              item.attachments.push({
                name: linkedDocs[ld].title || 'Linked Circular',
                fileId: linkedDocs[ld].fileId,
                driveUrl: linkedDocs[ld].driveUrl,
                mimeType: 'application/pdf',
                size: 0
              });
              totalAttachments++;
            }
          }

          emailList.push(item);
        }
      }

      var manifestPayload = {
        kidName: childName,
        academicYear: academicYear,
        schoolDomain: schoolDomain || '',
        lastSyncedAt: new Date().toISOString(),
        totalEmails: emailList.length,
        totalAttachments: totalAttachments,
        emails: emailList
      };

      this.saveJsonFile(emailsFolder, 'school_emails.json', manifestPayload);
      PropertiesService.getScriptProperties().setProperty('last_gmail_sync_time', new Date().toISOString());

      McpLogger.log('SUCCESS', 'GMAIL_SYNC_COMPLETE', 'Successfully vaulted ' + emailList.length + ' emails and ' + totalAttachments + ' circular attachments for ' + childName);
      return manifestPayload;
    } catch (err) {
      McpLogger.log('ERROR', 'GMAIL_SYNC_ERROR', 'Gmail sync failed: ' + err.toString());
      throw err;
    }
  },

  extractDriveFileIdFromUrl: function(url) {
    if (!url) return null;
    var match = url.match(new RegExp('/d/([a-zA-Z0-9_-]{20,})'));
    if (match) return match[1];
    var idMatch = url.match(new RegExp('[?&]id=([a-zA-Z0-9_-]{20,})'));
    if (idMatch) return idMatch[1];
    var openMatch = url.match(new RegExp('/open[?]id=([a-zA-Z0-9_-]{20,})'));
    if (openMatch) return openMatch[1];
    return null;
  },

  scanTextForDriveFiles: function(text, attachFolder, prefix, subject) {
    if (!text) return [];
    var results = [];
    var urlRegex = new RegExp('https?://(?:drive|docs)\\.google\\.com/[^\\s"\'\\)<>]+', 'gi');
    var matches = text.match(urlRegex);
    if (matches) {
      for (var i = 0; i < matches.length; i++) {
        var u = matches[i];
        var fId = this.extractDriveFileIdFromUrl(u);
        if (fId) {
          var cleanSubj = (subject || '').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
          var targetName = (prefix || 'Email') + '_' + cleanSubj + '_' + fId.substring(0, 8);
          var existing = attachFolder.getFilesByName(targetName);
          if (existing.hasNext()) {
            var ex = existing.next();
            results.push({ title: targetName, fileId: ex.getId(), driveUrl: ex.getUrl() });
            continue;
          }
          try {
            var srcFile = DriveApp.getFileById(fId);
            var mime = srcFile.getMimeType();
            if (mime.indexOf('google-apps') !== -1) {
              var token = ScriptApp.getOAuthToken();
              var exportRes = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + fId + '/export?mimeType=application/pdf', {
                headers: { 'Authorization': 'Bearer ' + token },
                muteHttpExceptions: true
              });
              if (exportRes.getResponseCode() === 200) {
                var createdPdf = attachFolder.createFile(exportRes.getBlob().setName(targetName + '.pdf'));
                results.push({ title: targetName + ' (PDF)', fileId: createdPdf.getId(), driveUrl: createdPdf.getUrl() });
              }
            } else {
              var copied = srcFile.makeCopy(targetName, attachFolder);
              results.push({ title: targetName, fileId: copied.getId(), driveUrl: copied.getUrl() });
            }
          } catch (e) {}
        }
      }
    }
    return results;
  },

  getOrCreateSubfolder: function(parentFolder, name) {
    var it = parentFolder.getFoldersByName(name);
    if (it.hasNext()) return it.next();
    return parentFolder.createFolder(name);
  },

  saveJsonFile: function(folder, fileName, data) {
    var payload = JSON.stringify(data, null, 2);
    var it = folder.getFilesByName(fileName);
    if (it.hasNext()) {
      var file = it.next();
      file.setContent(payload);
      return file;
    }
    return folder.createFile(fileName, payload, 'application/json');
  }
};
