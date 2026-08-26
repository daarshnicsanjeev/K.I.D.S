import { SanitizerService } from '../services/sanitizer';
import { ErrorHasher } from '../services/errorHasher';
import { PreFlightValidator } from '../services/preflight';
import { GasProvisionerService } from '../services/gasProvisioner';
import { BridgeAdvisor } from '../services/bridgeAdvisor';
import { PersonalDriveService } from '../services/personalDriveService';
import { WhatsAppDiagnosticLogger } from '../services/whatsappLogger';
import { ChildManager, ChildProfile } from '../services/childManager';
import { AiNormalizerService } from '../services/aiNormalizer';

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
  const syncData = (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) ? await chrome.storage.sync.get(null) : {};
  const current = await chrome.storage.local.get(null);

  // Restore cloud-synced state from other machines or previous installs
  const restoredState = {
    ...DEFAULT_STATE,
    ...syncData,
    ...current
  };

  await chrome.storage.local.set(restoredState);

  // Update GAS backend ONLY when the extension itself is updated
  if (details.reason === 'update') {
    const CURRENT_GAS_SCRIPT_VERSION = '2.3.0';
    if (restoredState.mcp_gas_url && (restoredState as any).gas_script_version !== CURRENT_GAS_SCRIPT_VERSION) {
      try {
        const result = await GasProvisionerService.provision();
        const updated = {
          mcp_gas_url: result.webAppUrl,
          mcp_gas_script_id: result.scriptId,
          gas_script_version: CURRENT_GAS_SCRIPT_VERSION,
          last_script_updated_at: new Date().toISOString()
        };
        await chrome.storage.local.set(updated);
        if (chrome.storage.sync) await chrome.storage.sync.set(updated);
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

    case 'REQUEST_INTERACTIVE_OAUTH': {
      const token = await GasProvisionerService.getAuthToken(true);
      return { token };
    }

    case 'AUTO_PROVISION_GAS_WORKSPACE': {
      const result = await GasProvisionerService.provision();
      await chrome.storage.local.set({
        wizard_current_step: 3,
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
        wizard_current_step: 3,
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

      // 1. DUPLICATE CHECK: If already registered, refresh/update in-place without creating duplicate entries
      const existingTools = state.mcp_registered_tools || [];
      const isUpdate = existingTools.some((t: any) =>
        t.domain.toLowerCase() === portalDomain.toLowerCase() &&
        t.feature.toLowerCase() === feature.toLowerCase()
      );

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

      // Deduplicate: Filter out previous tool registration for same domain & feature
      const filteredTools = existingTools.filter((t: any) =>
        !(t.domain.toLowerCase() === portalDomain.toLowerCase() && t.feature.toLowerCase() === feature.toLowerCase())
      );
      const updatedTools = [...filteredTools, { domain: portalDomain, feature, registeredAt: new Date().toISOString() }];
      const toolSyncPayload = {
        mcp_registered_tools: updatedTools,
        verified_portal_domain: portalDomain,
        verified_portal_cookies: cookies,
        verified_portal_url: endpointUrl || state.verified_portal_url,
        portal_connection_verified: true
      };
      if (chrome.storage.sync) await chrome.storage.sync.set(toolSyncPayload);
      await chrome.storage.local.set({
        wizard_current_step: 4,
        ...toolSyncPayload
      });

      return { success: true, feature, winningStrategy, isUpdate, registeredTools: updatedTools };
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

      if (chrome.storage.sync) await chrome.storage.sync.set({ mcp_registered_tools: updatedTools });
      await chrome.storage.local.set({
        wizard_current_step: 4,
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

      if (chrome.storage.sync) await chrome.storage.sync.set({ mcp_registered_tools: updatedTools });
      await chrome.storage.local.set({
        wizard_current_step: 4,
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
      const syncData = chrome.storage.sync ? await chrome.storage.sync.get(['target_whatsapp_chats', 'tracked_whatsapp_chats', 'whatsapp_drive_caching_enabled']) : {};
      const localData = await chrome.storage.local.get(['target_whatsapp_chats', 'tracked_whatsapp_chats', 'whatsapp_drive_caching_enabled']);
      return {
        target_whatsapp_chats: syncData.target_whatsapp_chats || localData.target_whatsapp_chats || '',
        tracked_whatsapp_chats: syncData.tracked_whatsapp_chats || localData.tracked_whatsapp_chats || [],
        whatsapp_drive_caching_enabled: syncData.whatsapp_drive_caching_enabled ?? localData.whatsapp_drive_caching_enabled ?? true
      };
    }

    case 'SAVE_WHATSAPP_CONFIG': {
      const payload = {
        target_whatsapp_chats: message.payload.target_whatsapp_chats || '',
        tracked_whatsapp_chats: message.payload.tracked_whatsapp_chats || [],
        whatsapp_drive_caching_enabled: message.payload.whatsapp_drive_caching_enabled ?? true
      };
      if (chrome.storage.sync) await chrome.storage.sync.set(payload);
      await chrome.storage.local.set(payload);
      return { saved: true };
    }

    case 'CAPTURE_ACTIVE_WHATSAPP_CHAT': {
      // 1. Search for any active chat tab (WhatsApp, Telegram, Discord, Slack, Teams)
      const chatQueryUrls = [
        '*://web.whatsapp.com/*',
        '*://web.telegram.org/*',
        '*://discord.com/*',
        '*://app.slack.com/*',
        '*://teams.microsoft.com/*',
        '*://teams.live.com/*'
      ];
      let openTabs: chrome.tabs.Tab[] = [];
      for (const urlPattern of chatQueryUrls) {
        const found = await chrome.tabs.query({ url: urlPattern });
        if (found && found.length > 0) {
          openTabs = openTabs.concat(found);
        }
      }

      if (openTabs.length === 0) {
        throw new Error('No open chat tab found. Please open WhatsApp Web (web.whatsapp.com) or Telegram Web (web.telegram.org) and open your school group.');
      }

      // Prioritize active tab in current window if it is a chat tab, otherwise first found chat tab
      const currentTabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeCurrentTab = currentTabs[0];
      const targetChatTab = (activeCurrentTab && openTabs.some(t => t.id === activeCurrentTab.id)) ? activeCurrentTab : openTabs[0];

      const results = await chrome.scripting.executeScript({
        target: { tabId: targetChatTab.id! },
        func: () => {
          const blacklist = [
            'wa-wordmark', 'whatsapp', 'active school chat', 'profile details', 'contact info',
            'group info', 'search...', 'search or start new chat', 'chats', 'communities',
            'channels', 'starred messages', 'settings', 'status', 'new chat', 'menu', 'unread',
            'select a chat', 'download whatsapp for windows', 'send and receive messages'
          ];

          let title = '';
          let platform = 'Chat';
          const host = window.location.hostname.toLowerCase();

          if (host.includes('whatsapp')) platform = 'WhatsApp';
          else if (host.includes('telegram')) platform = 'Telegram';
          else if (host.includes('discord')) platform = 'Discord';
          else if (host.includes('slack')) platform = 'Slack';
          else if (host.includes('teams')) platform = 'Teams';

          // Heuristic 1: WhatsApp Web header & active items
          const waHeader = document.querySelector('#main header div[role="button"] span[title], #main header span[data-testid="conversation-info-header-chat-title"], #main header span[title], #main header span[dir="auto"]');
          if (waHeader) {
            const t = (waHeader.getAttribute('title') || waHeader.textContent || '').trim();
            if (t && !blacklist.includes(t.toLowerCase())) title = t;
          }

          // Heuristic 2: Telegram Web (Web A / Web K / Web Z) header
          if (!title) {
            const tgHeader = document.querySelector('.chat-info .peer-title, .top .person .name, .chat-title, .HeaderTitle, .sidebar-header .user-title, .chat-info h3, .ChatInfo .title');
            if (tgHeader) {
              const t = (tgHeader.getAttribute('title') || tgHeader.textContent || '').trim();
              if (t && !blacklist.includes(t.toLowerCase())) title = t;
            }
          }

          // Heuristic 3: Discord / Slack / Teams headers
          if (!title) {
            const communityHeader = document.querySelector('[data-testid="channel-name"], [class*="channelName"], [data-qa="channel_name"], [data-tid="chat-title"], [data-tid="team-channel-name"]');
            if (communityHeader) {
              const t = (communityHeader.getAttribute('title') || communityHeader.textContent || '').trim();
              if (t && !blacklist.includes(t.toLowerCase())) title = t;
            }
          }

          // Heuristic 4: Active item in sidebar
          if (!title) {
            const activeSidebarEl = document.querySelector('div[role="listitem"][aria-selected="true"] span[title], div[data-testid="cell-frame-container"][aria-selected="true"] span[title], div[role="listitem"][aria-selected="true"] span[dir="auto"], li.chatlist-chat.active .peer-title');
            if (activeSidebarEl) {
              const t = (activeSidebarEl.getAttribute('title') || activeSidebarEl.textContent || '').trim();
              if (t && !blacklist.includes(t.toLowerCase())) title = t;
            }
          }

          if (!title || blacklist.includes(title.toLowerCase())) return null;

          let chatId = '';
          // Try extracting avatar ID or URL path hash
          const activeItem = document.querySelector('div[role="listitem"][aria-selected="true"], div[data-testid="cell-frame-container"][aria-selected="true"], li.chatlist-chat.active');
          if (activeItem) {
            const img = activeItem.querySelector('img') as HTMLImageElement | null;
            if (img && img.src) {
              const match = img.src.match(/u=([^&]+)/);
              if (match && match[1]) chatId = decodeURIComponent(match[1]);
            }
          }

          if (!chatId) {
            const headerImg = document.querySelector('#main header img, header img, .chat-info img') as HTMLImageElement | null;
            if (headerImg && headerImg.src) {
              const match = headerImg.src.match(/u=([^&]+)/);
              if (match && match[1]) chatId = decodeURIComponent(match[1]);
            }
          }

          if (!chatId) {
            chatId = `${platform.toLowerCase()}_${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
          }

          return { title, id: chatId, platform };
        }
      });

      const chatInfo = results && results[0]?.result;
      if (!chatInfo || !chatInfo.title) {
        throw new Error("No active conversation selected. Please click and open your school group (e.g. '3B Cambridge 2026 - 27') in WhatsApp Web first.");
      }

      const captured = {
        id: chatInfo.id,
        title: chatInfo.title,
        platform: chatInfo.platform,
        isGroup: true,
        addedAt: new Date().toISOString()
      };

      const current = await chrome.storage.local.get(['tracked_whatsapp_chats']);
      let list: any[] = current.tracked_whatsapp_chats || [];

      // Avoid duplicates by ID or title
      list = list.filter(c => c.id !== captured.id && c.title.toLowerCase() !== captured.title.toLowerCase());
      list.push(captured);

      if (chrome.storage.sync) await chrome.storage.sync.set({ tracked_whatsapp_chats: list });
      await chrome.storage.local.set({ tracked_whatsapp_chats: list });

      // Automatically backup tracked chats metadata to Personal Google Drive folder
      const token = (await chrome.storage.local.get(['personal_drive_auth_token'])).personal_drive_auth_token;
      if (token) {
        PersonalDriveService.saveTrackedChatsToPersonalDrive(token, list).catch(() => {});
      }

      return { success: true, captured, trackedChats: list };
    }

    case 'REMOVE_TRACKED_WHATSAPP_CHAT': {
      const chatIdToRemove = message.payload.id;
      const current = await chrome.storage.local.get(['tracked_whatsapp_chats']);
      let list: any[] = current.tracked_whatsapp_chats || [];
      list = list.filter(c => c.id !== chatIdToRemove);

      if (chrome.storage.sync) await chrome.storage.sync.set({ tracked_whatsapp_chats: list });
      await chrome.storage.local.set({ tracked_whatsapp_chats: list });

      // Signal stop to any active sync loop on tabs
      const chatQueryUrls = ['*://web.whatsapp.com/*', '*://web.telegram.org/*'];
      for (const urlPattern of chatQueryUrls) {
        const found = await chrome.tabs.query({ url: urlPattern });
        for (const t of found) {
          if (t.id) {
            chrome.scripting.executeScript({
              target: { tabId: t.id },
              func: () => {
                document.body.setAttribute('data-mcp-sync-abort', 'true');
                (window as any).__school_mcp_abort_sync = true;
              }
            }).catch(() => {});
          }
        }
      }

      // Automatically update backup on Personal Google Drive
      const token = (await chrome.storage.local.get(['personal_drive_auth_token'])).personal_drive_auth_token;
      if (token) {
        PersonalDriveService.saveTrackedChatsToPersonalDrive(token, list).catch(() => {});
      }

      return { success: true, trackedChats: list };
    }

    case 'ABORT_ACTIVE_SYNC': {
      const chatQueryUrls = ['*://web.whatsapp.com/*', '*://web.telegram.org/*'];
      for (const urlPattern of chatQueryUrls) {
        const found = await chrome.tabs.query({ url: urlPattern });
        for (const t of found) {
          if (t.id) {
            chrome.scripting.executeScript({
              target: { tabId: t.id },
              func: () => {
                document.body.setAttribute('data-mcp-sync-abort', 'true');
                (window as any).__school_mcp_abort_sync = true;
              }
            }).catch(() => {});
          }
        }
      }
      await WhatsAppDiagnosticLogger.log('WARN', 'CONN', '⏹️ [USER_ABORT] Active sync execution was stopped by user.');
      return { success: true, message: 'Sync stopped.' };
    }

    case 'GET_WHATSAPP_STATUS': {
      const chatQueryUrls = [
        '*://web.whatsapp.com/*',
        '*://web.telegram.org/*',
        '*://discord.com/*',
        '*://app.slack.com/*',
        '*://teams.microsoft.com/*',
        '*://teams.live.com/*'
      ];
      let openTabs: Array<{ tab: chrome.tabs.Tab; platform: string }> = [];
      for (const urlPattern of chatQueryUrls) {
        const found = await chrome.tabs.query({ url: urlPattern });
        if (found && found.length > 0) {
          let platform = 'Chat';
          if (urlPattern.includes('whatsapp')) platform = 'WhatsApp';
          else if (urlPattern.includes('telegram')) platform = 'Telegram';
          else if (urlPattern.includes('discord')) platform = 'Discord';
          else if (urlPattern.includes('slack')) platform = 'Slack';
          else if (urlPattern.includes('teams')) platform = 'Teams';

          found.forEach(t => {
            if (t && t.id) openTabs.push({ tab: t, platform });
          });
        }
      }

      if (openTabs.length === 0) {
        return { isConnected: false, tabCount: 0, visibleChats: [], platforms: [] };
      }

      const activeChat = openTabs[0];
      // Automatically pin chat tab so it stays active in background
      if (activeChat.tab.id && !activeChat.tab.pinned) {
        try {
          await chrome.tabs.update(activeChat.tab.id, { pinned: true });
        } catch (e) {}
      }

      const connectedPlatforms = Array.from(new Set(openTabs.map(o => o.platform)));

      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: activeChat.tab.id! },
          func: () => {
            const list: string[] = [];
            // WhatsApp + Telegram sidebar list items
            document.querySelectorAll('div[role="listitem"], div[data-testid="cell-frame-container"], li.chatlist-chat, .ListItem-button').forEach(el => {
              const titleEl = el.querySelector('span[title], div[title], span[dir="auto"], .peer-title, h3');
              const title = titleEl ? (titleEl.getAttribute('title') || titleEl.textContent || '').trim() : '';
              if (title && !list.includes(title)) list.push(title);
            });
            return list;
          }
        });
        const visibleChats = (results && results[0]?.result) || [];
        return { isConnected: true, tabCount: openTabs.length, tabId: activeChat.tab.id, isPinned: true, platforms: connectedPlatforms, visibleChats };
      } catch (err: any) {
        return { isConnected: true, tabCount: openTabs.length, tabId: activeChat.tab.id, isPinned: true, platforms: connectedPlatforms, visibleChats: [], warning: err.message };
      }
    }

    case 'SYNC_WHATSAPP_CHATS': {
      const state = await chrome.storage.local.get(null);
      const chatQueryUrls = [
        '*://web.whatsapp.com/*',
        '*://web.telegram.org/*',
        '*://discord.com/*',
        '*://app.slack.com/*',
        '*://teams.microsoft.com/*',
        '*://teams.live.com/*'
      ];
      let openTabs: chrome.tabs.Tab[] = [];
      for (const urlPattern of chatQueryUrls) {
        const found = await chrome.tabs.query({ url: urlPattern });
        if (found && found.length > 0) openTabs = openTabs.concat(found);
      }

      if (openTabs.length === 0) {
        throw new Error('No open chat tab found. Please open WhatsApp Web or Telegram Web in a browser tab.');
      }

      const trackedChats = state.tracked_whatsapp_chats || [];
      const targetFilterStr = message.payload?.target_whatsapp_chats || state.target_whatsapp_chats || '';
      const stringFilters = targetFilterStr.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);

      const isManual = Boolean(message.payload?.isManualSync);
      const targetTab = openTabs[0];
      const results = await chrome.scripting.executeScript({
        target: { tabId: targetTab.id! },
        world: 'MAIN',
        args: [trackedChats, stringFilters, isManual],
        func: async (tracked: any[], stringFilt: string[], isManualSync: boolean) => {
          // Anti-throttling shim: ensure WhatsApp Web React virtual scroller continues rendering even when tab is in background
          try {
            Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
            Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
            window.dispatchEvent(new Event('visibilitychange'));
          } catch (e) {}

          const blacklist = ['profile details', 'contact info', 'group info', 'search...', 'chats', 'communities', 'channels', 'starred messages', 'settings'];

          let currentChatName = '';
          // 1. WhatsApp Header
          const mainTitleEl = document.querySelector('#main header div[role="button"] span[title], #main header span[data-testid="conversation-info-header-chat-title"], #main header span[title], #main header span[dir="auto"]');
          if (mainTitleEl) {
            const t = (mainTitleEl.getAttribute('title') || mainTitleEl.textContent || '').trim();
            if (t && !blacklist.includes(t.toLowerCase())) currentChatName = t;
          }

          // 2. Telegram Web Header
          if (!currentChatName) {
            const tgTitleEl = document.querySelector('.chat-info .peer-title, .top .person .name, .chat-title, .HeaderTitle, .sidebar-header .user-title, .chat-info h3, .ChatInfo .title');
            if (tgTitleEl) {
              const t = (tgTitleEl.getAttribute('title') || tgTitleEl.textContent || '').trim();
              if (t && !blacklist.includes(t.toLowerCase())) currentChatName = t;
            }
          }

          // 3. Discord / Slack / Teams Header
          if (!currentChatName) {
            const commTitleEl = document.querySelector('[data-testid="channel-name"], [class*="channelName"], [data-qa="channel_name"], [data-tid="chat-title"]');
            if (commTitleEl) {
              const t = (commTitleEl.getAttribute('title') || commTitleEl.textContent || '').trim();
              if (t && !blacklist.includes(t.toLowerCase())) currentChatName = t;
            }
          }

          // 4. Sidebar Fallback
          if (!currentChatName) {
            const activeSidebarEl = document.querySelector('div[role="listitem"][aria-selected="true"] span[title], div[data-testid="cell-frame-container"][aria-selected="true"] span[title], div[role="listitem"][aria-selected="true"] span[dir="auto"], li.chatlist-chat.active .peer-title');
            if (activeSidebarEl) {
              const t = (activeSidebarEl.getAttribute('title') || activeSidebarEl.textContent || '').trim();
              if (t && !blacklist.includes(t.toLowerCase())) currentChatName = t;
            }
          }

          if (!currentChatName) {
            currentChatName = 'Active School Chat';
          }

          let currentChatId = '';
          const activeItem = document.querySelector('div[role="listitem"][aria-selected="true"], div[data-testid="cell-frame-container"][aria-selected="true"]');
          if (activeItem) {
            const img = activeItem.querySelector('img') as HTMLImageElement | null;
            if (img && img.src) {
              const match = img.src.match(/u=([^&]+)/);
              if (match && match[1]) currentChatId = decodeURIComponent(match[1]);
            }
          }

          // Check if matches either tracked list (by ID/title) or string filter
          let matches = false;
          if (tracked && tracked.length > 0) {
            matches = tracked.some(t =>
              (t.id && currentChatId && t.id.toLowerCase() === currentChatId.toLowerCase()) ||
              (t.title && currentChatName.toLowerCase().includes(t.title.toLowerCase().trim()))
            );
          } else if (stringFilt && stringFilt.length > 0) {
            matches = stringFilt.some(f => currentChatName.toLowerCase().includes(f.toLowerCase()));
          } else {
            matches = true; // No filter specified, scan active chat
          }

          if (!matches) {
            return { chatName: currentChatName, messages: [], filteredOut: true };
          }

          // Intercept URL.createObjectURL, URL.revokeObjectURL, anchor clicks & element creation to capture blobs in memory
          const createdBlobs = new Map<string, Blob>();
          const blobBase64Map = new Map<string, { base64: string; mime: string; name: string }>();
          let lastInterceptedBlob: any = null;

          const origCreateObjectURL = URL.createObjectURL;
          const origRevokeObjectURL = URL.revokeObjectURL;
          const origAnchorClick = HTMLAnchorElement.prototype.click;
          const origOpen = window.open;
          const origCreateElement = document.createElement.bind(document);

          try {
            // Prevent premature revocation of blob URLs by WhatsApp
            URL.revokeObjectURL = function(url: string) {
              // Keep alive in memory during sync
            };

            URL.createObjectURL = function(obj: any) {
              const url = origCreateObjectURL.call(this, obj);
              if (obj instanceof Blob) {
                createdBlobs.set(url, obj);
                const fr = new FileReader();
                fr.onloadend = () => {
                  const res = fr.result as string;
                  if (res && res.includes(',')) {
                    const b64 = res.split(',')[1];
                    blobBase64Map.set(url, { base64: b64, mime: obj.type || 'application/pdf', name: '' });
                  }
                };
                fr.readAsDataURL(obj);
              }
              return url;
            };

            HTMLAnchorElement.prototype.click = function() {
              try {
                const href = this.href;
                const dlName = this.download || this.getAttribute('download') || '';
                if (href && href.startsWith('blob:')) {
                  lastInterceptedBlob = { name: dlName, url: href, blob: createdBlobs.get(href) };
                  const entry = blobBase64Map.get(href);
                  if (entry) entry.name = dlName;
                }
              } catch (e) {}
              // Suppress duplicate browser download popups to keep local Downloads folder clean
              return;
            };

            window.open = function(url?: any, ...args: any[]) {
              if (typeof url === 'string' && url.startsWith('blob:')) {
                lastInterceptedBlob = { name: '', url, blob: createdBlobs.get(url) };
              }
              return null;
            };

            document.createElement = function(tagName: string, options?: any) {
              const el = origCreateElement(tagName, options);
              if (typeof tagName === 'string' && tagName.toLowerCase() === 'a') {
                const origSetAttr = el.setAttribute.bind(el);
                el.setAttribute = function(name: string, val: string) {
                  if (name === 'href' && val && val.startsWith('blob:')) {
                    lastInterceptedBlob = { name: el.getAttribute('download') || '', url: val, blob: createdBlobs.get(val) };
                  }
                  return origSetAttr(name, val);
                };
              }
              return el;
            };

            const diagLogs: Array<{ level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'; category: 'CONN' | 'EXTRACT' | 'FILTER' | 'DRIVE' | 'SCAN' | 'OCR' | 'ATTACHMENT'; message: string; meta?: any }> = [];
          // Dynamically locate the true active scrollable element in WhatsApp Web
          let scrollContainer: HTMLElement | null = null;
          const candidateScrollEls = document.querySelectorAll(
            '#main div[data-testid="conversation-panel-body"], #main .copyable-area > div[tabindex="0"], #main div[role="region"], #main .copyable-area > div, .bubbles, .MessageList, .chat-list, .messages-container'
          );
          for (let cIdx = 0; cIdx < candidateScrollEls.length; cIdx++) {
            const el = candidateScrollEls[cIdx] as HTMLElement;
            if (el && el.scrollHeight > el.clientHeight + 40) {
              scrollContainer = el;
              break;
            }
          }
          if (!scrollContainer) {
            scrollContainer = (document.querySelector('#main div[data-testid="conversation-panel-body"]') || document.querySelector('#main .copyable-area > div')) as HTMLElement | null;
          }

          diagLogs.push({
            level: 'INFO',
            category: 'CONN',
            message: `Target chat connected: "${currentChatName}". Scroll container: ${scrollContainer ? scrollContainer.tagName : 'NONE'} (scrollHeight: ${scrollContainer?.scrollHeight || 0}, clientHeight: ${scrollContainer?.clientHeight || 0}, isManualSync: ${isManualSync})`,
            meta: { currentChatName, scrollHeight: scrollContainer?.scrollHeight, clientHeight: scrollContainer?.clientHeight, isManualSync }
          });

          const allExtractedMessages: any[] = [];

          // Progressive Scroll-and-Accumulate Message-Row Extractor
          const extractedMessagesMap = new Map<string, any>();
          const rawAttachmentsList: Array<{ name: string; mimeType: string; base64Content: string }> = [];

          const monthNames: Record<string, number> = {
            january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
            may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
            september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12
          };

          const parseDateHeaderString = (rawText: string): string | null => {
            if (!rawText) return null;
            const text = rawText.trim().replace(/[\u200E\u200F\u202A-\u202E]/g, '').trim();
            const lower = text.toLowerCase();
            const now = new Date();

            if (lower === 'today') {
              return `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
            }
            if (lower === 'yesterday') {
              const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              return `${y.getMonth() + 1}/${y.getDate()}/${y.getFullYear()}`;
            }

            // Format: "18 August 2026" or "18 Aug 2026" or "18 August, 2026"
            const dayMonthYear = lower.match(/^(\d{1,2})\s+([a-z]+),?\s*(\d{4})?$/);
            if (dayMonthYear && monthNames[dayMonthYear[2]]) {
              const d = parseInt(dayMonthYear[1], 10);
              const m = monthNames[dayMonthYear[2]];
              const y = dayMonthYear[3] ? parseInt(dayMonthYear[3], 10) : now.getFullYear();
              return `${m}/${d}/${y}`;
            }

            // Format: "August 18, 2026" or "Aug 18 2026"
            const monthDayYear = lower.match(/^([a-z]+)\s+(\d{1,2}),?\s*(\d{4})?$/);
            if (monthDayYear && monthNames[monthDayYear[1]]) {
              const m = monthNames[monthDayYear[1]];
              const d = parseInt(monthDayYear[2], 10);
              const y = monthDayYear[3] ? parseInt(monthDayYear[3], 10) : now.getFullYear();
              return `${m}/${d}/${y}`;
            }

            const mMatch = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
            if (mMatch) return text;
            return null;
          };

          const scrapeCurrentVisibleMessages = () => {
            const allChatElements = document.querySelectorAll(
              'div[data-testid="date-container"], span._ak72, span._ak73, [data-testid="chat-header-date"], .chat-date, ' +
              'div[data-testid="msg-container"], div.message-in, div.message-out, ' +
              'div.message, div.bubble, div.Message, .message-content, .bubble-content, ' +
              'li[id^="chat-messages-"], div[data-qa="message_container"], [class*="message-bubble"]'
            );

            let clusterDate = '';

            allChatElements.forEach((el) => {
              try {
                const htmlEl = el as HTMLElement;
                const isDateHeader = htmlEl.matches && (
                  htmlEl.matches('[data-testid="date-container"], span._ak72, span._ak73, [data-testid="chat-header-date"], .chat-date')
                  || (htmlEl.textContent && /^(TODAY|YESTERDAY|\d{1,2}\s+[A-Za-z]+\s+\d{4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})$/i.test(htmlEl.textContent.trim()))
                );

                if (isDateHeader) {
                  const parsed = parseDateHeaderString(htmlEl.textContent || '');
                  if (parsed) clusterDate = parsed;
                  return;
                }

                const isMsgRow = htmlEl.matches && htmlEl.matches(
                  'div[data-testid="msg-container"], div.message-in, div.message-out, div.message, div.bubble, div.Message, [class*="message-bubble"], li[id^="chat-messages-"]'
                );
                if (!isMsgRow) return;

                const row = htmlEl;
                const prePlainEl = (row.hasAttribute && row.hasAttribute('data-pre-plain-text'))
                  ? row
                  : row.querySelector('div[data-pre-plain-text], [data-pre-plain-text]');
                const prePlain = prePlainEl ? prePlainEl.getAttribute('data-pre-plain-text') : null;

                let sender = 'Teacher/Parent';
                let timeStr = '';
                let dateStr = clusterDate;

                if (prePlain) {
                  const sMatch = prePlain.match(/\]\s*([^:]+):/);
                  if (sMatch && sMatch[1]) sender = sMatch[1].trim();
                  const bracketMatch = prePlain.match(/\[([^\]]+)\]/);
                  if (bracketMatch && bracketMatch[1]) {
                    const rawInside = bracketMatch[1].trim();
                    const parts = rawInside.split(',').map(p => p.trim());
                    if (parts.length >= 2) {
                      if (parts[0].includes(':')) { timeStr = parts[0]; dateStr = parts[1]; }
                      else { dateStr = parts[0]; timeStr = parts[1]; }
                    }
                  }
                  if (dateStr) clusterDate = dateStr;
                }

                if (!timeStr) {
                  // Fallback: extract time directly from bottom meta container
                  const timeEl = row.querySelector('div[data-testid="msg-meta"] span, span._ak8i, div._amkd span, span[data-testid="msg-time"], .time, span.x1rg5ohu');
                  if (timeEl && timeEl.textContent) {
                    const tMatch = timeEl.textContent.match(/\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\b/);
                    if (tMatch) timeStr = tMatch[1].trim();
                  }
                }

                if (sender === 'Teacher/Parent') {
                  const authorEl = row.querySelector('span._ak8q, span[data-testid="author"], .message-title, .sender-name');
                  if (authorEl && authorEl.textContent) {
                    const candidate = authorEl.textContent.replace(':', '').trim();
                    if (candidate.length > 0 && candidate.length <= 40 && !candidate.includes('\n')) {
                      sender = candidate;
                    }
                  }
                }

                const textEl = row.querySelector('span.selectable-text, span._ao3e, div.copyable-text span');
                let text = textEl ? (textEl.textContent || '').trim() : '';
                if (text === sender) text = '';

                // Attachment / Document title detection
                let docTitle = '';
                const docCandidates = row.querySelectorAll(
                  'span[data-testid="document-name"], div[data-testid="document-thumb"] + div span, div[data-testid="document-thumb"] ~ div span, .document-name, a.document-container span, span[title*="."], div[title*="."]'
                );
                for (let dIdx = 0; dIdx < docCandidates.length; dIdx++) {
                  const cand = (docCandidates[dIdx].getAttribute('title') || docCandidates[dIdx].textContent || '').trim();
                  if (cand && !cand.toLowerCase().includes('-icon') && cand.length > 2 && cand.length < 150) {
                    docTitle = cand;
                    break;
                  }
                }

                // Media captions
                const captionEl = row.querySelector('span[data-testid="media-caption"], div.image-caption');
                const mediaCaption = captionEl ? (captionEl.textContent || '').trim() : '';

                let fullBody = text;
                if (docTitle && !fullBody.includes(docTitle)) {
                  fullBody = `[Document Attachment: ${docTitle}]\n${fullBody}`.trim();
                }
                if (mediaCaption && !fullBody.includes(mediaCaption)) {
                  fullBody = `${fullBody} [Media Caption: ${mediaCaption}]`.trim();
                }

                // Image / Photo detection & Base64 canvas export to ensure photos/HW images are NEVER skipped
                const imgEl = row.querySelector('img[src^="blob:"], img[src^="data:image"], div[data-testid="image-thumb"] img, div[data-testid="media-canvas"] img, div.image-box img') as HTMLImageElement | null;
                if (imgEl && imgEl.src) {
                  if (!fullBody && !docTitle) {
                    fullBody = '[Photo/Image Attachment]';
                  }
                  try {
                    const canvas = document.createElement('canvas');
                    canvas.width = imgEl.naturalWidth || imgEl.width || 400;
                    canvas.height = imgEl.naturalHeight || imgEl.height || 400;
                    const ctx = canvas.getContext('2d');
                    if (ctx && canvas.width > 0 && canvas.height > 0) {
                      ctx.drawImage(imgEl, 0, 0);
                      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                      const b64 = dataUrl.split(',')[1];
                      if (b64 && b64.length > 200) {
                        const photoName = `school_photo_${(clusterDate || dateStr || 'notice').replace(/[\/.\s]/g, '-')}_${Date.now()}.jpeg`;
                        if (!blobBase64Map.has(imgEl.src)) {
                          blobBase64Map.set(imgEl.src, {
                            name: photoName,
                            mime: 'image/jpeg',
                            base64: b64
                          });
                        }
                      }
                    }
                  } catch (imgErr) {}
                }

                if (!fullBody && !docTitle && !imgEl) return;

                // Skip download attempts on unloaded phone placeholders to avoid "Document unavailable" popups
                const isUnloadedPlaceholder = fullBody.toLowerCase().includes("this message couldn't load") || fullBody.toLowerCase().includes("open the message on your phone to view it");

                if (!isUnloadedPlaceholder) {
                  // Click download buttons and document icons on visible attachments with synthetic mouse click events (strictly once per element)
                  const downloadBtns = row.querySelectorAll(
                    'span[data-icon="download"], div[data-icon="download"], ' +
                    'button[data-testid="document-download-btn"], button[data-testid="media-download-btn"], ' +
                    'div[role="button"][title*="Download"], button[title*="Download"], div[data-testid="document-thumb"]'
                  );
                  downloadBtns.forEach(btn => {
                    const hEl = btn as HTMLElement;
                    if (hEl.getAttribute('data-mcp-clicked') === 'true') {
                      return; // Already triggered download once! Do not repeat click!
                    }
                    hEl.setAttribute('data-mcp-clicked', 'true');
                    try {
                      hEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                      hEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                      hEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                    } catch (e) {
                      try { hEl.click(); } catch (err) {}
                    }
                  });
                }

                // Auto-dismiss any "Document unavailable" modal popups or media viewer overlays from WhatsApp
                dismissWhatsAppModals();

                // Normalized body fingerprint for robust deduplication across scroll cycles
                const normBodyKey = fullBody.replace(/\s+/g, ' ').trim().toLowerCase().substring(0, 100);
                if (extractedMessagesMap.has(normBodyKey)) {
                  const existing = extractedMessagesMap.get(normBodyKey);
                  // Merge with better metadata if available
                  if (existing.sender.startsWith('+91') && !sender.startsWith('+91')) {
                    existing.sender = sender;
                  }
                  if (!existing.time && timeStr) {
                    existing.time = timeStr;
                    existing.timestamp = `${timeStr}, ${existing.date || dateStr}`;
                  }
                  if (!existing.date && dateStr) {
                    existing.date = dateStr;
                    existing.timestamp = `${existing.time || timeStr}, ${dateStr}`;
                  }
                } else {
                  extractedMessagesMap.set(normBodyKey, {
                    id: `wa_${Date.now()}_${extractedMessagesMap.size}`,
                    sender,
                    timestamp: timeStr ? `${timeStr}, ${dateStr}` : (dateStr || ''),
                    date: dateStr || undefined,
                    time: timeStr || undefined,
                    body: fullBody,
                    documentTitle: docTitle || undefined
                  });
                }
              } catch (err) {}
            });
          };

          const dismissWhatsAppModals = () => {
            try {
              // 1. Close full-screen Media/PDF Viewers (Back button or Close button)
              const mediaViewerCloseBtns = document.querySelectorAll(
                'span[data-icon="back"], span[data-icon="x"], button[aria-label="Back"], div[role="button"][aria-label="Back"], ' +
                'button[aria-label="Close"], div[role="button"][aria-label="Close"], div[data-testid="btn-close"], ' +
                'div[data-testid="media-viewer-modal"] button, div[data-testid="media-viewer-modal"] div[role="button"]'
              );
              mediaViewerCloseBtns.forEach(btn => {
                try { (btn as HTMLElement).click(); } catch (e) {}
              });

              // Dispatch Escape key to dismiss any open media viewer overlays
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));

              // 2. Target all modal dialog containers in WhatsApp Web (e.g. "Document unavailable")
              const dialogEls = document.querySelectorAll(
                'div[role="dialog"], div[role="alertdialog"], div[data-animate-modal-popup="true"], [data-testid="popup-contents"], div._ak8k'
              );
              dialogEls.forEach(dialog => {
                const clickables = dialog.querySelectorAll('button, div[role="button"], span');
                for (let i = 0; i < clickables.length; i++) {
                  const el = clickables[i] as HTMLElement;
                  const t = (el.textContent || '').trim().toUpperCase();
                  if (t === 'OK' || t === 'DISMISS' || t === 'CLOSE') {
                    el.click();
                    break;
                  }
                }
              });

              // 3. Direct button selectors
              const modalButtons = document.querySelectorAll(
                'button[data-testid="popup-controls-ok"], div[data-testid="popup-controls-ok"], button._ak8l, div[role="dialog"] button'
              );
              modalButtons.forEach(btn => {
                try { (btn as HTMLElement).click(); } catch (e) {}
              });
            } catch (e) {}
          };

          // 1. Scrape bottom (newest) messages
          scrapeCurrentVisibleMessages();
          diagLogs.push({
            level: 'INFO',
            category: 'EXTRACT',
            message: `[SCROLL_BOTTOM_VIEW] Captured initial ${extractedMessagesMap.size} newest messages at chat bottom.`
          });

          // 2. Pure Unbounded Dynamic Scrolling: scrolls until the absolute start of chat is conclusively reached
          let consecutiveNoNewMessageCycles = 0;
          let sc = 0;

          // Reset abort flags for new sync run
          document.body.removeAttribute('data-mcp-sync-abort');
          (window as any).__school_mcp_abort_sync = false;

          if (scrollContainer) {
            while (true) {
              // Check if user requested immediate sync stop
              if (document.body.getAttribute('data-mcp-sync-abort') === 'true' || (window as any).__school_mcp_abort_sync) {
                diagLogs.push({ level: 'WARN', category: 'CONN', message: `[SYNC_STOPPED] Sync was stopped immediately by user request at step ${sc}.` });
                break;
              }

              sc++;
              const countBefore = extractedMessagesMap.size;

              // Auto-dismiss any obstructive popups or media viewer overlays before scrolling
              dismissWhatsAppModals();

              // Click the exact "Click here to get older messages from your phone" pill banner shown in chat
              let phoneSyncClicked = false;
              const allChatElements = document.querySelectorAll('#main div, #main span, #main button, [data-testid="conversation-panel-body"] div, [data-testid="conversation-panel-body"] span');
              for (let i = 0; i < allChatElements.length; i++) {
                const el = allChatElements[i];
                // Safety guard: skip individual message containers
                if (el.closest('div[data-testid="msg-container"], div.message-in, div.message-out, div.copyable-text, [data-testid="document-thumb"], div._amk6, span[data-icon]')) {
                  continue;
                }
                const txt = (el.textContent || '').trim().toLowerCase();
                if (
                  (txt.includes('click here to get older messages') && txt.length < 90) ||
                  (txt.includes('get older messages from your phone') && txt.length < 90) ||
                  txt === 'load older messages'
                ) {
                  try {
                    const targetEl = (el as HTMLElement);
                    
                    // 1. Direct React Fiber / Props onClick invocation
                    try {
                      let curr: any = targetEl;
                      for (let depth = 0; depth < 3 && curr; depth++) {
                        const reactPropKey = Object.keys(curr).find(k => k.startsWith('__reactProps$') || k.startsWith('__reactEvents$') || k.startsWith('__reactFiber$'));
                        if (reactPropKey && curr[reactPropKey]) {
                          const p = curr[reactPropKey];
                          if (typeof p.onClick === 'function') p.onClick({ bubbles: true, cancelable: true, defaultPrevented: false });
                          if (typeof p.onPointerDown === 'function') p.onPointerDown({ bubbles: true, cancelable: true });
                          if (typeof p.onPointerUp === 'function') p.onPointerUp({ bubbles: true, cancelable: true });
                        }
                        curr = curr.parentElement;
                      }
                    } catch (rErr) {}

                    // 2. Coordinate-based synthetic pointer & mouse sequence
                    try {
                      const rect = targetEl.getBoundingClientRect();
                      const clientX = rect.left + rect.width / 2;
                      const clientY = rect.top + rect.height / 2;
                      const evtInit = { bubbles: true, cancelable: true, view: window, clientX, clientY, screenX: clientX, screenY: clientY };
                      targetEl.dispatchEvent(new PointerEvent('pointerdown', evtInit));
                      targetEl.dispatchEvent(new MouseEvent('mousedown', evtInit));
                      targetEl.dispatchEvent(new PointerEvent('pointerup', evtInit));
                      targetEl.dispatchEvent(new MouseEvent('mouseup', evtInit));
                      targetEl.dispatchEvent(new MouseEvent('click', evtInit));
                      targetEl.click();
                      if (targetEl.parentElement) targetEl.parentElement.click();
                    } catch (peErr) {}

                    phoneSyncClicked = true;
                    consecutiveNoNewMessageCycles = 0;
                    diagLogs.push({ level: 'INFO', category: 'CONN', message: `[PHONE_SYNC] Clicked "${txt}" on step ${sc}. Phone sync initiated!` });
                    break;
                  } catch (e) {}
                }
              }

              // Scroll upwards in steps and dispatch synthetic WheelEvent + ScrollEvent on all candidate containers
              const prevTop = scrollContainer.scrollTop;
              scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop - scrollContainer.clientHeight * 2);
              
              const wheelEvt = new WheelEvent('wheel', { deltaY: -1200, deltaMode: 0, bubbles: true, cancelable: true, view: window });
              scrollContainer.dispatchEvent(wheelEvt);
              if (scrollContainer.parentElement) scrollContainer.parentElement.dispatchEvent(wheelEvt);
              const mainPanel = document.querySelector('#main') || document.querySelector('[data-testid="conversation-panel-body"]');
              if (mainPanel) mainPanel.dispatchEvent(wheelEvt);

              scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
              scrollContainer.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', code: 'PageUp', keyCode: 33, which: 33, bubbles: true }));

              // If top reached, bounce scroll position and send Home key to trigger top-edge intersection observers
              if (scrollContainer.scrollTop === 0) {
                try { (scrollContainer as HTMLElement).focus(); } catch (e) {}
                scrollContainer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', code: 'Home', keyCode: 36, which: 36, bubbles: true }));
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', code: 'PageUp', keyCode: 33, which: 33, bubbles: true }));
                if (prevTop === 0) {
                  scrollContainer.scrollTop = 350;
                  scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
                  await new Promise(resolve => setTimeout(resolve, 100));
                  scrollContainer.scrollTop = 0;
                  scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
                  scrollContainer.dispatchEvent(wheelEvt);
                }
              }

              await new Promise(resolve => setTimeout(resolve, phoneSyncClicked ? 1600 : 600));
              scrapeCurrentVisibleMessages();

              // Auto-dismiss again after scraping
              dismissWhatsAppModals();

              // Check if absolute group creation / end-to-end encryption system banner is reached
              const hasTrueTopSystemBanner = Array.from(document.querySelectorAll('div[data-testid="msg-system"], div._ak72, div._ak73, [data-testid="conversation-panel-body"] > div')).some(el => {
                const text = (el.textContent || '').toLowerCase();
                return text.includes('created group') || text.includes('created this group') || text.includes('end-to-end encrypted') || text.includes('you were added') || text.includes('group created');
              });

              const countAfter = extractedMessagesMap.size;
              // If system creation banner is present, 10 settle cycles confirm top; if not yet reached, allow up to 60 settle cycles to fetch older months (June, May, etc.)
              const requiredSettleCycles = hasTrueTopSystemBanner ? 10 : 60;

              if (countAfter === countBefore && scrollContainer.scrollTop === 0 && !phoneSyncClicked) {
                consecutiveNoNewMessageCycles++;
                if (consecutiveNoNewMessageCycles === 25 && !hasTrueTopSystemBanner) {
                  diagLogs.push({
                    level: 'INFO',
                    category: 'CONN',
                    message: `[PULLING_OLDER_MONTHS step ${sc}] Reached top of current cache. Actively requesting older history (June/May). If prompted on WhatsApp Web, unlock phone to complete phone-sync.`
                  });
                }
                if (consecutiveNoNewMessageCycles >= requiredSettleCycles) {
                  diagLogs.push({
                    level: 'SUCCESS',
                    category: 'CONN',
                    message: `[TRUE_TOP_REACHED] Conclusively reached the absolute start of conversation at step ${sc} (Group creation banner verified: ${hasTrueTopSystemBanner}). Total accumulated: ${extractedMessagesMap.size} messages.`
                  });
                  break; // Absolute physical start of conversation reached
                }
              } else {
                consecutiveNoNewMessageCycles = 0;
              }

              if (sc % 10 === 0) {
                diagLogs.push({
                  level: 'INFO',
                  category: 'CONN',
                  message: `[UNBOUNDED_SCROLL step ${sc}] Dynamically accumulated ${extractedMessagesMap.size} messages across timeline.`
                });
              }
            }
          }

          const finalScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;
          await new Promise(resolve => setTimeout(resolve, 800));

          // 3. Collect intercepted binary attachments from both local blobBase64Map and window.__school_mcp_captured_blobs
          blobBase64Map.forEach((val) => {
            if (val.base64 && val.base64.length > 50 && !rawAttachmentsList.some(a => a.base64Content === val.base64)) {
              rawAttachmentsList.push({
                name: val.name || 'school_document.pdf',
                mimeType: val.mime || 'application/pdf',
                base64Content: val.base64
              });
            }
          });

          if ((window as any).__school_mcp_captured_blobs && (window as any).__school_mcp_captured_blobs instanceof Map) {
            (window as any).__school_mcp_captured_blobs.forEach((val: any) => {
              if (val && val.base64 && val.base64.length > 50 && !rawAttachmentsList.some(a => a.base64Content === val.base64)) {
                rawAttachmentsList.push({
                  name: val.name || 'school_document.pdf',
                  mimeType: val.mime || 'application/pdf',
                  base64Content: val.base64
                });
              }
            });
          }

          const accumulatedMessages = Array.from(extractedMessagesMap.values());

          diagLogs.push({
            level: 'INFO',
            category: 'EXTRACT',
            message: `[FULL_HISTORY_DISCOVERY] Accumulated ${accumulatedMessages.length} total messages & ${rawAttachmentsList.length} attachments across full conversation history.`,
            meta: { totalMessages: accumulatedMessages.length, attachmentsCaptured: rawAttachmentsList.length }
          });

          // Build unified rawChatText from accumulated messages without hardcoded fallback timestamps
          const combinedChatText = accumulatedMessages.map(m => {
            const timePart = m.time ? m.time : '';
            const datePart = m.date ? m.date : '';
            const header = (timePart && datePart) ? `[${timePart}, ${datePart}]` : (timePart ? `[${timePart}]` : (datePart ? `[${datePart}]` : ''));
            return `${header ? header + ' ' : ''}${m.sender}:\n${m.body}`;
          }).join('\n\n');

          return {
            success: true,
            chatName: currentChatName,
            rawChatText: combinedChatText,
            rawAttachments: rawAttachmentsList,
            messages: accumulatedMessages,
            diagLogs,
            filteredOut: false
          };
        } finally {
          URL.createObjectURL = origCreateObjectURL;
          URL.revokeObjectURL = origRevokeObjectURL;
          HTMLAnchorElement.prototype.click = origAnchorClick;
          window.open = origOpen;
          document.createElement = origCreateElement;
        }
        }
      });

      const extraction: any = results && results[0]?.result;
      if (!extraction) {
        throw new Error('Could not execute extraction script on active chat tab. Please ensure WhatsApp Web or Telegram Web is open and active.');
      }

      // Flush detailed extraction diagnostic logs FIRST
      if (extraction.diagLogs && Array.isArray(extraction.diagLogs)) {
        for (const dl of extraction.diagLogs) {
          await WhatsAppDiagnosticLogger.log(dl.level, dl.category, dl.message, dl.meta);
        }
      }

      if (extraction.error || extraction.success === false) {
        throw new Error(extraction.error || 'AI Extraction failed on active tab.');
      }

      const allProfiles = await ChildManager.getProfiles(false);
      let matchedProfile: ChildProfile | null | undefined = allProfiles.find(p => p.trackedChats && p.trackedChats.some((tc: any) => tc.title === extraction.chatName || tc.id === extraction.chatName));
      if (!matchedProfile) {
        matchedProfile = await ChildManager.getActiveProfile();
      }
      const childName = matchedProfile ? matchedProfile.name : 'Atharva';

      // =========================================================================
      // EXTENSION-CONTEXT AI INFERENCE (Runs safely in extension service worker)
      // =========================================================================
      let extractedMessages: any[] = [];
      if (extraction.rawChatText && extraction.rawChatText.length > 0) {
        await WhatsAppDiagnosticLogger.log('INFO', 'EXTRACT', `🤖 Normalizing ${extraction.rawChatText.length} chars of chat text via Extension LanguageModel...`, {
          textLength: extraction.rawChatText.length,
          chatName: extraction.chatName
        });

        try {
          extractedMessages = await AiNormalizerService.normalizeRawChatText(
            extraction.rawChatText,
            extraction.chatName || 'School Chat',
            childName
          );
          await chrome.storage.local.set({ latest_extracted_messages: extractedMessages });

          await WhatsAppDiagnosticLogger.log('SUCCESS', 'EXTRACT', `🎉 [AI EXTRACTION SUCCESS] Successfully parsed ${extractedMessages.length} structured notices for ${childName}!`, {
            totalMessages: extractedMessages.length
          });
        } catch (normErr: any) {
          await WhatsAppDiagnosticLogger.log('ERROR', 'EXTRACT', `Extension AI Normalizer Error: ${normErr?.message || String(normErr)}`, {
            error: String(normErr)
          });
          throw normErr;
        }
      }

      // Collect all exact document titles referenced in message bodies
      const docTitlesFromMessages: string[] = [];
      for (const m of extractedMessages) {
        if (m.documentTitle && !docTitlesFromMessages.includes(m.documentTitle)) {
          docTitlesFromMessages.push(m.documentTitle.replace(/^View\s*["']?|["']$/gi, '').trim());
        }
        if (m.body) {
          const docMatch = m.body.match(/\[Document Attachment:\s*(?:View|Download)?\s*["']?([^"'\n\]]+)["']?\]/i);
          if (docMatch && docMatch[1]) {
            const cleanT = docMatch[1].replace(/^View\s*["']?|["']$/gi, '').trim();
            if (cleanT && !docTitlesFromMessages.includes(cleanT)) {
              docTitlesFromMessages.push(cleanT);
            }
          }
        }
      }

      // Process attachments and upload directly to Personal Google Drive
      let uploadCount = 0;
      let docTitleIdx = 0;
      const combinedAttachments = [...(extraction.rawAttachments || [])];
      for (const m of extractedMessages) {
        if (m.rawAttachment && m.rawAttachment.base64Content) {
          combinedAttachments.push(m.rawAttachment);
          delete m.rawAttachment;
        }
      }

      for (const att of combinedAttachments) {
        if (att && att.base64Content) {
          try {
            // If attachment has generic name, map to the next known document title from the chat
            if ((!att.name || att.name.toLowerCase().includes('school_document')) && docTitleIdx < docTitlesFromMessages.length) {
              att.name = docTitlesFromMessages[docTitleIdx++];
            }
            if (!att.name || att.name === 'school_document.pdf') {
              att.name = `school_document_${Date.now()}.pdf`;
            }

            await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `[ATTACHMENT_UPLOAD] Uploading "${att.name}" (${att.base64Content.length} bytes) to Personal Drive for ${childName}...`);
            const uploadRes = await PersonalDriveService.uploadAttachmentFile(state.personal_drive_auth_token, att, childName);
            if (uploadRes) {
              uploadCount++;
              await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `🎉 [ATTACHMENT_UPLOAD_SUCCESS] Uploaded "${uploadRes.name}" to Drive: ${uploadRes.webViewLink}`, {
                childName,
                fileName: uploadRes.name,
                driveUrl: uploadRes.webViewLink
              });

              // Link uploaded Drive URL strictly to the exact matching notice
              const coreFileName = uploadRes.name.replace(/^[A-Za-z0-9]+_/, '').replace(/\s*\(v\d+\)/, '').trim().toLowerCase();
              const matchedMsg = extractedMessages.find(m => {
                if (!m.body) return false;
                const lowerBody = m.body.toLowerCase();
                return lowerBody.includes(coreFileName) && !m.driveAttachmentUrl;
              }) || extractedMessages.find(m => m.body && m.body.toLowerCase().includes(coreFileName));

              if (matchedMsg) {
                matchedMsg.driveAttachmentUrl = uploadRes.webViewLink;
                matchedMsg.driveFileName = uploadRes.name;
                await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `[ATTACHMENT_LINK] Linked "${uploadRes.name}" to Notice: [${matchedMsg.date}, ${matchedMsg.time}] ${matchedMsg.sender}`);
              }
            }
          } catch (uploadErr: any) {
            await WhatsAppDiagnosticLogger.log('WARN', 'DRIVE', `Failed to upload attachment "${att.name}": ${uploadErr.message}`, {
              fileName: att.name,
              error: uploadErr.message
            });
          }
        }
      }

      await WhatsAppDiagnosticLogger.log('INFO', 'EXTRACT', `Extracted ${extractedMessages.length} messages (${uploadCount} attachments uploaded) from "${extraction.chatName}" for ${childName}`, {
        childName,
        chatName: extraction.chatName,
        messageCount: extractedMessages.length,
        attachmentsUploaded: uploadCount
      });

      // 1. Save to Parent's Personal Google Drive (Isolated from school account)
      let personalDriveResult: any = null;
      if (state.personal_drive_connected && state.personal_drive_auth_token && extractedMessages.length > 0) {
        try {
          personalDriveResult = await PersonalDriveService.saveMessagesToPersonalDrive(state.personal_drive_auth_token, extractedMessages, childName);
          await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `Archived ${personalDriveResult.saved} new messages into Personal Google Drive for ${childName}`, {
            childName,
            account: state.personal_drive_account_email,
            saved: personalDriveResult.saved,
            totalArchived: personalDriveResult.total
          });
        } catch (pdErr: any) {
          await WhatsAppDiagnosticLogger.log('WARN', 'DRIVE', `Failed to save to Personal Drive: ${pdErr.message}`, { error: pdErr.message });
        }
      }

      // 2. Also mirror to Apps Script MCP Server endpoint if provisioned
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
        } catch (gasErr) {}
      }

      return {
        chatName: extraction.chatName,
        messageCount: extractedMessages.length,
        messages: extractedMessages,
        personalDriveSaved: !!personalDriveResult,
        personalDriveResult,
        driveSaved: !!driveSaveResult
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

    case 'CONNECT_PERSONAL_DRIVE_ACCOUNT': {
      const authResult = await PersonalDriveService.authenticatePersonalAccount();
      const folderInfo = await PersonalDriveService.getPersonalFolderInfo(authResult.token);

      // Auto-restore Stage 5 tracked chats from Personal Drive if available across machine reinstalls
      try {
        const driveTracked = await PersonalDriveService.loadTrackedChatsFromPersonalDrive(authResult.token);
        if (driveTracked && Array.isArray(driveTracked) && driveTracked.length > 0) {
          const local = await chrome.storage.local.get(['tracked_whatsapp_chats']);
          const merged = [...(local.tracked_whatsapp_chats || [])];
          driveTracked.forEach((dt: any) => {
            if (!merged.some((m: any) => m.id === dt.id || m.title.toLowerCase() === dt.title.toLowerCase())) {
              merged.push(dt);
            }
          });
          await chrome.storage.local.set({ tracked_whatsapp_chats: merged });
          if (chrome.storage.sync) await chrome.storage.sync.set({ tracked_whatsapp_chats: merged });
          console.log(`[ServiceWorker] Restored ${driveTracked.length} tracked chats from Personal Google Drive.`);
        }
      } catch (e) {
        console.warn('[ServiceWorker] Could not restore tracked chats from Drive:', e);
      }

      return { success: true, email: authResult.email, folderInfo };
    }

    case 'CAPTURED_PDF_STREAM': {
      const state = await chrome.storage.local.get(['personal_drive_connected', 'personal_drive_auth_token']);
      if (!state.personal_drive_connected || !state.personal_drive_auth_token) {
        return { success: false, reason: 'Personal Drive not connected' };
      }

      const stream = message.payload;
      if (!stream || !stream.base64Data) {
        return { success: false, reason: 'No base64 stream payload' };
      }

      const activeChild = await ChildManager.getActiveProfile();
      const childName = activeChild ? activeChild.name : 'Child_1';
      const cleanDocName = (stream.fileName || 'School_Document.pdf').replace(/^View\s*["']?|["']$/gi, '').trim();
      const uploadRes = await PersonalDriveService.uploadAttachmentFile(state.personal_drive_auth_token, {
        name: cleanDocName,
        mimeType: stream.mimeType || 'application/pdf',
        base64Content: stream.base64Data
      }, childName);

      if (uploadRes) {
        await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `Auto-captured live PDF stream "${uploadRes.name}" (${Math.round((stream.size || 0) / 1024)} KB) and uploaded to Personal Drive for ${childName}`, {
          childName,
          fileName: uploadRes.name,
          driveUrl: uploadRes.webViewLink
        });

        // Also backfill this attachment into existing archive
        await PersonalDriveService.saveMessagesToPersonalDrive(state.personal_drive_auth_token, [{
          chatName: 'School Group',
          sender: 'Teacher/Parent',
          timestamp: new Date().toLocaleTimeString(),
          body: `[Document: ${uploadRes.name}]`,
          driveAttachmentUrl: uploadRes.webViewLink,
          driveFileName: uploadRes.name
        }], childName);

        return { success: true, uploadRes };
      }
      return { success: false };
    }

    case 'DISCONNECT_PERSONAL_DRIVE_ACCOUNT': {
      await chrome.storage.local.remove(['personal_drive_account_email', 'personal_drive_auth_token', 'personal_drive_connected', 'personal_drive_folder_id']);
      return { success: true };
    }

    case 'GET_MCP_FOLDER_INFO': {
      const state = await chrome.storage.local.get(['personal_drive_connected', 'personal_drive_auth_token', 'personal_drive_account_email', 'mcp_gas_url']);
      const activeChild = await ChildManager.getActiveProfile();
      const childName = activeChild ? activeChild.name : 'Child_1';
      
      // If personal account is connected, prioritize personal Google Drive
      if (state.personal_drive_connected && state.personal_drive_auth_token) {
        try {
          const personalInfo = await PersonalDriveService.getPersonalFolderInfo(state.personal_drive_auth_token, childName);
          return { ...personalInfo, isPersonalConnected: true, activeChildName: childName };
        } catch (pe) {}
      }

      if (!state.mcp_gas_url) {
        return { isCreated: false, isPersonalConnected: false, folderName: 'School Portal MCP Intelligence', folderUrl: '', activeChildName: childName, notice: 'Connect personal account or provision MCP server to manage Drive storage.' };
      }

      try {
        const res = await fetch(state.mcp_gas_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'get_mcp_folder_info',
            id: 'mcp-folder-info'
          })
        });
        const json = await res.json();
        return { ...(json.result || { folderName: 'School Portal MCP Intelligence', folderUrl: '' }), isPersonalConnected: false, activeChildName: childName };
      } catch (e) {
        return { isCreated: false, isPersonalConnected: false, folderName: 'School Portal MCP Intelligence', folderUrl: '', activeChildName: childName, notice: 'Could not fetch folder info' };
      }
    }

    case 'PASSIVE_WHATSAPP_MESSAGES_DETECTED': {
      const state = await chrome.storage.local.get(null);
      const incomingMsgs = message.payload?.messages || [];
      if (incomingMsgs.length === 0) return { status: 'skipped' };

      const activeChild = await ChildManager.getActiveProfile();
      const childName = activeChild ? activeChild.name : 'Child_1';

      // Save to Personal Drive if connected
      if (state.personal_drive_connected && state.personal_drive_auth_token) {
        try {
          await PersonalDriveService.saveMessagesToPersonalDrive(state.personal_drive_auth_token, incomingMsgs, childName);
        } catch (pe) {}
      }

      if (state.mcp_gas_url) {
        try {
          await fetch(state.mcp_gas_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'archive_whatsapp_messages',
              params: { messages: incomingMsgs },
              id: 'passive-wa-sync'
            })
          });
        } catch (e) {}
      }

      return { status: 'archived', count: incomingMsgs.length };
    }

    case 'GET_WHATSAPP_DIAGNOSTICS': {
      const minutes = typeof (message as any).minutesFilter === 'number' ? (message as any).minutesFilter : undefined;
      const logs = await WhatsAppDiagnosticLogger.getLogs(minutes);
      const text = WhatsAppDiagnosticLogger.formatLogsAsText(logs);
      return { logs, formatted: text };
    }

    case 'DOWNLOAD_SCHOOL_ARCHIVE_JSON': {
      const state = await chrome.storage.local.get(['personal_drive_connected', 'personal_drive_auth_token']);
      const activeChild = await ChildManager.getActiveProfile();
      const childName = activeChild ? activeChild.name : 'Atharva';
      const fileName = `${childName}_whatsapp_school_archive.json`;

      if (state.personal_drive_connected && state.personal_drive_auth_token) {
        try {
          const folder = await PersonalDriveService.getOrCreatePersonalFolder(state.personal_drive_auth_token, childName);
          const q = encodeURIComponent(`name = '${fileName}' and '${folder.id}' in parents and trashed = false`);
          const searchRes = await PersonalDriveService.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {}, state.personal_drive_auth_token);
          if (searchRes.ok) {
            const data = await searchRes.json();
            if (data.files && data.files.length > 0) {
              const fileId = data.files[0].id;
              const downloadRes = await PersonalDriveService.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {}, state.personal_drive_auth_token);
              if (downloadRes.ok) {
                const text = await downloadRes.text();
                return { success: true, jsonContent: text, fileName };
              }
            }
          }
        } catch (e: any) {}
      }

      // Check local storage fallback
      const localData = await chrome.storage.local.get(['latest_extracted_messages', 'cached_school_archive']);
      const msgs = localData.latest_extracted_messages || localData.cached_school_archive || [];
      if (msgs && msgs.length > 0) {
        return { success: true, jsonContent: JSON.stringify(msgs, null, 2), fileName };
      }

      return { success: false, error: 'No archive found yet.' };
    }

    case 'CLEAR_WHATSAPP_DIAGNOSTICS': {
      await WhatsAppDiagnosticLogger.clearLogs();
      return { success: true };
    }

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

