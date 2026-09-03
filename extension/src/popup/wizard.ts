import { ChildManager, ChildProfile } from '../services/childManager';
import { PersonalDriveService } from '../services/personalDriveService';
import { GasProvisionerService } from '../services/gasProvisioner';
import { WhatsAppDiagnosticLogger } from '../services/whatsappLogger';
import { SkillGeneratorService } from '../services/skillGenerator';

document.addEventListener('DOMContentLoaded', async () => {
  // Offline Banner
  const offlineBanner = document.getElementById('offlineBanner') as HTMLElement;

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

  // Progress & Deployment Overlays
  const mcpDeployProgressOverlay = document.getElementById('mcpDeployProgressOverlay') as HTMLElement;
  const mcpDeployProgressContainer = document.getElementById('mcpDeployProgressContainer') as HTMLElement;
  const mcpDeployProgressBar = document.getElementById('mcpDeployProgressBar') as HTMLElement;
  const lblMcpDeployTitle = document.getElementById('lblMcpDeployTitle') as HTMLElement;
  const lblMcpDeploySubtext = document.getElementById('lblMcpDeploySubtext') as HTMLElement;
  const lblMcpDeployPhase = document.getElementById('lblMcpDeployPhase') as HTMLElement;

  // Step 2 Guidance Modals
  const step2AccountGuidanceModal = document.getElementById('step2AccountGuidanceModal') as HTMLElement;
  const btnCancelAccountGuidanceModal = document.getElementById('btnCancelAccountGuidanceModal') as HTMLButtonElement;
  const btnProceedAccountGuidanceModal = document.getElementById('btnProceedAccountGuidanceModal') as HTMLButtonElement;

  const toolsAuthGuidanceModal = document.getElementById('toolsAuthGuidanceModal') as HTMLElement;
  const lblModalChildNameAuth = document.getElementById('lblModalChildNameAuth') as HTMLElement;
  const btnProceedToolsAuthModal = document.getElementById('btnProceedToolsAuthModal') as HTMLButtonElement;

  const modalConfirmSwitchStudentAccount = document.getElementById('modalConfirmSwitchStudentAccount') as HTMLElement;
  const lblSwitchChildName = document.getElementById('lblSwitchChildName') as HTMLElement;
  const btnCancelSwitchStudentModal = document.getElementById('btnCancelSwitchStudentModal') as HTMLButtonElement;
  const btnConfirmSwitchStudentModal = document.getElementById('btnConfirmSwitchStudentModal') as HTMLButtonElement;

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
  const fileChildPhoto = document.getElementById('fileChildPhoto') as HTMLInputElement;
  const btnUploadPhotoTrigger = document.getElementById('btnUploadPhotoTrigger') as HTMLButtonElement;
  const imgChildPhotoPreview = document.getElementById('imgChildPhotoPreview') as HTMLImageElement;
  const lblPhotoPlaceholder = document.getElementById('lblPhotoPlaceholder') as HTMLElement;
  const lblPhotoFileName = document.getElementById('lblPhotoFileName') as HTMLElement;
  const btnStep1SaveChild = document.getElementById('btnStep1SaveChild') as HTMLButtonElement;
  const step1ChildConfirmedBadge = document.getElementById('step1ChildConfirmedBadge') as HTMLElement;
  const lblStep1ActiveChild = document.getElementById('lblStep1ActiveChild') as HTMLElement;
  const imgConfirmedAvatar = document.getElementById('imgConfirmedAvatar') as HTMLImageElement;
  const lblConfirmedPlaceholder = document.getElementById('lblConfirmedPlaceholder') as HTMLElement;

  // Step 2 UI Elements
  const btnSkipStep2Top = document.getElementById('btnSkipStep2Top') as HTMLButtonElement;
  const btnSkipStep2Bottom = document.getElementById('btnSkipStep2Bottom') as HTMLButtonElement;
  const btnOpenClassroom = document.getElementById('btnOpenClassroom') as HTMLButtonElement;
  const btnOpenApiSettings = document.getElementById('btnOpenApiSettings') as HTMLButtonElement;
  const btnCreateMcpServer = document.getElementById('btnCreateMcpServer') as HTMLButtonElement;
  const step2InlineProgressBar = document.getElementById('step2InlineProgressBar') as HTMLElement;
  const lblStep2ProgressTitle = document.getElementById('lblStep2ProgressTitle') as HTMLElement;
  const lblStep2ProgressPercent = document.getElementById('lblStep2ProgressPercent') as HTMLElement;
  const step2ProgressFill = document.getElementById('step2ProgressFill') as HTMLElement;
  const lblStep2ProgressSubtext = document.getElementById('lblStep2ProgressSubtext') as HTMLElement;
  const step2ConnectedBadge = document.getElementById('step2ConnectedBadge') as HTMLElement;
  const lblStep2StudentEmail = document.getElementById('lblStep2StudentEmail') as HTMLElement;
  const btnTriggerSwitchStudentAccount = document.getElementById('btnTriggerSwitchStudentAccount') as HTMLButtonElement;
  const step2InitialSyncResults = document.getElementById('step2InitialSyncResults') as HTMLElement;
  const lblStep2InitialSyncSummary = document.getElementById('lblStep2InitialSyncSummary') as HTMLElement;
  const btnNavStep2ToStep1 = document.getElementById('btnNavStep2ToStep1') as HTMLButtonElement;
  const btnNavStep2ToStep3 = document.getElementById('btnNavStep2ToStep3') as HTMLButtonElement;

  // Step 3 UI Elements
  const btnSkipStep3 = document.getElementById('btnSkipStep3') as HTMLButtonElement;
  const connectionStatusBox = document.getElementById('connectionStatusBox') as HTMLElement;
  const connectionStatusIcon = document.getElementById('connectionStatusIcon') as HTMLElement;
  const connectionStatusText = document.getElementById('connectionStatusText') as HTMLElement;
  const featureSection = document.getElementById('featureSection') as HTMLElement;
  const btnCaptureVerifyPortal = document.getElementById('btnCaptureVerifyPortal') as HTMLButtonElement;
  const btnRegisterFeature = document.getElementById('btnRegisterFeature') as HTMLButtonElement;
  const activeFeaturesBox = document.getElementById('activeFeaturesBox') as HTMLElement;
  const step3RegisteredToolsList = document.getElementById('step3RegisteredToolsList') as HTMLUListElement;
  const btnNavStep3ToStep2 = document.getElementById('btnNavStep3ToStep2') as HTMLButtonElement;
  const btnNavStep3ToStep4 = document.getElementById('btnNavStep3ToStep4') as HTMLButtonElement;

  // Step 4 UI Elements
  const btnFinishChildSetup = document.getElementById('btnFinishChildSetup') as HTMLButtonElement;
  const btnFinishSetupBottom = document.getElementById('btnFinishSetupBottom') as HTMLButtonElement;
  const btnScanDriveExports = document.getElementById('btnScanDriveExports') as HTMLButtonElement;
  const driveExportsContainer = document.getElementById('driveExportsContainer') as HTMLElement;
  const driveExportsList = document.getElementById('driveExportsList') as HTMLElement;
  const btnCaptureActiveChat = document.getElementById('btnCaptureActiveChat') as HTMLButtonElement;
  const trackedChatsEmpty = document.getElementById('trackedChatsEmpty') as HTMLElement;
  const trackedChatsList = document.getElementById('trackedChatsList') as HTMLUListElement;
  const btnNavStep4ToStep3 = document.getElementById('btnNavStep4ToStep3') as HTMLButtonElement;

  // Family Dashboard Elements
  const familyProfilesList = document.getElementById('familyProfilesList') as HTMLElement;
  const btnAddAnotherKid = document.getElementById('btnAddAnotherKid') as HTMLButtonElement;
  const btnDownloadFamilySkill = document.getElementById('btnDownloadFamilySkill') as HTMLButtonElement;
  const lblStorageQuotaUsed = document.getElementById('lblStorageQuotaUsed') as HTMLElement;
  const storageQuotaProgressBar = document.getElementById('storageQuotaProgressBar') as HTMLElement;
  const lblKidsDataUsageText = document.getElementById('lblKidsDataUsageText') as HTMLElement;

  // Diagnostic Logs Elements
  const txtActivityLog = document.getElementById('txtActivityLog') as HTMLTextAreaElement;
  const btnFetchWhatsAppLogs = document.getElementById('btnFetchWhatsAppLogs') as HTMLButtonElement;
  const btnCopyActivityLog = document.getElementById('btnCopyActivityLog') as HTMLButtonElement;
  const btnClearWhatsAppLogs = document.getElementById('btnClearWhatsAppLogs') as HTMLButtonElement;

  let currentWizardStep = 1;
  let currentConfiguringProfile: ChildProfile | null = null;
  let currentPhotoDataUrl: string | null = null;
  let cachedPersonalToken: string | null = null;

  // Accessible Modal Manager (JAWS & Screen Reader Compliant)
  let activeModalTrigger: HTMLElement | null = null;
  let activeModalElement: HTMLElement | null = null;

  function openModal(modal: HTMLElement | null, triggerEl?: HTMLElement | null) {
    if (!modal) return;
    activeModalTrigger = triggerEl || (document.activeElement as HTMLElement) || null;
    activeModalElement = modal;

    // 1. Unhide and remove aria-hidden from modal (CRITICAL for JAWS / screen readers)
    modal.classList.remove('hidden');
    modal.removeAttribute('hidden');
    modal.removeAttribute('aria-hidden');
    modal.setAttribute('aria-modal', 'true');

    // 2. Hide background content from screen readers while modal is active
    const mainContainer = document.getElementById('mainAppContainer');
    if (mainContainer) {
      mainContainer.setAttribute('aria-hidden', 'true');
      try { (mainContainer as any).inert = true; } catch {}
    }

    // 3. Transfer focus directly into the modal heading / primary element so JAWS begins announcing immediately
    setTimeout(() => {
      const heading = modal.querySelector('h2, h3, [role="heading"], input:not([type="hidden"]), button:not([disabled])') as HTMLElement;
      if (heading) {
        if (!heading.hasAttribute('tabindex')) {
          heading.setAttribute('tabindex', '-1');
        }
        heading.focus();
      } else {
        modal.focus();
      }
    }, 80);
  }

  function closeModal(modal: HTMLElement | null, returnFocus = true) {
    if (!modal) return;
    activeModalElement = null;

    // 1. Hide and mark aria-hidden on modal
    modal.classList.add('hidden');
    modal.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
    modal.removeAttribute('aria-modal');

    // 2. Restore background container for screen readers
    const mainContainer = document.getElementById('mainAppContainer');
    if (mainContainer) {
      mainContainer.removeAttribute('aria-hidden');
      try { (mainContainer as any).inert = false; } catch {}
    }

    // 3. Return focus to the element that triggered the modal
    if (returnFocus && activeModalTrigger) {
      setTimeout(() => {
        activeModalTrigger?.focus();
        activeModalTrigger = null;
      }, 60);
    }
  }

  // Global Keyboard Listener for Modal Accessibility (Escape to close & Tab cycle trap)
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!activeModalElement || activeModalElement.classList.contains('hidden')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal(activeModalElement, true);
      return;
    }

    if (e.key === 'Tab') {
      const focusable = activeModalElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([hidden]), [href], input:not([disabled]):not([hidden]):not([type="hidden"]), select:not([disabled]):not([hidden]), textarea:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl || document.activeElement === activeModalElement) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
  });

  // Offline network status updater
  function updateOnlineStatus() {
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    setA11yVisibility(offlineBanner, isOffline);
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

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

  // Accessibility & Visibility Helper
  function setA11yVisibility(el: HTMLElement | null, isVisible: boolean) {
    if (!el) return;
    if (isVisible) {
      el.classList.remove('hidden');
      el.removeAttribute('hidden');
    } else {
      el.classList.add('hidden');
      el.setAttribute('hidden', '');
    }
  }

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
        dot.classList.remove('active', 'completed', 'disabled-dot');
        if (i === step) {
          dot.classList.add('active');
        } else if (i < step) {
          dot.classList.add('completed');
          dot.setAttribute('tabindex', '0');
          dot.style.cursor = 'pointer';
        } else {
          dot.classList.add('disabled-dot');
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

  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`dot${i}`);
    dot?.addEventListener('click', () => {
      if (i < currentWizardStep) showWizardStep(i);
    });
    dot?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (i < currentWizardStep) showWizardStep(i);
      }
    });
  }

  // View Navigation Controllers
  function showWizardStep(step: number) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ wizard_current_step: step }).catch(() => {});
    }

    setA11yVisibility(cardFamilyDashboard, false);
    setA11yVisibility(wizardStepper, true);
    if (stepBadge) setA11yVisibility(stepBadge, true);

    setA11yVisibility(cardStep1, step === 1);
    setA11yVisibility(cardStep2, step === 2);
    setA11yVisibility(cardStep3, step === 3);
    setA11yVisibility(cardStep4, step === 4);

    updateStepper(step);

    // Screen reader & keyboard accessibility: direct focus to the primary interactive element of the active step
    setTimeout(() => {
      if (step === 1) {
        if (step1ChildSetupBox && !step1ChildSetupBox.classList.contains('hidden')) {
          txtStep1ChildName?.focus();
        } else if (btnStep1ConnectPersonal && !btnStep1ConnectPersonal.classList.contains('hidden')) {
          btnStep1ConnectPersonal?.focus();
        }
      } else if (step === 2) {
        btnCreateMcpServer?.focus();
      } else if (step === 3) {
        btnCaptureVerifyPortal?.focus();
      } else if (step === 4) {
        btnCaptureActiveChat?.focus();
      }
    }, 120);
  }

  async function showFamilyDashboard() {
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
    await updateStorageQuotaMeter();
  }

  // Render Live Google Drive Storage Quota Meter
  async function updateStorageQuotaMeter() {
    try {
      const quota = await PersonalDriveService.getStorageQuotaInfo();
      if (lblStorageQuotaUsed) {
        lblStorageQuotaUsed.textContent = `${quota.usageReadable} / ${quota.limitReadable} (${quota.percentUsed}%)`;
      }
      if (storageQuotaProgressBar) {
        storageQuotaProgressBar.style.width = `${Math.min(quota.percentUsed, 100)}%`;
        storageQuotaProgressBar.style.background = quota.percentUsed >= 90 ? '#ef4444' : '#10b981';
      }
      if (lblKidsDataUsageText) {
        lblKidsDataUsageText.textContent = `K.I.D.S. Data: ${quota.kidsDataUsageReadable} (${quota.kidsDataPercentOfQuota}% of Drive quota)`;
      }
    } catch {}
  }

  // Render Family Dashboard Profiles
  async function renderFamilyDashboardProfiles() {
    if (!familyProfilesList) return;
    const profiles = await ChildManager.getProfiles(false);
    familyProfilesList.innerHTML = '';

    profiles.forEach(p => {
      const card = document.createElement('div');
      card.className = 'kid-profile-card';

      const year = p.academicYear || '2026-2027';
      const hasClassroom = Boolean(p.schoolGasDeploymentUrl || p.studentAccountEmail);
      const portalCount = (p.registeredTools && p.registeredTools.length) || 0;
      const chatCount = (p.trackedChats && p.trackedChats.length) || 0;
      const avatarSrc = p.photoDataUrl || '';

      card.innerHTML = `
        <div class="kid-profile-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="dashboard-avatar-circle" style="width: 34px; height: 34px; border-radius: 50%; overflow: hidden; background: #e2e8f0; border: 1.5px solid var(--brand-navy); display: flex; align-items: center; justify-content: center; cursor: pointer;" title="Click to update photo">
              ${avatarSrc ? `<img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: cover;" alt="${p.name}" />` : `<span style="font-size: 1.1rem;">👶</span>`}
            </div>
            <div>
              <span class="kid-name-badge" style="font-weight: 700; font-size: 0.88rem; color: var(--brand-navy);">${p.name}</span>
              <span class="kid-year-badge" style="font-size: 0.7rem; color: var(--text-muted); display: block;">${year}</span>
            </div>
          </div>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-secondary btn-sm btn-edit-kid" data-id="${p.id}" title="Edit Profile">✏️ Edit</button>
            <button class="btn btn-danger btn-sm btn-delete-kid" data-id="${p.id}" title="Remove Profile">🗑️</button>
          </div>
        </div>

        <div style="display: flex; gap: 6px; font-size: 0.72rem; color: var(--text-secondary); flex-wrap: wrap; margin-top: 4px;">
          <span>School: <strong>${hasClassroom ? '🟢 1-Min Cloud Sync' : '⏭️ Skipped'}</strong></span> •
          <span>Portals: <strong>${portalCount > 0 ? '🟢 6-Hr Cloud Sync' : '0'}</strong></span> •
          <span>Chats: <strong>${chatCount}</strong></span>
        </div>

        <div style="background: var(--card-surface); border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 8px; margin-top: 6px;">
          <div style="font-size: 0.7rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 2px;">
            📁 Google Drive Intelligence Vault: <span style="color: var(--brand-navy); font-weight: 700;">K.I.D.S. Data/${year}/${p.name}/</span>
          </div>
        </div>
      `;

      familyProfilesList.appendChild(card);
    });

    document.querySelectorAll('.btn-delete-kid').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id && confirm('Are you sure you want to remove this kid profile from the extension? All historical Google Drive files, photos, and assignments will be safely preserved 100% intact.')) {
          const res = await ChildManager.deleteProfile(id);
          if (res.remainingCount === 0) {
            showWizardStep(1);
          } else {
            await renderFamilyDashboardProfiles();
          }
        }
      });
    });
  }

  function populateStep1ForEditing(p: ChildProfile) {
    if (txtStep1ChildName) txtStep1ChildName.value = p.name;
    if (selStep1AcademicYear && p.academicYear) selStep1AcademicYear.value = p.academicYear;
    if (lblStep1ActiveChild) lblStep1ActiveChild.textContent = `${p.name} (${p.academicYear || '2026-2027'})`;

    if (p.photoDataUrl) {
      currentPhotoDataUrl = p.photoDataUrl;
      if (imgChildPhotoPreview) {
        imgChildPhotoPreview.src = p.photoDataUrl;
        imgChildPhotoPreview.classList.remove('hidden');
      }
      if (lblPhotoPlaceholder) lblPhotoPlaceholder.classList.add('hidden');
      if (imgConfirmedAvatar) {
        imgConfirmedAvatar.src = p.photoDataUrl;
        imgConfirmedAvatar.classList.remove('hidden');
      }
      if (lblConfirmedPlaceholder) lblConfirmedPlaceholder.classList.add('hidden');
    }

    step1ChildSetupBox?.classList.remove('hidden');
    step1ChildConfirmedBadge?.classList.remove('hidden');
  }

  // ==========================================
  // INITIAL STARTUP ROUTING
  // ==========================================
  const activeProfile = await ChildManager.getActiveProfile();
  const isFullyConfigured = activeProfile && Boolean(
    activeProfile.schoolGasDeploymentUrl ||
    activeProfile.personalGasDeploymentUrl ||
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
  if (!targetProfile) targetProfile = activeProfile;

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
    showWizardStep(savedStep);
  } else if (isFullyConfigured && activeProfile) {
    currentConfiguringProfile = activeProfile;
    await showFamilyDashboard();
  } else {
    showWizardStep(1);
  }

  dismissRestoringOverlay();

  // Check existing Personal Account login
  try {
    const state = await chrome.storage.local.get(['personal_drive_account_email', 'personal_drive_auth_token']);
    if (state.personal_drive_account_email) {
      cachedPersonalToken = state.personal_drive_auth_token || null;
      if (lblStep1AccountEmail) lblStep1AccountEmail.textContent = state.personal_drive_account_email;
      setA11yVisibility(step1ChildSetupBox, true);
      setA11yVisibility(btnStep1ConnectPersonal, false);
    } else {
      setA11yVisibility(btnStep1ConnectPersonal, true);
      setA11yVisibility(step1ChildSetupBox, false);
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
      if (lblStep1AccountEmail) lblStep1AccountEmail.textContent = auth.email;
      setA11yVisibility(step1ChildSetupBox, true);
      setA11yVisibility(btnStep1ConnectPersonal, false);
      setTimeout(() => txtStep1ChildName?.focus(), 150);
      await WhatsAppDiagnosticLogger.log('SUCCESS', 'AUTH', `Authenticated parent account: ${auth.email}`);

      try {
        const restored = await PersonalDriveService.restoreAllProfilesFromDrive(auth.token);
        if (restored.restoredCount > 0) {
          const active = await ChildManager.getActiveProfile();
          if (active) {
            currentConfiguringProfile = active;
            populateStep1ForEditing(active);
          }
        }
      } catch (e) {}

      PersonalDriveService.syncFullModularHierarchy(auth.token).catch(() => {});
    } catch (e: any) {
      alert(`Google Sign-In failed: ${e.message || String(e)}`);
      btnStep1ConnectPersonal.textContent = '🔐 Sign in with Personal Google Account';
      btnStep1ConnectPersonal.disabled = false;
    }
  });

  btnUploadPhotoTrigger?.addEventListener('click', () => {
    fileChildPhoto?.click();
  });

  fileChildPhoto?.addEventListener('change', async () => {
    if (!fileChildPhoto.files || fileChildPhoto.files.length === 0) return;
    const file = fileChildPhoto.files[0];
    if (lblPhotoFileName) lblPhotoFileName.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          currentPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.85);

          if (imgChildPhotoPreview) {
            imgChildPhotoPreview.src = currentPhotoDataUrl;
            imgChildPhotoPreview.classList.remove('hidden');
          }
          if (lblPhotoPlaceholder) lblPhotoPlaceholder.classList.add('hidden');
          if (imgConfirmedAvatar) {
            imgConfirmedAvatar.src = currentPhotoDataUrl;
            imgConfirmedAvatar.classList.remove('hidden');
          }
          if (lblConfirmedPlaceholder) lblConfirmedPlaceholder.classList.add('hidden');
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
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
        academicYear: selectedYear,
        photoDataUrl: currentPhotoDataUrl || currentConfiguringProfile.photoDataUrl
      });
    } else {
      currentConfiguringProfile = await ChildManager.createProfile(validation.cleanName, selectedYear);
      if (currentPhotoDataUrl) {
        currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, {
          photoDataUrl: currentPhotoDataUrl
        });
      }
    }

    if (currentConfiguringProfile) {
      await ChildManager.setActiveProfileId(currentConfiguringProfile.id);
      await chrome.storage.local.set({ wizard_configuring_child_id: currentConfiguringProfile.id }).catch(() => {});
    }

    if (currentPhotoDataUrl) {
      PersonalDriveService.getValidToken(false).then(token => {
        if (token) {
          PersonalDriveService.uploadChildPhoto(token, validation.cleanName, selectedYear, currentPhotoDataUrl!).catch(() => {});
        }
      }).catch(() => {});
    }

    PersonalDriveService.getValidToken(false).then(token => {
      if (token) PersonalDriveService.syncFullModularHierarchy(token).catch(() => {});
    }).catch(() => {});

    if (lblStep1ActiveChild) {
      lblStep1ActiveChild.textContent = `${validation.cleanName} (${selectedYear})`;
    }
    step1ChildConfirmedBadge?.classList.remove('hidden');
    showWizardStep(2);
  });

  // ==========================================
  // STEP 2 HANDLERS
  // ==========================================
  function updateStep2View() {
    const isConnected = Boolean(currentConfiguringProfile?.schoolGasDeploymentUrl || currentConfiguringProfile?.studentAccountEmail);
    if (isConnected) {
      setA11yVisibility(step2ConnectedBadge, true);
      setA11yVisibility(step2InitialSyncResults, true);
      if (lblStep2StudentEmail) {
        lblStep2StudentEmail.textContent = currentConfiguringProfile?.studentAccountEmail || 'School Account Connected';
      }
      if (lblStep2InitialSyncSummary && currentConfiguringProfile) {
        lblStep2InitialSyncSummary.innerHTML = `Ingested Classroom courses & school emails into <code>K.I.D.S. Data/${currentConfiguringProfile.academicYear || '2026-2027'}/${currentConfiguringProfile.name}/</code>. 1-minute cloud background sync is active.`;
      }
      if (btnCreateMcpServer) btnCreateMcpServer.textContent = '⚡ Update School Cloud Worker';
    } else {
      setA11yVisibility(step2ConnectedBadge, false);
      setA11yVisibility(step2InitialSyncResults, false);
      if (btnCreateMcpServer) btnCreateMcpServer.textContent = '⚡ 3. Deploy School Cloud Worker & 1-Min Trigger';
    }
  }

  btnSkipStep2Top?.addEventListener('click', () => { showWizardStep(3); });
  btnSkipStep2Bottom?.addEventListener('click', () => { showWizardStep(3); });
  btnNavStep2ToStep1?.addEventListener('click', () => { showWizardStep(1); });
  btnNavStep2ToStep3?.addEventListener('click', () => { showWizardStep(3); });

  btnOpenClassroom?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://classroom.google.com' });
  });

  btnOpenApiSettings?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://script.google.com/home/usersettings' });
  });

  btnCreateMcpServer?.addEventListener('click', async () => {
    if (lblModalChildNameAuth && currentConfiguringProfile) {
      lblModalChildNameAuth.textContent = currentConfiguringProfile.name;
    }
    openModal(step2AccountGuidanceModal, btnCreateMcpServer);
  });

  btnCancelAccountGuidanceModal?.addEventListener('click', () => {
    closeModal(step2AccountGuidanceModal);
  });

  btnProceedAccountGuidanceModal?.addEventListener('click', () => {
    closeModal(step2AccountGuidanceModal, false);
    openModal(toolsAuthGuidanceModal);
  });

  btnProceedToolsAuthModal?.addEventListener('click', async () => {
    closeModal(toolsAuthGuidanceModal, false);
    setA11yVisibility(mcpDeployProgressOverlay, true);
    setA11yVisibility(step2InlineProgressBar, true);

    try {
      GasProvisionerService.setProgressCallback((pct, phase, sub) => {
        if (mcpDeployProgressBar) mcpDeployProgressBar.style.width = `${pct}%`;
        if (mcpDeployProgressContainer) {
          mcpDeployProgressContainer.setAttribute('aria-valuenow', String(pct));
          mcpDeployProgressContainer.setAttribute('aria-valuetext', `${phase}: ${sub}`);
        }
        if (lblMcpDeployTitle) lblMcpDeployTitle.textContent = `🚀 ${phase}`;
        if (lblMcpDeploySubtext) lblMcpDeploySubtext.textContent = sub;
        if (lblMcpDeployPhase) lblMcpDeployPhase.textContent = `Phase Progress: ${pct}% complete`;

        if (step2ProgressFill) step2ProgressFill.style.width = `${pct}%`;
        if (lblStep2ProgressPercent) lblStep2ProgressPercent.textContent = `${pct}%`;
        if (lblStep2ProgressTitle) lblStep2ProgressTitle.textContent = `🚀 ${phase}`;
        if (lblStep2ProgressSubtext) lblStep2ProgressSubtext.textContent = sub;
      });

      const parentToken = await PersonalDriveService.getValidToken(false);
      const kidFolderInfo = await PersonalDriveService.getOrCreateKidFolder(
        parentToken,
        currentConfiguringProfile?.name,
        currentConfiguringProfile?.academicYear
      );

      const studentToken = await GasProvisionerService.getAuthToken(true);
      const studentEmail = (await GasProvisionerService.getAuthenticatedUserEmail(studentToken)) || '';
      const domain = studentEmail.includes('@') ? studentEmail.split('@')[1] : '';

      if (studentEmail) {
        await PersonalDriveService.shareFolderWithStudentAccount(parentToken, kidFolderInfo.id, studentEmail).catch(() => {});
      }

      const deployResult = await GasProvisionerService.provisionSchoolWorker(
        studentToken,
        kidFolderInfo.id,
        currentConfiguringProfile?.name || 'Atharva',
        currentConfiguringProfile?.academicYear || '2026-2027',
        studentEmail,
        domain
      );

      currentConfiguringProfile = await ChildManager.getActiveProfile();
      updateStep2View();
      setA11yVisibility(mcpDeployProgressOverlay, false);
      setA11yVisibility(step2InlineProgressBar, false);

      if (lblStep2InitialSyncSummary) {
        const syncMetrics = (deployResult as any)?.initialSyncResult;
        const courses = syncMetrics?.classroom?.coursesCount ?? 'all active';
        const emails = syncMetrics?.gmail?.emailsCount ?? 'recent';
        lblStep2InitialSyncSummary.innerHTML = `✅ <strong>1-Time Sync Success!</strong> Ingested <strong>${courses} Classroom courses</strong> & <strong>${emails} school circulars</strong> into <code>K.I.D.S. Data/${currentConfiguringProfile?.academicYear || '2026-2027'}/${currentConfiguringProfile?.name}/</code>.<br><span style="color: #15803d; font-weight: 600;">⏱️ Autonomous 1-minute cloud worker is active.</span>`;
      }

      setA11yVisibility(step2InitialSyncResults, true);

      // Focus the continue button so JAWS announces next step
      setTimeout(() => {
        btnNavStep2ToStep3?.focus();
      }, 100);
    } catch (err: any) {
      setA11yVisibility(mcpDeployProgressOverlay, false);
      setA11yVisibility(step2InlineProgressBar, false);
      alert(`School Worker deployment failed: ${err.message || String(err)}`);
    }
  });

  btnTriggerSwitchStudentAccount?.addEventListener('click', () => {
    if (lblSwitchChildName && currentConfiguringProfile) {
      lblSwitchChildName.textContent = currentConfiguringProfile.name;
    }
    openModal(modalConfirmSwitchStudentAccount, btnTriggerSwitchStudentAccount);
  });

  btnCancelSwitchStudentModal?.addEventListener('click', () => {
    closeModal(modalConfirmSwitchStudentAccount);
  });

  btnConfirmSwitchStudentModal?.addEventListener('click', () => {
    closeModal(modalConfirmSwitchStudentAccount, false);
    btnCreateMcpServer?.click();
  });

  // ==========================================
  // STEP 3 HANDLERS
  // ==========================================
  btnSkipStep3?.addEventListener('click', () => { showWizardStep(4); });
  btnNavStep3ToStep2?.addEventListener('click', () => { showWizardStep(2); });
  btnNavStep3ToStep4?.addEventListener('click', () => { showWizardStep(4); });

  btnCaptureVerifyPortal?.addEventListener('click', () => {
    openModal(portalSecurityNoticeModal, btnCaptureVerifyPortal);
  });

  btnCancelPortalSecurityModal?.addEventListener('click', () => {
    closeModal(portalSecurityNoticeModal);
  });

  btnProceedPortalSecurityModal?.addEventListener('click', async () => {
    closeModal(portalSecurityNoticeModal, false);
    setA11yVisibility(connectionStatusBox, true);
    if (connectionStatusIcon) connectionStatusIcon.textContent = '⏳';
    if (connectionStatusText) connectionStatusText.textContent = 'Capturing active school portal session...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) throw new Error('No active browser tab found.');

      const urlObj = new URL(tab.url);
      const domain = urlObj.hostname;

      const cookies = await chrome.cookies.getAll({ domain });
      const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

      const parentToken = await PersonalDriveService.getValidToken(false);
      const kidFolderInfo = await PersonalDriveService.getOrCreateKidFolder(
        parentToken,
        currentConfiguringProfile?.name,
        currentConfiguringProfile?.academicYear
      );

      await PersonalDriveService.getOrCreateDomainPortalFolder(
        parentToken,
        currentConfiguringProfile?.name || 'Atharva',
        currentConfiguringProfile?.academicYear || '2026-2027',
        domain
      );

      if (!currentConfiguringProfile?.personalGasDeploymentUrl) {
        await GasProvisionerService.provisionPersonalWorker(
          parentToken,
          kidFolderInfo.id,
          currentConfiguringProfile?.name || 'Atharva',
          currentConfiguringProfile?.academicYear || '2026-2027'
        );
      }

      currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile!.id, {
        portalDomain: domain
      });

      if (connectionStatusIcon) connectionStatusIcon.textContent = '✅';
      if (connectionStatusText) connectionStatusText.textContent = `Portal Connected! (${domain})`;
      setA11yVisibility(featureSection, true);
      const childName = currentConfiguringProfile?.name || 'Atharva';
      await WhatsAppDiagnosticLogger.log('SUCCESS', 'PORTAL', `Connected school portal ${domain} for ${childName}`);
    } catch (e: any) {
      if (connectionStatusIcon) connectionStatusIcon.textContent = '❌';
      if (connectionStatusText) connectionStatusText.textContent = `Error: ${e.message || String(e)}`;
    }
  });

  btnRegisterFeature?.addEventListener('click', async () => {
    btnRegisterFeature.disabled = true;
    btnRegisterFeature.textContent = '📸 Capturing...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) throw new Error('No active tab.');

      const urlObj = new URL(tab.url);
      const domain = urlObj.hostname;
      const featureName = tab.title ? tab.title.split('-')[0].trim().substring(0, 30) : 'Homework';

      const cookies = await chrome.cookies.getAll({ domain });
      const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

      const parentToken = await PersonalDriveService.getValidToken(false);
      const kidFolderInfo = await PersonalDriveService.getOrCreateKidFolder(
        parentToken,
        currentConfiguringProfile?.name,
        currentConfiguringProfile?.academicYear
      );

      if (currentConfiguringProfile?.personalGasDeploymentUrl) {
        await fetch(currentConfiguringProfile.personalGasDeploymentUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'register_portal_job',
            params: {
              childId: currentConfiguringProfile.id,
              childName: currentConfiguringProfile.name,
              portalFolderId: kidFolderInfo.id,
              domain,
              feature: featureName,
              endpoint_spec: { url: tab.url },
              auth_spec: { cookies: cookieStr }
            }
          })
        });
      }

      const existingTools = currentConfiguringProfile?.registeredTools || [];
      existingTools.push({ name: `${domain}_${featureName}`, domain, feature: featureName, url: tab.url });

      currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile!.id, {
        registeredTools: existingTools
      });

      renderStep3RegisteredTools();
      await WhatsAppDiagnosticLogger.log('SUCCESS', 'PORTAL', `Registered feature "${featureName}" on ${domain}`);
      alert(`✅ Feature "${featureName}" registered! Personal Worker will scrape this every 6 hours.`);
    } catch (e: any) {
      alert(`Feature capture failed: ${e.message || String(e)}`);
    } finally {
      btnRegisterFeature.disabled = false;
      btnRegisterFeature.textContent = '📸 2. Auto-Capture & Register Active Feature';
    }
  });

  function renderStep3RegisteredTools() {
    if (!step3RegisteredToolsList) return;
    step3RegisteredToolsList.innerHTML = '';
    const tools = currentConfiguringProfile?.registeredTools || [];

    if (tools.length === 0) {
      setA11yVisibility(activeFeaturesBox, false);
      return;
    }

    setA11yVisibility(activeFeaturesBox, true);
    tools.forEach((t: any, idx: number) => {
      const li = document.createElement('li');
      li.style.cssText = 'background: #f8fafc; padding: 6px 8px; border-radius: 4px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem;';
      li.innerHTML = `
        <div>
          <strong>${t.feature || 'Feature'}</strong>
          <span style="font-size: 0.68rem; color: var(--text-muted); display: block;">${t.domain}</span>
        </div>
        <button class="btn btn-danger btn-sm btn-delete-tool" data-idx="${idx}" style="font-size: 0.65rem; padding: 2px 6px;">🗑️</button>
      `;
      step3RegisteredToolsList.appendChild(li);
    });

    document.querySelectorAll('.btn-delete-tool').forEach(b => {
      b.addEventListener('click', async (e) => {
        const idx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-idx') || '0', 10);
        const toolsList = currentConfiguringProfile?.registeredTools || [];
        toolsList.splice(idx, 1);
        currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile!.id, { registeredTools: toolsList });
        renderStep3RegisteredTools();
      });
    });
  }

  // ==========================================
  // STEP 4 HANDLERS
  // ==========================================
  btnNavStep4ToStep3?.addEventListener('click', () => { showWizardStep(3); });

  btnFinishChildSetup?.addEventListener('click', async () => {
    await showFamilyDashboard();
  });
  btnFinishSetupBottom?.addEventListener('click', async () => {
    await showFamilyDashboard();
  });

  btnAddAnotherKid?.addEventListener('click', async () => {
    currentConfiguringProfile = null;
    currentPhotoDataUrl = null;
    if (txtStep1ChildName) txtStep1ChildName.value = '';
    if (imgChildPhotoPreview) {
      imgChildPhotoPreview.src = '';
      imgChildPhotoPreview.classList.add('hidden');
    }
    if (lblPhotoPlaceholder) lblPhotoPlaceholder.classList.remove('hidden');
    if (lblPhotoFileName) lblPhotoFileName.textContent = 'No file chosen';
    showWizardStep(1);
  });

  btnScanDriveExports?.addEventListener('click', async () => {
    btnScanDriveExports.disabled = true;
    btnScanDriveExports.textContent = '🔍 Scanning Google Drive...';
    try {
      const token = await PersonalDriveService.getValidToken(false);
      const res = await PersonalDriveService.searchDriveExports(token);
      setA11yVisibility(driveExportsContainer, true);
      if (driveExportsList) {
        driveExportsList.innerHTML = '';
        if (res.length === 0) {
          driveExportsList.innerHTML = '<div style="font-size: 0.72rem; color: var(--text-muted); font-style: italic;">No .zip or .txt chat export files found in Google Drive root.</div>';
        } else {
          res.forEach(f => {
            const row = document.createElement('div');
            row.style.cssText = 'background: #ffffff; border: 1px solid var(--border-color); border-radius: 4px; padding: 6px 8px; display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem;';
            const dateStr = f.modifiedTime || f.createdTime || '';
            const modDate = dateStr ? new Date(dateStr).toLocaleDateString() : '';
            const sizeStr = f.sizeReadable || f.size || '';
            row.innerHTML = `
              <div>
                <strong>${f.name}</strong>
                <span style="font-size: 0.66rem; color: var(--text-muted); display: block;">${sizeStr ? sizeStr + ' • ' : ''}${modDate}</span>
              </div>
              <button class="btn btn-primary btn-sm btn-import-export" data-id="${f.id}" data-name="${f.name}">📥 Import</button>
            `;
            driveExportsList.appendChild(row);
          });

          document.querySelectorAll('.btn-import-export').forEach(b => {
            b.addEventListener('click', async (e) => {
              const fileId = (e.currentTarget as HTMLElement).getAttribute('data-id') || '';
              const fileName = (e.currentTarget as HTMLElement).getAttribute('data-name') || 'Chat';
              (e.currentTarget as HTMLButtonElement).disabled = true;
              (e.currentTarget as HTMLElement).textContent = '⏳ Importing...';
              try {
                await PersonalDriveService.ingestWhatsAppExport(
                  fileId,
                  currentConfiguringProfile?.name || 'Atharva',
                  token
                );
                alert(`✅ Successfully imported ${fileName} with all attachments!`);
                renderStep4TrackedChats();
              } catch (impErr: any) {
                alert(`Import error: ${impErr.message || String(impErr)}`);
              }
            });
          });
        }
      }
    } catch (e: any) {
      alert(`Drive scan failed: ${e.message || String(e)}`);
    } finally {
      btnScanDriveExports.disabled = false;
      btnScanDriveExports.textContent = '🔍 Show Recent Uploads from Google Drive';
    }
  });

  btnCaptureActiveChat?.addEventListener('click', async () => {
    btnCaptureActiveChat.disabled = true;
    btnCaptureActiveChat.textContent = '📸 Tracking...';
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) throw new Error('No active chat tab.');

      const groupTitle = tab.title ? tab.title.split('-')[0].trim() : 'Class Group';
      const chats = currentConfiguringProfile?.trackedChats || [];
      chats.push({ name: groupTitle, addedAt: new Date().toISOString() });

      currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile!.id, {
        trackedChats: chats
      });

      renderStep4TrackedChats();
      alert(`✅ Tracked chat "${groupTitle}"! Serialized queue will sync updates automatically.`);
    } catch (e: any) {
      alert(`Chat capture failed: ${e.message || String(e)}`);
    } finally {
      btnCaptureActiveChat.disabled = false;
      btnCaptureActiveChat.textContent = '📸 1-Click Track Active Chat';
    }
  });

  function renderStep4TrackedChats() {
    if (!trackedChatsList) return;
    trackedChatsList.innerHTML = '';
    const chats = currentConfiguringProfile?.trackedChats || [];

    if (chats.length === 0) {
      setA11yVisibility(trackedChatsEmpty, true);
      return;
    }

    setA11yVisibility(trackedChatsEmpty, false);
    chats.forEach((c: any, idx: number) => {
      const li = document.createElement('li');
      li.style.cssText = 'background: #f8fafc; padding: 6px 8px; border-radius: 4px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem;';
      li.innerHTML = `
        <div>
          <strong>💬 ${c.name}</strong>
        </div>
        <button class="btn btn-danger btn-sm btn-delete-chat" data-idx="${idx}" style="font-size: 0.65rem; padding: 2px 6px;">🗑️</button>
      `;
      trackedChatsList.appendChild(li);
    });

    document.querySelectorAll('.btn-delete-chat').forEach(b => {
      b.addEventListener('click', async (e) => {
        const idx = parseInt((e.currentTarget as HTMLElement).getAttribute('data-idx') || '0', 10);
        const chatsList = currentConfiguringProfile?.trackedChats || [];
        chatsList.splice(idx, 1);
        currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile!.id, { trackedChats: chatsList });
        renderStep4TrackedChats();
      });
    });
  }

  // Diagnostic Logs Controls (Real-Time Live Streaming)
  async function refreshDiagnosticLogs() {
    if (!txtActivityLog) return;
    try {
      const logs = await WhatsAppDiagnosticLogger.getRecentLogs(35);
      txtActivityLog.value = logs;
      txtActivityLog.scrollTop = txtActivityLog.scrollHeight;
    } catch {}
  }

  GasProvisionerService.logCallback = (msg: string) => {
    if (!txtActivityLog) return;
    const time = new Date().toLocaleTimeString();
    const formatted = `[${time}] [INFO] [WA_GAS] ${msg}`;
    if (txtActivityLog.value === 'No WhatsApp diagnostic logs recorded yet.' || !txtActivityLog.value.trim()) {
      txtActivityLog.value = formatted;
    } else {
      txtActivityLog.value += `\n${formatted}`;
    }
    txtActivityLog.scrollTop = txtActivityLog.scrollHeight;
  };

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.whatsapp_diagnostic_logs) {
        refreshDiagnosticLogs();
      }
    });
  }

  refreshDiagnosticLogs();
  setInterval(refreshDiagnosticLogs, 2500);

  btnFetchWhatsAppLogs?.addEventListener('click', refreshDiagnosticLogs);
  btnCopyActivityLog?.addEventListener('click', async () => {
    if (txtActivityLog && txtActivityLog.value) {
      await navigator.clipboard.writeText(txtActivityLog.value);
      btnCopyActivityLog.textContent = '✅ Copied!';
      setTimeout(() => { btnCopyActivityLog.textContent = '📋 Copy Logs'; }, 1500);
    }
  });
  btnClearWhatsAppLogs?.addEventListener('click', async () => {
    await WhatsAppDiagnosticLogger.clearLogs();
    refreshDiagnosticLogs();
  });
});
