var CONFIG = {
  accessKey: "default_key",
  childName: "Atharva",
  academicYear: "2026-2027"
};

var McpLogger = {
  MAX_LOGS: 100,
  log: function(level, action, details) {
    try {
      var entry = {
        time: new Date().toISOString(),
        level: level,
        action: action,
        details: typeof details === 'object' ? JSON.stringify(details) : String(details)
      };
      var props = (typeof PropertiesService !== 'undefined' && typeof PropertiesService.getUserProperties === 'function')
        ? PropertiesService.getUserProperties()
        : (typeof PropertiesService !== 'undefined' && typeof PropertiesService.getScriptProperties === 'function' ? PropertiesService.getScriptProperties() : null);
      if (!props) return;
      var raw = props.getProperty('mcp_execution_logs');
      var logs = raw ? JSON.parse(raw) : [];
      logs.unshift(entry);
      if (logs.length > this.MAX_LOGS) {
        logs = logs.slice(0, this.MAX_LOGS);
      }
      props.setProperty('mcp_execution_logs', JSON.stringify(logs));
    } catch (e) {
      if (typeof Logger !== 'undefined' && Logger.log) Logger.log('Log write error: ' + e);
    }
  },
  getLogs: function() {
    try {
      var props = PropertiesService.getUserProperties();
      var raw = props.getProperty('mcp_execution_logs');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [{ time: new Date().toISOString(), level: 'ERROR', action: 'getLogs', details: e.toString() }];
    }
  },
  clearLogs: function() {
    try {
      PropertiesService.getUserProperties().deleteProperty('mcp_execution_logs');
      return true;
    } catch (e) {
      return false;
    }
  },
  saveToVault: function(kidFolder) {
    if (!kidFolder) return false;
    try {
      var payload = JSON.stringify({
        updatedAt: new Date().toISOString(),
        logs: this.getLogs()
      }, null, 2);
      var it = kidFolder.getFilesByName('sync_diagnostics_log.json');
      if (it.hasNext()) {
        var f = it.next();
        var curLog = (typeof f.getBlob === 'function') ? f.getBlob().getDataAsString() : (typeof f.getContent === 'function' ? f.getContent() : '');
        if (curLog !== payload) {
          f.setContent(payload);
        }
      } else {
        kidFolder.createFile('sync_diagnostics_log.json', payload, 'application/json');
      }
      return true;
    } catch (e) {
      return false;
    }
  }
};

