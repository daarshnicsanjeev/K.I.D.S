import { SanitizerService } from '../services/sanitizer';
import { ErrorHasher } from '../services/errorHasher';
import { PreFlightValidator } from '../services/preflight';
import { GasProvisionerService } from '../services/gasProvisioner';
import { BridgeAdvisor } from '../services/bridgeAdvisor';

export interface StorageState {
  wizard_current_step: number;
  mcp_gas_url: string;
  error_webhook_url: string;
  mcp_registered_tools: any[];
  latest_captured_spec: any | null;
}

const DEFAULT_STATE: StorageState = {
  wizard_current_step: 1,
  mcp_gas_url: '',
  error_webhook_url: '',
  mcp_registered_tools: [],
  latest_captured_spec: null
};

chrome.runtime.onInstalled.addListener(async (details) => {
  const current = await chrome.storage.local.get(null);
  if (!current.wizard_current_step) {
    await chrome.storage.local.set(DEFAULT_STATE);
  }

  // Update GAS backend ONLY when the extension itself is updated
  if (details.reason === 'update') {
    const CURRENT_GAS_SCRIPT_VERSION = '2.3.0';
    if (current.mcp_gas_url && current.gas_script_version !== CURRENT_GAS_SCRIPT_VERSION) {
      try {
        const result = await GasProvisionerService.provision();
        await chrome.storage.local.set({
          mcp_gas_url: result.webAppUrl,
          mcp_gas_script_id: result.scriptId,
          gas_script_version: CURRENT_GAS_SCRIPT_VERSION,
          last_script_updated_at: new Date().toISOString()
        });
        console.log(`[ServiceWorker] Updated GAS script to v${CURRENT_GAS_SCRIPT_VERSION} on extension update.`);
      } catch (err) {
        console.warn('[ServiceWorker] Auto-update GAS script on extension update skipped/failed:', err);
      }
    }
  }
});

// Listener for runtime messages
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(res => sendResponse({ success: true, data: res }))
    .catch(err => sendResponse({ success: false, error: err.message }));
  return true;
});

