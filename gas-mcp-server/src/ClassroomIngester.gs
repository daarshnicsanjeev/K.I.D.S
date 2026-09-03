/**
 * ClassroomIngester.gs - Autonomous Google Classroom Ingestion Engine
 * Crawls active courses, coursework, student submissions, grades,
 * teacher comments, meet links, and downloads all attached worksheets/PDFs.
 */
var ClassroomIngester = {
  sync: function(targetFolderId, childName, academicYear, isIncremental) {
    try {
      McpLogger.log('INFO', 'CLASSROOM_SYNC_START', 'Starting Google Classroom crawl for ' + childName);

      var parentFolder = DriveApp.getFolderById(targetFolderId);
      var classroomFolder = this.getOrCreateSubfolder(parentFolder, 'classroom');
      var attachFolder = this.getOrCreateSubfolder(classroomFolder, 'attachments');

      var courses = this.fetchAllCourses(academicYear);
      var allCourseData = [];
      var totalAttachments = 0;

      for (var i = 0; i < courses.length; i++) {
        var course = courses[i];
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

        // Announcements (with full attachment downloads & Drive link scanning)
        try {
          var annRes = Classroom.Courses.Announcements.list(course.id, { pageSize: 30 });
          if (annRes && annRes.announcements) {
            for (var aIdx = 0; aIdx < annRes.announcements.length; aIdx++) {
              var a = annRes.announcements[aIdx];
              var annItem = {
                id: a.id,
                text: a.text || '',
                alternateLink: a.alternateLink || '',
                creationTime: a.creationTime,
                updateTime: a.updateTime,
                materials: a.materials || [],
                attachments: []
              };

              // 1. Download materials attached to announcement
              if (a.materials && a.materials.length > 0) {
                for (var am = 0; am < a.materials.length; am++) {
                  var aMat = a.materials[am];
                  var aDownloaded = this.downloadMaterialAttachment(aMat, attachFolder, course.name, 'Ann_' + (a.text ? a.text.substring(0, 15) : a.id));
                  if (aDownloaded) {
                    annItem.attachments.push(aDownloaded);
                    totalAttachments++;
                  }
                }
              }

              // 2. Scan announcement text body for embedded Google Drive links
              if (a.text) {
                var textDocs = this.scanTextForDriveFiles(a.text, attachFolder, course.name, 'AnnText_' + a.id);
                for (var td = 0; td < textDocs.length; td++) {
                  annItem.attachments.push(textDocs[td]);
                  totalAttachments++;
                }
              }

              courseData.announcements.push(annItem);
            }
          }
        } catch (annErr) {
          McpLogger.log('WARN', 'CLASSROOM_ANN_WARN', 'Could not fetch announcements for ' + course.name + ': ' + annErr);
        }

        // CourseWork (Assignments & Worksheets)
        try {
          var cwRes = Classroom.Courses.CourseWork.list(course.id, { pageSize: 50 });
          if (cwRes && cwRes.courseWork) {
            for (var j = 0; j < cwRes.courseWork.length; j++) {
              var cw = cwRes.courseWork[j];
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
                }
              } catch (subErr) {}

              // 1. Download attached materials
              if (cw.materials && cw.materials.length > 0) {
                for (var m = 0; m < cw.materials.length; m++) {
                  var mat = cw.materials[m];
                  var downloaded = this.downloadMaterialAttachment(mat, attachFolder, course.name, cw.title);
                  if (downloaded) {
                    cwItem.attachments.push(downloaded);
                    totalAttachments++;
                  }
                }
              }

              // 2. Scan assignment description for embedded Google Drive links
              if (cw.description) {
                var descDocs = this.scanTextForDriveFiles(cw.description, attachFolder, course.name, cw.title);
                for (var dd = 0; dd < descDocs.length; dd++) {
                  cwItem.attachments.push(descDocs[dd]);
                  totalAttachments++;
                }
              }

              courseData.courseWork.push(cwItem);
            }
          }
        } catch (cwErr) {
          McpLogger.log('WARN', 'CLASSROOM_CW_WARN', 'Could not fetch coursework for ' + course.name + ': ' + cwErr);
        }

        // Materials (Reference Resources)
        try {
          var matRes = Classroom.Courses.CourseWorkMaterials.list(course.id, { pageSize: 30 });
          if (matRes && matRes.courseWorkMaterial) {
            for (var k = 0; k < matRes.courseWorkMaterial.length; k++) {
              var cwm = matRes.courseWorkMaterial[k];
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
                  }
                }
              }

              if (cwm.description) {
                var cwmDocs = this.scanTextForDriveFiles(cwm.description, attachFolder, course.name, cwm.title);
                for (var cd = 0; cd < cwmDocs.length; cd++) {
                  matItem.attachments.push(cwmDocs[cd]);
                  totalAttachments++;
                }
              }

              courseData.materials.push(matItem);
            }
          }
        } catch (matErr) {}

        allCourseData.push(courseData);
      }

      var manifestPayload = {
        kidName: childName,
        academicYear: academicYear,
        lastSyncedAt: new Date().toISOString(),
        totalCourses: allCourseData.length,
        totalAttachments: totalAttachments,
        courses: allCourseData
      };

      this.saveJsonFile(classroomFolder, 'classroom_data.json', manifestPayload);
      McpLogger.log('SUCCESS', 'CLASSROOM_SYNC_COMPLETE', 'Successfully crawled ' + allCourseData.length + ' courses and vaulted ' + totalAttachments + ' attachments for ' + childName);

      return manifestPayload;
    } catch (err) {
      McpLogger.log('ERROR', 'CLASSROOM_SYNC_ERROR', 'Google Classroom sync failed: ' + err.toString());
      throw err;
    }
  },

  fetchAllCourses: function(academicYear) {
    var courses = [];
    try {
      // Strictly query ACTIVE courses only
      var res = Classroom.Courses.list({ studentId: 'me', courseStates: ['ACTIVE'] });
      if (res && res.courses) courses = res.courses;
    } catch (e) {
      try {
        var fallbackRes = Classroom.Courses.list({ courseStates: ['ACTIVE'] });
        if (fallbackRes && fallbackRes.courses) courses = fallbackRes.courses;
      } catch (e2) {}
    }

    var self = this;
    var filtered = courses.filter(function(c) {
      return self.isCurrentClass(c, academicYear);
    });

    McpLogger.log('INFO', 'CLASSROOM_COURSES_FILTERED', 'Found ' + courses.length + ' active courses in account; filtered to ' + filtered.length + ' current-year classes.');
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
    var match = url.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
    if (match) return match[1];
    var idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
    if (idMatch) return idMatch[1];
    var openMatch = url.match(/\/open\?id=([a-zA-Z0-9_-]{20,})/);
    if (openMatch) return openMatch[1];
    return null;
  },

  scanTextForDriveFiles: function(text, attachFolder, courseName, itemTitle) {
    if (!text) return [];
    var results = [];
    var urlRegex = /(https?:\/\/(?:drive|docs)\.google\.com\/[^\s"')<>]+)/gi;
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
      var targetName = cleanCourse + '_' + cleanTitle + '_' + (title || fileId);

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
            var pdfBlob = exportRes.getBlob().setName(targetName + '.pdf');
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
      if (mat.driveFile && mat.driveFile.driveFile) {
        var df = mat.driveFile.driveFile;
        var fileId = df.id;
        var title = df.title || 'attachment';
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
  }
};