function testAuth() {
  var services = {};
  var errors = [];
  var isMasterWorker = (typeof CONFIG !== 'undefined' && CONFIG.childName === 'Master') ||
                       (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties().getProperty('multi_child_school_registry') !== null);

  // 1. Google Drive Scope (DriveApp) - Required for both Master and School
  try {
    services.drive = DriveApp.getRootFolder().getName() ? true : false;
  } catch (eDrive) {
    errors.push("Google Drive: " + (eDrive.message || eDrive.toString()));
  }

  // 2. Automated Script Triggers Scope (ScriptApp) - Required for both Master and School
  try {
    var trigs = ScriptApp.getProjectTriggers();
    services.triggers = (trigs && trigs.length !== undefined) ? trigs.length : 0;
  } catch (eTrig) {
    errors.push("Automated Triggers (ScriptApp): " + (eTrig.message || eTrig.toString()));
  }

  // School-worker-only scopes: Classroom and Gmail are only verified if this is a School Worker
  if (!isMasterWorker) {
    // 3. Gmail Scope (GmailApp)
    try {
      services.gmail = GmailApp.getInboxThreads(0, 1) ? true : false;
    } catch (eGmail) {
      errors.push("Gmail: " + (eGmail.message || eGmail.toString()));
    }

    // 4. Classroom Scope (Classroom API)
    try {
      if (typeof Classroom !== 'undefined' && Classroom.Courses) {
        Classroom.Courses.list({ pageSize: 1 });
        services.classroom = true;
      }
    } catch (eClass) {
      var cMsg = (eClass.message || eClass.toString());
      if (cMsg.includes('permission') || cMsg.includes('oauth') || cMsg.includes('Access denied') || cMsg.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
        errors.push("Google Classroom: " + cMsg);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error("Missing required Google permissions: " + errors.join("; "));
  }

  McpLogger.log('INFO', 'testAuth', (isMasterWorker ? 'Master Personal Worker' : 'School Worker') + ' permissions verified successfully.');
  return { ok: true, authorized: true, isMaster: isMasterWorker, services: services };
}

function doGet(e) {
  // 1. One-time Parent Consent Handshake & Autonomous Trigger Provisioning
  if (!e || !e.parameter || !e.parameter.accessKey || e.parameter.auth === 'true' || e.parameter.authInit === 'true') {
    try {
      if (typeof Classroom !== 'undefined' && Classroom.Courses) {
        Classroom.Courses.list({ pageSize: 1 });
      }
    } catch (err) {}

    var wType = (e && e.parameter && e.parameter.workerType) ? e.parameter.workerType : '';
    var isDual = (e && e.parameter && (e.parameter.dualWorker === 'true' || e.parameter.isDualWorker === 'true'));
    if (isDual || wType === 'school') {
      try {
        PropertiesService.getScriptProperties().setProperty('is_dual_worker', 'true');
      } catch (pErr) {}
    }

    var authError = null;
    try {
      if (wType === 'school' && typeof Classroom !== 'undefined' && Classroom.Courses) {
        Classroom.Courses.list({ pageSize: 1 });
      }
      if (typeof setupAutonomousTriggers === 'function') {
        var triggerRes = setupAutonomousTriggers(wType);
        if (triggerRes && (triggerRes.status === 'error' || triggerRes.success === false)) {
          authError = triggerRes.error || 'Required permissions were not granted.';
        }
      }
    } catch (err) {
      authError = (err && err.message) ? err.message : 'You unchecked required permissions. Automated sync cannot function without these permissions.';
      try {
        if (typeof clearAllProjectTriggers === 'function') {
          clearAllProjectTriggers();
        }
      } catch (clErr) {}
    }

    if (authError) {
      return HtmlService.createHtmlOutput(
        '<!DOCTYPE html><html><head><meta charset="utf-8">' +
        '<title>⚠️ Authorization Incomplete</title>' +
        '<style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:85vh;margin:0;background:#f8fafc;color:#0f172a;}' +
        '.box{background:white;padding:32px;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.08);text-align:center;max-width:380px;width:90%;}' +
        'h3{margin-top:0;font-size:20px;font-weight:700;color:#dc2626;}' +
        'p{color:#64748b;font-size:14px;line-height:1.5;margin:10px 0 16px 0;}' +
        '.btn{display:inline-block;margin-top:16px;background:#dc2626;color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;box-shadow:0 2px 5px rgba(0,0,0,0.1);}' +
        '</style></head>' +
        '<body><div class="box"><h3>⚠️ Missing Permissions</h3>' +
        '<p style="color:#b91c1c; font-weight:500;">' + authError + '</p>' +
        '<p style="font-size:12px; color:#64748b;">Please close this window, return to K.I.D.S., deploy again, and check ALL boxes on the Google authorization screen.</p>' +
        '<button class="btn" onclick="closeWin()">Close Window</button></div>' +
        '<script>' +
        'function closeWin() { try { google.script.host.close(); } catch(e) {} try { window.top.close(); } catch(e) {} try { window.close(); } catch(e) {} }' +
        'setTimeout(closeWin, 4000);' +
        '</script></body></html>'
      ).setTitle('⚠️ Authorization Incomplete');
    }

    var workerTitle = (wType === 'master') ? 'Personal Master Cloud Worker' : 'School Cloud Worker';
    return HtmlService.createHtmlOutput(
      '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<title>K.I.D.S. Cloud Sync Authorization - Success</title>' +
      '<style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:85vh;margin:0;background:#f8fafc;color:#0f172a;}' +
      '.box{background:white;padding:32px;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.08);text-align:center;max-width:380px;width:90%;}' +
      'h3{margin-top:0;font-size:20px;font-weight:700;color:#16a34a;}' +
      'p{color:#64748b;font-size:14px;line-height:1.5;margin:10px 0 16px 0;}' +
      '.badge{padding:6px 14px;border-radius:20px;font-weight:600;font-size:12px;display:inline-block;margin-top:10px;background:#dcfce7;color:#166534;}' +
      '.btn{display:inline-block;margin-top:16px;background:#16a34a;color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;box-shadow:0 2px 5px rgba(0,0,0,0.1);}' +
      '</style></head>' +
      '<body><div class="box"><h3 id="authHeader">✅ Authorization Successful!</h3>' +
      '<p id="authSub">' + workerTitle + ' permissions verified.</p>' +
      '<div id="triggerBadge" class="badge">⚡ Closing automatically in 1.5 seconds...</div>' +
      '<div id="btnArea"><button id="actionBtn" class="btn" onclick="closeWin()">Close Window</button></div></div>' +
      '<script>' +
      'function closeWin() {' +
      '  try { google.script.host.close(); } catch(e) {}' +
      '  try { window.top.close(); } catch(e) {}' +
      '  try { window.close(); } catch(e) {}' +
      '}' +
      'try {' +
      '  if (typeof google !== "undefined" && google.script && google.script.run) {' +
      '    /* triggers and permissions already verified on server */' +
      '  }' +
      '} catch (e) {}' +
      'setTimeout(closeWin, 1500);' +
      '</script></body></html>'
    ).setTitle('K.I.D.S. Cloud Sync Authorization - Success');
  }

  if (typeof CONFIG !== 'undefined' && e.parameter.accessKey !== CONFIG.accessKey) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized access key." }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (e.parameter.action === 'getLogs') {
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      logs: McpLogger.getLogs()
    })).setMimeType(ContentService.MimeType.JSON);
  }
  if (e.parameter.action === 'clearLogs') {
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      cleared: McpLogger.clearLogs()
    })).setMimeType(ContentService.MimeType.JSON);
  }
  if (e.parameter.action === 'clearTriggers' || e.parameter.action === 'clearAllTriggers') {
    var cRes = clearAllProjectTriggers();
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      result: cRes
    })).setMimeType(ContentService.MimeType.JSON);
  }
  if (e.parameter.action === 'setupTriggers') {
    var res = setupAutonomousTriggers(e.parameter.workerType);
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      result: res
    })).setMimeType(ContentService.MimeType.JSON);
  }
  if (e.parameter.action === 'pauseNightlySync') {
    var pRes = pauseNightlySyncTriggers();
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      result: pRes
    })).setMimeType(ContentService.MimeType.JSON);
  }
  if (e.parameter.action === 'resumeMorningSync') {
    var rRes = resumeMorningSyncTriggers();
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      result: rRes
    })).setMimeType(ContentService.MimeType.JSON);
  }
  if (e.parameter.action === 'testAuth' || e.parameter.action === 'test_auth') {
    try {
      var aRes = testAuth();
      return ContentService.createTextOutput(JSON.stringify({
        status: "ok",
        result: aRes
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (aErr) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        error: { message: aErr.message || String(aErr) }
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    version: "4.4.0",
    name: "Kids Intelligent Dashboard System (K.I.D.S.) Cloud Ingestion Engine"
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No POST payload received.");
    }

    var json = JSON.parse(e.postData.contents);
    var method = json.method;
    var params = json.params || {};
    var id = json.id;

    var passedKey = (e.parameter && e.parameter.accessKey) || (params && params.accessKey) || (json && json.accessKey);
    if (typeof CONFIG !== 'undefined' && CONFIG.accessKey && CONFIG.accessKey !== 'default_key' && passedKey !== CONFIG.accessKey) {
      return ContentService.createTextOutput(JSON.stringify({
        jsonrpc: "2.0",
        id: id !== undefined ? id : null,
        error: { code: -32000, message: "Unauthorized access key." }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var result;

    if (method === "initialize") {
      result = {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "K.I.D.S. Cloud Ingestion Engine", version: "4.0.0" }
      };
    } else if (method === "notifications/initialized") {
      return ContentService.createTextOutput(JSON.stringify({ jsonrpc: "2.0", id: id !== undefined ? id : null })).setMimeType(ContentService.MimeType.JSON);
    } else if (method === "tools/list") {
      result = handleToolsList();
    } else if (method === "test_auth" || method === "testAuth") {
      result = testAuth();
    } else if (method === "tools/call") {
      result = handleToolsCall(params.name, params.arguments || {});
    } else if (method === "sync_classroom_and_gmail" || method === "extract_classroom_and_gmail") {
      result = handleSyncClassroomAndGmail(params);
    } else if (method === "sync_all_portals") {
      result = handleSyncAllPortals(params);
    } else if (method === "sync_child_portal_burst" || method === "sync_portal_burst") {
      var childTarget = params ? (params.childId || params.childName) : null;
      result = PortalIngester.syncChildBurst(childTarget);
    } else if (method === "register_school_worker") {
      result = handleRegisterSchoolWorker(params);
    } else if (method === "push_school_data" || method === "save_pushed_school_data") {
      result = handlePushSchoolData(params);
    } else if (method === "sync_master_cloud_school") {
      var tChild = params ? (params.childId || params.childName || params.targetChild) : null;
      var initPass = params ? (params.isInitialPass === true || params.initialPass === true) : false;
      result = runMasterCloudSchoolSync(params && (params.force === true || params.manual === true), tChild, initPass);
    } else if (method === "register_portal_job" || method === "register_mcp_tool") {
      result = handleRegisterPortalJob(params);
    } else if (method === "setup_triggers") {
      result = handleSetupTriggers(params);
    } else if (method === "pause_nightly_sync") {
      result = pauseNightlySyncTriggers();
    } else if (method === "resume_morning_sync") {
      result = resumeMorningSyncTriggers();
    } else if (method === "get_file_blob") {
      result = handleGetFileBlob(params);
    } else if (method === "get_gmail_attachment") {
      result = handleGetGmailAttachment(params);
    } else if (method === "get_vault_file") {
      result = handleGetVaultFile(params);
    } else if (method === "list_vault_files") {
      result = handleListVaultFiles(params);
    } else if (method === "save_vault_file") {
      result = handleSaveVaultFile(params);
    } else if (method === "search_vault_documents") {
      var kidFolder = null;
      var targetFolderId = params.targetFolderId || PropertiesService.getScriptProperties().getProperty('target_folder_id');
      if (targetFolderId) {
        try { kidFolder = DriveApp.getFolderById(targetFolderId); } catch (e) {}
      }
      result = DocumentOcrService.searchVaultDocuments(kidFolder, params.query);
    } else if (method === "index_whatsapp_media") {
      result = DocumentOcrService.indexDocumentById(params.fileId, params.childName, 'whatsapp', params.targetFolderId);
    } else if (method === "ocr_single_file" || method === "index_vault_file_ocr") {
      result = DocumentOcrService.indexDocumentById(params.fileId, params.childName, params.source || 'classroom', params.targetFolderId);
    } else if (method === "activate_incremental_triggers") {
      result = handleActivateIncrementalTriggers(params);
    } else if (method === "run_vault_ocr_indexing") {
      var ocrLock = LockService.getScriptLock();
      if (!ocrLock.tryLock(5000)) {
        result = { success: false, error: 'Lock busy: sync or OCR already running', locked: true };
      } else {
        try {
          var kidFolder = null;
          var targetFolderId = params.targetFolderId || PropertiesService.getScriptProperties().getProperty('target_folder_id');
          if (targetFolderId) {
            try { kidFolder = DriveApp.getFolderById(targetFolderId); } catch (e) {}
          }
          result = DocumentOcrService.runAutomatedVaultIndexing(kidFolder, params.maxBatch || 15);
          if (result && result.totalPendingRemaining > 0 && params.scheduleContinuation !== false) {
            try {
              var ocrTrigs = ScriptApp.getProjectTriggers();
              for (var ot = 0; ot < ocrTrigs.length; ot++) {
                if (ocrTrigs[ot].getHandlerFunction() === 'runAutonomousVaultOcr') {
                  ScriptApp.deleteTrigger(ocrTrigs[ot]);
                }
              }
              ScriptApp.newTrigger('runAutonomousVaultOcr').timeBased().after(20000).create();
              result.continuationScheduled = true;
              McpLogger.log('INFO', 'OCR_CONTINUATION_TRIGGER_SET', 'Scheduled autonomous OCR continuation in 20s. Remaining: ' + result.totalPendingRemaining);
            } catch (ocrContErr) {}
          }
        } finally {
          ocrLock.releaseLock();
        }
      }
    } else if (method === "run_autonomous_vault_ocr") {
      result = runAutonomousVaultOcr();
    } else if (method === "set_sync_state" || method === "set_initial_sync_complete") {
      result = handleSetSyncState(params);
    } else if (method === "clear_triggers" || method === "clearTriggers") {
      var allTriggers = ScriptApp.getProjectTriggers();
      var clearedCount = 0;
      for (var ct = 0; ct < allTriggers.length; ct++) {
        ScriptApp.deleteTrigger(allTriggers[ct]);
        clearedCount++;
      }
      result = { success: true, clearedCount: clearedCount };
    } else {
      throw new Error("Method not supported: " + method);
    }

    return ContentService.createTextOutput(JSON.stringify({
      jsonrpc: "2.0",
      id: id !== undefined ? id : null,
      result: result
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32603, message: err.toString() }
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleSyncClassroomAndGmail(params) {
  try { McpLogger.log('INFO', 'HANDLE_SYNC_CLASSROOM_GMAIL_CALLED', 'childName=' + params.childName + ' extractOnly=' + params.extractOnly + ' isIncremental=' + params.isIncremental + ' targetFolderId=' + params.targetFolderId); } catch (logErr) {}
  var isWriting = !params.extractOnly && !!params.targetFolderId;
  var lock = isWriting ? LockService.getScriptLock() : null;
  if (lock && !lock.tryLock(30000)) {
    return { success: false, locked: true, error: "Script lock busy: sync in progress" };
  }
  try {
    var folderId = params.targetFolderId || PropertiesService.getScriptProperties().getProperty('target_folder_id') || null;
    var childName = params.childName || 'Atharva';
    var academicYear = params.academicYear || '2026-2027';
    var schoolDomain = params.schoolDomain || '';

    if (folderId) {
      try {
        PropertiesService.getScriptProperties().setProperties({
          target_folder_id: folderId,
          child_name: childName,
          academic_year: academicYear,
          school_domain: schoolDomain
        });
      } catch (pErr) {}
    }

    var classroomRes = ClassroomIngester.sync(folderId, childName, academicYear, !!params.isIncremental, !!params.extractOnly);
    var gmailRes = null;
    try {
      gmailRes = GmailIngester.sync(folderId, childName, academicYear, schoolDomain, !!params.isIncremental, !!params.extractOnly);
    } catch (gErr) {
      McpLogger.log('WARN', 'GMAIL_SYNC_WARN', 'Gmail sync error: ' + gErr);
      gmailRes = {
        kidName: childName,
        academicYear: academicYear,
        schoolDomain: schoolDomain || '',
        lastSyncedAt: new Date().toISOString(),
        totalEmails: 0,
        totalAttachments: 0,
        emails: [],
        error: gErr.toString()
      };
    }
    var digestRes = null;
    try {
      if (folderId && !params.extractOnly) {
        digestRes = DigestBuilder.build(folderId, childName, academicYear);
      }
    } catch (dErr) {
      McpLogger.log('WARN', 'DIGEST_BUILD_SKIP', 'Skipping digest build: ' + dErr);
    }

    try {
      var logFolderId = params.targetFolderId || PropertiesService.getScriptProperties().getProperty('target_folder_id');
      if (logFolderId) {
        McpLogger.saveToVault(DriveApp.getFolderById(logFolderId));
      }
    } catch (saveErr) {}

    return {
      success: true,
      classroom: classroomRes,
      gmail: gmailRes,
      digest: digestRes
    };
  } finally {
    if (lock) {
      lock.releaseLock();
    }
  }
}

function handleGetVaultFile(params) {
  var folderId = params.folderId;
  var fileName = params.fileName;
  var fileId = params.fileId;
  var file = null;

  try {
    if (fileId) {
      file = DriveApp.getFileById(fileId);
    } else if (folderId && fileName) {
      var folder = DriveApp.getFolderById(folderId);
      if (!folder || folder.isTrashed()) return { success: false, notFound: true, error: "Folder not found" };
      var it = folder.getFilesByName(fileName);
      var count = 0;
      while (it.hasNext()) {
        var f = it.next();
        if (f.isTrashed()) continue;
        count++;
        if (!file || f.getLastUpdated() > file.getLastUpdated()) {
          file = f;
        }
      }
      if (count > 1) {
        McpLogger.log('WARN', 'DUPLICATE_DETECTED', 'Found ' + count + ' copies of ' + fileName + ' in folder ' + folderId + '. Selected newest.');
      }
    }

    if (!file || file.isTrashed()) {
      return { success: false, notFound: true, error: "File not found" };
    }

    var mime = file.getMimeType();
    var content;
    if (mime === 'application/json') {
      try {
        content = JSON.parse(file.getBlob().getDataAsString());
      } catch (e) {
        content = file.getBlob().getDataAsString();
      }
    } else {
      content = file.getBlob().getDataAsString();
    }

    return {
      success: true,
      id: file.getId(),
      name: file.getName(),
      mimeType: mime,
      content: content,
      size: file.getSize(),
      lastUpdated: file.getLastUpdated().toISOString()
    };
  } catch (err) {
    return { success: false, notFound: true, error: err.toString() };
  }
}

function handleListVaultFiles(params) {
  var folderId = params.folderId;
  if (!folderId) return { success: false, error: "No folderId provided" };

  try {
    var folder = DriveApp.getFolderById(folderId);
    if (!folder || folder.isTrashed()) return { success: false, error: "Folder not found" };
    var it = folder.getFiles();
    var files = [];
    while (it.hasNext()) {
      var f = it.next();
      if (!f.isTrashed()) {
        files.push({
          id: f.getId(),
          name: f.getName(),
          mimeType: f.getMimeType(),
          size: f.getSize(),
          lastUpdated: f.getLastUpdated().toISOString()
        });
      }
    }
    return { success: true, files: files };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function handleSaveVaultFile(params) {
  var folderId = params.folderId;
  var fileName = params.fileName;
  var content = params.content;
  var mimeType = params.mimeType || 'application/json';

  if (!folderId || !fileName) return { success: false, error: "folderId and fileName required" };

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { success: false, locked: true, error: "Script lock busy: sync in progress" };
  }

  try {
    var folder = DriveApp.getFolderById(folderId);
    if (!folder || folder.isTrashed()) return { success: false, error: "Folder not found" };

    var it = folder.getFilesByName(fileName);
    var matches = [];
    while (it.hasNext()) {
      var f = it.next();
      if (!f.isTrashed()) {
        matches.push(f);
      }
    }

    var targetFile = null;
    var duplicatesTrashed = 0;

    if (matches.length > 0) {
      targetFile = matches[0];
      for (var i = 1; i < matches.length; i++) {
        if (matches[i].getLastUpdated() > targetFile.getLastUpdated()) {
          targetFile = matches[i];
        }
      }

      for (var j = 0; j < matches.length; j++) {
        if (matches[j].getId() !== targetFile.getId()) {
          try {
            matches[j].setTrashed(true);
            duplicatesTrashed++;
          } catch (tErr) {}
        }
      }
    }

    if (duplicatesTrashed > 0) {
      McpLogger.log('WARN', 'DUPLICATE_HEALED', 'Trashed ' + duplicatesTrashed + ' stale duplicate(s) of ' + fileName + ' in folder ' + folderId + '. Kept newest (' + targetFile.getId() + ').');
    }

    var payloadStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

    if (targetFile) {
      targetFile.setContent(payloadStr);
      return { success: true, id: targetFile.getId(), updated: true, duplicatesTrashed: duplicatesTrashed };
    } else {
      var created = folder.createFile(fileName, payloadStr, mimeType);
      return { success: true, id: created.getId(), created: true, duplicatesTrashed: duplicatesTrashed };
    }
  } catch (err) {
    return { success: false, error: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function handleGetFileBlob(params) {
  var fid = params.fileId;
  if (!fid) return { success: false, error: "No fileId provided" };

  var name = 'attachment_' + fid;
  var mime = 'application/octet-stream';
  var tok = ScriptApp.getOAuthToken();
  // Collects one short note per strategy attempted, whether it threw or just returned a non-200,
  // so the final failure message actually says what was tried instead of a bare "unable to
  // retrieve" that gives the caller nothing to act on.
  var notes = [];

  // Strategy A: Drive REST API v3 with ScriptApp.getOAuthToken() & supportsAllDrives=true
  try {
    var metaUrl = 'https://www.googleapis.com/drive/v3/files/' + fid + '?fields=id,name,mimeType,size,webContentLink&supportsAllDrives=true&includeItemsFromAllDrives=true';
    var metaRes = UrlFetchApp.fetch(metaUrl, {
      headers: { 'Authorization': 'Bearer ' + tok },
      muteHttpExceptions: true
    });

    if (metaRes.getResponseCode() === 200) {
      var meta = JSON.parse(metaRes.getContentText());
      name = meta.name || name;
      mime = meta.mimeType || mime;
      var isGoogleApp = mime && mime.indexOf('application/vnd.google-apps') !== -1;

      var dlUrl = isGoogleApp
        ? 'https://www.googleapis.com/drive/v3/files/' + fid + '/export?mimeType=application/pdf&supportsAllDrives=true'
        : 'https://www.googleapis.com/drive/v3/files/' + fid + '?alt=media&supportsAllDrives=true';

      var dlRes = UrlFetchApp.fetch(dlUrl, {
        headers: { 'Authorization': 'Bearer ' + tok },
        muteHttpExceptions: true
      });

      if (dlRes.getResponseCode() === 200) {
        var blob = dlRes.getBlob();
        if (isGoogleApp) {
          mime = 'application/pdf';
          if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
        }
        return {
          success: true,
          name: name,
          mimeType: mime,
          base64: Utilities.base64Encode(blob.getBytes())
        };
      }
      notes.push('A:download HTTP ' + dlRes.getResponseCode());

      // If alt=media failed, check if file is an Office Presentation / Document / Sheet or Google Workspace item
      // that can be exported directly via docs/slides endpoints
      var lowerName = (name || '').toLowerCase();
      var officeExportUrls = [];
      if (lowerName.endsWith('.pptx') || (mime && mime.indexOf('presentation') !== -1)) {
        officeExportUrls.push({ url: 'https://docs.google.com/presentation/d/' + fid + '/export/pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
      } else if (lowerName.endsWith('.docx') || (mime && mime.indexOf('wordprocessingml') !== -1)) {
        officeExportUrls.push({ url: 'https://docs.google.com/document/d/' + fid + '/export?format=docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      } else if (lowerName.endsWith('.xlsx') || (mime && mime.indexOf('spreadsheetml') !== -1)) {
        officeExportUrls.push({ url: 'https://docs.google.com/spreadsheets/d/' + fid + '/export?format=xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      }

      for (var oIdx = 0; oIdx < officeExportUrls.length; oIdx++) {
        var oTarget = officeExportUrls[oIdx];
        var oRes = UrlFetchApp.fetch(oTarget.url, {
          headers: { 'Authorization': 'Bearer ' + tok },
          muteHttpExceptions: true,
          followRedirects: true
        });
        if (oRes.getResponseCode() === 200) {
          var oBlob = oRes.getBlob();
          if (oBlob.getBytes().length > 100) {
            return {
              success: true,
              name: name,
              mimeType: oTarget.mime || mime,
              base64: Utilities.base64Encode(oBlob.getBytes())
            };
          }
        }
        notes.push('A:officeExport HTTP ' + oRes.getResponseCode());
      }

      // Direct webContentLink fallback with token if alt=media returns 403/404
      if (meta.webContentLink) {
        var wcRes = UrlFetchApp.fetch(meta.webContentLink, {
          headers: { 'Authorization': 'Bearer ' + tok },
          muteHttpExceptions: true,
          followRedirects: true
        });
        if (wcRes.getResponseCode() === 200) {
          var wcBlob = wcRes.getBlob();
          var wcBytes = wcBlob.getBytes();
          // Verify it's not an HTML error page
          var isWcHtml = wcBlob.getContentType() && wcBlob.getContentType().indexOf('text/html') !== -1;
          if (!isWcHtml && wcBytes.length > 100) {
            return {
              success: true,
              name: name,
              mimeType: mime,
              base64: Utilities.base64Encode(wcBytes)
            };
          }
        }
        notes.push('A:webContentLink HTTP ' + wcRes.getResponseCode());
      }
    } else {
      notes.push('A:meta HTTP ' + metaRes.getResponseCode());
    }
  } catch (errA) {
    notes.push('A:exception ' + errA.toString());
    McpLogger.log('WARN', 'GET_BLOB_V3_WARN', 'REST API v3 fetch error for ' + fid + ': ' + errA.toString());
  }

  // Strategy B: Advanced Drive Service (v2) if available
  try {
    if (typeof Drive !== 'undefined' && Drive.Files) {
      var fileResource = Drive.Files.get(fid, { supportsAllDrives: true });
      if (fileResource) {
        name = fileResource.title || name;
        mime = fileResource.mimeType || mime;
        var fetchUrl = fileResource.downloadUrl;
        if (fileResource.exportLinks && fileResource.exportLinks['application/pdf']) {
          fetchUrl = fileResource.exportLinks['application/pdf'];
          mime = 'application/pdf';
          if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
        } else if (!fetchUrl && fileResource.webContentLink) {
          fetchUrl = fileResource.webContentLink;
        }
        if (fetchUrl) {
          var advRes = UrlFetchApp.fetch(fetchUrl, {
            headers: { 'Authorization': 'Bearer ' + tok },
            muteHttpExceptions: true,
            followRedirects: true
          });
          if (advRes.getResponseCode() === 200) {
            return {
              success: true,
              name: name,
              mimeType: mime,
              base64: Utilities.base64Encode(advRes.getBlob().getBytes())
            };
          }
          notes.push('B:download HTTP ' + advRes.getResponseCode());
        } else {
          notes.push('B:no downloadUrl/exportLink on file resource');
        }
      } else {
        notes.push('B:Drive.Files.get returned nothing');
      }
    } else {
      notes.push('B:Advanced Drive service not enabled');
    }
  } catch (errB) {
    notes.push('B:exception ' + errB.toString());
    McpLogger.log('WARN', 'GET_BLOB_V2_WARN', 'Advanced Drive v2 fetch error for ' + fid + ': ' + errB.toString());
  }

  // Strategy C: DriveApp fallback (if user opened or added to personal My Drive)
  try {
    var f = DriveApp.getFileById(fid);
    if (f) {
      name = f.getName() || name;
      mime = f.getMimeType() || mime;
      var b;
      if (mime.indexOf('google-apps') !== -1) {
        var exp = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + fid + '/export?mimeType=application/pdf', {
          headers: { 'Authorization': 'Bearer ' + tok },
          muteHttpExceptions: true
        });
        b = exp.getBlob();
        mime = 'application/pdf';
        if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
      } else {
        b = f.getBlob();
      }
      return {
        success: true,
        name: name,
        mimeType: mime,
        base64: Utilities.base64Encode(b.getBytes())
      };
    }
    notes.push('C:DriveApp.getFileById returned nothing');
  } catch (errC) {
    notes.push('C:exception ' + errC.toString());
    McpLogger.log('WARN', 'GET_BLOB_DRIVEAPP_WARN', 'DriveApp fetch error for ' + fid + ': ' + errC.toString());
  }

  var noteSummary = notes.join(' | ');
  McpLogger.log('WARN', 'GET_FILE_BLOB_FAILED', 'All strategies failed to retrieve file ' + fid + ' (last known name: ' + name + ', mime: ' + mime + '): ' + noteSummary);
  return {
    success: false,
    error: 'Unable to retrieve file ' + fid + ' [' + noteSummary + ']'
  };
}

function handleGetGmailAttachment(params) {
  var messageId = params.messageId;
  var attachmentIndex = params.attachmentIndex;
  var filename = params.filename;
  if (!messageId) throw new Error("messageId is required");
  var msg = GmailApp.getMessageById(messageId);
  if (!msg) throw new Error("Message not found: " + messageId);
  var atts = msg.getAttachments();
  var targetAtt = null;
  if (attachmentIndex !== undefined && attachmentIndex !== null && atts[attachmentIndex]) {
    targetAtt = atts[attachmentIndex];
  } else if (filename) {
    for (var i = 0; i < atts.length; i++) {
      if (atts[i].getName() === filename) {
        targetAtt = atts[i];
        break;
      }
    }
  }
  if (!targetAtt && atts.length > 0) targetAtt = atts[0];
  if (!targetAtt) throw new Error("Attachment not found in message: " + messageId);
  return {
    name: targetAtt.getName(),
    mimeType: targetAtt.getContentType(),
    size: targetAtt.getSize(),
    base64: Utilities.base64Encode(targetAtt.getBytes())
  };
}

function handleSyncAllPortals(params) {
  var res = PortalIngester.syncAll();
  return { success: true, result: res };
}

function handleRegisterPortalJob(params) {
  var childId = params.childId || 'default_child';
  var kidName = params.childName || params.kidName || 'Atharva';
  var props = PropertiesService.getScriptProperties();
  var portalFolderId = params.portalFolderId || params.targetFolderId;
  if (!portalFolderId) {
    try {
      var schoolRaw = props.getProperty('multi_child_school_registry');
      if (schoolRaw) {
        var schoolReg = JSON.parse(schoolRaw);
        var matchedSchoolChild = (schoolReg.children || []).find(function(sc) {
          return sc.childId === childId || (sc.kidName && sc.kidName.toLowerCase() === kidName.toLowerCase());
        });
        if (matchedSchoolChild && matchedSchoolChild.targetFolderId) {
          portalFolderId = matchedSchoolChild.targetFolderId;
        }
      }
    } catch(e) {}
  }
  var domain = params.domain;
  var feature = params.feature;
  var endpointSpec = params.endpoint_spec || { url: params.url };
  var authSpec = params.auth_spec || { cookies: params.cookies };

  var raw = props.getProperty('multi_child_portal_registry');
  var registry = raw ? JSON.parse(raw) : { children: [] };

  var child = registry.children.find(function(c) { return c.childId === childId || c.kidName.toLowerCase() === kidName.toLowerCase(); });
  if (!child) {
    child = {
      childId: childId,
      kidName: kidName,
      portalFolderId: portalFolderId,
      domains: {}
    };
    registry.children.push(child);
  }

  if (portalFolderId) child.portalFolderId = portalFolderId;
  if (!child.domains) child.domains = {};
  if (!child.domains[domain]) {
    child.domains[domain] = {
      security_payload: { cookies: authSpec.cookies || '' },
      features: []
    };
  } else if (authSpec && authSpec.cookies) {
    child.domains[domain].security_payload = { cookies: authSpec.cookies };
  }

  var existingIdx = child.domains[domain].features.findIndex(function(f) { return f.name.toLowerCase() === feature.toLowerCase(); });
  if (existingIdx >= 0) {
    child.domains[domain].features[existingIdx] = { name: feature, endpoint: endpointSpec.url };
  } else {
    child.domains[domain].features.push({ name: feature, endpoint: endpointSpec.url });
  }

  props.setProperty('multi_child_portal_registry', JSON.stringify(registry));
  McpLogger.log('SUCCESS', 'PORTAL_REGISTER_OK', 'Registered portal feature ' + feature + ' for ' + kidName + ' (' + domain + ')');

  var triggerRes = null;
  try {
    triggerRes = setupChildPortalTrigger(childId, 1);
  } catch (trigErr) {}

  return { registered: true, childId: childId, domain: domain, feature: feature, triggerResult: triggerRes };
}

function handleRegisterSchoolWorker(params) {
  var childId = params.childId || 'default_child';
  var kidName = params.childName || params.kidName || 'Atharva';
  var academicYear = params.academicYear || '2026-2027';
  var schoolWorkerUrl = params.schoolWorkerUrl;
  var schoolDomain = params.schoolDomain || '';
  var targetFolderId = params.targetFolderId;
  var initialSyncComplete = params.initialSyncComplete !== undefined ? !!params.initialSyncComplete : false;

  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('multi_child_school_registry');
  var registry;
  try {
    registry = raw ? JSON.parse(raw) : { children: [] };
  } catch (e) {
    registry = { children: [] };
  }
  if (!registry.children) registry.children = [];

  var child = registry.children.find(function(c) { return c.childId === childId || (c.kidName && c.kidName.toLowerCase() === kidName.toLowerCase()); });
  if (!child) {
    child = {
      childId: childId,
      kidName: kidName,
      academicYear: academicYear,
      schoolWorkerUrl: schoolWorkerUrl,
      schoolDomain: schoolDomain,
      targetFolderId: targetFolderId,
      initialSyncComplete: initialSyncComplete,
      registeredAt: new Date().toISOString()
    };
    registry.children.push(child);
  } else {
    if (schoolWorkerUrl) child.schoolWorkerUrl = schoolWorkerUrl;
    if (academicYear) child.academicYear = academicYear;
    if (schoolDomain) child.schoolDomain = schoolDomain;
    if (targetFolderId) child.targetFolderId = targetFolderId;
    if (params.initialSyncComplete !== undefined) {
      child.initialSyncComplete = !!params.initialSyncComplete;
    }
    child.updatedAt = new Date().toISOString();
  }

  props.setProperty('multi_child_school_registry', JSON.stringify(registry));
  var triggerRes = null;
  // Strictly defer autonomous trigger creation until 1-time initial sync has completed.
  // When Step 2 registers the child initially, child.initialSyncComplete is false -> no trigger created.
  // When 1-time data sync completes, the extension re-registers with initialSyncComplete: true -> trigger created!
  if (child.initialSyncComplete === true) {
    try {
      triggerRes = setupChildSchoolSyncTrigger(child.childId);
    } catch(tErr) {
      triggerRes = { success: false, error: tErr.toString() };
    }
  } else {
    triggerRes = { success: true, deferred: true, reason: 'awaiting_1time_sync_completion' };
    McpLogger.log('INFO', 'TRIGGER_DEFERRED', 'Autonomous 1-minute trigger deferred for ' + kidName + ' until 1-time initial sync completes.');
  }

  McpLogger.log('SUCCESS', 'SCHOOL_REGISTER_OK', 'Registered School Cloud Worker for ' + kidName + ' (' + academicYear + ') in Personal Master Worker');
  return {
    registered: true,
    childId: childId,
    kidName: kidName,
    initialSyncComplete: child.initialSyncComplete,
    triggerResult: triggerRes
  };
}

/**
 * Handles incoming push school data from student's self-hosted Google Sheet or worker.
 * Directly ingests Classroom coursework, circulars, and attachments into the Parent Vault.
 */
function handlePushSchoolData(params) {
  var kidName = params.childName || params.kidName || 'Atharva';
  var academicYear = params.academicYear || '2026-2027';
  var classroomData = params.classroom || (params.courses ? { courses: params.courses } : null);
  var gmailData = params.gmail || (params.emails ? { emails: params.emails } : null);

  McpLogger.log('INFO', 'PUSH_SCHOOL_DATA_RECEIVED', 'Received push sync for ' + kidName + ' (' + academicYear + ')');

  // Locate or create parent vault directories
  var rootFolder = null;
  var rootFolderId = PropertiesService.getScriptProperties().getProperty('target_folder_id');
  if (rootFolderId) {
    try { rootFolder = DriveApp.getFolderById(rootFolderId); } catch (e) {}
  }
  if (!rootFolder) {
    var rfIt = DriveApp.getFoldersByName('K.I.D.S. Data');
    if (rfIt.hasNext()) rootFolder = rfIt.next();
  }

  var yearFolder = null;
  if (rootFolder) {
    var yIt = rootFolder.getFoldersByName(academicYear);
    yearFolder = yIt.hasNext() ? yIt.next() : rootFolder.createFolder(academicYear);
  }

  var kidFolder = null;
  if (yearFolder) {
    var kIt = yearFolder.getFoldersByName(kidName);
    kidFolder = kIt.hasNext() ? kIt.next() : yearFolder.createFolder(kidName);
  }

  var savedItems = { courses: 0, emails: 0, attachments: 0 };

  if (kidFolder) {
    // 1. Save Classroom data
    if (classroomData) {
      var cFolderIt = kidFolder.getFoldersByName('Google Classroom');
      var cFolder = cFolderIt.hasNext() ? cFolderIt.next() : kidFolder.createFolder('Google Classroom');
      
      var cFileIt = cFolder.getFilesByName('classroom_data.json');
      var cJsonStr = JSON.stringify(classroomData, null, 2);
      if (cFileIt.hasNext()) {
        cFileIt.next().setContent(cJsonStr);
      } else {
        cFolder.createFile('classroom_data.json', cJsonStr, 'application/json');
      }
      savedItems.courses = (classroomData.courses || []).length;

      // Save attachments if provided with base64
      var attFolderIt = cFolder.getFoldersByName('Classroom Attachments');
      var attFolder = attFolderIt.hasNext() ? attFolderIt.next() : cFolder.createFolder('Classroom Attachments');
      (classroomData.courses || []).forEach(function(c) {
        var allItems = (c.announcements || []).concat(c.courseWork || []).concat(c.materials || []);
        allItems.forEach(function(item) {
          (item.attachments || []).forEach(function(att) {
            if (att && att.base64) {
              try {
                var rawName = att.name || att.title || 'attachment.pdf';
                var attBlob = Utilities.newBlob(Utilities.base64Decode(att.base64), att.mimeType || 'application/pdf', rawName);
                attFolder.createFile(attBlob);
                savedItems.attachments++;
                delete att.base64;
              } catch (bErr) {}
            }
          });
        });
      });
    }

    // 2. Save Gmail Circulars
    if (gmailData) {
      var gFolderIt = kidFolder.getFoldersByName('School Circulars & Emails');
      var gFolder = gFolderIt.hasNext() ? gFolderIt.next() : kidFolder.createFolder('School Circulars & Emails');

      var gFileIt = gFolder.getFilesByName('school_emails.json');
      var gJsonStr = JSON.stringify(gmailData, null, 2);
      if (gFileIt.hasNext()) {
        gFileIt.next().setContent(gJsonStr);
      } else {
        gFolder.createFile('school_emails.json', gJsonStr, 'application/json');
      }
      savedItems.emails = (gmailData.emails || []).length;
    }

    // 3. Trigger Document OCR for newly vaulted files
    try {
      DocumentOcrService.runAutomatedVaultIndexing(kidFolder, 10);
    } catch (ocrErr) {
      McpLogger.log('WARN', 'PUSH_OCR_TRIGGER_WARN', ocrErr.toString());
    }
  }

  // Update multi-child registry with last push timestamp
  try {
    var props = PropertiesService.getScriptProperties();
    var raw = props.getProperty('multi_child_school_registry');
    var registry = raw ? JSON.parse(raw) : { children: [] };
    var child = (registry.children || []).find(function(c) { return (c.kidName && c.kidName.toLowerCase() === kidName.toLowerCase()); });
    if (child) {
      child.lastPushAt = new Date().toISOString();
      child.lastPushItems = savedItems;
      props.setProperty('multi_child_school_registry', JSON.stringify(registry));
    }
  } catch (regErr) {}

  McpLogger.log('SUCCESS', 'PUSH_SCHOOL_DATA_SAVED', 'Ingested ' + savedItems.courses + ' courses, ' + savedItems.emails + ' emails for ' + kidName);
  return {
    success: true,
    kidName: kidName,
    academicYear: academicYear,
    savedItems: savedItems,
    timestamp: new Date().toISOString()
  };
}


/**
 * Nightly Quiet Hours: Directly deletes all 1-minute school sync triggers and portal continuation triggers at 11:00 PM IST.
 * Ensures zero sync triggers exist or fire between 11 PM and 6 AM IST.
 */
function pauseNightlySyncTriggers() {
  var deletedCount = 0;
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      var hFn = triggers[i].getHandlerFunction();
      if (hFn === 'runMasterCloudSchoolSync' ||
          hFn === 'runChildSchoolSyncTrigger' ||
          hFn === 'runIncrementalSchoolSync' ||
          hFn === 'runAutonomousVaultOcr' ||
          hFn === 'runChildPortalSyncTrigger' ||
          hFn.indexOf('runSchoolSync_') === 0 ||
          hFn.indexOf('runPortalSync_') === 0) {
        ScriptApp.deleteTrigger(triggers[i]);
        deletedCount++;
      }
    }
    McpLogger.log('INFO', 'QUIET_HOURS_PAUSED', 'Paused school & portal sync for the night (11 PM to 6 AM IST). Deleted ' + deletedCount + ' trigger(s).');
  } catch (err) {
    McpLogger.log('WARN', 'QUIET_HOURS_PAUSE_ERROR', 'Could not delete triggers during quiet hours: ' + err);
  }
  return { paused: true, deletedTriggers: deletedCount };
}

/**
 * Morning Wake-up: Re-creates dedicated per-child 1-minute school triggers and portal triggers at 6:00 AM IST.
 */
function resumeMorningSyncTriggers() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      var hFn = triggers[i].getHandlerFunction();
      if (hFn === 'runMasterCloudSchoolSync' ||
          hFn === 'runChildSchoolSyncTrigger' ||
          hFn === 'runIncrementalSchoolSync' ||
          hFn === 'runChildPortalSyncTrigger' ||
          hFn.indexOf('runSchoolSync_') === 0 ||
          hFn.indexOf('runPortalSync_') === 0) {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }

    var props = PropertiesService.getScriptProperties();
    var rawReg = props.getProperty('multi_child_school_registry');
    var restoredCount = 0;
    if (rawReg) {
      try {
        var parsedReg = JSON.parse(rawReg);
        (parsedReg.children || []).forEach(function(c) {
          if (c && c.initialSyncComplete === true) {
            var cid = c.childId || c.kidName;
            if (cid) {
              setupChildSchoolSyncTrigger(cid);
              restoredCount++;
            }
          }
        });
      } catch(e) {}
    }

    // Also reinstate portal triggers for children with registered portals
    try {
      var rawPortalReg = props.getProperty('multi_child_portal_registry');
      if (rawPortalReg) {
        var pReg = JSON.parse(rawPortalReg);
        (pReg.children || []).forEach(function(pc) {
          if (pc && pc.childId && pc.domains && Object.keys(pc.domains).length > 0) {
            setupChildPortalTrigger(pc.childId);
          }
        });
      }
    } catch (pErr) {}

    if (restoredCount > 0) {
      McpLogger.log('SUCCESS', 'QUIET_HOURS_RESUMED', 'Restored dedicated daytime triggers for ' + restoredCount + ' child(ren) (6 AM to 11 PM IST).');
      // Restart autonomous OCR if it was interrupted by quiet hours
      try {
        ScriptApp.newTrigger('runAutonomousVaultOcr').timeBased().after(30000).create();
      } catch (ocrErr) {}
      return { resumed: true, restoredChildrenCount: restoredCount };
    } else {
      McpLogger.log('INFO', 'QUIET_HOURS_RESUME_DEFERRED', 'Morning resume deferred: no completed children found in registry.');
      return { resumed: false, reason: 'initial_sync_incomplete' };
    }
  } catch (err) {
    McpLogger.log('ERROR', 'QUIET_HOURS_RESUME_ERROR', 'Could not restore morning triggers: ' + err);
    return { resumed: false, error: err.toString() };
  }
}

/**
 * Installs daily scheduled triggers at 11 PM (to delete triggers) and 6 AM (to restore triggers) in IST.
 */
function setupQuietHoursScheduleTriggers() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      var hFn = triggers[i].getHandlerFunction();
      if (hFn === 'pauseNightlySyncTriggers' || hFn === 'resumeMorningSyncTriggers') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }

    try {
      var pauseB = ScriptApp.newTrigger('pauseNightlySyncTriggers').timeBased();
      if (typeof pauseB.atHour === 'function') pauseB = pauseB.atHour(23);
      if (typeof pauseB.inTimezone === 'function') pauseB = pauseB.inTimezone('Asia/Kolkata');
      if (typeof pauseB.everyDays === 'function') pauseB = pauseB.everyDays(1);
      if (typeof pauseB.create === 'function') pauseB.create();
    } catch (e1) {}

    try {
      var resumeB = ScriptApp.newTrigger('resumeMorningSyncTriggers').timeBased();
      if (typeof resumeB.atHour === 'function') resumeB = resumeB.atHour(6);
      if (typeof resumeB.inTimezone === 'function') resumeB = resumeB.inTimezone('Asia/Kolkata');
      if (typeof resumeB.everyDays === 'function') resumeB = resumeB.everyDays(1);
      if (typeof resumeB.create === 'function') resumeB.create();
    } catch (e2) {}

    McpLogger.log('INFO', 'SCHEDULE_TRIGGERS_CREATED', 'Configured direct trigger schedule: pause at 11 PM IST, resume at 6 AM IST.');
    return { success: true };
  } catch (err) {
    McpLogger.log('WARN', 'SCHEDULE_TRIGGERS_ERROR', 'Error setting up quiet hours triggers: ' + err);
    return { success: false, error: err.toString() };
  }
}

/**
 * Helper to produce a clean, identifier-safe name for child-specific trigger functions.
 * E.g., 'child_atharva' -> 'Atharva', 'Atharva Roy' -> 'Atharva_Roy'
 */
function cleanTriggerIdentifier(val) {
  if (!val) return 'Default';
  var s = String(val).trim();
  if (s.indexOf('child_') === 0 && s.length > 6) {
    s = s.substring(6);
  }
  s = s.replace(/[^a-zA-Z0-9_]/g, '_');
  if (/^[a-z]/.test(s)) {
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }
  return s || 'Default';
}

/**
 * Resolves child's friendly name from registry or ID for clear trigger naming in GAS dashboard.
 */
function getChildTriggerIdentifier(childId) {
  if (!childId) return 'Default';
  try {
    var props = PropertiesService.getScriptProperties();
    var rawReg = props.getProperty('multi_child_school_registry');
    if (rawReg) {
      var reg = JSON.parse(rawReg);
      var found = (reg.children || []).filter(function(c) {
        return (c && ((c.childId && c.childId === childId) || (c.kidName && c.kidName === childId)));
      })[0];
      if (found && found.kidName) {
        return cleanTriggerIdentifier(found.kidName);
      }
    }
  } catch (e) {}

  try {
    var props2 = PropertiesService.getScriptProperties();
    var rawPortalReg = props2.getProperty('multi_child_portal_registry');
    if (rawPortalReg) {
      var pReg = JSON.parse(rawPortalReg);
      var pFound = (pReg.children || []).filter(function(c) {
        return (c && ((c.childId && c.childId === childId) || (c.kidName && c.kidName === childId)));
      })[0];
      if (pFound && pFound.kidName) {
        return cleanTriggerIdentifier(pFound.kidName);
      }
    }
  } catch (pErr) {}

  return cleanTriggerIdentifier(childId);
}

function ensureTriggerDispatcherBound(fnName, type, childId) {
  if (typeof globalThis !== 'undefined' && !globalThis[fnName]) {
    if (type === 'portal') {
      globalThis[fnName] = function(e) { return runChildPortalSyncTrigger(e, childId); };
    } else {
      globalThis[fnName] = function(e) { return runChildSchoolSyncTrigger(e, childId); };
    }
  }
}

function getChildSchoolSyncHandlerName(childId) {
  if (!childId) return 'runChildSchoolSyncTrigger';
  var ident = getChildTriggerIdentifier(childId);
  var fnName = 'runSchoolSync_' + ident;
  ensureTriggerDispatcherBound(fnName, 'school', childId);
  return fnName;
}

function getChildPortalSyncHandlerName(childId) {
  if (!childId) return 'runChildPortalSyncTrigger';
  var ident = getChildTriggerIdentifier(childId);
  var fnName = 'runPortalSync_' + ident;
  ensureTriggerDispatcherBound(fnName, 'portal', childId);
  return fnName;
}

// Dedicated static handlers for identifiable trigger names in Google Apps Script Dashboard:
function runSchoolSync_Atharva(e) { return runChildSchoolSyncTrigger(e, 'child_atharva'); }
function runPortalSync_Atharva(e) { return runChildPortalSyncTrigger(e, 'child_atharva'); }

function runSchoolSync_Ananya(e) { return runChildSchoolSyncTrigger(e, 'child_ananya'); }
function runPortalSync_Ananya(e) { return runChildPortalSyncTrigger(e, 'child_ananya'); }

function runSchoolSync_C1(e) { return runChildSchoolSyncTrigger(e, 'c1'); }
function runPortalSync_C1(e) { return runChildPortalSyncTrigger(e, 'c1'); }

function runSchoolSync_C2(e) { return runChildSchoolSyncTrigger(e, 'c2'); }
function runPortalSync_C2(e) { return runChildPortalSyncTrigger(e, 'c2'); }

function runSchoolSync_C3(e) { return runChildSchoolSyncTrigger(e, 'c3'); }
function runPortalSync_C3(e) { return runChildPortalSyncTrigger(e, 'c3'); }

/**
 * Unified Runner for Per-Child School Triggers.
 * Apps Script automatically passes event object e with e.triggerUid.
 * Also accepts fallbackChildId when executed directly from the Apps Script IDE.
 */
function runChildSchoolSyncTrigger(e, fallbackChildId) {
  var triggerUid = e && e.triggerUid;
  var props = PropertiesService.getScriptProperties();
  var targetChildId = triggerUid ? props.getProperty('trigger_child_' + triggerUid) : null;
  if (!targetChildId && fallbackChildId) {
    targetChildId = fallbackChildId;
  }
  return runMasterCloudSchoolSync(false, targetChildId, false);
}

/**
 * Installs a dedicated 1-minute trigger for a specific child.
 * Identifiable trigger name (e.g. runSchoolSync_Atharva) is shown in the Triggers Dashboard.
 * Maps triggerUid -> childId in ScriptProperties.
 */
function setupChildSchoolSyncTrigger(childId, intervalMinutes) {
  if (!childId) return setupMasterCloudSyncTrigger(intervalMinutes);
  var mins = intervalMinutes || 1;
  var props = PropertiesService.getScriptProperties();
  var handlerName = getChildSchoolSyncHandlerName(childId);

  try {
    // Delete any previous school trigger registered for this specific child
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      var hFn = triggers[i].getHandlerFunction();
      if (hFn === 'runChildSchoolSyncTrigger' || hFn === handlerName || hFn.indexOf('runSchoolSync_') === 0) {
        var existingUid = triggers[i].getUniqueId();
        var mappedChild = props.getProperty('trigger_child_' + existingUid);
        if (mappedChild === childId || hFn === handlerName) {
          ScriptApp.deleteTrigger(triggers[i]);
          props.deleteProperty('trigger_child_' + existingUid);
        }
      }
    }

    setupQuietHoursScheduleTriggers();

    var now = new Date();
    var istHour = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)).getUTCHours();
    if (istHour >= 23 || istHour < 6) {
      McpLogger.log('INFO', 'SYNC_TRIGGER_DEFERRED', 'Quiet hours active (IST). Dedicated 1-min trigger for ' + childId + ' (' + handlerName + ') will be installed at 6 AM.');
      return { success: true, cadence: 'deferred_to_6am', childId: childId, handler: handlerName };
    }

    var newTrigger;
    if (mins === 1) {
      newTrigger = ScriptApp.newTrigger(handlerName).timeBased().everyMinutes(1).create();
    } else if (mins === 5) {
      newTrigger = ScriptApp.newTrigger(handlerName).timeBased().everyMinutes(5).create();
    } else {
      newTrigger = ScriptApp.newTrigger(handlerName).timeBased().everyMinutes(1).create();
    }

    var uid = (newTrigger && typeof newTrigger.getUniqueId === 'function') ? newTrigger.getUniqueId() : ('trig_' + Math.random().toString(36).substring(2));
    props.setProperty('trigger_child_' + uid, childId);
    McpLogger.log('SUCCESS', 'CHILD_TRIGGER_CREATED', 'Created dedicated ' + mins + '-min trigger (' + handlerName + ') for child ' + childId + ' (triggerUid=' + uid + ').');
    return { success: true, childId: childId, triggerUid: uid, handler: handlerName, cadence: 'everyMinutes(' + mins + ')' };
  } catch (err) {
    McpLogger.log('WARN', 'CHILD_TRIGGER_CREATE_FAILED', 'Could not create child trigger ' + handlerName + ' for ' + childId + ': ' + err);
    return { success: false, error: err.toString() };
  }
}

/**
 * Unified Runner for Per-Child Portal Triggers.
 * Apps Script automatically passes event object e with e.triggerUid.
 * Also accepts fallbackChildId when executed directly from the Apps Script IDE.
 */
function runChildPortalSyncTrigger(e, fallbackChildId) {
  var triggerUid = e && e.triggerUid;
  var props = PropertiesService.getScriptProperties();
  var targetChildId = triggerUid ? props.getProperty('portal_trigger_child_' + triggerUid) : null;
  if (!targetChildId && fallbackChildId) {
    targetChildId = fallbackChildId;
  }
  if (targetChildId) {
    return PortalIngester.syncChildBurst(targetChildId);
  } else {
    return PortalIngester.syncAll();
  }
}

/**
 * Installs a dedicated burst continuation or 6-hour trigger for a specific child's portal scraping.
 * Maps triggerUid -> childId in ScriptProperties.
 */
function setupChildPortalTrigger(childId, delayMinutes) {
  if (!childId) return setupSixHourTrigger();
  var props = PropertiesService.getScriptProperties();

  // If delayMinutes not specified, check if an in-flight burst is waiting to continue
  var mins = delayMinutes;
  if (mins === undefined || mins === null) {
    var prog = props.getProperty('portal_prog_' + childId);
    mins = prog ? 10 : 1;
  }

  return PortalIngester.scheduleChildPortalContinuation(childId, mins);
}

function setupMasterCloudSyncTrigger(intervalMinutes) {
  var mins = intervalMinutes || 1;
  var props = PropertiesService.getScriptProperties();
  var rawReg = props.getProperty('multi_child_school_registry');

  // If multi-child registry has children, install dedicated per-child triggers
  if (rawReg) {
    try {
      var parsedReg = JSON.parse(rawReg);
      var installed = [];
      (parsedReg.children || []).forEach(function(c) {
        var cid = c ? (c.childId || c.kidName) : null;
        if (cid && c.initialSyncComplete === true) {
          var res = setupChildSchoolSyncTrigger(cid, mins);
          installed.push(res);
        }
      });
      if (installed.length > 0) {
        return { success: true, cadence: 'everyMinutes(' + mins + ')', multiChild: true, installed: installed };
      }
    } catch(e) {}
  }

  // Fallback for single-master/initial trigger
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      var hFn = triggers[i].getHandlerFunction();
      if (hFn === 'runMasterCloudSchoolSync' || hFn === 'runIncrementalSchoolSync') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }

    setupQuietHoursScheduleTriggers();

    var now = new Date();
    var istHour = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)).getUTCHours();
    if (istHour >= 23 || istHour < 6) {
      McpLogger.log('INFO', 'SYNC_TRIGGER_DEFERRED', 'Quiet hours active (IST). 1-minute trigger will be installed at 6 AM by morning resume.');
      return { success: true, cadence: 'deferred_to_6am' };
    }

    ScriptApp.newTrigger('runMasterCloudSchoolSync').timeBased().everyMinutes(mins).create();
    McpLogger.log('SUCCESS', 'TRIGGER_CREATED', 'Created ' + mins + '-minute autonomous Master Cloud trigger for Student Classroom sync.');
    return { success: true, cadence: 'everyMinutes(' + mins + ')' };
  } catch (err) {
    McpLogger.log('WARN', 'TRIGGER_CREATE_FAILED', 'Could not create Master Cloud trigger: ' + err);
    return { success: false, error: err.toString() };
  }
}

function runMasterCloudSchoolSync(forceRun, targetChildIdOrName, isInitialPass) {
  try { McpLogger.log('INFO', 'RUN_MASTER_CLOUD_SYNC_CALLED', 'Invoked with forceRun=' + forceRun + ' targetChild=' + targetChildIdOrName + ' isInitialPass=' + isInitialPass); } catch (logErr) {}
  var props = PropertiesService.getScriptProperties();

  // RESUME GUARD: If initial sync was interrupted, resume with correct flags
  var pendingInitialChild = props.getProperty('initial_sync_in_progress_child');
  if (pendingInitialChild) {
    if (!targetChildIdOrName) targetChildIdOrName = pendingInitialChild;
    isInitialPass = true;
    forceRun = true;
  }

  // FAST-EXIT GUARD 0: IST Quiet Hours (11:00 PM to 6:00 AM IST)
  if (forceRun !== true && props.getProperty('quiet_hours_disabled') !== 'true') {
    var now = new Date();
    var istHour = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)).getUTCHours();
    if (istHour >= 23 || istHour < 6) {
      try {
        pauseNightlySyncTriggers();
      } catch (delErr) {}
      return { count: 0, status: 'quiet_hours_ist_11pm_to_6am', reason: 'Deleted 1-minute trigger for quiet hours (11 PM to 6 AM IST)', skipped: true };
    }
  }

  // FAST-EXIT GUARD 1: Check Script Properties BEFORE acquiring ScriptLock!
  var raw = props.getProperty('multi_child_school_registry');
  if (!raw) return { count: 0, status: 'awaiting_step2_registration', skipped: true };

  var registry;
  try {
    registry = JSON.parse(raw);
  } catch (parseErr) {
    return { count: 0, status: 'invalid_registry_json', skipped: true };
  }

  var children = registry.children || [];
  if (!children || children.length === 0) return { count: 0, status: 'no_children_registered', skipped: true };

  var hasActive = false;
  for (var cIdx = 0; cIdx < children.length; cIdx++) {
    var checkChild = children[cIdx];
    if (checkChild) {
      if (targetChildIdOrName) {
        if (checkChild.childId === targetChildIdOrName || (checkChild.kidName && checkChild.kidName.toLowerCase() === String(targetChildIdOrName).toLowerCase())) {
          hasActive = true;
          break;
        }
      } else if (checkChild.initialSyncComplete === true || isInitialPass === true) {
        hasActive = true;
        break;
      }
    }
  }

  if (!hasActive) {
    return { count: 0, status: 'awaiting_1time_sync_completion', skipped: true };
  }

  // FAST-EXIT GUARD 2: Child-scoped locking to prevent cross-child blocking.
  // If targetChildIdOrName is provided, we lock strictly for this child. Other children run simultaneously!
  var childLockKey = targetChildIdOrName ? ('child_sync_lock_' + targetChildIdOrName.toString().toLowerCase().replace(/[^a-z0-9_]/g, '_')) : null;
  var nowMs = new Date().getTime();
  if (childLockKey) {
    var rawLockExp = props.getProperty(childLockKey);
    if (rawLockExp) {
      var lockExp = parseInt(rawLockExp, 10);
      if (nowMs < lockExp) {
        return { skipped: true, reason: 'Sync already in progress for child ' + targetChildIdOrName };
      }
    }
    // Set 5-minute auto-expiring lock for this child
    props.setProperty(childLockKey, (nowMs + 300000).toString());
  } else {
    var globalLock = LockService.getScriptLock();
    if (!globalLock.tryLock(5000)) return { skipped: true, reason: 'Global sync already in progress' };
  }

  McpLogger.log('INFO', 'RUN_MASTER_CLOUD_SYNC_INVOKED', 'runMasterCloudSchoolSync running for ' + children.length + ' registered child(ren). forceRun=' + forceRun + ' targetChild=' + targetChildIdOrName + ' isInitialPass=' + isInitialPass);
  var syncStartTime = new Date().getTime();
  var MAX_SYNC_RUNTIME_MS = 270000; // 4.5 minutes (leaves 90s safety margin before 6.0m limit)

  function isTimeExpiring() {
    return (new Date().getTime() - syncStartTime) > MAX_SYNC_RUNTIME_MS;
  }

  function scheduleContinuation() {
    try {
      var trigs = ScriptApp.getProjectTriggers();
      for (var tI = 0; tI < trigs.length; tI++) {
        if (trigs[tI].getHandlerFunction() === 'runMasterCloudSchoolSync') {
          ScriptApp.deleteTrigger(trigs[tI]);
        }
      }
      ScriptApp.newTrigger('runMasterCloudSchoolSync')
        .timeBased()
        .after(10000)
        .create();
      McpLogger.log('INFO', 'CONTINUATION_TRIGGER_SET', '4.5-minute time budget reached. Scheduled 10-second continuation trigger.');
      return true;
    } catch (tErr) {
      McpLogger.log('WARN', 'CONTINUATION_TRIGGER_FAIL', 'Could not schedule continuation trigger: ' + tErr);
      return false;
    }
  }

  try {
    var syncedCount = 0;

    for (var i = 0; i < children.length; i++) {
      if (isTimeExpiring()) {
        scheduleContinuation();
        return { success: true, continuationScheduled: true, checkpoint: 'child_boundary_' + i };
      }

      var ch = children[i];
      if (!ch || !ch.schoolWorkerUrl || !ch.targetFolderId) continue;

      if (targetChildIdOrName) {
        var matchTarget = (ch.childId === targetChildIdOrName || (ch.kidName && ch.kidName.toLowerCase() === String(targetChildIdOrName).toLowerCase()));
        if (!matchTarget) continue;
      }

      var isChildInitial = (ch.initialSyncComplete !== true) || (isInitialPass === true);
      if (!targetChildIdOrName && isInitialPass !== true) {
        if (ch.initialSyncComplete !== true) {
          continue;
        }
      }

      var kidFolder;
      try {
        kidFolder = DriveApp.getFolderById(ch.targetFolderId);
        if (!kidFolder || kidFolder.isTrashed()) continue;
      } catch (folderErr) {
        continue;
      }

      // Mark initial sync in progress so continuation knows which child to resume
      if (isChildInitial) {
        props.setProperty('initial_sync_in_progress_child', ch.childId || ch.kidName);
      }

      try {
        var resp = UrlFetchApp.fetch(ch.schoolWorkerUrl, {
          method: 'POST',
          contentType: 'application/json',
          payload: JSON.stringify({
            method: 'extract_classroom_and_gmail',
            params: {
              childName: ch.kidName,
              academicYear: ch.academicYear,
              schoolDomain: ch.schoolDomain,
              extractOnly: true,
              isIncremental: !isChildInitial
            }
          }),
          muteHttpExceptions: true
        });

        if (resp.getResponseCode() !== 200) {
          McpLogger.log('WARN', 'MASTER_SYNC_HTTP_ERROR', 'extract_classroom_and_gmail HTTP ' + resp.getResponseCode() + ' for ' + (ch.kidName || 'Child') + ': ' + resp.getContentText().substring(0, 300));
        }

        if (resp.getResponseCode() === 200) {
          var data;
          try {
            data = JSON.parse(resp.getContentText());
          } catch (jsonErr) {
            McpLogger.log('WARN', 'MASTER_SYNC_BAD_JSON', 'Could not parse extract_classroom_and_gmail response for ' + (ch.kidName || 'Child') + ': ' + jsonErr.toString() + ' | raw: ' + resp.getContentText().substring(0, 300));
            continue;
          }

          var syncRes = data.result || data;
          if (!syncRes || syncRes.error || !syncRes.classroom) {
            McpLogger.log('WARN', 'MASTER_SYNC_BAD_RESPONSE', 'extract_classroom_and_gmail returned no usable classroom data for ' + (ch.kidName || 'Child') + ': ' + JSON.stringify(syncRes).substring(0, 300));
            continue;
          }

          var downloadFailed = 0;
          var failedAttachments = [];

          var it = kidFolder.getFoldersByName('classroom');
          var classFolder = it.hasNext() ? it.next() : kidFolder.createFolder('classroom');
          var attIt = classFolder.getFoldersByName('attachments');
          var attachFolder = attIt.hasNext() ? attIt.next() : classFolder.createFolder('attachments');

          var emIt = kidFolder.getFoldersByName('emails');
          var emailsFolder = emIt.hasNext() ? emIt.next() : kidFolder.createFolder('emails');
          var emAttIt = emailsFolder.getFoldersByName('attachments');
          var emailAttachFolder = emAttIt.hasNext() ? emAttIt.next() : emailsFolder.createFolder('attachments');

          // Save classroom_data.json (merging with existing)
          var fIt = classFolder.getFilesByName('classroom_data.json');
          var finalClassroom = syncRes.classroom;
          var exFile = null;
          var exClassroomContent = '';
          if (fIt.hasNext()) {
            exFile = fIt.next();
            try {
              exClassroomContent = (typeof exFile.getBlob === 'function') ? exFile.getBlob().getDataAsString() : (typeof exFile.getContent === 'function' ? exFile.getContent() : '');
              var exData = JSON.parse(exClassroomContent);
              if (exData && exData.courses && syncRes.classroom && syncRes.classroom.courses) {
                finalClassroom = mergeClassroomData(exData, syncRes.classroom);
              }
            } catch (pErr) {}
          }
          var jsonStr = JSON.stringify(finalClassroom, null, 2);
          if (exFile) {
            if (exClassroomContent !== jsonStr) {
              exFile.setContent(jsonStr);
            }
          } else {
            classFolder.createFile('classroom_data.json', jsonStr, 'application/json');
          }

          // 1-query batch cache for Email Attachments
          var existingEmailFiles = {};
          try {
            var efIt = emailAttachFolder.getFiles();
            while (efIt.hasNext()) {
              var ef = efIt.next();
              var efn = ef.getName();
              existingEmailFiles[efn] = true;
              existingEmailFiles[efn.toLowerCase()] = true;
            }
          } catch (efErr) {}

          // PRIORITY 1: Download urgent email circular attachments & strip base64 from memory
          if (syncRes.gmail && syncRes.gmail.emails && Array.isArray(syncRes.gmail.emails)) {
            var emails = syncRes.gmail.emails;
            for (var emIdx = 0; emIdx < emails.length; emIdx++) {
              var emailItem = emails[emIdx];
              if (emailItem.attachments && Array.isArray(emailItem.attachments)) {
                for (var eaIdx = 0; eaIdx < emailItem.attachments.length; eaIdx++) {
                  if (isTimeExpiring()) {
                    scheduleContinuation();
                    return { success: true, continuationScheduled: true, checkpoint: 'email_att_' + eaIdx };
                  }
                  var eAtt = emailItem.attachments[eaIdx];
                  if (!eAtt || !eAtt.name) continue;
                  var rawAttName = (eAtt.name || 'attachment').replace(/(\.pdf)+$/i, '').replace(/\.{2,}/g, '.');
                  var cleanSubject = (emailItem.subject || 'circular').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
                  var isPdf = (eAtt.name || '').toLowerCase().indexOf('.pdf') !== -1;
                  var eTargetName = eAtt.cleanName || (cleanSubject + '_' + rawAttName + (isPdf ? '.pdf' : ''));

                  if (existingEmailFiles[eTargetName] || existingEmailFiles[eTargetName.toLowerCase()]) {
                    delete eAtt.base64;
                    continue;
                  }

                  try {
                    var eBlob = null;
                    if (eAtt.base64) {
                      var eDecoded = Utilities.base64Decode(eAtt.base64);
                      eBlob = Utilities.newBlob(eDecoded, eAtt.mimeType || 'application/octet-stream', eTargetName);
                    } else if (eAtt.fileId) {
                      var gBlobRes = UrlFetchApp.fetch(ch.schoolWorkerUrl, {
                        method: 'POST',
                        contentType: 'application/json',
                        payload: JSON.stringify({ method: 'get_file_blob', params: { fileId: eAtt.fileId } }),
                        muteHttpExceptions: true
                      });
                      if (gBlobRes.getResponseCode() === 200) {
                        var gData = JSON.parse(gBlobRes.getContentText());
                        var gObj = gData.result || gData;
                        if (gObj && gObj.base64) {
                          eBlob = Utilities.newBlob(Utilities.base64Decode(gObj.base64), gObj.mimeType || 'application/octet-stream', eTargetName);
                        }
                      }
                    } else if (emailItem.id) {
                      var mBlobRes = UrlFetchApp.fetch(ch.schoolWorkerUrl, {
                        method: 'POST',
                        contentType: 'application/json',
                        payload: JSON.stringify({ method: 'get_gmail_attachment', params: { messageId: emailItem.id, attachmentIndex: eaIdx, filename: eAtt.name } }),
                        muteHttpExceptions: true
                      });
                      if (mBlobRes.getResponseCode() === 200) {
                        var mData = JSON.parse(mBlobRes.getContentText());
                        var mObj = mData.result || mData;
                        if (mObj && mObj.base64) {
                          eBlob = Utilities.newBlob(Utilities.base64Decode(mObj.base64), mObj.mimeType || 'application/octet-stream', eTargetName);
                        }
                      }
                    }
                    if (eBlob) {
                      var newEmailFile = emailAttachFolder.createFile(eBlob);
                      existingEmailFiles[eTargetName] = true;
                      existingEmailFiles[eTargetName.toLowerCase()] = true;
                      eAtt.fileId = newEmailFile.getId();
                      eAtt.driveUrl = newEmailFile.getUrl();
                    } else if (eAtt.base64 || eAtt.fileId || emailItem.id) {
                      downloadFailed++;
                      failedAttachments.push({ type: 'email', name: eTargetName, fileId: eAtt.fileId || null, subject: emailItem.subject || '', reason: 'no_blob_returned' });
                    }
                  } catch (eBlobErr) {
                    downloadFailed++;
                    failedAttachments.push({ type: 'email', name: eTargetName, fileId: eAtt.fileId || null, subject: emailItem.subject || '', reason: eBlobErr.toString() });
                  }
                  delete eAtt.base64; // Strip base64 to prevent JSON bloat
                }
              }
            }
          }

          // Save school_emails.json (merging with existing and purging any legacy inline base64)
          if (syncRes.gmail && syncRes.gmail.emails) {
            try {
              var emailFileIt = emailsFolder.getFilesByName('school_emails.json');
              var finalEmails = syncRes.gmail;
              var exEmailFile = null;
              var exEmailContent = '';
              if (emailFileIt.hasNext()) {
                exEmailFile = emailFileIt.next();
                try {
                  exEmailContent = (typeof exEmailFile.getBlob === 'function') ? exEmailFile.getBlob().getDataAsString() : (typeof exEmailFile.getContent === 'function' ? exEmailFile.getContent() : '');
                  var exEmailData = JSON.parse(exEmailContent);
                  if (exEmailData && exEmailData.emails) {
                    var eMap = {};
                    var combEmails = [];
                    (syncRes.gmail.emails || []).concat(exEmailData.emails || []).forEach(function(em) {
                      if (em && em.id && !eMap[em.id]) {
                        eMap[em.id] = true;
                        // Purge legacy base64 and save to Drive
                        if (em.attachments && Array.isArray(em.attachments)) {
                          em.attachments.forEach(function(legacyAtt) {
                            if (legacyAtt && legacyAtt.base64) {
                              try {
                                var lRaw = (legacyAtt.name || 'attachment').replace(/(\.pdf)+$/i, '').replace(/\.{2,}/g, '.');
                                var lExt = (legacyAtt.name || '').toLowerCase().indexOf('.pdf') !== -1 ? '.pdf' : '';
                                var lTarget = legacyAtt.cleanName || ((em.subject || 'circular').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20) + '_' + lRaw + lExt);
                                if (!existingEmailFiles[lTarget] && !existingEmailFiles[lTarget.toLowerCase()]) {
                                  var lBlob = Utilities.newBlob(Utilities.base64Decode(legacyAtt.base64), legacyAtt.mimeType || 'application/octet-stream', lTarget);
                                  var lf = emailAttachFolder.createFile(lBlob);
                                  existingEmailFiles[lTarget] = true;
                                  existingEmailFiles[lTarget.toLowerCase()] = true;
                                  legacyAtt.fileId = lf.getId();
                                  legacyAtt.driveUrl = lf.getUrl();
                                }
                              } catch (lErr) {}
                              delete legacyAtt.base64;
                            }
                          });
                        }
                        combEmails.push(em);
                      }
                    });
                    finalEmails = {
                      kidName: syncRes.gmail.kidName || ch.kidName,
                      academicYear: syncRes.gmail.academicYear || ch.academicYear,
                      schoolDomain: syncRes.gmail.schoolDomain || ch.schoolDomain,
                      lastSyncedAt: new Date().toISOString(),
                      totalEmails: combEmails.length,
                      totalAttachments: combEmails.reduce(function(a, x) { return a + (x.attachments ? x.attachments.length : 0); }, 0),
                      emails: combEmails
                    };
                  }
                } catch (emErr) {}
              }
              if (finalEmails && finalEmails.emails) {
                finalEmails.emails.forEach(function(fe) {
                  if (fe.attachments) {
                    fe.attachments.forEach(function(fa) { delete fa.base64; });
                  }
                });
              }
              var emailJsonStr = JSON.stringify(finalEmails, null, 2);
              if (exEmailFile) {
                if (exEmailContent !== emailJsonStr) {
                  exEmailFile.setContent(emailJsonStr);
                }
              } else {
                emailsFolder.createFile('school_emails.json', emailJsonStr, 'application/json');
              }
            } catch (gSaveErr) {}
          }

          // Save digest
          if (syncRes.digest) {
            var dIt = kidFolder.getFilesByName('daily_digest.json');
            var dStr = JSON.stringify(syncRes.digest, null, 2);
            if (dIt.hasNext()) {
              var dFile = dIt.next();
              try {
                var curDigestStr = (typeof dFile.getBlob === 'function') ? dFile.getBlob().getDataAsString() : (typeof dFile.getContent === 'function' ? dFile.getContent() : '');
                if (curDigestStr !== dStr) {
                  dFile.setContent(dStr);
                }
              } catch (dErr) {
                dFile.setContent(dStr);
              }
            } else {
              kidFolder.createFile('daily_digest.json', dStr, 'application/json');
            }
          }

          // PRIORITY 2: Download Classroom attachments with time budget checks (OCR decoupled)
          if (syncRes.classroom.courses && Array.isArray(syncRes.classroom.courses)) {
            var existingClassFiles = {};
            try {
              var cfIt = attachFolder.getFiles();
              while (cfIt.hasNext()) {
                var f = cfIt.next();
                var fn = f.getName();
                if (fn && fn.indexOf('temp_ocr_') === 0) {
                  try { f.setTrashed(true); } catch (tErr) {}
                  continue;
                }
                existingClassFiles[fn] = true;
                existingClassFiles[fn.toLowerCase()] = true;
              }
            } catch (cfErr) {}

            var courses = syncRes.classroom.courses;
            for (var cIdx = 0; cIdx < courses.length; cIdx++) {
              var c = courses[cIdx];
              var cName = (c.name || 'Course').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15);
              var allItems = (c.announcements || []).concat(c.courseWork || []).concat(c.materials || []);
              for (var itIdx = 0; itIdx < allItems.length; itIdx++) {
                var itm = allItems[itIdx];
                if (itm.attachments && Array.isArray(itm.attachments)) {
                  for (var aIdx = 0; aIdx < itm.attachments.length; aIdx++) {
                    if (isTimeExpiring()) {
                      scheduleContinuation();
                      return { success: true, continuationScheduled: true, checkpoint: 'classroom_' + aIdx };
                    }
                    var att = itm.attachments[aIdx];
                    if (!att || !att.fileId) continue;
                    var rawTitle = (att.title || att.fileId).replace(/(\.pdf)+$/i, '').replace(/\.{2,}/g, '.');
                    var isClassPdf = (att.title || '').toLowerCase().indexOf('.pdf') !== -1;
                    var attTargetName = att.targetName || (cName + '_' + rawTitle);
                    // Ensure file extension is present — Drive auto-appends extensions from MIME type,
                    // so files on disk have .pdf but targetName from ClassroomIngester may not
                    if (isClassPdf && !/\.pdf$/i.test(attTargetName)) {
                      attTargetName += '.pdf';
                    } else if (!isClassPdf) {
                      var extMatch = (att.title || '').match(/(\.[a-zA-Z0-9]{2,5})$/);
                      if (extMatch && !attTargetName.endsWith(extMatch[1])) {
                        attTargetName += extMatch[1];
                      }
                    }
                    if (existingClassFiles[attTargetName] || existingClassFiles[attTargetName.toLowerCase()]) continue;

                    try {
                      var blobRes = UrlFetchApp.fetch(ch.schoolWorkerUrl, {
                        method: 'POST',
                        contentType: 'application/json',
                        payload: JSON.stringify({
                          method: 'get_file_blob',
                          params: { fileId: att.fileId }
                        }),
                        muteHttpExceptions: true
                      });
                      if (blobRes.getResponseCode() === 200) {
                        var blobData = JSON.parse(blobRes.getContentText());
                        var blobObj = blobData.result || blobData;
                        if (blobObj && blobObj.base64) {
                          var decoded = Utilities.base64Decode(blobObj.base64);
                          var newBlob = Utilities.newBlob(decoded, blobObj.mimeType || 'application/octet-stream', attTargetName);
                          attachFolder.createFile(newBlob);
                          existingClassFiles[attTargetName] = true;
                          existingClassFiles[attTargetName.toLowerCase()] = true;
                        } else {
                          downloadFailed++;
                          failedAttachments.push({ type: 'classroom', name: attTargetName, fileId: att.fileId, course: c.name || '', reason: 'no_base64_in_response' });
                        }
                      } else {
                        downloadFailed++;
                        failedAttachments.push({ type: 'classroom', name: attTargetName, fileId: att.fileId, course: c.name || '', reason: 'http_' + blobRes.getResponseCode() });
                      }
                    } catch (blobErr) {
                      downloadFailed++;
                      failedAttachments.push({ type: 'classroom', name: attTargetName, fileId: att.fileId, course: c.name || '', reason: blobErr.toString() });
                    }
                  }
                }
              }
            }
          }

          if (failedAttachments.length > 0) {
            McpLogger.log('WARN', 'ATTACHMENT_DOWNLOAD_FAILURES', { kidName: ch.kidName, academicYear: ch.academicYear, count: failedAttachments.length, items: failedAttachments });
          }
          try { McpLogger.saveToVault(kidFolder); } catch (saveErr) {}

          syncedCount++;
          if (isChildInitial) {
            if (downloadFailed === 0) {
              ch.initialSyncComplete = true;
              ch.lastInitialSyncedAt = new Date().toISOString();
              props.setProperty('multi_child_school_registry', JSON.stringify(registry));
              props.deleteProperty('initial_sync_in_progress_child');
              McpLogger.log('SUCCESS', 'INITIAL_SYNC_COMPLETE', '1-Time data sync completed for ' + (ch.kidName || 'Child') + ' — all attachments verified on Drive.');
              try {
                setupMasterCloudSyncTrigger();
              } catch (trigErr) {}
              try {
                if (typeof DigestBuilder !== 'undefined' && DigestBuilder.build) {
                  DigestBuilder.build(kidFolder);
                }
              } catch (digErr) {}
              // Schedule autonomous OCR indexing chain to index 100% of newly downloaded vault files
              try {
                var ocrTrigs = ScriptApp.getProjectTriggers();
                for (var ot = 0; ot < ocrTrigs.length; ot++) {
                  if (ocrTrigs[ot].getHandlerFunction() === 'runAutonomousVaultOcr') {
                    ScriptApp.deleteTrigger(ocrTrigs[ot]);
                  }
                }
                ScriptApp.newTrigger('runAutonomousVaultOcr').timeBased().after(5000).create();
                McpLogger.log('INFO', 'OCR_TRIGGER_SCHEDULED', 'Autonomous OCR indexing scheduled to start in 5 seconds.');
              } catch (ocrTrigErr) {}
            } else {
              McpLogger.log('WARN', 'INITIAL_SYNC_INCOMPLETE', downloadFailed + ' attachment download(s) failed for ' + (ch.kidName || 'Child') + '. Scheduling 10s retry.');
              scheduleContinuation();
            }
          } else {
            McpLogger.log('SUCCESS', 'MASTER_CLOUD_SYNC_OK', 'Autonomous 24/7 cloud sync succeeded for ' + (ch.kidName || 'Child') + ' under Parent Account.');
            try {
              if (typeof DigestBuilder !== 'undefined' && DigestBuilder.build) {
                DigestBuilder.build(kidFolder);
              }
            } catch (digErr2) {}
          }
        }
      } catch (err) {
        McpLogger.log('ERROR', 'MASTER_SYNC_CHILD_ERROR', 'runMasterCloudSchoolSync failed while processing ' + (ch.kidName || 'Child') + ': ' + err.toString() + (err.stack ? (' | stack: ' + err.stack) : ''));
        try { McpLogger.saveToVault(kidFolder); } catch (saveErr) {}
      }
    }
    return { success: true, syncedCount: syncedCount, initialSyncComplete: true };
  } finally {
    if (childLockKey) {
      try { props.deleteProperty(childLockKey); } catch (e) {}
    } else if (typeof globalLock !== 'undefined' && globalLock) {
      try { globalLock.releaseLock(); } catch (e) {}
    }
  }
}

function mergeClassroomData(existing, incoming) {
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

/**
 * Autonomous Vault OCR Continuation Engine:
 * Indexes newly ingested attachments across classroom, emails, and whatsapp
 * in discrete batches of 15. If pending files remain, automatically schedules
 * the next 20-second continuation trigger until all vault documents are 100% indexed.
 */
function runAutonomousVaultOcr() {
  var props = PropertiesService.getScriptProperties();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    // Check if quiet hours is active (11 PM to 6 AM IST)
    var nowCheck = new Date();
    var istHourCheck = new Date(nowCheck.getTime() + (5.5 * 60 * 60 * 1000)).getUTCHours();
    if (istHourCheck < 23 && istHourCheck >= 6) {
      try {
        var existingTrigs = ScriptApp.getProjectTriggers();
        var hasTrigger = false;
        for (var t = 0; t < existingTrigs.length; t++) {
          if (existingTrigs[t].getHandlerFunction() === 'runAutonomousVaultOcr') {
            hasTrigger = true;
            break;
          }
        }
        if (!hasTrigger) {
          ScriptApp.newTrigger('runAutonomousVaultOcr').timeBased().after(45000).create();
          McpLogger.log('INFO', 'OCR_LOCK_BUSY_RESCHEDULED', 'Script lock busy (sync in progress); rescheduled OCR continuation in 45s.');
        }
      } catch (rErr) {}
    }
    return { skipped: true, reason: 'Script lock busy; continuation rescheduled' };
  }

  try {
    // Delete any existing OCR continuation triggers to avoid duplicate queues
    var trigs = ScriptApp.getProjectTriggers();
    for (var i = 0; i < trigs.length; i++) {
      if (trigs[i].getHandlerFunction() === 'runAutonomousVaultOcr') {
        ScriptApp.deleteTrigger(trigs[i]);
      }
    }

    var foldersToIndex = [];
    var raw = props.getProperty('multi_child_school_registry');
    if (raw) {
      try {
        var reg = JSON.parse(raw);
        (reg.children || []).forEach(function(ch) {
          if (ch && ch.targetFolderId) foldersToIndex.push(ch.targetFolderId);
        });
      } catch (e) {}
    }
    if (foldersToIndex.length === 0) {
      var tfId = props.getProperty('target_folder_id');
      if (tfId) foldersToIndex.push(tfId);
    }

    var totalRemaining = 0;
    var totalProcessed = 0;

    for (var f = 0; f < foldersToIndex.length; f++) {
      var kFolder = null;
      try { kFolder = DriveApp.getFolderById(foldersToIndex[f]); } catch (e) {}
      if (!kFolder || kFolder.isTrashed()) continue;

      if (typeof DocumentOcrService !== 'undefined') {
        var res = DocumentOcrService.runAutomatedVaultIndexing(kFolder, 15);
        if (res) {
          totalProcessed += (res.processed || 0);
          totalRemaining += (res.totalPendingRemaining || 0);
        }
      }
    }

    // Don't schedule OCR continuation during quiet hours — morning resume will restart
    var now = new Date();
    var istHour = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)).getUTCHours();
    if (istHour >= 23 || istHour < 6) {
      McpLogger.log('INFO', 'OCR_QUIET_HOURS_PAUSE', 'OCR paused for quiet hours. Processed: ' + totalProcessed + ', remaining: ' + totalRemaining + '. Will resume at 6 AM IST.');
      return { success: true, processed: totalProcessed, totalRemaining: totalRemaining, quietHours: true };
    }

    if (totalRemaining > 0) {
      try {
        ScriptApp.newTrigger('runAutonomousVaultOcr')
          .timeBased()
          .after(20000)
          .create();
        McpLogger.log('INFO', 'OCR_CONTINUATION_TRIGGER_SET', 'Batch indexed ' + totalProcessed + ' files. ' + totalRemaining + ' pending. Next batch in 20s.');
      } catch (trigErr) {
        McpLogger.log('WARN', 'OCR_CONTINUATION_TRIGGER_FAIL', trigErr.toString());
      }
    } else {
      McpLogger.log('SUCCESS', 'OCR_INDEXING_COMPLETE', 'All vault attachments successfully OCR indexed (' + totalProcessed + ' in last batch).');
    }

    return { success: true, processed: totalProcessed, totalRemaining: totalRemaining };
  } finally {
    lock.releaseLock();
  }
}

