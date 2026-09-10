/**
 * ClassroomIngester.gs - Autonomous Google Classroom Ingestion Engine
 * Crawls active courses, coursework, student submissions, grades,
 * teacher comments, meet links, and downloads all attached worksheets/PDFs.
 */
var ClassroomIngester = {
  sync: function(targetFolderId, childName, academicYear, isIncremental, extractOnly) {
    var startTime = new Date();
    var deepLog = {
      syncId: 'sync_' + startTime.getTime(),
      timestamp: startTime.toISOString(),
      childName: childName || 'Child',
      academicYear: academicYear || '2026-2027',
      extractOnly: !!extractOnly,
      coursesAudit: [],
      inventory: [],
      summary: {
        totalCoursesFound: 0,
        coursesIngested: 0,
        totalAnnouncements: 0,
        totalCourseWork: 0,
        totalMaterials: 0,
        totalAttachments: 0,
        driveFilesCount: 0,
        youtubeVideosCount: 0,
        webLinksCount: 0,
        formsCount: 0,
        duplicateAttachmentsCount: 0
      },
      logTimeline: []
    };

    function addLog(msg) {
      deepLog.logTimeline.push('[' + (new Date()).toISOString() + '] ' + msg);
      McpLogger.log('INFO', 'CLASSROOM_DEEP_CRAWL', msg);
    }

    try {
      addLog('🚀 Starting Google Classroom Deep Crawl for ' + (childName || 'Child') + (extractOnly ? ' (Read-Only Extract Mode)' : ''));

      var parentFolder = null;
      var classroomFolder = null;
      var attachFolder = null;
      if (targetFolderId && !extractOnly) {
        try {
          parentFolder = DriveApp.getFolderById(targetFolderId);
          classroomFolder = this.getOrCreateSubfolder(parentFolder, 'classroom');
          attachFolder = this.getOrCreateSubfolder(classroomFolder, 'attachments');
        } catch (fErr) {
          McpLogger.log('WARN', 'CLASSROOM_FOLDER_WARN', 'Could not access parent targetFolderId: ' + fErr);
        }
      }

      var courses = this.fetchAllCourses(academicYear, deepLog);
      var allCourseData = [];
      var totalAttachments = 0;
      var seenFileIds = {};

      function recordAttachmentInventory(att, section, parentTitle) {
        if (!att) return;
        var itemType = 'DRIVE_FILE';
        var idOrUrl = att.fileId || '';
        if (att.youtubeUrl) {
          itemType = 'YOUTUBE_VIDEO';
          idOrUrl = att.youtubeUrl;
          deepLog.summary.youtubeVideosCount++;
        } else if (att.formUrl) {
          itemType = 'GOOGLE_FORM';
          idOrUrl = att.formUrl;
          deepLog.summary.formsCount++;
        } else if (att.url) {
          itemType = 'WEB_LINK';
          idOrUrl = att.url;
          deepLog.summary.webLinksCount++;
        } else if (att.fileId) {
          if (seenFileIds[att.fileId]) {
            itemType = 'DUPLICATE_FILE';
            deepLog.summary.duplicateAttachmentsCount++;
          } else {
            seenFileIds[att.fileId] = true;
            deepLog.summary.driveFilesCount++;
          }
        }
        deepLog.inventory.push({
          index: deepLog.inventory.length + 1,
          type: itemType,
          title: att.title || att.targetName || 'Untitled',
          targetName: att.targetName || att.title || '',
          fileId: att.fileId || null,
          url: idOrUrl,
          section: section,
          parentTitle: (parentTitle || '').substring(0, 50)
        });
      }

      for (var i = 0; i < courses.length; i++) {
        var course = courses[i];
        addLog('📖 Processing Course [' + (i + 1) + '/' + courses.length + ']: "' + course.name + '" (ID: ' + course.id + ')');
        var courseData = {
          id: course.id,
          name: course.name,
          section: course.section || '',
          descriptionHeading: course.descriptionHeading || '',
          room: course.room || '',
          alternateLink: course.alternateLink || '',
          courseState: course.courseState || 'ACTIVE',
          announcements: [],
          courseWork: [],
          materials: []
        };

        // Announcements (with multi-page pagination & Drive link scanning)
        var maxPages = isIncremental ? 1 : 50;
        var annPageToken = null;
        var annPage = 1;
        var courseAnnouncements = [];
        do {
          try {
            var annParams = { pageSize: isIncremental ? 20 : 50 };
            if (annPageToken) annParams.pageToken = annPageToken;
            var annRes = Classroom.Courses.Announcements.list(course.id, annParams);
            var batch = (annRes && annRes.announcements) ? annRes.announcements : [];
            addLog('📢 Course "' + course.name + '" Announcements Page ' + annPage + ': fetched ' + batch.length + ' items (hasMore: ' + !!(annRes && annRes.nextPageToken) + ')');

            for (var aIdx = 0; aIdx < batch.length; aIdx++) {
              var a = batch[aIdx];
              var annItem = {
                id: a.id,
                text: a.text || '',
                alternateLink: a.alternateLink || '',
                creationTime: a.creationTime,
                updateTime: a.updateTime,
                materials: a.materials || [],
                attachments: []
              };

              if (a.materials && a.materials.length > 0) {
                for (var am = 0; am < a.materials.length; am++) {
                  var aMat = a.materials[am];
                  var aDownloaded = this.downloadMaterialAttachment(aMat, attachFolder, course.name, 'Ann_' + (a.text ? a.text.substring(0, 15) : a.id));
                  if (aDownloaded) {
                    annItem.attachments.push(aDownloaded);
                    totalAttachments++;
                    recordAttachmentInventory(aDownloaded, 'announcement', a.text ? a.text.substring(0, 30) : a.id);
                  }
                }
              }

              if (a.text) {
                var textDocs = this.scanTextForDriveFiles(a.text, attachFolder, course.name, 'AnnText_' + a.id);
                for (var td = 0; td < textDocs.length; td++) {
                  annItem.attachments.push(textDocs[td]);
                  totalAttachments++;
                  recordAttachmentInventory(textDocs[td], 'announcement_text_link', a.text.substring(0, 30));
                }
              }

              courseAnnouncements.push(annItem);
            }

            annPageToken = annRes ? annRes.nextPageToken : null;
            annPage++;
          } catch (annErr) {
            McpLogger.log('WARN', 'CLASSROOM_ANN_WARN', 'Could not fetch announcements page ' + annPage + ' for ' + course.name + ': ' + annErr);
            addLog('⚠️ Announcement fetch notice on page ' + annPage + ': ' + annErr.toString());
            annPageToken = null;
          }
        } while (annPageToken && annPage <= maxPages);
        courseData.announcements = courseAnnouncements;

        // CourseWork (Assignments & Worksheets with multi-page pagination)
        var cwPageToken = null;
        var cwPage = 1;
        var courseCwList = [];
        do {
          try {
            var cwParams = { pageSize: isIncremental ? 20 : 50 };
            if (cwPageToken) cwParams.pageToken = cwPageToken;
            var cwRes = Classroom.Courses.CourseWork.list(course.id, cwParams);
            var cwBatch = (cwRes && cwRes.courseWork) ? cwRes.courseWork : [];
            addLog('📝 Course "' + course.name + '" CourseWork Page ' + cwPage + ': fetched ' + cwBatch.length + ' items (hasMore: ' + !!(cwRes && cwRes.nextPageToken) + ')');

            for (var j = 0; j < cwBatch.length; j++) {
              var cw = cwBatch[j];
              var cwItem = {
                id: cw.id,
                title: cw.title || 'Untitled Assignment',
                description: cw.description || '',
                state: cw.state || 'PUBLISHED',
                workType: cw.workType || 'ASSIGNMENT',
                maxPoints: cw.maxPoints || 100,
                dueDate: cw.dueDate || null,
                dueTime: cw.dueTime || null,
                alternateLink: cw.alternateLink || '',
                creationTime: cw.creationTime,
                updateTime: cw.updateTime,
                submission: null,
                attachments: []
              };

              try {
                var skipSub = false;
                if (isIncremental && cw.creationTime) {
                  var ageMs = new Date().getTime() - new Date(cw.creationTime).getTime();
                  if (ageMs > 30 * 24 * 60 * 60 * 1000) skipSub = true;
                }
                if (!skipSub) {
                  var subRes = Classroom.Courses.CourseWork.StudentSubmissions.list(course.id, cw.id, { userId: 'me' });
                  if (subRes && subRes.studentSubmissions && subRes.studentSubmissions.length > 0) {
                    var sub = subRes.studentSubmissions[0];
                    cwItem.submission = {
                      id: sub.id,
                      state: sub.state || 'ASSIGNED',
                      assignedGrade: sub.assignedGrade !== undefined ? sub.assignedGrade : null,
                      draftGrade: sub.draftGrade !== undefined ? sub.draftGrade : null,
                      alternateLink: sub.alternateLink || '',
                      updateTime: sub.updateTime,
                      late: sub.late || false
                    };

                    // Extract student-submitted homework worksheets / attachments
                    if (sub.assignmentSubmission && sub.assignmentSubmission.attachments && sub.assignmentSubmission.attachments.length > 0) {
                      for (var sa = 0; sa < sub.assignmentSubmission.attachments.length; sa++) {
                        var subAtt = sub.assignmentSubmission.attachments[sa];
                        var dSub = this.downloadMaterialAttachment(subAtt, attachFolder, course.name, 'Sub_' + cw.title);
                        if (dSub) {
                          cwItem.attachments.push(dSub);
                          totalAttachments++;
                          recordAttachmentInventory(dSub, 'student_submission', cw.title);
                        }
                      }
                    }
                  }
                }
              } catch (subErr) {}

              if (cw.materials && cw.materials.length > 0) {
                for (var m = 0; m < cw.materials.length; m++) {
                  var mat = cw.materials[m];
                  var downloaded = this.downloadMaterialAttachment(mat, attachFolder, course.name, cw.title);
                  if (downloaded) {
                    cwItem.attachments.push(downloaded);
                    totalAttachments++;
                    recordAttachmentInventory(downloaded, 'coursework', cw.title);
                  }
                }
              }

              if (cw.description) {
                var descDocs = this.scanTextForDriveFiles(cw.description, attachFolder, course.name, cw.title);
                for (var dd = 0; dd < descDocs.length; dd++) {
                  cwItem.attachments.push(descDocs[dd]);
                  totalAttachments++;
                  recordAttachmentInventory(descDocs[dd], 'coursework_desc_link', cw.title);
                }
              }

              courseCwList.push(cwItem);
            }

            cwPageToken = cwRes ? cwRes.nextPageToken : null;
            cwPage++;
          } catch (cwErr) {
            McpLogger.log('WARN', 'CLASSROOM_CW_WARN', 'Could not fetch coursework page ' + cwPage + ' for ' + course.name + ': ' + cwErr);
            addLog('⚠️ Coursework fetch notice on page ' + cwPage + ': ' + cwErr.toString());
            cwPageToken = null;
          }
        } while (cwPageToken && cwPage <= maxPages);
        courseData.courseWork = courseCwList;

        // Materials (Reference Resources with multi-page pagination)
        var matPageToken = null;
        var matPage = 1;
        var courseMatList = [];
        do {
          try {
            var matParams = { pageSize: isIncremental ? 20 : 50 };
            if (matPageToken) matParams.pageToken = matPageToken;
            var matRes = Classroom.Courses.CourseWorkMaterials.list(course.id, matParams);
            var matBatch = (matRes && matRes.courseWorkMaterial) ? matRes.courseWorkMaterial : [];
            addLog('📚 Course "' + course.name + '" Materials Page ' + matPage + ': fetched ' + matBatch.length + ' items (hasMore: ' + !!(matRes && matRes.nextPageToken) + ')');

            for (var k = 0; k < matBatch.length; k++) {
              var cwm = matBatch[k];
              var matItem = {
                id: cwm.id,
                title: cwm.title || 'Course Material',
                description: cwm.description || '',
                alternateLink: cwm.alternateLink || '',
                updateTime: cwm.updateTime,
                attachments: []
              };

              if (cwm.materials && cwm.materials.length > 0) {
                for (var n = 0; n < cwm.materials.length; n++) {
                  var cMat = cwm.materials[n];
                  var dMat = this.downloadMaterialAttachment(cMat, attachFolder, course.name, cwm.title);
                  if (dMat) {
                    matItem.attachments.push(dMat);
                    totalAttachments++;
                    recordAttachmentInventory(dMat, 'material', cwm.title);
                  }
                }
              }

              if (cwm.description) {
                var cwmDocs = this.scanTextForDriveFiles(cwm.description, attachFolder, course.name, cwm.title);
                for (var cd = 0; cd < cwmDocs.length; cd++) {
                  matItem.attachments.push(cwmDocs[cd]);
                  totalAttachments++;
                  recordAttachmentInventory(cwmDocs[cd], 'material_desc_link', cwm.title);
                }
              }

              courseMatList.push(matItem);
            }

            matPageToken = matRes ? matRes.nextPageToken : null;
            matPage++;
          } catch (matErr) {
            McpLogger.log('WARN', 'CLASSROOM_MAT_WARN', 'Could not fetch materials page ' + matPage + ' for ' + course.name + ': ' + matErr);
            addLog('⚠️ Materials fetch notice on page ' + matPage + ': ' + matErr.toString());
            matPageToken = null;
          }
        } while (matPageToken && matPage <= maxPages);
        courseData.materials = courseMatList;

        allCourseData.push(courseData);
      }

      deepLog.summary.totalAnnouncements = allCourseData.reduce(function(acc, c) { return acc + (c.announcements ? c.announcements.length : 0); }, 0);
      deepLog.summary.totalCourseWork = allCourseData.reduce(function(acc, c) { return acc + (c.courseWork ? c.courseWork.length : 0); }, 0);
      deepLog.summary.totalMaterials = allCourseData.reduce(function(acc, c) { return acc + (c.materials ? c.materials.length : 0); }, 0);
      deepLog.summary.totalAttachments = totalAttachments;
      deepLog.executionTimeMs = (new Date()).getTime() - startTime.getTime();

      var deepLogText = this.formatDeepLogReport(deepLog, allCourseData);

      var manifestPayload = {
        kidName: childName,
        academicYear: academicYear,
        lastSyncedAt: new Date().toISOString(),
        totalCourses: allCourseData.length,
        totalAttachments: totalAttachments,
        courses: allCourseData,
        deepLog: deepLog,
        deepLogText: deepLogText
      };

      if (classroomFolder) {
        var finalPayload = manifestPayload;
        if (isIncremental) {
          try {
            var exFileIt = classroomFolder.getFilesByName('classroom_data.json');
            if (exFileIt.hasNext()) {
              var exData = JSON.parse(exFileIt.next().getContent());
              if (exData && exData.courses) {
                finalPayload = this.mergeClassroomData(exData, manifestPayload);
              }
            }
          } catch (mErr) {}
        }
        this.saveJsonFile(classroomFolder, 'classroom_data.json', finalPayload);
        this.saveJsonFile(classroomFolder, 'classroom_sync_deep_log.json', deepLog);
        this.saveTextFile(classroomFolder, 'classroom_sync_deep_log.txt', deepLogText);
      }
      McpLogger.log('SUCCESS', 'CLASSROOM_SYNC_COMPLETE', 'Successfully crawled ' + allCourseData.length + ' courses and extracted ' + totalAttachments + ' attachments for ' + childName);

      return manifestPayload;
    } catch (err) {
      McpLogger.log('ERROR', 'CLASSROOM_SYNC_ERROR', 'Google Classroom sync failed: ' + err.toString());
      throw err;
    }
  },

  fetchAllCourses: function(academicYear, deepLog) {
    var courses = [];
    var pageToken = null;
    var page = 1;
    do {
      try {
        var params = { studentId: 'me', courseStates: ['ACTIVE'], pageSize: 50 };
        if (pageToken) params.pageToken = pageToken;
        var res = Classroom.Courses.list(params);
        if (res && res.courses) {
          courses = courses.concat(res.courses);
          if (deepLog) deepLog.logTimeline.push('[' + (new Date()).toISOString() + '] Course list page ' + page + ': retrieved ' + res.courses.length + ' courses.');
        }
        pageToken = res ? res.nextPageToken : null;
        page++;
      } catch (e) {
        try {
          var fbParams = { courseStates: ['ACTIVE'], pageSize: 50 };
          if (pageToken) fbParams.pageToken = pageToken;
          var fallbackRes = Classroom.Courses.list(fbParams);
          if (fallbackRes && fallbackRes.courses) courses = courses.concat(fallbackRes.courses);
          pageToken = fallbackRes ? fallbackRes.nextPageToken : null;
          page++;
        } catch (e2) {
          pageToken = null;
        }
      }
    } while (pageToken && page <= 10);

    var self = this;
    var filtered = courses.filter(function(c) {
      return self.isCurrentClass(c, academicYear);
    });

    McpLogger.log('INFO', 'CLASSROOM_COURSES_FILTERED', 'Found ' + courses.length + ' active courses in account; filtered to ' + filtered.length + ' current-year classes.');
    if (deepLog) {
      deepLog.summary.totalCoursesFound = courses.length;
      deepLog.summary.coursesIngested = filtered.length;
      for (var ci = 0; ci < courses.length; ci++) {
        var isInc = filtered.indexOf(courses[ci]) !== -1;
        deepLog.coursesAudit.push({
          id: courses[ci].id,
          name: courses[ci].name,
          section: courses[ci].section || '',
          state: courses[ci].courseState,
          included: isInc
        });
      }
    }
    return filtered;
  },

  isCurrentClass: function(course, targetAcademicYear) {
    if (!course) return false;
    if (course.courseState && course.courseState !== 'ACTIVE') return false;

    var fullName = ((course.name || '') + ' ' + (course.section || '') + ' ' + (course.descriptionHeading || '')).toLowerCase();

    if (targetAcademicYear) {
      var yearMatch = targetAcademicYear.match(/(\d{4})\s*-\s*(\d{4})/);
      if (yearMatch) {
        var startYear = parseInt(yearMatch[1], 10);
        var endYear = parseInt(yearMatch[2], 10);

        for (var y = startYear - 4; y < startYear; y++) {
          var yNext = y + 1;
          var fullPastPattern = y + '-' + yNext;
          var shortPastPattern = (y % 100) + '-' + (yNext % 100);
          if (fullName.includes(fullPastPattern) || fullName.includes(shortPastPattern)) {
            if (!fullName.includes(targetAcademicYear) && !fullName.includes((startYear % 100) + '-' + (endYear % 100))) {
              McpLogger.log('INFO', 'CLASS_FILTER_PAST', 'Excluding past class: ' + course.name + ' (Belongs to past year ' + fullPastPattern + ')');
              return false;
            }
          }
        }
      }
    }

    return true;
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

  scanTextForDriveFiles: function(text, attachFolder, courseName, itemTitle) {
    if (!text) return [];
    var results = [];
    var urlRegex = new RegExp('https?://(?:drive|docs)[.]google[.]com/[^\\s"<>]+', 'gi');
    var matches = text.match(urlRegex);
    if (matches) {
      for (var i = 0; i < matches.length; i++) {
        var u = matches[i];
        var fId = this.extractDriveFileIdFromUrl(u);
        if (fId) {
          var downloaded = this.downloadDriveFileById(fId, 'Doc_' + fId.substring(0, 8), attachFolder, courseName, itemTitle);
          if (downloaded) results.push(downloaded);
        }
      }
    }
    return results;
  },

  downloadDriveFileById: function(fileId, title, attachFolder, courseName, itemTitle) {
    try {
      var cleanCourse = (courseName || '').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      var cleanTitle = (itemTitle || '').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
      var rawTitle = (title || fileId).replace(/(\.pdf)+$/i, '').replace(/\.{2,}/g, '.');
      var targetName = cleanCourse + '_' + cleanTitle + '_' + rawTitle;

      if (!attachFolder) {
        return {
          title: title || targetName,
          targetName: targetName,
          fileId: fileId,
          driveUrl: 'https://drive.google.com/file/d/' + fileId + '/view'
        };
      }

      var existing = attachFolder.getFilesByName(targetName);
      if (existing.hasNext()) {
        var exFile = existing.next();
        return {
          title: title || targetName,
          fileId: exFile.getId(),
          driveUrl: exFile.getUrl()
        };
      }

      var srcFile = null;
      try {
        srcFile = DriveApp.getFileById(fileId);
      } catch (fErr) {}

      if (srcFile) {
        var mime = srcFile.getMimeType();
        if (mime.indexOf('google-apps') !== -1) {
          var token = ScriptApp.getOAuthToken();
          var exportRes = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + fileId + '/export?mimeType=application/pdf', {
            headers: { 'Authorization': 'Bearer ' + token },
            muteHttpExceptions: true
          });
          if (exportRes.getResponseCode() === 200) {
            var cleanPdfTarget = targetName.replace(/(\.pdf)+$/i, '') + '.pdf';
            var pdfBlob = exportRes.getBlob().setName(cleanPdfTarget);
            var createdPdf = attachFolder.createFile(pdfBlob);
            return {
              title: (title || targetName) + ' (PDF)',
              fileId: createdPdf.getId(),
              driveUrl: createdPdf.getUrl()
            };
          }
        } else {
          var copied = srcFile.makeCopy(targetName, attachFolder);
          return {
            title: title || targetName,
            fileId: copied.getId(),
            driveUrl: copied.getUrl()
          };
        }
      } else {
        // Direct Drive v3 API Export/Download
        var token2 = ScriptApp.getOAuthToken();
        var dlRes = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media', {
          headers: { 'Authorization': 'Bearer ' + token2 },
          muteHttpExceptions: true
        });
        if (dlRes.getResponseCode() === 200) {
          var blob = dlRes.getBlob().setName(targetName);
          var fileObj = attachFolder.createFile(blob);
          return {
            title: title || targetName,
            fileId: fileObj.getId(),
            driveUrl: fileObj.getUrl()
          };
        }
      }
    } catch (e) {}
    return null;
  },

  downloadMaterialAttachment: function(mat, attachFolder, courseName, itemTitle) {
    try {
      if (mat.driveFile) {
        var df = mat.driveFile.driveFile || mat.driveFile;
        var fileId = df.id;
        var title = df.title || (mat.driveFile && mat.driveFile.title) || mat.title;
        if (!title || title === 'attachment') {
          title = (itemTitle ? itemTitle + '_file' : (df.name || 'drive_file'));
        }
        var dObj = this.downloadDriveFileById(fileId, title, attachFolder, courseName, itemTitle);
        if (dObj) {
          dObj.alternateLink = df.alternateLink || '';
          dObj.thumbnailUrl = df.thumbnailUrl || '';
          return dObj;
        }
      } else if (mat.link) {
        var linkUrl = mat.link.url || '';
        var embeddedId = this.extractDriveFileIdFromUrl(linkUrl);
        if (embeddedId) {
          var linkDownloaded = this.downloadDriveFileById(embeddedId, mat.link.title || 'DriveLink', attachFolder, courseName, itemTitle);
          if (linkDownloaded) return linkDownloaded;
        }
        return {
          title: mat.link.title || 'Web Link',
          url: linkUrl,
          thumbnailUrl: mat.link.thumbnailUrl || ''
        };
      } else if (mat.youtubeVideo) {
        return {
          title: mat.youtubeVideo.title || 'YouTube Video',
          youtubeUrl: mat.youtubeVideo.alternateLink || '',
          thumbnailUrl: mat.youtubeVideo.thumbnailUrl || ''
        };
      } else if (mat.form) {
        return {
          title: mat.form.title || 'Google Form',
          formUrl: mat.form.formUrl || '',
          responseUrl: mat.form.responseUrl || ''
        };
      }
    } catch (matErr) {}
    return null;
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
  },

  saveTextFile: function(folder, fileName, content) {
    var it = folder.getFilesByName(fileName);
    if (it.hasNext()) {
      var f = it.next();
      f.setContent(content);
      return f;
    }
    return folder.createFile(fileName, content, 'text/plain');
  },

  formatDeepLogReport: function(deepLog, allCourseData) {
    var lines = [];
    lines.push('================================================================================');
    lines.push('       K.I.D.S. GOOGLE CLASSROOM DEEP DIAGNOSTIC AUDIT & CRAWL LOG');
    lines.push('================================================================================');
    lines.push('Generated At    : ' + deepLog.timestamp);
    lines.push('Student / Child : ' + deepLog.childName);
    lines.push('Academic Year   : ' + deepLog.academicYear);
    lines.push('Sync Execution  : ' + (deepLog.extractOnly ? 'Direct Read-Only Gateway (0 student drive files)' : 'Full Sync'));
    lines.push('Execution Time  : ' + (deepLog.executionTimeMs || 0) + ' ms');
    lines.push('');
    lines.push('--------------------------------------------------------------------------------');
    lines.push('1. EXECUTIVE AUDIT SUMMARY');
    lines.push('--------------------------------------------------------------------------------');
    lines.push('• Active Courses In Account : ' + deepLog.summary.totalCoursesFound);
    lines.push('• Current-Year Ingested     : ' + deepLog.summary.coursesIngested);
    lines.push('• Announcements Extracted   : ' + deepLog.summary.totalAnnouncements);
    lines.push('• CourseWork Assignments    : ' + deepLog.summary.totalCourseWork);
    lines.push('• Course Reference Materials: ' + deepLog.summary.totalMaterials);
    lines.push('• Total Detected Attachments: ' + deepLog.summary.totalAttachments);
    lines.push('    ├─ Downloadable Drive Files : ' + deepLog.summary.driveFilesCount + ' unique');
    lines.push('    ├─ YouTube Video Links      : ' + deepLog.summary.youtubeVideosCount + ' (streamed in browser)');
    lines.push('    ├─ External Web Links       : ' + deepLog.summary.webLinksCount);
    lines.push('    ├─ Google Forms             : ' + deepLog.summary.formsCount);
    lines.push('    └─ Duplicate Attachments    : ' + deepLog.summary.duplicateAttachmentsCount + ' (shared across notices)');
    lines.push('');
    lines.push('--------------------------------------------------------------------------------');
    lines.push('2. COURSE BREAKDOWN & PAGINATION AUDIT');
    lines.push('--------------------------------------------------------------------------------');
    for (var c = 0; c < allCourseData.length; c++) {
      var course = allCourseData[c];
      lines.push('[' + (c + 1) + '] Course: ' + course.name + (course.section ? ' (' + course.section + ')' : ''));
      lines.push('    Course ID    : ' + course.id);
      lines.push('    Course State : ' + course.courseState);
      lines.push('    Class Link   : ' + (course.alternateLink || 'N/A'));
      lines.push('    Content Audit: ' + (course.announcements ? course.announcements.length : 0) + ' announcements, ' +
        (course.courseWork ? course.courseWork.length : 0) + ' coursework items, ' +
        (course.materials ? course.materials.length : 0) + ' materials.');
      lines.push('');
    }
    lines.push('--------------------------------------------------------------------------------');
    lines.push('3. ITEMIZED ATTACHMENT INVENTORY (ALL ' + deepLog.inventory.length + ' DETECTED ITEMS)');
    lines.push('--------------------------------------------------------------------------------');
    lines.push(this.padRight('#', 4) + ' | ' + this.padRight('TYPE', 15) + ' | ' + this.padRight('TITLE / TARGET NAME', 40) + ' | ' + 'FILE ID / URL');
    lines.push('--------------------------------------------------------------------------------');
    for (var i = 0; i < deepLog.inventory.length; i++) {
      var item = deepLog.inventory[i];
      var idxStr = this.padRight(String(item.index), 4);
      var typeStr = this.padRight(item.type, 15);
      var titleStr = this.padRight((item.title || item.targetName || '').substring(0, 38), 40);
      var idStr = (item.fileId || item.url || '').substring(0, 45);
      lines.push(idxStr + ' | ' + typeStr + ' | ' + titleStr + ' | ' + idStr);
    }
    lines.push('');
    lines.push('--------------------------------------------------------------------------------');
    lines.push('4. DETAILED EXECUTION TIMELINE');
    lines.push('--------------------------------------------------------------------------------');
    for (var t = 0; t < deepLog.logTimeline.length; t++) {
      lines.push(deepLog.logTimeline[t]);
    }
    lines.push('================================================================================');
    lines.push('                    END OF CLASSROOM DEEP DIAGNOSTIC AUDIT LOG');
    lines.push('================================================================================');
    return lines.join('\n');
  },

  padRight: function(str, len) {
    str = String(str || '');
    while (str.length < len) str += ' ';
    return str;
  },

  mergeClassroomData: function(existing, incoming) {
    if (!existing || !existing.courses) return incoming;
    if (!incoming || !incoming.courses) return existing;

    var mergedCourses = existing.courses.slice();
    for (var i = 0; i < incoming.courses.length; i++) {
      var inCourse = incoming.courses[i];
      var exIdx = -1;
      for (var j = 0; j < mergedCourses.length; j++) {
        if (mergedCourses[j].id === inCourse.id) {
          exIdx = j;
          break;
        }
      }
      if (exIdx === -1) {
        mergedCourses.push(inCourse);
      } else {
        var exCourse = mergedCourses[exIdx];
        var annMap = {};
        var combinedAnn = [];
        (inCourse.announcements || []).concat(exCourse.announcements || []).forEach(function(a) {
          if (a && a.id && !annMap[a.id]) {
            annMap[a.id] = true;
            combinedAnn.push(a);
          }
        });
        var cwMap = {};
        var combinedCw = [];
        (inCourse.courseWork || []).concat(exCourse.courseWork || []).forEach(function(cw) {
          if (cw && cw.id && !cwMap[cw.id]) {
            cwMap[cw.id] = true;
            combinedCw.push(cw);
          }
        });
        var matMap = {};
        var combinedMat = [];
        (inCourse.materials || []).concat(exCourse.materials || []).forEach(function(m) {
          if (m && m.id && !matMap[m.id]) {
            matMap[m.id] = true;
            combinedMat.push(m);
          }
        });
        mergedCourses[exIdx] = {
          id: inCourse.id,
          name: inCourse.name || exCourse.name,
          section: inCourse.section || exCourse.section,
          descriptionHeading: inCourse.descriptionHeading || exCourse.descriptionHeading,
          room: inCourse.room || exCourse.room,
          alternateLink: inCourse.alternateLink || exCourse.alternateLink,
          courseState: inCourse.courseState || exCourse.courseState,
          announcements: combinedAnn,
          courseWork: combinedCw,
          materials: combinedMat
        };
      }
    }
    return {
      kidName: incoming.kidName || existing.kidName,
      academicYear: incoming.academicYear || existing.academicYear,
      lastSyncedAt: incoming.lastSyncedAt || new Date().toISOString(),
      totalCourses: mergedCourses.length,
      totalAttachments: mergedCourses.reduce(function(acc, c) {
        var annAtts = (c.announcements || []).reduce(function(a, x) { return a + (x.attachments ? x.attachments.length : 0); }, 0);
        var cwAtts = (c.courseWork || []).reduce(function(a, x) { return a + (x.attachments ? x.attachments.length : 0); }, 0);
        var matAtts = (c.materials || []).reduce(function(a, x) { return a + (x.attachments ? x.attachments.length : 0); }, 0);
        return acc + annAtts + cwAtts + matAtts;
      }, 0),
      courses: mergedCourses
    };
  }
};