// Background Passive Auto-Scanner Alarm
if (typeof chrome !== 'undefined' && chrome.alarms) {
  try {
    chrome.alarms.create('BACKGROUND_PASSIVE_SCANNER', { periodInMinutes: 5 });
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'BACKGROUND_PASSIVE_SCANNER') {
        try {
          const waTabs = await chrome.tabs.query({ url: '*://web.whatsapp.com/*' });
          for (const tab of waTabs) {
            if (tab.id && !tab.pinned) {
              try { await chrome.tabs.update(tab.id, { pinned: true }); } catch (pe) {}
            }
          }

          const state = await chrome.storage.local.get(null);
          if (waTabs.length > 0) {
            await handleMessage({ type: 'SYNC_WHATSAPP_CHATS' });
          }
        } catch (err) {}
      }
    });
  } catch (e) {}
}

// Auto-intercept browser downloads triggered by WhatsApp Web / Telegram Web and upload directly to Personal Google Drive
if (typeof chrome !== 'undefined' && chrome.downloads) {
  const processedDownloadIds = new Set<number>();

  const processDownloadItem = async (downloadItem: chrome.downloads.DownloadItem) => {
    try {
      if (downloadItem.id && processedDownloadIds.has(downloadItem.id)) return;

      const state = await chrome.storage.local.get(['personal_drive_connected', 'personal_drive_auth_token']);
      if (!state.personal_drive_connected || !state.personal_drive_auth_token) return;

      const url = downloadItem.url || '';
      const referrer = (downloadItem.referrer || '').toLowerCase();
      
      // Strict Origin Isolation Guard: ONLY process downloads originating directly from WhatsApp or Telegram Web
      const isChatDownload = url.startsWith('blob:https://web.whatsapp.com') ||
                             url.startsWith('blob:https://web.telegram.org') ||
                             referrer.includes('web.whatsapp.com') ||
                             referrer.includes('web.telegram.org') ||
                             (downloadItem.byExtensionId === chrome.runtime.id);
      
      if (!isChatDownload) return; // Immediately ignore all other browser downloads

      if (downloadItem.id) processedDownloadIds.add(downloadItem.id);

      const rawFileName = downloadItem.filename ? downloadItem.filename.split(/[\\/]/).pop() : 'document.pdf';
      const cleanName = (rawFileName || 'school_document.pdf').replace(/^View\s*["']?|["']$/gi, '').trim();

      // Find open WhatsApp / chat tab
      let chatTabs: chrome.tabs.Tab[] = [];
      for (const u of ['*://web.whatsapp.com/*', '*://web.telegram.org/*']) {
        const found = await chrome.tabs.query({ url: u });
        if (found && found.length > 0) chatTabs = chatTabs.concat(found);
      }
      if (chatTabs.length === 0 || !chatTabs[0].id) return;

      // Extract base64 from the chat tab context
      const fetchResults = await chrome.scripting.executeScript({
        target: { tabId: chatTabs[0].id },
        args: [url, cleanName, downloadItem.mime || 'application/pdf'],
        func: async (bUrl: string, bName: string, bMime: string) => {
          try {
            const resp = await fetch(bUrl);
            const blob = await resp.blob();
            if (blob.size > 0 && blob.size < 25 * 1024 * 1024) {
              const b64 = await new Promise<string | null>((res) => {
                const fr = new FileReader();
                fr.onloadend = () => res((fr.result as string).split(',')[1] || null);
                fr.onerror = () => res(null);
                fr.readAsDataURL(blob);
              });
              if (b64) {
                return { name: bName, mimeType: blob.type || bMime, base64Content: b64 };
              }
            }
          } catch (e) {}
          return null;
        }
      });

      const fileData = fetchResults && fetchResults[0]?.result;
      if (fileData && fileData.base64Content) {
        const uploadRes = await PersonalDriveService.uploadAttachmentFile(state.personal_drive_auth_token, fileData);
        if (uploadRes) {
          await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `Captured browser download "${uploadRes.name}" and uploaded to Personal Drive`, {
            fileName: uploadRes.name,
            driveUrl: uploadRes.webViewLink
          });

          // Also backfill this attachment into existing archive
          await PersonalDriveService.saveMessagesToPersonalDrive(state.personal_drive_auth_token, [{
            chatName: '3B Cambridge 2026 - 27',
            sender: 'Teacher/Parent',
            timestamp: new Date().toLocaleTimeString(),
            body: `[Document: ${uploadRes.name}]`,
            driveAttachmentUrl: uploadRes.webViewLink,
            driveFileName: uploadRes.name
          }]);
        }
      }
    } catch (err: any) {
      console.warn('[ServiceWorker] chrome.downloads upload error:', err);
    }
  };

  if (chrome.downloads.onCreated) {
    chrome.downloads.onCreated.addListener(processDownloadItem);
  }
}