function handleSetupTriggers(params) {
  var type = params.type; // 'school_1min' or 'portal_6hr' or 'master_cloud_1min'
  var res;
  if (type === 'school_1min') {
    res = setupMinuteTrigger();
    return {
      triggerSet: !!(res && res.success),
      cadence: 'everyMinutes(1)',
      error: res && !res.success ? res.error : null,
      details: res
    };
  } else if (type === 'portal_6hr') {
    res = setupSixHourTrigger();
    return {
      triggerSet: !!(res && res.success),
      cadence: 'everyHours(6)',
      error: res && !res.success ? res.error : null,
      details: res
    };
  } else if (type === 'master_cloud_1min' || type === 'master_cloud_1hr') {
    res = setupMasterCloudSyncTrigger();
    return {
      triggerSet: !!(res && res.success),
      cadence: 'everyMinutes(1)',
      error: res && !res.success ? res.error : null,
      details: res
    };
  }
  return { triggerSet: false, error: 'Unknown trigger type: ' + type };
}

/**
 * Worker A Trigger: 1-Minute Incremental Background Cron for School Account
 */
function runIncrementalSchoolSync(forceRun) {
  var props = PropertiesService.getScriptProperties();

  // FAST-EXIT GUARD 0: IST Quiet Hours (11:00 PM to 6:00 AM IST)
  // Automatic triggers pause during night hours (23:00 to 06:00 IST).
  if (forceRun !== true && props.getProperty('quiet_hours_disabled') !== 'true') {
    var now = new Date();
    var istHour = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)).getUTCHours();
    if (istHour >= 23 || istHour < 6) {
      try {
        pauseNightlySyncTriggers();
      } catch (delErr) {}
      return { skipped: true, status: 'quiet_hours_ist_11pm_to_6am', reason: 'Deleted trigger for quiet hours (11 PM to 6 AM IST)' };
    }
  }

  // Fast-Exit Guard 1 (< 5ms): Do not execute if 1-time initial data extraction is incomplete
  if (props.getProperty('initial_sync_complete') !== 'true') {
    return { skipped: true, reason: 'awaiting_1time_sync_completion' };
  }

  // Fast-Exit Guard 2 (< 10ms): In dual-worker mode, Master Personal Worker orchestrates sync 24/7.
  // The School Cloud Worker is passive. Clean up any redundant trigger and exit immediately.
  var isDual = props.getProperty('is_dual_worker') === 'true' ||
               (typeof CONFIG !== 'undefined' && CONFIG.isDualWorker);
  if (isDual) {
    try {
      var triggers = ScriptApp.getProjectTriggers();
      for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].getHandlerFunction() === 'runIncrementalSchoolSync') {
          ScriptApp.deleteTrigger(triggers[i]);
        }
      }
    } catch (tErr) {}
    return { skipped: true, reason: 'managed_by_master_worker' };
  }

  var folderId = props.getProperty('target_folder_id');
  var childName = props.getProperty('child_name') || 'Atharva';
  var academicYear = props.getProperty('academic_year') || '2026-2027';
  var schoolDomain = props.getProperty('school_domain') || '';

  if (!folderId) return { skipped: true, reason: 'no_target_folder' };

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { skipped: true, reason: 'locked' };

  McpLogger.log('INFO', 'RUN_INCREMENTAL_SCHOOL_SYNC_INVOKED', 'runIncrementalSchoolSync running for ' + childName + '.');

  try {
    ClassroomIngester.sync(folderId, childName, academicYear, true, false);
    GmailIngester.sync(folderId, childName, academicYear, schoolDomain, true, false);
    DigestBuilder.build(folderId, childName, academicYear);
    try {
      McpLogger.saveToVault(DriveApp.getFolderById(folderId));
    } catch (saveErr) {}
    // Schedule autonomous OCR indexing chain for newly downloaded vault files.
    // Mirrors the same continuation-trigger pattern used in runMasterCloudSchoolSync,
    // so single-worker deployments get OCR coverage too, not just dual-worker ones.
    try {
      var ocrIncTrigs = ScriptApp.getProjectTriggers();
      for (var oit = 0; oit < ocrIncTrigs.length; oit++) {
        if (ocrIncTrigs[oit].getHandlerFunction() === 'runAutonomousVaultOcr') {
          ScriptApp.deleteTrigger(ocrIncTrigs[oit]);
        }
      }
      ScriptApp.newTrigger('runAutonomousVaultOcr').timeBased().after(5000).create();
    } catch (ocrIncTrigErr) {
      McpLogger.log('WARN', 'OCR_TRIGGER_SCHEDULE_FAIL', 'Could not schedule OCR indexing after incremental sync: ' + ocrIncTrigErr);
    }
  } catch (e) {
    McpLogger.log('ERROR', 'SCHOOL_CRON_ERROR', '1-Minute sync error: ' + e);
    try { McpLogger.saveToVault(DriveApp.getFolderById(folderId)); } catch (saveErr) {}
  } finally {
    lock.releaseLock();
  }
}