async function handleMessage(message: { type: string; payload?: any }) {
  switch (message.type) {
    case 'GET_STATE': {
      return await chrome.storage.local.get(null);
    }

    case 'UPDATE_STATE': {
      await chrome.storage.local.set(message.payload);
      return await chrome.storage.local.get(null);
    }

    case 'RECORD_INTERCEPTED_SPEC': {
      await chrome.storage.local.set({ latest_captured_spec: message.payload });
      return { status: 'recorded' };
    }

    case 'CHECK_ACCOUNT_AND_API_STATUS': {
      return await GasProvisionerService.checkAccountAndApiStatus();
    }

    case 'AUTO_PROVISION_GAS_WORKSPACE': {
      const result = await GasProvisionerService.provision();
      await chrome.storage.local.set({
        wizard_current_step: 2,
        mcp_gas_url: result.webAppUrl,
        mcp_gas_script_id: result.scriptId,
        gas_script_version: '2.3.0',
        last_script_updated_at: new Date().toISOString()
      });

      return result;
    }

    case 'AUTO_UPDATE_GAS_SCRIPT': {
      const result = await GasProvisionerService.provision();
      await chrome.storage.local.set({
        mcp_gas_url: result.webAppUrl,
        mcp_gas_script_id: result.scriptId,
        gas_script_version: '2.3.0',
        last_script_updated_at: new Date().toISOString()
      });

      return result;
    }

    case 'CHECK_AND_AUTO_AUTHORIZE': {
      const state = await chrome.storage.local.get(null);
      if (!state.mcp_gas_url) return { needsAuth: false };

      try {
        const pingRes = await fetch(state.mcp_gas_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 'auth-check' }),
          redirect: 'follow'
        });
        const text = await pingRes.text();
        const needsAuth = text.includes('Authorization is required') || text.includes('accounts.google.com') || pingRes.status === 401 || pingRes.status === 403;

        if (needsAuth) {
          const authTab = await chrome.tabs.create({ url: state.mcp_gas_url, active: true });
          return { needsAuth: true, tabId: authTab.id };
        }
      } catch (e) {}
      return { needsAuth: false };
    }

    case 'VERIFY_WORKSPACE_URL': {
      const gasUrl = message.payload.mcp_gas_url;
      const res = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 'init-ping' })
      });
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const json = await res.json();
      if (!json.result || !json.result.tools) throw new Error('Invalid MCP JSON-RPC response format.');
      
      await chrome.storage.local.set({
        wizard_current_step: 2,
        mcp_gas_url: gasUrl
      });
      return { tools: json.result.tools };
    }

    case 'TEST_GEMINI_PING': {
      const state = await chrome.storage.local.get(null);
      if (!state.mcp_gas_url) throw new Error('Server URL not set.');
      const res = await fetch(state.mcp_gas_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 'gemini-ping' })
      });
      const json = await res.json();
      if (json.result) {
        return { verified: true, tools: json.result.tools };
      }
      throw new Error(json.error ? json.error.message : 'MCP server ping test failed.');
    }

    case 'RUN_PREFLIGHT_AND_REGISTER': {
      const state = await chrome.storage.local.get(null);
      const { domain, feature, spec, cookies } = message.payload;

      // Execute 3-Stage Pre-Flight Test Protocol
      const preflightResult = await PreFlightValidator.validate(domain, spec, cookies, state.mcp_gas_url);
      if (!preflightResult.passed) {
        return { success: false, preflightResult };
      }

      // Register Tool with GAS Server
      const regPayload = {
        jsonrpc: '2.0',
        method: 'register_mcp_tool',
        params: {
          domain,
          feature,
          endpoint_spec: spec,
          auth_spec: { cookies }
        },
        id: 'reg-tool'
      };

      const regRes = await fetch(state.mcp_gas_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regPayload)
      });
      const regJson = await regRes.json();
      if (regJson.error) {
        throw new Error(regJson.error.message || 'Tool registration failed at backend.');
      }

      const updatedTools = [...(state.mcp_registered_tools || []), { domain, feature, registeredAt: new Date().toISOString() }];
      await chrome.storage.local.set({
        wizard_current_step: 4,
        mcp_registered_tools: updatedTools
      });

      return { success: true, preflightResult, registeredTools: updatedTools };
    }

    case 'VERIFY_AND_ADD_PORTAL_CONNECTION': {
      const state = await chrome.storage.local.get(null);
      const { url, domain, cookies, pageData } = message.payload;

      if (!state.mcp_gas_url) {
        throw new Error('MCP Server Web App URL not found. Please complete Step 1 first.');
      }

      // Execute Pre-Flight validation against GAS proxy
      const spec = { url, method: 'GET' };
      const preflightResult = await PreFlightValidator.validate(domain, spec, cookies, state.mcp_gas_url);

      if (!preflightResult.passed) {
        const failedStage = preflightResult.stages.find(s => !s.success);
        throw new Error(`Portal Verification Failed: ${failedStage?.message || 'Proxy execution failed'}`);
      }

      // Mark portal connection verified to unlock Phase 2 Feature Form
      await chrome.storage.local.set({
        portal_connection_verified: true,
        verified_portal_domain: domain,
        verified_portal_cookies: cookies,
        verified_portal_url: url
      });

      return { success: true, domain, message: 'Bi-directional portal connection verified successfully!' };
    }

    case 'REGISTER_FEATURE_TOOL': {
      const state = await chrome.storage.local.get(null);
      const { domain, feature, endpointUrl, pageData } = message.payload;

      const cookies = state.verified_portal_cookies || '';
      const portalDomain = domain || state.verified_portal_domain || 'school-portal';

      // 1. DUPLICATE CHECK: Prevent adding the same feature on the same portal more than once
      const existingTools = state.mcp_registered_tools || [];
      const isDuplicate = existingTools.some((t: any) =>
        t.domain.toLowerCase() === portalDomain.toLowerCase() &&
        t.feature.toLowerCase() === feature.toLowerCase()
      );

      if (isDuplicate) {
        throw new Error(`⚠️ Feature '${feature}' for ${portalDomain} has already been registered in your MCP server!`);
      }

      // Build list of candidate strategies
      const candidateSpecs: Array<{ name: string; spec: any }> = [];

      // Strategy 1: Intercepted background API request
      if (state.latest_captured_spec && state.latest_captured_spec.url) {
        candidateSpecs.push({ name: 'Intercepted API Endpoint', spec: state.latest_captured_spec });
      }

      // Strategy 2: Active tab page URL
      if (endpointUrl) {
        candidateSpecs.push({ name: 'Active Tab Page URL', spec: { url: endpointUrl, method: 'GET' } });
      }

      // Strategy 3: Verified base portal URL
      if (state.verified_portal_url) {
        candidateSpecs.push({ name: 'Verified Portal Page URL', spec: { url: state.verified_portal_url, method: 'GET' } });
      }

      // Strategy 4: Feature path route
      try {
        const baseUrl = endpointUrl || state.verified_portal_url || `https://${portalDomain}`;
        const urlObj = new URL(baseUrl);
        const cleanFeature = feature.trim().replace(/[^a-zA-Z0-9]/g, '');
        candidateSpecs.push({ name: 'Feature Path Route', spec: { url: `${urlObj.origin}/${cleanFeature}`, method: 'GET' } });
      } catch (e) {}

      // Test all candidates sequentially against Google Apps Script proxy and compare pageData
      let verifiedSpec: any = null;
      let winningStrategy = '';

      for (const cand of candidateSpecs) {
        try {
          const preflightResult = await PreFlightValidator.validate(portalDomain, cand.spec, cookies, state.mcp_gas_url);
          if (preflightResult.passed) {
            verifiedSpec = cand.spec;
            winningStrategy = cand.name;
            break;
          }
        } catch (err) {
          // Discard failed candidate strategy
        }
      }

      if (!verifiedSpec) {
        throw new Error(`Feature Verification Failed: Google Apps Script proxy response content did not match active tab page content for '${feature}'. Please open the feature page in your school portal tab and try again.`);
      }

      // Register confirmed spec with GAS Server
      const regPayload = {
        jsonrpc: '2.0',
        method: 'register_mcp_tool',
        params: {
          domain: portalDomain,
          feature,
          endpoint_spec: verifiedSpec,
          auth_spec: { cookies },
          dom_snapshot: message.payload.pageData || ''
        },
        id: 'reg-feature-tool'
      };

      const regRes = await fetch(state.mcp_gas_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regPayload)
      });
      const regJson = await regRes.json();
      if (regJson.error) {
        throw new Error(regJson.error.message || 'Feature tool registration failed at backend.');
      }

      const updatedTools = [...existingTools, { domain: portalDomain, feature, registeredAt: new Date().toISOString() }];
      await chrome.storage.local.set({
        wizard_current_step: 3,
        mcp_registered_tools: updatedTools
      });

      return { success: true, feature, winningStrategy, registeredTools: updatedTools };
    }

    case 'DELETE_FEATURE_TOOL': {
      const state = await chrome.storage.local.get(null);
      const { domain, feature } = message.payload;

      const existingTools = state.mcp_registered_tools || [];
      const updatedTools = existingTools.filter((t: any) =>
        !(t.domain.toLowerCase() === domain.toLowerCase() && t.feature.toLowerCase() === feature.toLowerCase())
      );

      if (state.mcp_gas_url) {
        try {
          await fetch(state.mcp_gas_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'delete_mcp_tool',
              params: { domain, feature },
              id: 'del-feature-tool'
            })
          });
        } catch (e) {}
      }

      await chrome.storage.local.set({
        wizard_current_step: 3,
        mcp_registered_tools: updatedTools
      });

      return { success: true, registeredTools: updatedTools };
    }

    case 'RENAME_FEATURE_TOOL':
    case 'RENAME_TOOL': {
      const state = await chrome.storage.local.get(null);
      const { domain, oldFeature, newFeature } = message.payload;

      if (!newFeature || !newFeature.trim()) {
        throw new Error('Feature name cannot be empty.');
      }

      const cleanNewFeature = newFeature.trim();
      const existingTools = state.mcp_registered_tools || [];

      // Prevent renaming to an existing feature name on the same domain
      const isDup = existingTools.some((t: any) =>
        t.domain.toLowerCase() === domain.toLowerCase() &&
        t.feature.toLowerCase() === cleanNewFeature.toLowerCase() &&
        t.feature.toLowerCase() !== oldFeature.toLowerCase()
      );

      if (isDup) {
        throw new Error(`A feature named '${cleanNewFeature}' already exists for ${domain}.`);
      }

      const updatedTools = existingTools.map((t: any) => {
        if (t.domain.toLowerCase() === domain.toLowerCase() && t.feature.toLowerCase() === oldFeature.toLowerCase()) {
          return { ...t, feature: cleanNewFeature };
        }
        return t;
      });

      if (state.mcp_gas_url) {
        try {
          await fetch(state.mcp_gas_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'rename_mcp_tool',
              params: { domain, oldFeature, newFeature: cleanNewFeature },
              id: 'rename-feature-tool'
            })
          });
        } catch (e) {}
      }

      await chrome.storage.local.set({
        wizard_current_step: 3,
        mcp_registered_tools: updatedTools
      });

      return { success: true, oldFeature, newFeature: cleanNewFeature, registeredTools: updatedTools };
    }

    case 'SEND_DIAGNOSTIC_REPORT': {
      const state = await chrome.storage.local.get(null);
      const { domain, feature, errorName, errorMessage, stackTrace, context } = message.payload;

      const fingerprint = await ErrorHasher.generateFingerprint(domain || 'unknown', feature || 'system', stackTrace || errorMessage);

      const rawReport = {
        timestamp: new Date().toISOString(),
        extension_version: '1.0.0',
        user_consented: true,
        fingerprint,
        error_details: {
          domain: domain || 'unknown',
          feature: feature || 'system',
          error_name: errorName || 'Error',
          error_message: errorMessage,
          stack_trace: stackTrace || '',
          context: context || {}
        }
      };

      const sanitizedReport = SanitizerService.sanitizeErrorPayload(rawReport);

      if (state.error_webhook_url) {
        await fetch(state.error_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sanitizedReport)
        });
      }

      return { sent: true, fingerprint };
    }

    case 'GET_BRIDGE_ADVISORY': {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      const url = activeTab?.url || '';
      return BridgeAdvisor.evaluateUrl(url, message.payload?.mode || 'LIVE_BRIDGE');
    }

    case 'GET_WHATSAPP_CONFIG': {
      const syncData = chrome.storage.sync ? await chrome.storage.sync.get(['target_whatsapp_chats', 'whatsapp_drive_caching_enabled']) : {};
      const localData = await chrome.storage.local.get(['target_whatsapp_chats', 'whatsapp_drive_caching_enabled']);
      return {
        target_whatsapp_chats: syncData.target_whatsapp_chats || localData.target_whatsapp_chats || '',
        whatsapp_drive_caching_enabled: syncData.whatsapp_drive_caching_enabled ?? localData.whatsapp_drive_caching_enabled ?? true
      };
    }

    case 'SAVE_WHATSAPP_CONFIG': {
      const payload = {
        target_whatsapp_chats: message.payload.target_whatsapp_chats || '',
        whatsapp_drive_caching_enabled: message.payload.whatsapp_drive_caching_enabled ?? true
      };
      if (chrome.storage.sync) await chrome.storage.sync.set(payload);
      await chrome.storage.local.set(payload);
      return { saved: true };
    }

    case 'GET_WHATSAPP_STATUS': {
      const waTabs = await chrome.tabs.query({ url: '*://web.whatsapp.com/*' });
      if (waTabs.length === 0) {
        return { isConnected: false, tabCount: 0, visibleChats: [] };
      }

      const activeWaTab = waTabs[0];
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: activeWaTab.id! },
          func: () => {
            const list: string[] = [];
            document.querySelectorAll('div[role="listitem"], div[data-testid="cell-frame-container"]').forEach(el => {
              const titleEl = el.querySelector('span[title], div[title], span[dir="auto"]');
              const title = titleEl ? (titleEl.getAttribute('title') || titleEl.textContent || '').trim() : '';
              if (title && !list.includes(title)) list.push(title);
            });
            return list;
          }
        });
        const visibleChats = (results && results[0]?.result) || [];
        return { isConnected: true, tabCount: waTabs.length, tabId: activeWaTab.id, visibleChats };
      } catch (err: any) {
        return { isConnected: true, tabCount: waTabs.length, tabId: activeWaTab.id, visibleChats: [], warning: err.message };
      }
    }

    case 'SYNC_WHATSAPP_CHATS': {
      const state = await chrome.storage.local.get(null);
      const waTabs = await chrome.tabs.query({ url: '*://web.whatsapp.com/*' });
      if (waTabs.length === 0) {
        throw new Error('No WhatsApp Web tab found. Please open https://web.whatsapp.com in a Chrome tab and log in.');
      }

      const targetFilterStr = message.payload?.target_whatsapp_chats || state.target_whatsapp_chats || '';
      const targetFilter = targetFilterStr.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);

      const targetTab = waTabs[0];
      const results = await chrome.scripting.executeScript({
        target: { tabId: targetTab.id! },
        args: [targetFilter],
        func: (filters: string[]) => {
          const messages: any[] = [];
          const headerTitleEl = document.querySelector('header span[title], header div[title], header span[dir="auto"]');
          const currentChatName = headerTitleEl ? (headerTitleEl.getAttribute('title') || headerTitleEl.textContent || '').trim() : 'Active School Chat';

          if (filters.length > 0) {
            const lowerChat = currentChatName.toLowerCase();
            const matches = filters.some(f => lowerChat.includes(f.toLowerCase()));
            if (!matches) {
              return { chatName: currentChatName, messages: [], filteredOut: true };
            }
          }

          document.querySelectorAll('div[data-testid="msg-container"], div.message-in, div.message-out').forEach((row, idx) => {
            const senderEl = row.querySelector('span[aria-label*=":"], span._ak8q, div[data-pre-plain-text]');
            let sender = 'Teacher/Parent';
            if (senderEl) {
              const prePlain = senderEl.getAttribute('data-pre-plain-text');
              if (prePlain) {
                const match = prePlain.match(/\]\s*([^:]+):/);
                if (match && match[1]) sender = match[1].trim();
              } else {
                sender = (senderEl.textContent || 'Teacher/Parent').replace(':', '').trim();
              }
            }

            const textEl = row.querySelector('span.selectable-text, div.copyable-text, span[dir="ltr"], span[dir="auto"]');
            const text = textEl ? (textEl.textContent || '').trim() : '';
            const captionEl = row.querySelector('span[data-testid="media-caption"], div.image-caption');
            const mediaCaption = captionEl ? (captionEl.textContent || '').trim() : '';
            const fullBody = (text + (mediaCaption ? ` [Media: ${mediaCaption}]` : '')).trim();

            const timeEl = row.querySelector('span[data-testid="msg-meta"], div[data-testid="msg-meta"], span.bubble-meta');
            const timeStr = timeEl ? (timeEl.textContent || '').trim() : '';

            if (fullBody) {
              messages.push({
                id: `wa_${Date.now()}_${idx}`,
                chatName: currentChatName,
                sender: sender || 'Teacher/Parent',
                timestamp: timeStr || new Date().toLocaleTimeString(),
                body: fullBody
              });
            }
          });

          return { chatName: currentChatName, messages, filteredOut: false };
        }
      });

      const extraction = results && results[0]?.result;
      if (!extraction) {
        throw new Error('Could not extract messages from active WhatsApp tab.');
      }

      if (extraction.filteredOut) {
        throw new Error(`Active chat "${extraction.chatName}" does not match any of your configured target groups [${targetFilter.join(', ')}]. Please click the target school group in WhatsApp Web.`);
      }

      const extractedMessages = extraction.messages || [];

      // Save to Google Drive Cache via Apps Script Web App
      let driveSaveResult: any = null;
      if (state.mcp_gas_url && extractedMessages.length > 0) {
        try {
          const gasRes = await fetch(state.mcp_gas_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'archive_whatsapp_messages',
              params: { messages: extractedMessages },
              id: 'wa-archive-sync'
            })
          });
          if (gasRes.ok) {
            const gasData = await gasRes.json();
            driveSaveResult = gasData.result;
          }
        } catch (gasErr) {
          console.warn('[ServiceWorker] Could not sync WhatsApp to Drive:', gasErr);
        }
      }

      return {
        chatName: extraction.chatName,
        messageCount: extractedMessages.length,
        messages: extractedMessages,
        driveSaved: !!driveSaveResult,
        driveSaveResult
      };
    }

    case 'EXTRACT_ACTIVE_WEB_TAB': {
      const state = await chrome.storage.local.get(null);
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        throw new Error('No active browser tab found.');
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          const url = window.location.href;
          const domain = window.location.hostname;
          const title = document.title || 'Untitled Web Page';

          const tables: string[][][] = [];
          document.querySelectorAll('table').forEach(tbl => {
            const rows: string[][] = [];
            tbl.querySelectorAll('tr').forEach(r => {
              const cols: string[] = [];
              r.querySelectorAll('th, td').forEach(c => {
                cols.push((c.textContent || '').trim().replace(/\s+/g, ' '));
              });
              if (cols.length > 0) rows.push(cols);
            });
            if (rows.length > 0) tables.push(rows);
          });

          const clone = (document.body ? document.body.cloneNode(true) : document.documentElement.cloneNode(true)) as HTMLElement;
          const noise = ['script', 'style', 'noscript', 'iframe', 'svg', 'canvas', 'nav', 'footer', '.ad', '.ads'];
          noise.forEach(s => clone.querySelectorAll(s).forEach(e => e.remove()));

          let text = clone.innerText || clone.textContent || '';
          text = text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n/g, '\n\n').trim();
          if (text.length > 35000) text = text.substring(0, 35000) + '\n\n...[Truncated]';

          return { url, domain, title, extractedAt: new Date().toISOString(), structuredContent: text, tables };
        }
      });

      const extractedData = results && results[0]?.result;
      if (!extractedData) throw new Error('Failed to extract content from active web tab.');

      // Cache live tab data in personal Google Apps Script server
      if (state.mcp_gas_url) {
        try {
          await fetch(state.mcp_gas_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'cache_live_tab_content',
              params: { tabData: extractedData },
              id: 'cache-live-tab'
            })
          });
        } catch (e) {}
      }

      return extractedData;
    }

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}
