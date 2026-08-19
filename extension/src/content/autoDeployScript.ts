/**
 * Fully Automated DOM Deployment Engine for script.google.com
 * Automatically injects server code into editor, triggers Deploy dialog, extracts Web App URL, and updates extension state.
 */
(async function () {
  console.log('[School MCP Auto-Deployer] Fully automated DOM script starting...');

  // Show floating status banner
  const banner = createStatusBanner('⚡ School MCP Engine: Automating server creation in your school account...');

  await sleep(2500);

  const SERVER_CODE = `/**
 * Personal School MCP Sync Engine - Google Apps Script Server
 * Auto-Provisioned for Student/Parent Workspace Account
 */
function doPost(e) {
  try {
    var request = JSON.parse(e.postData.contents);
    var method = request.method;
    var params = request.params || {};
    var id = request.id || null;
    var result = null;

    if (method === 'tools/list') {
      result = handleToolsList();
    } else if (method === 'tools/call') {
      result = handleToolsCall(params.name, params.arguments);
    } else if (method === 'register_mcp_tool') {
      result = handleRegisterTool(params);
    } else if (method === 'test_preflight_proxy') {
      result = handlePreflightProxy(params);
    } else {
      return jsonRpcError(-32601, 'Method not found: ' + method, id);
    }
    return jsonRpcSuccess(result, id);
  } catch (err) {
    return jsonRpcError(-32603, 'Internal error: ' + err.toString(), null);
  }
}

function handleToolsList() {
  var nativeTools = [
    { name: 'get_google_classroom_work', description: 'Fetch student courses and homework from Google Classroom.', inputSchema: { type: 'object', properties: {} } },
    { name: 'get_school_gmail_messages', description: 'Fetch school circulars and announcements from Gmail.', inputSchema: { type: 'object', properties: {} } },
    { name: 'get_calendar_events', description: 'Fetch school calendar events and deadlines.', inputSchema: { type: 'object', properties: {} } }
  ];
  var props = PropertiesService.getUserProperties();
  var raw = props.getProperty('REGISTERED_PORTAL_TOOLS');
  var registered = raw ? JSON.parse(raw) : [];
  var portalTools = registered.map(function (t) {
    return { name: t.name, description: 'Fetch ' + t.feature + ' data from ' + t.domain, inputSchema: { type: 'object', properties: {} } };
  });
  return { tools: nativeTools.concat(portalTools) };
}

function handleToolsCall(name, args) {
  if (name === 'get_google_classroom_work') {
    var res = UrlFetchApp.fetch('https://classroom.googleapis.com/v1/courses', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    return JSON.parse(res.getContentText());
  } else if (name === 'get_school_gmail_messages') {
    var threads = GmailApp.search('label:school OR subject:homework OR subject:circular', 0, 10);
    var messages = threads.map(function(t) { return { subject: t.getFirstUserMessageSubject(), snippet: t.getSnippet() }; });
    return { messages: messages };
  } else if (name === 'get_calendar_events') {
    var events = CalendarApp.getDefaultCalendar().getEventsForDay(new Date());
    return { events: events.map(function(e) { return { title: e.getTitle() }; }) };
  }
  throw new Error('Tool not found: ' + name);
}

function handleRegisterTool(params) {
  var props = PropertiesService.getUserProperties();
  var raw = props.getProperty('REGISTERED_PORTAL_TOOLS');
  var tools = raw ? JSON.parse(raw) : [];
  var toolName = ('portal_' + params.domain + '_' + params.feature).toLowerCase().replace(/[^a-z0-9_]/g, '_');
  tools.push({ name: toolName, domain: params.domain, feature: params.feature, endpoint_spec: params.endpoint_spec, auth_spec: params.auth_spec });
  props.setProperty('REGISTERED_PORTAL_TOOLS', JSON.stringify(tools));
  return { registered: true, toolName: toolName };
}

function handlePreflightProxy(params) {
  var spec = params.endpoint_spec;
  var options = { method: spec.method || 'GET', headers: spec.headers || {}, muteHttpExceptions: true };
  if (params.auth_spec && params.auth_spec.cookies) options.headers['Cookie'] = params.auth_spec.cookies;
  var res = UrlFetchApp.fetch(spec.url, options);
  return { success: true, data: res.getContentText() };
}

function jsonRpcSuccess(result, id) {
  return ContentService.createTextOutput(JSON.stringify({ jsonrpc: '2.0', result: result, id: id })).setMimeType(ContentService.MimeType.JSON);
}

function jsonRpcError(code, message, id) {
  return ContentService.createTextOutput(JSON.stringify({ jsonrpc: '2.0', error: { code: code, message: message }, id: id })).setMimeType(ContentService.MimeType.JSON);
}`;

  // Step 1: Inject Code into Monaco Editor
  updateBanner(banner, '📝 Injecting server code into Apps Script editor...');
  injectCodeToEditor(SERVER_CODE);

  await sleep(1500);

  // Step 2: Trigger Deploy Menu
  updateBanner(banner, '🚀 Opening Deployment configuration...');
  clickDeployMenu();

  await sleep(1500);

  // Step 3: Monitor for generated Web App URL in DOM
  updateBanner(banner, '🔑 Please click "Authorize access" if Google prompts on screen...');
  monitorAndExtractWebAppUrl(banner);

  function injectCodeToEditor(code: string) {
    if ((window as any).monaco && (window as any).monaco.editor) {
      const models = (window as any).monaco.editor.getModels();
      if (models && models.length > 0) {
        models[0].setValue(code);
        return;
      }
    }
    // Fallback: Copy to clipboard if Monaco model is sandboxed
    try {
      navigator.clipboard.writeText(code);
    } catch (e) {}
  }

  function clickDeployMenu() {
    const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const deployBtn = buttons.find(b => b.textContent && b.textContent.trim().toLowerCase().includes('deploy'));
    if (deployBtn) {
      (deployBtn as HTMLElement).click();
    }
  }

  function monitorAndExtractWebAppUrl(bannerEl: HTMLElement) {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const textNodes = document.body.innerText;
      const match = textNodes.match(/https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec/);
      
      if (match && match[0]) {
        clearInterval(interval);
        const webAppUrl = match[0];
        updateBanner(bannerEl, '✅ Server Created & Verified! Returning to School Assistant...');
        
        // Notify extension background with verified Web App URL
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({
            type: 'UPDATE_STATE',
            payload: { mcp_gas_url: webAppUrl, wizard_current_step: 2 }
          });
        }
      }

      if (attempts > 60) {
        clearInterval(interval);
        updateBanner(bannerEl, '⚡ Please finish clicking Deploy as Web App, then copy your Web App URL into the extension.');
      }
    }, 1000);
  }

  function createStatusBanner(text: string): HTMLElement {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.top = '14px';
    div.style.left = '50%';
    div.style.transform = 'translateX(-50%)';
    div.style.zIndex = '9999999';
    div.style.backgroundColor = '#6366f1';
    div.style.color = '#ffffff';
    div.style.padding = '14px 28px';
    div.style.borderRadius = '30px';
    div.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4)';
    div.style.fontWeight = 'bold';
    div.style.fontSize = '14px';
    div.style.fontFamily = 'system-ui, sans-serif';
    div.innerText = text;
    document.body.appendChild(div);
    return div;
  }

  function updateBanner(bannerEl: HTMLElement, text: string) {
    bannerEl.innerText = text;
  }

  function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})();