/**
 * Worker B Trigger: 6-Hour Background Cron for Personal Account
 */
function runIncrementalPortalSync() {
  PortalIngester.syncAll();
}

/**
 * Safely removes and deletes ALL project triggers.
 * Used during teardown, rollback on authorization cancel, or failure cleanup.
 */
function clearAllProjectTriggers() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    var count = 0;
    for (var i = 0; i < triggers.length; i++) {
      try {
        ScriptApp.deleteTrigger(triggers[i]);
        count++;
      } catch (delErr) {}
    }
    McpLogger.log('INFO', 'TRIGGERS_PURGED', 'Successfully deleted ' + count + ' project triggers.');
    return { success: true, count: count };
  } catch (err) {
    McpLogger.log('WARN', 'TRIGGERS_PURGE_ERROR', 'Failed to purge project triggers: ' + err);
    return { success: false, error: err.toString() };
  }
}

function setupAutonomousTriggers(workerType) {
  var installed = [];
  var isMaster = workerType === 'master' ||
                 (typeof CONFIG !== 'undefined' && (CONFIG.childName === 'Master' || CONFIG.academicYear === 'Family')) ||
                 !!PropertiesService.getScriptProperties().getProperty('multi_child_school_registry');

  try {
    var triggers = ScriptApp.getProjectTriggers();
    if (isMaster) {
      for (var i = 0; i < triggers.length; i++) {
        var hFn = triggers[i].getHandlerFunction();
        if (hFn === 'runMasterCloudSchoolSync' || hFn === 'runIncrementalSchoolSync') {
          ScriptApp.deleteTrigger(triggers[i]);
        }
      }

      var props = PropertiesService.getScriptProperties();
      var rawReg = props.getProperty('multi_child_school_registry');
      var canInstallSync = false;
      if (rawReg) {
        try {
          var parsedReg = JSON.parse(rawReg);
          canInstallSync = (parsedReg.children || []).some(function(c) { return c && c.initialSyncComplete === true; });
        } catch(e) {}
      }

      // Ensure daily 11 PM (pause) and 6 AM (resume) IST schedule triggers are installed
      setupQuietHoursScheduleTriggers();

      if (canInstallSync) {
        ScriptApp.newTrigger('runMasterCloudSchoolSync').timeBased().everyMinutes(1).create();
        installed.push('runMasterCloudSchoolSync (1m)');
        McpLogger.log('SUCCESS', 'TRIGGER_CREATED', 'Created 1-minute autonomous Master Cloud trigger.');
      } else {
        installed.push('runMasterCloudSchoolSync (deferred until 1-time sync completes)');
        McpLogger.log('INFO', 'TRIGGER_DEFERRED', 'Master Cloud trigger deferred until child initial data sync completes.');
      }

      for (var j = 0; j < triggers.length; j++) {
        if (triggers[j].getHandlerFunction() === 'runIncrementalPortalSync') {
          ScriptApp.deleteTrigger(triggers[j]);
        }
      }
      var portalInit = setupSixHourTrigger();
      var portalLabel = (portalInit && portalInit.installed && portalInit.installed.length > 0)
        ? ('runIncrementalPortalSync (per-child: ' + portalInit.installed.join(',') + ')')
        : 'runIncrementalPortalSync (6h)';
      installed.push(portalLabel);
    } else {
      // Clean up any existing duplicate triggers
      for (var k = 0; k < triggers.length; k++) {
        if (triggers[k].getHandlerFunction() === 'runIncrementalSchoolSync') {
          ScriptApp.deleteTrigger(triggers[k]);
        }
      }
      var props = PropertiesService.getScriptProperties();
      var isDual = props.getProperty('is_dual_worker') === 'true' ||
                   (typeof CONFIG !== 'undefined' && CONFIG.isDualWorker);
      if (!isDual) {
        ScriptApp.newTrigger('runIncrementalSchoolSync').timeBased().everyMinutes(1).create();
        installed.push('runIncrementalSchoolSync (1m)');
        McpLogger.log('SUCCESS', 'TRIGGER_CREATED', 'Created 1-minute School Cloud trigger.');
      } else {
        installed.push('School Cloud Worker registered (managed by Master Cloud Worker)');
        McpLogger.log('INFO', 'TRIGGER_SKIPPED', 'School Cloud Worker is managed by Master Cloud Worker. Standalone trigger skipped.');
      }
    }
  } catch (e) {
    McpLogger.log('ERROR', 'TRIGGER_CREATION_FAILED', 'Failed to create autonomous trigger: ' + e);
    return { success: false, error: e.toString() };
  }

  return { success: true, isMaster: isMaster, installed: installed };
}

