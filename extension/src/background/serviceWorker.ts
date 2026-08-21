import { SanitizerService } from '../services/sanitizer';
import { ErrorHasher } from '../services/errorHasher';
import { PreFlightValidator } from '../services/preflight';
import { GasProvisionerService } from '../services/gasProvisioner';
import { BridgeAdvisor } from '../services/bridgeAdvisor';
import { PersonalDriveService } from '../services/personalDriveService';
import { WhatsAppDiagnosticLogger } from '../services/whatsappLogger';
import { ChildManager } from '../services/childManager';

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
          const blacklist = ['profile details', 'contact info', 'group info', 'search...', 'chats', 'communities', 'channels', 'starred messages', 'settings'];

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

          // Heuristic 5: Generic header fallback
          if (!title) {
            const fallbackEl = document.querySelector('#main header span, header h1, header h2, header [class*="title"], [role="main"] header');
            if (fallbackEl) {
              const t = (fallbackEl.getAttribute('title') || fallbackEl.textContent || '').trim();
              if (t && !blacklist.includes(t.toLowerCase())) title = t;
            }
          }

          if (!title) return null;

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
            chatId = platform.toLowerCase() + '_' + title.toLowerCase().replace(/[^a-z0-9]/g, '_');
          }

          return { id: chatId, title, platform, isGroup: true, addedAt: new Date().toISOString() };
        }
      });

      const captured = results && results[0]?.result;
      if (!captured || !captured.title) {
        throw new Error('Could not detect active chat in the open chat tab. Please ensure a group or conversation is open on screen.');
      }

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

      // Automatically update backup on Personal Google Drive
      const token = (await chrome.storage.local.get(['personal_drive_auth_token'])).personal_drive_auth_token;
      if (token) {
        PersonalDriveService.saveTrackedChatsToPersonalDrive(token, list).catch(() => {});
      }

      return { success: true, trackedChats: list };
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
          const scrollContainer = document.querySelector(
            '#main div[data-testid="conversation-panel-body"], #main .copyable-area > div[tabindex="0"], #main div[role="region"], .bubbles, .MessageList, .chat-list, .messages-container'
          ) as HTMLElement | null;

          const seenMessageKeys = new Set<string>();
          const clickedDocTitles = new Set<string>();
          const allExtractedMessages: any[] = [];
          const maxScrollIterations = isManualSync ? 12 : 2;

          const blobToBase64 = async (b: Blob): Promise<string | null> => {
            return new Promise((resolve) => {
              const fr = new FileReader();
              fr.onloadend = () => resolve((fr.result as string).split(',')[1] || null);
              fr.onerror = () => resolve(null);
              fr.readAsDataURL(b);
            });
          };

          for (let iter = 0; iter < maxScrollIterations; iter++) {
            const msgNodes = document.querySelectorAll(
              'div[data-testid="msg-container"], div.message-in, div.message-out, ' +
              'div.message, div.bubble, div.Message, .message-content, .bubble-content, ' +
              'li[id^="chat-messages-"], div[data-qa="message_container"], [class*="message-bubble"]'
            );

            let newInThisBatch = 0;
            for (let idx = 0; idx < msgNodes.length; idx++) {
              const row = msgNodes[idx];
              // Sender extraction
              const senderEl = row.querySelector('span[aria-label*=":"], span._ak8q, div[data-pre-plain-text], .message-title, .sender-name, strong, [class*="author"]');
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

              // Message text extraction
              const textEl = row.querySelector('span.selectable-text, div.copyable-text, span[dir="ltr"], span[dir="auto"], .text-content, .message, [class*="messageContent"]');
              const text = textEl ? (textEl.textContent || '').trim() : '';

              // Document / PDF file detection
              const docTitleEl = row.querySelector('span[title*="."], span[data-testid="document-name"], .document-name, a.document-container, [data-testid="document-thumb"] span, div[title*="."]');
              const documentTitle = docTitleEl ? (docTitleEl.getAttribute('title') || docTitleEl.textContent || '').trim() : '';

              // Media caption
              const captionEl = row.querySelector('span[data-testid="media-caption"], div.image-caption, .media-caption');
              const mediaCaption = captionEl ? (captionEl.textContent || '').trim() : '';

              let fullBody = text;
              if (documentTitle && !fullBody.includes(documentTitle)) {
                fullBody = `[Document: ${documentTitle}] ${fullBody}`.trim();
              }
              if (mediaCaption && !fullBody.includes(mediaCaption)) {
                fullBody = `${fullBody} [Media Caption: ${mediaCaption}]`.trim();
              }

              // Time extraction
              const timeEl = row.querySelector('span[data-testid="msg-meta"], div[data-testid="msg-meta"], span.bubble-meta, .time, time, [class*="timestamp"]');
              const timeStr = timeEl ? (timeEl.textContent || '').trim() : '';

              const msgKey = `${currentChatName}_${timeStr}_${fullBody || documentTitle}`;
              if (!seenMessageKeys.has(msgKey)) {
                seenMessageKeys.add(msgKey);
                newInThisBatch++;

                let rawAttachment: any = null;
                const cleanTime = (timeStr || '').replace(/[^a-z0-9]/gi, '_');
                const cleanSender = (sender || 'User').replace(/[^a-z0-9]/gi, '_');
                const cleanGroup = currentChatName.replace(/[^a-z0-9]/gi, '_');
                const defaultPhotoName = `${cleanGroup}_${cleanSender}_${cleanTime}_photo_${idx}.jpg`;
                const defaultDocName = `${cleanGroup}_${cleanSender}_${cleanTime}_doc_${idx}.pdf`;

                // 1. Check Image elements
                const imgEl = row.querySelector('img[src], .media-photo, div[data-testid="image-thumb"] img, canvas') as HTMLElement | null;
                if (imgEl) {
                  if (imgEl instanceof HTMLImageElement && imgEl.src) {
                    if (imgEl.src.startsWith('data:image/')) {
                      const parts = imgEl.src.split(',');
                      const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
                      rawAttachment = {
                        name: documentTitle || defaultPhotoName,
                        mimeType: mime,
                        base64Content: parts[1]
                      };
                    } else if (imgEl.src.startsWith('blob:')) {
                      try {
                        const r = await fetch(imgEl.src);
                        const b = await r.blob();
                        if (b.size > 0 && b.size < 15 * 1024 * 1024) {
                          const b64 = await blobToBase64(b);
                          if (b64) {
                            rawAttachment = {
                              name: documentTitle || defaultPhotoName,
                              mimeType: b.type || 'image/jpeg',
                              base64Content: b64
                            };
                          }
                        }
                      } catch (e) {}
                    }
                  } else if (imgEl instanceof HTMLCanvasElement) {
                    try {
                      const dataUrl = imgEl.toDataURL('image/jpeg', 0.9);
                      if (dataUrl.startsWith('data:image/')) {
                        rawAttachment = {
                          name: documentTitle || defaultPhotoName,
                          mimeType: 'image/jpeg',
                          base64Content: dataUrl.split(',')[1]
                        };
                      }
                    } catch (e) {}
                  }
                }

                // 2. Check Document card / Downloadable attachment
                if (!rawAttachment && (documentTitle || row.querySelector('div[data-testid="document-thumb"], span[data-icon="download"], div._ak8l, [data-testid*="document"]'))) {
                  // Clean title from 'View "FileName.pdf"' -> 'FileName.pdf'
                  const cleanDocTitle = documentTitle.replace(/^View\s*["']?|["']$/gi, '').trim();

                  diagLogs.push({
                    level: 'INFO',
                    category: 'ATTACHMENT',
                    message: `Found document attachment: "${cleanDocTitle || 'File'}" in message by ${sender}`,
                    meta: { title: cleanDocTitle, sender, time: timeStr }
                  });

                  // Fast-path: Check if WhatsApp Auto-Download already has the blob URL in the DOM
                  const existingDocLink = row.querySelector('a[href^="blob:"], a[download], a.document-container, div[data-testid="document-thumb"] a, a[href*="blob:"]') as HTMLAnchorElement | null;
                  if (existingDocLink && existingDocLink.href && existingDocLink.href.startsWith('blob:')) {
                    try {
                      const r = await fetch(existingDocLink.href);
                      const b = await r.blob();
                      if (b.size > 0 && b.size < 25 * 1024 * 1024) {
                        const b64 = await blobToBase64(b);
                        if (b64) {
                          const docName = cleanDocTitle || existingDocLink.getAttribute('download') || defaultDocName;
                          rawAttachment = {
                            name: docName,
                            mimeType: b.type || 'application/pdf',
                            base64Content: b64
                          };
                          diagLogs.push({
                            level: 'SUCCESS',
                            category: 'ATTACHMENT',
                            message: `Directly grabbed auto-downloaded document "${docName}" from memory cache (${Math.round(b.size / 1024)} KB)`,
                            meta: { fileName: docName, size: b.size }
                          });
                        }
                      }
                    } catch (e) {}
                  }

                  // Trigger download click once per unique document if not pre-cached
                  if (!rawAttachment && !clickedDocTitles.has(cleanDocTitle)) {
                    clickedDocTitles.add(cleanDocTitle);

                    lastInterceptedBlob = null;
                    const triggerFullClick = (el: HTMLElement) => {
                      try {
                        const opts = { bubbles: true, cancelable: true, view: window };
                        el.dispatchEvent(new PointerEvent('pointerdown', opts));
                        el.dispatchEvent(new MouseEvent('mousedown', opts));
                        el.dispatchEvent(new PointerEvent('pointerup', opts));
                        el.dispatchEvent(new MouseEvent('mouseup', opts));
                        el.click();
                      } catch (e) {
                        try { el.click(); } catch (e2) {}
                      }
                    };

                    const docCard = (row.querySelector(
                      'div[data-testid="document-thumb"], span[data-icon="download"]'
                    )?.closest('[role="button"]') || row.querySelector(
                      'div[role="button"][title*="download" i], div[role="button"][aria-label*="download" i], div[data-testid="document-thumb"], span[data-icon="download"], div._ak8l, div._ak72'
                    ) || docTitleEl?.closest('[role="button"]')) as HTMLElement | null;

                    if (docCard) {
                      try {
                        diagLogs.push({
                          level: 'INFO',
                          category: 'ATTACHMENT',
                          message: `Triggered click on document card "${cleanDocTitle || 'File'}"`,
                          meta: { title: cleanDocTitle }
                        });
                        triggerFullClick(docCard);
                        await new Promise(r => setTimeout(r, 1400)); // Wait for in-app PDF modal and decryption stream
                      } catch (e) {}
                    }

                    // 1. Check if page-level interceptor captured the stream in memory
                    const capturedMap = (window as any).__capturedPdfStreams;
                    if (!rawAttachment && capturedMap && capturedMap.size > 0) {
                      const latestStream = Array.from(capturedMap.values()).pop() as any;
                      if (latestStream && latestStream.base64Data) {
                        const docName = cleanDocTitle || latestStream.fileName || defaultDocName;
                        rawAttachment = {
                          name: docName,
                          mimeType: latestStream.mimeType || 'application/pdf',
                          base64Content: latestStream.base64Data
                        };
                        diagLogs.push({
                          level: 'SUCCESS',
                          category: 'ATTACHMENT',
                          message: `Directly grabbed live intercepted PDF stream for "${docName}" (${Math.round((latestStream.size || 0) / 1024)} KB)`,
                          meta: { fileName: docName, size: latestStream.size }
                        });
                      }
                    }

                    // 2. WHILE IN-APP MODAL IS OPEN: Check rendered page canvases
                    if (!rawAttachment) {
                      const viewerCanvases = Array.from(document.querySelectorAll('div[data-animate-media-viewer="true"] canvas, div[role="dialog"] canvas, .media-viewer canvas, canvas')) as HTMLCanvasElement[];
                      const validCanvases = viewerCanvases.filter(c => c.width > 50 && c.height > 50);

                      if (validCanvases.length > 0) {
                        try {
                          let dataUrl = '';
                          if (validCanvases.length === 1) {
                            dataUrl = validCanvases[0].toDataURL('image/jpeg', 0.95);
                          } else {
                            const totalHeight = validCanvases.reduce((acc, c) => acc + c.height, 0);
                            const maxWidth = Math.max(...validCanvases.map(c => c.width));
                            const mergedCanvas = origCreateElement('canvas') as HTMLCanvasElement;
                            mergedCanvas.width = maxWidth;
                            mergedCanvas.height = totalHeight;
                            const ctx = mergedCanvas.getContext('2d');
                            if (ctx) {
                              ctx.fillStyle = '#FFFFFF';
                              ctx.fillRect(0, 0, maxWidth, totalHeight);
                              let currentY = 0;
                              for (const pageCanvas of validCanvases) {
                                ctx.drawImage(pageCanvas, 0, currentY);
                                currentY += pageCanvas.height;
                              }
                              dataUrl = mergedCanvas.toDataURL('image/jpeg', 0.92);
                            }
                          }

                          if (dataUrl && dataUrl.startsWith('data:image/')) {
                            const docName = cleanDocTitle ? cleanDocTitle.replace(/\.pdf$/i, '.jpg') : defaultPhotoName;
                            rawAttachment = {
                              name: docName,
                              mimeType: 'image/jpeg',
                              base64Content: dataUrl.split(',')[1]
                            };
                            diagLogs.push({
                              level: 'SUCCESS',
                              category: 'ATTACHMENT',
                              message: `Captured complete ${validCanvases.length}-page document "${docName}" from viewer canvas`,
                              meta: { fileName: docName, pageCount: validCanvases.length }
                            });
                          }
                        } catch (e: any) {
                          diagLogs.push({
                            level: 'WARN',
                            category: 'ATTACHMENT',
                            message: `Viewer canvas export error: ${e.message}`,
                            meta: { error: e.message }
                          });
                        }
                      }
                    }

                    // 3. ALSO trigger In-Viewer download button to catch binary PDF blob
                    let modalDownloadBtn: HTMLElement | null = null;
                    const downloadIcons = document.querySelectorAll('span[data-icon="download"], span[data-icon="down-arrow"], span[data-icon="arrow-down"], [data-icon*="download"]');
                    if (downloadIcons.length > 0) {
                      const lastIcon = downloadIcons[downloadIcons.length - 1];
                      modalDownloadBtn = (lastIcon.closest('div[role="button"]') || lastIcon.closest('button') || lastIcon) as HTMLElement;
                    }

                    if (!modalDownloadBtn) {
                      const allBtns = Array.from(document.querySelectorAll('div[role="button"], button'));
                      modalDownloadBtn = (allBtns.find(b => {
                        const l = (b.getAttribute('aria-label') || b.getAttribute('title') || '').toLowerCase();
                        return l.includes('download') || l.includes('save');
                      }) || null) as HTMLElement | null;
                    }

                    if (modalDownloadBtn) {
                      try {
                        diagLogs.push({
                          level: 'INFO',
                          category: 'ATTACHMENT',
                          message: `In-Viewer download button found, triggering download for "${cleanDocTitle || 'File'}"`,
                          meta: { title: cleanDocTitle }
                        });
                        triggerFullClick(modalDownloadBtn);
                        await new Promise(r => setTimeout(r, 1100));
                      } catch (e) {}
                    }

                    // 4. Close the In-App Viewer modal to restore normal chat view
                    const closeIcons = document.querySelectorAll('span[data-icon="x"], span[data-icon="close"], [data-icon*="x"], [data-icon*="close"]');
                    if (closeIcons.length > 0) {
                      const closeBtn = (closeIcons[closeIcons.length - 1].closest('div[role="button"]') || closeIcons[closeIcons.length - 1].closest('button') || closeIcons[closeIcons.length - 1]) as HTMLElement;
                      try {
                        triggerFullClick(closeBtn);
                        await new Promise(r => setTimeout(r, 450));
                      } catch (e) {}
                    } else {
                      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
                      await new Promise(r => setTimeout(r, 450));
                    }
                  }

                  // Check if intercepted by anchor / URL.createObjectURL hook (prioritize over canvas if binary PDF was captured)
                  if (lastInterceptedBlob) {
                    let b64 = '';
                    if (lastInterceptedBlob.url) {
                      try {
                        const r = await fetch(lastInterceptedBlob.url);
                        const b = await r.blob();
                        if (b.size > 0) {
                          b64 = (await blobToBase64(b)) || '';
                        }
                      } catch (e) {}
                    }

                    if (!b64) {
                      const cached = blobBase64Map.get(lastInterceptedBlob.url);
                      if (cached && cached.base64) {
                        b64 = cached.base64;
                      } else if (lastInterceptedBlob.blob) {
                        b64 = (await blobToBase64(lastInterceptedBlob.blob)) || '';
                      }
                    }

                    if (b64) {
                      const interceptedName = lastInterceptedBlob.name || cleanDocTitle || defaultDocName;
                      rawAttachment = {
                        name: interceptedName,
                        mimeType: lastInterceptedBlob.blob?.type || 'application/pdf',
                        base64Content: b64
                      };
                      diagLogs.push({
                        level: 'SUCCESS',
                        category: 'ATTACHMENT',
                        message: `Intercepted & fetched Blob for "${interceptedName}" (${Math.round(b64.length * 0.75 / 1024)} KB)`,
                        meta: { fileName: interceptedName }
                      });
                    }
                  }

                  // Fallback to all created Blobs in memory
                  if (!rawAttachment && (blobBase64Map.size > 0 || createdBlobs.size > 0)) {
                    for (const [url, entry] of Array.from(blobBase64Map.entries()).reverse()) {
                      if (entry.base64 && entry.base64.length > 500) {
                        const docName = cleanDocTitle || defaultDocName;
                        rawAttachment = {
                          name: docName,
                          mimeType: entry.mime || 'application/pdf',
                          base64Content: entry.base64
                        };
                        diagLogs.push({
                          level: 'SUCCESS',
                          category: 'ATTACHMENT',
                          message: `Intercepted memory blob for "${docName}" (${Math.round(entry.base64.length * 0.75 / 1024)} KB, ${entry.mime})`,
                          meta: { fileName: docName, mime: entry.mime }
                        });
                        break;
                      }
                    }

                    if (!rawAttachment && createdBlobs.size > 0) {
                      for (const [url, b] of Array.from(createdBlobs.entries()).reverse()) {
                        if (b && b.size > 500) {
                          const b64 = await blobToBase64(b);
                          if (b64) {
                            const docName = cleanDocTitle || defaultDocName;
                            rawAttachment = {
                              name: docName,
                              mimeType: b.type || 'application/pdf',
                              base64Content: b64
                            };
                            diagLogs.push({
                              level: 'SUCCESS',
                              category: 'ATTACHMENT',
                              message: `Intercepted createdBlob for "${docName}" (${Math.round(b.size / 1024)} KB, ${b.type})`,
                              meta: { fileName: docName, size: b.size }
                            });
                            break;
                          }
                        }
                      }
                    }
                  }

                  // Fallback to DOM anchor
                  if (!rawAttachment) {
                    const docLink = row.querySelector('a[href^="blob:"], a[download], a.document-container, div[data-testid="document-thumb"] a, a[href*="blob:"]') as HTMLAnchorElement | null;
                    if (docLink && docLink.href && docLink.href.startsWith('blob:')) {
                      try {
                        const r = await fetch(docLink.href);
                        const b = await r.blob();
                        if (b.size > 0 && b.size < 25 * 1024 * 1024) {
                          const b64 = await blobToBase64(b);
                          if (b64) {
                            const docName = cleanDocTitle || docLink.getAttribute('download') || defaultDocName;
                            rawAttachment = {
                              name: docName,
                              mimeType: b.type || 'application/pdf',
                              base64Content: b64
                            };
                            diagLogs.push({
                              level: 'SUCCESS',
                              category: 'ATTACHMENT',
                              message: `Extracted document blob for "${docName}" from DOM anchor`,
                              meta: { fileName: docName, size: b.size }
                            });
                          }
                        }
                      } catch (e) {}
                    }
                  }

                  if (!rawAttachment) {
                    diagLogs.push({
                      level: 'WARN',
                      category: 'ATTACHMENT',
                      message: `Download clicked for "${cleanDocTitle || 'File'}" but no binary blob was produced by web app`,
                      meta: { title: cleanDocTitle }
                    });
                  }
                }

                if (fullBody || documentTitle || rawAttachment) {
                  allExtractedMessages.push({
                    id: `chat_${Date.now()}_${idx}`,
                    chatName: currentChatName,
                    sender: sender || 'Teacher/Parent',
                    timestamp: timeStr || new Date().toLocaleTimeString(),
                    body: fullBody || `[Attachment: ${documentTitle || 'File'}]`,
                    rawAttachment
                  });
                }
              }
            }

            // Smart Stop Condition with 2-batch retry
            if (!isManualSync || !scrollContainer) {
              break;
            }

            if (scrollContainer.scrollTop <= 10) {
              diagLogs.push({
                level: 'INFO',
                category: 'EXTRACT',
                message: `Reached topmost boundary of chat history (${allExtractedMessages.length} total messages loaded)`
              });
              break;
            }

            // Scroll upward by a substantial jump
            scrollContainer.scrollBy({ top: -1200, behavior: 'smooth' });
            await new Promise(r => setTimeout(r, 850)); // Allow WhatsApp Web virtual DOM time to render older messages
          }

          // Restore scroll position smoothly to bottom
          if (isManualSync && scrollContainer) {
            try {
              scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
            } catch (e) {}
          }

          return { chatName: currentChatName, messages: allExtractedMessages, diagLogs, filteredOut: false };
        } finally {
          URL.createObjectURL = origCreateObjectURL;
          URL.revokeObjectURL = origRevokeObjectURL;
          HTMLAnchorElement.prototype.click = origAnchorClick;
          window.open = origOpen;
          document.createElement = origCreateElement;
        }
        }
      });

      const extraction = results && results[0]?.result;
      if (!extraction) {
        throw new Error('Could not extract messages from active chat tab.');
      }

      // Flush detailed extraction diagnostic logs
      if (extraction.diagLogs && Array.isArray(extraction.diagLogs)) {
        for (const dl of extraction.diagLogs) {
          await WhatsAppDiagnosticLogger.log(dl.level, dl.category, dl.message, dl.meta);
        }
      }

      if (extraction.filteredOut) {
        const trackedNames = trackedChats.map((t: any) => t.title).concat(stringFilters);
        throw new Error(`Active chat "${extraction.chatName}" does not match any of your configured target groups [${trackedNames.join(', ')}]. Please click the target school group in your chat app.`);
      }

      const extractedMessages = extraction.messages || [];
      const activeChild = await ChildManager.getActiveProfile();
      const childName = activeChild ? activeChild.name : 'Child_1';

      // Process attachments and upload directly to Personal Google Drive
      let uploadCount = 0;
      for (const m of extractedMessages) {
        if (m.rawAttachment && m.rawAttachment.base64Content) {
          try {
            const uploadRes = await PersonalDriveService.uploadAttachmentFile(state.personal_drive_auth_token, m.rawAttachment, childName);
            if (uploadRes) {
              m.driveAttachmentUrl = uploadRes.webViewLink;
              m.driveFileName = uploadRes.name;
              uploadCount++;
              await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `Uploaded attachment "${uploadRes.name}" to Personal Drive for ${childName}`, {
                childName,
                fileName: uploadRes.name,
                driveUrl: uploadRes.webViewLink
              });
            }
          } catch (uploadErr: any) {
            await WhatsAppDiagnosticLogger.log('WARN', 'DRIVE', `Failed to upload attachment "${m.rawAttachment.name}": ${uploadErr.message}`, {
              fileName: m.rawAttachment.name,
              error: uploadErr.message
            });
          } finally {
            delete m.rawAttachment;
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
      const logs = await WhatsAppDiagnosticLogger.getLogs();
      const text = WhatsAppDiagnosticLogger.formatLogsAsText(logs);
      return { logs, formatted: text };
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


