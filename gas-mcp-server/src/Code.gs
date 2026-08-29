/**
 * Google Apps Script MCP Engine Entry Point (JSON-RPC 2.0 over HTTP POST)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    mcpVersion: "1.0",
    name: "School Portal MCP Server"
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
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: "School Portal MCP Server",
          version: "1.0.0"
        }
      };
    } else if (method === "notifications/initialized") {
      return ContentService.createTextOutput(JSON.stringify({
        jsonrpc: "2.0",
        id: id !== undefined ? id : null
      })).setMimeType(ContentService.MimeType.JSON);
    } else if (method === "tools/list") {
      result = handleToolsList();
    } else if (method === "tools/call") {
      result = handleToolsCall(params.name, params.arguments || {});
    } else if (method === "register_mcp_tool") {
      result = handleRegisterTool(params);
    } else if (method === "test_preflight_proxy") {
      result = handlePreflightProxy(params);
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

function handleToolsList() {
  var nativeTools = [
    {
      name: 'get_google_classroom_work',
      description: 'Fetch student homework and courses from Google Classroom.',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'get_school_gmail_messages',
      description: 'Fetch school circulars and announcements from Gmail.',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'get_calendar_events',
      description: 'Fetch upcoming school calendar events and deadlines.',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'search_school_whatsapp_messages',
      description: 'Search and query school WhatsApp chat history, homework notices, teacher announcements, attire reminders, and PDFs archived on Google Drive.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Keyword, topic, or question to search for (e.g. "homework", "attire", "bistro", "Radha Krishna", "science notes", "assembly")' },
          child_name: { type: 'string', description: 'Child profile name (default "Atharva")' },
          group_name: { type: 'string', description: 'Filter by specific WhatsApp group name (e.g. "Grade 3B IG parent group 26-27" or "3B Cambridge 2026 - 27")' },
          category: { type: 'string', description: 'Filter by notice category: HOMEWORK, CIRCULAR_NOTICE, EVENT_ACTIVITY, EXAM_SCHEDULE, or GENERAL_CHAT' },
          limit: { type: 'number', description: 'Maximum number of notices to return (default 40)' }
        }
      }
    },
    {
      name: 'get_school_groups_manifest',
      description: 'Retrieve the semantic AI index of all tracked school WhatsApp groups, group descriptions, total notices count, and primary senders.',
      inputSchema: {
        type: 'object',
        properties: {
          child_name: { type: 'string', description: 'Child profile name (default "Atharva")' }
        }
      }
    },
    {
      name: 'get_latest_school_notices',
      description: 'Fetch the most recent school notices and homework updates from the WhatsApp archive.',
      inputSchema: {
        type: 'object',
        properties: {
          child_name: { type: 'string', description: 'Child profile name (default "Atharva")' },
          limit: { type: 'number', description: 'Number of recent notices to return (default 25)' },
          group_name: { type: 'string', description: 'Optional group name filter' }
        }
      }
    }
  ];

  var registered = StorageRepository.getRegisteredTools();
  var portalTools = registered.map(function (t) {
    return {
      name: t.name,
      description: 'Fetch ' + t.feature + ' data from school portal ' + t.domain,
      inputSchema: { type: 'object', properties: {} }
    };
  });

  return { tools: nativeTools.concat(portalTools) };
}

function handleToolsCall(name, args) {
  if (name === 'get_google_classroom_work') {
    return WorkspaceFetcher.getGoogleClassroomWork();
  } else if (name === 'get_school_gmail_messages') {
    return WorkspaceFetcher.getSchoolGmailMessages();
  } else if (name === 'get_calendar_events') {
    return WorkspaceFetcher.getCalendarEvents();
  } else if (name === 'search_school_whatsapp_messages' || name === 'query_whatsapp_history' || name === 'get_whatsapp_school_updates') {
    return WorkspaceFetcher.searchWhatsAppMessages(args);
  } else if (name === 'get_school_groups_manifest') {
    return WorkspaceFetcher.getGroupsManifest(args);
  } else if (name === 'get_latest_school_notices') {
    return WorkspaceFetcher.getLatestSchoolNotices(args);
  }

  // Check registered portal tools
  var registered = StorageRepository.getRegisteredTools();
  for (var i = 0; i < registered.length; i++) {
    if (registered[i].name === name) {
      return PortalApiFetcher.fetchPortalData(registered[i]);
    }
  }

  throw new Error('Tool not found: ' + name);
}

function handleRegisterTool(params) {
  var domain = params.domain;
  var feature = params.feature;
  var endpointSpec = params.endpoint_spec;
  var authSpec = params.auth_spec;

  var toolName = StorageRepository.saveTool(domain, feature, endpointSpec, authSpec);
  return { registered: true, toolName: toolName };
}

function handlePreflightProxy(params) {
  var mockSpec = {
    endpoint_spec: params.endpoint_spec,
    auth_spec: params.auth_spec
  };
  var res = PortalApiFetcher.fetchPortalData(mockSpec);
  return { success: true, data: res };
}

function jsonRpcSuccess(result, id) {
  var payload = {
    jsonrpc: '2.0',
    result: result,
    id: id
  };
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonRpcError(code, message, id) {
  var payload = {
    jsonrpc: '2.0',
    error: { code: code, message: message },
    id: id
  };
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
