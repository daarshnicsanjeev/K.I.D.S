/**
 * DigestBuilder.gs - AI-Ready Daily & Master Timeline Generator
 * Synthesizes Classroom coursework, school emails, and portal snapshots into
 * latest_digest.md and master_timeline.json in Google Drive for Gemini Spark.
 */
var DigestBuilder = {
  build: function(targetFolderId, childName, academicYear) {
    try {
      var parentFolder = DriveApp.getFolderById(targetFolderId);
      var digestFolder = this.getOrCreateSubfolder(parentFolder, 'daily_digests');

      var classroomData = this.readJsonFile(parentFolder, 'classroom/classroom_data.json');
      var emailData = this.readJsonFile(parentFolder, 'emails/school_emails.json');
      var portalStatus = this.readJsonFile(parentFolder, 'portals/portals_status.json');

      var md = '# 🎓 ' + childName + ' - Daily School Intelligence Digest\n';
      md += '**Academic Year**: ' + (academicYear || '2026-2027') + ' | **Updated**: ' + new Date().toLocaleString() + '\n\n';

      // 1. Action Items & Coursework
      md += '## 📝 Google Classroom & Assignments\n';
      if (classroomData && classroomData.courses && classroomData.courses.length > 0) {
        for (var c = 0; c < classroomData.courses.length; c++) {
          var course = classroomData.courses[c];
          if (course.courseWork && course.courseWork.length > 0) {
            md += '### ' + course.name + '\n';
            for (var w = 0; w < course.courseWork.length; w++) {
              var work = course.courseWork[w];
              var dueStr = work.dueDate ? (work.dueDate.year + '-' + work.dueDate.month + '-' + work.dueDate.day) : 'No due date';
              var subState = (work.submission && work.submission.state) ? work.submission.state : 'ASSIGNED';
              var gradeStr = (work.submission && work.submission.assignedGrade !== null) ? (' - Grade: ' + work.submission.assignedGrade + '/' + work.maxPoints) : '';

              md += '* **' + work.title + '** (Due: ' + dueStr + ') [' + subState + gradeStr + ']\n';
            }
          }
        }
      } else {
        md += '_No active Google Classroom courses or assignments._\n\n';
      }

      // 2. School Circulars & Emails
      md += '\n## 📢 School Circulars & Notices (Gmail)\n';
      if (emailData && emailData.emails && emailData.emails.length > 0) {
        for (var e = 0; e < Math.min(emailData.emails.length, 10); e++) {
          var email = emailData.emails[e];
          md += '* **' + email.subject + '** (' + email.from + ' - ' + (email.date ? email.date.substring(0, 10) : '') + ')\n';
          if (email.attachments && email.attachments.length > 0) {
            md += '  - _Attachments_: ' + email.attachments.map(function(a) { return a.name; }).join(', ') + '\n';
          }
        }
      } else {
        md += '_No recent school circular emails._\n\n';
      }

      // 3. Portal Health
      md += '\n## 🌐 School Portals Status\n';
      if (portalStatus && portalStatus.domains && portalStatus.domains.length > 0) {
        for (var p = 0; p < portalStatus.domains.length; p++) {
          var pDom = portalStatus.domains[p];
          var icon = pDom.status === 'ACTIVE' ? '🟢' : '⚠️';
          md += '* ' + icon + ' **' + pDom.domain + '**: ' + pDom.message + '\n';
        }
      } else {
        md += '_No external school portals registered._\n\n';
      }

      // Save latest_digest.md
      this.saveTextFile(digestFolder, 'latest_digest.md', md);

      // Save master_timeline.json
      var masterTimeline = {
        kidName: childName,
        academicYear: academicYear,
        generatedAt: new Date().toISOString(),
        classroom: classroomData || null,
        emails: emailData || null,
        portals: portalStatus || null
      };
      this.saveJsonFile(digestFolder, 'master_timeline.json', masterTimeline);

      McpLogger.log('SUCCESS', 'DIGEST_BUILD_COMPLETE', 'Generated latest_digest.md and master_timeline.json for ' + childName);
      return { success: true };
    } catch (err) {
      McpLogger.log('ERROR', 'DIGEST_BUILD_ERROR', 'Digest build error: ' + err.toString());
      throw err;
    }
  },

  getOrCreateSubfolder: function(parentFolder, name) {
    var it = parentFolder.getFoldersByName(name);
    if (it.hasNext()) return it.next();
    return parentFolder.createFolder(name);
  },

  readJsonFile: function(parentFolder, relativePath) {
    try {
      var parts = relativePath.split('/');
      var current = parentFolder;
      for (var i = 0; i < parts.length - 1; i++) {
        var it = current.getFoldersByName(parts[i]);
        if (!it.hasNext()) return null;
        current = it.next();
      }
      var fIt = current.getFilesByName(parts[parts.length - 1]);
      if (fIt.hasNext()) {
        var content = fIt.next().getBlob().getDataAsString();
        return JSON.parse(content);
      }
    } catch (e) {}
    return null;
  },

  saveTextFile: function(folder, fileName, text) {
    var it = folder.getFilesByName(fileName);
    if (it.hasNext()) {
      var file = it.next();
      file.setContent(text);
      return file;
    }
    return folder.createFile(fileName, text, 'text/markdown');
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
