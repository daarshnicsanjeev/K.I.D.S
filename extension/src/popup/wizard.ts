import { ChildManager } from '../services/childManager';
import { PersonalDriveService } from '../services/personalDriveService';
import { GasProvisionerService, CURRENT_GAS_SERVER_VERSION, CURRENT_GAS_CHANGELOG } from '../services/gasProvisioner';
import { AiNormalizerService } from '../services/aiNormalizer';

document.addEventListener('DOMContentLoaded', async () => {
  const stepBadge = document.getElementById('stepBadge') as HTMLElement;
  const cardStep1 = document.getElementById('step1Card') as HTMLElement;
  const cardStep2 = document.getElementById('step2Card') as HTMLElement;
  const cardStep3 = document.getElementById('step3Card') as HTMLElement;
  const cardStep4 = document.getElementById('step4Card') as HTMLElement;
  const cardStep5 = document.getElementById('step5Card') as HTMLElement;

  // AI Normalizer Status & Guidance UI Elements
  const aiStatusPillBar = document.getElementById('aiStatusPillBar') as HTMLElement;
  const aiStatusBadge = document.getElementById('aiStatusBadge') as HTMLElement;
  const aiGuidanceModal = document.getElementById('aiGuidanceModal') as HTMLElement;
  const aiGuidanceIcon = document.getElementById('aiGuidanceIcon') as HTMLElement;
  const aiGuidanceTitle = document.getElementById('aiGuidanceTitle') as HTMLElement;
  const aiGuidanceMessage = document.getElementById('aiGuidanceMessage') as HTMLElement;
  const btnCloseAiGuidance = document.getElementById('btnCloseAiGuidance') as HTMLButtonElement;
  const btnActionAiGuidance = document.getElementById('btnActionAiGuidance') as HTMLButtonElement;

  let currentAiReadiness: any = null;

  async function checkAiNormalizerStatus() {
    if (!aiStatusBadge) return;
    try {
      currentAiReadiness = await AiNormalizerService.checkAiReadinessDetailed();
      aiStatusBadge.textContent = currentAiReadiness.badgeLabel;
      aiStatusBadge.style.background = currentAiReadiness.badgeBg;
      aiStatusBadge.style.color = currentAiReadiness.badgeColor;
      aiStatusBadge.title = currentAiReadiness.userAdviceTitle;
    } catch {
      aiStatusBadge.textContent = '⚪ Rule Engine';
      aiStatusBadge.style.background = '#334155';
      aiStatusBadge.style.color = '#cbd5e1';
    }
  }

  function showAiGuidance() {
    if (!aiGuidanceModal || !currentAiReadiness) return;

    if (aiGuidanceIcon) {
      aiGuidanceIcon.innerText = currentAiReadiness.status === 'ready' ? '🟢' :
                                 currentAiReadiness.status === 'outdated_chrome' ? '🔴' : '🟡';
    }
    if (aiGuidanceTitle) {
      aiGuidanceTitle.innerText = currentAiReadiness.userAdviceTitle;
    }
    if (aiGuidanceMessage) {
      aiGuidanceMessage.innerText = currentAiReadiness.userAdviceMessage;
    }

    if (btnActionAiGuidance) {
      if (currentAiReadiness.status === 'outdated_chrome') {
        btnActionAiGuidance.innerText = '📋 Copy Update Link';
        btnActionAiGuidance.classList.remove('hidden');
      } else if (currentAiReadiness.status === 'disabled_or_flag_off') {
        btnActionAiGuidance.innerText = '📋 Copy Flag Guide';
        btnActionAiGuidance.classList.remove('hidden');
      } else if (currentAiReadiness.status === 'downloading') {
        btnActionAiGuidance.innerText = '⚡ Start Download';
        btnActionAiGuidance.classList.remove('hidden');
      } else {
        btnActionAiGuidance.classList.add('hidden');
      }
    }

    aiGuidanceModal.classList.remove('hidden');
  }

  aiStatusPillBar?.addEventListener('click', () => {
    showAiGuidance();
  });

  btnCloseAiGuidance?.addEventListener('click', () => {
    aiGuidanceModal?.classList.add('hidden');
  });

  btnActionAiGuidance?.addEventListener('click', async () => {
    if (!currentAiReadiness) return;
    if (currentAiReadiness.actionType === 'update_chrome') {
      await navigator.clipboard.writeText('chrome://settings/help');
      showSuccess('Copied "chrome://settings/help" to clipboard! Paste in Chrome address bar to update.');
      aiGuidanceModal?.classList.add('hidden');
    } else if (currentAiReadiness.actionType === 'enable_flags') {
      const instructions = `Steps to Enable Chrome Gemini Nano AI:\n1. Open: chrome://flags\n2. Set "Prompt API for Gemini Nano" -> Enabled\n3. Set "Enables optimization guide on device" -> Enabled BypassPerfRequirement\n4. Relaunch Chrome.`;
      await navigator.clipboard.writeText(instructions);
      showSuccess('Copied Flag Instructions to clipboard! Paste into notepad or browser to configure.');
      aiGuidanceModal?.classList.add('hidden');
    } else if (currentAiReadiness.actionType === 'start_download') {
      btnActionAiGuidance.disabled = true;
      btnActionAiGuidance.innerText = '⏳ Downloading...';
      try {
        await AiNormalizerService.triggerModelDownload(() => {});
        showSuccess('✅ Model download started/completed!');
        await checkAiNormalizerStatus();
      } catch (e: any) {
        showError(`Download error: ${e?.message || String(e)}`);
      } finally {
        btnActionAiGuidance.disabled = false;
        btnActionAiGuidance.innerText = '⚡ Start Download';
      }
    }
  });

  checkAiNormalizerStatus();

  // Gas Server Version UI Elements
  const gasUpdateNotificationCard = document.getElementById('gasUpdateNotificationCard') as HTMLElement;
  const lblGasUpdateTitle = document.getElementById('lblGasUpdateTitle') as HTMLElement;
  const lblGasUpdateChangelog = document.getElementById('lblGasUpdateChangelog') as HTMLElement;
  const btnQuickUpdateGasServer = document.getElementById('btnQuickUpdateGasServer') as HTMLButtonElement;
  const gasUpToDateBadge = document.getElementById('gasUpToDateBadge') as HTMLElement;
  const lblGasDeployedVersion = document.getElementById('lblGasDeployedVersion') as HTMLElement;
  const lblGasDeployedChild = document.getElementById('lblGasDeployedChild') as HTMLElement;

  // Multi-Child UI Elements
  const selChildProfile = document.getElementById('selChildProfile') as HTMLSelectElement;
  const btnAddChild = document.getElementById('btnAddChild') as HTMLButtonElement;
  const btnRenameChild = document.getElementById('btnRenameChild') as HTMLButtonElement;
  const btnDeleteChild = document.getElementById('btnDeleteChild') as HTMLButtonElement;
  const childModalBar = document.getElementById('childModalBar') as HTMLElement;
  const txtChildNameInput = document.getElementById('txtChildNameInput') as HTMLInputElement;
  const btnSaveChildName = document.getElementById('btnSaveChildName') as HTMLButtonElement;
  const btnCancelChildName = document.getElementById('btnCancelChildName') as HTMLButtonElement;

  let activeChildAction: 'add' | 'rename' | null = null;

  async function renderChildProfiles() {
    try {
      const hasChild = await ChildManager.hasConfiguredChild();
      const childSwitcherBar = document.querySelector('.child-switcher-bar') as HTMLElement;
      if (!hasChild) {
        if (childSwitcherBar) childSwitcherBar.style.display = 'none';
        return;
      }

      const profiles = await ChildManager.getProfiles();
      const active = await ChildManager.getActiveProfile();

      if (selChildProfile) {
        selChildProfile.innerHTML = '';
        profiles.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = `👶 ${p.name}`;
          if (active && p.id === active.id) {
            opt.selected = true;
          }
          selChildProfile.appendChild(opt);
        });
      }
      if (childSwitcherBar) childSwitcherBar.style.display = 'flex';
    } catch (e) {}
  }

  selChildProfile?.addEventListener('change', async () => {
    const selectedId = selChildProfile.value;
    const active = await ChildManager.setActiveProfileId(selectedId);
    if (active) {
      showSuccess(`Switched active profile to "${active.name}".`);
      await refreshBridgeStatus();
      const stateNow = await sendMessage({ type: 'GET_STATE' });
      renderState(stateNow);
    }
  });

  btnAddChild?.addEventListener('click', () => {
    activeChildAction = 'add';
    if (txtChildNameInput) {
      txtChildNameInput.value = '';
      txtChildNameInput.placeholder = 'Child First Name (e.g. Daarshnic)';
    }
    childModalBar?.classList.remove('hidden');
    txtChildNameInput?.focus();
  });

  btnRenameChild?.addEventListener('click', async () => {
    activeChildAction = 'rename';
    const active = await ChildManager.getActiveProfile();
    if (active && txtChildNameInput) {
      txtChildNameInput.value = active.name;
    }
    childModalBar?.classList.remove('hidden');
    txtChildNameInput?.focus();
  });

  btnDeleteChild?.addEventListener('click', async () => {
    const active = await ChildManager.getActiveProfile();
    if (!active) return;
    if (confirm(`Are you sure you want to remove the profile for "${active.name}"?`)) {
      try {
        const deletedName = active.name;
        const res = await ChildManager.deleteProfile(active.id);

        // Sync remaining profiles to Drive backup
        try {
          const remainingProfiles = await ChildManager.getProfiles();
          await PersonalDriveService.saveProfilesToDrive(undefined, remainingProfiles);
        } catch (e) {}

        await renderChildProfiles();
        await refreshBridgeStatus();

        if (res.remainingCount > 0 && res.activeProfile) {
          showSuccess(`Removed profile "${deletedName}". Switched to ${res.activeProfile.name}.`);
          const stateNow = await sendMessage({ type: 'GET_STATE' });
          await renderState(stateNow);
        } else {
          // No children remaining: automatically navigate to Step 1 and prompt for new child
          showSuccess(`Profile "${deletedName}" removed. Please enter child's first name to continue.`);
          await sendMessage({
            type: 'UPDATE_STATE',
            payload: { wizard_current_step: 1 }
          });
          const stateNow = await sendMessage({ type: 'GET_STATE' });
          await renderState(stateNow);
          if (txtStep1ChildName) {
            txtStep1ChildName.value = '';
            txtStep1ChildName.focus();
          }
        }
      } catch (e: any) {
        showError(e.message);
      }
    }
  });

  btnCancelChildName?.addEventListener('click', () => {
    childModalBar?.classList.add('hidden');
    activeChildAction = null;
  });

  btnSaveChildName?.addEventListener('click', async () => {
    const rawName = txtChildNameInput?.value || '';
    const cleanName = ChildManager.sanitizeName(rawName);
    if (!cleanName) {
      showError('Please enter a valid first name.');
      return;
    }

    if (activeChildAction === 'add') {
      const created = await ChildManager.createProfile(cleanName);
      childModalBar?.classList.add('hidden');
      activeChildAction = null;
      await renderChildProfiles();
      await refreshBridgeStatus();
      const stateNow = await sendMessage({ type: 'GET_STATE' });
      renderState(stateNow);
      showSuccess(`Created and switched to profile: "${created.name}"`);
    } else if (activeChildAction === 'rename') {
      const active = await ChildManager.getActiveProfile();
      if (active) {
        await ChildManager.updateProfile(active.id, { name: cleanName });
      }
      childModalBar?.classList.add('hidden');
      activeChildAction = null;
      await renderChildProfiles();
      await refreshBridgeStatus();
      const stateNow = await sendMessage({ type: 'GET_STATE' });
      renderState(stateNow);
      showSuccess(`Renamed profile to: "${cleanName}"`);
    }
  });

  await renderChildProfiles();

  const btnOpenClassroom = document.getElementById('btnOpenClassroom') as HTMLButtonElement;
  const btnCreateMcpServer = document.getElementById('btnCreateMcpServer') as HTMLButtonElement;
  const btnOpenApiSettings = document.getElementById('btnOpenApiSettings') as HTMLButtonElement;
  const gasUrlInput = document.getElementById('gasUrlInput') as HTMLInputElement;

  async function openGoogleAuthScreenDirectly(customUrl?: string) {
    try {
      const stateNow = await sendMessage({ type: 'GET_STATE' });
      let targetUrl = '';
      if (stateNow.mcp_gas_script_id) {
        targetUrl = `https://script.google.com/home/projects/${stateNow.mcp_gas_script_id}/edit`;
      } else if (customUrl || stateNow.mcp_gas_url) {
        targetUrl = getCleanCanonicalUrl(customUrl || stateNow.mcp_gas_url);
      } else {
        targetUrl = 'https://script.google.com/home/projects';
      }

      await chrome.tabs.create({ url: targetUrl, active: true });
    } catch (e) {}
  }

  btnOpenApiSettings?.addEventListener('click', async () => {
    const authUserParam = await detectSchoolAccountParam();
    const accountIndex = authUserParam ? `/u/${authUserParam.replace('?authuser=', '')}/` : '/';
    const settingsUrl = `https://script.google.com${accountIndex}home/usersettings`;
    chrome.tabs.create({ url: settingsUrl, active: true });
    showSuccess('Opening Google Apps Script Settings... Please toggle "Google Apps Script API" to ON.');
  });

  const mcpUrlDisplay = document.getElementById('mcpUrlDisplay') as HTMLInputElement;
  const step3McpUrlDisplay = document.getElementById('step3McpUrlDisplay') as HTMLInputElement;

  const btnVerifyStep1 = document.getElementById('btnVerifyStep1') as HTMLButtonElement;
  const btnCopyUrl = document.getElementById('btnCopyUrl') as HTMLButtonElement;
  const btnAddAnotherPlatform = document.getElementById('btnAddAnotherPlatform') as HTMLButtonElement;

  const btnCaptureVerifyPortal = document.getElementById('btnCaptureVerifyPortal') as HTMLButtonElement;
  const btnRegisterFeature = document.getElementById('btnRegisterFeature') as HTMLButtonElement;
  const connectionSection = document.getElementById('connectionSection') as HTMLElement;
  const featureSection = document.getElementById('featureSection') as HTMLElement;
  const connectionStatusBox = document.getElementById('connectionStatusBox') as HTMLElement;
  const connectionStatusText = document.getElementById('connectionStatusText') as HTMLElement;
  const connectionStatusIcon = document.getElementById('connectionStatusIcon') as HTMLElement;

  const statusAlert = document.getElementById('statusAlert') as HTMLElement;
  const errorReportBanner = document.getElementById('errorReportBanner') as HTMLElement;
  const errorMessageText = document.getElementById('errorMessageText') as HTMLElement;
  const btnSendReport = document.getElementById('btnSendReport') as HTMLButtonElement;

  const txtActivityLog = document.getElementById('txtActivityLog') as HTMLTextAreaElement;
  const btnCopyActivityLog = document.getElementById('btnCopyActivityLog') as HTMLButtonElement;

  function appendLog(message: string) {
    const time = new Date().toLocaleTimeString();
    const line = `[${time}] ${message}\n`;
    if (txtActivityLog) {
      txtActivityLog.value += line;
      txtActivityLog.scrollTop = txtActivityLog.scrollHeight;
    }
  }

  btnCopyActivityLog?.addEventListener('click', () => {
    if (txtActivityLog && txtActivityLog.value) {
      navigator.clipboard.writeText(txtActivityLog.value);
      showSuccess('📋 Full diagnostic log copied to clipboard! You can now paste it directly into chat.');
    }
  });

  const txtServerLogs = document.getElementById('txtServerLogs') as HTMLTextAreaElement;
  const btnFetchServerLogs = document.getElementById('btnFetchServerLogs') as HTMLButtonElement;
  const btnCopyServerLogs = document.getElementById('btnCopyServerLogs') as HTMLButtonElement;

  btnFetchServerLogs?.addEventListener('click', async () => {
    clearAlerts();
    btnFetchServerLogs.disabled = true;
    btnFetchServerLogs.innerText = '⏳ Fetching Logs...';

    try {
      const stateNow = await sendMessage({ type: 'GET_STATE' });
      if (!stateNow.mcp_gas_url) {
        showError('No MCP Server URL found. Please complete Step 1 setup first.');
        return;
      }

      const res = await fetch(stateNow.mcp_gas_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'server/getLogs', id: 'fetch-logs' })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      const logs = json.result?.logs || [];
      if (logs.length === 0) {
        txtServerLogs.value = 'ℹ️ No execution logs recorded yet on MCP Server. Calls from Gemini Spark will appear here.';
      } else {
        const formatted = logs.map((l: any) => `[${l.time}] [${l.level}] ${l.action}: ${l.details}`).join('\n\n');
        txtServerLogs.value = formatted;
        txtServerLogs.scrollTop = 0;
        showSuccess(`✅ Fetched ${logs.length} MCP Server execution log entries!`);
      }
    } catch (err: any) {
      showError(`Could not fetch MCP Server logs: ${err.message}`);
    } finally {
      btnFetchServerLogs.disabled = false;
      btnFetchServerLogs.innerText = '🔄 Fetch MCP Server Logs';
    }
  });

  btnCopyServerLogs?.addEventListener('click', () => {
    if (txtServerLogs && txtServerLogs.value) {
      navigator.clipboard.writeText(txtServerLogs.value);
      showSuccess('📋 MCP Server execution logs copied to clipboard!');
    }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'APPEND_LOG' && msg.payload?.message) {
      appendLog(msg.payload.message);
    }
  });

  let lastErrorContext: any = null;

  // WhatsApp & Universal Web Bridge UI elements
  const waConnectionStatus = document.getElementById('waConnectionStatus') as HTMLParagraphElement;
  const btnCaptureActiveChat = document.getElementById('btnCaptureActiveChat') as HTMLButtonElement;
  const trackedChatsEmpty = document.getElementById('trackedChatsEmpty') as HTMLDivElement;
  const trackedChatsList = document.getElementById('trackedChatsList') as HTMLUListElement;

  function renderTrackedChats(chats: any[]) {
    if (!trackedChatsList || !trackedChatsEmpty) return;
    trackedChatsList.innerHTML = '';
    if (!chats || chats.length === 0) {
      trackedChatsEmpty.style.display = 'block';
      return;
    }
    trackedChatsEmpty.style.display = 'none';

    chats.forEach((c: any) => {
      const li = document.createElement('li');
      li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #064e3b; padding: 6px 10px; border-radius: 6px; font-size: 0.8rem; border: 1px solid #059669; margin-bottom: 4px;';

      const infoDiv = document.createElement('div');
      infoDiv.style.cssText = 'flex: 1; margin-right: 8px; line-height: 1.3; overflow: hidden;';
      
      const titleSpan = document.createElement('div');
      titleSpan.style.cssText = 'font-weight: 700; color: #f0fdf4; word-break: break-word;';
      titleSpan.innerHTML = `💬 <strong>Group Name:</strong> ${c.title}`;
      
      const idSpan = document.createElement('div');
      idSpan.style.cssText = 'font-size: 0.7rem; color: #a7f3d0; opacity: 0.9; margin-top: 2px; font-family: monospace; word-break: break-all;';
      idSpan.innerHTML = `🆔 <strong>Unique ID:</strong> ${c.id || 'Active'}`;

      infoDiv.appendChild(titleSpan);
      infoDiv.appendChild(idSpan);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-danger btn-sm';
      removeBtn.innerHTML = '🗑️ Stop Tracking';
      removeBtn.title = 'Remove this chat from tracked list';
      removeBtn.style.cssText = 'padding: 4px 8px; font-size: 0.7rem; white-space: nowrap;';
      removeBtn.addEventListener('click', async () => {
        const res = await sendMessage({
          type: 'REMOVE_TRACKED_WHATSAPP_CHAT',
          payload: { id: c.id }
        });
        renderTrackedChats(res.trackedChats);
        showSuccess(`Removed "${c.title}" from tracking.`);
      });

      li.appendChild(infoDiv);
      li.appendChild(removeBtn);
      trackedChatsList.appendChild(li);
    });
  }

  // Account Guidance Modal Elements
  const accountGuidanceModal = document.getElementById('accountGuidanceModal') as HTMLElement;
  const guidanceModalIcon = document.getElementById('guidanceModalIcon') as HTMLElement;
  const guidanceModalTitle = document.getElementById('guidanceModalTitle') as HTMLElement;
  const guidanceModalMessage = document.getElementById('guidanceModalMessage') as HTMLElement;
  const btnCancelGuidanceModal = document.getElementById('btnCancelGuidanceModal') as HTMLButtonElement;
  const btnProceedGuidanceModal = document.getElementById('btnProceedGuidanceModal') as HTMLButtonElement;

  function showAccountGuidance(config: {
    icon: string;
    title: string;
    targetAccountType: 'parent' | 'child';
    childName?: string;
    primaryAccountLabel: string;
    prohibitedAccountLabel: string;
    reason: string;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      if (!accountGuidanceModal) return resolve(true);

      if (guidanceModalIcon) guidanceModalIcon.innerText = config.icon;
      if (guidanceModalTitle) guidanceModalTitle.innerText = config.title;
      
      const themeColor = config.targetAccountType === 'parent' ? '#38bdf8' : '#34d399';
      if (guidanceModalMessage) {
        guidanceModalMessage.style.borderLeftColor = themeColor;
        guidanceModalMessage.innerHTML = `
          <div style="margin-bottom: 10px;">
            <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: ${themeColor}; font-weight: 700;">Account to choose on Google screen:</div>
            <div style="font-size: 0.94rem; font-weight: 800; color: #ffffff; margin-top: 4px; background: #1e293b; padding: 7px 10px; border-radius: 6px; border: 1px solid ${themeColor};">
              👉 ${config.primaryAccountLabel}
            </div>
          </div>
          <div style="margin-bottom: 10px; font-size: 0.78rem; color: #94a3b8; line-height: 1.45;">
            ${config.reason}
          </div>
          <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 6px; padding: 6px 8px; font-size: 0.76rem; color: #fca5a5;">
            🚫 <strong>DO NOT SELECT:</strong> ${config.prohibitedAccountLabel}
          </div>
        `;
      }

      accountGuidanceModal.classList.remove('hidden');

      const onProceed = () => {
        accountGuidanceModal.classList.add('hidden');
        cleanup();
        resolve(true);
      };

      const onCancel = () => {
        accountGuidanceModal.classList.add('hidden');
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        btnProceedGuidanceModal?.removeEventListener('click', onProceed);
        btnCancelGuidanceModal?.removeEventListener('click', onCancel);
      };

      btnProceedGuidanceModal?.addEventListener('click', onProceed);
      btnCancelGuidanceModal?.addEventListener('click', onCancel);
    });
  }

  // Step 1 Personal Google Account & Child Setup UI Elements
  const lblStep1AccountEmail = document.getElementById('lblStep1AccountEmail') as HTMLElement;
  const btnStep1ConnectPersonal = document.getElementById('btnStep1ConnectPersonal') as HTMLButtonElement;
  const step1ChildSetupBox = document.getElementById('step1ChildSetupBox') as HTMLElement;
  const txtStep1ChildName = document.getElementById('txtStep1ChildName') as HTMLInputElement;
  const btnStep1SaveChild = document.getElementById('btnStep1SaveChild') as HTMLButtonElement;
  const step1ChildConfirmedBadge = document.getElementById('step1ChildConfirmedBadge') as HTMLElement;
  const lblStep1ActiveChild = document.getElementById('lblStep1ActiveChild') as HTMLElement;
  const step1ConnectedActions = document.getElementById('step1ConnectedActions') as HTMLElement;
  const btnStep1SwitchAccount = document.getElementById('btnStep1SwitchAccount') as HTMLButtonElement;
  const btnStep1Continue = document.getElementById('btnStep1Continue') as HTMLButtonElement;
  const lblWhatsAppDriveAccount = document.getElementById('lblWhatsAppDriveAccount') as HTMLElement;

  async function confirmStep1ChildName() {
    clearAlerts();
    const rawName = txtStep1ChildName?.value || '';
    const cleanName = ChildManager.sanitizeName(rawName);
    if (!cleanName) {
      showError('Please enter your child\'s first name.');
      txtStep1ChildName?.focus();
      return;
    }

    try {
      const created = await ChildManager.createProfile(cleanName);
      // Backup to Drive for cross-device recovery
      try {
        const profiles = await ChildManager.getProfiles();
        await PersonalDriveService.saveProfilesToDrive(undefined, profiles);
      } catch (e) {}

      showSuccess(`🎉 Profile confirmed for "${created.name}"! You can now proceed to Step 2.`);
      await renderChildProfiles();
      await refreshBridgeStatus();
      const stateNow = await sendMessage({ type: 'GET_STATE' });
      renderState(stateNow);
    } catch (e: any) {
      showError(e.message);
    }
  }

  btnStep1SaveChild?.addEventListener('click', confirmStep1ChildName);
  txtStep1ChildName?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmStep1ChildName();
  });

  // Stepper Step Navigation Buttons
  const btnNavStep2ToStep1 = document.getElementById('btnNavStep2ToStep1') as HTMLButtonElement;
  const btnNavStep2ToStep3 = document.getElementById('btnNavStep2ToStep3') as HTMLButtonElement;
  const btnNavStep3ToStep2 = document.getElementById('btnNavStep3ToStep2') as HTMLButtonElement;
  const btnNavStep3ToStep4 = document.getElementById('btnNavStep3ToStep4') as HTMLButtonElement;
  const btnNavStep4ToStep3 = document.getElementById('btnNavStep4ToStep3') as HTMLButtonElement;
  const btnNavStep4ToStep5 = document.getElementById('btnNavStep4ToStep5') as HTMLButtonElement;
  const btnNavStep5ToStep4 = document.getElementById('btnNavStep5ToStep4') as HTMLButtonElement;

  let isPersonalAccountConnected = false;

  btnStep1ConnectPersonal?.addEventListener('click', async () => {
    clearAlerts();
    const proceed = await showAccountGuidance({
      icon: '👨‍👩‍👧',
      title: 'Step 1: Sign in with Parent Account',
      targetAccountType: 'parent',
      primaryAccountLabel: 'PARENT Personal Google Account (e.g. your Gmail)',
      prohibitedAccountLabel: 'Your child\'s school or student account',
      reason: 'This account will store your private Google Drive school archives, WhatsApp backups, OCR notes, and configs.'
    });
    if (!proceed) return;

    btnStep1ConnectPersonal.disabled = true;
    btnStep1ConnectPersonal.innerText = '⏳ Connecting Account...';
    try {
      const res = await sendMessage({ type: 'CONNECT_PERSONAL_DRIVE_ACCOUNT' });
      isPersonalAccountConnected = true;

      // Auto-restore child profiles from Personal Drive if available
      try {
        const driveProfiles = await PersonalDriveService.loadProfilesFromDrive(res.token);
        if (driveProfiles && Array.isArray(driveProfiles) && driveProfiles.length > 0) {
          await ChildManager.mergeRestoredProfiles(driveProfiles);
          appendLog(`✅ Restored ${driveProfiles.length} child profile(s) from Personal Google Drive.`);
        }
      } catch (e) {}

      showSuccess(`🎉 Personal Google Account connected: ${res.email}!`);
      await renderChildProfiles();
      await refreshBridgeStatus();
      renderState(await sendMessage({ type: 'GET_STATE' }));
    } catch (err: any) {
      showError(`Account connection cancelled or failed: ${err.message}`);
    } finally {
      btnStep1ConnectPersonal.disabled = false;
      btnStep1ConnectPersonal.innerText = '🔐 Sign in with Personal Google Account';
    }
  });

  btnStep1SwitchAccount?.addEventListener('click', async () => {
    await sendMessage({ type: 'DISCONNECT_PERSONAL_DRIVE_ACCOUNT' });
    isPersonalAccountConnected = false;
    showSuccess('Disconnected personal Google account. Please sign in to unlock functionality.');
    await refreshBridgeStatus();
    renderState(await sendMessage({ type: 'GET_STATE' }));
  });

  async function navigateToStep(stepNumber: number, customFocusId?: string) {
    clearAlerts();
    const hasChild = await ChildManager.hasConfiguredChild();
    if (stepNumber > 1 && (!isPersonalAccountConnected || !hasChild)) {
      if (!isPersonalAccountConnected) {
        showError('🔒 Please sign in with your Personal Google Account in Step 1 first.');
      } else {
        showError('👶 Please enter and confirm your Child\'s Name in Step 1 before proceeding.');
        txtStep1ChildName?.focus();
      }
      return;
    }

    const defaultFocus = customFocusId || (
      stepNumber === 1 ? 'btnStep1ConnectPersonal' :
      stepNumber === 2 ? 'btnCreateMcpServer' :
      stepNumber === 3 ? 'btnCopyUrl' :
      stepNumber === 4 ? 'btnCaptureVerifyPortal' :
      'btnCaptureActiveChat'
    );
    await sendMessage({
      type: 'UPDATE_STATE',
      payload: { wizard_current_step: stepNumber, last_focused_element_id: defaultFocus }
    });
    const newState = await sendMessage({ type: 'GET_STATE' });
    renderState(newState);
    const el = document.getElementById(defaultFocus);
    if (el && !el.classList.contains('hidden') && el.offsetParent !== null) {
      setTimeout(() => {
        try {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (e) {}
      }, 50);
    }
  }

  btnStep1Continue?.addEventListener('click', async () => {
    const hasChild = await ChildManager.hasConfiguredChild();
    if (!isPersonalAccountConnected) {
      showError('🔒 Please sign in with your Personal Google Account in Step 1 first.');
      return;
    }
    if (!hasChild) {
      showError('👶 Please enter and confirm your Child\'s Name in Step 1 before continuing.');
      txtStep1ChildName?.focus();
      return;
    }
    await navigateToStep(2);
  });

  btnNavStep2ToStep1?.addEventListener('click', () => navigateToStep(1));

  btnNavStep2ToStep3?.addEventListener('click', async () => {
    await navigateToStep(3);
  });

  btnNavStep3ToStep2?.addEventListener('click', () => navigateToStep(2));

  btnNavStep3ToStep4?.addEventListener('click', async () => {
    await navigateToStep(4);
  });

  btnNavStep4ToStep3?.addEventListener('click', () => navigateToStep(3));

  btnNavStep4ToStep5?.addEventListener('click', async () => {
    await navigateToStep(5);
  });

  btnNavStep5ToStep4?.addEventListener('click', () => navigateToStep(4));

  // Allow clicking stepper dots to navigate directly (with auth & child protection)
  for (let i = 1; i <= 5; i++) {
    const dot = document.getElementById(`dot${i}`);
    dot?.addEventListener('click', async () => {
      await navigateToStep(i);
    });
  }

  async function refreshBridgeStatus() {
    try {
      const configRes = await sendMessage({ type: 'GET_WHATSAPP_CONFIG' });
      renderTrackedChats(configRes.tracked_whatsapp_chats || []);

      const folderRes = await sendMessage({ type: 'GET_MCP_FOLDER_INFO' });
      const email = folderRes?.accountEmail || '';
      isPersonalAccountConnected = Boolean(email);

      const hasChild = await ChildManager.hasConfiguredChild();
      const activeChild = await ChildManager.getActiveProfile();
      const childSwitcherBar = document.querySelector('.child-switcher-bar') as HTMLElement;

      if (lblStep1AccountEmail) {
        if (email) {
          lblStep1AccountEmail.innerText = `🟢 ${email} (Connected & Active)`;
          btnStep1ConnectPersonal?.classList.add('hidden');

          if (!hasChild || !activeChild) {
            step1ChildSetupBox?.classList.remove('hidden');
            step1ChildConfirmedBadge?.classList.add('hidden');
            step1ConnectedActions?.classList.add('hidden');
            if (childSwitcherBar) childSwitcherBar.style.display = 'none';
          } else {
            step1ChildSetupBox?.classList.add('hidden');
            step1ChildConfirmedBadge?.classList.remove('hidden');
            if (lblStep1ActiveChild) lblStep1ActiveChild.innerText = activeChild.name;
            step1ConnectedActions?.classList.remove('hidden');
            if (childSwitcherBar) childSwitcherBar.style.display = 'flex';
          }
        } else {
          lblStep1AccountEmail.innerText = '⚪ Not connected';
          btnStep1ConnectPersonal?.classList.remove('hidden');
          step1ChildSetupBox?.classList.add('hidden');
          step1ChildConfirmedBadge?.classList.add('hidden');
          step1ConnectedActions?.classList.add('hidden');
          if (childSwitcherBar) childSwitcherBar.style.display = 'none';
        }
      }

      if (lblWhatsAppDriveAccount) {
        lblWhatsAppDriveAccount.innerText = email || 'Personal Account';
      }

      const linkOpenDriveFolder = document.getElementById('linkOpenDriveFolder') as HTMLAnchorElement;
      if (folderRes && folderRes.isCreated && folderRes.folderUrl && linkOpenDriveFolder) {
        linkOpenDriveFolder.href = folderRes.folderUrl;
        linkOpenDriveFolder.classList.remove('hidden');
      }

      const waStatus = await sendMessage({ type: 'GET_WHATSAPP_STATUS' });
      if (waConnectionStatus) {
        if (waStatus.isConnected) {
          const platformStr = (waStatus.platforms && waStatus.platforms.length > 0) ? waStatus.platforms.join(' & ') : 'Chat Web';
          waConnectionStatus.innerText = `🟢 ${platformStr} Connected (${waStatus.visibleChats?.length || 0} visible chats detected)`;
          waConnectionStatus.style.color = '#34d399';
        } else {
          waConnectionStatus.innerText = '⚪ No Chat Tabs Open (Open WhatsApp Web or Telegram Web in Chrome to sync)';
          waConnectionStatus.style.color = '#94a3b8';
        }
      }
    } catch (e) {}
  }

  refreshBridgeStatus();

  // Unified 1-Click Track & Sync Active Chat & Instant Stop Control
  const btnStopActiveSync = document.getElementById('btnStopActiveSync') as HTMLButtonElement;

  btnStopActiveSync?.addEventListener('click', async () => {
    btnStopActiveSync.disabled = true;
    btnStopActiveSync.innerText = '⏳ Stopping...';
    try {
      await sendMessage({ type: 'ABORT_ACTIVE_SYNC' });
      showSuccess('⏹️ Active sync stopped.');
      await loadWhatsAppLogs();
    } catch (e: any) {
      showError(`Stop error: ${e.message}`);
    } finally {
      btnStopActiveSync.classList.add('hidden');
      btnStopActiveSync.disabled = false;
      btnStopActiveSync.innerText = '⏹️ Stop Sync';
      if (btnCaptureActiveChat) {
        btnCaptureActiveChat.disabled = false;
        btnCaptureActiveChat.innerText = '📸 1-Click Track & Sync Active Chat / Group';
      }
    }
  });

  btnCaptureActiveChat?.addEventListener('click', async () => {
    clearAlerts();
    btnCaptureActiveChat.disabled = true;
    btnCaptureActiveChat.innerText = '⏳ Capturing & Syncing Group...';
    btnStopActiveSync?.classList.remove('hidden');

    try {
      // 0. Auto-check On-Device AI Status and log environment readiness
      await checkAiNormalizerStatus();
      if (currentAiReadiness) {
        if (currentAiReadiness.status === 'ready') {
          appendLog('✨ AI Engine: Gemini Nano (On-Device Local AI Active)');
        } else if (currentAiReadiness.status === 'outdated_chrome') {
          appendLog(`⚠️ AI Status: Chrome v${currentAiReadiness.chromeVersion} is outdated. Update at chrome://settings/help to enable Gemini Nano. Operating via Rule Engine.`);
        } else {
          appendLog('ℹ️ AI Status: Gemini Nano is disabled. Enable at chrome://flags to use local AI. Operating via Rule Engine.');
        }
      }

      // 1. Capture group metadata & ID
      const capRes = await sendMessage({ type: 'CAPTURE_ACTIVE_WHATSAPP_CHAT' });
      renderTrackedChats(capRes.trackedChats);
      appendLog(`✅ Captured chat: "${capRes.captured.title}" (${capRes.captured.platform || 'Chat'}, ID: ${capRes.captured.id})`);

      // 2. Immediately run sync with smart upward history scrolling and archive to Personal Drive
      const syncRes = await sendMessage({ type: 'SYNC_WHATSAPP_CHATS', payload: { isManualSync: true } });
      appendLog(`✅ Synced ${syncRes.messageCount || 0} messages from "${syncRes.chatName}" to Personal Google Drive.`);
      showSuccess(`🎉 Tracking & Synced "${capRes.captured.title}"! ${syncRes.messageCount || 0} messages saved to your Personal Google Drive.`);

      await refreshBridgeStatus();
      await loadWhatsAppLogs();
    } catch (err: any) {
      appendLog(`❌ Track & Sync: ${err.message}`);
      showError(err.message);
    } finally {
      btnStopActiveSync?.classList.add('hidden');
      btnCaptureActiveChat.disabled = false;
      btnCaptureActiveChat.innerText = '📸 1-Click Track & Sync Active Chat / Group';
    }
  });

  // WhatsApp Diagnostics UI Handlers
  const txtWhatsAppLogs = document.getElementById('txtWhatsAppLogs') as HTMLTextAreaElement;
  const btnFetchWhatsAppLogs = document.getElementById('btnFetchWhatsAppLogs') as HTMLButtonElement;
  const btnCopyWhatsAppLogs = document.getElementById('btnCopyWhatsAppLogs') as HTMLButtonElement;
  const btnClearWhatsAppLogs = document.getElementById('btnClearWhatsAppLogs') as HTMLButtonElement;

  async function loadWhatsAppLogs() {
    try {
      const res = await sendMessage({ type: 'GET_WHATSAPP_DIAGNOSTICS' });
      if (txtWhatsAppLogs) {
        txtWhatsAppLogs.value = res.formatted || 'No WhatsApp logs recorded yet.';
      }
    } catch (e) {}
  }

  btnFetchWhatsAppLogs?.addEventListener('click', async () => {
    btnFetchWhatsAppLogs.disabled = true;
    btnFetchWhatsAppLogs.innerText = '⏳ Fetching...';
    try {
      await loadWhatsAppLogs();
      showSuccess('Fetched latest WhatsApp diagnostics and sync logs.');
    } finally {
      btnFetchWhatsAppLogs.disabled = false;
      btnFetchWhatsAppLogs.innerText = '🔄 Refresh Logs';
    }
  });

  btnCopyWhatsAppLogs?.addEventListener('click', () => {
    if (txtWhatsAppLogs && txtWhatsAppLogs.value) {
      navigator.clipboard.writeText(txtWhatsAppLogs.value);
      showSuccess('Copied WhatsApp diagnostic report to clipboard!');
    }
  });

  btnClearWhatsAppLogs?.addEventListener('click', async () => {
    await sendMessage({ type: 'CLEAR_WHATSAPP_DIAGNOSTICS' });
    if (txtWhatsAppLogs) txtWhatsAppLogs.value = 'Logs cleared.';
    showSuccess('WhatsApp logs cleared.');
  });

  loadWhatsAppLogs();

  const btnHeaderUpdateScript = document.getElementById('btnHeaderUpdateScript') as HTMLButtonElement;

  async function checkGasServerVersionStatus() {
    try {
      const activeChild = await ChildManager.getActiveProfile();
      const outdatedList = await GasProvisionerService.getOutdatedProfiles();

      if (outdatedList.length > 0) {
        if (gasUpdateNotificationCard) {
          gasUpdateNotificationCard.classList.remove('hidden');
          if (outdatedList.length === 1) {
            if (lblGasUpdateTitle) lblGasUpdateTitle.innerText = `Apps Script Server Update Available (v${CURRENT_GAS_SERVER_VERSION})`;
            if (lblGasUpdateChangelog) lblGasUpdateChangelog.innerText = `What's new: ${CURRENT_GAS_CHANGELOG} • Target: ${outdatedList[0].profile.name}`;
            if (btnQuickUpdateGasServer) btnQuickUpdateGasServer.innerText = `🚀 1-Click Update ${outdatedList[0].profile.name}'s Server`;
          } else {
            if (lblGasUpdateTitle) lblGasUpdateTitle.innerText = `Apps Script Server Updates Available (${outdatedList.length} Children)`;
            if (lblGasUpdateChangelog) lblGasUpdateChangelog.innerText = `What's new: ${CURRENT_GAS_CHANGELOG} • Children: ${outdatedList.map(o => o.profile.name).join(', ')}`;
            if (btnQuickUpdateGasServer) btnQuickUpdateGasServer.innerText = `🚀 1-Click Update All (${outdatedList.length} Children's Servers)`;
          }
        }
        if (gasUpToDateBadge) gasUpToDateBadge.classList.add('hidden');
        if (btnHeaderUpdateScript) {
          btnHeaderUpdateScript.innerHTML = `⚡ Update (${outdatedList.length} Server${outdatedList.length > 1 ? 's' : ''})`;
          btnHeaderUpdateScript.style.background = '#4f46e5';
          btnHeaderUpdateScript.style.color = '#ffffff';
        }
        return;
      }

      // No outdated profiles found across all children
      if (gasUpdateNotificationCard) gasUpdateNotificationCard.classList.add('hidden');
      if (activeChild && (activeChild.gasDeploymentUrl || activeChild.gasScriptId)) {
        if (gasUpToDateBadge) {
          gasUpToDateBadge.classList.remove('hidden');
          if (lblGasDeployedVersion) lblGasDeployedVersion.innerText = `v${activeChild.deployedGasVersion || CURRENT_GAS_SERVER_VERSION}`;
          if (lblGasDeployedChild) lblGasDeployedChild.innerText = activeChild.name;
        }
        if (btnHeaderUpdateScript) {
          btnHeaderUpdateScript.innerHTML = `✅ v${activeChild.deployedGasVersion || CURRENT_GAS_SERVER_VERSION} Up to Date`;
          btnHeaderUpdateScript.style.background = '#064e3b';
          btnHeaderUpdateScript.style.color = '#34d399';
        }
      } else {
        if (gasUpToDateBadge) gasUpToDateBadge.classList.add('hidden');
        if (btnHeaderUpdateScript) {
          btnHeaderUpdateScript.innerHTML = '⚡ Setup Server';
          btnHeaderUpdateScript.style.background = '';
          btnHeaderUpdateScript.style.color = '';
        }
      }
    } catch (e) {}
  }

  async function executeServerUpdate() {
    if (!isPersonalAccountConnected) {
      showError('🔒 Please complete Step 1 (Sign in with Personal Google Account) first.');
      return;
    }
    clearAlerts();

    const outdatedList = await GasProvisionerService.getOutdatedProfiles();
    const activeChild = await ChildManager.getActiveProfile();
    const targets = outdatedList.length > 0 ? outdatedList.map(o => o.profile) : (activeChild ? [activeChild] : []);

    if (targets.length === 0) {
      showSuccess('All child servers are already up to date!');
      return;
    }

    if (btnQuickUpdateGasServer) {
      btnQuickUpdateGasServer.disabled = true;
      btnQuickUpdateGasServer.innerText = '⏳ Updating Apps Script Server(s)...';
    }
    if (btnHeaderUpdateScript) {
      btnHeaderUpdateScript.disabled = true;
      btnHeaderUpdateScript.innerText = '⏳ Updating...';
    }

    let successCount = 0;
    try {
      for (let i = 0; i < targets.length; i++) {
        const targetChild = targets[i];
        const stepNum = targets.length > 1 ? ` (Child ${i + 1} of ${targets.length})` : '';

        const proceed = await showAccountGuidance({
          icon: '⚡',
          title: `Update ${targetChild.name}'s Server${stepNum}`,
          targetAccountType: 'child',
          childName: targetChild.name,
          primaryAccountLabel: `${targetChild.name}'s SCHOOL Google Account`,
          prohibitedAccountLabel: 'Your Parent Personal Google Account',
          reason: `Updates the MCP Server backend code in-place inside ${targetChild.name}'s school Google account. Permanent Web App URL will remain identical.`
        });
        if (!proceed) {
          showError(`Update cancelled for ${targetChild.name}.`);
          break;
        }

        // Activate profile before provisioning
        await ChildManager.setActiveProfileId(targetChild.id);

        appendLog(`🚀 [Auto-Update] Updating Apps Script server for ${targetChild.name}...`);
        const res = await sendMessage({ type: 'AUTO_UPDATE_GAS_SCRIPT' });
        const cleanUrl = res.webAppUrl ? getCleanCanonicalUrl(res.webAppUrl) : '';
        if (res.needsAuth && cleanUrl) {
          chrome.tabs.create({ url: cleanUrl, active: true });
        }

        await ChildManager.updateProfile(targetChild.id, {
          deployedGasVersion: CURRENT_GAS_SERVER_VERSION
        });
        successCount++;
      }

      if (successCount > 0) {
        showSuccess(`🎉 Successfully updated ${successCount} server(s) to v${CURRENT_GAS_SERVER_VERSION}! (Permanent URLs preserved).`);
        const newState = await sendMessage({ type: 'GET_STATE' });
        renderState(newState);
        await renderChildProfiles();
      }
    } catch (err: any) {
      showError(`Script update failed: ${err.message}`);
    } finally {
      if (btnQuickUpdateGasServer) {
        btnQuickUpdateGasServer.disabled = false;
      }
      if (btnHeaderUpdateScript) {
        btnHeaderUpdateScript.disabled = false;
      }
      await checkGasServerVersionStatus();
    }
  }

  btnHeaderUpdateScript?.addEventListener('click', executeServerUpdate);
  btnQuickUpdateGasServer?.addEventListener('click', executeServerUpdate);

  // Global Focus Tracker: Automatically persists user focus across extension reopenings
  document.addEventListener('focusin', (e) => {
    const target = e.target as HTMLElement;
    if (target && target.id) {
      chrome.storage.local.set({ last_focused_element_id: target.id });
    }
  });

  // Load Initial State & Probe Classroom Login
  const state = await sendMessage({ type: 'GET_STATE' });
  isPersonalAccountConnected = Boolean(state?.personal_drive_connected || state?.personal_drive_account_email);
  await refreshBridgeStatus();
  renderState(state);
  checkClassroomLogin();

  // Restore focus and position when reopening extension popup
  const focusId = state?.last_focused_element_id || (state?.wizard_current_step === 4 ? 'btnCaptureVerifyPortal' : undefined);
  if (focusId) {
    const el = document.getElementById(focusId);
    if (el && !el.classList.contains('hidden') && el.offsetParent !== null) {
      setTimeout(() => {
        try {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (e) {}
      }, 50);
    }
  }

  btnOpenClassroom?.addEventListener('click', async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.id) {
      await chrome.tabs.update(activeTab.id, { url: 'https://classroom.google.com' });
    } else {
      await chrome.tabs.create({ url: 'https://classroom.google.com' });
    }
    showSuccess('Navigating current tab to Google Classroom... Please sign into your student account.');
  });

  btnCreateMcpServer?.addEventListener('click', async () => {
    clearAlerts();
    const activeChild = await ChildManager.getActiveProfile();
    const childName = activeChild?.name || 'Your Child';

    const proceed = await showAccountGuidance({
      icon: '🎓',
      title: `Step 2: Connect ${childName}'s School Account`,
      targetAccountType: 'child',
      childName: childName,
      primaryAccountLabel: `${childName}'s SCHOOL / Google Classroom Account`,
      prohibitedAccountLabel: 'Your Parent Personal Google Account',
      reason: `This allows the AI to access ${childName}'s Google Classroom coursework, timetables, and teacher announcements.`
    });
    if (!proceed) return;

    btnCreateMcpServer.disabled = true;
    btnCreateMcpServer.innerText = '🔐 Opening Google Authorization...';

    try {
      // Step 1: Open Google Authorization screen popup
      const authRes = await sendMessage({ type: 'REQUEST_INTERACTIVE_OAUTH' });
      if (!authRes || !authRes.token) {
        throw new Error('Google Authorization was not completed. Please allow access to proceed.');
      }

      btnCreateMcpServer.innerText = '⏳ Provisioning & Deploying Server in your Google Account...';
      const res = await sendMessage({ type: 'AUTO_PROVISION_GAS_WORKSPACE' });
      
      if (res.isReused) {
        showSuccess(`🎉 Found existing MCP Server project in your Google Account! Updated backend code to latest version without creating duplicates (${res.verifiedTools ? res.verifiedTools.length : 6} active tools).`);
      } else {
        showSuccess(`🎉 Personal MCP Server Created & Deployed! Active with ${res.verifiedTools ? res.verifiedTools.length : 6} tools (Classroom, Drive, Calendar, WhatsApp, Portal).`);
      }
      renderState(await sendMessage({ type: 'GET_STATE' }));
    } catch (err: any) {
      showError(`Server Setup Error: ${err.message}`, {
        domain: 'gas-backend',
        feature: 'auto-provisioning',
        errorName: 'AutoProvisionException',
        errorMessage: err.message,
        stackTrace: err.stack
      });
    } finally {
      btnCreateMcpServer.disabled = false;
      btnCreateMcpServer.innerText = '⚡ 3. Create My Personal MCP Server';
    }
  });

  btnVerifyStep1?.addEventListener('click', async () => {
    clearAlerts();
    const gasUrl = gasUrlInput.value.trim();

    if (!gasUrl) {
      showError('Please paste your verified Web App URL.');
      return;
    }

    try {
      const res = await sendMessage({ type: 'VERIFY_WORKSPACE_URL', payload: { mcp_gas_url: gasUrl } });
      showSuccess(`Connected & Verified! Server is active with ${res.tools.length} default tools.`);
      const newState = await sendMessage({ type: 'GET_STATE' });
      renderState(newState);
    } catch (err: any) {
      if (err.message && (err.message.includes('Permission Required') || err.message.includes('Authorization') || err.message.includes('permission tab') || err.message.includes('401') || err.message.includes('403'))) {
        const activeChild = await ChildManager.getActiveProfile();
        const childName = activeChild?.name || 'Your Child';
        const proceed = await showAccountGuidance({
          icon: '🔐',
          title: `Authorize ${childName}'s School Account`,
          targetAccountType: 'child',
          childName: childName,
          primaryAccountLabel: `${childName}'s SCHOOL Google Account`,
          prohibitedAccountLabel: 'Your Parent Personal Google Account',
          reason: `Google requires a one-time permissions approval to allow the MCP Server to read ${childName}'s Google Classroom coursework, timetables, and teacher announcements.`
        });
        if (!proceed) return;

        await openGoogleAuthScreenDirectly(gasUrl);
        showSuccess('🚀 Direct Authorization: Opening Google Authorization tab directly in your browser. Please click "Review Permissions -> Allow", then return to verify!');
      } else {
        showError(`Workspace verification failed: ${err.message}`, {
          domain: 'gas-backend',
          feature: 'workspace-verification',
          errorName: 'WorkspaceConnectionException',
          errorMessage: err.message,
          stackTrace: err.stack
        });
      }
    }
  });

  function getCleanCanonicalUrl(rawUrl: string): string {
    if (!rawUrl) return '';
    return rawUrl
      .replace(/\/macros\/u\/\d+\/s\//g, '/macros/s/')
      .replace(/\/u\/\d+\//g, '/');
  }

  const btnCopyUrlStep3 = document.getElementById('btnCopyUrlStep3');

  if (btnCopyUrl) {
    btnCopyUrl.addEventListener('click', () => {
      if (mcpUrlDisplay && mcpUrlDisplay.value) {
        const clean = getCleanCanonicalUrl(mcpUrlDisplay.value);
        navigator.clipboard.writeText(clean);
        showSuccess('Server Web App URL copied to clipboard!');
      }
    });
  }

  if (btnCopyUrlStep3) {
    btnCopyUrlStep3.addEventListener('click', () => {
      const step3UrlEl = document.getElementById('step3McpUrlDisplay') as HTMLInputElement;
      const targetVal = (step3McpUrlDisplay && step3McpUrlDisplay.value) || (step3UrlEl && step3UrlEl.value) || '';
      if (targetVal) {
        const clean = getCleanCanonicalUrl(targetVal);
        navigator.clipboard.writeText(clean);
        showSuccess('Server Web App URL copied to clipboard!');
      }
    });
  }

  async function getDynamicAppName(): Promise<string> {
    try {
      const activeChild = await ChildManager.getActiveProfile();
      if (activeChild && activeChild.name) {
        return `School Portal MCP Server - ${activeChild.name}`;
      }
    } catch (e) {}
    return 'School Portal MCP Server';
  }

  async function updateStep3DynamicNotice() {
    const dynamicAppName = await getDynamicAppName();
    const lblDynamicAppName = document.getElementById('lblDynamicAppName');
    if (lblDynamicAppName) {
      lblDynamicAppName.textContent = dynamicAppName;
    }
    const scheduleBox = document.getElementById('schedulePromptBox');
    if (scheduleBox) {
      scheduleBox.textContent = `"Using the 'Parent School Intelligence Dashboard' skill and all available tools from ${dynamicAppName}, run this task on an hourly schedule every 1 hour to automatically sync latest school updates, update my Google Sheet, and refresh the live HTML dashboard in-place."`;
    }
  }

  const downloadSkillHandler = async () => {
    const dynamicAppName = await getDynamicAppName();
    const skillMarkdownContent = `---
name: parent-school-dashboard
description: Executive school assistant for parents. Fetches school portal and Google Workspace data via ${dynamicAppName}, tracks tasks in a single Google Sheet, and renders a live interactive HTML5 Canvas dashboard.
tools:
  - ${dynamicAppName}
---

# Parent School Intelligence Dashboard

## Role & Purpose
You are a Parent Executive School Assistant responsible for tracking student school progress across connected platforms.

## Execution Rules
1. **Tool Invocation**: You have access to all tools provided by \`${dynamicAppName}\`. Ensure the **"Select All"** checkbox is enabled in Gemini Spark when connecting the MCP Server. Call \`get_all_school_updates\` from \`${dynamicAppName}\` to fetch all student updates at once across Classroom, Drive, Calendar, WhatsApp, & Portals, or invoke specific tools as needed:
   - \`get_all_school_updates\`: Unified master multi-source fetch.
   - \`get_classroom_assignments\`: Google Classroom assignments, coursework & deadlines.
   - \`get_student_timetable\`: Daily and weekly period timetables.
   - \`get_teacher_announcements\`: Official teacher updates and notices.
   - \`get_google_calendar_events\`: School calendar events, exams & holidays.
   - \`search_google_drive\`: Full-text search and OCR extraction of school documents.
   - \`get_school_portal_notifications\`: School LMS / portal notifications.
   - \`get_whatsapp_school_updates\`: School parent WhatsApp/Telegram chat updates.
   - \`query_whatsapp_history\`: Deep search across all historical WhatsApp messages & homework archives.
2. **WhatsApp Class Announcements & Daily Homework**: Teachers frequently broadcast daily homework, submissions, and tasks directly in class WhatsApp groups (e.g. ICT homework, Science practice sheets, Hindi reading, Math tasks). When asked about today's homework, homework assigned, or daily updates, ALWAYS examine \`whatsapp_school_notices\` (especially items with \`category: "HOMEWORK_OR_TASK_ANNOUNCEMENT"\`) alongside Google Classroom and include them in your homework summary!
3. **Drive & Document Reading**: All attached PDFs, competition results, dialogues, and worksheet files have their full text extracted by the MCP Server under \`extracted_content_summary\` (in Classroom posts) and \`extracted_drive_attachments\` (in Gmail circulars). **Do NOT say you cannot read Google Drive links.** Read the text from \`extracted_content_summary\` and \`extracted_drive_attachments\` directly in the tool response to display competition winners, dialogues, and scores!
4. **Single Sheet Persistence**: Use strictly a single Google Sheet to store, retrieve, and update task progress (do not create multiple sheets).
5. **Interactive Visual Artifact Rendering**: Render this as a live, interactive UI Web Component / Artifact in Canvas preview. **Do NOT output raw HTML code text or markdown code blocks into the chat bubble.** Render the interactive visual dashboard view.
6. **Dashboard Layout**:
   - 🚨 **URGENT & OVERDUE**: Any task not marked completed past its due date marked as 🔴 **OVERDUE**, urgent circulars, fee deadlines.
   - 🟡 **HIGH PRIORITY**: Any pending homework, project, or task with a due date of 3 days or less.
   - 📅 **TODAY'S DAILY OVERVIEW**: Today's applicable timetable & periods, assigned homework (combining WhatsApp & Google Classroom), classwork covered, attendance.
   - 📆 **WEEKLY & MONTHLY OUTLOOK**: Weekly project submissions & homework load; Monthly upcoming exams, unit tests, holidays.
7. **Interactive Checklists**: Include clickable checkboxes (✅ Completed, ⏳ In Progress, 🔴 Overdue, 🟡 Due in ≤ 3 days) that persist status updates back into the single Google Sheet.
8. **In-Place Refresh**: When triggered on schedule, update the existing visual dashboard and Google Sheet in-place. Do not generate new or duplicate files.
`;

    const blob = new Blob([skillMarkdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SKILL.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccess('SKILL.md downloaded! Upload it at gemini.google.com/spark/skills');
  };

  const btnDownloadSkill = document.getElementById('btnDownloadSkill');
  if (btnDownloadSkill) btnDownloadSkill.addEventListener('click', downloadSkillHandler);

  const btnCopySchedulePrompt = document.getElementById('btnCopySchedulePrompt');
  const schedulePromptBox = document.getElementById('schedulePromptBox');

  const copySchedulePromptHandler = async () => {
    const dynamicAppName = await getDynamicAppName();
    const promptText = `Using the 'Parent School Intelligence Dashboard' skill and all available tools from ${dynamicAppName}, run this task on an hourly schedule every 1 hour to automatically sync latest school updates, update my Google Sheet, and refresh the live HTML dashboard in-place.`;
    navigator.clipboard.writeText(promptText);
    showSuccess('Schedule prompt copied to clipboard!');
  };

  if (btnCopySchedulePrompt) btnCopySchedulePrompt.addEventListener('click', copySchedulePromptHandler);
  if (schedulePromptBox) schedulePromptBox.addEventListener('click', copySchedulePromptHandler);

  async function executePortalVerification() {
    clearAlerts();
    appendLog('🚀 [Step 4] Initiating Portal Connection Verification...');
    btnCaptureVerifyPortal.disabled = true;
    btnCaptureVerifyPortal.innerText = '⏳ Verifying Active Tab Connection...';
    if (connectionStatusBox) connectionStatusBox.classList.remove('hidden');
    if (connectionStatusIcon) connectionStatusIcon.innerText = '⏳';
    if (connectionStatusText) connectionStatusText.innerText = 'Querying currently active browser tab...';

    try {
      // 1. First try active tab in focused/current window
      let tab: chrome.tabs.Tab | undefined;
      const focusedTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      tab = focusedTabs.find(t => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('edge://') && !t.url.startsWith('about:'));
      
      // 2. If not found, try all active tabs
      if (!tab) {
        const activeTabs = await chrome.tabs.query({ active: true });
        tab = activeTabs.find(t => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('edge://') && !t.url.startsWith('about:'));
      }

      // 3. Fallback: Find any open school or web tab across all windows
      if (!tab) {
        const allTabs = await chrome.tabs.query({});
        const webTabs = allTabs.filter(t => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('edge://') && !t.url.startsWith('about:'));
        tab = webTabs.find(t => t.url && (t.url.includes('edusprint') || t.url.includes('school') || t.url.includes('canvas') || t.url.includes('moodle') || t.url.includes('portal'))) || webTabs[webTabs.length - 1];
      }

      if (!tab || !tab.url) {
        throw new Error('Please open your school website (e.g. edusprint.in, canvas, moodle) in an active browser tab first.');
      }

      appendLog(`🔎 Detected active web tab: "${tab.title || 'Tab'}" (${tab.url})`);

      const urlObj = new URL(tab.url);
      const domain = urlObj.hostname;

      if (connectionStatusText) connectionStatusText.innerText = `Reading active session cookies for ${domain}...`;
      appendLog(`🍪 Extracting session cookies for ${domain}...`);
      const cookies = await getCookiesForDomain(domain, tab.url);

      // Extract DOM HTML snippet from active tab
      let pageData = '';
      if (tab.id) {
        try {
          const res = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body ? document.body.innerText.substring(0, 1000) : ''
          });
          if (res && res[0] && res[0].result) {
            pageData = res[0].result;
          }
        } catch (e) {
          // Fallback DOM snippet
        }
      }

      if (connectionStatusText) connectionStatusText.innerText = `Contacting Apps Script proxy to verify active session for ${domain}...`;
      appendLog(`📡 Verifying connection with MCP server backend for ${domain}...`);

      const res = await sendMessage({
        type: 'VERIFY_AND_ADD_PORTAL_CONNECTION',
        payload: { url: tab.url, domain, cookies, pageData }
      });

      if (res.success) {
        appendLog(`✅ Portal connection verified successfully for ${domain}!`);
        showSuccess(`✅ Connection Verified for ${domain}! Unlocking Feature Tool Registration...`);
        if (connectionStatusIcon) connectionStatusIcon.innerText = '✅';
        if (connectionStatusText) connectionStatusText.innerText = `✅ Bi-directional active tab connection verified for ${domain}!`;
        if (featureSection) featureSection.classList.remove('hidden');
        renderState(await sendMessage({ type: 'GET_STATE' }));
      } else {
        throw new Error(res.message || 'Bi-directional portal connection verification failed.');
      }
    } catch (err: any) {
      appendLog(`❌ Portal Verification Error: ${err.message}`);
      if (connectionStatusIcon) connectionStatusIcon.innerText = '❌';
      if (connectionStatusText) connectionStatusText.innerText = `❌ ${err.message}`;
      showError(`Connection Verification Error: ${err.message}`, {
        domain: 'portal',
        feature: 'connection-verify',
        errorName: 'PortalConnectionException',
        errorMessage: err.message,
        stackTrace: err.stack
      });
    } finally {
      btnCaptureVerifyPortal.disabled = false;
      btnCaptureVerifyPortal.innerText = '🚀 1. Capture & Verify Portal Connection';
    }
  }

  // Click & Keyboard Enter/Space Listeners for Portal Verification
  btnCaptureVerifyPortal.addEventListener('click', executePortalVerification);
  btnCaptureVerifyPortal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      executePortalVerification();
    }
  });

  function detectFeatureName(url: string, title: string, heading: string, activeNav: string, bodySnippet: string): string {
    const lowerUrl = url.toLowerCase();
    const lowerHeading = heading.toLowerCase();
    const lowerNav = activeNav.toLowerCase();
    const lowerTitle = title.toLowerCase();
    const lowerBody = bodySnippet.substring(0, 800).toLowerCase();

    // 1. Check Active SPA Menu/Nav Tab FIRST (Crucial for Single Page Apps like EduSprint!)
    if (lowerNav.includes('classwork') || lowerNav.includes('class work')) return 'Classwork';
    if (lowerNav.includes('homework') || lowerNav.includes('home work') || lowerNav.includes('assignment')) return 'Homework';
    if (lowerNav.includes('attendance') || lowerNav.includes('present')) return 'Attendance';
    if (lowerNav.includes('grade') || lowerNav.includes('marks') || lowerNav.includes('reportcard') || lowerNav.includes('result')) return 'Gradebook';
    if (lowerNav.includes('timetable') || lowerNav.includes('schedule') || lowerNav.includes('routine')) return 'Timetable';
    if (lowerNav.includes('circular') || lowerNav.includes('notice') || lowerNav.includes('announcement')) return 'Circulars';

    // 2. Check Active Page Main Heading / Breadcrumb SECOND
    if (lowerHeading.includes('classwork') || lowerHeading.includes('class work')) return 'Classwork';
    if (lowerHeading.includes('homework') || lowerHeading.includes('home work') || lowerHeading.includes('assignment')) return 'Homework';
    if (lowerHeading.includes('attendance')) return 'Attendance';
    if (lowerHeading.includes('grade') || lowerHeading.includes('marks')) return 'Gradebook';
    if (lowerHeading.includes('timetable')) return 'Timetable';

    // 3. Check Active Tab URL Path THIRD
    if (lowerUrl.includes('classwork') || lowerUrl.includes('class_work') || lowerUrl.includes('class-work')) return 'Classwork';
    if (lowerUrl.includes('homework') || lowerUrl.includes('home_work') || lowerUrl.includes('home-work') || lowerUrl.includes('assignment')) return 'Homework';
    if (lowerUrl.includes('attendance') || lowerUrl.includes('present')) return 'Attendance';
    if (lowerUrl.includes('grade') || lowerUrl.includes('marks') || lowerUrl.includes('reportcard') || lowerUrl.includes('result')) return 'Gradebook';
    if (lowerUrl.includes('timetable') || lowerUrl.includes('schedule') || lowerUrl.includes('routine')) return 'Timetable';

    if (heading && heading.length > 2 && heading.length < 30) {
      return heading;
    }

    // 4. Check Page Title FOURTH
    if (lowerTitle.includes('classwork')) return 'Classwork';
    if (lowerTitle.includes('homework')) return 'Homework';
    if (lowerTitle.includes('attendance')) return 'Attendance';

    // 5. Check Body Text snippet LAST (Fallback - compare occurrences if SPA)
    const classworkCount = (lowerBody.match(/classwork|class work/g) || []).length;
    const homeworkCount = (lowerBody.match(/homework|home work/g) || []).length;
    const attendanceCount = (lowerBody.match(/attendance|present|absent/g) || []).length;

    if (classworkCount > homeworkCount && classworkCount > attendanceCount) return 'Classwork';
    if (homeworkCount > classworkCount && homeworkCount > attendanceCount) return 'Homework';
    if (attendanceCount > 0 && attendanceCount > homeworkCount) return 'Attendance';

    if (title && !title.toLowerCase().includes('http')) {
      const firstPart = title.split('-')[0].split('|')[0].trim();
      if (firstPart.length > 2 && firstPart.length < 30) return firstPart;
    }
    return 'School Feature';
  }

  async function executeFeatureRegistration() {
    clearAlerts();
    btnRegisterFeature.disabled = true;
    btnRegisterFeature.innerText = '⏳ Auto-Capturing & Testing Active Feature...';

    try {
      // 1. Query active tab
      let activeTab: chrome.tabs.Tab | null = null;
      let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tabs || tabs.length === 0) {
        tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      }
      if (tabs && tabs[0]) {
        activeTab = tabs[0];
      }

      if (!activeTab || !activeTab.id || !activeTab.url || activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://')) {
        throw new Error('Please open your school portal tab (e.g. EduSprint) in Chrome before clicking Capture.');
      }

      // 2. Extract active SPA menu tab, breadcrumbs, headings, and Universal Deep DOM structure
      const domResult = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: async () => {
          const summary: string[] = [];

          // Helper to format structured tables into clean Markdown
          const parseTables = () => {
            const tableSnapshots: string[] = [];
            document.querySelectorAll('table').forEach((tbl, idx) => {
              const rows: string[] = [];
              const headers: string[] = [];
              tbl.querySelectorAll('thead th, thead td, tr:first-child th').forEach(th => {
                const t = th.textContent?.trim();
                if (t) headers.push(t);
              });
              if (headers.length > 0) {
                rows.push(`| ${headers.join(' | ')} |`);
                rows.push(`| ${headers.map(() => '---').join(' | ')} |`);
              }
              tbl.querySelectorAll('tbody tr, tr').forEach(tr => {
                const cells: string[] = [];
                tr.querySelectorAll('td, th').forEach(td => {
                  const txt = td.textContent?.trim().replace(/\s+/g, ' ') || '';
                  if (txt) cells.push(txt);
                });
                if (cells.length > 0) {
                  rows.push(`| ${cells.join(' | ')} |`);
                }
              });
              if (rows.length > 0) {
                tableSnapshots.push(`📊 [Table ${idx + 1}]:\n${rows.join('\n')}`);
              }
            });
            return tableSnapshots;
          };

          // Helper to extract marked calendar/timeline data
          const scrapeCalendar = (w: Element) => {
            const heading = w.querySelector('h1, h2, h3, h4, .card-title, .fc-toolbar-title, .fc-header-title, strong');
            const hText = heading ? heading.textContent?.trim() : '';
            const monthHeader = w.querySelector('.fc-center, .fc-toolbar, .fc-header, .fc-toolbar-title, h2');
            const mText = monthHeader ? monthHeader.textContent?.trim() : '';

            const markedDates: string[] = [];
            w.querySelectorAll('td').forEach(td => {
              const text = td.textContent?.trim() || '';
              const date = td.getAttribute('data-date') || text;
              const hasBadge = td.querySelector('.fc-event, .badge, [class*="present"], [class*="success"], circle, [style*="green"], [style*="#"], [class*="circle"]') || 
                               td.className.includes('has-event') || td.className.includes('present') || td.className.includes('fc-today');
              if (hasBadge && text) {
                markedDates.push(`${date} (Present)`);
              }
            });

            const details: string[] = [];
            w.querySelectorAll('.fc-event, .fc-day-grid-event, .badge').forEach(ev => {
              const t = ev.textContent?.trim();
              if (t && !details.includes(t)) details.push(t);
            });

            if (mText || markedDates.length > 0 || details.length > 0) {
              return `📅 [${hText || 'Calendar'} - ${mText}]: Marked Items: [${markedDates.join(', ') || details.join(', ')}]`;
            }
            return null;
          };

          // 2. PARSE CURRENT STRUCTURED TABLES
          const initialTables = parseTables();
          if (initialTables.length > 0) {
            summary.push(...initialTables);
          }

          // 3. AUTO-PAGINATION: Traverse pagination controls (Page 2, 3, Next, etc.) if data is paginated
          try {
            const paginator = document.querySelector('.pagination, .paginate, .dataTables_paginate, .k-pager-wrap, [class*="pagination"], [class*="pager"]');
            if (paginator) {
              let pageStep = 0;
              while (pageStep < 8) {
                const nextBtn = paginator.querySelector(
                  'a.next:not(.disabled):not([disabled]), ' +
                  '.paginate_button.next:not(.disabled), ' +
                  'li.next:not(.disabled) a, ' +
                  'a[rel="next"], ' +
                  'button[class*="next"]:not([disabled])'
                ) as HTMLElement;
                if (!nextBtn || nextBtn.classList.contains('disabled')) break;
                nextBtn.click();
                await new Promise(r => setTimeout(r, 150));
                const nextTables = parseTables();
                nextTables.forEach(t => {
                  if (!summary.includes(t)) summary.push(t);
                });
                pageStep++;
              }
            }
          } catch (e) {}

          // 4. TIMELINE / CALENDAR MULTI-VIEW TRAVERSAL
          const calWidgets = document.querySelectorAll('.fc, .calendar, [class*="Calendar"], [class*="calendar"], .card, .widget, .col-md-4, .col-sm-4');
          for (const w of Array.from(calWidgets)) {
            const firstMonth = scrapeCalendar(w);
            if (firstMonth && !summary.includes(firstMonth)) summary.push(firstMonth);

            const prevBtn = (w.querySelector('.fc-prev-button, .fc-button-prev, button[class*="prev"], .fc-icon-left-single-arrow') as HTMLElement)?.closest('button') || 
                            (w.querySelector('.fc-prev-button, .fc-button-prev, button[class*="prev"]') as HTMLElement);
            const todayBtn = (w.querySelector('.fc-today-button, .fc-button-today, button[class*="today"]') as HTMLElement)?.closest('button') || 
                             (w.querySelector('.fc-today-button, .fc-button-today, button[class*="today"]') as HTMLElement);

            if (prevBtn) {
              for (let step = 0; step < 5; step++) {
                prevBtn.click();
                await new Promise(resolve => setTimeout(resolve, 80));
                const monthScraped = scrapeCalendar(w);
                if (monthScraped && !summary.includes(monthScraped)) {
                  summary.push(monthScraped);
                }
              }
              if (todayBtn) {
                todayBtn.click();
                await new Promise(resolve => setTimeout(resolve, 60));
              }
            }
          }

          // 5. EXTRACT FULL VISIBLE BODY TEXT & STUDENT CONTEXT
          const bodyText = document.body ? document.body.innerText : '';
          summary.push(bodyText);

          // Query active SPA tab / menu element
          const activeNavEl = document.querySelector('.active, .selected, .current, li.active, .nav-tabs .active, .breadcrumb .active, .menu-item.active, [aria-selected="true"]');
          const activeNavText = activeNavEl ? activeNavEl.textContent || '' : '';

          // Query page heading / section title
          const h1El = document.querySelector('h1, h2, h3, .header, .title, .page-title, #page-title, .module-title, .section-title, .card-title');
          const h1Text = h1El ? h1El.textContent || '' : '';

          return {
            title: document.title || '',
            activeNavText: activeNavText.trim(),
            h1Text: h1Text.trim(),
            bodyTextSnippet: summary.join('\n\n').substring(0, 18000)
          };
        }
      });

      const extracted = (domResult && domResult[0] && domResult[0].result) ? domResult[0].result : { title: activeTab.title || '', activeNavText: '', h1Text: '', bodyTextSnippet: '' };
      
      // 3. Auto-detect Feature Name from active tab SPA elements
      const targetFeature = detectFeatureName(activeTab.url, extracted.title, extracted.h1Text, extracted.activeNavText, extracted.bodyTextSnippet);

      let domain = '';
      try {
        domain = new URL(activeTab.url).hostname;
      } catch (e) {}

      // 4. Send REGISTER_FEATURE_TOOL to service worker to run multi-strategy candidate verification & match page data
      const res = await sendMessage({
        type: 'REGISTER_FEATURE_TOOL',
        payload: {
          domain,
          feature: targetFeature,
          endpointUrl: activeTab.url,
          pageData: extracted.bodyTextSnippet,
          pageTitle: extracted.title
        }
      });

      if (res.success) {
        if (res.isUpdate) {
          showSuccess(`🎉 Refreshed & verified feature '${res.feature}'! Updated active session data in-place (No duplicates created).`);
        } else {
          showSuccess(`🎉 Successfully captured & verified feature '${res.feature}'! Registered as active MCP tool (Method: ${res.winningStrategy}).`);
        }
        renderState(await sendMessage({ type: 'GET_STATE' }));
      }
    } catch (err: any) {
      showError(`Feature Registration Error: ${err.message}`, {
        domain: 'school-portal',
        feature: 'capture-active-feature',
        errorName: 'FeatureRegistrationException',
        errorMessage: err.message,
        stackTrace: err.stack
      });
    } finally {
      btnRegisterFeature.disabled = false;
      btnRegisterFeature.innerText = '📸 2. Auto-Capture & Register Active Feature';
    }
  }

  btnRegisterFeature?.addEventListener('click', executeFeatureRegistration);
  btnRegisterFeature?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      executeFeatureRegistration();
    }
  });

  btnAddAnotherPlatform?.addEventListener('click', async () => {
    await sendMessage({ type: 'UPDATE_STATE', payload: { wizard_current_step: 4, portal_connection_verified: false } });
    if (featureSection) featureSection.classList.add('hidden');
    renderState(await sendMessage({ type: 'GET_STATE' }));
  });

  btnSendReport?.addEventListener('click', async () => {
    if (!lastErrorContext) return;
    try {
      const res = await sendMessage({ type: 'SEND_DIAGNOSTIC_REPORT', payload: lastErrorContext });
      showSuccess(`Diagnostic report sent to developer! Fingerprint: ${res.fingerprint}`);
      errorReportBanner.classList.add('hidden');
    } catch (err: any) {
      showError(`Failed to send report: ${err.message}`);
    }
  });

  async function detectSchoolAccountParam(): Promise<string> {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.url && tab.url.includes('classroom.google.com')) {
          const match = tab.url.match(/\/u\/(\d+)\//);
          if (match && match[1]) {
            return `?authuser=${match[1]}`;
          }
        }
      }
    }
    return '';
  }

  async function checkClassroomLogin() {
    if (typeof chrome !== 'undefined' && chrome.cookies) {
      try {
        const cookies = await chrome.cookies.getAll({ domain: 'google.com' });
        const hasAuth = cookies.some(c => c.name === 'SID' || c.name === 'HSID' || c.name === 'SSID');
        if (hasAuth && btnCreateMcpServer) {
          btnCreateMcpServer.classList.remove('hidden');
        }
      } catch (e) {}
    }
  }

  async function renderState(s: any) {
    const hasChild = await ChildManager.hasConfiguredChild();
    let step = s.wizard_current_step || 1;
    if (!isPersonalAccountConnected || !hasChild) {
      step = 1;
    }
    if (step > 5) step = 5;
    if (step < 1) step = 1;

    stepBadge.innerText = `Step ${step} of 5`;

    await updateStepperDots(step);

    cardStep1.classList.toggle('hidden', step !== 1);
    cardStep2.classList.toggle('hidden', step !== 2);
    cardStep3.classList.toggle('hidden', step !== 3);
    cardStep4.classList.toggle('hidden', step !== 4);
    if (cardStep5) cardStep5.classList.toggle('hidden', step !== 5);
    if (step === 3) {
      await updateStep3DynamicNotice();
    }

    if (step === 4) {
      featureSection.classList.toggle('hidden', !s.portal_connection_verified);
      const activeFeaturesBox = document.getElementById('activeFeaturesBox') as HTMLElement;
      const step3ToolsList = document.getElementById('step3RegisteredToolsList') as HTMLUListElement;

      if (s.mcp_registered_tools && s.mcp_registered_tools.length > 0) {
        if (activeFeaturesBox) activeFeaturesBox.classList.remove('hidden');
        if (step3ToolsList) {
          step3ToolsList.innerHTML = '';
          s.mcp_registered_tools.forEach((t: any) => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            li.style.padding = '6px 10px';
            li.style.marginBottom = '4px';
            li.style.backgroundColor = '#1e293b';
            li.style.borderRadius = '6px';
            li.style.fontSize = '0.8rem';
            
            li.innerHTML = `<span>📌 <strong>${t.feature}</strong> <span style="color:var(--text-secondary); font-size:0.75rem;">(${t.domain})</span></span>`;
            
            const actionsDiv = document.createElement('div');
            actionsDiv.style.display = 'flex';
            actionsDiv.style.gap = '4px';

            const btnRename = document.createElement('button');
            btnRename.className = 'btn btn-secondary btn-sm';
            btnRename.style.padding = '2px 8px';
            btnRename.style.fontSize = '0.7rem';
            btnRename.innerText = '✏️ Rename';
            btnRename.addEventListener('click', () => {
              const newName = prompt(`Enter custom feature name for '${t.feature}' (e.g. Classwork, Homework, Attendance):`, t.feature);
              if (newName && newName.trim() && newName.trim() !== t.feature) {
                clearAlerts();
                sendMessage({ type: 'RENAME_FEATURE_TOOL', payload: { domain: t.domain, oldFeature: t.feature, newFeature: newName.trim() } })
                  .then(async () => {
                    showSuccess(`🎉 Renamed feature to '${newName.trim()}'!`);
                    renderState(await sendMessage({ type: 'GET_STATE' }));
                  })
                  .catch((err: any) => {
                    showError(`Failed to rename feature: ${err.message}`);
                  });
              }
            });

            const btnDel = document.createElement('button');
            btnDel.className = 'btn btn-danger btn-sm';
            btnDel.style.padding = '2px 8px';
            btnDel.style.fontSize = '0.7rem';
            btnDel.innerText = '🗑️ Remove';
            btnDel.addEventListener('click', async () => {
              clearAlerts();
              btnDel.disabled = true;
              btnDel.innerText = '⏳ Removing...';
              try {
                await sendMessage({ type: 'DELETE_FEATURE_TOOL', payload: { domain: t.domain, feature: t.feature } });
                showSuccess(`Removed feature '${t.feature}' from tracked list.`);
                renderState(await sendMessage({ type: 'GET_STATE' }));
              } catch (err: any) {
                showError(`Failed to remove feature: ${err.message}`);
              }
            });

            actionsDiv.appendChild(btnRename);
            actionsDiv.appendChild(btnDel);
            li.appendChild(actionsDiv);
            step3ToolsList.appendChild(li);
          });
        }
      } else {
        if (activeFeaturesBox) activeFeaturesBox.classList.add('hidden');
      }
    }

    if (step === 5) {
      refreshBridgeStatus();
      loadWhatsAppLogs();
    }

    if (s.mcp_gas_url) {
      const cleanUrl = getCleanCanonicalUrl(s.mcp_gas_url);
      if (gasUrlInput) gasUrlInput.value = cleanUrl;
      if (mcpUrlDisplay) mcpUrlDisplay.value = cleanUrl;
      const step3UrlEl = document.getElementById('step3McpUrlDisplay') as HTMLInputElement;
      if (step3UrlEl) step3UrlEl.value = cleanUrl;
      if (step3McpUrlDisplay) step3McpUrlDisplay.value = cleanUrl;
    }

    const btnOpenGasProject = document.getElementById('btnOpenGasProject') as HTMLAnchorElement;
    if (btnOpenGasProject && s.mcp_gas_script_id) {
      btnOpenGasProject.href = `https://script.google.com/home/projects/${s.mcp_gas_script_id}`;
    }

    await checkGasServerVersionStatus();
  }

  async function updateStepperDots(currentStep: number) {
    const hasChild = await ChildManager.hasConfiguredChild();
    const isUnlocked = isPersonalAccountConnected && hasChild;

    for (let i = 1; i <= 5; i++) {
      const dot = document.getElementById(`dot${i}`);
      const line = document.getElementById(`line${i}`);
      if (dot) {
        dot.classList.toggle('active', i === currentStep);
        dot.classList.toggle('completed', i < currentStep);
        if (i > 1 && !isUnlocked) {
          dot.style.opacity = '0.35';
          dot.style.cursor = 'not-allowed';
          dot.title = !isPersonalAccountConnected
            ? '🔒 Locked: Sign in with Personal Google Account in Step 1 first'
            : '👶 Locked: Enter Child Name in Step 1 first';
        } else {
          dot.style.opacity = '1';
          dot.style.cursor = 'pointer';
          dot.title = `Step ${i}`;
        }
      }
      if (line) {
        line.classList.toggle('completed', i < currentStep);
        if (!isUnlocked) {
          line.style.opacity = '0.35';
        } else {
          line.style.opacity = '1';
        }
      }
    }
  }

  function showSuccess(msg: string) {
    statusAlert.className = 'alert alert-success';
    statusAlert.innerText = msg;
    statusAlert.classList.remove('hidden');
  }

  function showError(msg: string, telemetryCtx?: any) {
    statusAlert.className = 'alert alert-error';
    statusAlert.innerText = msg;
    statusAlert.classList.remove('hidden');

    if (telemetryCtx) {
      lastErrorContext = telemetryCtx;
      errorMessageText.innerText = `An issue occurred (${telemetryCtx.errorName}). Would you like to share sanitized diagnostic info?`;
      errorReportBanner.classList.remove('hidden');
    }
  }

  function clearAlerts() {
    statusAlert.classList.add('hidden');
    errorReportBanner.classList.add('hidden');
  }

  async function getCookiesForDomain(domain: string, url?: string): Promise<string> {
    if (typeof chrome !== 'undefined' && chrome.cookies) {
      const cookieList: any[] = [];
      if (url) {
        try {
          const urlCookies = await chrome.cookies.getAll({ url });
          cookieList.push(...urlCookies);
        } catch (e) {}
      }
      try {
        const domainCookies = await chrome.cookies.getAll({ domain });
        cookieList.push(...domainCookies);
      } catch (e) {}
      
      const parts = domain.split('.');
      if (parts.length > 2) {
        const rootDomain = parts.slice(-2).join('.');
        try {
          const rootCookies = await chrome.cookies.getAll({ domain: rootDomain });
          cookieList.push(...rootCookies);
        } catch (e) {}
      }

      const unique = new Map<string, string>();
      cookieList.forEach(c => {
        if (c && c.name && c.value) unique.set(c.name, c.value);
      });

      return Array.from(unique.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
    }
    return '';
  }

  function sendMessage(msg: any): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (!response.success) {
          return reject(new Error(response.error));
        }
        resolve(response.data);
      });
    });
  }
});
