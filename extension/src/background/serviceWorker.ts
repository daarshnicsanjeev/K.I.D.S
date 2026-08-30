import { SanitizerService } from '../services/sanitizer';
import { ErrorHasher } from '../services/errorHasher';
import { PreFlightValidator } from '../services/preflight';
import { GasProvisionerService } from '../services/gasProvisioner';
import { BridgeAdvisor } from '../services/bridgeAdvisor';
import { PersonalDriveService } from '../services/personalDriveService';
import { WhatsAppDiagnosticLogger } from '../services/whatsappLogger';
import { ChildManager, ChildProfile } from '../services/childManager';
import { AiNormalizerService } from '../services/aiNormalizer';
import { SyncLifecycleManager } from '../services/syncLifecycleManager';

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

let isSyncInProgress = false;
let syncInProgressSince = 0;

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
      const localData = await chrome.storage.local.get(['target_whatsapp_chats', 'tracked_whatsapp_chats', 'whatsapp_drive_caching_enabled', 'chat_sync_pointers']);

      let trackedChats: any[] = [];
      if (Array.isArray(localData.tracked_whatsapp_chats)) {
        trackedChats = localData.tracked_whatsapp_chats;
      } else if (Array.isArray(syncData.tracked_whatsapp_chats)) {
        trackedChats = syncData.tracked_whatsapp_chats;
      } else {
        const activeChild = await ChildManager.getActiveProfile();
        if (activeChild && Array.isArray(activeChild.trackedChats)) {
          trackedChats = activeChild.trackedChats;
        }
      }

      return {
        target_whatsapp_chats: syncData.target_whatsapp_chats || localData.target_whatsapp_chats || '',
        tracked_whatsapp_chats: trackedChats,
        whatsapp_drive_caching_enabled: syncData.whatsapp_drive_caching_enabled ?? localData.whatsapp_drive_caching_enabled ?? true,
        chat_sync_pointers: localData.chat_sync_pointers || {}
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

      // Update active child's profile with captured chat
      try {
        const activeChild = await ChildManager.getActiveProfile();
        if (activeChild) {
          await ChildManager.updateProfile(activeChild.id, { trackedChats: list });
        }
      } catch (e) {}

      // Automatically backup tracked chats metadata to Personal Google Drive folder
      const token = (await chrome.storage.local.get(['personal_drive_auth_token'])).personal_drive_auth_token;
      if (token) {
        PersonalDriveService.saveTrackedChatsToPersonalDrive(token, list).catch(() => {});
      }

      return { success: true, captured, trackedChats: list };
    }

    case 'REMOVE_TRACKED_WHATSAPP_CHAT': {
      const chatIdToRemove = message.payload.id;
      const current = await chrome.storage.local.get(['tracked_whatsapp_chats', 'chat_sync_pointers']);
      let list: any[] = current.tracked_whatsapp_chats || [];
      const removedItem = list.find(c => c.id === chatIdToRemove || c.title === chatIdToRemove);
      list = list.filter(c => c.id !== chatIdToRemove && c.title !== chatIdToRemove);

      if (chrome.storage.sync) await chrome.storage.sync.set({ tracked_whatsapp_chats: list });
      await chrome.storage.local.set({ tracked_whatsapp_chats: list });

      // Remove from sync pointers
      const pointers = current.chat_sync_pointers || {};
      if (chatIdToRemove in pointers) delete pointers[chatIdToRemove];
      if (removedItem && removedItem.title && removedItem.title in pointers) delete pointers[removedItem.title];
      await chrome.storage.local.set({ chat_sync_pointers: pointers });

      // Remove from active child's profile
      try {
        const activeChild = await ChildManager.getActiveProfile();
        if (activeChild) {
          await ChildManager.updateProfile(activeChild.id, { trackedChats: list });
        }
      } catch (e) {}

      // Signal stop to any active sync loop on tabs and SyncLifecycleManager
      const targetGroupNameToAbort = removedItem?.title || chatIdToRemove;
      await SyncLifecycleManager.requestAbort(targetGroupNameToAbort);

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
      await SyncLifecycleManager.requestAbort();
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
      const now = Date.now();
      const isManual = Boolean(message.payload?.isManualSync);
      const targetFilterStr = message.payload?.target_whatsapp_chats || '';

      const canRun = await SyncLifecycleManager.canRunBackgroundSync(isManual, targetFilterStr);
      if (!canRun.allowed) {
        await WhatsAppDiagnosticLogger.log('INFO', 'CONN', `⏹️ [SYNC_SKIPPED] ${canRun.reason}`);
        return { status: 'skipped', message: canRun.reason };
      }

      const acquired = await SyncLifecycleManager.acquireSyncLock(targetFilterStr || undefined);
      if (!acquired) {
        return { status: 'already_running', message: 'Sync lock could not be acquired.' };
      }
      isSyncInProgress = true;
      syncInProgressSince = now;

      try {
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
        const activeFilterStr = targetFilterStr || state.target_whatsapp_chats || '';
        const stringFilters = activeFilterStr.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);

        const allProfiles = await ChildManager.getProfiles(false);
        const activeProfile = await ChildManager.getActiveProfile();

        // Determine targets to sync across all kids
        let targetChatsToSync: Array<{ title: string; id?: string; childName?: string }> = [];
        if (activeFilterStr && activeFilterStr.toLowerCase() !== 'all tracked') {
          targetChatsToSync = stringFilters.map((s: string) => ({ title: s }));
        } else {
          // Aggregate tracked chats from all child profiles
          for (const p of allProfiles) {
            if (p.trackedChats && Array.isArray(p.trackedChats)) {
              for (const tc of p.trackedChats) {
                if (tc && tc.title && !targetChatsToSync.some(t => t.title.toLowerCase() === tc.title.toLowerCase())) {
                  targetChatsToSync.push({ title: tc.title, id: tc.id, childName: p.name });
                }
              }
            }
          }
          if (targetChatsToSync.length === 0 && trackedChats.length > 0) {
            targetChatsToSync = trackedChats;
          }
        }

        if (!isManual && targetChatsToSync.length === 0) {
          return { status: 'idle', message: 'No tracked chats configured across profiles. Background sync is idle.' };
        }

        const targetTab = openTabs[0];

        await WhatsAppDiagnosticLogger.log('INFO', 'CONN', `🚀 [SYNC_START] Initiated sync on tab ${targetTab.id} (${targetTab.title || targetTab.url}). Targets: [${targetChatsToSync.map(t => t.title || 'Active Chat').join(', ')}], Mode: ${isManual ? 'Manual Deep Scan' : 'Automated Background'}`);

        // Clear any previous abort attributes from targetTab
        if (targetTab.id) {
          chrome.scripting.executeScript({
            target: { tabId: targetTab.id },
            func: () => {
              document.body.removeAttribute('data-mcp-sync-abort');
              (window as any).__school_mcp_abort_sync = false;
            }
          }).catch(() => {});
        }

        let totalNewNoticesAcrossAllTargets = 0;
        let totalAttachmentsUploaded = 0;
        const processedChatNames: string[] = [];
        const lastResults: any[] = [];

        for (const targetItem of targetChatsToSync) {
          const specificTargetName = (targetItem.title || '').trim();
          const specificTargetId = (targetItem.id || '').trim();

          if (await SyncLifecycleManager.isAborted(specificTargetName)) {
            await WhatsAppDiagnosticLogger.log('WARN', 'CONN', `⏹️ [SYNC_ABORTED_MIDWAY] Sync stopped for "${specificTargetName || 'Group'}" due to cancellation signal.`);
            break;
          }
          if (specificTargetName) {
            await SyncLifecycleManager.setActiveGroup(specificTargetName);
          }

          const results = await chrome.scripting.executeScript({
            target: { tabId: targetTab.id! },
            world: 'MAIN',
            args: [trackedChats, specificTargetName ? [specificTargetName] : stringFilters, isManual, state.chat_sync_pointers || {}, specificTargetName, specificTargetId],
            func: async (tracked: any[], stringFilt: string[], isManualSync: boolean, chatSyncPointers: Record<string, any>, targetNameReq: string, targetIdReq: string) => {
            // Anti-throttling shim: ensure WhatsApp Web React virtual scroller continues rendering even when tab is in background
            try {
              Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
              Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
              window.dispatchEvent(new Event('visibilitychange'));
            } catch (e) {}

            const blacklist = [
              'profile details', 'contact info', 'group info', 'search...', 'chats',
              'communities', 'channels', 'starred messages', 'settings', 'active school chat',
              'select a chat', 'download whatsapp for windows', 'send and receive messages', 'menu'
            ];

            // 1. If a specific target group is requested, check if it's currently open; if not, switch to it
            if (targetNameReq || targetIdReq) {
              const currentHeader = document.querySelector('#main header, header');
              const headerText = (currentHeader?.textContent || '').trim();
              const isAlreadyOpen = targetNameReq ? headerText.toLowerCase().includes(targetNameReq.toLowerCase()) : false;

              if (!isAlreadyOpen) {
                let switched = false;

                // Method A: Direct internal Store/Cmd invocation by immutable ID or Name
                try {
                  const store = (window as any).Store;
                  if (store && store.Chat) {
                    let targetChatModel: any = null;
                    if (targetIdReq && typeof store.Chat.get === 'function') {
                      targetChatModel = store.Chat.get(targetIdReq);
                    }
                    if (!targetChatModel) {
                      const allChats = typeof store.Chat.getModelsArray === 'function' ? store.Chat.getModelsArray() : (store.Chat.models || []);
                      targetChatModel = allChats.find((c: any) => {
                        const cId = c.id?._serialized || c.id || '';
                        if (targetIdReq && cId && cId.toLowerCase() === targetIdReq.toLowerCase()) return true;
                        const name = (c.name || c.formattedTitle || c.title || '').trim();
                        return targetNameReq && name.toLowerCase().includes(targetNameReq.toLowerCase());
                      });
                    }
                    if (targetChatModel) {
                      if (store.Cmd && typeof store.Cmd.openChatAt === 'function') {
                        store.Cmd.openChatAt(targetChatModel);
                        switched = true;
                      } else if (typeof store.Chat.openChat === 'function') {
                        store.Chat.openChat(targetChatModel);
                        switched = true;
                      }
                      if (switched) await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                  }
                } catch (storeSwitchErr) {}

                // Method B: High-Precision Sidebar Span & Item Match
                if (!switched) {
                  const sidebarPane = document.querySelector('#pane-side, div[data-testid="chat-list"]') as HTMLElement | null;
                  const findAndClickSidebarItem = (): boolean => {
                    // Try exact title spans first
                    const titleSpans = document.querySelectorAll('#pane-side span[title], #pane-side div[title], #pane-side span._ak8q, #pane-side span[dir="auto"]');
                    for (let sIdx = 0; sIdx < titleSpans.length; sIdx++) {
                      const span = titleSpans[sIdx] as HTMLElement;
                      const spanTitle = (span.getAttribute('title') || span.textContent || '').trim();
                      if (spanTitle && targetNameReq && (spanTitle.toLowerCase().includes(targetNameReq.toLowerCase()) || targetNameReq.toLowerCase().includes(spanTitle.toLowerCase()))) {
                        const card = span.closest('div[role="listitem"], div[data-testid="cell-frame-container"], div[data-testid="conversation-item"], div[data-testid="chat-list-item"]') as HTMLElement | null;
                        const clickTarget = card || span;
                        try {
                          clickTarget.scrollIntoView({ block: 'center', behavior: 'instant' as any });
                          const evtInit = { bubbles: true, cancelable: true, view: window };
                          clickTarget.dispatchEvent(new PointerEvent('pointerdown', evtInit));
                          clickTarget.dispatchEvent(new MouseEvent('mousedown', evtInit));
                          clickTarget.dispatchEvent(new PointerEvent('pointerup', evtInit));
                          clickTarget.dispatchEvent(new MouseEvent('mouseup', evtInit));
                          clickTarget.dispatchEvent(new MouseEvent('click', evtInit));
                          try { clickTarget.click(); } catch (e) {}
                          return true;
                        } catch (e) {}
                      }
                    }

                    // Fallback to card text content
                    const sidebarItems = document.querySelectorAll('div[role="listitem"], div[data-testid="cell-frame-container"], div[data-testid="conversation-item"], div[data-testid="chat-list-item"]');
                    for (let i = 0; i < sidebarItems.length; i++) {
                      const item = sidebarItems[i] as HTMLElement;
                      const itemText = (item.textContent || '').trim();
                      if (itemText.toLowerCase().includes(targetNameReq.toLowerCase())) {
                        try {
                          item.scrollIntoView({ block: 'center', behavior: 'instant' as any });
                          const evtInit = { bubbles: true, cancelable: true, view: window };
                          item.dispatchEvent(new PointerEvent('pointerdown', evtInit));
                          item.dispatchEvent(new MouseEvent('mousedown', evtInit));
                          item.dispatchEvent(new PointerEvent('pointerup', evtInit));
                          item.dispatchEvent(new MouseEvent('mouseup', evtInit));
                          item.dispatchEvent(new MouseEvent('click', evtInit));
                          try { item.click(); } catch (e) {}
                          return true;
                        } catch (e) {}
                      }
                    }
                    return false;
                  };

                  switched = findAndClickSidebarItem();

                  if (!switched && sidebarPane) {
                    // Progressively scroll sidebar to find off-screen chat
                    const initialTop = sidebarPane.scrollTop;
                    for (let scrollStep = 0; scrollStep < 8 && !switched; scrollStep++) {
                      sidebarPane.scrollTop += 600;
                      sidebarPane.dispatchEvent(new Event('scroll', { bubbles: true }));
                      await new Promise(r => setTimeout(r, 250));
                      switched = findAndClickSidebarItem();
                    }
                    if (!switched) {
                      sidebarPane.scrollTop = initialTop;
                    }
                  }

                  if (switched) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                  }
                }

                // Method C: WhatsApp Search Bar Fallback
                if (!switched) {
                  try {
                    const searchInput = document.querySelector('div[contenteditable="true"][data-tab="3"], [data-testid="chat-list-search"], #side div[contenteditable="true"], div[role="textbox"][data-tab="3"]') as HTMLElement | null;
                    if (searchInput) {
                      searchInput.focus();
                      document.execCommand('selectAll', false);
                      document.execCommand('delete', false);
                      document.execCommand('insertText', false, targetNameReq);
                      searchInput.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: targetNameReq }));
                      await new Promise(r => setTimeout(r, 900));

                      const searchResults = document.querySelectorAll('div[role="listitem"], div[data-testid="cell-frame-container"], div[data-testid="conversation-item"]');
                      for (let i = 0; i < searchResults.length; i++) {
                        const item = searchResults[i] as HTMLElement;
                        if ((item.textContent || '').toLowerCase().includes(targetNameReq.toLowerCase())) {
                          const evtInit = { bubbles: true, cancelable: true, view: window };
                          item.dispatchEvent(new PointerEvent('pointerdown', evtInit));
                          item.dispatchEvent(new MouseEvent('mousedown', evtInit));
                          item.dispatchEvent(new MouseEvent('click', evtInit));
                          switched = true;
                          break;
                        }
                      }

                      // Clear search bar
                      const clearBtn = document.querySelector('button[aria-label="Cancel search"], span[data-icon="x-alt"], span[data-icon="x"], button[aria-label="Clear search"], button[aria-label="Close"]') as HTMLElement | null;
                      if (clearBtn) {
                        try { clearBtn.click(); } catch (e) {}
                      } else {
                        searchInput.focus();
                        document.execCommand('selectAll', false);
                        document.execCommand('delete', false);
                      }
                      if (switched) await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                  } catch (searchErr) {}
                }
              }
            } else if (!document.querySelector('#main, [data-testid="conversation-panel-body"], .chat-info')) {
              // Landing page fallback
              const firstTarget = (tracked && tracked.length > 0 && tracked[0]?.title) || (stringFilt && stringFilt[0]) || '';
              if (firstTarget) {
                const sidebarItems = document.querySelectorAll('div[role="listitem"], div[data-testid="cell-frame-container"]');
                for (let i = 0; i < sidebarItems.length; i++) {
                  const item = sidebarItems[i] as HTMLElement;
                  if ((item.textContent || '').toLowerCase().includes(firstTarget.toLowerCase())) {
                    item.click();
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    break;
                  }
                }
              }
            }

            // 2. High-precision Chat Name Resolution
            let currentChatName = '';

            // Priority A: Direct match against tracked list or targetNameReq in #main header text
            const headerContainer = document.querySelector('#main header, header');
            if (headerContainer) {
              const hText = (headerContainer.textContent || '').trim();
              if (targetNameReq && hText.toLowerCase().includes(targetNameReq.toLowerCase())) {
                currentChatName = targetNameReq;
              } else if (tracked && tracked.length > 0) {
                const matchedTracked = tracked.find(t => t.title && hText.toLowerCase().includes(t.title.toLowerCase().trim()));
                if (matchedTracked) currentChatName = matchedTracked.title;
              } else if (stringFilt && stringFilt.length > 0) {
                const matchedFilt = stringFilt.find(f => hText.toLowerCase().includes(f.toLowerCase().trim()));
                if (matchedFilt) currentChatName = matchedFilt;
              }
            }

            // Priority B: Dedicated Header Title DOM Selectors
            if (!currentChatName) {
              const headerTitleSelectors = [
                '#main header [data-testid="conversation-info-header-chat-title"]',
                '#main header div[role="button"] span[title]',
                '#main header div._amie span[title]',
                '#main header span._ak8q[title]',
                '#main header div[role="button"] span._ak8q',
                '#main header div[role="button"] span[dir="auto"]',
                '#main header h2 span',
                '#main header div[tabindex="-1"] span[title]',
                '#main header span[title]'
              ];
              for (const sel of headerTitleSelectors) {
                const el = document.querySelector(sel);
                if (el) {
                  const t = (el.getAttribute('title') || el.textContent || '').trim();
                  if (t && !blacklist.includes(t.toLowerCase()) && t.length > 1 && t.length < 100) {
                    currentChatName = t;
                    break;
                  }
                }
              }
            }

            // Priority C: Telegram / Discord / Teams Header
            if (!currentChatName) {
              const tgTitleEl = document.querySelector('.chat-info .peer-title, .top .person .name, .chat-title, .HeaderTitle, .sidebar-header .user-title, .chat-info h3, .ChatInfo .title, [data-testid="channel-name"]');
              if (tgTitleEl) {
                const t = (tgTitleEl.getAttribute('title') || tgTitleEl.textContent || '').trim();
                if (t && !blacklist.includes(t.toLowerCase())) currentChatName = t;
              }
            }

            // Priority D: Active Sidebar Element
            if (!currentChatName) {
              const activeSidebarEl = document.querySelector('div[role="listitem"][aria-selected="true"], div[data-testid="cell-frame-container"][aria-selected="true"], div[data-testid="conversation-item"][aria-selected="true"]');
              if (activeSidebarEl) {
                if (tracked && tracked.length > 0) {
                  const matched = tracked.find(t => t.title && (activeSidebarEl.textContent || '').toLowerCase().includes(t.title.toLowerCase().trim()));
                  if (matched) currentChatName = matched.title;
                }
                if (!currentChatName) {
                  const titleSpan = activeSidebarEl.querySelector('span[title], div[title], span._ak8q, span[dir="auto"]');
                  if (titleSpan) {
                    const t = (titleSpan.getAttribute('title') || titleSpan.textContent || '').trim();
                    if (t && !blacklist.includes(t.toLowerCase())) currentChatName = t;
                  }
                }
              }
            }

            if (!currentChatName && targetNameReq) {
              currentChatName = targetNameReq;
            }

            if (!currentChatName) {
              return { chatName: '', messages: [], filteredOut: true };
            }

            // Check if matches either targetNameReq, tracked list (by ID/title), or string filter
            let matches = false;
            if (targetNameReq) {
              matches = currentChatName.toLowerCase().includes(targetNameReq.toLowerCase()) || targetNameReq.toLowerCase().includes(currentChatName.toLowerCase());
            } else if (tracked && tracked.length > 0) {
              matches = tracked.some(t =>
                t.title && currentChatName.toLowerCase().includes(t.title.toLowerCase().trim())
              );
            } else if (stringFilt && stringFilt.length > 0) {
              matches = stringFilt.some(f => currentChatName.toLowerCase().includes(f.toLowerCase()));
            } else if (isManualSync) {
              matches = true;
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

            const showInPageToast = (msg: string, type: 'info' | 'warn' | 'success' = 'info', durationMs = 6000) => {
              try {
                const existing = document.getElementById('school-mcp-toast');
                if (existing) existing.remove();
                const toast = document.createElement('div');
                toast.id = 'school-mcp-toast';
                toast.style.position = 'fixed';
                toast.style.top = '16px';
                toast.style.left = '50%';
                toast.style.transform = 'translateX(-50%)';
                toast.style.zIndex = '9999999';
                toast.style.padding = '12px 20px';
                toast.style.borderRadius = '10px';
                toast.style.fontSize = '13.5px';
                toast.style.fontWeight = '600';
                toast.style.fontFamily = 'system-ui, -apple-system, sans-serif';
                toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
                toast.style.display = 'flex';
                toast.style.alignItems = 'center';
                toast.style.gap = '10px';
                toast.style.maxWidth = '90vw';
                toast.style.transition = 'all 0.3s ease';

                if (type === 'warn') {
                  toast.style.backgroundColor = '#b45309';
                  toast.style.color = '#fef3c7';
                  toast.style.border = '1px solid #f59e0b';
                } else if (type === 'success') {
                  toast.style.backgroundColor = '#065f46';
                  toast.style.color = '#d1fae5';
                  toast.style.border = '1px solid #10b981';
                } else {
                  toast.style.backgroundColor = '#1e293b';
                  toast.style.color = '#f1f5f9';
                  toast.style.border = '1px solid #3b82f6';
                }

                toast.innerHTML = `<span>${msg}</span><button style="background:transparent;border:none;color:inherit;font-size:16px;cursor:pointer;margin-left:8px;" onclick="this.parentElement.remove()">✕</button>`;
                document.body.appendChild(toast);

                if (durationMs > 0) {
                  setTimeout(() => {
                    try { toast.remove(); } catch (e) {}
                  }, durationMs);
                }
              } catch (e) {}
            };

            try {
              URL.revokeObjectURL = function(url: string) {};

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
                message: `Target chat connected: "${currentChatName}". Scroll container: ${scrollContainer ? scrollContainer.tagName : 'NONE'} (scrollHeight: ${scrollContainer?.scrollHeight || 0}, isManualSync: ${isManualSync})`,
                meta: { currentChatName, scrollHeight: scrollContainer?.scrollHeight, isManualSync }
              });

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

                const dayMonthYear = lower.match(/^(\d{1,2})\s+([a-z]+),?\s*(\d{4})?$/);
                if (dayMonthYear && monthNames[dayMonthYear[2]]) {
                  const d = parseInt(dayMonthYear[1], 10);
                  const m = monthNames[dayMonthYear[2]];
                  const y = dayMonthYear[3] ? parseInt(dayMonthYear[3], 10) : now.getFullYear();
                  return `${m}/${d}/${y}`;
                }

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
                          let rawDate = '';
                          if (parts[0].includes(':')) { timeStr = parts[0]; rawDate = parts[1]; }
                          else { rawDate = parts[0]; timeStr = parts[1]; }
                          
                          const dMatch = rawDate.match(/(\d{1,4})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})/);
                          if (dMatch) {
                            const p1 = parseInt(dMatch[1], 10);
                            const p2 = parseInt(dMatch[2], 10);
                            const p3 = parseInt(dMatch[3], 10);
                            if (p1 > 1000) dateStr = `${p2}/${p3}/${p1}`;
                            else if (p1 > 12 && p2 <= 12) dateStr = `${p2}/${p1}/${p3 < 100 ? 2000 + p3 : p3}`;
                            else dateStr = `${p1}/${p2}/${p3 < 100 ? 2000 + p3 : p3}`;
                          } else {
                            dateStr = rawDate;
                          }
                        }
                      }
                      if (dateStr) clusterDate = dateStr;
                    }

                    if (!timeStr) {
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

                    const captionEl = row.querySelector('span[data-testid="media-caption"], div.image-caption');
                    const mediaCaption = captionEl ? (captionEl.textContent || '').trim() : '';

                    let fullBody = text;
                    if (docTitle && !fullBody.includes(docTitle)) {
                      fullBody = `[Document Attachment: ${docTitle}]\n${fullBody}`.trim();
                    }
                    if (mediaCaption && !fullBody.includes(mediaCaption)) {
                      fullBody = `${fullBody} [Media Caption: ${mediaCaption}]`.trim();
                    }

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

                    const isUnloadedPlaceholder = fullBody.toLowerCase().includes("this message couldn't load") || fullBody.toLowerCase().includes("open the message on your phone to view it");

                    if (!isUnloadedPlaceholder) {
                      const downloadBtns = row.querySelectorAll(
                        'span[data-icon="download"], div[data-icon="download"], ' +
                        'button[data-testid="document-download-btn"], button[data-testid="media-download-btn"], ' +
                        'div[role="button"][title*="Download"], button[title*="Download"], button[aria-label*="Download"], div[role="button"][aria-label*="Download"]'
                      );
                      downloadBtns.forEach(btn => {
                        const hEl = btn as HTMLElement;
                        if (hEl.getAttribute('data-mcp-clicked') === 'true') return;
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

                    dismissWhatsAppModals();

                    const isDummyAttachmentChip = /^\[(?:Document Attachment|Photo\/Image Attachment|Document|Photo|Image):\s*(?:\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?|star)\]$/i.test(fullBody.trim()) || /^(?:star|forms\.gle)$/i.test(fullBody.trim());
                    if (isDummyAttachmentChip) return;

                    const normBodyKey = fullBody.replace(/\s+/g, ' ').trim().toLowerCase().substring(0, 100);
                    if (extractedMessagesMap.has(normBodyKey)) {
                      const existing = extractedMessagesMap.get(normBodyKey);
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
                  const viewerContainer = document.querySelector('div[data-testid="media-viewer-modal"], div[data-testid="media-viewer"], div[data-animate-modal-popup="true"]');
                  if (viewerContainer) {
                    const closeBtn = viewerContainer.querySelector('span[data-icon="x-viewer"], span[data-icon="x"], span[data-icon="back"], button[aria-label="Close"], div[aria-label="Close"], button, div[role="button"]') as HTMLElement | null;
                    if (closeBtn) {
                      try { closeBtn.click(); } catch (e) {}
                    }
                    const escKeyInit = { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true, view: window };
                    viewerContainer.dispatchEvent(new KeyboardEvent('keydown', escKeyInit));
                    viewerContainer.dispatchEvent(new KeyboardEvent('keyup', escKeyInit));
                  }

                  const dialogEl = document.querySelector('div[role="dialog"], div[role="alertdialog"], [data-testid="popup-contents"], div._ak8k');
                  if (dialogEl) {
                    const clickables = dialogEl.querySelectorAll('button, div[role="button"], span');
                    for (let i = 0; i < clickables.length; i++) {
                      const el = clickables[i] as HTMLElement;
                      const t = (el.textContent || '').trim().toUpperCase();
                      if (t === 'OK' || t === 'DISMISS' || t === 'CLOSE' || t === 'CANCEL') {
                        el.click();
                        break;
                      }
                    }
                  }
                } catch (e) {}
              };

              // 1. Scrape bottom (newest) messages via DOM
              scrapeCurrentVisibleMessages();
              diagLogs.push({
                level: 'INFO',
                category: 'EXTRACT',
                message: `[SCROLL_BOTTOM_VIEW] Captured initial ${extractedMessagesMap.size} messages for "${currentChatName}".`
              });

              const existingPointer = chatSyncPointers && currentChatName ? chatSyncPointers[currentChatName] : null;
              const isFirstRun = !existingPointer;
              const isManualTrigger = Boolean(isManualSync);
              const isDeepScan = isManualTrigger || isFirstRun;

              let isPointerInInitialView = false;
              if (!isDeepScan && existingPointer) {
                for (const m of extractedMessagesMap.values()) {
                  if (
                    (existingPointer.id && m.id && m.id === existingPointer.id) ||
                    (existingPointer.body && m.body && m.body.trim() === existingPointer.body.trim() && m.sender === existingPointer.sender)
                  ) {
                    isPointerInInitialView = true;
                    break;
                  }
                }
              }

              if (isPointerInInitialView) {
                diagLogs.push({
                  level: 'INFO',
                  category: 'CONN',
                  message: `⚡ [FAST_POINTER_MATCH] Checkpoint pointer found in current view for "${currentChatName}". No deep scroll needed.`
                });
              } else {
                let consecutiveNoNewMessageCycles = 0;
                let sc = 0;
                let phoneSyncClickCount = 0;
                let lastPhoneSyncStep = -999;
                let spinnerCycles = 0;
                const scanStartTime = Date.now();
                const MAX_SCAN_DURATION_MS = isDeepScan ? 120000 : 25000;
                const MAX_SCAN_STEPS = isDeepScan ? 180 : 30;

                document.body.removeAttribute('data-mcp-sync-abort');
                (window as any).__school_mcp_abort_sync = false;

                if (scrollContainer) {
                  while (true) {
                    if (document.body.getAttribute('data-mcp-sync-abort') === 'true' || (window as any).__school_mcp_abort_sync) {
                      break;
                    }
                    if (sc >= MAX_SCAN_STEPS || (Date.now() - scanStartTime > MAX_SCAN_DURATION_MS)) {
                      break;
                    }

                    sc++;
                    const countBefore = extractedMessagesMap.size;
                    dismissWhatsAppModals();

                    const prevTop = scrollContainer.scrollTop;
                    scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop - scrollContainer.clientHeight * 2);
                    
                    const earliestMsg = document.querySelector('#main div[data-testid="msg-container"], #main div.message-in, #main div.message-out, #main div.copyable-text, #main div[data-id], #main div[role="row"]');
                    if (earliestMsg) {
                      try { (earliestMsg as HTMLElement).scrollIntoView({ block: 'start', behavior: 'instant' as any }); } catch (e) {}
                    }

                    const wheelEvt = new WheelEvent('wheel', { deltaY: -1200, deltaMode: 0, bubbles: true, cancelable: true, view: window });
                    scrollContainer.dispatchEvent(wheelEvt);
                    scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }));

                    await new Promise(resolve => setTimeout(resolve, 600));
                    scrapeCurrentVisibleMessages();
                    dismissWhatsAppModals();

                    let checkpointReached = false;
                    if (existingPointer) {
                      for (const m of extractedMessagesMap.values()) {
                        if (
                          (existingPointer.id && m.id && m.id === existingPointer.id) ||
                          (existingPointer.body && m.body && m.body.trim() === existingPointer.body.trim() && m.sender === existingPointer.sender)
                        ) {
                          checkpointReached = true;
                          break;
                        }
                      }
                      if (checkpointReached && !isDeepScan) {
                        break;
                      }
                    }

                    const countAfter = extractedMessagesMap.size;
                    if (countAfter === countBefore && scrollContainer.scrollTop === 0) {
                      consecutiveNoNewMessageCycles++;
                      if (consecutiveNoNewMessageCycles >= (isDeepScan ? 25 : 8)) {
                        break;
                      }
                    } else {
                      consecutiveNoNewMessageCycles = 0;
                    }
                  }
                }
              }

              // Reposition viewport back down to bottom
              if (scrollContainer) {
                try {
                  const scrollDownBtn = document.querySelector('button[aria-label="Scroll to bottom"], span[data-icon="ic-chevron-down-wide"]') as HTMLElement | null;
                  if (scrollDownBtn) {
                    try { ((scrollDownBtn.closest('button') || scrollDownBtn) as HTMLElement).click(); } catch (e) {}
                  }
                  scrollContainer.scrollTop = scrollContainer.scrollHeight;
                  scrollContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
                } catch (e) {}
              }

              blobBase64Map.forEach((val) => {
                if (val.base64 && val.base64.length > 50 && !rawAttachmentsList.some(a => a.base64Content === val.base64)) {
                  rawAttachmentsList.push({
                    name: val.name || 'school_document.pdf',
                    mimeType: val.mime || 'application/pdf',
                    base64Content: val.base64
                  });
                }
              });

              const accumulatedMessages = Array.from(extractedMessagesMap.values());
              const combinedChatText = accumulatedMessages.map(m => {
                const timePart = m.time ? m.time : '';
                const datePart = m.date ? m.date : '';
                const header = (timePart && datePart) ? `[${timePart}, ${datePart}]` : (timePart ? `[${timePart}]` : (datePart ? `[${datePart}]` : ''));
                return `${header ? header + ' ' : ''}${m.sender}:\n${m.body}`;
              }).join('\n\n');

              const latestMsg = accumulatedMessages.length > 0 ? accumulatedMessages[accumulatedMessages.length - 1] : null;
              const lastMessagePointer = latestMsg ? {
                id: latestMsg.id || null,
                sender: latestMsg.sender || '',
                body: (latestMsg.body || '').substring(0, 300),
                time: latestMsg.time || '',
                date: latestMsg.date || ''
              } : null;

              return {
                success: true,
                chatName: currentChatName,
                rawChatText: combinedChatText,
                rawAttachments: rawAttachmentsList,
                messages: accumulatedMessages,
                diagLogs,
                filteredOut: false,
                lastMessagePointer
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
          if (!extraction) continue;

          if (extraction.diagLogs && Array.isArray(extraction.diagLogs)) {
            for (const dl of extraction.diagLogs) {
              await WhatsAppDiagnosticLogger.log(dl.level, dl.category, dl.message, dl.meta);
            }
          }

          if (extraction.filteredOut || !extraction.success || !extraction.chatName || extraction.chatName === 'Active School Chat') {
            continue;
          }

          let matchedProfile: ChildProfile | null | undefined = allProfiles.find(p => p.trackedChats && p.trackedChats.some((tc: any) => tc.title === extraction.chatName || tc.id === extraction.chatName || tc.title === specificTargetName));
          if (!matchedProfile) matchedProfile = activeProfile;
          const childName = matchedProfile ? matchedProfile.name : 'Atharva';

          // Group Rename Handling: If group was renamed, rename Drive folder, update tracked chats, and migrate pointers
          if (specificTargetName && extraction.chatName && extraction.chatName.toLowerCase() !== specificTargetName.toLowerCase()) {
            await WhatsAppDiagnosticLogger.log('INFO', 'CONN', `🔄 [GROUP_RENAME_DETECTED] Group "${specificTargetName}" was renamed to "${extraction.chatName}". Auto-updating tracked configuration, pointers, and Drive folders.`);
            try {
              if (state.personal_drive_connected && state.personal_drive_auth_token) {
                await PersonalDriveService.renameGroupFolderOnDrive(state.personal_drive_auth_token, childName, specificTargetName, extraction.chatName);
              }

              const curr = await chrome.storage.local.get(['tracked_whatsapp_chats', 'chat_sync_pointers']);
              let list: any[] = curr.tracked_whatsapp_chats || [];
              list = list.map(c => {
                if (c.title.toLowerCase() === specificTargetName.toLowerCase() || (targetItem.id && c.id === targetItem.id)) {
                  return { ...c, title: extraction.chatName };
                }
                return c;
              });
              await chrome.storage.local.set({ tracked_whatsapp_chats: list });
              if (chrome.storage.sync) await chrome.storage.sync.set({ tracked_whatsapp_chats: list });

              const ptrs = curr.chat_sync_pointers || {};
              if (ptrs[specificTargetName] && !ptrs[extraction.chatName]) {
                ptrs[extraction.chatName] = ptrs[specificTargetName];
                delete ptrs[specificTargetName];
                await chrome.storage.local.set({ chat_sync_pointers: ptrs });
              }
            } catch (renameErr) {}
          }

          processedChatNames.push(extraction.chatName);

          let extractedMessages: any[] = [];
          if (extraction.rawChatText && extraction.rawChatText.length > 0) {
            try {
              extractedMessages = await AiNormalizerService.normalizeRawChatText(
                extraction.rawChatText,
                extraction.chatName,
                childName
              );
            } catch (normErr: any) {
              await WhatsAppDiagnosticLogger.log('ERROR', 'EXTRACT', `Extension AI Normalizer Error for ${extraction.chatName}: ${normErr?.message || String(normErr)}`);
            }
          }

          // Document titles for mapping attachments
          const docTitlesFromMessages: string[] = [];
          for (const m of extractedMessages) {
            if (m.documentTitle && !docTitlesFromMessages.includes(m.documentTitle)) {
              docTitlesFromMessages.push(m.documentTitle.replace(/^View\s*["']?|["']$/gi, '').trim());
            }
            if (m.body) {
              const docMatch = m.body.match(/\[Document Attachment:\s*(?:View|Download)?\s*["']?([^"'\n\]]+)["']?\]/i);
              if (docMatch && docMatch[1]) {
                const cleanT = docMatch[1].replace(/^View\s*["']?|["']$/gi, '').trim();
                if (cleanT && !docTitlesFromMessages.includes(cleanT)) docTitlesFromMessages.push(cleanT);
              }
            }
          }

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
                if ((!att.name || att.name.toLowerCase().includes('school_document')) && docTitleIdx < docTitlesFromMessages.length) {
                  att.name = docTitlesFromMessages[docTitleIdx++];
                }
                if (!att.name || att.name === 'school_document.pdf') {
                  att.name = `school_document_${Date.now()}.pdf`;
                }

                const uploadRes = await PersonalDriveService.uploadAttachmentFile(state.personal_drive_auth_token, att, childName, extraction.chatName);
                if (uploadRes) {
                  uploadCount++;
                  totalAttachmentsUploaded++;
                  const coreFileName = uploadRes.name.replace(/^[A-Za-z0-9]+_/, '').replace(/\s*\(v\d+\)/, '').trim().toLowerCase();
                  const matchedMsg = extractedMessages.find(m => m.body && m.body.toLowerCase().includes(coreFileName));
                  if (matchedMsg) {
                    matchedMsg.driveAttachmentUrl = uploadRes.webViewLink;
                    matchedMsg.driveFileName = uploadRes.name;
                  }
                }
              } catch (uploadErr: any) {}
            }
          }

          let personalDriveResult: any = null;
          if (state.personal_drive_connected && state.personal_drive_auth_token && extractedMessages.length > 0) {
            try {
              if (await SyncLifecycleManager.isAborted(extraction.chatName)) break;
              personalDriveResult = await PersonalDriveService.saveSingleGroupTransaction(state.personal_drive_auth_token, childName, extraction.chatName, extractedMessages);
              totalNewNoticesAcrossAllTargets += (personalDriveResult?.saved || 0);
              await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `[${childName} | ${extraction.chatName}] Archived ${personalDriveResult.saved} new notices (Group Total: ${personalDriveResult.groupTotal}, Master Total: ${personalDriveResult.total}) on Google Drive.`);
            } catch (pdErr: any) {
              await WhatsAppDiagnosticLogger.log('WARN', 'DRIVE', `[${childName} | ${extraction.chatName}] Failed to save to Personal Drive: ${pdErr.message}`);
            }
          }

          // 2. Also mirror to Apps Script MCP Server endpoint so Gemini Spark has instant live access
          const gasUrl = matchedProfile?.gasDeploymentUrl || state.mcp_gas_url || activeProfile?.gasDeploymentUrl;
          if (gasUrl && extractedMessages.length > 0) {
            try {
              const urlWithKey = gasUrl.includes('accessKey=') ? gasUrl : (gasUrl + (gasUrl.includes('?') ? '&' : '?') + 'accessKey=' + (state.access_key || ''));
              await fetch(urlWithKey, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  method: 'archive_whatsapp_messages',
                  params: { messages: extractedMessages, childName },
                  id: 'wa-archive-sync'
                })
              });
              await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `⚡ [${childName}] Mirrored ${extractedMessages.length} notices to Apps Script MCP Server for Gemini Spark.`);
            } catch (gasErr: any) {
              console.warn('Failed to mirror to GAS MCP Server:', gasErr);
            }
          }

          // Save / Update Checkpoint Pointer strictly for the real group name
          if (extraction.chatName && extraction.chatName !== 'Active School Chat') {
            const stored = await chrome.storage.local.get(['chat_sync_pointers']);
            const currentPointers = stored.chat_sync_pointers || {};
            // Clean up any stale dummy keys
            delete currentPointers['Active School Chat'];
            delete currentPointers['General'];

            const latestMsg = (extractedMessages && extractedMessages.length > 0) ? extractedMessages[extractedMessages.length - 1] : extraction.lastMessagePointer;
            currentPointers[extraction.chatName] = {
              id: latestMsg?.id || null,
              sender: latestMsg?.sender || '',
              body: (latestMsg?.body || '').substring(0, 300),
              time: latestMsg?.time || '',
              date: latestMsg?.date || '',
              lastSyncedAt: new Date().toISOString(),
              totalNotices: personalDriveResult?.total || extractedMessages.length,
              hasGap: extraction.hasGap || false,
              gapDetails: extraction.gapDetails || null
            };
            await chrome.storage.local.set({ chat_sync_pointers: currentPointers });
            await WhatsAppDiagnosticLogger.log('INFO', 'CONN', `📍 [POINTER_SAVED] Pointer checkpoint saved for "${extraction.chatName}". Total notices: ${currentPointers[extraction.chatName].totalNotices}`);
          }

          lastResults.push({
            chatName: extraction.chatName,
            messageCount: extractedMessages.length,
            personalDriveResult
          });
        }

        // Auto-sync full archive to Apps Script MCP Server so all historical & latest notices are 100% available in Spark
        const gasSyncUrl = state.mcp_gas_url || activeProfile?.gasDeploymentUrl;
        const activeChildName = activeProfile?.name || 'Atharva';
        if (gasSyncUrl && state.personal_drive_connected) {
          try {
            const allArchiveMessages = await PersonalDriveService.loadAllMessagesFromPersonalDrive(state.personal_drive_auth_token, activeChildName);
            if (allArchiveMessages && allArchiveMessages.length > 0) {
              const urlWithKey = gasSyncUrl.includes('accessKey=') ? gasSyncUrl : (gasSyncUrl + (gasSyncUrl.includes('?') ? '&' : '?') + 'accessKey=' + (state.access_key || ''));
              await fetch(urlWithKey, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  method: 'archive_whatsapp_messages',
                  params: { messages: allArchiveMessages, childName: activeChildName },
                  id: 'wa-full-archive-sync'
                })
              });
              await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `⚡ Populated full master archive (${allArchiveMessages.length} notices) into Apps Script MCP Server.`);
            }
          } catch (gasErr: any) {
            console.warn('Failed to mirror full archive to GAS:', gasErr);
          }
        }

        const totalDurationSec = ((Date.now() - now) / 1000).toFixed(1);
        await WhatsAppDiagnosticLogger.log('SUCCESS', 'CONN', `🏁 [SYNC_COMPLETE] Finished sync cycle in ${totalDurationSec}s across [${processedChatNames.join(', ') || '0 chats'}]. New notices saved: ${totalNewNoticesAcrossAllTargets}, Attachments uploaded: ${totalAttachmentsUploaded}.`);

        return {
          success: true,
          processedChats: processedChatNames,
          totalNewNotices: totalNewNoticesAcrossAllTargets,
          totalAttachmentsUploaded,
          results: lastResults
        };
      } finally {
        isSyncInProgress = false;
        syncInProgressSince = 0;
        await SyncLifecycleManager.releaseSyncLock();
      }
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

    case 'SEARCH_WHATSAPP_EXPORTS': {
      const files = await PersonalDriveService.searchWhatsAppExports();
      const activeChild = await ChildManager.getActiveProfile();
      return { files, activeChildName: activeChild?.name || 'Child_1' };
    }

    case 'INGEST_WHATSAPP_EXPORT': {
      const { fileId, childName } = message.payload || {};
      if (!fileId) throw new Error('File ID is required to ingest export.');
      const result = await PersonalDriveService.ingestWhatsAppExport(fileId, childName);
      return result;
    }

    case 'REBUILD_GROUPS_MANIFEST': {
      const activeChild = await ChildManager.getActiveProfile();
      const childName = activeChild ? activeChild.name : undefined;
      const res = await PersonalDriveService.rebuildGroupsManifest(undefined, childName);
      return res;
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
          // Pre-flight check: exit immediately if ingestion is active, another sync is running, or 0 groups tracked
          const canRun = await SyncLifecycleManager.canRunBackgroundSync(false);
          if (!canRun.allowed) {
            return;
          }

          const waTabs = await chrome.tabs.query({ url: '*://web.whatsapp.com/*' });
          for (const tab of waTabs) {
            if (tab.id && !tab.pinned) {
              try { await chrome.tabs.update(tab.id, { pinned: true }); } catch (pe) {}
            }
          }

          const state = await chrome.storage.local.get(['tracked_whatsapp_chats', 'target_whatsapp_chats']);
          const tracked = state.tracked_whatsapp_chats || [];
          const filterStr = state.target_whatsapp_chats || '';
          if (waTabs.length > 0 && (tracked.length > 0 || filterStr.length > 0)) {
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


