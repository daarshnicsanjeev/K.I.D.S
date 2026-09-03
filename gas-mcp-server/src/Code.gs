/**
 * Google Apps Script Cloud Ingestion Engine (JSON-RPC 2.0 & Autonomous Triggers)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    version: "4.0.0",
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
    } else if (method === "tools/call") {
      result = handleToolsCall(params.name, params.arguments || {});
    } else if (method === "sync_classroom_and_gmail") {
      result = handleSyncClassroomAndGmail(params);
    } else if (method === "sync_all_portals") {
      result = handleSyncAllPortals(params);
    } else if (method === "register_portal_job" || method === "register_mcp_tool") {
      result = handleRegisterPortalJob(params);
    } else if (method === "setup_triggers") {
      result = handleSetupTriggers(params);
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
  var folderId = params.targetFolderId || PropertiesService.getScriptProperties().getProperty('target_folder_id');
  var childName = params.childName || 'Atharva';
  var academicYear = params.academicYear || '2026-2027';
  var schoolDomain = params.schoolDomain || '';

  if (!folderId) throw new Error("targetFolderId is required for Classroom & Gmail sync.");

  PropertiesService.getScriptProperties().setProperties({
    target_folder_id: folderId,
    child_name: childName,
    academic_year: academicYear,
    school_domain: schoolDomain
  });

  var classroomRes = ClassroomIngester.sync(folderId, childName, academicYear, false);
  var gmailRes = GmailIngester.sync(folderId, childName, academicYear, schoolDomain, false);
  var digestRes = DigestBuilder.build(folderId, childName, academicYear);

  return {
    success: true,
    classroom: classroomRes,
    gmail: gmailRes,
    digest: digestRes
  };
}

function handleSyncAllPortals(params) {
  var res = PortalIngester.syncAll();
  return { success: true, result: res };
}

function handleRegisterPortalJob(params) {
  var childId = params.childId || 'default_child';
  var kidName = params.childName || params.kidName || 'Atharva';
  var portalFolderId = params.portalFolderId || params.targetFolderId;
  var domain = params.domain;
  var feature = params.feature;
  var endpointSpec = params.endpoint_spec || { url: params.url };
  var authSpec = params.auth_spec || { cookies: params.cookies };

  var props = PropertiesService.getScriptProperties();
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

  return { registered: true, childId: childId, domain: domain, feature: feature };
}

function handleSetupTriggers(params) {
  var type = params.type; // 'school_1min' or 'portal_6hr'
  if (type === 'school_1min') {
    setupMinuteTrigger();
    return { triggerSet: true, cadence: 'everyMinutes(1)' };
  } else if (type === 'portal_6hr') {
    setupSixHourTrigger();
    return { triggerSet: true, cadence: 'everyHours(6)' };
  }
  return { triggerSet: false, error: 'Unknown trigger type' };
}

/**
 * Worker A Trigger: 1-Minute Incremental Background Cron for School Account
 */
function runIncrementalSchoolSync() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('target_folder_id');
  var childName = props.getProperty('child_name') || 'Atharva';
  var academicYear = props.getProperty('academic_year') || '2026-2027';
  var schoolDomain = props.getProperty('school_domain') || '';

  if (!folderId) return;

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;

  try {
    ClassroomIngester.sync(folderId, childName, academicYear, true);
    GmailIngester.sync(folderId, childName, academicYear, schoolDomain, true);
    DigestBuilder.build(folderId, childName, academicYear);
  } catch (e) {
    McpLogger.log('ERROR', 'SCHOOL_CRON_ERROR', '1-Minute sync error: ' + e);
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

function setupMinuteTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'runIncrementalSchoolSync') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('runIncrementalSchoolSync').timeBased().everyMinutes(1).create();
  McpLogger.log('SUCCESS', 'TRIGGER_CREATED', 'Created 1-minute cloud time trigger for Google Classroom & Gmail sync.');
}

function setupSixHourTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'runIncrementalPortalSync') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('runIncrementalPortalSync').timeBased().everyHours(6).create();
  McpLogger.log('SUCCESS', 'TRIGGER_CREATED', 'Created 6-hour cloud time trigger for School Portal scraping.');
}

function handleToolsList() {
  return {
    tools: [
      { name: 'sync_classroom_and_gmail', description: 'Run full sync of Classroom & Gmail', inputSchema: { type: 'object', properties: {} } },
      { name: 'sync_all_portals', description: 'Run full scraping of registered school portals', inputSchema: { type: 'object', properties: {} } },
      { name: 'register_portal_job', description: 'Register a child school portal endpoint', inputSchema: { type: 'object', properties: {} } }
    ]
  };
}

function handleToolsCall(name, args) {
  if (name === 'sync_classroom_and_gmail') {
    return handleSyncClassroomAndGmail(args);
  } else if (name === 'sync_all_portals') {
    return handleSyncAllPortals(args);
  } else if (name === 'register_portal_job') {
    return handleRegisterPortalJob(args);
  }
  throw new Error('Tool not found: ' + name);
}
