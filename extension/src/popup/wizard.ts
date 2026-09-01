import { ChildManager, ChildProfile } from '../services/childManager';
import { PersonalDriveService } from '../services/personalDriveService';
import { GasProvisionerService } from '../services/gasProvisioner';
import { AiNormalizerService } from '../services/aiNormalizer';
import { SkillGeneratorService } from '../services/skillGenerator';
import { WhatsAppDiagnosticLogger } from '../services/whatsappLogger';
import { SyncLifecycleManager } from '../services/syncLifecycleManager';

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
  const gamingAlertModal = document.getElementById('gamingAlertModal') as HTMLElement;
  const btnModalTrackGaming = document.getElementById('btnModalTrackGaming') as HTMLButtonElement;
  const btnModalContinueSkip = document.getElementById('btnModalContinueSkip') as HTMLButtonElement;
  const invariantModal = document.getElementById('invariantModal') as HTMLElement;
  const lblInvariantKidName = document.getElementById('lblInvariantKidName') as HTMLElement;
  const btnCloseInvariantModal = document.getElementById('btnCloseInvariantModal') as HTMLButtonElement;

  // Progress & Deployment Overlays
  const mcpDeployProgressOverlay = document.getElementById('mcpDeployProgressOverlay') as HTMLElement;
  const lblMcpDeployTitle = document.getElementById('lblMcpDeployTitle') as HTMLElement;
  const mcpDeployProgressBar = document.getElementById('mcpDeployProgressBar') as HTMLElement;
  const lblMcpDeploySubtext = document.getElementById('lblMcpDeploySubtext') as HTMLElement;
  const lblMcpDeployPhase = document.getElementById('lblMcpDeployPhase') as HTMLElement;

  // Step 2 Guidance Modals
  const step2AccountGuidanceModal = document.getElementById('step2AccountGuidanceModal') as HTMLElement;
  const lblModalAccountIcon = document.getElementById('lblModalAccountIcon') as HTMLElement;
  const lblModalAccountTitle = document.getElementById('lblModalAccountTitle') as HTMLElement;
  const boxModalAccountGuidance = document.getElementById('boxModalAccountGuidance') as HTMLElement;
  const lblModalAccountBadge = document.getElementById('lblModalAccountBadge') as HTMLElement;
  const lblModalAccountInstruction = document.getElementById('lblModalAccountInstruction') as HTMLElement;
  const lblModalAccountWarning = document.getElementById('lblModalAccountWarning') as HTMLElement;
  const btnCancelAccountGuidanceModal = document.getElementById('btnCancelAccountGuidanceModal') as HTMLButtonElement;
  const btnProceedAccountGuidanceModal = document.getElementById('btnProceedAccountGuidanceModal') as HTMLButtonElement;

  const toolsAuthGuidanceModal = document.getElementById('toolsAuthGuidanceModal') as HTMLElement;
  const lblToolsAuthInstruction = document.getElementById('lblToolsAuthInstruction') as HTMLElement;
  const lblToolsAuthBenefit = document.getElementById('lblToolsAuthBenefit') as HTMLElement;
  const btnProceedToolsAuthModal = document.getElementById('btnProceedToolsAuthModal') as HTMLButtonElement;

  // Step 3 Portal Security & Privacy Transparency Modal
  const portalSecurityNoticeModal = document.getElementById('portalSecurityNoticeModal') as HTMLElement;
  const btnCancelPortalSecurityModal = document.getElementById('btnCancelPortalSecurityModal') as HTMLButtonElement;
  const btnProceedPortalSecurityModal = document.getElementById('btnProceedPortalSecurityModal') as HTMLButtonElement;

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
  const btnSkipStep3 = document.getElementById('btnSkipStep3') as HTMLButtonElement;
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
  let isPendingDeploymentPersonal = false;
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
      const isPortalVerified = Boolean(
        currentConfiguringProfile?.portalDomain ||
        (currentConfiguringProfile?.registeredTools && currentConfiguringProfile.registeredTools.length > 0)
      );

      if (isPortalVerified) {
        setA11yVisibility(featureSection, true);
        setA11yVisibility(btnSkipStep3, false);
        setA11yVisibility(connectionStatusBox, true);
        if (connectionStatusIcon) connectionStatusIcon.textContent = '✅';
        if (connectionStatusText) {
          connectionStatusText.textContent = `Portal Connected! (${currentConfiguringProfile?.portalDomain || 'Active Portal'})`;
        }
      } else {
        setA11yVisibility(featureSection, false);
        setA11yVisibility(btnSkipStep3, true);
        setA11yVisibility(connectionStatusBox, false);
        if (connectionStatusIcon) connectionStatusIcon.textContent = '⏳';
        if (connectionStatusText) connectionStatusText.textContent = 'Verifying portal connection...';
      }
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

  if (targetProfile) {
    currentConfiguringProfile = targetProfile;
    await ChildManager.setActiveProfileId(targetProfile.id);
    if (targetProfile.name && !targetProfile.name.toLowerCase().startsWith('child 1')) {
      populateStep1ForEditing(targetProfile);
    }
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

      // Auto-restore child profiles, MCP servers, and Step 3 portal tools from Drive on machine change!
      try {
        const restored = await PersonalDriveService.restoreAllProfilesFromDrive(auth.token);
        if (restored.restoredCount > 0) {
          await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `🎉 Restored ${restored.restoredCount} child profile(s) from Google Drive.`);
          const active = await ChildManager.getActiveProfile();
          if (active) {
            currentConfiguringProfile = active;
            populateStep1ForEditing(active);
          }
        }
      } catch (e) {}

      // Immediately create/sync top-level K.I.D.S._Data_config.json and Year config in Drive
      PersonalDriveService.syncFullModularHierarchy(auth.token).catch(() => {});
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

    // Immediately persist 5-tier modular configs (K.I.D.S._Data_config.json, Year config, Kid config)
    PersonalDriveService.getValidToken(false).then(token => {
      if (token) PersonalDriveService.syncFullModularHierarchy(token).catch(() => {});
    }).catch(() => {});

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

    const kidName = currentConfiguringProfile?.name || 'Atharva';
    if (lblMcpDeployTitle) lblMcpDeployTitle.textContent = `Creating MCP Server for ${kidName}...`;
    if (mcpDeployProgressBar) mcpDeployProgressBar.style.width = '10%';
    if (lblMcpDeploySubtext) lblMcpDeploySubtext.textContent = 'Authenticating with Google Apps Script API...';
    if (lblMcpDeployPhase) lblMcpDeployPhase.textContent = 'Phase 1 of 5 (10%)';
    openModal(mcpDeployProgressOverlay);

    GasProvisionerService.setProgressCallback((percent, phaseText, subtext) => {
      if (mcpDeployProgressBar) mcpDeployProgressBar.style.width = `${percent}%`;
      if (lblMcpDeployPhase) lblMcpDeployPhase.textContent = phaseText;
      if (lblMcpDeploySubtext) lblMcpDeploySubtext.textContent = subtext;
    });

    try {
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
        
        // Hide progress overlay right before showing the final success alert
        closeModal(mcpDeployProgressOverlay);
        alert(`🎉 MCP Server successfully created for ${kidName}!`);
      }
    } catch (e: any) {
      // Hide progress overlay on error
      closeModal(mcpDeployProgressOverlay);

      // On failure, re-enable and show button 2 so the user can easily toggle API settings
      const state = await chrome.storage.local.get(['personal_drive_account_email']);
      const parentAccount = state.personal_drive_account_email || '';
      await setGasApiEnabledStatus(parentAccount, false);
      setA11yVisibility(btnOpenApiSettings, true);
      if (btnCreateMcpServer) btnCreateMcpServer.textContent = '⚡ 3. Create / Update MCP Server';

      alert(`MCP Server creation failed: ${e.message || String(e)}`);
    } finally {
      closeModal(mcpDeployProgressOverlay);
      GasProvisionerService.setProgressCallback(undefined);
      targetBtn.disabled = false;
      targetBtn.textContent = isPersonalAccount ? '⚡ 1-Click Create MCP Server in Personal Account' : (btnOpenApiSettings?.classList.contains('hidden') ? '⚡ 2. Create / Update MCP Server' : '⚡ 3. Create / Update MCP Server');
    }
  }

  btnCreateMcpServer?.addEventListener('click', () => {
    isPendingDeploymentPersonal = false;
    const kidName = currentConfiguringProfile?.name || 'Child';
    if (lblModalAccountIcon) lblModalAccountIcon.textContent = '🎓';
    if (lblModalAccountTitle) lblModalAccountTitle.textContent = `Select ${kidName}'s School Account`;
    if (lblModalAccountBadge) lblModalAccountBadge.textContent = '🎓 School Account Required:';
    if (lblModalAccountInstruction) {
      lblModalAccountInstruction.innerHTML = `On the upcoming Google Sign-In screen, please <strong>select or enter ${kidName}'s School Google Account</strong> (the student account enrolled in Google Classroom).`;
    }
    if (lblModalAccountWarning) {
      lblModalAccountWarning.innerHTML = `⚠️ <em>Do not select your parent personal account for Google Classroom MCP provisioning.</em>`;
    }
    if (boxModalAccountGuidance) {
      boxModalAccountGuidance.style.background = '#eff6ff';
      boxModalAccountGuidance.style.borderLeftColor = '#3b82f6';
      boxModalAccountGuidance.style.color = '#1e40af';
    }
    openModal(step2AccountGuidanceModal);
  });

  btnCreatePersonalMcpServer?.addEventListener('click', async () => {
    isPendingDeploymentPersonal = true;
    const state = await chrome.storage.local.get(['personal_drive_account_email']);
    const parentEmail = state.personal_drive_account_email || 'your personal email';
    const kidName = currentConfiguringProfile?.name || 'Child';

    if (lblModalAccountIcon) lblModalAccountIcon.textContent = '🔒';
    if (lblModalAccountTitle) lblModalAccountTitle.textContent = 'Select Your Personal Google Account';
    if (lblModalAccountBadge) lblModalAccountBadge.textContent = '🔒 Personal Account Required:';
    if (lblModalAccountInstruction) {
      lblModalAccountInstruction.innerHTML = `On the upcoming Google Sign-In screen, please <strong>select or enter your Personal Google Account</strong> (<code>${parentEmail}</code>) connected in Step 1 — <strong>not any other account</strong>.`;
    }
    if (lblModalAccountWarning) {
      lblModalAccountWarning.innerHTML = `⚠️ <em>Do not select any school, student, or work account.</em>`;
    }
    if (boxModalAccountGuidance) {
      boxModalAccountGuidance.style.background = '#f0fdf4';
      boxModalAccountGuidance.style.borderLeftColor = '#10b981';
      boxModalAccountGuidance.style.color = '#065f46';
    }
    openModal(step2AccountGuidanceModal);
  });

  btnCancelAccountGuidanceModal?.addEventListener('click', () => {
    closeModal(step2AccountGuidanceModal);
  });

  btnProceedAccountGuidanceModal?.addEventListener('click', () => {
    closeModal(step2AccountGuidanceModal);
    const kidName = currentConfiguringProfile?.name || 'Child';
    if (isPendingDeploymentPersonal) {
      if (lblToolsAuthInstruction) {
        lblToolsAuthInstruction.innerHTML = `On the Google Authorization screen, please <strong>allow / authorize all requested permissions</strong> (Google Drive storage, Gmail notices, and Calendar) for ${kidName}.`;
      }
      if (lblToolsAuthBenefit) {
        lblToolsAuthBenefit.innerHTML = `✅ <em>Authorizing all tools enables <strong>${kidName}</strong>'s personal MCP server to access your private storage and school notices seamlessly.</em>`;
      }
    } else {
      if (lblToolsAuthInstruction) {
        lblToolsAuthInstruction.innerHTML = `On the Google Authorization screen, please <strong>allow / authorize all requested permissions</strong> (Google Classroom, Google Drive, Gmail, and Calendar).`;
      }
      if (lblToolsAuthBenefit) {
        lblToolsAuthBenefit.innerHTML = `✅ <em>Authorizing all tools enables <strong>${kidName}</strong>'s MCP server to query assignments, coursework, worksheets, and teacher announcements seamlessly.</em>`;
      }
    }
    openModal(toolsAuthGuidanceModal);
  });

  btnProceedToolsAuthModal?.addEventListener('click', () => {
    closeModal(toolsAuthGuidanceModal);
    deployMcpServer(isPendingDeploymentPersonal);
  });

  btnNavStep2ToStep1?.addEventListener('click', () => showWizardStep(1));
  btnNavStep2ToStep3?.addEventListener('click', () => showWizardStep(3));

  // ==========================================
  // STEP 3 HANDLERS (TRACKED SCHOOL PORTALS & SKIP MODAL)
  // ==========================================
  btnSkipStep3?.addEventListener('click', () => {
    openModal(gamingAlertModal);
  });

  btnModalTrackGaming?.addEventListener('click', () => {
    closeModal(gamingAlertModal);
  });

  btnModalContinueSkip?.addEventListener('click', () => {
    closeModal(gamingAlertModal);
    showWizardStep(4);
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

  async function executePortalVerification() {
    if (!btnCaptureVerifyPortal) return;
    btnCaptureVerifyPortal.disabled = true;
    btnCaptureVerifyPortal.textContent = '⏳ Verifying Active Tab Connection...';
    setA11yVisibility(connectionStatusBox, true);
    if (connectionStatusIcon) connectionStatusIcon.textContent = '⏳';
    if (connectionStatusText) connectionStatusText.textContent = 'Querying active browser tab...';

    const kidName = currentConfiguringProfile?.name || 'Atharva';
    if (lblMcpDeployTitle) lblMcpDeployTitle.textContent = `Verifying Portal Connection for ${kidName}...`;
    if (mcpDeployProgressBar) mcpDeployProgressBar.style.width = '20%';
    if (lblMcpDeploySubtext) lblMcpDeploySubtext.textContent = 'Querying active school portal tab & domain...';
    if (lblMcpDeployPhase) lblMcpDeployPhase.textContent = 'Phase 1 of 4 (20%)';
    openModal(mcpDeployProgressOverlay);

    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.id || !activeTab.url || activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://')) {
        throw new Error('Please open your school portal tab (e.g. EduSprint, Canvas, Moodle) in Chrome and sign in first.');
      }

      const domain = new URL(activeTab.url).hostname;
      if (!currentConfiguringProfile) {
        currentConfiguringProfile = await ChildManager.getActiveProfile();
      }
      if (!currentConfiguringProfile) {
        const profs = await ChildManager.getProfiles(true);
        currentConfiguringProfile = profs[0];
      }

      // Progress Phase 2
      if (mcpDeployProgressBar) mcpDeployProgressBar.style.width = '50%';
      if (lblMcpDeploySubtext) lblMcpDeploySubtext.textContent = `Extracting active session authentication tokens for ${domain}...`;
      if (lblMcpDeployPhase) lblMcpDeployPhase.textContent = 'Phase 2 of 4 (50%)';

      // Extract active authentication cookies for the portal domain
      let capturedCookies = '';
      try {
        if (chrome.cookies) {
          const cookieList = await chrome.cookies.getAll({ url: activeTab.url });
          capturedCookies = cookieList.map(c => `${c.name}=${c.value}`).join('; ');
        }
      } catch (e) {}

      if (!capturedCookies) {
        try {
          const cookieRes = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: () => document.cookie || ''
          });
          capturedCookies = (cookieRes && cookieRes[0] && cookieRes[0].result) ? cookieRes[0].result : '';
        } catch (e) {}
      }

      // Progress Phase 3
      if (mcpDeployProgressBar) mcpDeployProgressBar.style.width = '80%';
      if (lblMcpDeploySubtext) lblMcpDeploySubtext.textContent = 'Testing connection handshake with Google Apps Script MCP Server...';
      if (lblMcpDeployPhase) lblMcpDeployPhase.textContent = 'Phase 3 of 4 (80%)';

      // Perform cloud handshake with Google Apps Script MCP Server if provisioned
      if (currentConfiguringProfile?.gasDeploymentUrl) {
        try {
          await fetch(currentConfiguringProfile.gasDeploymentUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'test_portal_connection',
              params: {
                domain,
                url: activeTab.url,
                cookies: capturedCookies
              },
              id: 'test-portal-conn'
            })
          });
        } catch (e) {}
      }
      
      const currentDomains = currentConfiguringProfile?.portalDomains || (currentConfiguringProfile?.portalDomain ? [currentConfiguringProfile.portalDomain] : []);
      if (!currentDomains.includes(domain)) {
        currentDomains.push(domain);
      }

      if (currentConfiguringProfile) {
        currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, { 
          portalDomain: domain,
          portalDomains: currentDomains
        });
      }

      // Progress Phase 4
      if (mcpDeployProgressBar) mcpDeployProgressBar.style.width = '100%';
      if (lblMcpDeploySubtext) lblMcpDeploySubtext.textContent = `Portal connection verified successfully (${domain})!`;
      if (lblMcpDeployPhase) lblMcpDeployPhase.textContent = 'Phase 4 of 4 (100%)';

      if (connectionStatusIcon) connectionStatusIcon.textContent = '✅';
      if (connectionStatusText) connectionStatusText.textContent = `Portal Connected & Handshake Verified! (${domain})`;
      setA11yVisibility(featureSection, true);
      setA11yVisibility(btnSkipStep3, false);
      renderStep3RegisteredTools();
      closeModal(mcpDeployProgressOverlay);
    } catch (e: any) {
      closeModal(mcpDeployProgressOverlay);
      if (connectionStatusIcon) connectionStatusIcon.textContent = '⚠️';
      if (connectionStatusText) connectionStatusText.textContent = `Error: ${e.message}`;
    } finally {
      closeModal(mcpDeployProgressOverlay);
      btnCaptureVerifyPortal.disabled = false;
      btnCaptureVerifyPortal.textContent = '🚀 1. Capture & Verify Portal Connection';
    }
  }

  async function executeFeatureRegistration() {
    if (!btnRegisterFeature) return;
    btnRegisterFeature.disabled = true;
    btnRegisterFeature.textContent = '⏳ Auto-Capturing & Testing Active Feature...';

    const kidName = currentConfiguringProfile?.name || 'Atharva';
    if (lblMcpDeployTitle) lblMcpDeployTitle.textContent = `Auto-Capturing Feature for ${kidName}...`;
    if (mcpDeployProgressBar) mcpDeployProgressBar.style.width = '20%';
    if (lblMcpDeploySubtext) lblMcpDeploySubtext.textContent = 'Analyzing active page DOM headings & navigation...';
    if (lblMcpDeployPhase) lblMcpDeployPhase.textContent = 'Phase 1 of 4 (20%)';
    openModal(mcpDeployProgressOverlay);

    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.id || !activeTab.url || activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://')) {
        throw new Error('Please open your school portal tab (e.g. EduSprint, Canvas, Khan Academy) in Chrome before clicking Capture.');
      }

      const domRes = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          const title = document.title || '';
          const headings = Array.from(document.querySelectorAll('h1, h2, h3, .page-title, .title, .card-header, .header-title, .breadcrumb-item.active, [data-testid="page-title"]'))
            .map(el => el.textContent?.trim())
            .filter(Boolean) as string[];
          const h1 = headings[0] || '';
          const activeNav = Array.from(document.querySelectorAll('.active, .selected, [aria-selected="true"], .nav-link.active, .menu-item-active, li.active a, .tab-active, [class*="active"]'))
            .map(el => el.textContent?.trim())
            .filter(t => t && t.length > 2 && t.length < 35)
            .join(' | ');
          const body = document.body ? document.body.innerText.substring(0, 1500) : '';
          return { title, h1, headings, activeNav, body };
        }
      }).catch(() => null);

      const extracted = (domRes && domRes[0] && domRes[0].result) ? domRes[0].result : { title: activeTab.title || '', h1: '', activeNav: '', body: '' };
      const domain = new URL(activeTab.url).hostname;
      const cleanDomainPrefix = domain.replace(/^www\./, '').split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

      if (!currentConfiguringProfile) {
        currentConfiguringProfile = await ChildManager.getActiveProfile();
      }
      if (!currentConfiguringProfile) {
        const profs = await ChildManager.getProfiles(true);
        currentConfiguringProfile = profs[0];
      }

      const currentDomains = currentConfiguringProfile?.portalDomains || (currentConfiguringProfile?.portalDomain ? [currentConfiguringProfile.portalDomain] : []);
      const isDomainVerified = currentDomains.some((d: string) => d.toLowerCase() === domain.toLowerCase());

      if (!isDomainVerified) {
        closeModal(mcpDeployProgressOverlay);
        setA11yVisibility(featureSection, false);
        setA11yVisibility(connectionStatusBox, true);
        if (connectionStatusIcon) connectionStatusIcon.textContent = 'ℹ️';
        if (connectionStatusText) connectionStatusText.textContent = `New portal detected: ${domain}. Please verify connection first.`;
        if (btnCaptureVerifyPortal) {
          btnCaptureVerifyPortal.disabled = false;
          btnCaptureVerifyPortal.textContent = `🚀 1. Capture & Verify Portal (${domain})`;
          btnCaptureVerifyPortal.focus();
        }
        alert(`⚠️ Unverified Portal (${domain}):\n\nPlease click "🚀 1. Capture & Verify Portal Connection" first to connect ${domain} before capturing its features.`);
        return;
      }

      let targetFeature = detectFeatureName(activeTab.url, extracted.title, extracted.h1, extracted.activeNav, extracted.body);
      let existingTools = currentConfiguringProfile?.registeredTools || [];

      // Auto-disambiguate generic features if capturing multiple items
      const duplicateCount = existingTools.filter((t: any) => (t.domain || '').toLowerCase() === domain.toLowerCase() && (t.feature || '').toLowerCase().startsWith(targetFeature.toLowerCase())).length;
      if (duplicateCount > 0 && targetFeature === 'School Feature') {
        targetFeature = `School Feature ${duplicateCount + 1}`;
      }

      const funcSuffix = targetFeature.toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');

      const newTool = {
        domain,
        feature: targetFeature,
        name: `get_${cleanDomainPrefix ? cleanDomainPrefix + '_' : ''}${funcSuffix}`,
        url: activeTab.url
      };

      // Progress Phase 2
      if (mcpDeployProgressBar) mcpDeployProgressBar.style.width = '55%';
      if (lblMcpDeploySubtext) lblMcpDeploySubtext.textContent = `Packaging security tokens & endpoint spec for ${targetFeature}...`;
      if (lblMcpDeployPhase) lblMcpDeployPhase.textContent = 'Phase 2 of 4 (55%)';

      // Extract active cookies for the auth payload
      let capturedCookies = '';
      try {
        if (chrome.cookies) {
          const cookieList = await chrome.cookies.getAll({ url: activeTab.url });
          capturedCookies = cookieList.map(c => `${c.name}=${c.value}`).join('; ');
        }
      } catch (e) {}

      if (!capturedCookies) {
        try {
          const cookieRes = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: () => document.cookie || ''
          });
          capturedCookies = (cookieRes && cookieRes[0] && cookieRes[0].result) ? cookieRes[0].result : '';
        } catch (e) {}
      }

      // Progress Phase 3
      if (mcpDeployProgressBar) mcpDeployProgressBar.style.width = '80%';
      if (lblMcpDeploySubtext) lblMcpDeploySubtext.textContent = `Registering '${targetFeature}' tool on Apps Script MCP Server...`;
      if (lblMcpDeployPhase) lblMcpDeployPhase.textContent = 'Phase 3 of 4 (80%)';

      // Register feature and authentication security payload on Google Apps Script MCP Server
      if (currentConfiguringProfile?.gasDeploymentUrl) {
        try {
          await fetch(currentConfiguringProfile.gasDeploymentUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'register_mcp_tool',
              params: {
                domain,
                feature: targetFeature,
                endpoint_spec: { url: activeTab.url, method: 'GET' },
                auth_spec: { cookies: capturedCookies },
                dom_snapshot: extracted.body || ''
              },
              id: 'reg-feature-tool'
            })
          });
        } catch (e) {
          console.warn('[wizard] GAS register_mcp_tool warning:', e);
        }
      }

      // SAFE DEDUPLICATION: Only update if BOTH domain and feature match exactly. Never overwrite different features on same URL!
      const existingIdx = existingTools.findIndex((t: any) => (t.feature || '').toLowerCase() === targetFeature.toLowerCase() && (t.domain || '').toLowerCase() === domain.toLowerCase());
      if (existingIdx >= 0) {
        existingTools[existingIdx] = newTool;
      } else {
        existingTools.push(newTool);
      }

      if (!currentDomains.includes(domain)) {
        currentDomains.push(domain);
      }

      if (currentConfiguringProfile) {
        currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, { 
          registeredTools: existingTools,
          portalDomain: domain,
          portalDomains: currentDomains
        });

        // Background sync to Drive 5-tier portal tools config
        PersonalDriveService.getValidToken(false).then(token => {
          if (token && currentConfiguringProfile) {
            PersonalDriveService.savePortalToolsConfig(token, currentConfiguringProfile.name, currentConfiguringProfile.academicYear, existingTools).catch(() => {});
          }
        }).catch(() => {});
      }

      // Progress Phase 4
      if (mcpDeployProgressBar) mcpDeployProgressBar.style.width = '100%';
      if (lblMcpDeploySubtext) lblMcpDeploySubtext.textContent = `Tool '${targetFeature}' registered & synced to Drive!`;
      if (lblMcpDeployPhase) lblMcpDeployPhase.textContent = 'Phase 4 of 4 (100%)';

      setA11yVisibility(btnSkipStep3, false);
      renderStep3RegisteredTools();
      closeModal(mcpDeployProgressOverlay);
      alert(`🎉 Successfully captured & registered feature '${targetFeature}' (${domain}) for ${currentConfiguringProfile?.name || 'child'}!`);
    } catch (e: any) {
      closeModal(mcpDeployProgressOverlay);
      alert(`Feature Registration Error: ${e.message}`);
    } finally {
      closeModal(mcpDeployProgressOverlay);
      btnRegisterFeature.disabled = false;
      btnRegisterFeature.textContent = '📸 2. Auto-Capture & Register Active Feature';
    }
  }

  btnCaptureVerifyPortal?.addEventListener('click', () => {
    openModal(portalSecurityNoticeModal);
  });

  btnCancelPortalSecurityModal?.addEventListener('click', () => {
    closeModal(portalSecurityNoticeModal);
  });

  btnProceedPortalSecurityModal?.addEventListener('click', () => {
    closeModal(portalSecurityNoticeModal);
    executePortalVerification();
  });

  btnRegisterFeature?.addEventListener('click', executeFeatureRegistration);

  btnAddAnotherPlatform?.addEventListener('click', async () => {
    setA11yVisibility(featureSection, false);
    setA11yVisibility(btnSkipStep3, (currentConfiguringProfile?.registeredTools?.length || 0) === 0);
    setA11yVisibility(connectionStatusBox, false);
    if (connectionStatusText) connectionStatusText.textContent = 'Verifying portal connection...';
    if (connectionStatusIcon) connectionStatusIcon.textContent = '⏳';
    if (btnCaptureVerifyPortal) {
      btnCaptureVerifyPortal.disabled = false;
      btnCaptureVerifyPortal.textContent = '🚀 1. Capture & Verify Portal Connection';
    }
  });

  async function renderStep3RegisteredTools() {
    if (!step3RegisteredToolsList) return;
    if (!currentConfiguringProfile) {
      currentConfiguringProfile = await ChildManager.getActiveProfile();
    }
    const tools = currentConfiguringProfile?.registeredTools || [];
    step3RegisteredToolsList.innerHTML = '';
    if (tools.length === 0) {
      setA11yVisibility(activeFeaturesBox, false);
      return;
    }
    setA11yVisibility(activeFeaturesBox, true);

    const domainGroups: { [domain: string]: any[] } = {};
    tools.forEach((t: any) => {
      const d = t.domain || 'General School Portal';
      if (!domainGroups[d]) domainGroups[d] = [];
      domainGroups[d].push(t);
    });

    Object.keys(domainGroups).forEach(dom => {
      const groupHeader = document.createElement('li');
      groupHeader.style.listStyle = 'none';
      groupHeader.style.fontSize = '0.74rem';
      groupHeader.style.fontWeight = 'bold';
      groupHeader.style.color = 'var(--primary-color, #2563eb)';
      groupHeader.style.padding = '6px 4px 2px 4px';
      groupHeader.style.borderBottom = '1px solid var(--border-color)';
      groupHeader.style.marginBottom = '4px';
      groupHeader.innerHTML = `🌐 ${dom} <span style="color:var(--text-muted); font-size:0.7rem; font-weight:normal;">(${domainGroups[dom].length} features)</span>`;
      step3RegisteredToolsList.appendChild(groupHeader);

      domainGroups[dom].forEach((t: any) => {
        const globalIdx = tools.indexOf(t);
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

        li.innerHTML = `<span>📌 <strong>${t.feature}</strong> <code style="font-size:0.7rem; color:var(--text-muted);">${t.name}</code></span>`;

        const actionsDiv = document.createElement('div');
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '4px';

        const btnRename = document.createElement('button');
        btnRename.className = 'btn btn-secondary btn-sm';
        btnRename.style.padding = '2px 8px';
        btnRename.style.fontSize = '0.7rem';
        btnRename.textContent = '✏️ Rename';
        btnRename.addEventListener('click', async () => {
          const newName = prompt(`Enter custom feature name for '${t.feature}':`, t.feature);
          if (newName && newName.trim() && newName.trim() !== t.feature) {
            const clean = newName.trim().replace(/[^a-zA-Z0-9 _-]/g, '').substring(0, 30);
            t.feature = clean;
            const cleanDomainPrefix = (t.domain || '').replace(/^www\./, '').split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            t.name = `get_${cleanDomainPrefix ? cleanDomainPrefix + '_' : ''}${clean.toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '')}`;
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
          if (confirm(`Remove feature '${t.feature}' (${t.domain}) from tracked list?`)) {
            if (globalIdx >= 0) {
              tools.splice(globalIdx, 1);
            }
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

  btnStopActiveSync?.addEventListener('click', async () => {
    btnStopActiveSync.disabled = true;
    btnStopActiveSync.textContent = '⏳ Stopping...';
    try {
      await SyncLifecycleManager.requestAbort();
      await WhatsAppDiagnosticLogger.log('INFO', 'CONN', '⏹️ [USER_ABORT] Manual sync cancellation requested by user.');
      alert('⏹️ Sync stopped.');
    } catch (e: any) {
      alert(`Stop error: ${e.message}`);
    } finally {
      setA11yVisibility(btnStopActiveSync, false);
      btnStopActiveSync.disabled = false;
      btnStopActiveSync.textContent = '⏹️ Stop Sync';
      if (btnCaptureActiveChat) {
        btnCaptureActiveChat.disabled = false;
        btnCaptureActiveChat.textContent = '📸 1-Click Track Active Chat';
      }
    }
  });

  async function renderStep4TrackedChats() {
    if (!trackedChatsList) return;
    const state = await chrome.storage.local.get(['tracked_whatsapp_chats']);
    const list: any[] = state.tracked_whatsapp_chats || currentConfiguringProfile?.trackedChats || [];
    trackedChatsList.innerHTML = '';
    if (list.length === 0) {
      setA11yVisibility(trackedChatsEmpty, true);
      return;
    }
    setA11yVisibility(trackedChatsEmpty, false);

    list.forEach((c, idx) => {
      const li = document.createElement('li');
      li.style.fontSize = '0.76rem';
      li.style.padding = '6px 10px';
      li.style.marginBottom = '4px';
      li.style.background = 'var(--card-surface)';
      li.style.borderRadius = '6px';
      li.style.border = '1px solid var(--border-color)';
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';

      const platformIcon = c.platform === 'telegram' ? '✈️' : (c.platform === 'discord' ? '🎮' : '💬');
      const platformName = (c.platform || 'WhatsApp').toUpperCase();

      const infoDiv = document.createElement('div');
      infoDiv.style.flex = '1';
      infoDiv.style.marginRight = '8px';
      infoDiv.style.lineHeight = '1.3';
      infoDiv.innerHTML = `
        <div>${platformIcon} <strong>${c.title}</strong> <span style="font-size:0.68rem; color:var(--text-muted);">[${platformName}]</span></div>
        <div style="font-size:0.68rem; color:var(--success-color);">● Active Sync & Auto-Archive</div>
      `;

      const actionsDiv = document.createElement('div');
      actionsDiv.style.display = 'flex';
      actionsDiv.style.gap = '4px';

      const btnSyncNow = document.createElement('button');
      btnSyncNow.className = 'btn btn-secondary btn-sm';
      btnSyncNow.style.padding = '2px 8px';
      btnSyncNow.style.fontSize = '0.7rem';
      btnSyncNow.textContent = '🔄 Sync';
      btnSyncNow.addEventListener('click', async () => {
        btnSyncNow.disabled = true;
        btnSyncNow.textContent = '⏳...';
        try {
          const res = await chrome.runtime.sendMessage({
            type: 'SYNC_WHATSAPP_CHATS',
            payload: { isManualSync: true, targetChat: c.title }
          });
          if (res && res.status === 'success') {
            alert(`🎉 Synced ${c.title}!`);
          }
        } catch (e: any) {
          alert(`Sync error: ${e.message}`);
        } finally {
          btnSyncNow.disabled = false;
          btnSyncNow.textContent = '🔄 Sync';
          await renderStep4TrackedChats();
        }
      });

      const btnRemove = document.createElement('button');
      btnRemove.className = 'btn btn-danger btn-sm';
      btnRemove.style.padding = '2px 8px';
      btnRemove.style.fontSize = '0.7rem';
      btnRemove.textContent = '🗑️ Remove';
      btnRemove.addEventListener('click', async () => {
        if (confirm(`Remove "${c.title}" from tracked school chat groups?`)) {
          list.splice(idx, 1);
          await chrome.storage.local.set({ tracked_whatsapp_chats: list });
          if (currentConfiguringProfile) {
            currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, {
              trackedChats: list
            });
            // Update 5-tier messaging tools config on Drive
            PersonalDriveService.getValidToken(false).then(tok => {
              if (tok && currentConfiguringProfile) {
                PersonalDriveService.saveMessagingToolsConfig(tok, currentConfiguringProfile.name, currentConfiguringProfile.academicYear, list).catch(() => {});
              }
            }).catch(() => {});
          }
          await renderStep4TrackedChats();
        }
      });

      actionsDiv.appendChild(btnSyncNow);
      actionsDiv.appendChild(btnRemove);

      li.appendChild(infoDiv);
      li.appendChild(actionsDiv);
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