function setupMinuteTrigger() {
  return setupAutonomousTriggers('school');
}

function setupSixHourTrigger() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'runIncrementalPortalSync') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
    var props = PropertiesService.getScriptProperties();
    var rawPortalReg = props.getProperty('multi_child_portal_registry');
    var installed = [];
    if (rawPortalReg) {
      try {
        var pReg = JSON.parse(rawPortalReg);
        (pReg.children || []).forEach(function(pc) {
          if (pc && pc.childId && pc.domains && Object.keys(pc.domains).length > 0) {
            setupChildPortalTrigger(pc.childId);
            installed.push(pc.childId);
          }
        });
      } catch (e) {}
    }
    if (installed.length === 0) {
      ScriptApp.newTrigger('runIncrementalPortalSync').timeBased().everyHours(6).create();
      McpLogger.log('SUCCESS', 'TRIGGER_CREATED', 'Created fallback 6-hour cloud time trigger for School Portal scraping.');
    } else {
      McpLogger.log('SUCCESS', 'TRIGGER_CREATED', 'Initialized per-child portal burst triggers for: ' + installed.join(', '));
    }
    return { success: true, installed: installed };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function handleToolsList() {
  return {
    tools: [
      { name: 'sync_classroom_and_gmail', description: 'Run full sync of Classroom & Gmail', inputSchema: { type: 'object', properties: {} } },
      { name: 'sync_all_portals', description: 'Run full scraping of registered school portals', inputSchema: { type: 'object', properties: {} } },
      { name: 'sync_child_portal_burst', description: 'Run a 90-second burst of portal scraping for a specific child', inputSchema: { type: 'object', properties: { childId: { type: 'string' } } } },
      { name: 'register_portal_job', description: 'Register a child school portal endpoint', inputSchema: { type: 'object', properties: {} } },
      {
        name: 'search_vault_documents',
        description: 'Searches all school worksheets, circulars, scanned PDFs, WhatsApp chat images, and school portal downloads (fee receipts, report cards, notices) across all subjects and dates using intelligent full-text OCR indexing.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Keyword or phrase to search for inside documents and images (e.g. "Linear equations worksheet", "fee notice", "sports day")' },
            childName: { type: 'string', description: 'Optional child first name to filter search' }
          },
          required: ['query']
        }
      }
    ]
  };
}

