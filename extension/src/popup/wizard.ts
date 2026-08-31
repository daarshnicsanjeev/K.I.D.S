import { ChildManager, ChildProfile } from '../services/childManager';
import { PersonalDriveService } from '../services/personalDriveService';
import { GasProvisionerService } from '../services/gasProvisioner';
import { AiNormalizerService } from '../services/aiNormalizer';
import { SkillGeneratorService } from '../services/skillGenerator';
import { WhatsAppDiagnosticLogger } from '../services/whatsappLogger';

document.addEventListener('DOMContentLoaded', async () => {
  // Navigation & Container Elements
  const restoringProgressOverlay = document.getElementById('restoringProgressOverlay') as HTMLElement;
  const lblRestoringSubtext = document.getElementById('lblRestoringSubtext') as HTMLElement;
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
  const btnNavStep2ToStep1 = document.getElementById('btnNavStep2ToStep1') as HTMLButtonElement;
  const btnNavStep2ToStep3 = document.getElementById('btnNavStep2ToStep3') as HTMLButtonElement;

  // Step 3 UI Elements
  const btnCaptureVerifyPortal = document.getElementById('btnCaptureVerifyPortal') as HTMLButtonElement;
  const connectionStatusBox = document.getElementById('connectionStatusBox') as HTMLElement;
  const connectionStatusIcon = document.getElementById('connectionStatusIcon') as HTMLElement;
  const connectionStatusText = document.getElementById('connectionStatusText') as HTMLElement;
  const featureSection = document.getElementById('featureSection') as HTMLElement;
  const btnRegisterFeature = document.getElementById('btnRegisterFeature') as HTMLButtonElement;
  const activeFeaturesBox = document.getElementById('activeFeaturesBox') as HTMLElement;
  const step3RegisteredToolsList = document.getElementById('step3RegisteredToolsList') as HTMLUListElement;
  const btnAddAnotherPlatform = document.getElementById('btnAddAnotherPlatform') as HTMLButtonElement;
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

  // Accessibility & Visibility Helper for JAWS / Screen Readers
  function setA11yVisibility(el: HTMLElement | null, isVisible: boolean) {
    if (!el) return;
    if (isVisible) {
      el.classList.remove('hidden');
      el.removeAttribute('hidden');
      el.setAttribute('aria-hidden', 'false');
    } else {
      el.classList.add('hidden');
      el.setAttribute('hidden', '');
      el.setAttribute('aria-hidden', 'true');
    }
  }

  const mainAppContainer = document.getElementById('mainAppContainer') as HTMLElement;

  function openModal(modalEl: HTMLElement | null) {
    if (!modalEl) return;
    setA11yVisibility(modalEl, true);
    if (mainAppContainer) {
      mainAppContainer.setAttribute('aria-hidden', 'true');
      mainAppContainer.setAttribute('inert', '');
    }
    const focusTarget = modalEl.querySelector('button, [tabindex="0"]') as HTMLElement;
    focusTarget?.focus();
  }

  function closeModal(modalEl: HTMLElement | null) {
    if (!modalEl) return;
    setA11yVisibility(modalEl, false);
    if (mainAppContainer) {
      mainAppContainer.setAttribute('aria-hidden', 'false');
      mainAppContainer.removeAttribute('inert');
    }
  }

  // Stepper Visuals & Click Handlers (Backwards Navigation Only)
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
        dot.classList.remove('active', 'completed', 'disabled-dot');
        if (i === step) {
          dot.classList.add('active');
          dot.setAttribute('aria-current', 'step');
          dot.setAttribute('tabindex', '0');
          dot.style.cursor = 'default';
        } else if (i < step) {
          dot.classList.add('completed');
          dot.removeAttribute('aria-current');
          dot.setAttribute('tabindex', '0');
          dot.style.cursor = 'pointer';
        } else {
          // Future/Next step: cannot jump ahead directly
          dot.classList.add('disabled-dot');
          dot.removeAttribute('aria-current');
          dot.setAttribute('tabindex', '-1');
          dot.style.cursor = 'not-allowed';
        }
      }
      if (line) {
        line.classList.remove('completed');
        if (i < step) line.classList.add('completed');
      }
    }
  }

  // Only allow navigating backwards to previous steps (no jumping ahead)
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`dot${i}`);
    dot?.addEventListener('click', () => {
      if (i < currentWizardStep) {
        showWizardStep(i);
      }
    });
    dot?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (i < currentWizardStep) {
          showWizardStep(i);
        }
      }
    });
  }

  // View Navigation Controllers: Configure Mode (Steps 1-4) vs Family Dashboard
  function showWizardStep(step: number) {
    // Persist current wizard step across popup close/open (e.g. when opening classroom in another tab)
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ wizard_current_step: step }).catch(() => {});
    }

    // 1. Completely hide Family Dashboard in Configure Mode
    setA11yVisibility(cardFamilyDashboard, false);
    
    // 2. Show Stepper & Step Badge
    setA11yVisibility(wizardStepper, true);
    if (stepBadge) setA11yVisibility(stepBadge, true);

    // 3. Toggle step cards with full ARIA/JAWS screen-reader isolation
    setA11yVisibility(cardStep1, step === 1);
    setA11yVisibility(cardStep2, step === 2);
    setA11yVisibility(cardStep3, step === 3);
    setA11yVisibility(cardStep4, step === 4);

    updateStepper(step);

    if (step === 2) {
      updateStep2RadioLabels();
    } else if (step === 3) {
      renderStep3RegisteredTools();
    } else if (step === 4) {
      if (lblStep4KidName && currentConfiguringProfile) {
        lblStep4KidName.textContent = currentConfiguringProfile.name;
      }
      renderStep4TrackedChats();
    }
  }

  async function showFamilyDashboard() {
    // Hide all Wizard step cards & Stepper with full JAWS accessibility isolation
    setA11yVisibility(cardStep1, false);
    setA11yVisibility(cardStep2, false);
    setA11yVisibility(cardStep3, false);
    setA11yVisibility(cardStep4, false);
    setA11yVisibility(wizardStepper, false);

    if (stepBadge) {
      stepBadge.textContent = 'Dashboard';
      stepBadge.style.background = 'var(--brand-navy)';
    }

    setA11yVisibility(cardFamilyDashboard, true);
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

  function dismissRestoringOverlay() {
    if (!restoringProgressOverlay) return;
    restoringProgressOverlay.classList.add('fade-out');
    setTimeout(() => {
      setA11yVisibility(restoringProgressOverlay, false);
    }, 200);
  }

  if (savedStep >= 1 && savedStep <= 4) {
    if (lblRestoringSubtext && targetProfile) {
      lblRestoringSubtext.textContent = `Resuming ${targetProfile.name}'s setup (Step ${savedStep})`;
    }
    // If user was in the middle of step 2, 3, or 4 for THIS specific child, resume directly!
    showWizardStep(savedStep);
  } else if (isFullyConfigured && activeProfile) {
    currentConfiguringProfile = activeProfile;
    await showFamilyDashboard();
  } else {
    showWizardStep(1);
  }

  // Dismiss restoration overlay smoothly
  dismissRestoringOverlay();

  // Check existing Personal Account login (Automatic Parent Account Detection)
  try {
    const state = await chrome.storage.local.get(['personal_drive_account_email', 'personal_drive_auth_token']);
    if (state.personal_drive_account_email) {
      cachedPersonalToken = state.personal_drive_auth_token || null;
      if (lblStep1AccountEmail) lblStep1AccountEmail.textContent = state.personal_drive_account_email;
      setA11yVisibility(step1ChildSetupBox, true);
      setA11yVisibility(btnStep1ConnectPersonal, false);
      setA11yVisibility(step1ConnectedActions, true);
    } else {
      setA11yVisibility(btnStep1ConnectPersonal, true);
      setA11yVisibility(step1ChildSetupBox, false);
      setA11yVisibility(step1ConnectedActions, false);
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
      setA11yVisibility(step1ChildSetupBox, true);
      setA11yVisibility(btnStep1ConnectPersonal, false);
      setA11yVisibility(step1ConnectedActions, true);
      await WhatsAppDiagnosticLogger.log('SUCCESS', 'AUTH', `Authenticated parent account: ${auth.email}`);
    } catch (e: any) {
      alert(`Google Sign-In failed: ${e.message || String(e)}`);
      btnStep1ConnectPersonal.textContent = '🔐 Sign in with Personal Google Account';
      btnStep1ConnectPersonal.disabled = false;
    }
  });

  btnStep1SwitchAccount?.addEventListener('click', async () => {
    setA11yVisibility(btnStep1ConnectPersonal, true);
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
  // STEP 2 HANDLERS (DYNAMIC APPS SCRIPT API BUTTON VISIBILITY)
  // ==========================================
  async function getGasApiEnabledStatus(accountEmail: string): Promise<boolean> {
    if (!accountEmail) return false;
    const key = `gas_api_enabled_${accountEmail.toLowerCase().trim()}`;
    const data = await chrome.storage.local.get([key]);
    return Boolean(data[key]);
  }

  async function setGasApiEnabledStatus(accountEmail: string, enabled: boolean) {
    if (!accountEmail) return;
    const key = `gas_api_enabled_${accountEmail.toLowerCase().trim()}`;
    if (enabled) {
      await chrome.storage.local.set({ [key]: true });
    } else {
      await chrome.storage.local.remove([key]);
    }
  }

  async function updateStep2RadioLabels() {
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
        setA11yVisibility(step2ClassroomSection, true);
        setA11yVisibility(step2PersonalMcpSection, false);
      } else {
        radioCardClassroomNo?.classList.add('selected');
        radioCardClassroomYes?.classList.remove('selected');
        setA11yVisibility(step2ClassroomSection, false);
        setA11yVisibility(step2PersonalMcpSection, true);
      }
    }

    // When adding a kid, assume we do not know which account will be selected until MCP Server is created
    const hasDeployedMcp = Boolean(currentConfiguringProfile?.gasDeploymentUrl);

    if (hasDeployedMcp) {
      // MCP Server already active for this kid -> hide API settings button
      setA11yVisibility(btnOpenApiSettings, false);
      if (btnCreateMcpServer) btnCreateMcpServer.textContent = '⚡ 2. Create / Update MCP Server';
    } else {
      // New kid or unverified MCP Server -> show API settings button so parent can enable API if needed
      setA11yVisibility(btnOpenApiSettings, true);
      if (btnCreateMcpServer) btnCreateMcpServer.textContent = '⚡ 3. Create / Update MCP Server';
    }

    if (gasUrlInput && currentConfiguringProfile?.gasDeploymentUrl) {
      gasUrlInput.value = currentConfiguringProfile.gasDeploymentUrl;
    }
  }

  radioClassroomYes?.addEventListener('change', async () => {
    radioCardClassroomYes?.classList.add('selected');
    radioCardClassroomNo?.classList.remove('selected');
    setA11yVisibility(step2ClassroomSection, true);
    setA11yVisibility(step2PersonalMcpSection, false);
    if (currentConfiguringProfile) {
      currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, { hasClassroom: true });
    }
  });

  radioClassroomNo?.addEventListener('change', async () => {
    radioCardClassroomNo?.classList.add('selected');
    radioCardClassroomYes?.classList.remove('selected');
    setA11yVisibility(step2ClassroomSection, false);
    setA11yVisibility(step2PersonalMcpSection, true);
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

      const deployRes = await GasProvisionerService.provision(false);
      if (deployRes && deployRes.webAppUrl) {
        if (gasUrlInput) gasUrlInput.value = deployRes.webAppUrl;
        if (currentConfiguringProfile) {
          currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, {
            gasDeploymentUrl: deployRes.webAppUrl,
            gasScriptId: deployRes.scriptId
          });
        }

        // On successful creation, save API enabled status for this account and hide button 2
        const state = await chrome.storage.local.get(['personal_drive_account_email']);
        const parentAccount = state.personal_drive_account_email || '';
        await setGasApiEnabledStatus(parentAccount, true);
        setA11yVisibility(btnOpenApiSettings, false);
        if (btnCreateMcpServer) btnCreateMcpServer.textContent = '⚡ 2. Create / Update MCP Server';

        await WhatsAppDiagnosticLogger.log('SUCCESS', 'GAS', `Deployed MCP Server for ${kidName}: ${deployRes.webAppUrl}`);
        alert(`🎉 MCP Server successfully created for ${kidName}!`);
      }
    } catch (e: any) {
      // On failure, re-enable and show button 2 so the user can easily toggle API settings
      const state = await chrome.storage.local.get(['personal_drive_account_email']);
      const parentAccount = state.personal_drive_account_email || '';
      await setGasApiEnabledStatus(parentAccount, false);
      setA11yVisibility(btnOpenApiSettings, true);
      if (btnCreateMcpServer) btnCreateMcpServer.textContent = '⚡ 3. Create / Update MCP Server';

      alert(`MCP Server creation failed: ${e.message || String(e)}`);
    } finally {
      targetBtn.disabled = false;
      targetBtn.textContent = isPersonalAccount ? '⚡ 1-Click Create MCP Server in Personal Account' : (btnOpenApiSettings?.classList.contains('hidden') ? '⚡ 2. Create / Update MCP Server' : '⚡ 3. Create / Update MCP Server');
    }
  }

  btnCreateMcpServer?.addEventListener('click', () => deployMcpServer(false));
  btnCreatePersonalMcpServer?.addEventListener('click', () => deployMcpServer(true));

  btnNavStep2ToStep1?.addEventListener('click', () => showWizardStep(1));
  btnNavStep2ToStep3?.addEventListener('click', () => showWizardStep(3));

  // ==========================================
  // STEP 3 HANDLERS (TRACKED SCHOOL PORTALS)
  // ==========================================
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

  async function executePortalVerification() {
    if (!btnCaptureVerifyPortal) return;
    btnCaptureVerifyPortal.disabled = true;
    btnCaptureVerifyPortal.textContent = '⏳ Verifying Active Tab Connection...';
    setA11yVisibility(connectionStatusBox, true);
    if (connectionStatusIcon) connectionStatusIcon.textContent = '⏳';
    if (connectionStatusText) connectionStatusText.textContent = 'Querying active browser tab...';

    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.id || !activeTab.url || activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://')) {
        throw new Error('Please open your school portal tab (e.g. EduSprint, Canvas, Moodle) in Chrome and sign in first.');
      }

      const domain = new URL(activeTab.url).hostname;
      if (connectionStatusIcon) connectionStatusIcon.textContent = '✅';
      if (connectionStatusText) connectionStatusText.textContent = `Portal Connected! (${domain})`;
      setA11yVisibility(featureSection, true);
      renderStep3RegisteredTools();
    } catch (e: any) {
      if (connectionStatusIcon) connectionStatusIcon.textContent = '⚠️';
      if (connectionStatusText) connectionStatusText.textContent = `Error: ${e.message}`;
    } finally {
      btnCaptureVerifyPortal.disabled = false;
      btnCaptureVerifyPortal.textContent = '🚀 1. Capture & Verify Portal Connection';
    }
  }

  async function executeFeatureRegistration() {
    if (!btnRegisterFeature) return;
    btnRegisterFeature.disabled = true;
    btnRegisterFeature.textContent = '⏳ Auto-Capturing & Testing Active Feature...';

    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.id || !activeTab.url || activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://')) {
        throw new Error('Please open your school portal tab (e.g. EduSprint) in Chrome before clicking Capture.');
      }

      const domRes = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          const h1 = document.querySelector('h1, h2, .page-title, .title')?.textContent?.trim() || '';
          const activeNav = document.querySelector('.active, .selected, [aria-selected="true"], .nav-link.active')?.textContent?.trim() || '';
          const body = document.body ? document.body.innerText.substring(0, 1000) : '';
          return { title: document.title || '', h1, activeNav, body };
        }
      }).catch(() => null);

      const extracted = (domRes && domRes[0] && domRes[0].result) ? domRes[0].result : { title: activeTab.title || '', h1: '', activeNav: '', body: '' };
      const targetFeature = detectFeatureName(activeTab.url, extracted.title, extracted.h1, extracted.activeNav, extracted.body);
      const domain = new URL(activeTab.url).hostname;
      const funcSuffix = targetFeature.toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');

      const newTool = {
        domain,
        feature: targetFeature,
        name: `get_${funcSuffix}`,
        url: activeTab.url
      };

      let existingTools = currentConfiguringProfile?.registeredTools || [];
      const existingIdx = existingTools.findIndex((t: any) => t.feature === targetFeature || t.url === newTool.url);
      if (existingIdx >= 0) {
        existingTools[existingIdx] = newTool;
      } else {
        existingTools.push(newTool);
      }

      if (currentConfiguringProfile) {
        currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, { registeredTools: existingTools });
      }

      renderStep3RegisteredTools();
      alert(`🎉 Successfully captured & registered feature '${targetFeature}' for ${currentConfiguringProfile?.name || 'child'}!`);
    } catch (e: any) {
      alert(`Feature Registration Error: ${e.message}`);
    } finally {
      btnRegisterFeature.disabled = false;
      btnRegisterFeature.textContent = '📸 2. Auto-Capture & Register Active Feature';
    }
  }

  btnCaptureVerifyPortal?.addEventListener('click', executePortalVerification);
  btnRegisterFeature?.addEventListener('click', executeFeatureRegistration);

  btnAddAnotherPlatform?.addEventListener('click', () => {
    setA11yVisibility(featureSection, false);
    setA11yVisibility(connectionStatusBox, false);
    if (connectionStatusText) connectionStatusText.textContent = 'Verifying portal connection...';
    if (connectionStatusIcon) connectionStatusIcon.textContent = '⏳';
  });

  function renderStep3RegisteredTools() {
    if (!step3RegisteredToolsList) return;
    const tools = currentConfiguringProfile?.registeredTools || [];
    step3RegisteredToolsList.innerHTML = '';
    if (tools.length === 0) {
      setA11yVisibility(activeFeaturesBox, false);
      return;
    }
    setA11yVisibility(activeFeaturesBox, true);
    tools.forEach((t: any, idx: number) => {
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.style.padding = '6px 10px';
      li.style.marginBottom = '4px';
      li.style.backgroundColor = 'var(--card-surface)';
      li.style.borderRadius = '6px';
      li.style.border = '1px solid var(--border-color)';
      li.style.fontSize = '0.78rem';

      li.innerHTML = `<span>📌 <strong>${t.feature}</strong> <span style="color:var(--text-muted); font-size:0.72rem;">(${t.domain})</span></span>`;

      const actionsDiv = document.createElement('div');
      actionsDiv.style.display = 'flex';
      actionsDiv.style.gap = '4px';

      const btnRename = document.createElement('button');
      btnRename.className = 'btn btn-secondary btn-sm';
      btnRename.style.padding = '2px 8px';
      btnRename.style.fontSize = '0.7rem';
      btnRename.textContent = '✏️ Rename';
      btnRename.addEventListener('click', async () => {
        const newName = prompt(`Enter custom feature name for '${t.feature}' (e.g. Classwork, Homework, Attendance):`, t.feature);
        if (newName && newName.trim() && newName.trim() !== t.feature) {
          const clean = newName.trim().replace(/[^a-zA-Z0-9 _-]/g, '').substring(0, 30);
          t.feature = clean;
          t.name = `get_${clean.toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '')}`;
          if (currentConfiguringProfile) {
            currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, { registeredTools: tools });
          }
          renderStep3RegisteredTools();
        }
      });

      const btnDel = document.createElement('button');
      btnDel.className = 'btn btn-danger btn-sm';
      btnDel.style.padding = '2px 8px';
      btnDel.style.fontSize = '0.7rem';
      btnDel.textContent = '🗑️ Remove';
      btnDel.addEventListener('click', async () => {
        if (confirm(`Remove feature '${t.feature}' from tracked list?`)) {
          tools.splice(idx, 1);
          if (currentConfiguringProfile) {
            currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, { registeredTools: tools });
          }
          renderStep3RegisteredTools();
        }
      });

      actionsDiv.appendChild(btnRename);
      actionsDiv.appendChild(btnDel);
      li.appendChild(actionsDiv);
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
      openModal(invariantModal);
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
    closeModal(invariantModal);
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
