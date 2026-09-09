/**
 * GmailIngester.gs - School Domain Gmail Ingestion Engine
 * Queries genuine school-domain circulars, newsletters, and teacher messages.
 * Strictly excludes automated Google Classroom alert notifications.
 */
var GmailIngester = {
  sync: function(targetFolderId, childName, academicYear, schoolDomain, isIncremental, extractOnly) {
    try {
      McpLogger.log('INFO', 'GMAIL_SYNC_START', 'Starting Gmail circular sync for ' + childName + ' (Domain: ' + (schoolDomain || 'auto') + ', ExtractOnly: ' + !!extractOnly + ')');

      var parentFolder = null;
      var emailsFolder = null;
      var attachFolder = null;
      if (targetFolderId && !extractOnly) {
        try {
          parentFolder = DriveApp.getFolderById(targetFolderId);
          emailsFolder = this.getOrCreateSubfolder(parentFolder, 'emails');
          attachFolder = this.getOrCreateSubfolder(emailsFolder, 'attachments');
        } catch (fErr) {
          McpLogger.log('WARN', 'GMAIL_FOLDER_WARN', 'Could not access or create emails folder in targetFolderId: ' + fErr);
        }
      }

      var cleanDomain = (schoolDomain || '').trim().replace(/^@/, '').toLowerCase();
      var isGenericDomain = !cleanDomain || new RegExp('^(gmail|googlemail|google|yahoo|hotmail|outlook)[.]com$', 'i').test(cleanDomain);
      var domainFilter = (!isGenericDomain) ? 'from:' + cleanDomain : '';
      var classroomExclusion = '-from:(classroom.google.com) -from:(no-reply-classroom@google.com) -from:(notifications.google.com) -subject:("New assignment" OR "Graded" OR "Due tomorrow")';
      var query = (domainFilter ? domainFilter + ' ' : '') + classroomExclusion;

      var afterEpoch = null;
      if (isIncremental) {
        var props = PropertiesService.getScriptProperties();
        var lastSync = props.getProperty('last_gmail_sync_time');
        if (lastSync) {
          afterEpoch = Math.floor(new Date(lastSync).getTime() / 1000);
          query += ' after:' + afterEpoch;
        }
      }

      var threads = [];
      var startIdx = 0;
      var pageSize = 50;
      var maxSearchIdx = isIncremental ? 50 : 300;
      while (startIdx < maxSearchIdx) {
        var batch = GmailApp.search(query, startIdx, pageSize);
        if (!batch || batch.length === 0) break;
        threads = threads.concat(batch);
        if (batch.length < pageSize) break;
        startIdx += pageSize;
      }

      // If domain filter was applied but yielded zero threads, fall back to broad query
      // (only on full initial sync, not on 1-minute incremental checks where zero new emails is normal)
      if (threads.length === 0 && domainFilter && !isIncremental) {
        McpLogger.log('INFO', 'GMAIL_DOMAIN_FALLBACK', 'No circulars found for domain ' + cleanDomain + '; retrying with broad notice search');
        var broadQuery = classroomExclusion;
        if (isIncremental && afterEpoch) broadQuery += ' after:' + afterEpoch;
        startIdx = 0;
        while (startIdx < 300) {
          var broadBatch = GmailApp.search(broadQuery, startIdx, pageSize);
          if (!broadBatch || broadBatch.length === 0) break;
          threads = threads.concat(broadBatch);
          if (broadBatch.length < pageSize) break;
          startIdx += pageSize;
        }
      }

      var emailList = [];
      var totalAttachments = 0;
      var cumulativeBase64Bytes = 0;

      for (var t = 0; t < threads.length; t++) {
        var msgs = threads[t].getMessages();
        for (var m = 0; m < msgs.length; m++) {
          var msg = msgs[m];
          var sender = msg.getFrom() || '';

          // Strict filter: omit automated classroom notifications that contain only trimmed message alerts
          var senderLower = sender.toLowerCase();
          if (senderLower.indexOf('classroom.google.com') !== -1 || senderLower.indexOf('no-reply-classroom@google.com') !== -1) {
            continue;
          }

          var subject = msg.getSubject() || 'Untitled Notice';
          var date = msg.getDate();

          var item = {
            id: msg.getId(),
            threadId: threads[t].getId(),
            from: sender,
            to: msg.getTo() || '',
            subject: subject,
            date: date ? date.toISOString() : '',
            snippet: msg.getPlainBody().substring(0, 300),
            body: msg.getPlainBody().substring(0, 8000),
            attachments: []
          };

          var attachments = msg.getAttachments();
          for (var a = 0; a < attachments.length; a++) {
            var att = attachments[a];
            var cleanSubject = subject.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
            var attName = cleanSubject + '_' + att.getName();
            var attSize = att.getSize();
            var base64Payload = null;

            // Include base64 directly for attachments <= 2MB, up to 8MB cumulative in this sync batch
            if (attSize > 0 && attSize <= 2 * 1024 * 1024 && (cumulativeBase64Bytes + attSize) <= 8 * 1024 * 1024) {
              try {
                base64Payload = Utilities.base64Encode(att.getBytes());
                cumulativeBase64Bytes += attSize;
              } catch (b64Err) {}
            }

            var fileObj = null;
            if (attachFolder && !extractOnly) {
              try {
                var existing = attachFolder.getFilesByName(attName);
                if (existing.hasNext()) {
                  fileObj = existing.next();
                } else {
                  fileObj = attachFolder.createFile(att.copyBlob().setName(attName));
                  totalAttachments++;
                }
              } catch (attErr) {}
            }

            item.attachments.push({
              name: att.getName(),
              targetName: attName,
              fileId: fileObj ? fileObj.getId() : '',
              driveUrl: fileObj ? fileObj.getUrl() : '',
              mimeType: att.getContentType(),
              size: attSize,
              messageId: msg.getId(),
              attachmentIndex: a,
              base64: base64Payload
            });
            if (!fileObj && base64Payload) {
              totalAttachments++;
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
                mimeType: linkedDocs[ld].mimeType || 'application/pdf',
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

      if (emailsFolder && !extractOnly) {
        try {
          var finalEmails = manifestPayload;
          if (isIncremental) {
            try {
              var exEmIt = emailsFolder.getFilesByName('school_emails.json');
              if (exEmIt.hasNext()) {
                var exEmData = JSON.parse(exEmIt.next().getContent());
                if (exEmData && exEmData.emails) {
                  var emMap = {};
                  var combEmails = [];
                  (emailList || []).concat(exEmData.emails || []).forEach(function(em) {
                    if (em && em.id && !emMap[em.id]) {
                      emMap[em.id] = true;
                      combEmails.push(em);
                    }
                  });
                  finalEmails = {
                    kidName: childName,
                    academicYear: academicYear,
                    schoolDomain: schoolDomain || '',
                    lastSyncedAt: new Date().toISOString(),
                    totalEmails: combEmails.length,
                    totalAttachments: combEmails.reduce(function(a, x) { return a + (x.attachments ? x.attachments.length : 0); }, 0),
                    emails: combEmails
                  };
                }
              }
            } catch (mergeErr) {}
          }
          this.saveJsonFile(emailsFolder, 'school_emails.json', finalEmails);
        } catch (sErr) {
          McpLogger.log('WARN', 'GMAIL_SAVE_WARN', 'Could not save school_emails.json directly: ' + sErr);
        }
      }
      try {
        PropertiesService.getScriptProperties().setProperty('last_gmail_sync_time', new Date().toISOString());
      } catch (pErr) {}

      McpLogger.log('SUCCESS', 'GMAIL_SYNC_COMPLETE', 'Successfully captured ' + emailList.length + ' emails and ' + totalAttachments + ' attachments for ' + childName);
      return manifestPayload;
    } catch (err) {
      McpLogger.log('ERROR', 'GMAIL_SYNC_ERROR', 'Gmail sync failed: ' + err.toString());
      if (extractOnly) {
        return {
          kidName: childName,
          academicYear: academicYear,
          schoolDomain: schoolDomain || '',
          lastSyncedAt: new Date().toISOString(),
          totalEmails: 0,
          totalAttachments: 0,
          emails: [],
          error: err.toString()
        };
      }
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
    var urlRegex = new RegExp('https?://(?:drive|docs)[.]google[.]com/[^\\s"<>]+', 'gi');
    var matches = text.match(urlRegex);
    if (matches) {
      for (var i = 0; i < matches.length; i++) {
        var u = matches[i];
        var fId = this.extractDriveFileIdFromUrl(u);
        if (fId) {
          var cleanSubj = (subject || '').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
          var targetName = (prefix || 'Email') + '_' + cleanSubj + '_' + fId.substring(0, 8);
          if (attachFolder) {
            try {
              var existing = attachFolder.getFilesByName(targetName);
              if (existing.hasNext()) {
                var ex = existing.next();
                results.push({ title: targetName, fileId: ex.getId(), driveUrl: ex.getUrl(), mimeType: 'application/pdf' });
                continue;
              }
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
                  results.push({ title: targetName + ' (PDF)', fileId: createdPdf.getId(), driveUrl: createdPdf.getUrl(), mimeType: 'application/pdf' });
                  continue;
                }
              } else {
                var copied = srcFile.makeCopy(targetName, attachFolder);
                results.push({ title: targetName, fileId: copied.getId(), driveUrl: copied.getUrl(), mimeType: mime });
                continue;
              }
            } catch (e) {}
          }
          // If attachFolder is null or cannot be written (student read-only), return fileId for Parent Vault sync
          results.push({
            title: targetName,
            fileId: fId,
            driveUrl: u,
            mimeType: 'application/pdf',
            size: 0
          });
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