function handleToolsCall(name, args) {
  if (name === 'sync_classroom_and_gmail') {
    return handleSyncClassroomAndGmail(args);
  } else if (name === 'sync_all_portals') {
    return handleSyncAllPortals(args);
  } else if (name === 'sync_child_portal_burst') {
    return PortalIngester.syncChildBurst(args.childId || args.childName);
  } else if (name === 'register_portal_job') {
    return handleRegisterPortalJob(args);
  } else if (name === 'search_vault_documents') {
    var kidFolder = null;
    var targetFolderId = PropertiesService.getScriptProperties().getProperty('target_folder_id');
    if (targetFolderId) {
      try { kidFolder = DriveApp.getFolderById(targetFolderId); } catch (e) {}
    }
    return DocumentOcrService.searchVaultDocuments(kidFolder, args.query);
  }
  throw new Error('Tool not found: ' + name);
}

function handleSetSyncState(params) {
  var props = PropertiesService.getScriptProperties();
  var updates = {};
  if (params.initialSyncComplete !== undefined) {
    updates.initial_sync_complete = params.initialSyncComplete ? 'true' : 'false';
  }
  if (params.isDualWorker !== undefined) {
    updates.is_dual_worker = params.isDualWorker ? 'true' : 'false';
  }
  if (params.targetFolderId) {
    updates.target_folder_id = params.targetFolderId;
  }
  if (params.childName) {
    updates.child_name = params.childName;
  }
  if (params.academicYear) {
    updates.academic_year = params.academicYear;
  }
  if (params.schoolDomain) {
    updates.school_domain = params.schoolDomain;
  }

  props.setProperties(updates);

  // If dual-worker mode is active, clean up any existing school-side triggers
  if (updates.is_dual_worker === 'true') {
    try {
      var triggers = ScriptApp.getProjectTriggers();
      for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].getHandlerFunction() === 'runIncrementalSchoolSync') {
          ScriptApp.deleteTrigger(triggers[i]);
        }
      }
    } catch (e) {}
  }

  return { success: true, updated: updates };
}

