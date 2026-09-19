import { ChildManager, ChildProfile } from '../services/childManager';
import { PersonalDriveService } from '../services/personalDriveService';
import { GasProvisionerService } from '../services/gasProvisioner';
import { WhatsAppDiagnosticLogger } from '../services/whatsappLogger';
import { SkillGeneratorService } from '../services/skillGenerator';
import { AuthService } from '../services/authService';
import { ClassroomBrowserExtractor } from '../services/classroomBrowserExtractor';

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
  // Screen Reader Live Announcer
  const jawsLiveAnnouncer = document.getElementById('jawsLiveAnnouncer') as HTMLElement;

  // Persistent Global Background Sync Status Banner Elements
  const globalSyncBanner = document.getElementById('globalSyncBanner') as HTMLElement;
  const globalSyncIcon = document.getElementById('globalSyncIcon') as HTMLElement;
  const globalSyncTitle = document.getElementById('globalSyncTitle') as HTMLElement;
  const globalSyncSubtext = document.getElementById('globalSyncSubtext') as HTMLElement;
  const globalSyncBadge = document.getElementById('globalSyncBadge') as HTMLElement;
  const globalSyncProgressBarContainer = document.getElementById('globalSyncProgressBarContainer') as HTMLElement;
  const globalSyncProgressBar = document.getElementById('globalSyncProgressBar') as HTMLElement;

  // Progress & Deployment Overlays
  const mcpDeployProgressOverlay = document.getElementById('mcpDeployProgressOverlay') as HTMLElement;
  const mcpDeployProgressContainer = document.getElementById('mcpDeployProgressContainer') as HTMLElement;
  const mcpDeployProgressBar = document.getElementById('mcpDeployProgressBar') as HTMLElement;
  const lblMcpDeployTitle = document.getElementById('lblMcpDeployTitle') as HTMLElement;
  const lblMcpDeploySubtext = document.getElementById('lblMcpDeploySubtext') as HTMLElement;
  const lblMcpDeployPhase = document.getElementById('lblMcpDeployPhase') as HTMLElement;
  const txtMcpOverlayLog = document.getElementById('txtMcpOverlayLog') as HTMLTextAreaElement;
  const boxOAuthDomainNotice = document.getElementById('boxOAuthDomainNotice') as HTMLElement;
  const btnCancelDeployToFallback = document.getElementById('btnCancelDeployToFallback') as HTMLButtonElement;

  // Step 2 Guidance Modals
  const step2AccountGuidanceModal = document.getElementById('step2AccountGuidanceModal') as HTMLElement;
  const btnCancelAccountGuidanceModal = document.getElementById('btnCancelAccountGuidanceModal') as HTMLButtonElement;
  const btnProceedAccountGuidanceModal = document.getElementById('btnProceedAccountGuidanceModal') as HTMLButtonElement;

  const toolsAuthGuidanceModal = document.getElementById('toolsAuthGuidanceModal') as HTMLElement;
  const lblModalChildNameAuth = document.getElementById('lblModalChildNameAuth') as HTMLElement;
  const btnCancelToolsAuthModal = document.getElementById('btnCancelToolsAuthModal') as HTMLButtonElement;
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
  const btnStep1BackToDashboard = document.getElementById('btnStep1BackToDashboard') as HTMLButtonElement;
  const lblStep1AccountEmail = document.getElementById('lblStep1AccountEmail') as HTMLElement;
  const btnStep1DisconnectPersonal = document.getElementById('btnStep1DisconnectPersonal') as HTMLButtonElement;
  const btnStep1ConnectPersonal = document.getElementById('btnStep1ConnectPersonal') as HTMLButtonElement;
  const step1MasterWorkerBox = document.getElementById('step1MasterWorkerBox') as HTMLElement;
  const step1MasterWorkerActionsContainer = document.getElementById('step1MasterWorkerActionsContainer') as HTMLElement;
  const btnStep1OpenApiSettings = document.getElementById('btnStep1OpenApiSettings') as HTMLButtonElement;
  const btnStep1VerifyApiStatus = document.getElementById('btnStep1VerifyApiStatus') as HTMLButtonElement;
  const btnStep1DeployMasterWorker = document.getElementById('btnStep1DeployMasterWorker') as HTMLButtonElement;
  const step1PreConsentModal = document.getElementById('step1PreConsentModal') as HTMLElement;
  const btnCancelStep1PreConsentModal = document.getElementById('btnCancelStep1PreConsentModal') as HTMLButtonElement;
  const btnProceedStep1PreConsentModal = document.getElementById('btnProceedStep1PreConsentModal') as HTMLButtonElement;
  const step1ApiGuidanceModal = document.getElementById('step1ApiGuidanceModal') as HTMLElement;
  const btnCancelStep1ApiModal = document.getElementById('btnCancelStep1ApiModal') as HTMLButtonElement;
  const btnProceedStep1ApiModal = document.getElementById('btnProceedStep1ApiModal') as HTMLButtonElement;
  const step1MasterWorkerBadge = document.getElementById('step1MasterWorkerBadge') as HTMLElement;
  const lblStep1MasterWorkerDetails = document.getElementById('lblStep1MasterWorkerDetails') as HTMLElement;
  const step1ChildSetupBox = document.getElementById('step1ChildSetupBox') as HTMLElement;
  const txtStep1ChildName = document.getElementById('txtStep1ChildName') as HTMLInputElement;
  const lblStep1ChildNameLockBadge = document.getElementById('lblStep1ChildNameLockBadge') as HTMLElement;
  const btnStep1EditChildName = document.getElementById('btnStep1EditChildName') as HTMLButtonElement;
  const btnStep1SaveChildName = document.getElementById('btnStep1SaveChildName') as HTMLButtonElement;
  const btnStep1CancelChildName = document.getElementById('btnStep1CancelChildName') as HTMLButtonElement;
  const lblStep1NameError = document.getElementById('lblStep1NameError') as HTMLElement;
  const selStep1AcademicYear = document.getElementById('selStep1AcademicYear') as HTMLSelectElement;
  const lblStep1AcademicYearLockBadge = document.getElementById('lblStep1AcademicYearLockBadge') as HTMLElement;
  const btnStep1EditAcademicYear = document.getElementById('btnStep1EditAcademicYear') as HTMLButtonElement;
  const btnStep1SaveAcademicYear = document.getElementById('btnStep1SaveAcademicYear') as HTMLButtonElement;
  const btnStep1CancelAcademicYear = document.getElementById('btnStep1CancelAcademicYear') as HTMLButtonElement;
  const lblStep1YearError = document.getElementById('lblStep1YearError') as HTMLElement;
  const lblStep1RenameStatus = document.getElementById('lblStep1RenameStatus') as HTMLElement;
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
  const headingStep2 = document.getElementById('headingStep2') as HTMLElement;
  const lblStep2Subtitle = document.getElementById('lblStep2Subtitle') as HTMLElement;
  const tier2SheetContainer = document.getElementById('tier2SheetContainer') as HTMLElement;
  const btnOpenSetupSheetCopy = document.getElementById('btnOpenSetupSheetCopy') as HTMLButtonElement;
  const btnCopySetupSheetLink = document.getElementById('btnCopySetupSheetLink') as HTMLButtonElement;
  const lblSetupSheetStatus = document.getElementById('lblSetupSheetStatus') as HTMLElement;
  const lblStep2GuidanceTitle = document.getElementById('lblStep2GuidanceTitle') as HTMLElement;
  const lblStep2GuidanceBody = document.getElementById('lblStep2GuidanceBody') as HTMLElement;
  const btnStep2ConnectStudent = document.getElementById('btnStep2ConnectStudent') as HTMLButtonElement;
  const btnOpenApiSettings = document.getElementById('btnOpenApiSettings') as HTMLButtonElement;
  const btnStep2VerifyApiStatus = document.getElementById('btnStep2VerifyApiStatus') as HTMLButtonElement;
  const btnCreateMcpServer = document.getElementById('btnCreateMcpServer') as HTMLButtonElement;
  const step2ApiGuidanceModal = document.getElementById('step2ApiGuidanceModal') as HTMLElement;
  const lblStep2ApiChildName = document.getElementById('lblStep2ApiChildName') as HTMLElement;
  const btnCancelStep2ApiModal = document.getElementById('btnCancelStep2ApiModal') as HTMLButtonElement;
  const btnProceedStep2ApiModal = document.getElementById('btnProceedStep2ApiModal') as HTMLButtonElement;
  const modalAccountConflictAlert = document.getElementById('modalAccountConflictAlert') as HTMLElement;
  const lblConflictDetailText = document.getElementById('lblConflictDetailText') as HTMLElement;
  const btnCloseConflictModal = document.getElementById('btnCloseConflictModal') as HTMLButtonElement;
  const btnRetryAccountSelection = document.getElementById('btnRetryAccountSelection') as HTMLButtonElement;
  const step2InlineProgressBar = document.getElementById('step2InlineProgressBar') as HTMLElement;
  const iconStep2ScriptStatus = document.getElementById('iconStep2ScriptStatus') as HTMLElement;
  const lblStep2ScriptTitle = document.getElementById('lblStep2ScriptTitle') as HTMLElement;
  const lblStep2ScriptPercent = document.getElementById('lblStep2ScriptPercent') as HTMLElement;
  const step2ScriptProgressFill = document.getElementById('step2ScriptProgressFill') as HTMLElement;
  const lblStep2ScriptSubtext = document.getElementById('lblStep2ScriptSubtext') as HTMLElement;
  const iconStep2DataStatus = document.getElementById('iconStep2DataStatus') as HTMLElement;
  const lblStep2DataTitle = document.getElementById('lblStep2DataTitle') as HTMLElement;
  const lblStep2DataPercent = document.getElementById('lblStep2DataPercent') as HTMLElement;
  const step2DataProgressFill = document.getElementById('step2DataProgressFill') as HTMLElement;
  const lblStep2DataSubtext = document.getElementById('lblStep2DataSubtext') as HTMLElement;
  const step2ConnectedBadge = document.getElementById('step2ConnectedBadge') as HTMLElement;
  const lblStep2StudentEmail = document.getElementById('lblStep2StudentEmail') as HTMLElement;
  const btnTriggerSwitchStudentAccount = document.getElementById('btnTriggerSwitchStudentAccount') as HTMLButtonElement;
  const step2InitialSyncResults = document.getElementById('step2InitialSyncResults') as HTMLElement;
  const iconStep2SyncStatus = document.getElementById('iconStep2SyncStatus') as HTMLElement;
  const lblStep2SyncTitle = document.getElementById('lblStep2SyncTitle') as HTMLElement;
  const lblStep2InitialSyncSummary = document.getElementById('lblStep2InitialSyncSummary') as HTMLElement;
  const btnResumeInitialSync = document.getElementById('btnResumeInitialSync') as HTMLButtonElement;
  const btnNavStep2ToStep1 = document.getElementById('btnNavStep2ToStep1') as HTMLButtonElement;
  const btnNavStep2ToStep3 = document.getElementById('btnNavStep2ToStep3') as HTMLButtonElement;

  // Step 2 Multi-Tier Elements (Tier 2 Manual & Tier 3 Browser)
  const btnToggleManualOrBrowserSync = document.getElementById('btnToggleManualOrBrowserSync') as HTMLButtonElement;
  const iconToggleMultiTier = document.getElementById('iconToggleMultiTier') as HTMLElement;
  const boxMultiTierOptions = document.getElementById('boxMultiTierOptions') as HTMLElement;
  const step2DomainBlockBanner = document.getElementById('step2DomainBlockBanner') as HTMLElement;
  const tabTier2Manual = document.getElementById('tabTier2Manual') as HTMLButtonElement;
  const tabTier3Browser = document.getElementById('tabTier3Browser') as HTMLButtonElement;
  const tier2ManualContainer = document.getElementById('tier2ManualContainer') as HTMLElement;
  const tier3BrowserContainer = document.getElementById('tier3BrowserContainer') as HTMLElement;
  const btnCopySchoolWorkerCode = document.getElementById('btnCopySchoolWorkerCode') as HTMLButtonElement;
  const btnOpenScriptNew = document.getElementById('btnOpenScriptNew') as HTMLButtonElement;
  const lblCopyCodeToast = document.getElementById('lblCopyCodeToast') as HTMLElement;
  const txtManualWebAppUrl = document.getElementById('txtManualWebAppUrl') as HTMLInputElement;
  const btnConnectManualWorker = document.getElementById('btnConnectManualWorker') as HTMLButtonElement;
  const lblManualWorkerFeedback = document.getElementById('lblManualWorkerFeedback') as HTMLElement;
  const btnStartBrowserSync = document.getElementById('btnStartBrowserSync') as HTMLButtonElement;
  const chkEnableBrowserIncremental = document.getElementById('chkEnableBrowserIncremental') as HTMLInputElement;
  const browserSyncProgressBox = document.getElementById('browserSyncProgressBox') as HTMLElement;
  const lblBrowserSyncStatusText = document.getElementById('lblBrowserSyncStatusText') as HTMLElement;
  const lblBrowserSyncPercent = document.getElementById('lblBrowserSyncPercent') as HTMLElement;
  const browserSyncProgressBar = document.getElementById('browserSyncProgressBar') as HTMLElement;

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
  let hasOpenedStep2ApiSettings = false;

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

  // Accessibility & Visibility Helper (JAWS & Screen Reader Compliant)
  function setA11yVisibility(el: HTMLElement | null, isVisible: boolean) {
    if (!el) return;
    if (isVisible) {
      el.classList.remove('hidden');
      el.removeAttribute('hidden');
      el.removeAttribute('aria-hidden');
    } else {
      el.classList.add('hidden');
      el.setAttribute('hidden', '');
      el.setAttribute('aria-hidden', 'true');
    }
  }

  let renameStatusTimeout: any = null;
  function showRenameStatus(message: string, isError: boolean = false, autoDismissMs: number = 4000) {
    if (!lblStep1RenameStatus) return;
    if (renameStatusTimeout) {
      clearTimeout(renameStatusTimeout);
      renameStatusTimeout = null;
    }
    lblStep1RenameStatus.textContent = message;
    if (isError) {
      lblStep1RenameStatus.style.background = '#fef2f2';
      lblStep1RenameStatus.style.color = '#b91c1c';
      lblStep1RenameStatus.style.borderColor = '#fecaca';
    } else {
      lblStep1RenameStatus.style.background = '#f0fdf4';
      lblStep1RenameStatus.style.color = '#166534';
      lblStep1RenameStatus.style.borderColor = '#bbf7d0';
    }
    setA11yVisibility(lblStep1RenameStatus, true);
    if (autoDismissMs > 0) {
      renameStatusTimeout = setTimeout(() => {
        setA11yVisibility(lblStep1RenameStatus, false);
        renameStatusTimeout = null;
      }, autoDismissMs);
    }
  }

  type Step1Mode = 'initial' | 'locked' | 'editing_name' | 'editing_year';
  let currentStep1Mode: Step1Mode = 'initial';

  function setStep1Mode(mode: Step1Mode) {
    currentStep1Mode = mode;

    switch (mode) {
      case 'initial':
        // Initial setup for a new / unconfirmed child:
        // Clean editbox, clean dropdown, photo upload, confirm button
        // NO edit buttons, NO save buttons, NO cancel buttons, NO lock badges
        if (txtStep1ChildName) {
          txtStep1ChildName.readOnly = false;
          txtStep1ChildName.style.backgroundColor = '';
          txtStep1ChildName.style.color = '';
          txtStep1ChildName.style.borderColor = '';
        }
        setA11yVisibility(lblStep1ChildNameLockBadge, false);
        setA11yVisibility(btnStep1EditChildName, false);
        setA11yVisibility(btnStep1SaveChildName, false);
        setA11yVisibility(btnStep1CancelChildName, false);
        if (lblStep1NameError) setA11yVisibility(lblStep1NameError, false);

        if (selStep1AcademicYear) {
          selStep1AcademicYear.disabled = false;
          selStep1AcademicYear.style.backgroundColor = '';
          selStep1AcademicYear.style.color = '';
          selStep1AcademicYear.style.borderColor = '';
        }
        setA11yVisibility(lblStep1AcademicYearLockBadge, false);
        setA11yVisibility(btnStep1EditAcademicYear, false);
        setA11yVisibility(btnStep1SaveAcademicYear, false);
        setA11yVisibility(btnStep1CancelAcademicYear, false);
        if (lblStep1YearError) setA11yVisibility(lblStep1YearError, false);

        setA11yVisibility(step1ChildConfirmedBadge, false);
        setA11yVisibility(lblStep1RenameStatus, false);
        break;

      case 'locked':
        // Confirmed profile: fields are locked by default
        // Shows Locked badge and Edit button next to each field
        // Save and Cancel buttons are strictly HIDDEN
        if (txtStep1ChildName) {
          txtStep1ChildName.readOnly = true;
          txtStep1ChildName.style.backgroundColor = 'var(--surface-muted, #f8fafc)';
          txtStep1ChildName.style.color = 'var(--text-secondary, #475569)';
          txtStep1ChildName.style.borderColor = 'var(--border-color, #cbd5e1)';
        }
        setA11yVisibility(lblStep1ChildNameLockBadge, true);
        setA11yVisibility(btnStep1EditChildName, true);
        if (btnStep1EditChildName) btnStep1EditChildName.disabled = false;
        setA11yVisibility(btnStep1SaveChildName, false);
        setA11yVisibility(btnStep1CancelChildName, false);
        if (lblStep1NameError) setA11yVisibility(lblStep1NameError, false);

        if (selStep1AcademicYear) {
          selStep1AcademicYear.disabled = true;
          selStep1AcademicYear.style.backgroundColor = 'var(--surface-muted, #f8fafc)';
          selStep1AcademicYear.style.color = 'var(--text-secondary, #475569)';
          selStep1AcademicYear.style.borderColor = 'var(--border-color, #cbd5e1)';
        }
        setA11yVisibility(lblStep1AcademicYearLockBadge, true);
        setA11yVisibility(btnStep1EditAcademicYear, true);
        if (btnStep1EditAcademicYear) btnStep1EditAcademicYear.disabled = false;
        setA11yVisibility(btnStep1SaveAcademicYear, false);
        setA11yVisibility(btnStep1CancelAcademicYear, false);
        if (lblStep1YearError) setA11yVisibility(lblStep1YearError, false);

        setA11yVisibility(step1ChildConfirmedBadge, true);
        break;

      case 'editing_name':
        // User clicked "✏️ Edit Name":
        // Name input is editable, Save & Cancel buttons visible
        // Academic Year remains locked and cannot be edited concurrently
        if (txtStep1ChildName) {
          txtStep1ChildName.readOnly = false;
          txtStep1ChildName.style.backgroundColor = '';
          txtStep1ChildName.style.color = '';
          txtStep1ChildName.style.borderColor = '';
        }
        setA11yVisibility(lblStep1ChildNameLockBadge, false);
        setA11yVisibility(btnStep1EditChildName, false);
        setA11yVisibility(btnStep1SaveChildName, true);
        if (btnStep1SaveChildName) btnStep1SaveChildName.disabled = false;
        setA11yVisibility(btnStep1CancelChildName, true);
        if (btnStep1CancelChildName) btnStep1CancelChildName.disabled = false;

        if (selStep1AcademicYear) {
          selStep1AcademicYear.disabled = true;
          selStep1AcademicYear.style.backgroundColor = 'var(--surface-muted, #f8fafc)';
        }
        setA11yVisibility(lblStep1AcademicYearLockBadge, true);
        setA11yVisibility(btnStep1EditAcademicYear, true);
        if (btnStep1EditAcademicYear) btnStep1EditAcademicYear.disabled = true;
        setA11yVisibility(btnStep1SaveAcademicYear, false);
        setA11yVisibility(btnStep1CancelAcademicYear, false);
        break;

      case 'editing_year':
        // User clicked "✏️ Edit Year":
        // Academic Year dropdown is enabled, Save & Cancel buttons visible
        // Name remains locked and cannot be edited concurrently
        if (selStep1AcademicYear) {
          selStep1AcademicYear.disabled = false;
          selStep1AcademicYear.style.backgroundColor = '';
          selStep1AcademicYear.style.color = '';
          selStep1AcademicYear.style.borderColor = '';
        }
        setA11yVisibility(lblStep1AcademicYearLockBadge, false);
        setA11yVisibility(btnStep1EditAcademicYear, false);
        setA11yVisibility(btnStep1SaveAcademicYear, true);
        if (btnStep1SaveAcademicYear) btnStep1SaveAcademicYear.disabled = false;
        setA11yVisibility(btnStep1CancelAcademicYear, true);
        if (btnStep1CancelAcademicYear) btnStep1CancelAcademicYear.disabled = false;

        if (txtStep1ChildName) {
          txtStep1ChildName.readOnly = true;
          txtStep1ChildName.style.backgroundColor = 'var(--surface-muted, #f8fafc)';
        }
        setA11yVisibility(lblStep1ChildNameLockBadge, true);
        setA11yVisibility(btnStep1EditChildName, true);
        if (btnStep1EditChildName) btnStep1EditChildName.disabled = true;
        setA11yVisibility(btnStep1SaveChildName, false);
        setA11yVisibility(btnStep1CancelChildName, false);
        break;
    }
  }

  function setStep1ChildNameLocked(locked: boolean) {
    if (locked) {
      setStep1Mode('locked');
    } else {
      if (currentConfiguringProfile?.step1Confirmed || currentConfiguringProfile?.folderId) {
        setStep1Mode('editing_name');
      } else {
        setStep1Mode('initial');
      }
    }
  }

  function setStep1AcademicYearLocked(locked: boolean) {
    if (locked) {
      setStep1Mode('locked');
    } else {
      if (currentConfiguringProfile?.step1Confirmed || currentConfiguringProfile?.folderId) {
        setStep1Mode('editing_year');
      } else {
        setStep1Mode('initial');
      }
    }
  }

  // Stepper Visuals & Click Handlers
  const STEP_LABELS = [
    'Parent Account & Kid Profile',
    'Student School Account',
    'School Portals',
    'School Chat Groups'
  ];

  function updateStepper(step: number) {
    currentWizardStep = step;
    if (stepBadge) {
      stepBadge.textContent = `Step ${step} of 4`;
      stepBadge.setAttribute('aria-label', `Step ${step} of 4: ${STEP_LABELS[step - 1] || ''}`);
      stepBadge.style.background = 'var(--accent-color)';
    }

    for (let i = 1; i <= 4; i++) {
      const dot = document.getElementById(`dot${i}`) as HTMLButtonElement | null;
      const line = document.getElementById(`line${i}`);
      const title = STEP_LABELS[i - 1] || `Step ${i}`;
      if (dot) {
        dot.classList.remove('active', 'completed', 'disabled-dot');
        if (i === step) {
          dot.classList.add('active');
          dot.setAttribute('aria-current', 'step');
          dot.setAttribute('aria-label', `Step ${i}: ${title} (Current Step)`);
          dot.disabled = false;
          dot.removeAttribute('tabindex');
          dot.style.cursor = 'default';
        } else if (i < step) {
          dot.classList.add('completed');
          dot.removeAttribute('aria-current');
          dot.setAttribute('aria-label', `Step ${i}: ${title} (Completed, click to revisit)`);
          dot.disabled = false;
          dot.removeAttribute('tabindex');
          dot.style.cursor = 'pointer';
        } else {
          dot.classList.add('disabled-dot');
          dot.removeAttribute('aria-current');
          dot.setAttribute('aria-label', `Step ${i}: ${title} (Upcoming)`);
          dot.disabled = true;
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
    if (step === 1) {
      ChildManager.getProfiles(false).then(profiles => {
        const hasExisting = profiles.length > 0 && profiles.some(p => p.step1Confirmed || p.folderId || (p.name && !p.name.toLowerCase().startsWith('child 1')));
        setA11yVisibility(btnStep1BackToDashboard, hasExisting);
      }).catch(() => {});

      const isConfirmed = Boolean(
        currentConfiguringProfile?.step1Confirmed ||
        currentConfiguringProfile?.folderId ||
        (currentConfiguringProfile?.name && !currentConfiguringProfile.name.toLowerCase().startsWith('child 1') && (savedStep > 1 || isFullyConfigured || currentStep1Mode === 'locked'))
      );
      if (isConfirmed && currentConfiguringProfile && currentConfiguringProfile.name && !currentConfiguringProfile.name.toLowerCase().startsWith('child 1')) {
        populateStep1ForEditing(currentConfiguringProfile);
      } else {
        setStep1Mode('initial');
      }
    } else {
      setA11yVisibility(btnStep1BackToDashboard, false);
    }

    if (step === 2) {
      updateStep2View();
    }

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
        if (btnStep2ConnectStudent && !btnStep2ConnectStudent.classList.contains('hidden')) {
          btnStep2ConnectStudent?.focus();
        } else if (btnCreateMcpServer && !btnCreateMcpServer.classList.contains('hidden')) {
          btnCreateMcpServer?.focus();
        }
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
            <div class="dashboard-avatar-circle" data-id="${p.id}" style="width: 34px; height: 34px; border-radius: 50%; overflow: hidden; background: #e2e8f0; border: 1.5px solid var(--brand-navy); display: flex; align-items: center; justify-content: center; cursor: pointer;" title="Click to edit profile">
              ${avatarSrc ? `<img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: cover;" alt="${p.name}" />` : `<span style="font-size: 1.1rem;">👶</span>`}
            </div>
            <div>
              <span class="kid-name-badge" data-id="${p.id}" style="font-weight: 700; font-size: 0.88rem; color: var(--brand-navy); cursor: pointer;" title="Click to edit profile">${p.name}</span>
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

    document.querySelectorAll('.btn-edit-kid, .dashboard-avatar-circle, .kid-name-badge').forEach(el => {
      el.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (!id) return;
        const profiles = await ChildManager.getProfiles(false);
        const target = profiles.find(p => p.id === id);
        if (target) {
          currentConfiguringProfile = target;
          await ChildManager.setActiveProfileId(target.id);
          await chrome.storage.local.set({
            wizard_configuring_child_id: target.id,
            wizard_current_step: 1
          }).catch(() => {});
          showWizardStep(1);
          populateStep1ForEditing(target);
        }
      });
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
    } else {
      currentPhotoDataUrl = null;
      if (imgChildPhotoPreview) {
        imgChildPhotoPreview.src = '';
        imgChildPhotoPreview.classList.add('hidden');
      }
      if (lblPhotoPlaceholder) lblPhotoPlaceholder.classList.remove('hidden');
      if (imgConfirmedAvatar) {
        imgConfirmedAvatar.src = '';
        imgConfirmedAvatar.classList.add('hidden');
      }
      if (lblConfirmedPlaceholder) lblConfirmedPlaceholder.classList.remove('hidden');
    }

    setA11yVisibility(step1ChildSetupBox, true);
    setA11yVisibility(step1ChildConfirmedBadge, true);
    setStep1Mode('locked');
  }

  // ==========================================
  // INITIAL STARTUP ROUTING
  // ==========================================
  const activeProfile = await ChildManager.getActiveProfile();
  const isFullyConfigured = activeProfile && Boolean(
    activeProfile.schoolGasDeploymentUrl ||
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
    const isProfileConfirmed = Boolean(
      targetProfile.step1Confirmed ||
      targetProfile.folderId ||
      (targetProfile.name && !targetProfile.name.toLowerCase().startsWith('child 1') && (savedStep > 1 || isFullyConfigured))
    );
    if (isProfileConfirmed && targetProfile.name && !targetProfile.name.toLowerCase().startsWith('child 1')) {
      populateStep1ForEditing(targetProfile);
    } else {
      setStep1Mode('initial');
    }
  } else {
    setStep1Mode('initial');
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

  async function checkStep1ApiStatus(showModalIfDisabled: boolean = false): Promise<boolean> {
    try {
      const parentToken = await PersonalDriveService.getValidToken(false).catch(() => null);
      if (!parentToken) {
        setA11yVisibility(btnStep1DeployMasterWorker, false);
        setA11yVisibility(btnStep1OpenApiSettings, false);
        setA11yVisibility(btnStep1VerifyApiStatus, false);
        return false;
      }

      // Hide verify button permanently per user requirement
      setA11yVisibility(btnStep1VerifyApiStatus, false);

      const status = await GasProvisionerService.checkAccountAndApiStatus(parentToken);
      if (status.scopeInsufficient) {
        // If permissions are missing, NEVER ask for API enablement or show verify button!
        setA11yVisibility(btnStep1DeployMasterWorker, false);
        setA11yVisibility(btnStep1OpenApiSettings, false);
        await chrome.storage.local.remove([
          'personal_drive_auth_token',
          'personal_drive_connected',
          'personal_drive_account_email'
        ]);
        cachedPersonalToken = null;
        if (lblStep1AccountEmail) lblStep1AccountEmail.textContent = 'Not connected';
        setA11yVisibility(btnStep1DisconnectPersonal, false);
        setA11yVisibility(step1MasterWorkerBox, false);
        setA11yVisibility(step1ChildSetupBox, false);
        setA11yVisibility(btnStep1ConnectPersonal, true);
        if (btnStep1ConnectPersonal) {
          btnStep1ConnectPersonal.disabled = false;
          btnStep1ConnectPersonal.textContent = '🔐 Sign in with Personal Google Account';
        }
        if (showModalIfDisabled) {
          alert('⚠️ Missing Permissions:\n\nYou did not select all required checkboxes on Google\'s authorization screen:\n• Google Drive\n• Google Apps Script - Projects\n• Google Apps Script - Deployments\n\nPlease click "Sign in with Personal Google Account" again and make sure to check "Select all" (or check all 3 boxes).');
        }
        return false;
      }

      // Always show API enablement button and Deploy button directly
      setA11yVisibility(btnStep1OpenApiSettings, true);
      setA11yVisibility(btnStep1DeployMasterWorker, true);
      return status.apiEnabled || status.statusCode === 429;
    } catch {
      setA11yVisibility(btnStep1OpenApiSettings, true);
      setA11yVisibility(btnStep1DeployMasterWorker, true);
      setA11yVisibility(btnStep1VerifyApiStatus, false);
      return false;
    }
  }

  // Strict Step 1 UI Gating based on Personal Master Worker Presence
  function updateStep1MasterWorkerState(isDeployed: boolean, scriptId?: string) {
    if (isDeployed) {
      // 1. Worker is present: Hide API & Worker creation buttons, show active status
      setA11yVisibility(step1MasterWorkerActionsContainer, false);
      setA11yVisibility(step1MasterWorkerBadge, true);
      if (lblStep1MasterWorkerDetails && scriptId) {
        lblStep1MasterWorkerDetails.textContent = `Master Worker active (Script ID: ${scriptId.substring(0, 12)}...)`;
      }
      // 2. Display Child Name, Academic Year, Photo & Confirm button
      setA11yVisibility(step1ChildSetupBox, true);
    } else {
      // 1. Worker is NOT present: Display actions container and check API status
      setA11yVisibility(step1MasterWorkerActionsContainer, true);
      setA11yVisibility(step1MasterWorkerBadge, false);
      // 2. Do NOT display Child Name, Academic Year, Photo & Confirm button until worker is deployed
      setA11yVisibility(step1ChildSetupBox, false);

      // Directly display Enable API and Deploy buttons; never show verify button
      setA11yVisibility(btnStep1OpenApiSettings, true);
      setA11yVisibility(btnStep1DeployMasterWorker, true);
      setA11yVisibility(btnStep1VerifyApiStatus, false);

      // Check API enablement silently for parent account
      checkStep1ApiStatus(false);
    }
  }

  // Check existing Personal Account login
  try {
    const state = await chrome.storage.local.get(['personal_drive_account_email', 'personal_drive_auth_token']);
    if (state.personal_drive_account_email) {
      cachedPersonalToken = state.personal_drive_auth_token || null;
      if (lblStep1AccountEmail) lblStep1AccountEmail.textContent = state.personal_drive_account_email;
      setA11yVisibility(btnStep1DisconnectPersonal, true);
      setA11yVisibility(step1MasterWorkerBox, true);
      setA11yVisibility(btnStep1ConnectPersonal, false);

      // Default hidden until presence verified
      updateStep1MasterWorkerState(false);

      GasProvisionerService.getMasterWorkerStatus().then(status => {
        updateStep1MasterWorkerState(status.isDeployed, status.scriptId);
      }).catch(() => {
        updateStep1MasterWorkerState(false);
      });
    } else {
      setA11yVisibility(btnStep1DisconnectPersonal, false);
      setA11yVisibility(btnStep1ConnectPersonal, true);
      setA11yVisibility(step1MasterWorkerBox, false);
      setA11yVisibility(step1ChildSetupBox, false);
    }
  } catch {}


  // ==========================================
  // STEP 1 HANDLERS
  // ==========================================
  btnStep1OpenApiSettings?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://script.google.com/home/usersettings' });
  });

  btnProceedStep1ApiModal?.addEventListener('click', () => {
    closeModal(step1ApiGuidanceModal, false);
    chrome.tabs.create({ url: 'https://script.google.com/home/usersettings' });
    setA11yVisibility(btnStep1OpenApiSettings, true);
    setA11yVisibility(btnStep1DeployMasterWorker, true);
    setA11yVisibility(btnStep1VerifyApiStatus, false);
  });

  btnCancelStep1ApiModal?.addEventListener('click', () => {
    closeModal(step1ApiGuidanceModal);
  });

  btnStep1VerifyApiStatus?.addEventListener('click', async () => {
    btnStep1VerifyApiStatus.disabled = true;
    btnStep1VerifyApiStatus.textContent = '🔄 Verifying API Status...';
    try {
      const isOk = await checkStep1ApiStatus(true);
      if (isOk) {
        alert('✅ Google Apps Script API is verified and enabled! You can now deploy your Personal Master Cloud Worker.');
        if (jawsLiveAnnouncer) {
          jawsLiveAnnouncer.textContent = 'Google Apps Script API verified and enabled. Ready to deploy Master Worker.';
        }
      }
    } finally {
      btnStep1VerifyApiStatus.disabled = false;
      btnStep1VerifyApiStatus.textContent = '🔄 Verify Google Apps Script API Status';
    }
  });

  btnStep1DeployMasterWorker?.addEventListener('click', async () => {
    btnStep1DeployMasterWorker.disabled = true;
    btnStep1DeployMasterWorker.textContent = '⏳ Deploying Master Worker...';
    setA11yVisibility(mcpDeployProgressOverlay, true);

    try {
      GasProvisionerService.setProgressCallback((pct, phase, sub) => {
        if (mcpDeployProgressBar) mcpDeployProgressBar.style.width = `${pct}%`;
        if (mcpDeployProgressContainer) {
          mcpDeployProgressContainer.setAttribute('aria-valuenow', String(pct));
          mcpDeployProgressContainer.setAttribute('aria-valuetext', `Master Worker: ${pct} percent. ${phase}: ${sub}`);
        }
        if (lblMcpDeployTitle) lblMcpDeployTitle.textContent = `🚀 ${phase}`;
        if (lblMcpDeploySubtext) lblMcpDeploySubtext.textContent = sub;
        if (lblMcpDeployPhase) lblMcpDeployPhase.textContent = `Master Worker Progress: ${pct}% complete`;
        if (jawsLiveAnnouncer) jawsLiveAnnouncer.textContent = `Personal Master Worker deployment ${pct} percent. ${phase}. ${sub}`;
      });

      let parentToken = await PersonalDriveService.getValidToken(false);
      let res;
      try {
        const rootFolder = await PersonalDriveService.getOrCreateRootFolder(parentToken);
        res = await GasProvisionerService.provisionPersonalMasterWorker(parentToken, rootFolder.id);
      } catch (firstErr: any) {
        if (!firstErr.message?.includes('Permissions Incomplete') && firstErr.message && (firstErr.message.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') || firstErr.message.includes('insufficientPermissions'))) {
          GasProvisionerService.log('🔄 Requesting updated Google Apps Script permissions for Parent Account...');
          const auth = await PersonalDriveService.authenticatePersonalAccount();
          parentToken = auth.token;
          const rootFolder = await PersonalDriveService.getOrCreateRootFolder(parentToken);
          res = await GasProvisionerService.provisionPersonalMasterWorker(parentToken, rootFolder.id);
        } else {
          throw firstErr;
        }
      }

      setA11yVisibility(mcpDeployProgressOverlay, false);
      updateStep1MasterWorkerState(true, res.scriptId);
      setTimeout(() => txtStep1ChildName?.focus(), 150);
      alert('✅ Personal Master Cloud Worker deployed successfully! Your 24/7 cloud sync & portal engine is active.');
    } catch (e: any) {
      setA11yVisibility(mcpDeployProgressOverlay, false);
      const errMsg = e?.message || String(e);

      // Detect if deployment failed due to Google Apps Script API being disabled
      const isApiDisabled =
        errMsg.includes('not enabled the Apps Script API') ||
        errMsg.includes('API is disabled') ||
        errMsg.includes('usersettings') ||
        (errMsg.includes('403') && !errMsg.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') && !errMsg.includes('permissions missing'));

      if (isApiDisabled) {
        setA11yVisibility(btnStep1OpenApiSettings, true);
        if (btnStep1OpenApiSettings) {
          btnStep1OpenApiSettings.classList.remove('btn-secondary');
          btnStep1OpenApiSettings.classList.add('btn-primary');
          btnStep1OpenApiSettings.focus();
        }
        if (jawsLiveAnnouncer) {
          jawsLiveAnnouncer.textContent = 'Google Apps Script API is not enabled. Please enable it in Google Settings and retry.';
        }
        alert(
          '⚠️ Google Apps Script API is not enabled on your Personal Google Account.\n\n' +
          'To fix this:\n' +
          '1. We have opened Google Apps Script Settings for you in a new tab (https://script.google.com/home/usersettings).\n' +
          '2. Turn the toggle switch for Google Apps Script API to "ON".\n' +
          '3. Return here and click "⚡ Deploy Personal Master Cloud Worker" again.'
        );
        chrome.tabs.create({ url: 'https://script.google.com/home/usersettings' });
      } else {
        alert(`Master Worker deployment failed: ${errMsg}`);
      }
    } finally {
      setA11yVisibility(mcpDeployProgressOverlay, false);
      btnStep1DeployMasterWorker.disabled = false;
      if (btnStep1DeployMasterWorker.textContent?.includes('Deploying')) {
        btnStep1DeployMasterWorker.textContent = '⚡ Deploy Personal Master Cloud Worker';
      }
    }
  });

  btnStep1DisconnectPersonal?.addEventListener('click', async () => {
    btnStep1DisconnectPersonal.disabled = true;
    try {
      await chrome.storage.local.remove([
        'personal_drive_auth_token',
        'personal_drive_connected',
        'personal_drive_account_email'
      ]);
      cachedPersonalToken = null;
      if (lblStep1AccountEmail) lblStep1AccountEmail.textContent = 'Not connected';
      setA11yVisibility(btnStep1DisconnectPersonal, false);
      setA11yVisibility(step1MasterWorkerBox, false);
      setA11yVisibility(step1ChildSetupBox, false);
      setA11yVisibility(btnStep1ConnectPersonal, true);
      if (btnStep1ConnectPersonal) {
        btnStep1ConnectPersonal.disabled = false;
        btnStep1ConnectPersonal.textContent = '🔐 Sign in with Personal Google Account';
        btnStep1ConnectPersonal.focus();
      }
    } finally {
      btnStep1DisconnectPersonal.disabled = false;
    }
  });

  btnStep1ConnectPersonal?.addEventListener('click', () => {
    openModal(step1PreConsentModal, btnStep1ConnectPersonal);
  });

  btnCancelStep1PreConsentModal?.addEventListener('click', () => {
    closeModal(step1PreConsentModal);
  });

  btnProceedStep1PreConsentModal?.addEventListener('click', async () => {
    closeModal(step1PreConsentModal, false);
    btnStep1ConnectPersonal.disabled = true;
    btnStep1ConnectPersonal.textContent = '🔐 Signing in...';
    try {
      const auth = await PersonalDriveService.authenticatePersonalAccount();
      if (lblStep1AccountEmail) lblStep1AccountEmail.textContent = auth.email;
      setA11yVisibility(btnStep1DisconnectPersonal, true);
      setA11yVisibility(step1MasterWorkerBox, true);
      setA11yVisibility(btnStep1ConnectPersonal, false);
      await WhatsAppDiagnosticLogger.log('SUCCESS', 'AUTH', `Authenticated parent account: ${auth.email}`);

      updateStep1MasterWorkerState(false);

      GasProvisionerService.getMasterWorkerStatus(auth.token).then(async status => {
        updateStep1MasterWorkerState(status.isDeployed, status.scriptId);
        if (status.isDeployed) {
          setTimeout(() => txtStep1ChildName?.focus(), 150);
        } else {
          await checkStep1ApiStatus(true);
        }
      }).catch(async () => {
        updateStep1MasterWorkerState(false);
        await checkStep1ApiStatus(true);
      });

      try {
        const restored = await PersonalDriveService.restoreAllProfilesFromDrive(auth.token);
        if (restored.restoredCount > 0) {
          const active = await ChildManager.getActiveProfile();
          if (active) {
            currentConfiguringProfile = active;
            populateStep1ForEditing(active);
          }
        } else {
          // If 0 profiles restored from Drive, check if ChildManager already has a configured child profile locally
          const active = await ChildManager.getActiveProfile();
          if (active && active.name && !['child 1', 'child_1', 'child1'].includes(active.name.toLowerCase())) {
            currentConfiguringProfile = active;
            populateStep1ForEditing(active);
          }
        }
      } catch (e) {}

      PersonalDriveService.syncFullModularHierarchy(auth.token).catch(() => {});
    } catch (e: any) {
      await chrome.storage.local.remove([
        'personal_drive_auth_token',
        'personal_drive_connected',
        'personal_drive_account_email'
      ]);
      cachedPersonalToken = null;
      if (lblStep1AccountEmail) lblStep1AccountEmail.textContent = 'Not connected';
      setA11yVisibility(btnStep1DisconnectPersonal, false);
      setA11yVisibility(step1MasterWorkerBox, false);
      setA11yVisibility(step1ChildSetupBox, false);
      setA11yVisibility(btnStep1ConnectPersonal, true);
      btnStep1ConnectPersonal.textContent = '🔐 Sign in with Personal Google Account';
      btnStep1ConnectPersonal.disabled = false;
      const errMsg = e.message || String(e);
      if (errMsg.includes('Missing Permissions') || errMsg.includes('Authentication cancelled') || errMsg.includes('User cancelled')) {
        alert(errMsg);
      } else {
        alert(`Google Sign-In failed: ${errMsg}`);
      }
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

          if (currentConfiguringProfile && currentPhotoDataUrl) {
            ChildManager.updateProfile(currentConfiguringProfile.id, {
              photoDataUrl: currentPhotoDataUrl
            }).then(updated => {
              currentConfiguringProfile = updated;
              showRenameStatus('✅ Profile photo updated successfully!', false, 3000);
            }).catch(() => {});
            PersonalDriveService.getValidToken(false).then(token => {
              PersonalDriveService.uploadChildPhoto(token, currentConfiguringProfile!.name, currentConfiguringProfile!.academicYear || '2026-2027', currentPhotoDataUrl!).catch(() => {});
            }).catch(() => {});
          }
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });

  btnStep1BackToDashboard?.addEventListener('click', async () => {
    await showFamilyDashboard();
  });

  txtStep1ChildName?.addEventListener('input', () => {
    if (lblStep1NameError) setA11yVisibility(lblStep1NameError, false);
  });

  selStep1AcademicYear?.addEventListener('change', () => {
    if (lblStep1YearError) setA11yVisibility(lblStep1YearError, false);
  });

  txtStep1ChildName?.addEventListener('keydown', (e) => {
    if (!txtStep1ChildName.readOnly) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (currentStep1Mode === 'editing_name') {
          btnStep1SaveChildName?.click();
        } else {
          btnStep1SaveChild?.click();
        }
      } else if (e.key === 'Escape') {
        if (currentStep1Mode === 'editing_name') {
          e.preventDefault();
          btnStep1CancelChildName?.click();
        }
      }
    }
  });

  // Dedicated Child Name Edit Handlers
  btnStep1EditChildName?.addEventListener('click', () => {
    setStep1Mode('editing_name');
    txtStep1ChildName?.focus();
    if (txtStep1ChildName) {
      const len = txtStep1ChildName.value.length;
      txtStep1ChildName.setSelectionRange(len, len);
    }
  });

  btnStep1CancelChildName?.addEventListener('click', () => {
    if (txtStep1ChildName && currentConfiguringProfile) {
      txtStep1ChildName.value = currentConfiguringProfile.name;
    }
    setStep1Mode('locked');
    if (lblStep1NameError) setA11yVisibility(lblStep1NameError, false);
  });

  btnStep1SaveChildName?.addEventListener('click', async () => {
    const rawName = txtStep1ChildName?.value || '';
    const validation = ChildManager.validateFirstName(rawName);
    if (!validation.valid) {
      if (lblStep1NameError) {
        lblStep1NameError.textContent = validation.error || 'Invalid name';
        setA11yVisibility(lblStep1NameError, true);
      }
      return;
    }

    const cleanNew = validation.cleanName;
    const currentName = currentConfiguringProfile?.name || '';

    // No-Op check: Value unchanged
    if (cleanNew.toLowerCase() === currentName.toLowerCase()) {
      if (txtStep1ChildName) txtStep1ChildName.value = currentName;
      setStep1Mode('locked');
      showRenameStatus('No changes detected. Profile name remains locked.');
      return;
    }

    // Name changed: execute atomic in-place Drive rename
    btnStep1SaveChildName.disabled = true;
    btnStep1CancelChildName.disabled = true;
    showRenameStatus(`🔄 Renaming "${currentName}" to "${cleanNew}" in Google Drive...`, false, 0);

    try {
      const token = await PersonalDriveService.getValidToken(false);
      await PersonalDriveService.renameChildNameInPlace(
        token,
        currentName,
        cleanNew,
        currentConfiguringProfile?.academicYear,
        currentConfiguringProfile?.folderId
      );

      if (currentConfiguringProfile) {
        currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, {
          name: cleanNew,
          step1Confirmed: true
        });
      }

      if (txtStep1ChildName) txtStep1ChildName.value = cleanNew;
      if (lblStep1ActiveChild) {
        lblStep1ActiveChild.textContent = `${cleanNew} (${currentConfiguringProfile?.academicYear || '2026-2027'})`;
      }
      showRenameStatus(`✅ Profile renamed to "${cleanNew}" successfully!`, false, 4000);
    } catch (err: any) {
      showRenameStatus(`⚠️ Rename failed: ${err.message || String(err)}`, true, 6000);
    } finally {
      btnStep1SaveChildName.disabled = false;
      btnStep1CancelChildName.disabled = false;
      setStep1Mode('locked');
    }
  });

  // Dedicated Academic Year Edit Handlers
  btnStep1EditAcademicYear?.addEventListener('click', () => {
    setStep1Mode('editing_year');
    selStep1AcademicYear?.focus();
  });

  btnStep1CancelAcademicYear?.addEventListener('click', () => {
    if (selStep1AcademicYear && currentConfiguringProfile) {
      selStep1AcademicYear.value = currentConfiguringProfile.academicYear || '2026-2027';
    }
    setStep1Mode('locked');
    if (lblStep1YearError) setA11yVisibility(lblStep1YearError, false);
  });

  btnStep1SaveAcademicYear?.addEventListener('click', async () => {
    const selectedYear = selStep1AcademicYear?.value || '2026-2027';
    const currentYear = currentConfiguringProfile?.academicYear || '';

    // No-Op check: Value unchanged
    if (selectedYear === currentYear) {
      setStep1Mode('locked');
      showRenameStatus('No changes detected. Academic year remains locked.');
      return;
    }

    // Year changed: execute in-place Academic Year move
    btnStep1SaveAcademicYear.disabled = true;
    btnStep1CancelAcademicYear.disabled = true;
    showRenameStatus(`🔄 Moving child folder to academic year "${selectedYear}" in Google Drive...`, false, 0);

    try {
      const token = await PersonalDriveService.getValidToken(false);
      await PersonalDriveService.moveChildToNewAcademicYear(
        token,
        currentConfiguringProfile?.name || 'Child',
        currentYear,
        selectedYear,
        currentConfiguringProfile?.folderId
      );

      if (currentConfiguringProfile) {
        currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, {
          academicYear: selectedYear,
          step1Confirmed: true
        });
      }

      if (lblStep1ActiveChild) {
        lblStep1ActiveChild.textContent = `${currentConfiguringProfile?.name} (${selectedYear})`;
      }
      showRenameStatus(`✅ Academic year updated to "${selectedYear}" successfully!`, false, 4000);
    } catch (err: any) {
      showRenameStatus(`⚠️ Academic year update failed: ${err.message || String(err)}`, true, 6000);
    } finally {
      btnStep1SaveAcademicYear.disabled = false;
      btnStep1CancelAcademicYear.disabled = false;
      setStep1Mode('locked');
    }
  });

  btnStep1SaveChild?.addEventListener('click', async () => {
    // If child is already configured and locked, clicking continue simply moves to Step 2
    if (currentStep1Mode === 'locked' && currentConfiguringProfile) {
      showWizardStep(2);
      return;
    }

    if (currentStep1Mode === 'editing_name') {
      btnStep1SaveChildName?.click();
      return;
    }
    if (currentStep1Mode === 'editing_year') {
      btnStep1SaveAcademicYear?.click();
      return;
    }

    const rawName = txtStep1ChildName?.value || '';
    const validation = ChildManager.validateFirstName(rawName);
    if (!validation.valid) {
      if (lblStep1NameError) {
        lblStep1NameError.textContent = validation.error || 'Invalid name';
        setA11yVisibility(lblStep1NameError, true);
      }
      return;
    }

    const selectedYear = selStep1AcademicYear?.value || '2026-2027';

    if (!currentConfiguringProfile) {
      const existingProfiles = await ChildManager.getProfiles(false);
      const matched = existingProfiles.find(p => (p.name || '').trim().toLowerCase() === validation.cleanName.toLowerCase());
      if (matched) {
        currentConfiguringProfile = matched;
      }
    }

    if (currentConfiguringProfile) {
      currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, {
        name: validation.cleanName,
        academicYear: selectedYear,
        photoDataUrl: currentPhotoDataUrl || currentConfiguringProfile.photoDataUrl,
        step1Confirmed: true
      });
    } else {
      currentConfiguringProfile = await ChildManager.createProfile(validation.cleanName, selectedYear);
      if (currentPhotoDataUrl) {
        currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, {
          photoDataUrl: currentPhotoDataUrl,
          step1Confirmed: true
        });
      } else {
        currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, {
          step1Confirmed: true
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
    setA11yVisibility(step1ChildConfirmedBadge, true);
    setStep1Mode('locked');
    showWizardStep(2);
  });

  // ==========================================
  // STEP 2 HANDLERS
  // ==========================================
  async function checkStep2ApiStatus(showModalIfDisabled: boolean = false, tokenOverride?: string): Promise<boolean> {
    try {
      let studentToken: string | null | undefined = tokenOverride;
      if (!studentToken && typeof chrome !== 'undefined' && chrome.storage?.local) {
        try {
          const stored = await chrome.storage.local.get(['student_gas_token', 'student_gas_token_email']);
          if (stored.student_gas_token) {
            if (!currentConfiguringProfile?.studentAccountEmail || stored.student_gas_token_email === currentConfiguringProfile.studentAccountEmail) {
              studentToken = stored.student_gas_token;
            }
          }
        } catch {}
      }
      if (!studentToken) {
        studentToken = await GasProvisionerService.getAuthToken(false).catch(() => null);
      }
      if (!studentToken) {
        setA11yVisibility(btnCreateMcpServer, false);
        setA11yVisibility(btnOpenApiSettings, false);
        setA11yVisibility(btnStep2VerifyApiStatus, false);
        return false;
      }

      const status = await GasProvisionerService.checkAccountAndApiStatus(studentToken);
      if (status.apiEnabled || status.statusCode === 429) {
        hasOpenedStep2ApiSettings = false;
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          const childKey = `step2_has_opened_api_settings_${currentConfiguringProfile?.id || 'default'}`;
          await chrome.storage.local.remove(['step2_has_opened_api_settings', childKey]).catch(() => {});
        }
        setA11yVisibility(btnOpenApiSettings, false);
        setA11yVisibility(btnStep2VerifyApiStatus, false);
        setA11yVisibility(btnCreateMcpServer, true);
        if (step2ApiGuidanceModal && !step2ApiGuidanceModal.classList.contains('hidden')) {
          closeModal(step2ApiGuidanceModal, false);
        }
        return true;
      } else {
        setA11yVisibility(btnCreateMcpServer, false);

        if (status.scopeInsufficient) {
          setA11yVisibility(btnOpenApiSettings, false);
          setA11yVisibility(btnStep2VerifyApiStatus, false);
          if (showModalIfDisabled) {
            alert('⚠️ Missing Permissions:\n\nYou did not select all required checkboxes on Google\'s authorization screen for your student account:\n• Google Apps Script - Projects\n• Google Apps Script - Deployments\n\nPlease re-authorize your student account and make sure to check "Select all" (or check all boxes).');
          }
          return false;
        }

        // Restore persisted state in case popup closed when user switched to settings tab
        if (!hasOpenedStep2ApiSettings && typeof chrome !== 'undefined' && chrome.storage?.local) {
          try {
            const childKey = `step2_has_opened_api_settings_${currentConfiguringProfile?.id || 'default'}`;
            const storedFlags = await chrome.storage.local.get(['step2_has_opened_api_settings', childKey]);
            if (storedFlags.step2_has_opened_api_settings || storedFlags[childKey]) {
              hasOpenedStep2ApiSettings = true;
            }
          } catch {}
        }

        if (hasOpenedStep2ApiSettings) {
          // User already clicked the button to open settings page and turned toggle ON:
          // Reveal Deploy button so user can proceed directly without being blocked by propagation latency
          setA11yVisibility(btnCreateMcpServer, true);
          if (btnCreateMcpServer) {
            const childName = currentConfiguringProfile?.name || 'Atharva';
            btnCreateMcpServer.textContent = `⚡ 2. Deploy ${childName}'s School Cloud Worker & 1-Min Trigger`;
          }
          setA11yVisibility(btnStep2VerifyApiStatus, true);
          if (btnStep2VerifyApiStatus) {
            btnStep2VerifyApiStatus.classList.remove('btn-primary');
            btnStep2VerifyApiStatus.classList.add('btn-secondary');
            const childName = currentConfiguringProfile?.name || 'Student';
            btnStep2VerifyApiStatus.textContent = `🔄 Verify ${childName}'s Google Apps Script API Status`;
          }
          setA11yVisibility(btnOpenApiSettings, true);
          if (btnOpenApiSettings) {
            btnOpenApiSettings.classList.remove('btn-primary');
            btnOpenApiSettings.classList.add('btn-secondary');
            const childName = currentConfiguringProfile?.name || 'Student';
            btnOpenApiSettings.textContent = `🔗 Re-open Settings Page for ${childName}`;
          }
        } else {
          // API is disabled and user has not yet opened settings: show ONLY the button which takes to API enablement
          setA11yVisibility(btnCreateMcpServer, false);
          setA11yVisibility(btnOpenApiSettings, true);
          if (btnOpenApiSettings) {
            btnOpenApiSettings.classList.remove('btn-secondary');
            btnOpenApiSettings.classList.add('btn-primary');
            const childName = currentConfiguringProfile?.name || 'Student';
            btnOpenApiSettings.textContent = `🔗 2. Enable Google Apps Script API for ${childName}`;
          }
          setA11yVisibility(btnStep2VerifyApiStatus, false);
        }

        if (showModalIfDisabled && !hasOpenedStep2ApiSettings) {
          if (step2ApiGuidanceModal) {
            if (lblStep2ApiChildName && currentConfiguringProfile) {
              lblStep2ApiChildName.textContent = `${currentConfiguringProfile.name}'s school Google account`;
            }
            openModal(step2ApiGuidanceModal, btnOpenApiSettings);
          }
        }
        return false;
      }
    } catch {
      setA11yVisibility(btnCreateMcpServer, false);
      if (!hasOpenedStep2ApiSettings && typeof chrome !== 'undefined' && chrome.storage?.local) {
        try {
          const childKey = `step2_has_opened_api_settings_${currentConfiguringProfile?.id || 'default'}`;
          const storedFlags = await chrome.storage.local.get(['step2_has_opened_api_settings', childKey]);
          if (storedFlags.step2_has_opened_api_settings || storedFlags[childKey]) {
            hasOpenedStep2ApiSettings = true;
          }
        } catch {}
      }
      if (hasOpenedStep2ApiSettings) {
        setA11yVisibility(btnStep2VerifyApiStatus, true);
        setA11yVisibility(btnOpenApiSettings, true);
      } else {
        setA11yVisibility(btnOpenApiSettings, true);
        setA11yVisibility(btnStep2VerifyApiStatus, false);
      }
      return false;
    }
  }
  async function updateStep2View(showApiModal: boolean = false, tokenOverride?: string) {
    if (!currentConfiguringProfile) {
      try {
        currentConfiguringProfile = await ChildManager.getActiveProfile();
      } catch (e) {}
    }

    const isScriptCreated = Boolean(
      currentConfiguringProfile?.setupSheetCopyUrl ||
      currentConfiguringProfile?.schoolGasDeploymentUrl ||
      currentConfiguringProfile?.schoolGasScriptId
    );

    // Gated Button Visibility:
    // Before script creation: only "Skip" is visible, "Continue" is hidden.
    // After script creation: only "Continue" is visible, "Skip" is hidden.
    if (isScriptCreated) {
      setA11yVisibility(btnNavStep2ToStep3, true);
      setA11yVisibility(btnSkipStep2Top, false);
      setA11yVisibility(btnSkipStep2Bottom, false);
    } else {
      setA11yVisibility(btnNavStep2ToStep3, false);
      setA11yVisibility(btnSkipStep2Top, true);
      setA11yVisibility(btnSkipStep2Bottom, true);
    }

    const childName = currentConfiguringProfile?.name || 'Student';
    if (btnOpenSetupSheetCopy) {
      btnOpenSetupSheetCopy.textContent = currentConfiguringProfile?.name
        ? `🚀 Open ${childName}'s Sheet (Account Selector)`
        : '🚀 Open with Account Selector';
    }
    if (btnCopySetupSheetLink) {
      btnCopySetupSheetLink.textContent = '📋 Copy Link';
    }
    if (lblSetupSheetStatus) {
      if (currentConfiguringProfile?.lastSheetPushTimestamp) {
        lblSetupSheetStatus.textContent = `🟢 24/7 Cloud Sync Active (Last synced: ${new Date(currentConfiguringProfile.lastSheetPushTimestamp).toLocaleTimeString()})`;
        lblSetupSheetStatus.style.color = '#15803d';
        lblSetupSheetStatus.style.display = 'block';
      } else if (currentConfiguringProfile?.setupSheetCopyUrl) {
        lblSetupSheetStatus.textContent = '✅ Sheet template ready in Parent Drive. Click "Open with Account Selector" or "Copy Link".';
        lblSetupSheetStatus.style.color = '#15803d';
        lblSetupSheetStatus.style.display = 'block';
      } else {
        lblSetupSheetStatus.style.display = 'none';
      }
    }
    if (headingStep2) {
      headingStep2.textContent = currentConfiguringProfile?.name
        ? `Step 2: ${childName}'s School Google Account`
        : 'Step 2: Student School Google Account';
    }
    if (lblStep2Subtitle) {
      lblStep2Subtitle.textContent = currentConfiguringProfile?.name
        ? `Connect ${childName}'s school-provided Google account to sync teacher circulars, homework assignments, and worksheets every 1 minute.`
        : "Connect your child's school-provided Google account to sync teacher circulars, homework assignments, and worksheets every 1 minute.";
    }
    if (lblStep2GuidanceTitle) {
      lblStep2GuidanceTitle.textContent = currentConfiguringProfile?.name
        ? `🎓 ${childName}'s School Account Setup & 1-Min Cloud Worker:`
        : '🎓 Student Account Setup & 1-Min Cloud Worker:';
    }
    if (lblStep2GuidanceBody) {
      lblStep2GuidanceBody.innerHTML = currentConfiguringProfile?.name
        ? `Deploys an autonomous background worker in <strong>${childName}'s</strong> Google account that automatically syncs Google Classroom coursework and school Gmail circulars into your shared <code>K.I.D.S. Data/</code> Google Drive.`
        : `Deploys an autonomous background worker in the student's Google account that automatically syncs Google Classroom coursework and school Gmail circulars into your shared <code>K.I.D.S. Data/</code> Google Drive.`;
    }
    if (btnStep2ConnectStudent) {
      btnStep2ConnectStudent.textContent = `🔐 1. Sign In with ${childName}'s School Google Account`;
      btnStep2ConnectStudent.setAttribute('aria-label', `Sign in with ${childName}'s School Google Account`);
    }
    if (lblStep2ApiChildName) {
      lblStep2ApiChildName.textContent = `${childName}'s school Google account`;
    }
    if (btnOpenApiSettings) {
      btnOpenApiSettings.textContent = `🔗 2. Enable Google Apps Script API for ${childName}`;
      btnOpenApiSettings.setAttribute('aria-label', `Open Google Apps Script User Settings for ${childName}'s school account in new tab`);
    }
    if (btnStep2VerifyApiStatus) {
      btnStep2VerifyApiStatus.textContent = `🔄 Verify ${childName}'s Google Apps Script API Status`;
    }
    if (btnSkipStep2Top) {
      btnSkipStep2Top.textContent = currentConfiguringProfile?.name
        ? `⏭️ Skip ${childName}'s School Account`
        : '⏭️ Skip School Google Account';
    }
    if (btnSkipStep2Bottom) {
      btnSkipStep2Bottom.textContent = currentConfiguringProfile?.name
        ? `⏭️ Skip ${childName}'s School Account`
        : '⏭️ Skip School Google Account';
    }

    const isConnected = Boolean(isScriptCreated || currentConfiguringProfile?.studentAccountEmail);
    if (isConnected) {
      setA11yVisibility(step2ConnectedBadge, true);
      if (lblStep2StudentEmail) {
        lblStep2StudentEmail.textContent = currentConfiguringProfile?.studentAccountEmail || 'School Account Connected';
      }

      if (isScriptCreated) {
        setA11yVisibility(step2InitialSyncResults, true);
        if (lblStep2InitialSyncSummary && currentConfiguringProfile) {
          const profile = currentConfiguringProfile;
          try {
            const syncFlags = await chrome.storage.local.get([
              'step2_initial_sync_in_progress',
              'step2_initial_sync_complete',
              'step2_sync_status',
              'step2_initial_sync_summary',
              'classroom_attachment_progress',
              'step2_sync_active_child_name',
              'step2_sync_active_child_id',
              'multi_child_sync_queue'
            ]);

            const queue: any[] = Array.isArray(syncFlags.multi_child_sync_queue) ? syncFlags.multi_child_sync_queue : [];
            const isThisChildActive = (syncFlags.step2_sync_active_child_id && syncFlags.step2_sync_active_child_id === profile.id) ||
              (!syncFlags.step2_sync_active_child_id && profile.initialSyncStatus === 'IN_PROGRESS');
            const isThisChildQueued = profile.initialSyncStatus === 'QUEUED' ||
              queue.some(q => q.childId === profile.id);
            const isThisChildCompleted = profile.initialSyncStatus === 'COMPLETED' ||
              (!isThisChildActive && !isThisChildQueued && syncFlags.step2_initial_sync_complete);

            const isInterrupted = (syncFlags.step2_sync_status === 'INTERRUPTED' ||
              Boolean(syncFlags.classroom_attachment_progress?.interrupted) ||
              (!syncFlags.step2_initial_sync_complete && !syncFlags.step2_initial_sync_in_progress && syncFlags.classroom_attachment_progress?.failed > 0)) && isThisChildActive;

            if (isThisChildQueued && !isThisChildActive) {
              setA11yVisibility(btnResumeInitialSync, false);
              if (iconStep2SyncStatus) iconStep2SyncStatus.textContent = '⏳';
              if (lblStep2SyncTitle) {
                lblStep2SyncTitle.textContent = `School Cloud Worker Connected (${childName}'s Archive Queued)`;
                lblStep2SyncTitle.style.color = '#7c3aed';
              }
              if (lblStep2DataPercent) lblStep2DataPercent.textContent = 'Queued';
              if (step2DataProgressFill) {
                step2DataProgressFill.style.width = '10%';
                step2DataProgressFill.style.background = 'linear-gradient(90deg, #8b5cf6, #6d28d9)';
              }
              const otherActive = syncFlags.step2_sync_active_child_name || 'another child';
              if (lblStep2DataSubtext) {
                lblStep2DataSubtext.textContent = `Waiting for ${otherActive}'s archive sync to complete. Will start automatically.`;
              }
              lblStep2InitialSyncSummary.innerHTML = `⚡ <strong>School Cloud Worker Connected!</strong><br>${otherActive} is currently archiving school data. ${childName}'s 1-time historical archive is <strong>queued</strong> and will download automatically in the background once ${otherActive} finishes.`;
            } else if (syncFlags.step2_initial_sync_in_progress && isThisChildActive) {
              setA11yVisibility(btnResumeInitialSync, false);
              if (iconStep2SyncStatus) iconStep2SyncStatus.textContent = '⏳';
              if (lblStep2SyncTitle) {
                lblStep2SyncTitle.textContent = 'School Cloud Worker Connected (Syncing in Background)';
                lblStep2SyncTitle.style.color = '#1d4ed8';
              }
              const prog = syncFlags.classroom_attachment_progress;
              const downloaded = prog ? (prog.downloaded || 0) + (prog.skipped || 0) : 0;
              const total = prog?.total || 0;
              const pct = total > 0 ? Math.round((downloaded / total) * 100) : 0;
              const dataPct = downloaded > 0 ? Math.max(1, pct) : pct;
              if (lblStep2DataPercent) lblStep2DataPercent.textContent = total > 0 ? `${dataPct}%` : 'Scanning...';
              if (step2DataProgressFill) step2DataProgressFill.style.width = total > 0 ? `${dataPct}%` : '10%';
              if (lblStep2DataSubtext) {
                lblStep2DataSubtext.textContent = total > 0
                  ? `Syncing attachments: ${downloaded}/${total} saved to Vault (${dataPct}%).`
                  : 'Scanning attachments in background...';
              }
              lblStep2InitialSyncSummary.innerHTML = `⚡ <strong>School Cloud Worker Connected!</strong><br>1-Time historical archive is downloading & indexing in the background (${downloaded}/${total || '?'} files). You can safely continue setup now!`;
            } else if (isInterrupted) {
              setA11yVisibility(btnResumeInitialSync, true);
              if (iconStep2SyncStatus) iconStep2SyncStatus.textContent = '⚠️';
              if (lblStep2SyncTitle) {
                lblStep2SyncTitle.textContent = 'Initial Data Sync Paused (Network Loss Detected)';
                lblStep2SyncTitle.style.color = '#d97706';
              }
              const prog = syncFlags.classroom_attachment_progress;
              const downloaded = prog ? (prog.downloaded || 0) + (prog.skipped || 0) : 0;
              const total = prog?.total || 0;
              const pending = Math.max(0, total - downloaded);
              const pct = total > 0 ? Math.round((downloaded / total) * 100) : 0;
              const dataPct = downloaded > 0 ? Math.max(1, pct) : pct;
              if (lblStep2DataPercent) lblStep2DataPercent.textContent = `${dataPct}% (Paused)`;
              if (step2DataProgressFill) {
                step2DataProgressFill.style.width = `${dataPct}%`;
                step2DataProgressFill.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
              }
              if (lblStep2DataSubtext) {
                lblStep2DataSubtext.textContent = `Sync paused: ${downloaded}/${total} saved (${pending} remaining).`;
              }
              lblStep2InitialSyncSummary.innerHTML = `⚠️ <strong>Sync Paused:</strong> ${downloaded}/${total} attachments saved (${dataPct}%). ${pending} remaining due to network interruption.`;
            } else if (isThisChildCompleted) {
              if (lblStep2DataPercent) lblStep2DataPercent.textContent = '100%';
              if (step2DataProgressFill) {
                step2DataProgressFill.style.width = '100%';
                step2DataProgressFill.style.background = 'linear-gradient(90deg, #10b981, #059669)';
              }
              if (lblStep2DataSubtext) {
                lblStep2DataSubtext.textContent = 'All historical coursework & circulars indexed in Parent Vault.';
              }
              setA11yVisibility(btnResumeInitialSync, false);
              if (iconStep2SyncStatus) iconStep2SyncStatus.textContent = '🎉';
              if (lblStep2SyncTitle) {
                lblStep2SyncTitle.textContent = '1-Time Initial Cloud Ingestion Complete!';
                lblStep2SyncTitle.style.color = '#166534';
              }
              const sum = syncFlags.step2_initial_sync_summary;
              const coursesTxt = sum?.courses ? `${sum.courses} Classroom courses` : 'Classroom courses';
              const attTxt = sum?.attachments ? `${sum.attachments} attachments` : 'attachments';
              const ocrTxt = sum?.ocrIndexed ? `, ${sum.ocrIndexed} OCR-indexed` : '';
              lblStep2InitialSyncSummary.innerHTML = `✅ <strong>1-Time Sync Complete!</strong> Ingested <strong>${coursesTxt}</strong> and <strong>${attTxt}</strong>${ocrTxt} into <code>K.I.D.S. Data/${currentConfiguringProfile.academicYear || '2026-2027'}/${currentConfiguringProfile.name}/</code>.`;
            } else {
              setA11yVisibility(btnResumeInitialSync, false);
              if (iconStep2SyncStatus) iconStep2SyncStatus.textContent = '🟢';
              if (lblStep2SyncTitle) {
                lblStep2SyncTitle.textContent = 'School Cloud Worker Connected';
                lblStep2SyncTitle.style.color = '#166534';
              }
              lblStep2InitialSyncSummary.innerHTML = `Ingested Classroom courses & school emails into <code>K.I.D.S. Data/${currentConfiguringProfile.academicYear || '2026-2027'}/${currentConfiguringProfile.name}/</code>. 1-minute cloud background sync is active.`;
            }
          } catch {
            lblStep2InitialSyncSummary.innerHTML = `Ingested Classroom courses & school emails into <code>K.I.D.S. Data/${currentConfiguringProfile.academicYear || '2026-2027'}/${currentConfiguringProfile.name}/</code>. 1-minute cloud background sync is active.`;
          }
        }
      } else {
        setA11yVisibility(step2InitialSyncResults, false);
      }

      if (btnCreateMcpServer) {
        btnCreateMcpServer.textContent = isScriptCreated
          ? `⚡ Update ${childName}'s School Cloud Worker`
          : `⚡ 2. Deploy ${childName}'s School Cloud Worker & 1-Min Trigger`;
        btnCreateMcpServer.setAttribute('aria-label', isScriptCreated
          ? `Update ${childName}'s School Cloud Worker`
          : `Deploy ${childName}'s School Cloud Worker and 1-minute cron trigger`);
      }
      setA11yVisibility(btnStep2ConnectStudent, false);
      await checkStep2ApiStatus(showApiModal, tokenOverride);
    } else {
      setA11yVisibility(step2ConnectedBadge, false);
      setA11yVisibility(step2InitialSyncResults, false);
      setA11yVisibility(btnStep2ConnectStudent, false);
      setA11yVisibility(btnStep2VerifyApiStatus, false);

      // Restore persisted state for whether user opened settings
      if (!hasOpenedStep2ApiSettings && typeof chrome !== 'undefined' && chrome.storage?.local) {
        try {
          const childKey = `step2_has_opened_api_settings_${currentConfiguringProfile?.id || 'default'}`;
          const storedFlags = await chrome.storage.local.get(['step2_has_opened_api_settings', childKey]);
          if (storedFlags.step2_has_opened_api_settings || storedFlags[childKey]) {
            hasOpenedStep2ApiSettings = true;
          }
        } catch {}
      }

      // Step 2.1: Enable Google Apps Script API in School Account
      setA11yVisibility(btnOpenApiSettings, true);
      if (btnOpenApiSettings) {
        btnOpenApiSettings.textContent = hasOpenedStep2ApiSettings
          ? `🔗 Re-open Settings Page for ${childName}`
          : `🔗 1. Enable Google Apps Script API in ${childName}'s School Account`;
        btnOpenApiSettings.setAttribute('aria-label', `Open Google Apps Script User Settings for ${childName}'s school account in new tab`);
        if (hasOpenedStep2ApiSettings) {
          btnOpenApiSettings.classList.remove('btn-primary');
          btnOpenApiSettings.classList.add('btn-secondary');
        } else {
          btnOpenApiSettings.classList.remove('btn-secondary');
          btnOpenApiSettings.classList.add('btn-primary');
        }
      }

      // Step 2.2: Deploy School Cloud Worker in School Account
      if (btnCreateMcpServer) {
        btnCreateMcpServer.textContent = `⚡ 2. Deploy ${childName}'s School Cloud Worker & 1-Min Trigger`;
        btnCreateMcpServer.setAttribute('aria-label', `Deploy ${childName}'s School Cloud Worker and 1-minute cron trigger`);
        setA11yVisibility(btnCreateMcpServer, hasOpenedStep2ApiSettings);
      }
    }

    if (currentConfiguringProfile?.syncMethod === 'BROWSER_EXTENSION') {
      revealStep2FallbackOptions(true);
      setA11yVisibility(tier3BrowserContainer, false);
      setA11yVisibility(tier2ManualContainer, true);

      if (currentConfiguringProfile.initialSyncStatus === 'COMPLETED') {
        setA11yVisibility(step2InitialSyncResults, true);
        if (lblStep2InitialSyncSummary) {
          const prog = currentConfiguringProfile.initialSyncProgress;
          const dl = prog?.downloaded || 3;
          lblStep2InitialSyncSummary.innerHTML = `⚡ <strong>Browser Direct Sync Complete!</strong><br>Archived <strong>1 course(s)</strong> and <strong>${dl} attachment(s)</strong> directly into your Parent Vault (<code>K.I.D.S. Data/</code>).`;
        }
        setA11yVisibility(btnNavStep2ToStep3, true);
        setA11yVisibility(btnSkipStep2Top, false);
        setA11yVisibility(btnSkipStep2Bottom, false);
      }
    }
  }

  btnResumeInitialSync?.addEventListener('click', async () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      await chrome.runtime.sendMessage({ type: 'RESUME_INITIAL_SYNC' }).catch(() => {});
      updateStep2View();
    }
  });

  btnSkipStep2Top?.addEventListener('click', () => { showWizardStep(3); });
  btnSkipStep2Bottom?.addEventListener('click', () => { showWizardStep(3); });
  btnNavStep2ToStep1?.addEventListener('click', () => { showWizardStep(1); });
  btnNavStep2ToStep3?.addEventListener('click', () => { showWizardStep(3); });

  btnStep2ConnectStudent?.addEventListener('click', async () => {
    btnStep2ConnectStudent.disabled = true;
    const childName = currentConfiguringProfile?.name || 'Student';
    const originalText = `🔐 1. Sign In with ${childName}'s School Google Account`;
    btnStep2ConnectStudent.textContent = `🔐 Signing into ${childName}'s account...`;

    try {
      hasOpenedStep2ApiSettings = false;
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const childKey = `step2_has_opened_api_settings_${currentConfiguringProfile?.id || 'default'}`;
        await chrome.storage.local.remove(['step2_has_opened_api_settings', childKey]).catch(() => {});
      }
      // 1. Interactive OAuth login
      const token = await GasProvisionerService.getAuthToken(true);
      const studentEmail = (await GasProvisionerService.getAuthenticatedUserEmail(token)) || '';

      if (!studentEmail) {
        throw new Error('Failed to retrieve student email from Google account.');
      }

      // 2. Validate Uniqueness (reject parent account and sibling collision)
      const uniqueness = await GasProvisionerService.validateAccountUniqueness(
        studentEmail,
        currentConfiguringProfile?.id
      );

      if (!uniqueness.valid) {
        // Discard the token
        await AuthService.clearCachedToken();
        await chrome.identity.removeCachedAuthToken({ token }).catch(() => {});

        // Build accessible error guidance
        if (lblConflictDetailText) {
          if (uniqueness.conflictType === 'PARENT_ACCOUNT') {
            lblConflictDetailText.innerHTML = `You signed in with <strong>${studentEmail}</strong>, which is already registered as your <strong>Parent Vault Account (Step 1)</strong>.<br><br>The School Cloud Worker must run inside your child's dedicated school Google account (or separate student account).`;
          } else {
            lblConflictDetailText.innerHTML = `You signed in with <strong>${studentEmail}</strong>, which is already registered for <strong>${uniqueness.conflictingName || 'another child'}</strong>.<br><br>Each child profile requires their own distinct school Google account.`;
          }
        }

        openModal(modalAccountConflictAlert, btnStep2ConnectStudent);
        if (jawsLiveAnnouncer) {
          jawsLiveAnnouncer.textContent = 'Account conflict detected. You cannot use this account.';
        }
        return;
      }

      // 3. Valid Unique Account - Link to child profile
      if (currentConfiguringProfile) {
        const domain = studentEmail.includes('@') ? studentEmail.split('@')[1] : '';
        currentConfiguringProfile = await ChildManager.updateProfile(currentConfiguringProfile.id, {
          studentAccountEmail: studentEmail,
          schoolEmailDomain: domain
        });
      }

      // 4. Share parent root folder with student account
      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          await chrome.storage.local.set({
            student_gas_token: token,
            student_gas_token_email: studentEmail
          }).catch(() => {});
        }
        const parentToken = await PersonalDriveService.getValidToken(false);
        if (parentToken && currentConfiguringProfile) {
          const kidFolderInfo = await PersonalDriveService.getOrCreateKidFolder(
            parentToken,
            currentConfiguringProfile.name,
            currentConfiguringProfile.academicYear
          );
          await PersonalDriveService.shareFolderWithStudentAccount(parentToken, kidFolderInfo.id, studentEmail).catch(() => {});
        }
      } catch (shareErr) {
        console.warn('[wizard] Auto-share folder warning:', shareErr);
      }

      await updateStep2View(true, token);

    } catch (e: any) {
      if (!e.message?.includes('closed') && !e.message?.includes('User cancelled')) {
        const errMsg = e.message || String(e);
        if (errMsg.includes('admin needs to review') || errMsg.includes('access_not_configured') || errMsg.includes('Access blocked') || errMsg.includes('400') || errMsg.includes('not allow')) {
          revealStep2FallbackOptions(true);
        } else {
          alert(`School Account Sign-In failed: ${errMsg}`);
          revealStep2FallbackOptions(false);
        }
      }
    } finally {
      btnStep2ConnectStudent.disabled = false;
      btnStep2ConnectStudent.textContent = originalText;
    }
  });

  // Account Conflict Modal Buttons
  btnCloseConflictModal?.addEventListener('click', () => {
    closeModal(modalAccountConflictAlert);
  });

  btnRetryAccountSelection?.addEventListener('click', () => {
    closeModal(modalAccountConflictAlert, false);
    btnStep2ConnectStudent?.click();
  });

  // Step 2 API Guidance Modal Buttons
  btnProceedStep2ApiModal?.addEventListener('click', async () => {
    closeModal(step2ApiGuidanceModal, false);
    const targetEmail = currentConfiguringProfile?.studentAccountEmail;
    const settingsUrl = targetEmail
      ? `https://script.google.com/home/usersettings?authuser=${encodeURIComponent(targetEmail)}`
      : 'https://script.google.com/home/usersettings';
    chrome.tabs.create({ url: settingsUrl });
    hasOpenedStep2ApiSettings = true;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const childKey = `step2_has_opened_api_settings_${currentConfiguringProfile?.id || 'default'}`;
      await chrome.storage.local.set({
        step2_has_opened_api_settings: true,
        [childKey]: true
      }).catch(() => {});
    }
    setA11yVisibility(btnStep2VerifyApiStatus, true);
    if (btnStep2VerifyApiStatus) {
      btnStep2VerifyApiStatus.classList.remove('btn-secondary');
      btnStep2VerifyApiStatus.classList.add('btn-primary');
      btnStep2VerifyApiStatus.focus();
    }
    setA11yVisibility(btnOpenApiSettings, true);
    if (btnOpenApiSettings) {
      btnOpenApiSettings.classList.remove('btn-primary');
      btnOpenApiSettings.classList.add('btn-secondary');
      const childName = currentConfiguringProfile?.name || 'Student';
      btnOpenApiSettings.textContent = `🔗 Re-open Settings Page for ${childName}`;
    }
  });

  btnCancelStep2ApiModal?.addEventListener('click', async () => {
    closeModal(step2ApiGuidanceModal);
    hasOpenedStep2ApiSettings = false;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const childKey = `step2_has_opened_api_settings_${currentConfiguringProfile?.id || 'default'}`;
      await chrome.storage.local.remove(['step2_has_opened_api_settings', childKey]).catch(() => {});
    }
    setA11yVisibility(btnOpenApiSettings, true);
    setA11yVisibility(btnStep2VerifyApiStatus, false);
    btnOpenApiSettings?.focus();
  });

  btnStep2VerifyApiStatus?.addEventListener('click', async () => {
    btnStep2VerifyApiStatus.disabled = true;
    btnStep2VerifyApiStatus.textContent = '🔄 Verifying API Status...';
    try {
      // Invalidate cached token so Google introspects newly enabled setting
      await AuthService.clearCachedToken();
      let freshToken: string | null = null;
      try {
        freshToken = await GasProvisionerService.getAuthToken(false);
      } catch {}
      if (freshToken && typeof chrome !== 'undefined' && chrome.storage?.local) {
        const studentEmail = currentConfiguringProfile?.studentAccountEmail || '';
        await chrome.storage.local.set({
          student_gas_token: freshToken,
          student_gas_token_email: studentEmail
        }).catch(() => {});
      }

      const status = await GasProvisionerService.checkAccountAndApiStatus(freshToken || undefined);
      if (status.apiEnabled || status.statusCode === 429) {
        await checkStep2ApiStatus(false, freshToken || undefined);
        alert('✅ Google Apps Script API is verified and enabled for your school account! You can now deploy your School Cloud Worker.');
        if (jawsLiveAnnouncer) {
          jawsLiveAnnouncer.textContent = 'Google Apps Script API verified and enabled for school account. Ready to deploy School Cloud Worker.';
        }
      } else {
        const childName = currentConfiguringProfile?.name || 'Atharva';
        const accountInfo = status.email ? `\n• Checked Account: ${status.email}` : '';
        const statusInfo = status.statusCode ? `\n• Google API Status: HTTP ${status.statusCode}` : '';
        
        let hint = '';
        if (status.error && status.error.includes('not enabled')) {
          hint = '\n\n💡 Google Server Delay: Google often takes 1 to 3 minutes to propagate user setting changes to API endpoints.\nSince you already turned the switch ON in Google settings, you can either click "⚡ 2. Deploy School Cloud Worker" directly below to proceed, or click Verify again in a minute.';
        } else if (status.error) {
          try {
            const parsed = JSON.parse(status.error);
            hint = `\n• Google Details: ${parsed.error?.message || status.error}`;
          } catch {
            hint = `\n• Google Details: ${status.error.substring(0, 200)}`;
          }
        }

        alert(`⚠️ Google Apps Script API is still propagating for ${childName}'s school account.${accountInfo}${statusInfo}${hint}`);
        setA11yVisibility(btnCreateMcpServer, true);
      }
    } finally {
      btnStep2VerifyApiStatus.disabled = false;
      const childName = currentConfiguringProfile?.name || 'Student';
      btnStep2VerifyApiStatus.textContent = `🔄 Verify ${childName}'s Google Apps Script API Status`;
    }
  });

  btnOpenApiSettings?.addEventListener('click', async () => {
    const targetEmail = currentConfiguringProfile?.studentAccountEmail;
    const settingsUrl = targetEmail
      ? `https://script.google.com/home/usersettings?authuser=${encodeURIComponent(targetEmail)}`
      : 'https://script.google.com/home/usersettings';
    chrome.tabs.create({ url: settingsUrl });
    hasOpenedStep2ApiSettings = true;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const childKey = `step2_has_opened_api_settings_${currentConfiguringProfile?.id || 'default'}`;
      await chrome.storage.local.set({
        step2_has_opened_api_settings: true,
        [childKey]: true
      }).catch(() => {});
    }
    setA11yVisibility(btnStep2VerifyApiStatus, true);
    if (btnStep2VerifyApiStatus) {
      btnStep2VerifyApiStatus.classList.remove('btn-secondary');
      btnStep2VerifyApiStatus.classList.add('btn-primary');
      btnStep2VerifyApiStatus.focus();
    }
    setA11yVisibility(btnOpenApiSettings, true);
    if (btnOpenApiSettings) {
      btnOpenApiSettings.classList.remove('btn-primary');
      btnOpenApiSettings.classList.add('btn-secondary');
      const childName = currentConfiguringProfile?.name || 'Student';
      btnOpenApiSettings.textContent = `🔗 Re-open Settings Page for ${childName}`;
    }
    setA11yVisibility(btnCreateMcpServer, true);
    if (btnCreateMcpServer) {
      const childName = currentConfiguringProfile?.name || 'Student';
      btnCreateMcpServer.textContent = `⚡ 2. Deploy ${childName}'s School Cloud Worker & 1-Min Trigger`;
    }
  });

  async function executeSchoolWorkerDeployment() {
    setA11yVisibility(mcpDeployProgressOverlay, true);
    setA11yVisibility(step2InlineProgressBar, true);

    setTimeout(() => {
      mcpDeployProgressContainer?.focus();
    }, 100);

    let oauthErrorWatcher: any = null;
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      oauthErrorWatcher = setInterval(async () => {
        try {
          const errorTabs = await chrome.tabs.query({
            url: ['*://accounts.google.com/signin/oauth/error*', '*://accounts.google.com/*authError*']
          });
          if (errorTabs && errorTabs.length > 0) {
            if (oauthErrorWatcher) {
              clearInterval(oauthErrorWatcher);
              oauthErrorWatcher = null;
            }
            for (const t of errorTabs) {
              if (t.id) await chrome.tabs.remove(t.id).catch(() => {});
            }
            setA11yVisibility(mcpDeployProgressOverlay, false);
            setA11yVisibility(step2InlineProgressBar, false);
            revealStep2FallbackOptions(true);
          }
        } catch {}
      }, 1200);
    }

    try {
      GasProvisionerService.setProgressCallback((pct, phase, sub) => {
        if (mcpDeployProgressBar) mcpDeployProgressBar.style.width = `${pct}%`;
        if (mcpDeployProgressContainer) {
          mcpDeployProgressContainer.setAttribute('aria-valuenow', String(pct));
          mcpDeployProgressContainer.setAttribute('aria-valuetext', `Progress ${pct} percent. ${phase}: ${sub}`);
        }
        if (lblMcpDeployTitle) lblMcpDeployTitle.textContent = `🚀 ${phase}`;
        if (lblMcpDeploySubtext) lblMcpDeploySubtext.textContent = sub;
        if (lblMcpDeployPhase) lblMcpDeployPhase.textContent = `Phase Progress: ${pct}% complete`;

        if (jawsLiveAnnouncer) {
          jawsLiveAnnouncer.textContent = `Progress ${pct} percent. ${phase}. ${sub}`;
        }

        if (step2ScriptProgressFill) step2ScriptProgressFill.style.width = `${pct}%`;
        if (lblStep2ScriptPercent) lblStep2ScriptPercent.textContent = `${pct}%`;
        if (lblStep2ScriptTitle) lblStep2ScriptTitle.textContent = `⚙️ ${phase}`;
        if (lblStep2ScriptSubtext) lblStep2ScriptSubtext.textContent = sub;
      });

      const parentToken = await PersonalDriveService.getValidToken(false);
      const kidFolderInfo = await PersonalDriveService.getOrCreateKidFolder(
        parentToken,
        currentConfiguringProfile?.name,
        currentConfiguringProfile?.academicYear
      );

      // Directly use the student account and token selected in Step 2
      let studentToken: string | null = null;
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        try {
          const stored = await chrome.storage.local.get(['student_gas_token', 'student_gas_token_email']);
          if (stored.student_gas_token) {
            if (!currentConfiguringProfile?.studentAccountEmail || stored.student_gas_token_email === currentConfiguringProfile.studentAccountEmail) {
              studentToken = stored.student_gas_token;
            }
          }
        } catch {}
      }
      if (!studentToken) {
        studentToken = await GasProvisionerService.getAuthToken(false).catch(() => null);
      }
      if (!studentToken) {
        // Fallback to interactive only if no valid cached student token exists
        studentToken = await GasProvisionerService.getAuthToken(true);
      }

      // Pre-flight check: verify scopes and log readiness status
      const preflight = await GasProvisionerService.checkAccountAndApiStatus(studentToken);
      if (!preflight.apiEnabled) {
        if (preflight.scopeInsufficient) {
          setA11yVisibility(mcpDeployProgressOverlay, false);
          setA11yVisibility(step2InlineProgressBar, false);
          alert('⚠️ Missing Permissions:\n\nYou did not select all required checkboxes on Google\'s authorization screen for your student account:\n• Google Apps Script - Projects\n• Google Apps Script - Deployments\n\nPlease re-authorize your student account and make sure to check "Select all" (or check all boxes).');
          return;
        }
        console.warn(`[wizard] Pre-flight probe reported not ready (HTTP ${preflight.statusCode || '403'}). Proceeding with live worker provisioning as API toggle was turned ON...`);
      }

      const studentEmail = currentConfiguringProfile?.studentAccountEmail ||
        (await GasProvisionerService.getAuthenticatedUserEmail(studentToken)) || '';
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
        lblStep2InitialSyncSummary.innerHTML = `⚡ <strong>School Cloud Worker Connected!</strong><br>Found <strong>${courses} courses</strong> & <strong>${emails} circulars</strong>. Full historical attachments are downloading & indexing in the background.<br><span style="color: #15803d; font-weight: 600;">➡️ You can safely continue setup now! Click "Continue to Step 3" below.</span>`;
      }

      setA11yVisibility(step2InitialSyncResults, true);

      // Focus the continue button so JAWS announces next step
      setTimeout(() => {
        btnNavStep2ToStep3?.focus();
      }, 100);
    } catch (err: any) {
      setA11yVisibility(mcpDeployProgressOverlay, false);
      setA11yVisibility(step2InlineProgressBar, false);
      const errMsg = err?.message || String(err);
      if (errMsg.includes('Google Apps Script API is disabled')) {
        await checkStep2ApiStatus(true);
      } else if (
        errMsg.includes('admin needs to review') ||
        errMsg.includes('access_not_configured') ||
        errMsg.includes('Access blocked') ||
        errMsg.includes('400') ||
        errMsg.includes('not allow') ||
        errMsg.includes('insufficientPermissions') ||
        errMsg.includes('closed') ||
        errMsg.includes('cancelled') ||
        errMsg.includes('did not approve')
      ) {
        revealStep2FallbackOptions(true);
      } else {
        alert(`School Worker deployment failed: ${errMsg}`);
        revealStep2FallbackOptions(false);
      }
    } finally {
      if (oauthErrorWatcher) {
        clearInterval(oauthErrorWatcher);
        oauthErrorWatcher = null;
      }
    }
  }

  // Cancel deploy button inside progress overlay
  btnCancelDeployToFallback?.addEventListener('click', async () => {
    setA11yVisibility(mcpDeployProgressOverlay, false);
    setA11yVisibility(step2InlineProgressBar, false);
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
        const errorTabs = await chrome.tabs.query({
          url: ['*://accounts.google.com/signin/oauth/error*', '*://accounts.google.com/*authError*']
        });
        for (const t of errorTabs) {
          if (t.id) await chrome.tabs.remove(t.id).catch(() => {});
        }
      }
    } catch {}
    revealStep2FallbackOptions(true);
  });

  function revealStep2FallbackOptions(isDomainBlocked: boolean = false) {
    if (step2DomainBlockBanner) {
      setA11yVisibility(step2DomainBlockBanner, isDomainBlocked);
    }
    tier2ManualContainer?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Toggle button for alternative / manual options (retained for backward compatibility)
  btnToggleManualOrBrowserSync?.addEventListener('click', () => {
    tier2ManualContainer?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // Tab switching: Always keep Tier 2 (Manual Script) active and Tier 3 hidden
  tabTier2Manual?.addEventListener('click', () => {
    setA11yVisibility(tier2ManualContainer, true);
    setA11yVisibility(tier3BrowserContainer, false);
  });

  tabTier3Browser?.addEventListener('click', () => {
    setA11yVisibility(tier3BrowserContainer, false);
    setA11yVisibility(tier2ManualContainer, true);
  });

  // Tier 2: 1. Copy School Worker Code
  // Option A: Open & Copy Sync Sheet in School Profile
  btnOpenSetupSheetCopy?.addEventListener('click', async () => {
    if (!currentConfiguringProfile) {
      try {
        currentConfiguringProfile = await ChildManager.getActiveProfile();
      } catch (e) {}
    }

    const buildAccountChooserUrl = (rawUrl: string, email?: string): string => {
      if (!rawUrl) return '';
      if (rawUrl.includes('AccountChooser')) return rawUrl;
      let target = rawUrl;
      if (email && !target.includes('authuser=')) {
        target += (target.includes('?') ? '&' : '?') + `authuser=${encodeURIComponent(email)}`;
      }
      let chooser = `https://accounts.google.com/AccountChooser?continue=${encodeURIComponent(target)}`;
      if (email) {
        chooser += `&Email=${encodeURIComponent(email)}`;
      }
      return chooser;
    };

    const childName = currentConfiguringProfile?.name || 'Student';
    const academicYear = currentConfiguringProfile?.academicYear || '2026-2027';

    // If copyUrl already generated, open it directly with Account Chooser
    if (currentConfiguringProfile?.setupSheetCopyUrl) {
      const studentEmail = currentConfiguringProfile?.studentAccountEmail;
      const chooserUrl = buildAccountChooserUrl(currentConfiguringProfile.setupSheetCopyUrl, studentEmail);
      chrome.tabs.create({ url: chooserUrl });
      return;
    }

    // Otherwise generate the sheet template in Parent Drive
    const origBtnText = btnOpenSetupSheetCopy?.textContent || '🚀 Open with Account Selector';
    if (btnOpenSetupSheetCopy) {
      btnOpenSetupSheetCopy.disabled = true;
      btnOpenSetupSheetCopy.textContent = `⏳ Creating ${childName}'s Sync Sheet in Parent Drive...`;
    }
    if (lblSetupSheetStatus) {
      lblSetupSheetStatus.textContent = '⏳ Creating Google Sheet and container-bound script in parent account...';
      lblSetupSheetStatus.style.color = '#2563eb';
      lblSetupSheetStatus.style.display = 'block';
    }

    try {
      let parentToken = '';
      try {
        parentToken = await PersonalDriveService.getValidToken(false, false);
      } catch (tokErr) {
        parentToken = await PersonalDriveService.getValidToken(true, true);
      }
      if (!parentToken) {
        throw new Error('Please sign in to Parent Personal Google Account in Step 1 first.');
      }

      const masterStatus = await GasProvisionerService.getMasterWorkerStatus(parentToken);
      let masterUrl = masterStatus?.webAppUrl || '';
      if (!masterUrl) {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          const stored = await chrome.storage.local.get(['master_worker_deployment_url']);
          masterUrl = stored.master_worker_deployment_url || '';
        }
      }

      if (!masterUrl) {
        throw new Error('Master Personal Worker is not yet deployed. Please return to Step 1 and deploy the Master Worker first.');
      }

      const accessKeyMatch = masterUrl.match(/[?&]accessKey=([^&]+)/);
      const accessKey = accessKeyMatch ? decodeURIComponent(accessKeyMatch[1]) : '';

      let sheetRes;
      try {
        sheetRes = await GasProvisionerService.generateChildSetupSheet(
          parentToken,
          childName,
          academicYear,
          masterUrl,
          accessKey
        );
      } catch (genErr: any) {
        const genMsg = genErr?.message || String(genErr);
        if (genMsg.includes('401') || genMsg.includes('Invalid Credentials') || genMsg.includes('authentication credentials')) {
          console.warn('[Wizard] 401 encountered during sheet creation, prompting interactive token refresh...');
          const freshToken = await PersonalDriveService.getValidToken(true, true);
          sheetRes = await GasProvisionerService.generateChildSetupSheet(
            freshToken,
            childName,
            academicYear,
            masterUrl,
            accessKey
          );
        } else {
          throw genErr;
        }
      }

      if (currentConfiguringProfile) {
        currentConfiguringProfile.setupSheetId = sheetRes.spreadsheetId;
        currentConfiguringProfile.setupSheetCopyUrl = sheetRes.copyUrl;
        currentConfiguringProfile.syncMethod = 'GAS_SHEET';
        await ChildManager.updateProfile(currentConfiguringProfile.id, {
          setupSheetId: sheetRes.spreadsheetId,
          setupSheetCopyUrl: sheetRes.copyUrl,
          syncMethod: 'GAS_SHEET'
        });
      }

      if (lblSetupSheetStatus) {
        lblSetupSheetStatus.textContent = '✅ Setup Sheet created! Opening Google Account Selector in browser...';
        lblSetupSheetStatus.style.color = '#15803d';
        lblSetupSheetStatus.style.display = 'block';
      }

      const studentEmail = currentConfiguringProfile?.studentAccountEmail;
      const chooserUrl = buildAccountChooserUrl(sheetRes.copyUrl, studentEmail);
      chrome.tabs.create({ url: chooserUrl });
      await updateStep2View();
    } catch (err: any) {
      if (lblSetupSheetStatus) {
        lblSetupSheetStatus.textContent = `❌ Error: ${err?.message || err}`;
        lblSetupSheetStatus.style.color = '#dc2626';
        lblSetupSheetStatus.style.display = 'block';
      }
      alert(`Could not create setup sheet: ${err?.message || err}`);
    } finally {
      if (btnOpenSetupSheetCopy) {
        btnOpenSetupSheetCopy.disabled = false;
        btnOpenSetupSheetCopy.textContent = origBtnText;
      }
    }
  });

  // Option A: Copy Setup Sheet Link to Clipboard
  btnCopySetupSheetLink?.addEventListener('click', async () => {
    if (!currentConfiguringProfile) {
      try {
        currentConfiguringProfile = await ChildManager.getActiveProfile();
      } catch (e) {}
    }

    const childName = currentConfiguringProfile?.name || 'Student';
    const studentEmail = currentConfiguringProfile?.studentAccountEmail;

    let targetUrl = currentConfiguringProfile?.setupSheetCopyUrl;
    if (!targetUrl) {
      // If not yet generated, trigger generation first
      btnOpenSetupSheetCopy?.click();
      return;
    }

    const buildAccountChooserUrlLocal = (rawUrl: string, email?: string): string => {
      if (!rawUrl) return '';
      if (rawUrl.includes('AccountChooser')) return rawUrl;
      let target = rawUrl;
      if (email && !target.includes('authuser=')) {
        target += (target.includes('?') ? '&' : '?') + `authuser=${encodeURIComponent(email)}`;
      }
      let chooser = `https://accounts.google.com/AccountChooser?continue=${encodeURIComponent(target)}`;
      if (email) {
        chooser += `&Email=${encodeURIComponent(email)}`;
      }
      return chooser;
    };

    const chooserUrl = buildAccountChooserUrlLocal(targetUrl, studentEmail);
    try {
      await navigator.clipboard.writeText(chooserUrl);
      if (lblSetupSheetStatus) {
        lblSetupSheetStatus.textContent = `📋 Setup Sheet link copied! Paste into ${childName}'s school browser profile.`;
        lblSetupSheetStatus.style.color = '#15803d';
        lblSetupSheetStatus.style.display = 'block';
      }
    } catch (clipErr) {
      alert(`Setup Sheet Link:\n${chooserUrl}`);
    }
  });

  btnCopySchoolWorkerCode?.addEventListener('click', async () => {
    try {
      const parentToken = await PersonalDriveService.getValidToken(false);
      const childName = currentConfiguringProfile?.name || 'Child';
      const academicYear = currentConfiguringProfile?.academicYear || '2026-2027';
      let parentFolderId = currentConfiguringProfile?.folderId || '';

      if (!parentFolderId && parentToken) {
        try {
          const kidFolder = await PersonalDriveService.getOrCreateKidFolder(parentToken, childName, academicYear);
          parentFolderId = kidFolder.id;
        } catch {}
      }

      const accessKey = '';
      const code = GasProvisionerService.generateStandaloneSchoolWorkerCode(
        parentFolderId,
        childName,
        academicYear,
        accessKey
      );

      await navigator.clipboard.writeText(code);

      if (lblCopyCodeToast) {
        setA11yVisibility(lblCopyCodeToast, true);
        setTimeout(() => {
          setA11yVisibility(lblCopyCodeToast, false);
        }, 4000);
      }
    } catch (copyErr: any) {
      alert(`Could not copy code automatically: ${copyErr?.message || copyErr}`);
    }
  });

  // Tier 2: 2. Open script.new
  btnOpenScriptNew?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://script.new' });
  });

  // Tier 2: 3. Connect Manual School Worker
  btnConnectManualWorker?.addEventListener('click', async () => {
    const url = txtManualWebAppUrl?.value?.trim() || '';
    if (!url) {
      if (lblManualWorkerFeedback) {
        lblManualWorkerFeedback.textContent = '⚠️ Please paste the Web App URL from Google Apps Script.';
        lblManualWorkerFeedback.style.color = '#dc2626';
        setA11yVisibility(lblManualWorkerFeedback, true);
      }
      return;
    }

    if (btnConnectManualWorker) btnConnectManualWorker.disabled = true;
    if (lblManualWorkerFeedback) {
      lblManualWorkerFeedback.textContent = '⏳ Verifying school worker URL...';
      lblManualWorkerFeedback.style.color = '#2563eb';
      setA11yVisibility(lblManualWorkerFeedback, true);
    }

    try {
      const childId = currentConfiguringProfile?.id || '';
      const urlMatch = url.match(/[?&]accessKey=([^&]+)/);
      let accessKey = urlMatch ? decodeURIComponent(urlMatch[1]) : undefined;
      if (!accessKey && typeof chrome !== 'undefined' && chrome.storage?.local) {
        try {
          const stored = await chrome.storage.local.get(['gas_access_key', 'access_key']);
          accessKey = stored.gas_access_key || stored.access_key;
        } catch {}
      }
      const conn = await GasProvisionerService.connectManualSchoolWorker(childId, url, accessKey);
      if (!conn.success) {
        if (lblManualWorkerFeedback) {
          lblManualWorkerFeedback.textContent = `❌ ${conn.error || 'Could not verify URL'}`;
          lblManualWorkerFeedback.style.color = '#dc2626';
        }
        return;
      }

      if (lblManualWorkerFeedback) {
        lblManualWorkerFeedback.textContent = `✅ ${conn.message || 'Connected successfully!'}`;
        lblManualWorkerFeedback.style.color = '#16a34a';
      }

      currentConfiguringProfile = await ChildManager.getActiveProfile();
      await updateStep2View();

      // Trigger 1-time background data sync via newly connected webAppUrl
      if (currentConfiguringProfile) {
        GasProvisionerService.runInitialSchoolDataSync(
          currentConfiguringProfile.name,
          currentConfiguringProfile.academicYear,
          undefined,
          url,
          undefined,
          currentConfiguringProfile.studentAccountEmail,
          currentConfiguringProfile.schoolEmailDomain,
          { childId: currentConfiguringProfile.id }
        ).catch(() => {});
      }

      // Allow user to proceed to Step 3
      setA11yVisibility(btnNavStep2ToStep3, true);
      setA11yVisibility(btnSkipStep2Top, false);
      setA11yVisibility(btnSkipStep2Bottom, false);

      setTimeout(() => {
        btnNavStep2ToStep3?.focus();
      }, 200);

    } catch (err: any) {
      if (lblManualWorkerFeedback) {
        lblManualWorkerFeedback.textContent = `❌ ${err?.message || err}`;
        lblManualWorkerFeedback.style.color = '#dc2626';
      }
    } finally {
      if (btnConnectManualWorker) btnConnectManualWorker.disabled = false;
    }
  });

  // Tier 3: Browser Direct Sync
  btnStartBrowserSync?.addEventListener('click', async () => {
    if (!currentConfiguringProfile) {
      currentConfiguringProfile = await ChildManager.getActiveProfile();
    }
    if (!currentConfiguringProfile) {
      alert('Please confirm child details in Step 1 first.');
      return;
    }

    if (btnStartBrowserSync) btnStartBrowserSync.disabled = true;
    setA11yVisibility(browserSyncProgressBox, true);
    stickyLastProgress = null;

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({
        step2_sync_status: 'IN_PROGRESS',
        step2_initial_sync_in_progress: true,
        step2_initial_sync_complete: false,
        classroom_attachment_progress: {
          total: 0,
          downloaded: 0,
          skipped: 0,
          failed: 0,
          ocrIndexed: 0,
          phase: 'starting',
          interrupted: false
        }
      }).catch(() => {});
    }

    try {
      if (lblBrowserSyncStatusText) lblBrowserSyncStatusText.textContent = 'Connecting to Google Classroom in background...';

      // Delegate to background Service Worker so sync persists seamlessly if popup closes
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage && process.env.NODE_ENV !== 'test') {
        await chrome.runtime.sendMessage({
          type: 'START_BROWSER_CLASSROOM_SYNC',
          payload: { mode: 'ONE_TIME_FULL' }
        });
      } else {
        const result = await ClassroomBrowserExtractor.extractClassroomData(
          currentConfiguringProfile,
          {
            mode: 'ONE_TIME_FULL',
            onProgress: (prog) => {
              if (lblBrowserSyncStatusText) lblBrowserSyncStatusText.textContent = prog.message;
              if (lblBrowserSyncPercent) lblBrowserSyncPercent.textContent = `${prog.percent}%`;
              if (browserSyncProgressBar) browserSyncProgressBar.style.width = `${prog.percent}%`;
            }
          }
        );

        if (!result.success) {
          if (lblBrowserSyncStatusText) {
            lblBrowserSyncStatusText.textContent = `⚠️ ${result.error || 'Sync could not find active courses.'}`;
            lblBrowserSyncStatusText.style.color = '#d97706';
          }
          return;
        }

        currentConfiguringProfile = await ChildManager.getActiveProfile();
        await updateStep2View();

        if (lblStep2InitialSyncSummary) {
          lblStep2InitialSyncSummary.innerHTML = `⚡ <strong>Browser Direct Sync Complete!</strong><br>Archived <strong>${result.coursesCount} course(s)</strong>, <strong>${result.announcementsCount || 0} announcement(s) / notice(s)</strong>, and <strong>${result.savedAttachments} attachment(s)</strong> directly into your Parent Vault (<code>K.I.D.S. Data/</code>).`;
        }
        setA11yVisibility(step2InitialSyncResults, true);

        // Allow user to proceed to Step 3
        setA11yVisibility(btnNavStep2ToStep3, true);
        setA11yVisibility(btnSkipStep2Top, false);
        setA11yVisibility(btnSkipStep2Bottom, false);

        setTimeout(() => {
          btnNavStep2ToStep3?.focus();
        }, 200);
      }
    } catch (err: any) {
      if (lblBrowserSyncStatusText) {
        lblBrowserSyncStatusText.textContent = `❌ ${err?.message || err}`;
        lblBrowserSyncStatusText.style.color = '#dc2626';
      }
    } finally {
      if (btnStartBrowserSync) btnStartBrowserSync.disabled = false;
    }
  });

  chkEnableBrowserIncremental?.addEventListener('change', async () => {
    const isChecked = chkEnableBrowserIncremental.checked;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ browser_sync_incremental_enabled: isChecked }).catch(() => {});
    }
  });

  btnCreateMcpServer?.addEventListener('click', async () => {
    // Directly deploy using the student account already selected and verified in Step 2
    await executeSchoolWorkerDeployment();
  });

  btnCancelAccountGuidanceModal?.addEventListener('click', () => {
    closeModal(step2AccountGuidanceModal);
  });

  btnProceedAccountGuidanceModal?.addEventListener('click', async () => {
    closeModal(step2AccountGuidanceModal, false);
    await executeSchoolWorkerDeployment();
  });

  btnCancelToolsAuthModal?.addEventListener('click', () => {
    closeModal(toolsAuthGuidanceModal);
  });

  btnProceedToolsAuthModal?.addEventListener('click', async () => {
    closeModal(toolsAuthGuidanceModal, false);
    await executeSchoolWorkerDeployment();
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
    btnStep2ConnectStudent?.click();
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
      const originPattern = `${urlObj.protocol}//${urlObj.hostname}/*`;

      if (typeof chrome !== 'undefined' && chrome.permissions && chrome.permissions.request) {
        const hasPerm = await chrome.permissions.contains({ origins: [originPattern] }).catch(() => false);
        if (!hasPerm) {
          const granted = await chrome.permissions.request({ origins: [originPattern] }).catch(() => false);
          if (!granted) {
            throw new Error(`Permission to connect school portal (${domain}) was declined.`);
          }
        }
      }

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

      // Portals are ingested and scraped directly by the Master Personal Worker in the Parent Account.

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
      const originPattern = `${urlObj.protocol}//${urlObj.hostname}/*`;

      if (typeof chrome !== 'undefined' && chrome.permissions && chrome.permissions.request) {
        const hasPerm = await chrome.permissions.contains({ origins: [originPattern] }).catch(() => false);
        if (!hasPerm) {
          const granted = await chrome.permissions.request({ origins: [originPattern] }).catch(() => false);
          if (!granted) {
            throw new Error(`Permission to connect school portal (${domain}) was declined.`);
          }
        }
      }

      const cookies = await chrome.cookies.getAll({ domain });
      const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

      const parentToken = await PersonalDriveService.getValidToken(false);
      const kidFolderInfo = await PersonalDriveService.getOrCreateKidFolder(
        parentToken,
        currentConfiguringProfile?.name,
        currentConfiguringProfile?.academicYear
      );

      const masterWorkerUrl = await PersonalDriveService.getMasterWorkerUrl();
      if (masterWorkerUrl) {
        await fetch(masterWorkerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'register_portal_job',
            params: {
              childId: currentConfiguringProfile?.id || '',
              childName: currentConfiguringProfile?.name || 'Child',
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
    setStep1Mode('initial');
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
    try {
      const logs = await WhatsAppDiagnosticLogger.getRecentLogs(35);
      if (txtActivityLog) {
        txtActivityLog.value = logs;
        txtActivityLog.scrollTop = txtActivityLog.scrollHeight;
      }
      if (txtMcpOverlayLog) {
        txtMcpOverlayLog.value = logs;
        txtMcpOverlayLog.scrollTop = txtMcpOverlayLog.scrollHeight;
      }
    } catch {}
  }

  GasProvisionerService.logCallback = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    const formatted = `[${time}] [INFO] [WA_GAS] ${msg}`;
    if (txtActivityLog) {
      if (txtActivityLog.value === 'No WhatsApp diagnostic logs recorded yet.' || !txtActivityLog.value.trim()) {
        txtActivityLog.value = formatted;
      } else {
        txtActivityLog.value += `\n${formatted}`;
      }
      txtActivityLog.scrollTop = txtActivityLog.scrollHeight;
    }
    if (txtMcpOverlayLog) {
      if (!txtMcpOverlayLog.value.trim()) {
        txtMcpOverlayLog.value = formatted;
      } else {
        txtMcpOverlayLog.value += `\n${formatted}`;
      }
      txtMcpOverlayLog.scrollTop = txtMcpOverlayLog.scrollHeight;
    }
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

  // Persistent Global Background Sync Status Watcher
  let lastAnnouncedProgressPercent = -1;
  let stickyLastProgress: {
    total: number;
    downloaded: number;
    skipped: number;
    failed?: number;
    phase?: string;
    ocrIndexed?: number;
    ocrProcessed?: number;
    ocrWaiting?: boolean;
    ocrStatusText?: string;
    ocrTotal?: number;
    ocrCurrent?: number;
  } | null = null;

  async function updateGlobalSyncBanner() {
    if (!globalSyncBanner) return;
    try {
      const data = await chrome.storage.local.get([
        'step2_initial_sync_in_progress',
        'step2_initial_sync_complete',
        'step2_sync_status',
        'step2_initial_sync_summary',
        'classroom_attachment_progress',
        'step2_sync_active_child_name',
        'multi_child_sync_queue'
      ]);

      const inProgress = Boolean(data.step2_initial_sync_in_progress);
      const isComplete = Boolean(data.step2_initial_sync_complete);
      const progress = data.classroom_attachment_progress;
      const summary = data.step2_initial_sync_summary;
      const syncStatus = data.step2_sync_status;
      const activeChildName = data.step2_sync_active_child_name || '';
      const queue: any[] = Array.isArray(data.multi_child_sync_queue) ? data.multi_child_sync_queue : [];
      const queuedNames = queue.map(q => q.childName).filter(Boolean).join(', ');

      const isInterruptedStatus = syncStatus === 'INTERRUPTED' ||
        Boolean(progress?.interrupted) ||
        (!inProgress && !isComplete && progress && (progress.downloaded || 0) + (progress.skipped || 0) < (progress.total || 0) && (progress.total || 0) > 0);

      if (inProgress || isInterruptedStatus || queue.length > 0) {
        setA11yVisibility(globalSyncBanner, true);
        if (globalSyncIcon) globalSyncIcon.textContent = isInterruptedStatus ? '⚠️' : '⏳';
        if (globalSyncTitle) {
          if (isInterruptedStatus) {
            globalSyncTitle.textContent = activeChildName 
              ? `1-Time School Archive Sync Paused (${activeChildName})` 
              : '1-Time School Archive Sync Paused';
          } else if (inProgress && activeChildName) {
            globalSyncTitle.textContent = queuedNames
              ? `1-Time School Archive: Syncing ${activeChildName} (${queue.length} Queued)`
              : `1-Time School Archive: Syncing ${activeChildName}`;
          } else if (queue.length > 0 && !inProgress) {
            globalSyncTitle.textContent = `1-Time School Archive Queued (${queuedNames})`;
          } else {
            globalSyncTitle.textContent = '1-Time School Archive Syncing in Background...';
          }
        }

        // Maintain monotonic sticky progress to prevent temporary storage drops or race conditions
        // from ever flipping the UI / screen readers back to generic "Scanning".
        if (progress && typeof progress.total === 'number' && progress.total > 0) {
          stickyLastProgress = {
            ...stickyLastProgress,
            ...progress,
            total: Math.max(progress.total, stickyLastProgress?.total || 0),
            downloaded: Math.max(progress.downloaded || 0, stickyLastProgress?.downloaded || 0),
            skipped: Math.max(progress.skipped || 0, stickyLastProgress?.skipped || 0),
            failed: Math.max(progress.failed || 0, stickyLastProgress?.failed || 0),
            ocrIndexed: Math.max(progress.ocrIndexed || 0, stickyLastProgress?.ocrIndexed || 0),
            ocrProcessed: Math.max(progress.ocrProcessed || 0, stickyLastProgress?.ocrProcessed || 0)
          };
        }

        const effectiveProgress = (progress && progress.total > 0) ? progress : stickyLastProgress;

        if (effectiveProgress && effectiveProgress.total > 0) {
          const isDualPipeline = effectiveProgress.phase === 'dual_pipeline' || (effectiveProgress.ocrWaiting !== undefined);
          const isOcrPhase = effectiveProgress.phase === 'ocr';
          const isInterrupted = isInterruptedStatus || effectiveProgress.phase === 'interrupted' || Boolean(effectiveProgress.interrupted);
          const successfulCount = (effectiveProgress.downloaded || 0) + (effectiveProgress.skipped || 0);
          const failedCount = effectiveProgress.failed || 0;
          const rawPercent = Math.round((successfulCount / effectiveProgress.total) * 100);
          // If at least one file has been downloaded/saved, ensure percent is at least 1% so screen readers don't announce 0%
          const downloadPercent = successfulCount > 0 ? Math.max(1, Math.min(100, rawPercent)) : Math.min(100, rawPercent);

          if (isInterrupted) {
            if (globalSyncBadge) {
              globalSyncBadge.textContent = `${downloadPercent}% (Paused)`;
              globalSyncBadge.style.background = '#fef3c7';
              globalSyncBadge.style.color = '#92400e';
              globalSyncBadge.style.border = '1px solid #fde68a';
            }
            if (globalSyncProgressBar) {
              globalSyncProgressBar.style.width = `${downloadPercent}%`;
              globalSyncProgressBar.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
            }
            if (globalSyncSubtext) {
              globalSyncSubtext.textContent = `⚠️ Sync paused: ${successfulCount}/${effectiveProgress.total} saved (${failedCount} remaining due to network disruption).`;
            }
            const interruptedDesc = `Sync paused: ${downloadPercent}% complete. ${successfulCount} of ${effectiveProgress.total} files saved. Network disruption detected.`;
            if (globalSyncProgressBarContainer) {
              globalSyncProgressBarContainer.setAttribute('role', 'progressbar');
              globalSyncProgressBarContainer.setAttribute('aria-valuenow', String(downloadPercent));
              globalSyncProgressBarContainer.setAttribute('aria-valuetext', interruptedDesc);
              globalSyncProgressBarContainer.setAttribute(
                'aria-label',
                `1-Time School Archive Background Sync Progress: ${downloadPercent}% (${successfulCount} of ${effectiveProgress.total} files saved, Paused)`
              );
            }
            if (globalSyncBanner) {
              globalSyncBanner.setAttribute('aria-label', interruptedDesc);
            }
            if (jawsLiveAnnouncer && lastAnnouncedProgressPercent !== downloadPercent) {
              lastAnnouncedProgressPercent = downloadPercent;
              jawsLiveAnnouncer.textContent = `1-Time School Archive Sync Paused: ${downloadPercent}% complete. ${successfulCount} of ${effectiveProgress.total} files saved.`;
            }
          } else if (isDualPipeline) {
            const ocrStatus = effectiveProgress.ocrStatusText || (effectiveProgress.ocrWaiting ? '⏳ OCR idle (files are digital text)' : `🔍 OCR Indexed: ${effectiveProgress.ocrIndexed || 0}`);
            if (globalSyncBadge) {
              globalSyncBadge.textContent = `${downloadPercent}%`;
              globalSyncBadge.style.background = '#dbeafe';
              globalSyncBadge.style.color = '#1e40af';
              globalSyncBadge.style.border = '1px solid #bfdbfe';
            }
            if (globalSyncProgressBar) {
              globalSyncProgressBar.style.width = `${downloadPercent}%`;
              globalSyncProgressBar.style.background = 'linear-gradient(90deg, #2563eb, #7c3aed)';
            }
            const progressDesc = `${downloadPercent}% complete. Vaulted ${successfulCount} of ${effectiveProgress.total} files. ${ocrStatus}.`;
            if (globalSyncProgressBarContainer) {
              globalSyncProgressBarContainer.setAttribute('role', 'progressbar');
              globalSyncProgressBarContainer.setAttribute('aria-valuenow', String(downloadPercent));
              globalSyncProgressBarContainer.setAttribute('aria-valuetext', progressDesc);
              globalSyncProgressBarContainer.setAttribute(
                'aria-label',
                `1-Time School Archive Background Sync Progress: ${downloadPercent}% (${successfulCount} of ${effectiveProgress.total} files saved)`
              );
            }
            if (globalSyncSubtext) {
              globalSyncSubtext.textContent = `📥 ${successfulCount}/${effectiveProgress.total} vaulted | ${ocrStatus}`;
            }
            if (globalSyncBanner) {
              globalSyncBanner.setAttribute('aria-label', `1-Time School Archive Background Sync: ${downloadPercent}% complete, ${successfulCount} of ${effectiveProgress.total} files saved.`);
            }
            if (jawsLiveAnnouncer && (lastAnnouncedProgressPercent === -1 || Math.abs(downloadPercent - lastAnnouncedProgressPercent) >= 5 || successfulCount === effectiveProgress.total)) {
              lastAnnouncedProgressPercent = downloadPercent;
              jawsLiveAnnouncer.textContent = `1-Time School Archive Sync: ${downloadPercent}% complete. ${successfulCount} of ${effectiveProgress.total} files saved.`;
            }
          } else if (isOcrPhase && effectiveProgress.ocrTotal && effectiveProgress.ocrTotal > 0) {
            const ocrDone = effectiveProgress.ocrCurrent || effectiveProgress.ocrIndexed || 0;
            const ocrPercent = Math.min(100, Math.round((ocrDone / effectiveProgress.ocrTotal) * 100));
            if (globalSyncBadge) {
              globalSyncBadge.textContent = `${ocrPercent}%`;
              globalSyncBadge.style.background = '#ede9fe';
              globalSyncBadge.style.color = '#5b21b6';
              globalSyncBadge.style.border = '1px solid #ddd6fe';
            }
            if (globalSyncProgressBar) {
              globalSyncProgressBar.style.width = `${ocrPercent}%`;
              globalSyncProgressBar.style.background = 'linear-gradient(90deg, #7c3aed, #8b5cf6)';
            }
            const ocrDesc = `Phase 2: Indexing and OCR ${ocrDone} of ${effectiveProgress.ocrTotal} files (${ocrPercent}%).`;
            if (globalSyncProgressBarContainer) {
              globalSyncProgressBarContainer.setAttribute('role', 'progressbar');
              globalSyncProgressBarContainer.setAttribute('aria-valuenow', String(ocrPercent));
              globalSyncProgressBarContainer.setAttribute('aria-valuetext', ocrDesc);
              globalSyncProgressBarContainer.setAttribute(
                'aria-label',
                `1-Time School Archive OCR Progress: ${ocrPercent}% (${ocrDone} of ${effectiveProgress.ocrTotal} files indexed)`
              );
            }
            if (globalSyncSubtext) {
              globalSyncSubtext.textContent = `🔍 Indexing for Search & OCR (${ocrDone}/${effectiveProgress.ocrTotal} files)...`;
            }
            if (globalSyncBanner) {
              globalSyncBanner.setAttribute('aria-label', `1-Time School Archive: Indexing and OCR ${ocrPercent}% complete (${ocrDone} of ${effectiveProgress.ocrTotal} files).`);
            }
            if (jawsLiveAnnouncer && (lastAnnouncedProgressPercent === -1 || Math.abs(ocrPercent - lastAnnouncedProgressPercent) >= 5 || ocrDone === effectiveProgress.ocrTotal)) {
              lastAnnouncedProgressPercent = ocrPercent;
              jawsLiveAnnouncer.textContent = `1-Time School Archive: Indexing and OCR ${ocrPercent}% complete. ${ocrDone} of ${effectiveProgress.ocrTotal} files indexed.`;
            }
          } else {
            if (globalSyncBadge) {
              globalSyncBadge.textContent = `${downloadPercent}%`;
              globalSyncBadge.style.background = '#dbeafe';
              globalSyncBadge.style.color = '#1e40af';
              globalSyncBadge.style.border = '1px solid #bfdbfe';
            }
            if (globalSyncProgressBar) {
              globalSyncProgressBar.style.width = `${downloadPercent}%`;
              globalSyncProgressBar.style.background = 'linear-gradient(90deg, #2563eb, #3b82f6)';
            }
            const dlDesc = `${downloadPercent}% complete. Downloaded ${successfulCount} of ${effectiveProgress.total} files.`;
            if (globalSyncProgressBarContainer) {
              globalSyncProgressBarContainer.setAttribute('role', 'progressbar');
              globalSyncProgressBarContainer.setAttribute('aria-valuenow', String(downloadPercent));
              globalSyncProgressBarContainer.setAttribute('aria-valuetext', dlDesc);
              globalSyncProgressBarContainer.setAttribute(
                'aria-label',
                `1-Time School Archive Background Sync Progress: ${downloadPercent}% (${successfulCount} of ${effectiveProgress.total} files downloaded)`
              );
            }
            if (globalSyncSubtext) {
              globalSyncSubtext.textContent = `📥 Downloading & saving files (${successfulCount}/${effectiveProgress.total})...`;
            }
            if (globalSyncBanner) {
              globalSyncBanner.setAttribute('aria-label', `1-Time School Archive Background Sync: ${downloadPercent}% complete, ${successfulCount} of ${effectiveProgress.total} files downloaded.`);
            }
            if (jawsLiveAnnouncer && (lastAnnouncedProgressPercent === -1 || Math.abs(downloadPercent - lastAnnouncedProgressPercent) >= 5 || successfulCount === effectiveProgress.total)) {
              lastAnnouncedProgressPercent = downloadPercent;
              jawsLiveAnnouncer.textContent = `1-Time School Archive Sync: ${downloadPercent}% complete. ${successfulCount} of ${effectiveProgress.total} files downloaded.`;
            }
          }
        } else {
          const currentCount = progress ? ((progress.downloaded || 0) + (progress.skipped || 0)) : 0;
          if (currentCount > 0) {
            if (globalSyncBadge) globalSyncBadge.textContent = 'Syncing';
            if (globalSyncProgressBar) {
              globalSyncProgressBar.style.width = '20%';
              globalSyncProgressBar.style.background = 'linear-gradient(90deg, #3b82f6, #60a5fa)';
            }
            const countDesc = `Syncing in progress. Saved ${currentCount} files into Vault so far.`;
            if (globalSyncProgressBarContainer) {
              globalSyncProgressBarContainer.setAttribute('role', 'progressbar');
              globalSyncProgressBarContainer.setAttribute('aria-valuenow', '20');
              globalSyncProgressBarContainer.setAttribute('aria-valuetext', countDesc);
              globalSyncProgressBarContainer.setAttribute('aria-label', `1-Time School Archive Background Sync Progress: Saved ${currentCount} files`);
            }
            if (globalSyncSubtext) {
              globalSyncSubtext.textContent = `📥 ${currentCount} files saved to Vault...`;
            }
            if (globalSyncBanner) {
              globalSyncBanner.setAttribute('aria-label', `1-Time School Archive Background Sync: ${currentCount} files saved so far.`);
            }
          } else {
            if (globalSyncBadge) globalSyncBadge.textContent = 'Scanning';
            if (globalSyncProgressBar) {
              globalSyncProgressBar.style.width = '10%';
              globalSyncProgressBar.style.background = 'linear-gradient(90deg, #3b82f6, #60a5fa)';
            }
            const scanDesc = 'Scanning Classroom coursework and Gmail circular attachments in background.';
            if (globalSyncProgressBarContainer) {
              globalSyncProgressBarContainer.setAttribute('role', 'progressbar');
              globalSyncProgressBarContainer.setAttribute('aria-valuenow', '10');
              globalSyncProgressBarContainer.setAttribute('aria-valuetext', scanDesc);
              globalSyncProgressBarContainer.setAttribute('aria-label', '1-Time School Archive Background Sync Progress: Scanning attachments');
            }
            if (globalSyncSubtext) {
              globalSyncSubtext.textContent = 'Scanning Classroom coursework and Gmail attachments...';
            }
            if (globalSyncBanner) {
              globalSyncBanner.setAttribute('aria-label', '1-Time School Archive Background Sync: Scanning attachments.');
            }
          }
        }
      } else if (isComplete && summary) {
        stickyLastProgress = null;
        setA11yVisibility(globalSyncBanner, true);
        if (globalSyncIcon) globalSyncIcon.textContent = '✅';
        if (globalSyncTitle) globalSyncTitle.textContent = '1-Time School Archive Ready';
        if (globalSyncBadge) globalSyncBadge.textContent = '100%';
        if (globalSyncProgressBar) {
          globalSyncProgressBar.style.width = '100%';
          globalSyncProgressBar.style.background = 'linear-gradient(90deg, #10b981, #059669)';
        }
        if (globalSyncProgressBarContainer) {
          globalSyncProgressBarContainer.setAttribute('aria-valuenow', '100');
          globalSyncProgressBarContainer.setAttribute('aria-valuetext', '100% complete. All historical coursework and circulars are fully indexed in your Vault.');
        }
        if (globalSyncSubtext) {
          const totalAtt = summary.attachments || (summary.classroomAttachments || 0) + (summary.emailAttachments || 0);
          const ocrText = summary.ocrIndexed ? ` | ${summary.ocrIndexed} OCR-indexed` : '';
          globalSyncSubtext.textContent = `All historical coursework & circulars indexed in Parent Vault (${totalAtt} files${ocrText}).`;
        }
        if (jawsLiveAnnouncer && !jawsLiveAnnouncer.dataset.syncAnnounced) {
          jawsLiveAnnouncer.dataset.syncAnnounced = 'true';
          jawsLiveAnnouncer.textContent = '1-Time School Archive is 100% complete and indexed in your Vault.';
        }
      } else {
        stickyLastProgress = null;
        setA11yVisibility(globalSyncBanner, false);
      }
    } catch {
      setA11yVisibility(globalSyncBanner, false);
    }
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        if (
          changes.step2_initial_sync_in_progress ||
          changes.step2_initial_sync_complete ||
          changes.step2_sync_status ||
          changes.classroom_attachment_progress ||
          changes.step2_initial_sync_summary ||
          changes.multi_child_sync_queue ||
          changes.step2_sync_active_child_name ||
          changes.step2_sync_active_child_id ||
          changes.multi_child_profiles
        ) {
          updateGlobalSyncBanner();
          if (currentWizardStep === 2) {
            updateStep2View();
          }
        }
      }
    });
  }

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type === 'SYNC_QUEUE_UPDATED' || msg?.type === 'SYNC_QUEUE_NEXT_STARTED') {
        updateGlobalSyncBanner();
        if (currentWizardStep === 2) {
          updateStep2View();
        }
        if (msg.type === 'SYNC_QUEUE_NEXT_STARTED' && jawsLiveAnnouncer && msg.payload?.childName) {
          jawsLiveAnnouncer.textContent = `Starting 1-time school archive sync for ${msg.payload.childName}.`;
        }
      }
      if (msg?.type === 'BROWSER_CLASSROOM_SYNC_PROGRESS' && msg.payload) {
        setA11yVisibility(browserSyncProgressBox, true);
        if (lblBrowserSyncStatusText) lblBrowserSyncStatusText.textContent = msg.payload.message || 'Syncing Classroom...';
        if (lblBrowserSyncPercent) lblBrowserSyncPercent.textContent = `${msg.payload.percent || 0}%`;
        if (browserSyncProgressBar) browserSyncProgressBar.style.width = `${msg.payload.percent || 0}%`;
        if (msg.payload.phase === 'COMPLETED') {
          if (lblStep2InitialSyncSummary) {
            lblStep2InitialSyncSummary.innerHTML = `⚡ <strong>Browser Direct Sync Complete!</strong><br>Archived <strong>${msg.payload.coursesFound || 1} course(s)</strong>, <strong>${msg.payload.itemsFound || 0} items</strong>, and <strong>${msg.payload.attachmentsSaved || 0} attachment(s)</strong> directly into your Parent Vault (<code>K.I.D.S. Data/</code>).`;
          }
          setA11yVisibility(step2InitialSyncResults, true);
          setA11yVisibility(btnNavStep2ToStep3, true);
          setA11yVisibility(btnSkipStep2Top, false);
          setA11yVisibility(btnSkipStep2Bottom, false);
          updateStep2View();
        }
      }
    });
  }

  updateGlobalSyncBanner();
  setInterval(updateGlobalSyncBanner, 3000);

  // Auto-recheck API status when popup regains focus (throttled to avoid exhausting Google quotas)
  let lastApiCheckTime = 0;
  window.addEventListener('focus', () => {
    const now = Date.now();
    if (now - lastApiCheckTime < 30000) return;
    lastApiCheckTime = now;
    if (currentWizardStep === 1) {
      checkStep1ApiStatus(false);
    } else if (currentWizardStep === 2) {
      checkStep2ApiStatus(false);
    }
  });

  // Auto-trigger background sync health check to recover any interrupted session seamlessly without requiring button clicks
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: 'CHECK_INITIAL_SYNC_HEALTH' }).catch(() => {});
  }
});
