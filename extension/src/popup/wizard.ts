import { ChildManager, ChildProfile } from '../services/childManager';
import { PersonalDriveService } from '../services/personalDriveService';
import { GasProvisionerService } from '../services/gasProvisioner';
import { AiNormalizerService } from '../services/aiNormalizer';
import { SkillGeneratorService } from '../services/skillGenerator';
import { WhatsAppDiagnosticLogger } from '../services/whatsappLogger';

document.addEventListener('DOMContentLoaded', async () => {
  // Navigation & Container Elements
  const stepBadge = document.getElementById('stepBadge') as HTMLElement;
  const wizardStepper = document.getElementById('wizardStepper') as HTMLElement;
  const cardFamilyDashboard = document.getElementById('familyDashboardCard') as HTMLElement;
  const cardStep1 = document.getElementById('step1Card') as HTMLElement;
  const cardStep2 = document.getElementById('step2Card') as HTMLElement;
  const cardStep3 = document.getElementById('step3Card') as HTMLElement;
  const cardStep4 = document.getElementById('step4Card') as HTMLElement;

  // AI Normalizer Status & Guidance
  const aiStatusPillBar = document.getElementById('aiStatusPillBar') as HTMLElement;
  const aiStatusBadge = document.getElementById('aiStatusBadge') as HTMLElement;

  // Modals
  const gamingAlertModal = document.getElementById('gamingAlertModal') as HTMLElement;
  const btnModalTrackGaming = document.getElementById('btnModalTrackGaming') as HTMLButtonElement;
  const btnModalContinueSkip = document.getElementById('btnModalContinueSkip') as HTMLButtonElement;

  const invariantModal = document.getElementById('invariantModal') as HTMLElement;
  const lblInvariantKidName = document.getElementById('lblInvariantKidName') as HTMLElement;
  const btnCloseInvariantModal = document.getElementById('btnCloseInvariantModal') as HTMLButtonElement;

  // Step 1 UI Elements
  const lblStep1AccountEmail = document.getElementById('lblStep1AccountEmail') as HTMLElement;
  const btnStep1ConnectPersonal = document.getElementById('btnStep1ConnectPersonal') as HTMLButtonElement;
  const step1ChildSetupBox = document.getElementById('step1ChildSetupBox') as HTMLElement;
  const txtStep1ChildName = document.getElementById('txtStep1ChildName') as HTMLInputElement;
  const lblStep1NameError = document.getElementById('lblStep1NameError') as HTMLElement;
  const selStep1AcademicYear = document.getElementById('selStep1AcademicYear') as HTMLSelectElement;
  const btnStep1SaveChild = document.getElementById('btnStep1SaveChild') as HTMLButtonElement;
  const step1ChildConfirmedBadge = document.getElementById('step1ChildConfirmedBadge') as HTMLElement;
  const lblStep1ActiveChild = document.getElementById('lblStep1ActiveChild') as HTMLElement;
  const step1ConnectedActions = document.getElementById('step1ConnectedActions') as HTMLElement;
  const btnStep1SwitchAccount = document.getElementById('btnStep1SwitchAccount') as HTMLButtonElement;
  const btnStep1Continue = document.getElementById('btnStep1Continue') as HTMLButtonElement;

  // Step 2 UI Elements
  const radioClassroomYes = document.getElementById('radioClassroomYes') as HTMLInputElement;
  const radioClassroomNo = document.getElementById('radioClassroomNo') as HTMLInputElement;
  const radioCardClassroomYes = document.getElementById('radioCardClassroomYes') as HTMLElement;
  const radioCardClassroomNo = document.getElementById('radioCardClassroomNo') as HTMLElement;
  const lblRadioTitleYes = document.getElementById('lblRadioTitleYes') as HTMLElement;
  const lblRadioTitleNo = document.getElementById('lblRadioTitleNo') as HTMLElement;
  const step2ClassroomSection = document.getElementById('step2ClassroomSection') as HTMLElement;
  const step2PersonalMcpSection = document.getElementById('step2PersonalMcpSection') as HTMLElement;
  const btnOpenClassroom = document.getElementById('btnOpenClassroom') as HTMLButtonElement;
  const btnOpenApiSettings = document.getElementById('btnOpenApiSettings') as HTMLButtonElement;
  const btnCreateMcpServer = document.getElementById('btnCreateMcpServer') as HTMLButtonElement;
  const btnCreatePersonalMcpServer = document.getElementById('btnCreatePersonalMcpServer') as HTMLButtonElement;
  const gasUrlInput = document.getElementById('gasUrlInput') as HTMLInputElement;
  const btnVerifyStep1 = document.getElementById('btnVerifyStep1') as HTMLButtonElement;
  const btnNavStep2ToStep1 = document.getElementById('btnNavStep2ToStep1') as HTMLButtonElement;
  const btnNavStep2ToStep3 = document.getElementById('btnNavStep2ToStep3') as HTMLButtonElement;

  // Step 3 UI Elements
  const btnSkipStep3 = document.getElementById('btnSkipStep3') as HTMLButtonElement;
  const btnCaptureVerifyPortal = document.getElementById('btnCaptureVerifyPortal') as HTMLButtonElement;
  const connectionStatusBox = document.getElementById('connectionStatusBox') as HTMLElement;
  const connectionStatusText = document.getElementById('connectionStatusText') as HTMLElement;
  const featureSection = document.getElementById('featureSection') as HTMLElement;
  const btnRegisterFeature = document.getElementById('btnRegisterFeature') as HTMLButtonElement;
  const activeFeaturesBox = document.getElementById('activeFeaturesBox') as HTMLElement;
  const step3RegisteredToolsList = document.getElementById('step3RegisteredToolsList') as HTMLUListElement;
  const btnNavStep3ToStep2 = document.getElementById('btnNavStep3ToStep2') as HTMLButtonElement;
  const btnNavStep3ToStep4 = document.getElementById('btnNavStep3ToStep4') as HTMLButtonElement;

  // Step 4 UI Elements
  const lblStep4KidName = document.getElementById('lblStep4KidName') as HTMLElement;
  const btnFinishChildSetup = document.getElementById('btnFinishChildSetup') as HTMLButtonElement;
  const btnFinishSetupBottom = document.getElementById('btnFinishSetupBottom') as HTMLButtonElement;
  const btnScanDriveExports = document.getElementById('btnScanDriveExports') as HTMLButtonElement;
  const driveExportsContainer = document.getElementById('driveExportsContainer') as HTMLElement;
  const driveExportsList = document.getElementById('driveExportsList') as HTMLElement;
  const btnCaptureActiveChat = document.getElementById('btnCaptureActiveChat') as HTMLButtonElement;
  const btnStopActiveSync = document.getElementById('btnStopActiveSync') as HTMLButtonElement;
  const trackedChatsEmpty = document.getElementById('trackedChatsEmpty') as HTMLElement;
  const trackedChatsList = document.getElementById('trackedChatsList') as HTMLUListElement;
  const btnNavStep4ToStep3 = document.getElementById('btnNavStep4ToStep3') as HTMLButtonElement;

  // Family Dashboard Elements
  const familyProfilesList = document.getElementById('familyProfilesList') as HTMLElement;
  const btnAddAnotherKid = document.getElementById('btnAddAnotherKid') as HTMLButtonElement;
  const btnDownloadFamilySkill = document.getElementById('btnDownloadFamilySkill') as HTMLButtonElement;

  // Diagnostic Logs Elements
  const txtActivityLog = document.getElementById('txtActivityLog') as HTMLTextAreaElement;
  const btnFetchWhatsAppLogs = document.getElementById('btnFetchWhatsAppLogs') as HTMLButtonElement;
  const btnCopyActivityLog = document.getElementById('btnCopyActivityLog') as HTMLButtonElement;
  const btnClearWhatsAppLogs = document.getElementById('btnClearWhatsAppLogs') as HTMLButtonElement;

  let currentWizardStep = 1;
  let currentConfiguringProfile: ChildProfile | null = null;
  let cachedPersonalToken: string | null = null;

  // Populate Academic Year dropdown
  function populateAcademicYears() {
    if (!selStep1AcademicYear) return;
    const years = ChildManager.getCalculatedAcademicYears();
    selStep1AcademicYear.innerHTML = `
      <option value="${years.past}">${years.past}</option>
      <option value="${years.current}" selected>${years.current}</option>
      <option value="${years.future}">${years.future}</option>
    `;
  }

  populateAcademicYears();

  // AI Readiness Checker
  async function checkAiNormalizerStatus() {
    if (!aiStatusBadge) return;
    try {
      const isReady = await AiNormalizerService.checkAiReadiness();
      if (isReady) {
        aiStatusBadge.textContent = '🟢 Gemini Nano Ready';
        aiStatusBadge.style.background = '#ecfdf5';
        aiStatusBadge.style.color = '#065f46';
      } else {
        aiStatusBadge.textContent = '⚪ Rule Engine';
        aiStatusBadge.style.background = '#e2e8f0';
        aiStatusBadge.style.color = '#475569';
      }
    } catch {
      aiStatusBadge.textContent = '⚪ Rule Engine';
    }
  }

  checkAiNormalizerStatus();

  // Log Stream Poller
  async function refreshDiagnosticLogs() {
    if (!txtActivityLog) return;
    try {
      const logs = await WhatsAppDiagnosticLogger.getRecentLogs(35);
      txtActivityLog.value = logs;
      txtActivityLog.scrollTop = txtActivityLog.scrollHeight;
    } catch {}
  }

  refreshDiagnosticLogs();
  setInterval(refreshDiagnosticLogs, 3000);

  // Stepper Visuals & Click Handlers
  function updateStepper(step: number) {
    currentWizardStep = step;
    if (stepBadge) {
      stepBadge.textContent = `Step ${step} of 4`;
      stepBadge.style.background = 'var(--accent-color)';
    }

    for (let i = 1; i <= 4; i++) {
      const dot = document.getElementById(`dot${i}`);
      const line = document.getElementById(`line${i}`);
      if (dot) {
        dot.classList.remove('active', 'completed');
        if (i === step) dot.classList.add('active');
        else if (i < step) dot.classList.add('completed');
      }
      if (line) {
        line.classList.remove('completed');
        if (i < step) line.classList.add('completed');
      }
    }
  }

  // Allow clicking stepper dots to navigate during Configure Mode
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`dot${i}`);
    dot?.addEventListener('click', () => {
      showWizardStep(i);
    });
  }

  // View Navigation Controllers: Configure Mode (Steps 1-4) vs Family Dashboard
  function showWizardStep(step: number) {
    // Persist current wizard step across popup close/open (e.g. when opening classroom in another tab)
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ wizard_current_step: step }).catch(() => {});
    }

    // 1. Completely hide Family Dashboard in Configure Mode
    cardFamilyDashboard?.classList.add('hidden');
    
    // 2. Show Stepper & Step Badge
    wizardStepper?.classList.remove('hidden');
    if (stepBadge) stepBadge.classList.remove('hidden');

    // 3. Toggle step cards
    cardStep1?.classList.add('hidden');
    cardStep2?.classList.add('hidden');
    cardStep3?.classList.add('hidden');
    cardStep4?.classList.add('hidden');

    updateStepper(step);

    if (step === 1) cardStep1?.classList.remove('hidden');
    else if (step === 2) {
      cardStep2?.classList.remove('hidden');
      updateStep2RadioLabels();
    } else if (step === 3) {
      cardStep3?.classList.remove('hidden');
      renderStep3RegisteredTools();
    } else if (step === 4) {
      cardStep4?.classList.remove('hidden');
      if (lblStep4KidName && currentConfiguringProfile) {
        lblStep4KidName.textContent = currentConfiguringProfile.name;
      }
      renderStep4TrackedChats();
    }
  }

  async function showFamilyDashboard() {
    // Hide all Wizard step cards & Stepper
    cardStep1?.classList.add('hidden');
    cardStep2?.classList.add('hidden');
    cardStep3?.classList.add('hidden');
    cardStep4?.classList.add('hidden');
    wizardStepper?.classList.add('hidden');

    if (stepBadge) {
      stepBadge.textContent = 'Dashboard';
      stepBadge.style.background = 'var(--brand-navy)';
    }

    cardFamilyDashboard?.classList.remove('hidden');
    await renderFamilyDashboardProfiles();
  }

  // Render Family Dashboard Profiles
  async function renderFamilyDashboardProfiles() {
    if (!familyProfilesList) return;
    const profiles = await ChildManager.getProfiles(false);
    familyProfilesList.innerHTML = '';

    if (profiles.length === 0) {
      familyProfilesList.innerHTML = `
        <div class="status-box" style="justify-content: center; padding: 14px; color: var(--text-muted);">
          No profiles configured yet. Click "Add Another Kid" to start.
        </div>
      `;
      return;
    }

    profiles.forEach(p => {
      const card = document.createElement('div');
      card.className = 'kid-profile-card';

      const url = p.gasDeploymentUrl || 'Not configured';
      const year = p.academicYear || '2026-2027';
      const hasClassroom = p.hasClassroom !== false;
      const portalCount = (p.registeredTools && p.registeredTools.length) || 0;
      const chatCount = (p.trackedChats && p.trackedChats.length) || 0;

      card.innerHTML = `
        <div class="kid-profile-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="kid-name-badge">👦 ${p.name}</span>
            <span class="kid-year-badge">${year}</span>
          </div>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-secondary btn-sm btn-edit-kid" data-id="${p.id}" title="Edit Profile">✏️ Edit</button>
            <button class="btn btn-danger btn-sm btn-delete-kid" data-id="${p.id}" title="Remove Profile">🗑️</button>
          </div>
        </div>

        <div style="display: flex; gap: 6px; font-size: 0.72rem; color: var(--text-secondary); flex-wrap: wrap;">
          <span>Classroom: <strong>${hasClassroom ? '✅ Yes' : '⏭️ No'}</strong></span> •
          <span>Portals: <strong>${portalCount}</strong></span> •
          <span>Chats: <strong>${chatCount}</strong></span>
        </div>

        <div style="background: var(--card-surface); border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 8px;">
          <div style="font-size: 0.7rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 2px;">
            MCP Server: <span style="color: var(--brand-navy); font-family: 'Kanit', sans-serif;">K.I.D.S. - ${p.name}</span>
          </div>
          <div class="url-copy-box">
            <input type="text" readonly value="${url}" style="font-size: 0.72rem; padding: 4px 6px;" />
            <button class="btn btn-primary btn-sm btn-copy-kid-url" data-url="${url}">📋 Copy</button>
          </div>
        </div>
      `;

      familyProfilesList.appendChild(card);
    });

    // Attach Edit & Delete handlers
    document.querySelectorAll('.btn-edit-kid').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const found = profiles.find(p => p.id === id);
        if (found) {
          currentConfiguringProfile = found;
          await ChildManager.setActiveProfileId(found.id);
          await chrome.storage.local.set({ wizard_configuring_child_id: found.id, wizard_current_step: 1 }).catch(() => {});
          populateStep1ForEditing(found);
          showWizardStep(1);
        }
      });
    });

    document.querySelectorAll('.btn-delete-kid').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id && confirm('Are you sure you want to remove this kid profile from the extension? Historical Google Drive data will be safely preserved.')) {
          const res = await ChildManager.deleteProfile(id);
          if (res.remainingCount === 0) {
            showWizardStep(1);
          } else {
            await renderFamilyDashboardProfiles();
          }
        }
      });
    });

    document.querySelectorAll('.btn-copy-kid-url').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const url = (e.currentTarget as HTMLElement).getAttribute('data-url') || '';
        if (url && url !== 'Not configured') {
          await navigator.clipboard.writeText(url);
          const b = e.currentTarget as HTMLElement;
          const orig = b.textContent;
          b.textContent = '✅ Copied!';
          setTimeout(() => { b.textContent = orig; }, 1500);
        }
      });
    });
  }

  function populateStep1ForEditing(p: ChildProfile) {
    if (txtStep1ChildName) txtStep1ChildName.value = p.name;
    if (selStep1AcademicYear && p.academicYear) selStep1AcademicYear.value = p.academicYear;
    if (lblStep1ActiveChild) lblStep1ActiveChild.textContent = `${p.name} (${p.academicYear || '2026-2027'})`;
    step1ChildSetupBox?.classList.remove('hidden');
    step1ChildConfirmedBadge?.classList.remove('hidden');
    step1ConnectedActions?.classList.remove('hidden');
  }

  // ==========================================
  // INITIAL STARTUP ROUTING (MULTI-CHILD SAFE)
  // ==========================================
  const activeProfile = await ChildManager.getActiveProfile();
  const isFullyConfigured = activeProfile && Boolean(
    activeProfile.gasDeploymentUrl ||
    (activeProfile.trackedChats && activeProfile.trackedChats.length > 0) ||
    (activeProfile.registeredTools && activeProfile.registeredTools.length > 0)
  );

  const wizardState = await chrome.storage.local.get(['wizard_current_step', 'wizard_configuring_child_id']);
  const savedStep = wizardState.wizard_current_step ? Number(wizardState.wizard_current_step) : 0;
  const savedChildId = wizardState.wizard_configuring_child_id;

  const allProfiles = await ChildManager.getProfiles(false);
  let targetProfile: ChildProfile | null = null;
  if (savedChildId) {
    targetProfile = allProfiles.find(p => p.id === savedChildId) || null;
  }
  if (!targetProfile) {
    targetProfile = activeProfile;
  }

  if (targetProfile && targetProfile.name && !targetProfile.name.toLowerCase().startsWith('child 1')) {
    currentConfiguringProfile = targetProfile;
    await ChildManager.setActiveProfileId(targetProfile.id);
    populateStep1ForEditing(targetProfile);
  }

  if (savedStep >= 1 && savedStep <= 4) {
    // If user was in the middle of step 2, 3, or 4 for THIS specific child, resume directly!
    showWizardStep(savedStep);
  } else if (isFullyConfigured && activeProfile) {
    currentConfiguringProfile = activeProfile;
    await showFamilyDashboard();
  } else {
    showWizardStep(1);
  }

  // Check existing Personal Account login
  try {
    const state = await chrome.storage.local.get(['personal_drive_account_email', 'personal_drive_auth_token']);
    if (state.personal_drive_account_email && state.personal_drive_auth_token) {
      cachedPersonalToken = state.personal_drive_auth_token;
      if (lblStep1AccountEmail) lblStep1AccountEmail.textContent = state.personal_drive_account_email;
      step1ChildSetupBox?.classList.remove('hidden');
      if (btnStep1ConnectPersonal) btnStep1ConnectPersonal.classList.add('hidden');
    }
  } catch {}

  // ==========================================
  // STEP 1 HANDLERS
  // ==========================================
  btnStep1ConnectPersonal?.addEventListener('click', async () => {
    btnStep1ConnectPersonal.disabled = true;
    btnStep1ConnectPersonal.textContent = '🔐 Signing in...';
    try {
      const auth = await PersonalDriveService.authenticatePersonalAccount();
      cachedPersonalToken = auth.token;
      if (lblStep1AccountEmail) lblStep1AccountEmail.textContent = auth.email;
      step1ChildSetupBox?.classList.remove('hidden');
      btnStep1ConnectPersonal.classList.add('hidden');
      await WhatsAppDiagnosticLogger.log('SUCCESS', 'AUTH', `Authenticated parent account: ${auth.email}`);
    } catch (e: any) {
      alert(`Google Sign-In failed: ${e.message || String(e)}`);
      btnStep1ConnectPersonal.textContent = '🔐 Sign in with Personal Google Account';
      btnStep1ConnectPersonal.disabled = false;
    }
  });

  btnStep1SwitchAccount?.addEventListener('click', async () => {
    btnStep1ConnectPersonal?.classList.remove('hidden');
    btnStep1ConnectPersonal.disabled = false;
    btnStep1ConnectPersonal.textContent = '🔐 Switch Google Account';
  });

  txtStep1ChildName?.addEventListener('input', () => {
    if (lblStep1NameError) lblStep1NameError.classList.add('hidden');
  });

  btnStep1SaveChild?.addEventListener('click', async () => {
    const rawName = txtStep1ChildName?.value || '';
    const validation = ChildManager.validateFirstName(rawName);
    if (!validation.valid) {
      if (lblStep1NameError) {
        lblStep1NameError.textContent = validation.error || 'Invalid name';
        lblStep1NameError.classList.remove('hidden');
      }
      return;
    }

    const selectedYear = selStep1AcademicYear?.value || '2026-2027';

    if (currentConfiguringProfile) {
      currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, {
        name: validation.cleanName,
        academicYear: selectedYear
      });
    } else {
      currentConfiguringProfile = await ChildManager.createProfile(validation.cleanName, selectedYear);
    }

    if (currentConfiguringProfile) {
      await ChildManager.setActiveProfileId(currentConfiguringProfile.id);
      await chrome.storage.local.set({ wizard_configuring_child_id: currentConfiguringProfile.id }).catch(() => {});
    }

    if (lblStep1ActiveChild) {
      lblStep1ActiveChild.textContent = `${validation.cleanName} (${selectedYear})`;
    }
    step1ChildConfirmedBadge?.classList.remove('hidden');
    step1ConnectedActions?.classList.remove('hidden');
    showWizardStep(2);
  });

  btnStep1Continue?.addEventListener('click', () => {
    showWizardStep(2);
  });

  // ==========================================
  // STEP 2 HANDLERS
  // ==========================================
  function updateStep2RadioLabels() {
    const kidName = currentConfiguringProfile?.name || 'Atharva';
    if (lblRadioTitleYes) lblRadioTitleYes.textContent = `${kidName}'s school is using Google Classroom`;
    if (lblRadioTitleNo) lblRadioTitleNo.textContent = `${kidName}'s school is NOT using Google Classroom`;

    const hasClassroom = currentConfiguringProfile?.hasClassroom !== false;
    if (radioClassroomYes && radioClassroomNo) {
      radioClassroomYes.checked = hasClassroom;
      radioClassroomNo.checked = !hasClassroom;
      if (hasClassroom) {
        radioCardClassroomYes?.classList.add('selected');
        radioCardClassroomNo?.classList.remove('selected');
        step2ClassroomSection?.classList.remove('hidden');
        step2PersonalMcpSection?.classList.add('hidden');
      } else {
        radioCardClassroomNo?.classList.add('selected');
        radioCardClassroomYes?.classList.remove('selected');
        step2ClassroomSection?.classList.add('hidden');
        step2PersonalMcpSection?.classList.remove('hidden');
      }
    }

    if (gasUrlInput && currentConfiguringProfile?.gasDeploymentUrl) {
      gasUrlInput.value = currentConfiguringProfile.gasDeploymentUrl;
    }
  }

  radioClassroomYes?.addEventListener('change', async () => {
    radioCardClassroomYes?.classList.add('selected');
    radioCardClassroomNo?.classList.remove('selected');
    step2ClassroomSection?.classList.remove('hidden');
    step2PersonalMcpSection?.classList.add('hidden');
    if (currentConfiguringProfile) {
      currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, { hasClassroom: true });
    }
  });

  radioClassroomNo?.addEventListener('change', async () => {
    radioCardClassroomNo?.classList.add('selected');
    radioCardClassroomYes?.classList.remove('selected');
    step2ClassroomSection?.classList.add('hidden');
    step2PersonalMcpSection?.classList.remove('hidden');
    if (currentConfiguringProfile) {
      currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, { hasClassroom: false });
    }
  });

  btnOpenClassroom?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://classroom.google.com' });
  });

  btnOpenApiSettings?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://script.google.com/home/usersettings' });
  });

  async function deployMcpServer(isPersonalAccount: boolean) {
    const targetBtn = isPersonalAccount ? btnCreatePersonalMcpServer : btnCreateMcpServer;
    if (!targetBtn) return;
    targetBtn.disabled = true;
    targetBtn.textContent = '⏳ Deploying MCP Server...';

    try {
      const kidName = currentConfiguringProfile?.name || 'Atharva';
      let token = cachedPersonalToken;
      if (!isPersonalAccount) {
        // Use School account flow or Personal token fallback
        token = cachedPersonalToken || await PersonalDriveService.getValidToken(false);
      }
      if (!token) throw new Error('Google authorization required.');

      const deployRes = await GasProvisionerService.provision(true);
      if (deployRes && deployRes.webAppUrl) {
        if (gasUrlInput) gasUrlInput.value = deployRes.webAppUrl;
        if (currentConfiguringProfile) {
          currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, {
            gasDeploymentUrl: deployRes.webAppUrl,
            gasScriptId: deployRes.scriptId
          });
        }
        await WhatsAppDiagnosticLogger.log('SUCCESS', 'GAS', `Deployed MCP Server for ${kidName}: ${deployRes.webAppUrl}`);
        alert(`🎉 MCP Server successfully created for ${kidName}!`);
      }
    } catch (e: any) {
      alert(`MCP Server creation failed: ${e.message || String(e)}`);
    } finally {
      targetBtn.disabled = false;
      targetBtn.textContent = isPersonalAccount ? '⚡ 1-Click Create MCP Server in Personal Account' : '⚡ 3. Create / Update MCP Server';
    }
  }

  btnCreateMcpServer?.addEventListener('click', () => deployMcpServer(false));
  btnCreatePersonalMcpServer?.addEventListener('click', () => deployMcpServer(true));

  btnVerifyStep1?.addEventListener('click', async () => {
    const url = gasUrlInput?.value.trim();
    if (!url) {
      alert('Please enter your Server Web App URL.');
      return;
    }
    btnVerifyStep1.disabled = true;
    btnVerifyStep1.textContent = '⏳ Verifying...';
    try {
      const tools = await GasProvisionerService.verifyMcpServerUrl(url);
      if (currentConfiguringProfile) {
        currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, { gasDeploymentUrl: url });
      }
      alert(`✅ Verified! Found ${tools.length} active MCP tools.`);
    } catch (e: any) {
      alert(`Verification error: ${e.message || String(e)}`);
    } finally {
      btnVerifyStep1.disabled = false;
      btnVerifyStep1.textContent = 'Verify Server Link';
    }
  });

  btnNavStep2ToStep1?.addEventListener('click', () => showWizardStep(1));
  btnNavStep2ToStep3?.addEventListener('click', () => showWizardStep(3));

  // ==========================================
  // STEP 3 HANDLERS (PORTALS & SKIP MODAL)
  // ==========================================
  btnSkipStep3?.addEventListener('click', () => {
    gamingAlertModal?.classList.remove('hidden');
  });

  btnModalTrackGaming?.addEventListener('click', () => {
    gamingAlertModal?.classList.add('hidden');
  });

  btnModalContinueSkip?.addEventListener('click', () => {
    gamingAlertModal?.classList.add('hidden');
    showWizardStep(4);
  });

  btnCaptureVerifyPortal?.addEventListener('click', async () => {
    btnCaptureVerifyPortal.disabled = true;
    btnCaptureVerifyPortal.textContent = '⏳ Capturing Active Tab...';
    connectionStatusBox?.classList.remove('hidden');
    if (connectionStatusText) connectionStatusText.textContent = 'Inspecting active browser tab...';

    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.id || !activeTab.url) {
        throw new Error('No active browser tab found. Please navigate to your school/kids portal in Chrome.');
      }

      if (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://')) {
        throw new Error('Cannot capture system pages. Please open your school website or kids platform.');
      }

      featureSection?.classList.remove('hidden');
      if (connectionStatusText) connectionStatusText.textContent = `Connected to: ${new URL(activeTab.url).hostname}`;
    } catch (e: any) {
      if (connectionStatusText) connectionStatusText.textContent = `Error: ${e.message}`;
    } finally {
      btnCaptureVerifyPortal.disabled = false;
      btnCaptureVerifyPortal.textContent = '🚀 1. Capture & Verify Active Tab';
    }
  });

  btnRegisterFeature?.addEventListener('click', async () => {
    btnRegisterFeature.disabled = true;
    btnRegisterFeature.textContent = '⏳ Registering Page...';
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.url) throw new Error('No active tab.');

      const urlObj = new URL(activeTab.url);
      const featureName = (activeTab.title || 'Dashboard').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
      const newTool = {
        domain: urlObj.hostname,
        feature: featureName,
        name: `get_${featureName.toLowerCase()}`,
        url: activeTab.url
      };

      let existingTools = currentConfiguringProfile?.registeredTools || [];
      if (!existingTools.some((t: any) => t.url === newTool.url)) {
        existingTools.push(newTool);
        if (currentConfiguringProfile) {
          currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, { registeredTools: existingTools });
        }
      }
      renderStep3RegisteredTools();
      alert(`🎉 Registered "${featureName}" as an AI tool!`);
    } catch (e: any) {
      alert(`Registration failed: ${e.message}`);
    } finally {
      btnRegisterFeature.disabled = false;
      btnRegisterFeature.textContent = '📸 2. Register Active Page';
    }
  });

  function renderStep3RegisteredTools() {
    if (!step3RegisteredToolsList) return;
    const tools = currentConfiguringProfile?.registeredTools || [];
    step3RegisteredToolsList.innerHTML = '';
    if (tools.length === 0) {
      activeFeaturesBox?.classList.add('hidden');
      return;
    }
    activeFeaturesBox?.classList.remove('hidden');
    tools.forEach((t: any) => {
      const li = document.createElement('li');
      li.style.fontSize = '0.74rem';
      li.style.padding = '3px 0';
      li.textContent = `🔹 ${t.feature} (${t.domain})`;
      step3RegisteredToolsList.appendChild(li);
    });
  }

  btnNavStep3ToStep2?.addEventListener('click', () => showWizardStep(2));
  btnNavStep3ToStep4?.addEventListener('click', () => showWizardStep(4));

  // ==========================================
  // STEP 4 HANDLERS (DUAL-PATH WHATSAPP & FINISH)
  // ==========================================
  btnScanDriveExports?.addEventListener('click', async () => {
    btnScanDriveExports.disabled = true;
    btnScanDriveExports.textContent = '⏳ Scanning Drive...';
    try {
      const token = cachedPersonalToken || await PersonalDriveService.getValidToken(false);
      const res = await PersonalDriveService.fetchWithAuth(
        `https://www.googleapis.com/drive/v3/files?q=mimeType%20%3D%20'application%2Fzip'%20or%20mimeType%20%3D%20'text%2Fplain'&orderBy=modifiedTime%20desc&pageSize=10&fields=files(id,name,modifiedTime)`,
        {},
        token
      );
      if (res.ok) {
        const data = await res.json();
        driveExportsContainer?.classList.remove('hidden');
        driveExportsList.innerHTML = '';
        if (data.files && data.files.length > 0) {
          data.files.forEach((f: any) => {
            const item = document.createElement('button');
            item.className = 'btn btn-secondary btn-sm';
            item.style.textAlign = 'left';
            item.style.width = '100%';
            item.textContent = `📄 ${f.name}`;
            item.addEventListener('click', async () => {
              if (confirm(`Import entire historical archive from "${f.name}" for ${currentConfiguringProfile?.name}?`)) {
                await PersonalDriveService.ingestWhatsAppExport(f.id, currentConfiguringProfile?.name, token);
                alert(`✅ Historical import complete!`);
                await renderStep4TrackedChats();
              }
            });
            driveExportsList?.appendChild(item);
          });
        } else {
          driveExportsList.innerHTML = `<span style="font-size:0.72rem;color:var(--text-muted);">No exported .zip or .txt files found in your Google Drive.</span>`;
        }
      }
    } catch (e: any) {
      alert(`Drive scan failed: ${e.message}`);
    } finally {
      btnScanDriveExports.disabled = false;
      btnScanDriveExports.textContent = '🔍 Show Recent Uploads from Google Drive';
    }
  });

  btnCaptureActiveChat?.addEventListener('click', async () => {
    btnCaptureActiveChat.disabled = true;
    btnCaptureActiveChat.textContent = '⏳ Capturing Chat...';
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SYNC_WHATSAPP_CHATS',
        payload: { isManualSync: true }
      });
      if (response && response.status === 'success') {
        alert('🎉 Chat captured and synchronized!');
      }
      await renderStep4TrackedChats();
    } catch (e: any) {
      alert(`Chat capture error: ${e.message}`);
    } finally {
      btnCaptureActiveChat.disabled = false;
      btnCaptureActiveChat.textContent = '📸 1-Click Track Active Chat';
    }
  });

  async function renderStep4TrackedChats() {
    if (!trackedChatsList) return;
    const state = await chrome.storage.local.get(['tracked_whatsapp_chats']);
    const list: any[] = state.tracked_whatsapp_chats || currentConfiguringProfile?.trackedChats || [];
    trackedChatsList.innerHTML = '';
    if (list.length === 0) {
      trackedChatsEmpty?.classList.remove('hidden');
      return;
    }
    trackedChatsEmpty?.classList.add('hidden');
    list.forEach(c => {
      const li = document.createElement('li');
      li.style.fontSize = '0.74rem';
      li.style.padding = '4px 8px';
      li.style.background = 'var(--card-surface)';
      li.style.borderRadius = '4px';
      li.style.border = '1px solid var(--border-color)';
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.innerHTML = `<span>💬 <strong>${c.title}</strong></span> <span style="font-size:0.68rem;color:var(--success-color);">Active</span>`;
      trackedChatsList.appendChild(li);
    });
  }

  // Finish Setup with Invariant Verification
  async function completeChildSetup() {
    const prof = currentConfiguringProfile;
    if (!prof) {
      showFamilyDashboard();
      return;
    }

    const hasClassroom = prof.hasClassroom !== false;
    const hasPortals = prof.registeredTools && prof.registeredTools.length > 0;
    const state = await chrome.storage.local.get(['tracked_whatsapp_chats']);
    const hasChats = (state.tracked_whatsapp_chats && state.tracked_whatsapp_chats.length > 0) || (prof.trackedChats && prof.trackedChats.length > 0);

    if (!hasClassroom && !hasPortals && !hasChats) {
      if (lblInvariantKidName) lblInvariantKidName.textContent = prof.name;
      invariantModal?.classList.remove('hidden');
      return;
    }

    await ChildManager.updateProfile(prof.id, {
      trackedChats: state.tracked_whatsapp_chats || []
    });

    await chrome.storage.local.remove(['wizard_current_step']).catch(() => {});

    await WhatsAppDiagnosticLogger.log('SUCCESS', 'CHILD', `Completed configuration for ${prof.name}!`);
    alert(`🎉 Setup completed for ${prof.name}! Returning to Family Dashboard.`);
    await showFamilyDashboard();
  }

  btnFinishChildSetup?.addEventListener('click', completeChildSetup);
  btnFinishSetupBottom?.addEventListener('click', completeChildSetup);
  btnCloseInvariantModal?.addEventListener('click', () => {
    invariantModal?.classList.add('hidden');
  });

  btnNavStep4ToStep3?.addEventListener('click', () => showWizardStep(3));

  // ==========================================
  // FAMILY DASHBOARD ACTIONS
  // ==========================================
  btnAddAnotherKid?.addEventListener('click', async () => {
    currentConfiguringProfile = null;
    await chrome.storage.local.remove(['wizard_configuring_child_id']).catch(() => {});
    await chrome.storage.local.set({ wizard_current_step: 1 }).catch(() => {});
    if (txtStep1ChildName) txtStep1ChildName.value = '';
    step1ChildSetupBox?.classList.remove('hidden');
    step1ChildConfirmedBadge?.classList.add('hidden');
    step1ConnectedActions?.classList.add('hidden');
    showWizardStep(1);
  });

  btnDownloadFamilySkill?.addEventListener('click', async () => {
    btnDownloadFamilySkill.disabled = true;
    btnDownloadFamilySkill.textContent = '⏳ Generating Skill...';
    try {
      const profiles = await ChildManager.getProfiles(false);
      const skillDoc = await SkillGeneratorService.generatePersonalizedSkill(profiles);
      SkillGeneratorService.triggerSkillDownload(skillDoc);
    } catch (e: any) {
      alert(`Skill generation error: ${e.message}`);
    } finally {
      btnDownloadFamilySkill.disabled = false;
      btnDownloadFamilySkill.textContent = '📥 Download K.I.D.S._SKILL.md';
    }
  });

  // Diagnostic Log Buttons
  btnFetchWhatsAppLogs?.addEventListener('click', refreshDiagnosticLogs);
  btnClearWhatsAppLogs?.addEventListener('click', async () => {
    await WhatsAppDiagnosticLogger.clearLogs();
    if (txtActivityLog) txtActivityLog.value = '';
  });
  btnCopyActivityLog?.addEventListener('click', async () => {
    if (txtActivityLog && txtActivityLog.value) {
      await navigator.clipboard.writeText(txtActivityLog.value);
      alert('📋 Diagnostic logs copied to clipboard!');
    }
  });
});