function handleActivateIncrementalTriggers(params) {
  var childName = params ? (params.childName || params.kidName) : null;
  var academicYear = params ? params.academicYear : null;
  var props = PropertiesService.getScriptProperties();

  // Mark in multi_child_school_registry
  var rawReg = props.getProperty('multi_child_school_registry');
  if (rawReg) {
    try {
      var reg = JSON.parse(rawReg);
      (reg.children || []).forEach(function(c) {
        if (!childName || c.childName === childName || c.kidName === childName) {
          c.initialSyncComplete = true;
          c.lastInitialSyncedAt = new Date().toISOString();
        }
      });
      props.setProperty('multi_child_school_registry', JSON.stringify(reg));
    } catch(e) {}
  }
  props.setProperty('initial_sync_complete', 'true');
  props.deleteProperty('initial_sync_in_progress_child');

  // Activate recurring Master Cloud Sync trigger (defaults to 1-minute cadence)
  var mins = (params && params.intervalMinutes) ? params.intervalMinutes : 1;
  var trigRes = setupMasterCloudSyncTrigger(mins);
  McpLogger.log('SUCCESS', 'INCREMENTAL_TRIGGERS_ACTIVATED', '1-Time data sync complete. Activated recurring incremental sync trigger for ' + (childName || 'Child'));
  return {
    success: true,
    initialSyncComplete: true,
    triggerResult: trigRes
  };
}
