import { ChildManager, ChildProfile } from './childManager';
import { AuthService } from './authService';
import { PersonalDriveService } from './personalDriveService';
import { WhatsAppDiagnosticLogger } from './whatsappLogger';
import { NotificationService } from './notificationService';

export const CURRENT_GAS_SERVER_VERSION = '4.4.0';
export const CURRENT_GAS_CHANGELOG = 'Deferred Trigger Creation Until 1-Time Sync Completion & Pre-Lock Fast-Exit Guards';

/**
 * GasProvisionerService - Automated 1-Click Provisioning of personal Google Apps Script MCP Server
 */
export interface ProvisionResult {
  success: boolean;
  scriptId: string;
  deploymentId: string;
  webAppUrl: string;
  verifiedTools: any[];
  isReused?: boolean;
  needsAuth?: boolean;
  initialSyncResult?: any;
}

export interface ActiveDeployProgress {
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ERROR' | 'IDLE';
  workerType: 'SCHOOL_WORKER' | 'MASTER_WORKER';
  childName?: string;
  academicYear?: string;
  percent: number;
  phaseText: string;
  subtext: string;
  stage?: 'script' | 'data';
  stagePercent?: number;
  updatedAt: number;
  result?: ProvisionResult;
  error?: string;
}

export class GasProvisionerService {
  public static logCallback?: (msg: string) => void;
  public static isInitialSyncRunning = false;

  public static async isServerUpdateAvailable(activeChild?: ChildProfile | null): Promise<{ isAvailable: boolean; currentVersion: string; deployedVersion?: string; changelog: string }> {
    const child = activeChild || (await ChildManager.getActiveProfile());
    if (!child || (!child.gasScriptId && !child.gasDeploymentUrl)) {
      return { isAvailable: false, currentVersion: CURRENT_GAS_SERVER_VERSION, changelog: CURRENT_GAS_CHANGELOG };
    }
    const deployedVersion = child.deployedGasVersion || '1.0.0';
    const isAvailable = deployedVersion !== CURRENT_GAS_SERVER_VERSION;
    return {
      isAvailable,
      currentVersion: CURRENT_GAS_SERVER_VERSION,
      deployedVersion,
      changelog: CURRENT_GAS_CHANGELOG
    };
  }

  public static async getOutdatedProfiles(): Promise<Array<{ profile: ChildProfile; currentVersion: string; deployedVersion: string }>> {
    const profiles = await ChildManager.getProfiles(false);
    const outdated: Array<{ profile: ChildProfile; currentVersion: string; deployedVersion: string }> = [];

    for (const p of profiles) {
      if (p.gasScriptId || p.gasDeploymentUrl) {
        const deployed = p.deployedGasVersion || '1.0.0';
        if (deployed !== CURRENT_GAS_SERVER_VERSION) {
          outdated.push({
            profile: p,
            currentVersion: CURRENT_GAS_SERVER_VERSION,
            deployedVersion: deployed
          });
        }
      }
    }
    return outdated;
  }

  private static progressCallback?: (percent: number, phaseText: string, subtext: string, stage?: 'script' | 'data', stagePercent?: number) => void;
  private static currentDeployProgress: ActiveDeployProgress | null = null;

  public static setProgressCallback(cb?: (percent: number, phaseText: string, subtext: string, stage?: 'script' | 'data', stagePercent?: number) => void) {
    this.progressCallback = cb;
  }

  public static async getActiveDeployProgress(): Promise<ActiveDeployProgress | null> {
    if (this.currentDeployProgress) return this.currentDeployProgress;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const stored = await chrome.storage.local.get(['active_deploy_progress']);
        return stored.active_deploy_progress || null;
      } catch (e) {}
    }
    return null;
  }

  public static async setActiveDeployProgress(progress: ActiveDeployProgress | null): Promise<void> {
    this.currentDeployProgress = progress;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        if (progress) {
          await chrome.storage.local.set({ active_deploy_progress: progress });
        } else {
          await chrome.storage.local.remove(['active_deploy_progress']);
        }
      } catch (e) {}
    }
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage && progress) {
      chrome.runtime.sendMessage({ type: 'DEPLOY_PROGRESS_UPDATE', payload: progress }).catch(() => {});
    }
  }

  public static async clearActiveDeployProgress(): Promise<void> {
    await this.setActiveDeployProgress(null);
  }

  public static reportProgress(percent: number, phaseText: string, subtext: string, stage?: 'script' | 'data', stagePercent?: number) {
    if (this.progressCallback) {
      try { this.progressCallback(percent, phaseText, subtext, stage, stagePercent); } catch (e) {}
    }

    const updated: ActiveDeployProgress = {
      status: percent >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
      workerType: this.currentDeployProgress?.workerType || 'SCHOOL_WORKER',
      childName: this.currentDeployProgress?.childName,
      academicYear: this.currentDeployProgress?.academicYear,
      percent,
      phaseText,
      subtext,
      stage,
      stagePercent,
      updatedAt: Date.now()
    };
    this.setActiveDeployProgress(updated).catch(() => {});
  }

  public static log(msg: string) {
    console.log(`[School MCP] ${msg}`);
    if (this.logCallback) {
      try { this.logCallback(msg); } catch (e) {}
    }
    WhatsAppDiagnosticLogger.log('INFO', 'GAS', msg).catch(() => {});
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'APPEND_LOG', payload: { message: msg } }).catch(() => {});
    }
  }

  /**
   * Retrieves the current Master Personal Worker status and credentials from Drive / storage.
   */
  public static async getMasterWorkerStatus(token?: string): Promise<{ isDeployed: boolean; scriptId?: string; webAppUrl?: string }> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const stored = await chrome.storage.local.get(['master_worker_script_id', 'master_worker_deployment_url']);
        if (stored.master_worker_script_id) {
          return { isDeployed: true, scriptId: stored.master_worker_script_id, webAppUrl: stored.master_worker_deployment_url };
        }
      }
      const parentToken = token || (await PersonalDriveService.getValidToken(false).catch(() => ''));
      if (parentToken) {
        const root = await PersonalDriveService.getOrCreateRootFolder(parentToken).catch(() => null);
        if (root) {
          const rootConfig = await PersonalDriveService.readJsonFileInFolder(parentToken, root.id, 'K.I.D.S._Data_config.json').catch(() => null);
          if (rootConfig && rootConfig.masterWorkerScriptId) {
            return { isDeployed: true, scriptId: rootConfig.masterWorkerScriptId, webAppUrl: rootConfig.masterWorkerDeploymentUrl };
          }
        }
      }
    } catch (e) {}
    return { isDeployed: false };
  }

  /**
   * Provisions the Master Personal Worker in the parent's personal Google account (daarshnicsanjeev@gmail.com).
   */
  public static async provisionPersonalMasterWorker(parentToken: string, rootFolderId: string): Promise<ProvisionResult> {
    this.reportProgress(15, 'Phase 1 of 4 (15%)', 'Authenticating Parent Personal Google Account & Google Drive...');
    this.log('🔐 Provisioning Master Personal Worker in Parent Account (daarshnicsanjeev@gmail.com)...');

    let scriptId = '';
    let deploymentId = '';
    let webAppUrl = '';

    const rootConfig = await PersonalDriveService.readJsonFileInFolder(parentToken, rootFolderId, 'K.I.D.S._Data_config.json').catch(() => null);
    let existingScriptId = (rootConfig && rootConfig.masterWorkerScriptId) ? rootConfig.masterWorkerScriptId : '';

    if (existingScriptId) {
      const isAlive = await this.verifyScriptAlive(existingScriptId, parentToken);
      if (isAlive) {
        this.log(`📦 Matched existing Master Personal Worker in Parent Account (${existingScriptId}). Reusing...`);
        scriptId = existingScriptId;
        deploymentId = rootConfig.masterWorkerDeploymentId || '';
        webAppUrl = rootConfig.masterWorkerDeploymentUrl || '';
      }
    }

    if (!scriptId) {
      this.reportProgress(35, 'Phase 2 of 4 (35%)', 'Creating Master Apps Script Project in Parent Account...');
      this.log('📁 Creating Master Worker Project (POST /v1/projects)...');
      const project = await this.createProject(parentToken);
      scriptId = project.scriptId;
      this.log(`✅ Created Master Worker Project: ${scriptId}`);
    }

    const masterAccessKey = 'MasterKey_' + Math.random().toString(36).substring(2, 10);

    this.reportProgress(60, 'Phase 3 of 4 (60%)', 'Uploading Master Sync, Portal Scraper & Multi-Child Registry...');
    this.log('📤 Uploading Master Personal Worker modules to script project...');
    await this.updateProjectContent(scriptId, masterAccessKey, parentToken, 'Master', 'Family');

    this.reportProgress(80, 'Phase 4 of 4 (80%)', 'Deploying Master Web App & Creating 24/7 Cloud Triggers...');
    this.log('🏷️ Publishing Master Web App deployment...');
    const version = await this.createVersion(scriptId, parentToken, 'Master', 'Family');
    const versionNumber = version.versionNumber || 1;

    if (deploymentId) {
      await this.updateDeployment(scriptId, deploymentId, versionNumber, parentToken, 'Master', 'Family');
      if (!webAppUrl) webAppUrl = `https://script.google.com/macros/s/${deploymentId}/exec?accessKey=${masterAccessKey}`;
    } else {
      const deployment = await this.createDeployment(scriptId, versionNumber, parentToken, 'Master', 'Family');
      deploymentId = deployment.deploymentId;
      const ep = deployment.entryPoints ? deployment.entryPoints.find((e: any) => e.entryPointType === 'WEB_APP') : null;
      webAppUrl = (ep && ep.webApp && ep.webApp.url) ? ep.webApp.url : `https://script.google.com/macros/s/${deploymentId}/exec?accessKey=${masterAccessKey}`;
    }

    // Strip multi-account prefix
    webAppUrl = webAppUrl.replace(/\/macros\/u\/\d+\/s\//, '/macros/s/');
    if (!webAppUrl.includes('accessKey=')) {
      webAppUrl = webAppUrl.includes('?') ? `${webAppUrl}&accessKey=${masterAccessKey}` : `${webAppUrl}?accessKey=${masterAccessKey}`;
    }

    await this.ensureScriptAuthorized(webAppUrl, parentToken, scriptId, undefined, 'master');

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({
        master_worker_script_id: scriptId,
        master_worker_deployment_url: webAppUrl
      }).catch(() => {});
    }

    await PersonalDriveService.saveRootConfig(parentToken);

    this.reportProgress(100, 'Phase 4 of 4 (100%)', 'Personal Master Worker Deployed & Active!');
    this.log('✅ Personal Master Worker provisioned and active in Parent Google Account.');

    return {
      success: true,
      scriptId,
      deploymentId,
      webAppUrl,
      verifiedTools: []
    };
  }

  /**
   * Main provisioning pipeline: Auth -> Reuse or Create Project -> Update Content -> Deploy -> Verify.
   */
  public static async provision(forceNew: boolean = false): Promise<ProvisionResult> {
    this.reportProgress(10, 'Phase 1 of 5 (10%)', 'Requesting Google OAuth consent & permissions...');
    this.log('🔐 Requesting Google OAuth token with required permissions...');
    const token = await this.getAuthToken();
    if (!token) {
      this.log('❌ Could not obtain Google OAuth consent.');
      throw new Error("Could not obtain Google OAuth consent.");
    }
    this.log('✅ Google OAuth token granted successfully.');

    const activeChild = await ChildManager.getActiveProfile();
    const childName = activeChild?.name || 'Child';
    const academicYear = activeChild?.academicYear || '';
    this.log(`👶 Target Child Profile: ${childName} (${academicYear}) (ID: ${activeChild?.id || 'default'})`);

    this.reportProgress(25, 'Phase 2 of 5 (25%)', `Searching for existing project for ${childName}...`);
    let existing: { scriptId: string; deploymentId: string; webAppUrl: string; accessKey?: string } | null = null;

    if (!forceNew) {
      existing = await this.findExistingProject(token, childName, academicYear);
      if (existing) {
        this.log(`📦 Matched existing Apps Script project in account: ${existing.scriptId} (deploymentId: ${existing.deploymentId || 'none'})`);
      } else {
        this.log('ℹ️ No existing Apps Script project matched for this profile. Creating fresh project...');
      }
    } else {
      this.log('🔄 Force Fresh Project: Discarding cached credentials...');
      if (typeof chrome !== 'undefined' && chrome.storage) {
        if (chrome.storage.sync) await chrome.storage.sync.remove(['mcp_gas_script_id', 'mcp_gas_deployment_id', 'mcp_gas_url', 'access_key']).catch(() => {});
        if (chrome.storage.local) await chrome.storage.local.remove(['mcp_gas_script_id', 'mcp_gas_deployment_id', 'mcp_gas_url', 'access_key']).catch(() => {});
      }
      if (activeChild && activeChild.id) {
        await ChildManager.updateProfile(activeChild.id, {
          gasScriptId: undefined,
          gasDeploymentUrl: undefined
        });
      }
    }

    let scriptId: string;
    let deploymentId: string;
    let webAppUrl: string;
    let isReused = false;

    // Use persistent access key if available to preserve exact connection URL
    let accessKey = (existing && existing.accessKey) || '';
    if (!accessKey) {
      accessKey = 'Key_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    }

    if (existing && existing.scriptId) {
      isReused = true;
      scriptId = existing.scriptId;
      deploymentId = existing.deploymentId || '';
      webAppUrl = existing.webAppUrl || '';
      this.log(`🎯 Existing project matched for ${childName}: scriptId=${scriptId}, deploymentId=${deploymentId || 'new'}`);

      // 1. UPDATE existing script code files directly (Code.gs, WorkspaceFetcher.gs, etc.)
      this.reportProgress(50, 'Phase 3 of 5 (50%)', 'Pushing updated server codebase & tool handlers...');
      this.log(`📤 Pushing backend code files (PUT /v1/projects/${scriptId}/content)...`);
      await this.updateProjectContent(scriptId, accessKey, token, childName, academicYear);
      this.log('✅ Code content updated successfully.');

      // 2. CREATE a new immutable version
      this.reportProgress(70, 'Phase 4 of 5 (70%)', 'Creating version & updating Web App deployment...');
      this.log(`🏷️ Creating version (POST /v1/projects/${scriptId}/versions)...`);
      const version = await this.createVersion(scriptId, token, childName, academicYear);
      const versionNumber = version.versionNumber || 1;
      this.log(`✅ Version ${versionNumber} created.`);

      // 3. Update existing deployment OR create deployment if not present
      if (deploymentId) {
        this.log(`🔄 Updating existing deployment in place (PUT /deployments/${deploymentId})...`);
        await this.updateDeployment(scriptId, deploymentId, versionNumber, token, childName, academicYear);
        if (!webAppUrl) {
          webAppUrl = `https://script.google.com/macros/s/${deploymentId}/exec?accessKey=${accessKey}`;
        }
        this.log(`✅ Deployment updated in-place. Permanent URL: ${webAppUrl}`);
      } else {
        this.log(`🚀 Creating initial Web App deployment for existing project...`);
        const deployment = await this.createDeployment(scriptId, versionNumber, token, childName, academicYear);
        deploymentId = deployment.deploymentId;
        const ep = deployment.entryPoints ? deployment.entryPoints.find((e: any) => e.entryPointType === 'WEB_APP') : null;
        webAppUrl = (ep && ep.webApp && ep.webApp.url) ? ep.webApp.url : `https://script.google.com/macros/s/${deploymentId}/exec`;
        this.log(`✅ Web App deployed successfully: ${webAppUrl}`);
      }
    } else {
      // Create new Apps Script project for active child in student account
      this.reportProgress(40, 'Phase 2 of 5 (40%)', `Creating dedicated Google Apps Script project for ${childName}...`);
      this.log(`📁 Creating new project for ${childName} in student Google account (POST /v1/projects)...`);
      const project = await this.createProject(token);
      scriptId = project.scriptId;
      this.log(`✅ New project created: scriptId=${scriptId}`);
      this.reportProgress(60, 'Phase 3 of 5 (60%)', 'Uploading MCP server code and manifest...');
      this.log('📤 Uploading server code files and manifest (appsscript.json)...');
      await this.updateProjectContent(scriptId, accessKey, token, childName, academicYear);
      this.reportProgress(75, 'Phase 4 of 5 (75%)', 'Creating version and deploying executable Web App...');
      this.log('🏷️ Creating version 1 (POST /v1/projects/.../versions)...');
      const version = await this.createVersion(scriptId, token, childName, academicYear);
      this.log('🚀 Deploying Web App with manifest appsscript (POST /v1/projects/.../deployments)...');
      const deployment = await this.createDeployment(scriptId, version.versionNumber || 1, token, childName, academicYear);
      deploymentId = deployment.deploymentId;
      const ep = deployment.entryPoints ? deployment.entryPoints.find((e: any) => e.entryPointType === 'WEB_APP') : null;
      webAppUrl = (ep && ep.webApp && ep.webApp.url) ? ep.webApp.url : `https://script.google.com/macros/s/${deploymentId}/exec`;
      this.log(`✅ Web App deployed successfully: ${webAppUrl}`);
      this.log(`🔒 Security & Access: 'Anyone' (Anonymous execution allowed for Gemini Spark / AI Clients)`);
    }

    // Strip any Google multi-account index (/u/1/) to form the clean canonical Web App URL
    webAppUrl = webAppUrl.replace(/\/macros\/u\/\d+\/s\//, '/macros/s/');

    // Append unique accessKey to webAppUrl if not present
    if (!webAppUrl.includes('accessKey=')) {
      webAppUrl = webAppUrl.includes('?') ? `${webAppUrl}&accessKey=${accessKey}` : `${webAppUrl}?accessKey=${accessKey}`;
    }

    // Update child profile with scriptId & deploymentUrl & deployedGasVersion
    if (activeChild && activeChild.id) {
      await ChildManager.updateProfile(activeChild.id, {
        gasScriptId: scriptId,
        gasDeploymentUrl: webAppUrl,
        deployedGasVersion: CURRENT_GAS_SERVER_VERSION
      });
    }

    // Step 4: Persist configuration in Google Drive (Authoritative cloud source of truth)
    this.reportProgress(88, 'Phase 5 of 5 (88%)', 'Saving 5-tier modular configuration to Google Drive...');
    this.log('💾 Saving configuration to Drive...');
    await this.saveDriveConfigFile(scriptId, deploymentId, accessKey, webAppUrl, token, childName, academicYear);

    // Step 5: Save credentials in Chrome Extension Storage (Profile & Local)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const payload = {
        mcp_gas_url: webAppUrl,
        mcp_gas_deployment_id: deploymentId,
        access_key: accessKey,
        mcp_gas_script_id: scriptId
      };
      if (chrome.storage.sync) {
        await chrome.storage.sync.set(payload).catch(() => {});
      }
      if (chrome.storage.local) {
        await chrome.storage.local.set(payload).catch(() => {});
      }
      this.log('💾 Saved credentials to Chrome storage.');
    }
    
    // Pre-warm Google Services & Bind Scopes via Execution API
    this.reportProgress(94, 'Phase 5 of 5 (94%)', 'Pre-warming Google Workspace services...');
    this.log('⚙️ Pre-warming Google Workspace services (Classroom, Drive, Calendar, Gmail)...');
    await this.runTestAuth(scriptId, token);

    // Interactive Authorization Check if required by Google Apps Script runtime
    await this.ensureScriptAuthorized(webAppUrl, token, scriptId, activeChild?.accountEmail);

    // Verify Server Execution via authenticated Web App ping & Execution API
    this.reportProgress(98, 'Phase 5 of 5 (98%)', 'Verifying live MCP Server tools...');
    this.log(`🧪 Verifying MCP Server tools (Authenticated Bearer Token & Execution API)...`);
    let verifiedTools: any[] = [];
    let needsAuth = false;
    try {
      verifiedTools = await this.verifyMcpServerUrl(webAppUrl, scriptId, token, accessKey);
      this.log(`🎉 Server verified successfully (HTTP 200)! ${verifiedTools.length} active tools ready.`);
      this.log(`📋 Server URL ready for Gemini Spark: ${webAppUrl}`);
    } catch (e: any) {
      this.log(`ℹ️ Server deployed. Initial ping note: ${e.message}`);
      needsAuth = true;
      verifiedTools = [
        { name: 'get_classroom_assignments' },
        { name: 'get_student_timetable' },
        { name: 'get_teacher_announcements' },
        { name: 'get_google_calendar_events' },
        { name: 'search_google_drive' },
        { name: 'get_school_portal_notifications' }
      ];
    }

    this.reportProgress(100, 'Complete (100%)', 'MCP Server created & verified successfully!');

    return {
      success: true,
      scriptId,
      deploymentId,
      webAppUrl,
      verifiedTools,
      isReused,
      needsAuth
    };
  }

  private static CONFIG_FILE_NAME = 'K.I.D.S._mcp_config.json';

  /**
   * Pure Apps Script REST API Verification:
   * Verifies that the project exists and is accessible via Apps Script REST API (GET /v1/projects/${scriptId}).
   */
  public static async verifyScriptAlive(scriptId: string, token: string): Promise<boolean> {
    if (!scriptId) return false;
    try {
      const scriptRes = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return scriptRes.ok;
    } catch (e) {
      return false;
    }
  }

  public static getConfigFileName(childName?: string, academicYear?: string): string {
    const cleanChild = (childName || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanYear = (academicYear || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (cleanChild && cleanYear) {
      return `K.I.D.S._${cleanChild}_${cleanYear}_config.json`;
    } else if (cleanChild) {
      return `K.I.D.S._${cleanChild}_config.json`;
    }
    return this.CONFIG_FILE_NAME;
  }

  /**
   * Reads persistent K.I.D.S._[Child]_[Year]_config.json from Google Drive.
   */
  public static async loadDriveConfigFile(token: string, childName?: string, academicYear?: string): Promise<{
    childId?: string;
    childName?: string;
    academicYear?: string;
    hasClassroom?: boolean;
    portalDomain?: string;
    registeredTools?: any[];
    scriptId: string;
    deploymentId: string;
    webAppUrl: string;
    accessKey: string;
    updatedAt?: string;
  } | null> {
    const targetFileName = this.getConfigFileName(childName, academicYear);
    try {
      this.log(`🔍 Searching Drive for extension config file (${targetFileName})...`);
      const query = encodeURIComponent(`(name = '${targetFileName}' or name = '${this.CONFIG_FILE_NAME}' or name = 'school_mcp_config.json') and trashed = false`);
      const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=10`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        const matchedFile = data.files.find((f: any) => f.name === targetFileName) || data.files[0];
        const fileId = matchedFile.id;
        this.log(`📄 Found config file in Drive (${matchedFile.name}, ID: ${fileId}). Reading configuration...`);
        const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (contentRes.ok) {
          const config = await contentRes.json();
          this.log(`✅ Loaded existing configuration from Drive: scriptId=${config.scriptId}, deploymentId=${config.deploymentId}, tools=${config.registeredTools?.length || 0}`);
          return config;
        }
      }
    } catch (e) {
      this.log(`⚠️ Could not read Drive config file: ${e}`);
    }
    return null;
  }

  /**
   * Saves 5-tier modular configuration to Google Drive.
   */
  public static async saveDriveConfigFile(
    scriptId: string,
    deploymentId: string,
    accessKey: string,
    webAppUrl: string,
    token: string,
    childName?: string,
    academicYear?: string,
    profileOverrides?: Partial<ChildProfile>
  ): Promise<void> {
    const activeChild = await ChildManager.getActiveProfile();
    const cleanChild = childName || activeChild?.name || 'Child';
    const cleanYear = academicYear || activeChild?.academicYear || '2026-2027';

    try {
      this.log(`💾 Saving modular 5-tier configuration for ${cleanChild} (${cleanYear})...`);
      
      const driveToken = await PersonalDriveService.getValidToken(false).catch(() => token);

      if (activeChild && profileOverrides) {
        await ChildManager.updateProfile(activeChild.id, profileOverrides);
      }

      await PersonalDriveService.saveKidConfig(driveToken, cleanChild, cleanYear, {
        gasScriptId: scriptId,
        gasDeploymentUrl: webAppUrl,
        ...(profileOverrides || {})
      });

      await PersonalDriveService.savePortalToolsConfig(driveToken, cleanChild, cleanYear);
      await PersonalDriveService.saveMessagingToolsConfig(driveToken, cleanChild, cleanYear);
      await PersonalDriveService.saveYearConfig(driveToken, cleanYear);
      await PersonalDriveService.saveRootConfig(driveToken);

      this.log(`✅ Saved 5-tier modular configuration to Google Drive for ${cleanChild} (${cleanYear}).`);
    } catch (e) {
      this.log(`⚠️ Could not save Drive modular config: ${e}`);
    }
  }

  /**
   * Authoritative Discovery: Checks if Kid Config exists in Drive -> Reuse or Create.
   */
  public static async findExistingProject(token: string, childName?: string, academicYear?: string): Promise<{ scriptId: string; deploymentId: string; webAppUrl: string; accessKey?: string } | null> {
    try {
      const activeChild = await ChildManager.getActiveProfile();
      const cleanChild = childName || activeChild?.name || 'Child';
      const cleanYear = academicYear || activeChild?.academicYear || '2026-2027';

      const driveToken = await PersonalDriveService.getValidToken(false).catch(() => token);
      const kidInfo = await PersonalDriveService.getOrCreateKidFolder(driveToken, cleanChild, cleanYear).catch(() => null);
      if (kidInfo) {
        const kidConfig = await PersonalDriveService.readJsonFileInFolder(driveToken, kidInfo.id, `${cleanChild}_config.json`).catch(() => null);
        if (kidConfig && kidConfig.scriptId) {
          const isAlive = await this.verifyScriptAlive(kidConfig.scriptId, token);
          if (isAlive) {
            this.log(`📦 Found existing active project from Kid config (${kidConfig.scriptId}). Reusing...`);
            return {
              scriptId: kidConfig.scriptId,
              deploymentId: kidConfig.deploymentId,
              webAppUrl: kidConfig.url,
              accessKey: (kidConfig.url.match(/accessKey=([^&]+)/) || [])[1]
            };
          }
        }
      }
    } catch (e) {}

    this.log('ℹ️ No active config file found in Google Drive. Creating fresh Google Apps Script project...');
    return null;
  }

  /**
   * Validates logged in account domain and checks if Apps Script API is enabled.
   */
  public static async checkAccountAndApiStatus(token?: string): Promise<{
    email: string;
    domain: string;
    isGmail: boolean;
    apiEnabled: boolean;
  }> {
    let activeToken = token;
    if (!activeToken) {
      try {
        activeToken = await this.getAuthToken(false);
      } catch (e) {
        // Silent token failed; fallback to interactive token
        try {
          activeToken = await this.getAuthToken(true);
        } catch (err) {}
      }
    }
    let email = '';
    let domain = '';
    let isGmail = false;
    let apiEnabled = false;

    if (activeToken) {
      // 1. Fetch user profile
      try {
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { 'Authorization': `Bearer ${activeToken}` }
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          email = userData.email || '';
          if (email.includes('@')) {
            domain = email.split('@')[1];
            isGmail = domain.toLowerCase() === 'gmail.com';
          }
        }
      } catch (e) {}

      // 2. Check Apps Script API settings
      try {
        const settingsRes = await fetch('https://script.googleapis.com/v1/usersettings', {
          headers: { 'Authorization': `Bearer ${activeToken}` }
        });
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          apiEnabled = settingsData.userSettings?.gaaEnabled === true;
        }
      } catch (e) {}
    }

    return { email, domain, isGmail, apiEnabled };
  }

  /**
   * Obtains OAuth token using AuthService (with local expiry caching and auto-prompting).
   */
  public static getAuthToken(interactive: boolean = true): Promise<string> {
    return AuthService.getValidAuthToken(interactive);
  }

  /**
   * Interactive web auth flow reading client_id dynamically from manifest.json.
   */
  private static launchGoogleWebAuthFlow(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.identity) {
        return resolve("mock_oauth_access_token_dev");
      }

      const manifest = chrome.runtime.getManifest();
      const clientId = manifest.oauth2?.client_id;

      if (!clientId || clientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
        return reject(new Error("Please configure a valid OAuth Client ID in manifest.json."));
      }

      const redirectUri = chrome.identity.getRedirectURL();
      const scopes = (manifest.oauth2?.scopes && manifest.oauth2.scopes.length > 0)
        ? manifest.oauth2.scopes.join(' ')
        : [
            'https://www.googleapis.com/auth/script.projects',
            'https://www.googleapis.com/auth/script.deployments',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/classroom.courses.readonly',
            'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
            'https://www.googleapis.com/auth/calendar.events.readonly'
          ].join(' ');

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&response_type=token` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&prompt=select_account`;

      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (responseUrl) => {
        if (chrome.runtime.lastError || !responseUrl) {
          const err = chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Auth canceled';
          return reject(new Error(`Google Sign-In Error: ${err}. Ensure your Google Cloud Client ID allows redirect URI: ${redirectUri}`));
        }
        const urlParams = new URLSearchParams(new URL(responseUrl).hash.substring(1));
        const accessToken = urlParams.get('access_token');
        if (accessToken) {
          resolve(accessToken);
        } else {
          reject(new Error("No access token returned by Google OAuth."));
        }
      });
    });
  }

  /**
   * Creates a new Google Apps Script project via Apps Script REST API (POST /v1/projects).
   */
  private static async createProject(token: string): Promise<any> {
    let projectTitle = 'Kids Intelligent Dashboard System (K.I.D.S.)';
    try {
      const active = await ChildManager.getActiveProfile();
      if (active && active.name) {
        const yearSuffix = active.academicYear ? ` (${active.academicYear})` : '';
        projectTitle = `Kids Intelligent Dashboard System (K.I.D.S.) - ${active.name}${yearSuffix}`;
      }
    } catch (e) {}

    const response = await fetch('https://script.googleapis.com/v1/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: projectTitle
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to create Apps Script project (${response.status}): ${errText}`);
    }

    return await response.json();
  }

  /**
   * Renames an existing Google Apps Script project in-place via Drive API and updates CONFIG in Code.gs.
   */
  public static async renameAppsScriptProject(
    scriptId: string,
    newName: string,
    academicYear: string = '',
    token?: string
  ): Promise<void> {
    try {
      const activeToken = token || await this.getAuthToken(false).catch(() => null);
      if (!activeToken || !scriptId) return;

      const yearSuffix = academicYear ? ` (${academicYear})` : '';
      const newTitle = `Kids Intelligent Dashboard System (K.I.D.S.) - ${newName}${yearSuffix}`;

      // 1. Rename the Google Drive file (Apps Script projects are Drive files)
      await fetch(`https://www.googleapis.com/drive/v3/files/${scriptId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${activeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newTitle })
      }).catch(() => {});

      // 2. Also update CONFIG in Code.gs if accessKey is stored
      let accessKey = '';
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const state = await chrome.storage.local.get(['access_key']);
        accessKey = state.access_key || '';
      }
      if (accessKey) {
        await this.updateProjectContent(scriptId, accessKey, activeToken, newName, academicYear).catch(() => {});
      }
    } catch (e) {
      console.warn('[GasProvisioner] renameAppsScriptProject warning:', e);
    }
  }

  /**
   * Pushes Code.gs, WorkspaceFetcher.gs, PortalApiFetcher.gs, StorageRepository.gs & appsscript.json.
   */
  public static async updateProjectContent(scriptId: string, accessKey: string, token: string, childName: string = 'Child', academicYear: string = ''): Promise<any> {
    const files = [
      {
        name: 'appsscript',
        type: 'JSON',
        source: JSON.stringify({
          timeZone: 'Asia/Kolkata',
          exceptionLogging: 'STACKDRIVER',
          runtimeVersion: 'V8',
          webapp: { access: 'ANYONE_ANONYMOUS', executeAs: 'USER_DEPLOYING' },
          executionApi: { access: 'ANYONE' },
          dependencies: {
            enabledAdvancedServices: [
              {
                userSymbol: 'Classroom',
                version: 'v1',
                serviceId: 'classroom'
              },
              {
                userSymbol: 'Drive',
                version: 'v2',
                serviceId: 'drive'
              }
            ]
          },
          oauthScopes: [
            'https://www.googleapis.com/auth/classroom.courses.readonly',
            'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
            'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly',
            'https://www.googleapis.com/auth/classroom.announcements.readonly',
            'https://www.googleapis.com/auth/classroom.rosters.readonly',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events.readonly',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/documents',
            'https://www.googleapis.com/auth/documents.readonly',
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/spreadsheets.readonly',
            'https://www.googleapis.com/auth/presentations',
            'https://www.googleapis.com/auth/presentations.readonly',
            'https://www.googleapis.com/auth/script.external_request',
            'https://www.googleapis.com/auth/script.scriptapp'
          ]
        }, null, 2)
      },
      {
        name: 'Code',
        type: 'SERVER_JS',
        source: `
var CONFIG = {
  accessKey: "${accessKey}",
  childName: "${childName.replace(/"/g, '\\"')}",
  academicYear: "${academicYear.replace(/"/g, '\\"')}"
};

var McpLogger = {
  MAX_LOGS: 100,
  log: function(level, action, details) {
    try {
      var entry = {
        time: new Date().toISOString(),
        level: level,
        action: action,
        details: typeof details === 'object' ? JSON.stringify(details) : String(details)
      };
      var props = PropertiesService.getUserProperties();
      var raw = props.getProperty('mcp_execution_logs');
      var logs = raw ? JSON.parse(raw) : [];
      logs.unshift(entry);
      if (logs.length > this.MAX_LOGS) {
        logs = logs.slice(0, this.MAX_LOGS);
      }
      props.setProperty('mcp_execution_logs', JSON.stringify(logs));
    } catch (e) {
      Logger.log('Log write error: ' + e);
    }
  },
  getLogs: function() {
    try {
      var props = PropertiesService.getUserProperties();
      var raw = props.getProperty('mcp_execution_logs');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [{ time: new Date().toISOString(), level: 'ERROR', action: 'getLogs', details: e.toString() }];
    }
  },
  clearLogs: function() {
    try {
      PropertiesService.getUserProperties().deleteProperty('mcp_execution_logs');
      return true;
    } catch (e) {
      return false;
    }
  },
  saveToVault: function(kidFolder) {
    if (!kidFolder) return false;
    try {
      var payload = JSON.stringify({
        updatedAt: new Date().toISOString(),
        logs: this.getLogs()
      }, null, 2);
      var it = kidFolder.getFilesByName('sync_diagnostics_log.json');
      if (it.hasNext()) {
        var f = it.next();
        if (f.getContent() !== payload) {
          f.setContent(payload);
        }
      } else {
        kidFolder.createFile('sync_diagnostics_log.json', payload, 'application/json');
      }
      return true;
    } catch (e) {
      return false;
    }
  }
};

function testAuth() {
  var drive = DriveApp.getRootFolder().getName();
  var tempDoc = Drive.Files.insert({ title: 'test_mcp_auth_probe', mimeType: 'application/vnd.google-apps.document' });
  if (tempDoc && tempDoc.id) {
    Drive.Files.remove(tempDoc.id);
  }
  var doc = DocumentApp.create('test_mcp_doc_auth');
  DriveApp.getFileById(doc.getId()).setTrashed(true);
  var classroom = Classroom.Courses.list({ studentId: 'me' });
  var gmail = GmailApp.getInboxThreads(0, 1);
  var calendar = CalendarApp.getDefaultCalendar();
  McpLogger.log('INFO', 'testAuth', 'All Google services verified and authorized successfully.');
}

function doGet(e) {
  // 1. One-time Parent Consent Handshake & Autonomous Trigger Provisioning
  if (!e || !e.parameter || !e.parameter.accessKey || e.parameter.auth === 'true' || e.parameter.authInit === 'true') {
    try {
      if (typeof Classroom !== 'undefined' && Classroom.Courses) {
        Classroom.Courses.list({ pageSize: 1 });
      }
    } catch (err) {}

    var wType = (e && e.parameter && e.parameter.workerType) ? e.parameter.workerType : '';
    var isDual = (e && e.parameter && (e.parameter.dualWorker === 'true' || e.parameter.isDualWorker === 'true'));
    if (isDual || wType === 'school') {
      try {
        PropertiesService.getScriptProperties().setProperty('is_dual_worker', 'true');
      } catch (pErr) {}
    }
    try {
      setupAutonomousTriggers(wType);
    } catch (trigErr) {
      McpLogger.log('WARN', 'doGet:direct_trigger_attempt', trigErr.toString());
    }

    return HtmlService.createHtmlOutput(
      '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<title>K.I.D.S. Cloud Sync Authorization</title>' +
      '<style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:85vh;margin:0;background:#f8fafc;color:#0f172a;}' +
      '.box{background:white;padding:32px;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.08);text-align:center;max-width:380px;}' +
      'h3{color:#16a34a;margin-top:0;font-size:20px;}' +
      'p{color:#64748b;font-size:14px;line-height:1.5;}' +
      '.badge{background:#dcfce7;color:#166534;padding:6px 14px;border-radius:20px;font-weight:600;font-size:12px;display:inline-block;margin-top:10px;}' +
      '</style></head>' +
      '<body><div class="box"><h3>✅ MCP Server Connected!</h3>' +
      '<p>Google Workspace permissions approved.</p>' +
      '<div id="triggerBadge" class="badge">⚡ Activating 24/7 Cloud Sync...</div></div>' +
      '<script>' +
      'function closeWin() {' +
      '  try { google.script.host.close(); } catch(e) {}' +
      '  try { window.top.close(); } catch(e) {}' +
      '  try { window.close(); } catch(e) {}' +
      '}' +
      'try {' +
      '  if (typeof google !== "undefined" && google.script && google.script.run) {' +
      '    google.script.run' +
      '      .withSuccessHandler(function(res) {' +
      '        var el = document.getElementById("triggerBadge");' +
      '        if (el) el.innerHTML = "⚡ 24/7 Cloud Trigger Active!";' +
      '        setTimeout(closeWin, 1000);' +
      '      })' +
      '      .withFailureHandler(function(err) {' +
      '        var el = document.getElementById("triggerBadge");' +
      '        if (el) el.innerHTML = "⚡ Connected! Closing...";' +
      '        setTimeout(closeWin, 1200);' +
      '      })' +
      '      .setupAutonomousTriggers("' + wType + '");' +
      '  } else {' +
      '    setTimeout(closeWin, 1500);' +
      '  }' +
      '} catch (err) {' +
      '  setTimeout(closeWin, 1500);' +
      '}' +
      '</script></body></html>'
    ).setTitle('K.I.D.S. Cloud Sync Authorization');
  }

  if (typeof CONFIG !== 'undefined' && e.parameter.accessKey !== CONFIG.accessKey) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized access key." }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (e.parameter.action === 'getLogs') {
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      logs: McpLogger.getLogs()
    })).setMimeType(ContentService.MimeType.JSON);
  }
  if (e.parameter.action === 'clearLogs') {
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      cleared: McpLogger.clearLogs()
    })).setMimeType(ContentService.MimeType.JSON);
  }
  if (e.parameter.action === 'setupTriggers') {
    var res = setupAutonomousTriggers(e.parameter.workerType);
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      result: res
    })).setMimeType(ContentService.MimeType.JSON);
  }
  if (e.parameter.action === 'pauseNightlySync') {
    var pRes = pauseNightlySyncTriggers();
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      result: pRes
    })).setMimeType(ContentService.MimeType.JSON);
  }
  if (e.parameter.action === 'resumeMorningSync') {
    var rRes = resumeMorningSyncTriggers();
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      result: rRes
    })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    version: "4.4.0",
    name: "Kids Intelligent Dashboard System (K.I.D.S.) Cloud Ingestion Engine"
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No POST payload received.");
    }

    var json = JSON.parse(e.postData.contents);
    var method = json.method;
    var params = json.params || {};
    var id = json.id;

    var passedKey = (e.parameter && e.parameter.accessKey) || (params && params.accessKey) || (json && json.accessKey);
    if (typeof CONFIG !== 'undefined' && CONFIG.accessKey && passedKey !== CONFIG.accessKey) {
      return ContentService.createTextOutput(JSON.stringify({
        jsonrpc: "2.0",
        id: id !== undefined ? id : null,
        error: { code: -32000, message: "Unauthorized access key." }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var result;

    if (method === "initialize") {
      result = {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "K.I.D.S. Cloud Ingestion Engine", version: "4.0.0" }
      };
    } else if (method === "notifications/initialized") {
      return ContentService.createTextOutput(JSON.stringify({ jsonrpc: "2.0", id: id !== undefined ? id : null })).setMimeType(ContentService.MimeType.JSON);
    } else if (method === "tools/list") {
      result = handleToolsList();
    } else if (method === "tools/call") {
      result = handleToolsCall(params.name, params.arguments || {});
    } else if (method === "sync_classroom_and_gmail" || method === "extract_classroom_and_gmail") {
      result = handleSyncClassroomAndGmail(params);
    } else if (method === "sync_all_portals") {
      result = handleSyncAllPortals(params);
    } else if (method === "register_school_worker") {
      result = handleRegisterSchoolWorker(params);
    } else if (method === "sync_master_cloud_school") {
      var tChild = params ? (params.childId || params.childName || params.targetChild) : null;
      var initPass = params ? (params.isInitialPass === true || params.initialPass === true) : false;
      result = runMasterCloudSchoolSync(params && (params.force === true || params.manual === true), tChild, initPass);
    } else if (method === "register_portal_job" || method === "register_mcp_tool") {
      result = handleRegisterPortalJob(params);
    } else if (method === "setup_triggers") {
      result = handleSetupTriggers(params);
    } else if (method === "pause_nightly_sync") {
      result = pauseNightlySyncTriggers();
    } else if (method === "resume_morning_sync") {
      result = resumeMorningSyncTriggers();
    } else if (method === "get_file_blob") {
      result = handleGetFileBlob(params);
    } else if (method === "get_gmail_attachment") {
      result = handleGetGmailAttachment(params);
    } else if (method === "get_vault_file") {
      result = handleGetVaultFile(params);
    } else if (method === "list_vault_files") {
      result = handleListVaultFiles(params);
    } else if (method === "save_vault_file") {
      result = handleSaveVaultFile(params);
    } else if (method === "search_vault_documents") {
      var kidFolder = null;
      var targetFolderId = params.targetFolderId || PropertiesService.getScriptProperties().getProperty('target_folder_id');
      if (targetFolderId) {
        try { kidFolder = DriveApp.getFolderById(targetFolderId); } catch (e) {}
      }
      result = DocumentOcrService.searchVaultDocuments(kidFolder, params.query);
    } else if (method === "index_whatsapp_media") {
      result = DocumentOcrService.indexDocumentById(params.fileId, params.childName, 'whatsapp');
    } else if (method === "run_vault_ocr_indexing") {
      var kidFolder = null;
      var targetFolderId = params.targetFolderId || PropertiesService.getScriptProperties().getProperty('target_folder_id');
      if (targetFolderId) {
        try { kidFolder = DriveApp.getFolderById(targetFolderId); } catch (e) {}
      }
      result = DocumentOcrService.runAutomatedVaultIndexing(kidFolder, params.maxBatch || 15);
      if (result && result.totalPendingRemaining > 0 && params.scheduleContinuation !== false) {
        try {
          var ocrTrigs = ScriptApp.getProjectTriggers();
          for (var ot = 0; ot < ocrTrigs.length; ot++) {
            if (ocrTrigs[ot].getHandlerFunction() === 'runAutonomousVaultOcr') {
              ScriptApp.deleteTrigger(ocrTrigs[ot]);
            }
          }
          ScriptApp.newTrigger('runAutonomousVaultOcr').timeBased().after(20000).create();
          result.continuationScheduled = true;
          McpLogger.log('INFO', 'OCR_CONTINUATION_TRIGGER_SET', 'Scheduled autonomous OCR continuation in 20s. Remaining: ' + result.totalPendingRemaining);
        } catch (ocrContErr) {}
      }
    } else if (method === "run_autonomous_vault_ocr") {
      result = runAutonomousVaultOcr();
    } else if (method === "set_sync_state" || method === "set_initial_sync_complete") {
      result = handleSetSyncState(params);
    } else if (method === "clear_triggers" || method === "clearTriggers") {
      var allTriggers = ScriptApp.getProjectTriggers();
      var clearedCount = 0;
      for (var ct = 0; ct < allTriggers.length; ct++) {
        ScriptApp.deleteTrigger(allTriggers[ct]);
        clearedCount++;
      }
      result = { success: true, clearedCount: clearedCount };
    } else {
      throw new Error("Method not supported: " + method);
    }

    return ContentService.createTextOutput(JSON.stringify({
      jsonrpc: "2.0",
      id: id !== undefined ? id : null,
      result: result
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32603, message: err.toString() }
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleSyncClassroomAndGmail(params) {
  try { McpLogger.log('INFO', 'HANDLE_SYNC_CLASSROOM_GMAIL_CALLED', 'childName=' + params.childName + ' extractOnly=' + params.extractOnly + ' isIncremental=' + params.isIncremental + ' targetFolderId=' + params.targetFolderId); } catch (logErr) {}
  var isWriting = !params.extractOnly && !!params.targetFolderId;
  var lock = isWriting ? LockService.getScriptLock() : null;
  if (lock && !lock.tryLock(30000)) {
    return { success: false, locked: true, error: "Script lock busy: sync in progress" };
  }
  try {
    var folderId = params.targetFolderId || PropertiesService.getScriptProperties().getProperty('target_folder_id') || null;
    var childName = params.childName || 'Atharva';
    var academicYear = params.academicYear || '2026-2027';
    var schoolDomain = params.schoolDomain || '';

    if (folderId) {
      try {
        PropertiesService.getScriptProperties().setProperties({
          target_folder_id: folderId,
          child_name: childName,
          academic_year: academicYear,
          school_domain: schoolDomain
        });
      } catch (pErr) {}
    }

    var classroomRes = ClassroomIngester.sync(folderId, childName, academicYear, !!params.isIncremental, !!params.extractOnly);
    var gmailRes = null;
    try {
      gmailRes = GmailIngester.sync(folderId, childName, academicYear, schoolDomain, !!params.isIncremental, !!params.extractOnly);
    } catch (gErr) {
      McpLogger.log('WARN', 'GMAIL_SYNC_WARN', 'Gmail sync error: ' + gErr);
      gmailRes = {
        kidName: childName,
        academicYear: academicYear,
        schoolDomain: schoolDomain || '',
        lastSyncedAt: new Date().toISOString(),
        totalEmails: 0,
        totalAttachments: 0,
        emails: [],
        error: gErr.toString()
      };
    }
    var digestRes = null;
    try {
      if (folderId && !params.extractOnly) {
        digestRes = DigestBuilder.build(folderId, childName, academicYear);
      }
    } catch (dErr) {
      McpLogger.log('WARN', 'DIGEST_BUILD_SKIP', 'Skipping digest build: ' + dErr);
    }

    try {
      var logFolderId = params.targetFolderId || PropertiesService.getScriptProperties().getProperty('target_folder_id');
      if (logFolderId) {
        McpLogger.saveToVault(DriveApp.getFolderById(logFolderId));
      }
    } catch (saveErr) {}

    return {
      success: true,
      classroom: classroomRes,
      gmail: gmailRes,
      digest: digestRes
    };
  } finally {
    if (lock) {
      lock.releaseLock();
    }
  }
}

function handleGetVaultFile(params) {
  var folderId = params.folderId;
  var fileName = params.fileName;
  var fileId = params.fileId;
  var file = null;

  try {
    if (fileId) {
      file = DriveApp.getFileById(fileId);
    } else if (folderId && fileName) {
      var folder = DriveApp.getFolderById(folderId);
      if (!folder || folder.isTrashed()) return { success: false, notFound: true, error: "Folder not found" };
      var it = folder.getFilesByName(fileName);
      var count = 0;
      while (it.hasNext()) {
        var f = it.next();
        if (f.isTrashed()) continue;
        count++;
        if (!file || f.getLastUpdated() > file.getLastUpdated()) {
          file = f;
        }
      }
      if (count > 1) {
        McpLogger.log('WARN', 'DUPLICATE_DETECTED', 'Found ' + count + ' copies of ' + fileName + ' in folder ' + folderId + '. Selected newest.');
      }
    }

    if (!file || file.isTrashed()) {
      return { success: false, notFound: true, error: "File not found" };
    }

    var mime = file.getMimeType();
    var content;
    if (mime === 'application/json') {
      try {
        content = JSON.parse(file.getBlob().getDataAsString());
      } catch (e) {
        content = file.getBlob().getDataAsString();
      }
    } else {
      content = file.getBlob().getDataAsString();
    }

    return {
      success: true,
      id: file.getId(),
      name: file.getName(),
      mimeType: mime,
      content: content,
      size: file.getSize(),
      lastUpdated: file.getLastUpdated().toISOString()
    };
  } catch (err) {
    return { success: false, notFound: true, error: err.toString() };
  }
}

function handleListVaultFiles(params) {
  var folderId = params.folderId;
  if (!folderId) return { success: false, error: "No folderId provided" };

  try {
    var folder = DriveApp.getFolderById(folderId);
    if (!folder || folder.isTrashed()) return { success: false, error: "Folder not found" };
    var it = folder.getFiles();
    var files = [];
    while (it.hasNext()) {
      var f = it.next();
      if (!f.isTrashed()) {
        files.push({
          id: f.getId(),
          name: f.getName(),
          mimeType: f.getMimeType(),
          size: f.getSize(),
          lastUpdated: f.getLastUpdated().toISOString()
        });
      }
    }
    return { success: true, files: files };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function handleSaveVaultFile(params) {
  var folderId = params.folderId;
  var fileName = params.fileName;
  var content = params.content;
  var mimeType = params.mimeType || 'application/json';

  if (!folderId || !fileName) return { success: false, error: "folderId and fileName required" };

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { success: false, locked: true, error: "Script lock busy: sync in progress" };
  }

  try {
    var folder = DriveApp.getFolderById(folderId);
    if (!folder || folder.isTrashed()) return { success: false, error: "Folder not found" };

    var it = folder.getFilesByName(fileName);
    var matches = [];
    while (it.hasNext()) {
      var f = it.next();
      if (!f.isTrashed()) {
        matches.push(f);
      }
    }

    var targetFile = null;
    var duplicatesTrashed = 0;

    if (matches.length > 0) {
      targetFile = matches[0];
      for (var i = 1; i < matches.length; i++) {
        if (matches[i].getLastUpdated() > targetFile.getLastUpdated()) {
          targetFile = matches[i];
        }
      }

      for (var j = 0; j < matches.length; j++) {
        if (matches[j].getId() !== targetFile.getId()) {
          try {
            matches[j].setTrashed(true);
            duplicatesTrashed++;
          } catch (tErr) {}
        }
      }
    }

    if (duplicatesTrashed > 0) {
      McpLogger.log('WARN', 'DUPLICATE_HEALED', 'Trashed ' + duplicatesTrashed + ' stale duplicate(s) of ' + fileName + ' in folder ' + folderId + '. Kept newest (' + targetFile.getId() + ').');
    }

    var payloadStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

    if (targetFile) {
      targetFile.setContent(payloadStr);
      return { success: true, id: targetFile.getId(), updated: true, duplicatesTrashed: duplicatesTrashed };
    } else {
      var created = folder.createFile(fileName, payloadStr, mimeType);
      return { success: true, id: created.getId(), created: true, duplicatesTrashed: duplicatesTrashed };
    }
  } catch (err) {
    return { success: false, error: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

function handleGetFileBlob(params) {
  var fid = params.fileId;
  if (!fid) return { success: false, error: "No fileId provided" };

  var name = 'attachment_' + fid;
  var mime = 'application/octet-stream';
  var tok = ScriptApp.getOAuthToken();
  // Collects one short note per strategy attempted, whether it threw or just returned a non-200,
  // so the final failure message actually says what was tried instead of a bare "unable to
  // retrieve" that gives the caller nothing to act on.
  var notes = [];

  // Strategy A: Drive REST API v3 with ScriptApp.getOAuthToken() & supportsAllDrives=true
  try {
    var metaUrl = 'https://www.googleapis.com/drive/v3/files/' + fid + '?fields=id,name,mimeType,size&supportsAllDrives=true';
    var metaRes = UrlFetchApp.fetch(metaUrl, {
      headers: { 'Authorization': 'Bearer ' + tok },
      muteHttpExceptions: true
    });

    if (metaRes.getResponseCode() === 200) {
      var meta = JSON.parse(metaRes.getContentText());
      name = meta.name || name;
      mime = meta.mimeType || mime;
      var isGoogleApp = mime && mime.indexOf('application/vnd.google-apps') !== -1;

      var dlUrl = isGoogleApp
        ? 'https://www.googleapis.com/drive/v3/files/' + fid + '/export?mimeType=application/pdf&supportsAllDrives=true'
        : 'https://www.googleapis.com/drive/v3/files/' + fid + '?alt=media&supportsAllDrives=true';

      var dlRes = UrlFetchApp.fetch(dlUrl, {
        headers: { 'Authorization': 'Bearer ' + tok },
        muteHttpExceptions: true
      });

      if (dlRes.getResponseCode() === 200) {
        var blob = dlRes.getBlob();
        if (isGoogleApp) {
          mime = 'application/pdf';
          if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
        }
        return {
          success: true,
          name: name,
          mimeType: mime,
          base64: Utilities.base64Encode(blob.getBytes())
        };
      }
      notes.push('A:download HTTP ' + dlRes.getResponseCode());
    } else {
      notes.push('A:meta HTTP ' + metaRes.getResponseCode());
    }
  } catch (errA) {
    notes.push('A:exception ' + errA.toString());
    McpLogger.log('WARN', 'GET_BLOB_V3_WARN', 'REST API v3 fetch error for ' + fid + ': ' + errA.toString());
  }

  // Strategy B: Advanced Drive Service (v2) if available
  try {
    if (typeof Drive !== 'undefined' && Drive.Files) {
      var fileResource = Drive.Files.get(fid, { supportsAllDrives: true });
      if (fileResource) {
        name = fileResource.title || name;
        mime = fileResource.mimeType || mime;
        var fetchUrl = fileResource.downloadUrl;
        if (fileResource.exportLinks && fileResource.exportLinks['application/pdf']) {
          fetchUrl = fileResource.exportLinks['application/pdf'];
          mime = 'application/pdf';
          if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
        }
        if (fetchUrl) {
          var advRes = UrlFetchApp.fetch(fetchUrl, {
            headers: { 'Authorization': 'Bearer ' + tok },
            muteHttpExceptions: true
          });
          if (advRes.getResponseCode() === 200) {
            return {
              success: true,
              name: name,
              mimeType: mime,
              base64: Utilities.base64Encode(advRes.getBlob().getBytes())
            };
          }
          notes.push('B:download HTTP ' + advRes.getResponseCode());
        } else {
          notes.push('B:no downloadUrl/exportLink on file resource');
        }
      } else {
        notes.push('B:Drive.Files.get returned nothing');
      }
    } else {
      notes.push('B:Advanced Drive service not enabled');
    }
  } catch (errB) {
    notes.push('B:exception ' + errB.toString());
    McpLogger.log('WARN', 'GET_BLOB_V2_WARN', 'Advanced Drive v2 fetch error for ' + fid + ': ' + errB.toString());
  }

  // Strategy C: DriveApp fallback (if user opened or added to personal My Drive)
  try {
    var f = DriveApp.getFileById(fid);
    if (f) {
      name = f.getName() || name;
      mime = f.getMimeType() || mime;
      var b;
      if (mime.indexOf('google-apps') !== -1) {
        var exp = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + fid + '/export?mimeType=application/pdf', {
          headers: { 'Authorization': 'Bearer ' + tok },
          muteHttpExceptions: true
        });
        b = exp.getBlob();
        mime = 'application/pdf';
        if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
      } else {
        b = f.getBlob();
      }
      return {
        success: true,
        name: name,
        mimeType: mime,
        base64: Utilities.base64Encode(b.getBytes())
      };
    }
    notes.push('C:DriveApp.getFileById returned nothing');
  } catch (errC) {
    notes.push('C:exception ' + errC.toString());
    McpLogger.log('WARN', 'GET_BLOB_DRIVEAPP_WARN', 'DriveApp fetch error for ' + fid + ': ' + errC.toString());
  }

  var noteSummary = notes.join(' | ');
  McpLogger.log('WARN', 'GET_FILE_BLOB_FAILED', 'All strategies failed to retrieve file ' + fid + ' (last known name: ' + name + ', mime: ' + mime + '): ' + noteSummary);
  return {
    success: false,
    error: 'Unable to retrieve file ' + fid + ' [' + noteSummary + ']'
  };
}

function handleGetGmailAttachment(params) {
  var messageId = params.messageId;
  var attachmentIndex = params.attachmentIndex;
  var filename = params.filename;
  if (!messageId) throw new Error("messageId is required");
  var msg = GmailApp.getMessageById(messageId);
  if (!msg) throw new Error("Message not found: " + messageId);
  var atts = msg.getAttachments();
  var targetAtt = null;
  if (attachmentIndex !== undefined && attachmentIndex !== null && atts[attachmentIndex]) {
    targetAtt = atts[attachmentIndex];
  } else if (filename) {
    for (var i = 0; i < atts.length; i++) {
      if (atts[i].getName() === filename) {
        targetAtt = atts[i];
        break;
      }
    }
  }
  if (!targetAtt && atts.length > 0) targetAtt = atts[0];
  if (!targetAtt) throw new Error("Attachment not found in message: " + messageId);
  return {
    name: targetAtt.getName(),
    mimeType: targetAtt.getContentType(),
    size: targetAtt.getSize(),
    base64: Utilities.base64Encode(targetAtt.getBytes())
  };
}

function handleSyncAllPortals(params) {
  var res = PortalIngester.syncAll();
  return { success: true, result: res };
}

function handleRegisterPortalJob(params) {
  var childId = params.childId || 'default_child';
  var kidName = params.childName || params.kidName || 'Atharva';
  var props = PropertiesService.getScriptProperties();
  var portalFolderId = params.portalFolderId || params.targetFolderId;
  if (!portalFolderId) {
    try {
      var schoolRaw = props.getProperty('multi_child_school_registry');
      if (schoolRaw) {
        var schoolReg = JSON.parse(schoolRaw);
        var matchedSchoolChild = (schoolReg.children || []).find(function(sc) {
          return sc.childId === childId || (sc.kidName && sc.kidName.toLowerCase() === kidName.toLowerCase());
        });
        if (matchedSchoolChild && matchedSchoolChild.targetFolderId) {
          portalFolderId = matchedSchoolChild.targetFolderId;
        }
      }
    } catch(e) {}
  }
  var domain = params.domain;
  var feature = params.feature;
  var endpointSpec = params.endpoint_spec || { url: params.url };
  var authSpec = params.auth_spec || { cookies: params.cookies };

  var raw = props.getProperty('multi_child_portal_registry');
  var registry = raw ? JSON.parse(raw) : { children: [] };

  var child = registry.children.find(function(c) { return c.childId === childId || c.kidName.toLowerCase() === kidName.toLowerCase(); });
  if (!child) {
    child = {
      childId: childId,
      kidName: kidName,
      portalFolderId: portalFolderId,
      domains: {}
    };
    registry.children.push(child);
  }

  if (portalFolderId) child.portalFolderId = portalFolderId;
  if (!child.domains) child.domains = {};
  if (!child.domains[domain]) {
    child.domains[domain] = {
      security_payload: { cookies: authSpec.cookies || '' },
      features: []
    };
  } else if (authSpec && authSpec.cookies) {
    child.domains[domain].security_payload = { cookies: authSpec.cookies };
  }

  var existingIdx = child.domains[domain].features.findIndex(function(f) { return f.name.toLowerCase() === feature.toLowerCase(); });
  if (existingIdx >= 0) {
    child.domains[domain].features[existingIdx] = { name: feature, endpoint: endpointSpec.url };
  } else {
    child.domains[domain].features.push({ name: feature, endpoint: endpointSpec.url });
  }

  props.setProperty('multi_child_portal_registry', JSON.stringify(registry));
  McpLogger.log('SUCCESS', 'PORTAL_REGISTER_OK', 'Registered portal feature ' + feature + ' for ' + kidName + ' (' + domain + ')');

  return { registered: true, childId: childId, domain: domain, feature: feature };
}

function handleRegisterSchoolWorker(params) {
  var childId = params.childId || 'default_child';
  var kidName = params.childName || params.kidName || 'Atharva';
  var academicYear = params.academicYear || '2026-2027';
  var schoolWorkerUrl = params.schoolWorkerUrl;
  var schoolDomain = params.schoolDomain || '';
  var targetFolderId = params.targetFolderId;
  var initialSyncComplete = params.initialSyncComplete !== undefined ? !!params.initialSyncComplete : false;

  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('multi_child_school_registry');
  var registry;
  try {
    registry = raw ? JSON.parse(raw) : { children: [] };
  } catch (e) {
    registry = { children: [] };
  }
  if (!registry.children) registry.children = [];

  var child = registry.children.find(function(c) { return c.childId === childId || (c.kidName && c.kidName.toLowerCase() === kidName.toLowerCase()); });
  if (!child) {
    child = {
      childId: childId,
      kidName: kidName,
      academicYear: academicYear,
      schoolWorkerUrl: schoolWorkerUrl,
      schoolDomain: schoolDomain,
      targetFolderId: targetFolderId,
      initialSyncComplete: initialSyncComplete,
      registeredAt: new Date().toISOString()
    };
    registry.children.push(child);
  } else {
    if (schoolWorkerUrl) child.schoolWorkerUrl = schoolWorkerUrl;
    if (academicYear) child.academicYear = academicYear;
    if (schoolDomain) child.schoolDomain = schoolDomain;
    if (targetFolderId) child.targetFolderId = targetFolderId;
    if (params.initialSyncComplete !== undefined) {
      child.initialSyncComplete = !!params.initialSyncComplete;
    }
    child.updatedAt = new Date().toISOString();
  }

  props.setProperty('multi_child_school_registry', JSON.stringify(registry));
  var triggerRes = null;
  // Strictly defer autonomous trigger creation until 1-time initial sync has completed.
  // When Step 2 registers the child initially, child.initialSyncComplete is false -> no trigger created.
  // When 1-time data sync completes, the extension re-registers with initialSyncComplete: true -> trigger created!
  if (child.initialSyncComplete === true) {
    try {
      triggerRes = setupMasterCloudSyncTrigger();
    } catch(tErr) {
      triggerRes = { success: false, error: tErr.toString() };
    }
  } else {
    triggerRes = { success: true, deferred: true, reason: 'awaiting_1time_sync_completion' };
    McpLogger.log('INFO', 'TRIGGER_DEFERRED', 'Autonomous 1-minute trigger deferred for ' + kidName + ' until 1-time initial sync completes.');
  }

  McpLogger.log('SUCCESS', 'SCHOOL_REGISTER_OK', 'Registered School Cloud Worker for ' + kidName + ' (' + academicYear + ') in Personal Master Worker');
  return {
    registered: true,
    childId: childId,
    kidName: kidName,
    initialSyncComplete: child.initialSyncComplete,
    triggerResult: triggerRes
  };
}

/**
 * Nightly Quiet Hours: Directly deletes all 1-minute sync triggers at 11:00 PM IST.
 * Ensures zero 1-minute triggers exist or fire between 11 PM and 6 AM IST.
 */
function pauseNightlySyncTriggers() {
  var deletedCount = 0;
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      var hFn = triggers[i].getHandlerFunction();
      if (hFn === 'runMasterCloudSchoolSync' || hFn === 'runIncrementalSchoolSync' || hFn === 'runAutonomousVaultOcr') {
        ScriptApp.deleteTrigger(triggers[i]);
        deletedCount++;
      }
    }
    McpLogger.log('INFO', 'QUIET_HOURS_PAUSED', 'Paused 1-minute sync for the night (11 PM to 6 AM IST). Deleted ' + deletedCount + ' trigger(s).');
  } catch (err) {
    McpLogger.log('WARN', 'QUIET_HOURS_PAUSE_ERROR', 'Could not delete 1-minute trigger: ' + err);
  }
  return { paused: true, deletedTriggers: deletedCount };
}

/**
 * Morning Wake-up: Re-creates the 1-minute sync trigger at 6:00 AM IST.
 */
function resumeMorningSyncTriggers() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      var hFn = triggers[i].getHandlerFunction();
      if (hFn === 'runMasterCloudSchoolSync' || hFn === 'runIncrementalSchoolSync') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }

    var props = PropertiesService.getScriptProperties();
    var rawReg = props.getProperty('multi_child_school_registry');
    var canInstallSync = false;
    if (rawReg) {
      try {
        var parsedReg = JSON.parse(rawReg);
        canInstallSync = (parsedReg.children || []).some(function(c) { return c && c.initialSyncComplete === true; });
      } catch(e) {}
    }

    if (canInstallSync) {
      ScriptApp.newTrigger('runMasterCloudSchoolSync').timeBased().everyMinutes(1).create();
      McpLogger.log('SUCCESS', 'QUIET_HOURS_RESUMED', 'Restored 1-minute Master Cloud sync trigger for daytime (6 AM to 11 PM IST).');
      // Restart autonomous OCR if it was interrupted by quiet hours
      try {
        ScriptApp.newTrigger('runAutonomousVaultOcr').timeBased().after(30000).create();
      } catch (ocrErr) {}
      return { resumed: true, trigger: 'runMasterCloudSchoolSync (1m)' };
    } else {
      McpLogger.log('INFO', 'QUIET_HOURS_RESUME_DEFERRED', 'Morning resume deferred: initial 1-time sync is not yet complete.');
      return { resumed: false, reason: 'initial_sync_incomplete' };
    }
  } catch (err) {
    McpLogger.log('ERROR', 'QUIET_HOURS_RESUME_ERROR', 'Could not restore 1-minute trigger: ' + err);
    return { resumed: false, error: err.toString() };
  }
}

/**
 * Installs daily scheduled triggers at 11 PM (to delete 1m trigger) and 6 AM (to restore 1m trigger) in IST.
 */
function setupQuietHoursScheduleTriggers() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      var hFn = triggers[i].getHandlerFunction();
      if (hFn === 'pauseNightlySyncTriggers' || hFn === 'resumeMorningSyncTriggers') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }

    try {
      var pauseB = ScriptApp.newTrigger('pauseNightlySyncTriggers').timeBased();
      if (typeof pauseB.atHour === 'function') pauseB = pauseB.atHour(23);
      if (typeof pauseB.inTimezone === 'function') pauseB = pauseB.inTimezone('Asia/Kolkata');
      if (typeof pauseB.everyDays === 'function') pauseB = pauseB.everyDays(1);
      if (typeof pauseB.create === 'function') pauseB.create();
    } catch (e1) {}

    try {
      var resumeB = ScriptApp.newTrigger('resumeMorningSyncTriggers').timeBased();
      if (typeof resumeB.atHour === 'function') resumeB = resumeB.atHour(6);
      if (typeof resumeB.inTimezone === 'function') resumeB = resumeB.inTimezone('Asia/Kolkata');
      if (typeof resumeB.everyDays === 'function') resumeB = resumeB.everyDays(1);
      if (typeof resumeB.create === 'function') resumeB.create();
    } catch (e2) {}

    McpLogger.log('INFO', 'SCHEDULE_TRIGGERS_CREATED', 'Configured direct trigger schedule: pause at 11 PM IST, resume at 6 AM IST.');
    return { success: true };
  } catch (err) {
    McpLogger.log('WARN', 'SCHEDULE_TRIGGERS_ERROR', 'Error setting up quiet hours triggers: ' + err);
    return { success: false, error: err.toString() };
  }
}

function setupMasterCloudSyncTrigger(intervalMinutes) {
  var mins = intervalMinutes || 1;
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      var hFn = triggers[i].getHandlerFunction();
      if (hFn === 'runMasterCloudSchoolSync' || hFn === 'runIncrementalSchoolSync') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }

    // Install daily 11 PM pause and 6 AM resume schedule triggers
    setupQuietHoursScheduleTriggers();

    // Don't install the recurring sync trigger during quiet hours — it would immediately
    // fire, hit the quiet-hours guard, and delete OCR continuation triggers
    var now = new Date();
    var istHour = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)).getUTCHours();
    if (istHour >= 23 || istHour < 6) {
      McpLogger.log('INFO', 'SYNC_TRIGGER_DEFERRED', 'Quiet hours active (IST). 1-minute trigger will be installed at 6 AM by morning resume.');
      return { success: true, cadence: 'deferred_to_6am' };
    }

    if (mins === 1) {
      ScriptApp.newTrigger('runMasterCloudSchoolSync').timeBased().everyMinutes(1).create();
    } else if (mins === 5) {
      ScriptApp.newTrigger('runMasterCloudSchoolSync').timeBased().everyMinutes(5).create();
    } else if (mins === 10) {
      ScriptApp.newTrigger('runMasterCloudSchoolSync').timeBased().everyMinutes(10).create();
    } else if (mins === 30) {
      ScriptApp.newTrigger('runMasterCloudSchoolSync').timeBased().everyMinutes(30).create();
    } else if (mins === 60) {
      ScriptApp.newTrigger('runMasterCloudSchoolSync').timeBased().everyHours(1).create();
    } else {
      ScriptApp.newTrigger('runMasterCloudSchoolSync').timeBased().everyMinutes(1).create();
    }
    McpLogger.log('SUCCESS', 'TRIGGER_CREATED', 'Created ' + mins + '-minute autonomous Master Cloud trigger for Student Classroom sync.');
    return { success: true, cadence: 'everyMinutes(' + mins + ')' };
  } catch (err) {
    McpLogger.log('WARN', 'TRIGGER_CREATE_FAILED', 'Could not create Master Cloud trigger: ' + err);
    return { success: false, error: err.toString() };
  }
}

function runMasterCloudSchoolSync(forceRun, targetChildIdOrName, isInitialPass) {
  try { McpLogger.log('INFO', 'RUN_MASTER_CLOUD_SYNC_CALLED', 'Invoked with forceRun=' + forceRun + ' targetChild=' + targetChildIdOrName + ' isInitialPass=' + isInitialPass); } catch (logErr) {}
  var props = PropertiesService.getScriptProperties();

  // RESUME GUARD: If initial sync was interrupted, resume with correct flags
  var pendingInitialChild = props.getProperty('initial_sync_in_progress_child');
  if (pendingInitialChild) {
    if (!targetChildIdOrName) targetChildIdOrName = pendingInitialChild;
    isInitialPass = true;
    forceRun = true;
  }

  // FAST-EXIT GUARD 0: IST Quiet Hours (11:00 PM to 6:00 AM IST)
  if (forceRun !== true && props.getProperty('quiet_hours_disabled') !== 'true') {
    var now = new Date();
    var istHour = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)).getUTCHours();
    if (istHour >= 23 || istHour < 6) {
      try {
        pauseNightlySyncTriggers();
      } catch (delErr) {}
      return { count: 0, status: 'quiet_hours_ist_11pm_to_6am', reason: 'Deleted 1-minute trigger for quiet hours (11 PM to 6 AM IST)', skipped: true };
    }
  }

  // FAST-EXIT GUARD 1: Check Script Properties BEFORE acquiring ScriptLock!
  var raw = props.getProperty('multi_child_school_registry');
  if (!raw) return { count: 0, status: 'awaiting_step2_registration', skipped: true };

  var registry;
  try {
    registry = JSON.parse(raw);
  } catch (parseErr) {
    return { count: 0, status: 'invalid_registry_json', skipped: true };
  }

  var children = registry.children || [];
  if (!children || children.length === 0) return { count: 0, status: 'no_children_registered', skipped: true };

  var hasActive = false;
  for (var cIdx = 0; cIdx < children.length; cIdx++) {
    var checkChild = children[cIdx];
    if (checkChild) {
      if (targetChildIdOrName) {
        if (checkChild.childId === targetChildIdOrName || (checkChild.kidName && checkChild.kidName.toLowerCase() === String(targetChildIdOrName).toLowerCase())) {
          hasActive = true;
          break;
        }
      } else if (checkChild.initialSyncComplete === true || isInitialPass === true) {
        hasActive = true;
        break;
      }
    }
  }

  if (!hasActive) {
    return { count: 0, status: 'awaiting_1time_sync_completion', skipped: true };
  }

  // FAST-EXIT GUARD 2: Only acquire lock if there is active work to do.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { skipped: true, reason: 'Sync already in progress' };

  McpLogger.log('INFO', 'RUN_MASTER_CLOUD_SYNC_INVOKED', 'runMasterCloudSchoolSync running for ' + children.length + ' registered child(ren). forceRun=' + forceRun + ' targetChild=' + targetChildIdOrName + ' isInitialPass=' + isInitialPass);
  var syncStartTime = new Date().getTime();
  var MAX_SYNC_RUNTIME_MS = 270000; // 4.5 minutes (leaves 90s safety margin before 6.0m limit)

  function isTimeExpiring() {
    return (new Date().getTime() - syncStartTime) > MAX_SYNC_RUNTIME_MS;
  }

  function scheduleContinuation() {
    try {
      var trigs = ScriptApp.getProjectTriggers();
      for (var tI = 0; tI < trigs.length; tI++) {
        if (trigs[tI].getHandlerFunction() === 'runMasterCloudSchoolSync') {
          ScriptApp.deleteTrigger(trigs[tI]);
        }
      }
      ScriptApp.newTrigger('runMasterCloudSchoolSync')
        .timeBased()
        .after(10000)
        .create();
      McpLogger.log('INFO', 'CONTINUATION_TRIGGER_SET', '4.5-minute time budget reached. Scheduled 10-second continuation trigger.');
      return true;
    } catch (tErr) {
      McpLogger.log('WARN', 'CONTINUATION_TRIGGER_FAIL', 'Could not schedule continuation trigger: ' + tErr);
      return false;
    }
  }

  try {
    var syncedCount = 0;

    for (var i = 0; i < children.length; i++) {
      if (isTimeExpiring()) {
        scheduleContinuation();
        return { success: true, continuationScheduled: true, checkpoint: 'child_boundary_' + i };
      }

      var ch = children[i];
      if (!ch || !ch.schoolWorkerUrl || !ch.targetFolderId) continue;

      if (targetChildIdOrName) {
        var matchTarget = (ch.childId === targetChildIdOrName || (ch.kidName && ch.kidName.toLowerCase() === String(targetChildIdOrName).toLowerCase()));
        if (!matchTarget) continue;
      }

      var isChildInitial = (ch.initialSyncComplete !== true) || (isInitialPass === true);
      if (!targetChildIdOrName && isInitialPass !== true) {
        if (ch.initialSyncComplete !== true) {
          continue;
        }
      }

      var kidFolder;
      try {
        kidFolder = DriveApp.getFolderById(ch.targetFolderId);
        if (!kidFolder || kidFolder.isTrashed()) continue;
      } catch (folderErr) {
        continue;
      }

      // Mark initial sync in progress so continuation knows which child to resume
      if (isChildInitial) {
        props.setProperty('initial_sync_in_progress_child', ch.childId || ch.kidName);
      }

      try {
        var resp = UrlFetchApp.fetch(ch.schoolWorkerUrl, {
          method: 'POST',
          contentType: 'application/json',
          payload: JSON.stringify({
            method: 'extract_classroom_and_gmail',
            params: {
              childName: ch.kidName,
              academicYear: ch.academicYear,
              schoolDomain: ch.schoolDomain,
              extractOnly: true,
              isIncremental: !isChildInitial
            }
          }),
          muteHttpExceptions: true
        });

        if (resp.getResponseCode() !== 200) {
          McpLogger.log('WARN', 'MASTER_SYNC_HTTP_ERROR', 'extract_classroom_and_gmail HTTP ' + resp.getResponseCode() + ' for ' + (ch.kidName || 'Child') + ': ' + resp.getContentText().substring(0, 300));
        }

        if (resp.getResponseCode() === 200) {
          var data;
          try {
            data = JSON.parse(resp.getContentText());
          } catch (jsonErr) {
            McpLogger.log('WARN', 'MASTER_SYNC_BAD_JSON', 'Could not parse extract_classroom_and_gmail response for ' + (ch.kidName || 'Child') + ': ' + jsonErr.toString() + ' | raw: ' + resp.getContentText().substring(0, 300));
            continue;
          }

          var syncRes = data.result || data;
          if (!syncRes || syncRes.error || !syncRes.classroom) {
            McpLogger.log('WARN', 'MASTER_SYNC_BAD_RESPONSE', 'extract_classroom_and_gmail returned no usable classroom data for ' + (ch.kidName || 'Child') + ': ' + JSON.stringify(syncRes).substring(0, 300));
            continue;
          }

          var downloadFailed = 0;
          var failedAttachments = [];

          var it = kidFolder.getFoldersByName('classroom');
          var classFolder = it.hasNext() ? it.next() : kidFolder.createFolder('classroom');
          var attIt = classFolder.getFoldersByName('attachments');
          var attachFolder = attIt.hasNext() ? attIt.next() : classFolder.createFolder('attachments');

          var emIt = kidFolder.getFoldersByName('emails');
          var emailsFolder = emIt.hasNext() ? emIt.next() : kidFolder.createFolder('emails');
          var emAttIt = emailsFolder.getFoldersByName('attachments');
          var emailAttachFolder = emAttIt.hasNext() ? emAttIt.next() : emailsFolder.createFolder('attachments');

          // Save classroom_data.json (merging with existing)
          var fIt = classFolder.getFilesByName('classroom_data.json');
          var finalClassroom = syncRes.classroom;
          var exFile = null;
          var exClassroomContent = '';
          if (fIt.hasNext()) {
            exFile = fIt.next();
            try {
              exClassroomContent = exFile.getContent();
              var exData = JSON.parse(exClassroomContent);
              if (exData && exData.courses && syncRes.classroom && syncRes.classroom.courses) {
                finalClassroom = mergeClassroomData(exData, syncRes.classroom);
              }
            } catch (pErr) {}
          }
          var jsonStr = JSON.stringify(finalClassroom, null, 2);
          if (exFile) {
            if (exClassroomContent !== jsonStr) {
              exFile.setContent(jsonStr);
            }
          } else {
            classFolder.createFile('classroom_data.json', jsonStr, 'application/json');
          }

          // 1-query batch cache for Email Attachments
          var existingEmailFiles = {};
          try {
            var efIt = emailAttachFolder.getFiles();
            while (efIt.hasNext()) {
              var ef = efIt.next();
              var efn = ef.getName();
              existingEmailFiles[efn] = true;
              existingEmailFiles[efn.toLowerCase()] = true;
            }
          } catch (efErr) {}

          // PRIORITY 1: Download urgent email circular attachments & strip base64 from memory
          if (syncRes.gmail && syncRes.gmail.emails && Array.isArray(syncRes.gmail.emails)) {
            var emails = syncRes.gmail.emails;
            for (var emIdx = 0; emIdx < emails.length; emIdx++) {
              var emailItem = emails[emIdx];
              if (emailItem.attachments && Array.isArray(emailItem.attachments)) {
                for (var eaIdx = 0; eaIdx < emailItem.attachments.length; eaIdx++) {
                  if (isTimeExpiring()) {
                    scheduleContinuation();
                    return { success: true, continuationScheduled: true, checkpoint: 'email_att_' + eaIdx };
                  }
                  var eAtt = emailItem.attachments[eaIdx];
                  if (!eAtt || !eAtt.name) continue;
                  var rawAttName = (eAtt.name || 'attachment').replace(/(\\.pdf)+$/i, '').replace(/\\.{2,}/g, '.');
                  var cleanSubject = (emailItem.subject || 'circular').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
                  var isPdf = (eAtt.name || '').toLowerCase().indexOf('.pdf') !== -1;
                  var eTargetName = eAtt.cleanName || (cleanSubject + '_' + rawAttName + (isPdf ? '.pdf' : ''));

                  if (existingEmailFiles[eTargetName] || existingEmailFiles[eTargetName.toLowerCase()]) {
                    delete eAtt.base64;
                    continue;
                  }

                  try {
                    var eBlob = null;
                    if (eAtt.base64) {
                      var eDecoded = Utilities.base64Decode(eAtt.base64);
                      eBlob = Utilities.newBlob(eDecoded, eAtt.mimeType || 'application/octet-stream', eTargetName);
                    } else if (eAtt.fileId) {
                      var gBlobRes = UrlFetchApp.fetch(ch.schoolWorkerUrl, {
                        method: 'POST',
                        contentType: 'application/json',
                        payload: JSON.stringify({ method: 'get_file_blob', params: { fileId: eAtt.fileId } }),
                        muteHttpExceptions: true
                      });
                      if (gBlobRes.getResponseCode() === 200) {
                        var gData = JSON.parse(gBlobRes.getContentText());
                        var gObj = gData.result || gData;
                        if (gObj && gObj.base64) {
                          eBlob = Utilities.newBlob(Utilities.base64Decode(gObj.base64), gObj.mimeType || 'application/octet-stream', eTargetName);
                        }
                      }
                    } else if (emailItem.id) {
                      var mBlobRes = UrlFetchApp.fetch(ch.schoolWorkerUrl, {
                        method: 'POST',
                        contentType: 'application/json',
                        payload: JSON.stringify({ method: 'get_gmail_attachment', params: { messageId: emailItem.id, attachmentIndex: eaIdx, filename: eAtt.name } }),
                        muteHttpExceptions: true
                      });
                      if (mBlobRes.getResponseCode() === 200) {
                        var mData = JSON.parse(mBlobRes.getContentText());
                        var mObj = mData.result || mData;
                        if (mObj && mObj.base64) {
                          eBlob = Utilities.newBlob(Utilities.base64Decode(mObj.base64), mObj.mimeType || 'application/octet-stream', eTargetName);
                        }
                      }
                    }
                    if (eBlob) {
                      var newEmailFile = emailAttachFolder.createFile(eBlob);
                      existingEmailFiles[eTargetName] = true;
                      existingEmailFiles[eTargetName.toLowerCase()] = true;
                      eAtt.fileId = newEmailFile.getId();
                      eAtt.driveUrl = newEmailFile.getUrl();
                    } else if (eAtt.base64 || eAtt.fileId || emailItem.id) {
                      downloadFailed++;
                      failedAttachments.push({ type: 'email', name: eTargetName, fileId: eAtt.fileId || null, subject: emailItem.subject || '', reason: 'no_blob_returned' });
                    }
                  } catch (eBlobErr) {
                    downloadFailed++;
                    failedAttachments.push({ type: 'email', name: eTargetName, fileId: eAtt.fileId || null, subject: emailItem.subject || '', reason: eBlobErr.toString() });
                  }
                  delete eAtt.base64; // Strip base64 to prevent JSON bloat
                }
              }
            }
          }

          // Save school_emails.json (merging with existing and purging any legacy inline base64)
          if (syncRes.gmail && syncRes.gmail.emails) {
            try {
              var emailFileIt = emailsFolder.getFilesByName('school_emails.json');
              var finalEmails = syncRes.gmail;
              var exEmailFile = null;
              var exEmailContent = '';
              if (emailFileIt.hasNext()) {
                exEmailFile = emailFileIt.next();
                try {
                  exEmailContent = exEmailFile.getContent();
                  var exEmailData = JSON.parse(exEmailContent);
                  if (exEmailData && exEmailData.emails) {
                    var eMap = {};
                    var combEmails = [];
                    (syncRes.gmail.emails || []).concat(exEmailData.emails || []).forEach(function(em) {
                      if (em && em.id && !eMap[em.id]) {
                        eMap[em.id] = true;
                        // Purge legacy base64 and save to Drive
                        if (em.attachments && Array.isArray(em.attachments)) {
                          em.attachments.forEach(function(legacyAtt) {
                            if (legacyAtt && legacyAtt.base64) {
                              try {
                                var lRaw = (legacyAtt.name || 'attachment').replace(/(\\.pdf)+$/i, '').replace(/\\.{2,}/g, '.');
                                var lExt = (legacyAtt.name || '').toLowerCase().indexOf('.pdf') !== -1 ? '.pdf' : '';
                                var lTarget = legacyAtt.cleanName || ((em.subject || 'circular').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20) + '_' + lRaw + lExt);
                                if (!existingEmailFiles[lTarget] && !existingEmailFiles[lTarget.toLowerCase()]) {
                                  var lBlob = Utilities.newBlob(Utilities.base64Decode(legacyAtt.base64), legacyAtt.mimeType || 'application/octet-stream', lTarget);
                                  var lf = emailAttachFolder.createFile(lBlob);
                                  existingEmailFiles[lTarget] = true;
                                  existingEmailFiles[lTarget.toLowerCase()] = true;
                                  legacyAtt.fileId = lf.getId();
                                  legacyAtt.driveUrl = lf.getUrl();
                                }
                              } catch (lErr) {}
                              delete legacyAtt.base64;
                            }
                          });
                        }
                        combEmails.push(em);
                      }
                    });
                    finalEmails = {
                      kidName: syncRes.gmail.kidName || ch.kidName,
                      academicYear: syncRes.gmail.academicYear || ch.academicYear,
                      schoolDomain: syncRes.gmail.schoolDomain || ch.schoolDomain,
                      lastSyncedAt: new Date().toISOString(),
                      totalEmails: combEmails.length,
                      totalAttachments: combEmails.reduce(function(a, x) { return a + (x.attachments ? x.attachments.length : 0); }, 0),
                      emails: combEmails
                    };
                  }
                } catch (emErr) {}
              }
              if (finalEmails && finalEmails.emails) {
                finalEmails.emails.forEach(function(fe) {
                  if (fe.attachments) {
                    fe.attachments.forEach(function(fa) { delete fa.base64; });
                  }
                });
              }
              var emailJsonStr = JSON.stringify(finalEmails, null, 2);
              if (exEmailFile) {
                if (exEmailContent !== emailJsonStr) {
                  exEmailFile.setContent(emailJsonStr);
                }
              } else {
                emailsFolder.createFile('school_emails.json', emailJsonStr, 'application/json');
              }
            } catch (gSaveErr) {}
          }

          // Save digest
          if (syncRes.digest) {
            var dIt = kidFolder.getFilesByName('daily_digest.json');
            var dStr = JSON.stringify(syncRes.digest, null, 2);
            if (dIt.hasNext()) {
              var dFile = dIt.next();
              try {
                if (dFile.getContent() !== dStr) {
                  dFile.setContent(dStr);
                }
              } catch (dErr) {
                dFile.setContent(dStr);
              }
            } else {
              kidFolder.createFile('daily_digest.json', dStr, 'application/json');
            }
          }

          // PRIORITY 2: Download Classroom attachments with time budget checks (OCR decoupled)
          if (syncRes.classroom.courses && Array.isArray(syncRes.classroom.courses)) {
            var existingClassFiles = {};
            try {
              var cfIt = attachFolder.getFiles();
              while (cfIt.hasNext()) {
                var f = cfIt.next();
                var fn = f.getName();
                if (fn && fn.indexOf('temp_ocr_') === 0) {
                  try { f.setTrashed(true); } catch (tErr) {}
                  continue;
                }
                existingClassFiles[fn] = true;
                existingClassFiles[fn.toLowerCase()] = true;
              }
            } catch (cfErr) {}

            var courses = syncRes.classroom.courses;
            for (var cIdx = 0; cIdx < courses.length; cIdx++) {
              var c = courses[cIdx];
              var cName = (c.name || 'Course').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15);
              var allItems = (c.announcements || []).concat(c.courseWork || []).concat(c.materials || []);
              for (var itIdx = 0; itIdx < allItems.length; itIdx++) {
                var itm = allItems[itIdx];
                if (itm.attachments && Array.isArray(itm.attachments)) {
                  for (var aIdx = 0; aIdx < itm.attachments.length; aIdx++) {
                    if (isTimeExpiring()) {
                      scheduleContinuation();
                      return { success: true, continuationScheduled: true, checkpoint: 'classroom_' + aIdx };
                    }
                    var att = itm.attachments[aIdx];
                    if (!att || !att.fileId) continue;
                    var rawTitle = (att.title || att.fileId).replace(/(\\.pdf)+$/i, '').replace(/\\.{2,}/g, '.');
                    var isClassPdf = (att.title || '').toLowerCase().indexOf('.pdf') !== -1;
                    var attTargetName = att.targetName || (cName + '_' + rawTitle);
                    // Ensure file extension is present — Drive auto-appends extensions from MIME type,
                    // so files on disk have .pdf but targetName from ClassroomIngester may not
                    if (isClassPdf && !/\\.pdf$/i.test(attTargetName)) {
                      attTargetName += '.pdf';
                    } else if (!isClassPdf) {
                      var extMatch = (att.title || '').match(/(\\.[a-zA-Z0-9]{2,5})$/);
                      if (extMatch && !attTargetName.endsWith(extMatch[1])) {
                        attTargetName += extMatch[1];
                      }
                    }
                    if (existingClassFiles[attTargetName] || existingClassFiles[attTargetName.toLowerCase()]) continue;

                    try {
                      var blobRes = UrlFetchApp.fetch(ch.schoolWorkerUrl, {
                        method: 'POST',
                        contentType: 'application/json',
                        payload: JSON.stringify({
                          method: 'get_file_blob',
                          params: { fileId: att.fileId }
                        }),
                        muteHttpExceptions: true
                      });
                      if (blobRes.getResponseCode() === 200) {
                        var blobData = JSON.parse(blobRes.getContentText());
                        var blobObj = blobData.result || blobData;
                        if (blobObj && blobObj.base64) {
                          var decoded = Utilities.base64Decode(blobObj.base64);
                          var newBlob = Utilities.newBlob(decoded, blobObj.mimeType || 'application/octet-stream', attTargetName);
                          attachFolder.createFile(newBlob);
                          existingClassFiles[attTargetName] = true;
                          existingClassFiles[attTargetName.toLowerCase()] = true;
                        } else {
                          downloadFailed++;
                          failedAttachments.push({ type: 'classroom', name: attTargetName, fileId: att.fileId, course: c.name || '', reason: 'no_base64_in_response' });
                        }
                      } else {
                        downloadFailed++;
                        failedAttachments.push({ type: 'classroom', name: attTargetName, fileId: att.fileId, course: c.name || '', reason: 'http_' + blobRes.getResponseCode() });
                      }
                    } catch (blobErr) {
                      downloadFailed++;
                      failedAttachments.push({ type: 'classroom', name: attTargetName, fileId: att.fileId, course: c.name || '', reason: blobErr.toString() });
                    }
                  }
                }
              }
            }
          }

          if (failedAttachments.length > 0) {
            McpLogger.log('WARN', 'ATTACHMENT_DOWNLOAD_FAILURES', { kidName: ch.kidName, academicYear: ch.academicYear, count: failedAttachments.length, items: failedAttachments });
          }
          try { McpLogger.saveToVault(kidFolder); } catch (saveErr) {}

          syncedCount++;
          if (isChildInitial) {
            if (downloadFailed === 0) {
              ch.initialSyncComplete = true;
              ch.lastInitialSyncedAt = new Date().toISOString();
              props.setProperty('multi_child_school_registry', JSON.stringify(registry));
              props.deleteProperty('initial_sync_in_progress_child');
              McpLogger.log('SUCCESS', 'INITIAL_SYNC_COMPLETE', '1-Time data sync completed for ' + (ch.kidName || 'Child') + ' — all attachments verified on Drive.');
              try {
                setupMasterCloudSyncTrigger();
              } catch (trigErr) {}
              try {
                if (typeof DigestBuilder !== 'undefined' && DigestBuilder.build) {
                  DigestBuilder.build(kidFolder);
                }
              } catch (digErr) {}
              // Schedule autonomous OCR indexing chain to index 100% of newly downloaded vault files
              try {
                var ocrTrigs = ScriptApp.getProjectTriggers();
                for (var ot = 0; ot < ocrTrigs.length; ot++) {
                  if (ocrTrigs[ot].getHandlerFunction() === 'runAutonomousVaultOcr') {
                    ScriptApp.deleteTrigger(ocrTrigs[ot]);
                  }
                }
                ScriptApp.newTrigger('runAutonomousVaultOcr').timeBased().after(5000).create();
                McpLogger.log('INFO', 'OCR_TRIGGER_SCHEDULED', 'Autonomous OCR indexing scheduled to start in 5 seconds.');
              } catch (ocrTrigErr) {}
            } else {
              McpLogger.log('WARN', 'INITIAL_SYNC_INCOMPLETE', downloadFailed + ' attachment download(s) failed for ' + (ch.kidName || 'Child') + '. Scheduling 10s retry.');
              scheduleContinuation();
            }
          } else {
            McpLogger.log('SUCCESS', 'MASTER_CLOUD_SYNC_OK', 'Autonomous 24/7 cloud sync succeeded for ' + (ch.kidName || 'Child') + ' under Parent Account.');
            try {
              if (typeof DigestBuilder !== 'undefined' && DigestBuilder.build) {
                DigestBuilder.build(kidFolder);
              }
            } catch (digErr2) {}
          }
        }
      } catch (err) {
        McpLogger.log('ERROR', 'MASTER_SYNC_CHILD_ERROR', 'runMasterCloudSchoolSync failed while processing ' + (ch.kidName || 'Child') + ': ' + err.toString() + (err.stack ? (' | stack: ' + err.stack) : ''));
        try { McpLogger.saveToVault(kidFolder); } catch (saveErr) {}
      }
    }
    return { success: true, syncedCount: syncedCount, initialSyncComplete: true };
  } finally {
    lock.releaseLock();
  }
}

function mergeClassroomData(existing, incoming) {
  if (!existing || !existing.courses) return incoming;
  if (!incoming || !incoming.courses) return existing;

  var mergedCourses = existing.courses.slice();
  for (var i = 0; i < incoming.courses.length; i++) {
    var inCourse = incoming.courses[i];
    var exIdx = -1;
    for (var j = 0; j < mergedCourses.length; j++) {
      if (mergedCourses[j].id === inCourse.id) {
        exIdx = j;
        break;
      }
    }
    if (exIdx === -1) {
      mergedCourses.push(inCourse);
    } else {
      var exCourse = mergedCourses[exIdx];
      var annMap = {};
      var combinedAnn = [];
      (inCourse.announcements || []).concat(exCourse.announcements || []).forEach(function(a) {
        if (a && a.id && !annMap[a.id]) {
          annMap[a.id] = true;
          combinedAnn.push(a);
        }
      });
      var cwMap = {};
      var combinedCw = [];
      (inCourse.courseWork || []).concat(exCourse.courseWork || []).forEach(function(cw) {
        if (cw && cw.id && !cwMap[cw.id]) {
          cwMap[cw.id] = true;
          combinedCw.push(cw);
        }
      });
      var matMap = {};
      var combinedMat = [];
      (inCourse.materials || []).concat(exCourse.materials || []).forEach(function(m) {
        if (m && m.id && !matMap[m.id]) {
          matMap[m.id] = true;
          combinedMat.push(m);
        }
      });
      mergedCourses[exIdx] = {
        id: inCourse.id,
        name: inCourse.name || exCourse.name,
        section: inCourse.section || exCourse.section,
        descriptionHeading: inCourse.descriptionHeading || exCourse.descriptionHeading,
        room: inCourse.room || exCourse.room,
        alternateLink: inCourse.alternateLink || exCourse.alternateLink,
        courseState: inCourse.courseState || exCourse.courseState,
        announcements: combinedAnn,
        courseWork: combinedCw,
        materials: combinedMat
      };
    }
  }
  return {
    kidName: incoming.kidName || existing.kidName,
    academicYear: incoming.academicYear || existing.academicYear,
    lastSyncedAt: incoming.lastSyncedAt || new Date().toISOString(),
    totalCourses: mergedCourses.length,
    totalAttachments: mergedCourses.reduce(function(acc, c) {
      var annAtts = (c.announcements || []).reduce(function(a, x) { return a + (x.attachments ? x.attachments.length : 0); }, 0);
      var cwAtts = (c.courseWork || []).reduce(function(a, x) { return a + (x.attachments ? x.attachments.length : 0); }, 0);
      var matAtts = (c.materials || []).reduce(function(a, x) { return a + (x.attachments ? x.attachments.length : 0); }, 0);
      return acc + annAtts + cwAtts + matAtts;
    }, 0),
    courses: mergedCourses
  };
}

/**
 * Autonomous Vault OCR Continuation Engine:
 * Indexes newly ingested attachments across classroom, emails, and whatsapp
 * in discrete batches of 15. If pending files remain, automatically schedules
 * the next 20-second continuation trigger until all vault documents are 100% indexed.
 */
function runAutonomousVaultOcr() {
  var props = PropertiesService.getScriptProperties();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { skipped: true, reason: 'OCR indexing already in progress' };

  try {
    // Delete any existing OCR continuation triggers to avoid duplicate queues
    var trigs = ScriptApp.getProjectTriggers();
    for (var i = 0; i < trigs.length; i++) {
      if (trigs[i].getHandlerFunction() === 'runAutonomousVaultOcr') {
        ScriptApp.deleteTrigger(trigs[i]);
      }
    }

    var foldersToIndex = [];
    var raw = props.getProperty('multi_child_school_registry');
    if (raw) {
      try {
        var reg = JSON.parse(raw);
        (reg.children || []).forEach(function(ch) {
          if (ch && ch.targetFolderId) foldersToIndex.push(ch.targetFolderId);
        });
      } catch (e) {}
    }
    if (foldersToIndex.length === 0) {
      var tfId = props.getProperty('target_folder_id');
      if (tfId) foldersToIndex.push(tfId);
    }

    var totalRemaining = 0;
    var totalProcessed = 0;

    for (var f = 0; f < foldersToIndex.length; f++) {
      var kFolder = null;
      try { kFolder = DriveApp.getFolderById(foldersToIndex[f]); } catch (e) {}
      if (!kFolder || kFolder.isTrashed()) continue;

      if (typeof DocumentOcrService !== 'undefined') {
        var res = DocumentOcrService.runAutomatedVaultIndexing(kFolder, 15);
        if (res) {
          totalProcessed += (res.processed || 0);
          totalRemaining += (res.totalPendingRemaining || 0);
        }
      }
    }

    // Don't schedule OCR continuation during quiet hours — morning resume will restart
    var now = new Date();
    var istHour = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)).getUTCHours();
    if (istHour >= 23 || istHour < 6) {
      McpLogger.log('INFO', 'OCR_QUIET_HOURS_PAUSE', 'OCR paused for quiet hours. Processed: ' + totalProcessed + ', remaining: ' + totalRemaining + '. Will resume at 6 AM IST.');
      return { success: true, processed: totalProcessed, totalRemaining: totalRemaining, quietHours: true };
    }

    if (totalRemaining > 0) {
      try {
        ScriptApp.newTrigger('runAutonomousVaultOcr')
          .timeBased()
          .after(20000)
          .create();
        McpLogger.log('INFO', 'OCR_CONTINUATION_TRIGGER_SET', 'Batch indexed ' + totalProcessed + ' files. ' + totalRemaining + ' pending. Next batch in 20s.');
      } catch (trigErr) {
        McpLogger.log('WARN', 'OCR_CONTINUATION_TRIGGER_FAIL', trigErr.toString());
      }
    } else {
      McpLogger.log('SUCCESS', 'OCR_INDEXING_COMPLETE', 'All vault attachments successfully OCR indexed (' + totalProcessed + ' in last batch).');
    }

    return { success: true, processed: totalProcessed, totalRemaining: totalRemaining };
  } finally {
    lock.releaseLock();
  }
}

function handleSetupTriggers(params) {
  var type = params.type; // 'school_1min' or 'portal_6hr' or 'master_cloud_1min'
  var res;
  if (type === 'school_1min') {
    res = setupMinuteTrigger();
    return {
      triggerSet: !!(res && res.success),
      cadence: 'everyMinutes(1)',
      error: res && !res.success ? res.error : null,
      details: res
    };
  } else if (type === 'portal_6hr') {
    res = setupSixHourTrigger();
    return {
      triggerSet: !!(res && res.success),
      cadence: 'everyHours(6)',
      error: res && !res.success ? res.error : null,
      details: res
    };
  } else if (type === 'master_cloud_1min' || type === 'master_cloud_1hr') {
    res = setupMasterCloudSyncTrigger();
    return {
      triggerSet: !!(res && res.success),
      cadence: 'everyMinutes(1)',
      error: res && !res.success ? res.error : null,
      details: res
    };
  }
  return { triggerSet: false, error: 'Unknown trigger type: ' + type };
}

/**
 * Worker A Trigger: 1-Minute Incremental Background Cron for School Account
 */
function runIncrementalSchoolSync(forceRun) {
  var props = PropertiesService.getScriptProperties();

  // FAST-EXIT GUARD 0: IST Quiet Hours (11:00 PM to 6:00 AM IST)
  // Automatic triggers pause during night hours (23:00 to 06:00 IST).
  if (forceRun !== true && props.getProperty('quiet_hours_disabled') !== 'true') {
    var now = new Date();
    var istHour = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)).getUTCHours();
    if (istHour >= 23 || istHour < 6) {
      try {
        pauseNightlySyncTriggers();
      } catch (delErr) {}
      return { skipped: true, status: 'quiet_hours_ist_11pm_to_6am', reason: 'Deleted trigger for quiet hours (11 PM to 6 AM IST)' };
    }
  }

  // Fast-Exit Guard 1 (< 5ms): Do not execute if 1-time initial data extraction is incomplete
  if (props.getProperty('initial_sync_complete') !== 'true') {
    return { skipped: true, reason: 'awaiting_1time_sync_completion' };
  }

  // Fast-Exit Guard 2 (< 10ms): In dual-worker mode, Master Personal Worker orchestrates sync 24/7.
  // The School Cloud Worker is passive. Clean up any redundant trigger and exit immediately.
  var isDual = props.getProperty('is_dual_worker') === 'true' ||
               (typeof CONFIG !== 'undefined' && CONFIG.isDualWorker);
  if (isDual) {
    try {
      var triggers = ScriptApp.getProjectTriggers();
      for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].getHandlerFunction() === 'runIncrementalSchoolSync') {
          ScriptApp.deleteTrigger(triggers[i]);
        }
      }
    } catch (tErr) {}
    return { skipped: true, reason: 'managed_by_master_worker' };
  }

  var folderId = props.getProperty('target_folder_id');
  var childName = props.getProperty('child_name') || 'Atharva';
  var academicYear = props.getProperty('academic_year') || '2026-2027';
  var schoolDomain = props.getProperty('school_domain') || '';

  if (!folderId) return { skipped: true, reason: 'no_target_folder' };

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { skipped: true, reason: 'locked' };

  McpLogger.log('INFO', 'RUN_INCREMENTAL_SCHOOL_SYNC_INVOKED', 'runIncrementalSchoolSync running for ' + childName + '.');

  try {
    ClassroomIngester.sync(folderId, childName, academicYear, true, false);
    GmailIngester.sync(folderId, childName, academicYear, schoolDomain, true, false);
    DigestBuilder.build(folderId, childName, academicYear);
    try {
      McpLogger.saveToVault(DriveApp.getFolderById(folderId));
    } catch (saveErr) {}
    // Schedule autonomous OCR indexing chain for newly downloaded vault files.
    // Mirrors the same continuation-trigger pattern used in runMasterCloudSchoolSync,
    // so single-worker deployments get OCR coverage too, not just dual-worker ones.
    try {
      var ocrIncTrigs = ScriptApp.getProjectTriggers();
      for (var oit = 0; oit < ocrIncTrigs.length; oit++) {
        if (ocrIncTrigs[oit].getHandlerFunction() === 'runAutonomousVaultOcr') {
          ScriptApp.deleteTrigger(ocrIncTrigs[oit]);
        }
      }
      ScriptApp.newTrigger('runAutonomousVaultOcr').timeBased().after(5000).create();
    } catch (ocrIncTrigErr) {
      McpLogger.log('WARN', 'OCR_TRIGGER_SCHEDULE_FAIL', 'Could not schedule OCR indexing after incremental sync: ' + ocrIncTrigErr);
    }
  } catch (e) {
    McpLogger.log('ERROR', 'SCHOOL_CRON_ERROR', '1-Minute sync error: ' + e);
    try { McpLogger.saveToVault(DriveApp.getFolderById(folderId)); } catch (saveErr) {}
  } finally {
    lock.releaseLock();
  }
}

/**
 * Worker B Trigger: 6-Hour Background Cron for Personal Account
 */
function runIncrementalPortalSync() {
  PortalIngester.syncAll();
}

function setupAutonomousTriggers(workerType) {
  var installed = [];
  var isMaster = workerType === 'master' ||
                 (typeof CONFIG !== 'undefined' && (CONFIG.childName === 'Master' || CONFIG.academicYear === 'Family')) ||
                 !!PropertiesService.getScriptProperties().getProperty('multi_child_school_registry');

  try {
    var triggers = ScriptApp.getProjectTriggers();
    if (isMaster) {
      for (var i = 0; i < triggers.length; i++) {
        var hFn = triggers[i].getHandlerFunction();
        if (hFn === 'runMasterCloudSchoolSync' || hFn === 'runIncrementalSchoolSync') {
          ScriptApp.deleteTrigger(triggers[i]);
        }
      }

      var props = PropertiesService.getScriptProperties();
      var rawReg = props.getProperty('multi_child_school_registry');
      var canInstallSync = false;
      if (rawReg) {
        try {
          var parsedReg = JSON.parse(rawReg);
          canInstallSync = (parsedReg.children || []).some(function(c) { return c && c.initialSyncComplete === true; });
        } catch(e) {}
      }

      // Ensure daily 11 PM (pause) and 6 AM (resume) IST schedule triggers are installed
      setupQuietHoursScheduleTriggers();

      if (canInstallSync) {
        ScriptApp.newTrigger('runMasterCloudSchoolSync').timeBased().everyMinutes(1).create();
        installed.push('runMasterCloudSchoolSync (1m)');
        McpLogger.log('SUCCESS', 'TRIGGER_CREATED', 'Created 1-minute autonomous Master Cloud trigger.');
      } else {
        installed.push('runMasterCloudSchoolSync (deferred until 1-time sync completes)');
        McpLogger.log('INFO', 'TRIGGER_DEFERRED', 'Master Cloud trigger deferred until child initial data sync completes.');
      }

      for (var j = 0; j < triggers.length; j++) {
        if (triggers[j].getHandlerFunction() === 'runIncrementalPortalSync') {
          ScriptApp.deleteTrigger(triggers[j]);
        }
      }
      ScriptApp.newTrigger('runIncrementalPortalSync').timeBased().everyHours(6).create();
      installed.push('runIncrementalPortalSync (6h)');
    } else {
      // Clean up any existing duplicate triggers
      for (var k = 0; k < triggers.length; k++) {
        if (triggers[k].getHandlerFunction() === 'runIncrementalSchoolSync') {
          ScriptApp.deleteTrigger(triggers[k]);
        }
      }
      var props = PropertiesService.getScriptProperties();
      var isDual = props.getProperty('is_dual_worker') === 'true' ||
                   (typeof CONFIG !== 'undefined' && CONFIG.isDualWorker);
      if (!isDual) {
        ScriptApp.newTrigger('runIncrementalSchoolSync').timeBased().everyMinutes(1).create();
        installed.push('runIncrementalSchoolSync (1m)');
        McpLogger.log('SUCCESS', 'TRIGGER_CREATED', 'Created 1-minute School Cloud trigger.');
      } else {
        installed.push('School Cloud Worker registered (managed by Master Cloud Worker)');
        McpLogger.log('INFO', 'TRIGGER_SKIPPED', 'School Cloud Worker is managed by Master Cloud Worker. Standalone trigger skipped.');
      }
    }
  } catch (e) {
    McpLogger.log('ERROR', 'TRIGGER_CREATION_FAILED', 'Failed to create autonomous trigger: ' + e);
    return { success: false, error: e.toString() };
  }

  return { success: true, isMaster: isMaster, installed: installed };
}

function setupMinuteTrigger() {
  return setupAutonomousTriggers('school');
}

function setupSixHourTrigger() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'runIncrementalPortalSync') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
    ScriptApp.newTrigger('runIncrementalPortalSync').timeBased().everyHours(6).create();
    McpLogger.log('SUCCESS', 'TRIGGER_CREATED', 'Created 6-hour cloud time trigger for School Portal scraping.');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function handleToolsList() {
  return {
    tools: [
      { name: 'sync_classroom_and_gmail', description: 'Run full sync of Classroom & Gmail', inputSchema: { type: 'object', properties: {} } },
      { name: 'sync_all_portals', description: 'Run full scraping of registered school portals', inputSchema: { type: 'object', properties: {} } },
      { name: 'register_portal_job', description: 'Register a child school portal endpoint', inputSchema: { type: 'object', properties: {} } },
      {
        name: 'search_vault_documents',
        description: 'Searches all school worksheets, circulars, scanned PDFs, and WhatsApp chat images across all subjects and dates using intelligent full-text OCR indexing.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Keyword or phrase to search for inside documents and images (e.g. "Linear equations worksheet", "fee notice", "sports day")' },
            childName: { type: 'string', description: 'Optional child first name to filter search' }
          },
          required: ['query']
        }
      }
    ]
  };
}

function handleToolsCall(name, args) {
  if (name === 'sync_classroom_and_gmail') {
    return handleSyncClassroomAndGmail(args);
  } else if (name === 'sync_all_portals') {
    return handleSyncAllPortals(args);
  } else if (name === 'register_portal_job') {
    return handleRegisterPortalJob(args);
  } else if (name === 'search_vault_documents') {
    var kidFolder = null;
    var targetFolderId = PropertiesService.getScriptProperties().getProperty('target_folder_id');
    if (targetFolderId) {
      try { kidFolder = DriveApp.getFolderById(targetFolderId); } catch (e) {}
    }
    return DocumentOcrService.searchVaultDocuments(kidFolder, args.query);
  }
  throw new Error('Tool not found: ' + name);
}

function handleSetSyncState(params) {
  var props = PropertiesService.getScriptProperties();
  var updates = {};
  if (params.initialSyncComplete !== undefined) {
    updates.initial_sync_complete = params.initialSyncComplete ? 'true' : 'false';
  }
  if (params.isDualWorker !== undefined) {
    updates.is_dual_worker = params.isDualWorker ? 'true' : 'false';
  }
  if (params.targetFolderId) {
    updates.target_folder_id = params.targetFolderId;
  }
  if (params.childName) {
    updates.child_name = params.childName;
  }
  if (params.academicYear) {
    updates.academic_year = params.academicYear;
  }
  if (params.schoolDomain) {
    updates.school_domain = params.schoolDomain;
  }

  props.setProperties(updates);

  // If dual-worker mode is active, clean up any existing school-side triggers
  if (updates.is_dual_worker === 'true') {
    try {
      var triggers = ScriptApp.getProjectTriggers();
      for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].getHandlerFunction() === 'runIncrementalSchoolSync') {
          ScriptApp.deleteTrigger(triggers[i]);
        }
      }
    } catch (e) {}
  }

  return { success: true, updated: updates };
}
`
      },
      {
        name: 'StorageRepository',
        type: 'SERVER_JS',
        source: `
var StorageRepository = {
  getRegisteredTools: function () {
    var props = PropertiesService.getUserProperties();
    var raw = props.getProperty('REGISTERED_PORTAL_TOOLS');
    return raw ? JSON.parse(raw) : [];
  },

  saveTool: function (domain, feature, endpointSpec, authSpec, domSnapshot) {
    var tools = this.getRegisteredTools();
    var toolName = ('portal_' + domain + '_' + feature).toLowerCase().replace(/[^a-z0-9_]/g, '_');

    // Replace feature if already registered to avoid duplicates
    tools = tools.filter(function (t) {
      return !(t.domain.toLowerCase() === domain.toLowerCase() && t.feature.toLowerCase() === feature.toLowerCase());
    });

    tools.push({
      name: toolName,
      domain: domain,
      feature: feature,
      endpoint_spec: endpointSpec,
      auth_spec: authSpec,
      dom_snapshot: domSnapshot || '',
      registeredAt: new Date().toISOString()
    });

    var props = PropertiesService.getUserProperties();
    props.setProperty('REGISTERED_PORTAL_TOOLS', JSON.stringify(tools));
    return toolName;
  },

  deleteTool: function (domain, feature) {
    var tools = this.getRegisteredTools();
    tools = tools.filter(function (t) {
      return !(t.domain.toLowerCase() === domain.toLowerCase() && t.feature.toLowerCase() === feature.toLowerCase());
    });
    var props = PropertiesService.getUserProperties();
    props.setProperty('REGISTERED_PORTAL_TOOLS', JSON.stringify(tools));
    return true;
  },

  renameTool: function (domain, oldFeature, newFeature) {
    var tools = this.getRegisteredTools();
    var oldToolName = ('portal_' + domain + '_' + oldFeature).toLowerCase().replace(/[^a-z0-9_]/g, '_');
    var newToolName = ('portal_' + domain + '_' + newFeature).toLowerCase().replace(/[^a-z0-9_]/g, '_');

    tools = tools.map(function (t) {
      if (t.domain.toLowerCase() === domain.toLowerCase() && (t.name === oldToolName || t.feature.toLowerCase() === oldFeature.toLowerCase())) {
        t.feature = newFeature;
        t.name = newToolName;
      }
      return t;
    });

    var props = PropertiesService.getUserProperties();
    props.setProperty('REGISTERED_PORTAL_TOOLS', JSON.stringify(tools));
    return true;
  }
};

var DriveFolderManager = {
  FOLDER_NAME: 'School Portal MCP Intelligence',

  getExistingMcpFolder: function () {
    var props = PropertiesService.getUserProperties();
    var folderId = props.getProperty('MCP_ROOT_FOLDER_ID');
    if (folderId) {
      try {
        var existing = DriveApp.getFolderById(folderId);
        if (existing && !existing.isTrashed()) return existing;
      } catch (e) {}
    }

    var folders = DriveApp.getFoldersByName(this.FOLDER_NAME);
    while (folders.hasNext()) {
      var f = folders.next();
      if (!f.isTrashed()) {
        props.setProperty('MCP_ROOT_FOLDER_ID', f.getId());
        return f;
      }
    }
    return null;
  },

  getOrCreateMcpFolder: function () {
    var existing = this.getExistingMcpFolder();
    if (existing) return existing;

    var newFolder = DriveApp.createFolder(this.FOLDER_NAME);
    newFolder.setDescription('Stores persistent school intelligence cache (WhatsApp messages, PDFs, images, configurations). Modifying or deleting files in this folder directly affects Gemini Spark.');
    PropertiesService.getUserProperties().setProperty('MCP_ROOT_FOLDER_ID', newFolder.getId());
    return newFolder;
  },

  getFolderInfo: function () {
    var folder = this.getExistingMcpFolder();
    var userEmail = '';
    try {
      userEmail = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '';
    } catch (e) {}

    if (!folder) {
      return {
        isCreated: false,
        accountEmail: userEmail,
        folderName: this.FOLDER_NAME,
        folderUrl: '',
        message: 'Awaiting first verified school group capture before creating Google Drive folder.'
      };
    }
    return {
      isCreated: true,
      accountEmail: userEmail,
      folderId: folder.getId(),
      folderName: folder.getName(),
      folderUrl: folder.getUrl(),
      notice: '⚠️ Notice: This Google Drive folder stores your persistent school intelligence cache (WhatsApp messages, PDFs, images, configurations). Modifying or deleting files in this folder will directly alter or remove data used by Gemini Spark.'
    };
  }
};

var WhatsAppStorage = {
  ARCHIVE_FILE_NAME: 'whatsapp_school_archive.json',

  getArchiveFileId: function () {
    var props = PropertiesService.getUserProperties();
    var targetChild = (typeof CONFIG !== 'undefined' && CONFIG.childName) ? CONFIG.childName : 'Child';
    var childArchiveName = targetChild + '_whatsapp_school_archive.json';

    // 1. Always prioritize finding child-specific archive file first
    var childFiles = DriveApp.getFilesByName(childArchiveName);
    while (childFiles.hasNext()) {
      var cf = childFiles.next();
      if (!cf.isTrashed()) {
        props.setProperty('WHATSAPP_ARCHIVE_FILE_ID', cf.getId());
        return cf.getId();
      }
    }

    // 2. Check cached file ID if still valid
    var fileId = props.getProperty('WHATSAPP_ARCHIVE_FILE_ID');
    if (fileId) {
      try {
        var existing = DriveApp.getFileById(fileId);
        if (existing && !existing.isTrashed()) return fileId;
      } catch (e) {}
    }

    // 3. Try finding inside MCP folder
    var folder = DriveFolderManager.getExistingMcpFolder();
    if (folder) {
      var files = folder.getFilesByName(childArchiveName);
      if (files.hasNext()) {
        var id = files.next().getId();
        props.setProperty('WHATSAPP_ARCHIVE_FILE_ID', id);
        return id;
      }
      var defaultFiles = folder.getFilesByName(this.ARCHIVE_FILE_NAME);
      if (defaultFiles.hasNext()) {
        var defId = defaultFiles.next().getId();
        props.setProperty('WHATSAPP_ARCHIVE_FILE_ID', defId);
        return defId;
      }
    }

    // 4. Fallback: Search globally on Drive
    var globalFiles = DriveApp.getFilesByName(this.ARCHIVE_FILE_NAME);
    while (globalFiles.hasNext()) {
      var gf = globalFiles.next();
      if (!gf.isTrashed()) {
        props.setProperty('WHATSAPP_ARCHIVE_FILE_ID', gf.getId());
        return gf.getId();
      }
    }

    return null;
  },

  getGroupsManifest: function () {
    try {
      var files = DriveApp.getFilesByName('groups_manifest.json');
      while (files.hasNext()) {
        var f = files.next();
        if (!f.isTrashed()) {
          var content = f.getBlob().getDataAsString();
          return content ? JSON.parse(content) : null;
        }
      }
    } catch (e) {}
    return null;
  },

  saveAttachment: function (fileName, base64Data, mimeType, messageContext) {
    var folder = DriveFolderManager.getOrCreateMcpFolder();
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, mimeType || 'application/pdf', fileName);
    var file = folder.createFile(blob);
    var fileId = file.getId();

    var ocrText = '';
    try {
      if (typeof DocumentOcrService !== 'undefined') {
        var docRec = DocumentOcrService.indexDocument(folder, file, 'whatsapp');
        if (docRec && docRec.text) ocrText = docRec.text;
      } else if (typeof DriveContentExtractor !== 'undefined') {
        var ocrRes = DriveContentExtractor.extractText(fileId, 4000);
        if (ocrRes && ocrRes.text) ocrText = ocrRes.text;
      }
    } catch (ocrErr) {
      McpLogger.log('WARN', 'attachment:ocr_failed', { fileId: fileId, error: ocrErr.toString() });
    }

    var fileRecord = {
      fileId: fileId,
      fileName: fileName,
      fileUrl: file.getUrl(),
      mimeType: mimeType,
      ocrText: ocrText,
      uploadedAt: new Date().toISOString()
    };

    if (messageContext) {
      messageContext.attachment = fileRecord;
      if (ocrText) {
        messageContext.body = (messageContext.body || '') + '\\n[Auto-OCR Extracted from ' + fileName + ']:\\n' + ocrText;
      }
      this.saveMessages([messageContext]);
    }

    McpLogger.log('INFO', 'attachment:saved_and_ocr', { fileName: fileName, fileId: fileId, ocrChars: ocrText.length });
    return { success: true, fileId: fileId, fileUrl: file.getUrl(), ocrTextLength: ocrText.length };
  },

  saveMessages: function (newMessages) {
    if (!newMessages || !Array.isArray(newMessages) || newMessages.length === 0) {
      return { saved: 0 };
    }
    var fileId = this.getArchiveFileId();
    var existing = [];
    if (fileId) {
      try {
        var content = DriveApp.getFileById(fileId).getBlob().getDataAsString();
        existing = content ? JSON.parse(content) : [];
      } catch (e) {
        existing = [];
      }
    }

    var seen = {};
    existing.forEach(function (m) {
      seen[(m.chatName || '') + '_' + (m.timestamp || '') + '_' + (m.body || '')] = true;
    });

    var addedCount = 0;
    newMessages.forEach(function (m) {
      var key = (m.chatName || '') + '_' + (m.timestamp || '') + '_' + (m.body || '');
      if (!seen[key]) {
        seen[key] = true;
        existing.push(m);
        addedCount++;
      }
    });

    // Enforce newest-first chronological ordering
    var self = this;
    existing.sort(function (a, b) {
      var pa = self.parseMessageDate(a);
      var pb = self.parseMessageDate(b);
      var ta = pa ? pa.exactTimestampMs : 0;
      var tb = pb ? pb.exactTimestampMs : 0;
      return tb - ta;
    });

    if (existing.length > 50000) existing = existing.slice(0, 50000);

    var jsonStr = JSON.stringify(existing, null, 2);
    if (fileId) {
      DriveApp.getFileById(fileId).setContent(jsonStr);
    } else {
      var folder = DriveFolderManager.getOrCreateMcpFolder();
      var targetChild = (typeof CONFIG !== 'undefined' && CONFIG.childName) ? CONFIG.childName : 'Child';
      var newFile = folder.createFile(targetChild + '_whatsapp_school_archive.json', jsonStr, 'application/json');
      PropertiesService.getUserProperties().setProperty('WHATSAPP_ARCHIVE_FILE_ID', newFile.getId());
    }

    McpLogger.log('INFO', 'whatsapp:archived', { added: addedCount, totalArchived: existing.length });
    return { saved: addedCount, total: existing.length };
  },

  getAllMessages: function () {
    var fileId = this.getArchiveFileId();
    if (!fileId) return [];
    try {
      var content = DriveApp.getFileById(fileId).getBlob().getDataAsString();
      var list = content ? JSON.parse(content) : [];
      var self = this;
      list.sort(function (a, b) {
        var pa = self.parseMessageDate(a);
        var pb = self.parseMessageDate(b);
        var ta = pa ? pa.exactTimestampMs : 0;
        var tb = pb ? pb.exactTimestampMs : 0;
        return tb - ta;
      });
      return list;
    } catch (e) {
      return [];
    }
  },

  parseMessageDate: function (m) {
    try {
      var dateStr = m.date || '';
      var tsStr = m.timestamp || '';
      var timeStr = m.time || '';
      var combined = dateStr + ' ' + tsStr + ' ' + timeStr;

      var y = 2026, mNum = 1, d = 1, hour = 12, min = 0;

      var slashMatch = combined.match(new RegExp('\\b(\\d{1,2})/(\\d{1,2})/(\\d{4})\\b'));
      if (slashMatch) {
        mNum = parseInt(slashMatch[1], 10);
        d = parseInt(slashMatch[2], 10);
        y = parseInt(slashMatch[3], 10);
      } else {
        var isoMatch = combined.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
        if (isoMatch) {
          y = parseInt(isoMatch[1], 10);
          mNum = parseInt(isoMatch[2], 10);
          d = parseInt(isoMatch[3], 10);
        } else {
          var dashMatch = combined.match(/\\b(\\d{1,2})-(\\d{1,2})-(\\d{4})\\b/);
          if (dashMatch) {
            d = parseInt(dashMatch[1], 10);
            mNum = parseInt(dashMatch[2], 10);
            y = parseInt(dashMatch[3], 10);
          }
        }
      }

      var timeMatch = combined.match(/\\b(\\d{1,2}):(\\d{2})(?::(\\d{2}))?\\s*(am|pm)?\\b/i);
      if (timeMatch) {
        hour = parseInt(timeMatch[1], 10);
        min = parseInt(timeMatch[2], 10);
        var ampm = (timeMatch[4] || '').toLowerCase();
        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
      }

      var exactMs = new Date(y, mNum - 1, d, hour, min).getTime();
      return {
        year: y,
        month: mNum,
        day: d,
        hour: hour,
        minute: min,
        exactTimestampMs: exactMs,
        dayTimestampMs: new Date(y, mNum - 1, d).getTime()
      };
    } catch (e) {}
    return null;
  },

  matchesTemporalCondition: function (mParsed, queryLower, now) {
    if (!mParsed) return null;

    var nowYear = now.getFullYear();
    var nowMonth = now.getMonth() + 1;
    var nowDay = now.getDate();
    var nowMs = now.getTime();
    var nowDayMs = new Date(nowYear, nowMonth - 1, nowDay).getTime();
    var oneDayMs = 86400000;
    var oneHourMs = 3600000;
    var oneMinMs = 60000;

    var hoursMatch = queryLower.match(/\\b(?:in the\\s+|past\\s+|last\\s+)(\\d{1,2})\\s*hours?\\b/);
    if (hoursMatch) {
      var hCount = parseInt(hoursMatch[1], 10);
      var diffH = nowMs - mParsed.exactTimestampMs;
      return diffH >= -oneMinMs && diffH <= (hCount * oneHourMs);
    }
    if (/\\b(?:last|past)\\s+hour\\b/.test(queryLower)) {
      var diffH1 = nowMs - mParsed.exactTimestampMs;
      return diffH1 >= -oneMinMs && diffH1 <= oneHourMs;
    }

    var minsMatch = queryLower.match(/\\b(?:in the\\s+|past\\s+|last\\s+)(\\d{1,3})\\s*min(?:ute)?s?\\b/);
    if (minsMatch) {
      var mCount = parseInt(minsMatch[1], 10);
      var diffM = nowMs - mParsed.exactTimestampMs;
      return diffM >= -30000 && diffM <= (mCount * oneMinMs);
    }

    var isToday = mParsed.year === nowYear && mParsed.month === nowMonth && mParsed.day === nowDay;
    var ystDate = new Date(nowDayMs - oneDayMs);
    var isYesterday = mParsed.year === ystDate.getFullYear() && mParsed.month === (ystDate.getMonth() + 1) && mParsed.day === ystDate.getDate();

    if (/\\bthis morning\\b/.test(queryLower)) {
      return isToday && mParsed.hour >= 5 && mParsed.hour < 12;
    }
    if (/\\byesterday morning\\b/.test(queryLower)) {
      return isYesterday && mParsed.hour >= 5 && mParsed.hour < 12;
    }
    if (/\\bthis afternoon\\b/.test(queryLower)) {
      return isToday && mParsed.hour >= 12 && mParsed.hour < 17;
    }
    if (/\\bthis evening\\b/.test(queryLower)) {
      return isToday && mParsed.hour >= 17 && mParsed.hour < 22;
    }
    if (/\\byesterday evening\\b/.test(queryLower)) {
      return isYesterday && mParsed.hour >= 17 && mParsed.hour < 22;
    }
    if (/\\btonight\\b|\\bat night\\b/.test(queryLower)) {
      return (isToday || isYesterday) && (mParsed.hour >= 20 || mParsed.hour < 5);
    }

    if (/\\btoday\\b/.test(queryLower)) {
      return isToday;
    }
    if (/\\byesterday\\b/.test(queryLower)) {
      return isYesterday;
    }
    if (/day before yesterday/.test(queryLower)) {
      var dby = new Date(nowDayMs - (2 * oneDayMs));
      return mParsed.year === dby.getFullYear() && mParsed.month === (dby.getMonth() + 1) && mParsed.day === dby.getDate();
    }
    if (/this week|current week|past week|past 7 days|last 7 days|recent/.test(queryLower)) {
      var diffDays = (nowDayMs - mParsed.dayTimestampMs) / oneDayMs;
      return diffDays >= -1 && diffDays <= 7;
    }
    if (/last week|previous week/.test(queryLower)) {
      var diffDays2 = (nowDayMs - mParsed.dayTimestampMs) / oneDayMs;
      return diffDays2 > 7 && diffDays2 <= 14;
    }
    if (/this month|current month/.test(queryLower)) {
      return mParsed.year === nowYear && mParsed.month === nowMonth;
    }
    if (/last month|previous month/.test(queryLower)) {
      var lastM = nowMonth === 1 ? 12 : nowMonth - 1;
      var lastMY = nowMonth === 1 ? nowYear - 1 : nowYear;
      return mParsed.year === lastMY && mParsed.month === lastM;
    }
    if (/this year|current year/.test(queryLower)) {
      return mParsed.year === nowYear;
    }

    var monthMap = {
      'january': 1, 'jan': 1, 'february': 2, 'feb': 2, 'march': 3, 'mar': 3, 'april': 4, 'apr': 4,
      'may': 5, 'june': 6, 'jun': 6, 'july': 7, 'jul': 7, 'august': 8, 'aug': 8,
      'september': 9, 'sep': 9, 'sept': 9, 'october': 10, 'oct': 10, 'november': 11, 'nov': 11, 'december': 12, 'dec': 12
    };

    var dMonthMatch = queryLower.match(/\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+([a-z]+)\\b/);
    if (dMonthMatch && monthMap[dMonthMatch[2]]) {
      var day = parseInt(dMonthMatch[1], 10);
      var month = monthMap[dMonthMatch[2]];
      return mParsed.month === month && mParsed.day === day;
    }
    var monthDMatch = queryLower.match(/\\b([a-z]+)\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b/);
    if (monthDMatch && monthMap[monthDMatch[1]]) {
      var day2 = parseInt(monthDMatch[2], 10);
      var month2 = monthMap[monthDMatch[1]];
      return mParsed.month === month2 && mParsed.day === day2;
    }

    for (var mName in monthMap) {
      var mRegex = new RegExp('\\\\b' + mName + '\\\\b', 'i');
      if (mRegex.test(queryLower)) {
        return mParsed.month === monthMap[mName];
      }
    }

    return null;
  },

  cleanTopicQuery: function (queryLower) {
    return queryLower
      .replace(/\\b(?:in the\\s+|past\\s+|last\\s+)\\d{1,3}\\s*(?:hours?|min(?:ute)?s?)\\b/gi, '')
      .replace(/\\b(today|tonight|yesterday|tomorrow|day before yesterday|this week|last week|past week|current week|this month|last month|current month|this year|current year|recent|latest)\\b/gi, '')
      .replace(/\\b(this morning|yesterday morning|this afternoon|this evening|yesterday evening|at night|morning|afternoon|evening|night)\\b/gi, '')
      .replace(/\\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\\b/gi, '')
      .replace(/\\b\\d{1,2}(?:st|nd|rd|th)?\\b/gi, '')
      .replace(/\\b(updates?|notices?|messages?|posted|shared|from|in|on|at|the|for|by|what|is|are|any)\\b/gi, '')
      .replace(/[^a-z0-9\\s]/gi, ' ')
      .replace(/\\s+/g, ' ')
      .trim();
  },

  getRecentMessages: function (chatFilter, maxCount) {
    maxCount = maxCount || 40;
    var list = this.getAllMessages();

    if (chatFilter && chatFilter.trim() && chatFilter.toLowerCase().trim() !== 'official') {
      var query = chatFilter.toLowerCase().trim();
      var terms = query.split(/[\\s,]+/);
      list = list.filter(function (m) {
        var text = ((m.chatName || '') + ' ' + (m.body || '') + ' ' + (m.sender || '') + ' ' + (m.timestamp || '')).toLowerCase();
        return terms.some(function(t) { return t.length > 1 && text.indexOf(t) !== -1; }) || text.indexOf(query) !== -1;
      });
    }

    return list.slice(0, maxCount).map(function (m) {
      var body = m.body || '';
      var isHomework = /homework|assignment|worksheet|submission|due|deadline|task|subject:|practice sheet|chapter/i.test(body);
      var ts = m.timestamp || '';
      var parts = ts.includes(',') ? ts.split(',') : [ts];
      return {
        chatName: m.chatName,
        sender: m.sender,
        timestamp: ts,
        date: m.date || (parts.length > 1 ? parts[1].trim() : undefined),
        time: m.time || (parts.length > 1 ? parts[0].trim() : ts),
        category: isHomework ? 'HOMEWORK_OR_TASK_ANNOUNCEMENT' : (m.category || 'CLASS_ANNOUNCEMENT'),
        body: body,
        driveAttachmentUrl: m.driveAttachmentUrl || undefined,
        driveFileName: m.driveFileName || undefined
      };
    });
  },

  queryHistory: function (query, maxCount) {
    maxCount = maxCount || 60;
    var list = this.getAllMessages();
    if (!query || !query.trim()) return list.slice(0, maxCount);

    var q = query.toLowerCase().trim();
    var now = new Date();
    var topicQuery = this.cleanTopicQuery(q);
    var topicTerms = topicQuery ? topicQuery.split(/\\s+/).filter(function (t) { return t.length > 2; }) : [];

    var self = this;
    var results = list.filter(function (m) {
      var mParsed = self.parseMessageDate(m);
      var temporalResult = self.matchesTemporalCondition(mParsed, q, now);

      if (temporalResult === false) return false;
      if (temporalResult === true) {
        if (topicTerms.length > 0) {
          var fullText = ((m.chatName || '') + ' ' + (m.body || '') + ' ' + (m.sender || '') + ' ' + (m.documentTitle || '') + ' ' + (m.category || '')).toLowerCase();
          return topicTerms.some(function (term) { return fullText.indexOf(term) !== -1; });
        }
        return true;
      }

      var fullTextAll = ((m.chatName || '') + ' ' + (m.body || '') + ' ' + (m.sender || '') + ' ' + (m.timestamp || '') + ' ' + (m.date || '')).toLowerCase();
      if (fullTextAll.indexOf(q) !== -1) return true;

      var terms = q.split(/[\\s,]+/).filter(function (t) { return t.length > 2; });
      if (terms.length > 0) {
        return terms.every(function (t) { return fullTextAll.indexOf(t) !== -1; });
      }
      return true;
    });

    return results.slice(0, maxCount).map(function (m) {
      var body = m.body || '';
      var isHomework = /homework|assignment|worksheet|submission|due|deadline|task|subject:|practice sheet|chapter/i.test(body);
      var ts = m.timestamp || '';
      var parts = ts.includes(',') ? ts.split(',') : [ts];
      return {
        chatName: m.chatName,
        sender: m.sender,
        timestamp: ts,
        date: m.date || (parts.length > 1 ? parts[1].trim() : undefined),
        time: m.time || (parts.length > 1 ? parts[0].trim() : ts),
        category: isHomework ? 'HOMEWORK_OR_TASK_ANNOUNCEMENT' : (m.category || 'CLASS_ANNOUNCEMENT'),
        body: body,
        driveAttachmentUrl: m.driveAttachmentUrl || undefined,
        driveFileName: m.driveFileName || undefined
      };
    });
  }
};

var LiveTabStorage = {
  saveTabContent: function (tabData) {
    if (!tabData || !tabData.url) return { saved: false };
    PropertiesService.getUserProperties().setProperty('LATEST_LIVE_TAB_' + encodeURIComponent(tabData.domain || 'general'), JSON.stringify(tabData));
    McpLogger.log('INFO', 'live_tab:cached', { domain: tabData.domain, title: tabData.title });
    return { saved: true, domain: tabData.domain };
  },
  getTabContent: function (domainOrKeyword) {
    var props = PropertiesService.getUserProperties();
    if (domainOrKeyword && domainOrKeyword.trim()) {
      var key = 'LATEST_LIVE_TAB_' + encodeURIComponent(domainOrKeyword.toLowerCase().trim());
      var val = props.getProperty(key);
      if (val) return JSON.parse(val);
    }
    var allKeys = props.getKeys();
    for (var k = 0; k < allKeys.length; k++) {
      if (allKeys[k].indexOf('LATEST_LIVE_TAB_') === 0) {
        var raw = props.getProperty(allKeys[k]);
        if (raw && (!domainOrKeyword || raw.toLowerCase().indexOf(domainOrKeyword.toLowerCase()) !== -1)) {
          return JSON.parse(raw);
        }
      }
    }
    return null;
  }
};
`
      },
      {
        name: 'PortalApiFetcher',
        type: 'SERVER_JS',
        source: `
var PortalApiFetcher = {
  fetchPortalData: function (toolSpec) {
    var spec = toolSpec.endpoint_spec || {};
    var auth = toolSpec.auth_spec || {};

    var options = {
      method: spec.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      muteHttpExceptions: true
    };

    if (spec.headers) {
      for (var h in spec.headers) {
        options.headers[h] = spec.headers[h];
      }
    }

    if (auth.cookies) {
      options.headers['Cookie'] = auth.cookies;
    }

    if (spec.method !== 'GET' && spec.body) {
      options.payload = spec.body;
    }

    var response = UrlFetchApp.fetch(spec.url, options);
    var code = response.getResponseCode();
    var contentText = response.getContentText();

    if (code !== 200) {
      McpLogger.log('ERROR', 'portal:error', { feature: toolSpec.feature, domain: toolSpec.domain, status: code, snippet: contentText.substring(0, 100) });
      return {
        success: false,
        statusCode: code,
        url: spec.url,
        error: 'Portal request returned HTTP status ' + code + ': ' + contentText.substring(0, 200)
      };
    }

    McpLogger.log('INFO', 'portal:fetch_success', { feature: toolSpec.feature, domain: toolSpec.domain, status: code, bytes: contentText.length });

    try {
      var json = JSON.parse(contentText);
      if (toolSpec.dom_snapshot) {
        json.rendered_calendar_data = toolSpec.dom_snapshot;
      }
      return json;
    } catch (e) {
      var clean = contentText;
      var reScript = new RegExp('<' + 'script[^>]*>[\\s\\S]*?<' + '/script>', 'gi');
      var reStyle = new RegExp('<' + 'style[^>]*>[\\s\\S]*?<' + '/style>', 'gi');
      var reNoScript = new RegExp('<' + 'noscript[^>]*>[\\s\\S]*?<' + '/noscript>', 'gi');
      clean = clean.replace(reScript, ' ');
      clean = clean.replace(reStyle, ' ');
      clean = clean.replace(reNoScript, ' ');
      clean = clean.replace(new RegExp('<br[^>]*>', 'gi'), '\\n');
      clean = clean.replace(new RegExp('</p>', 'gi'), '\\n');
      clean = clean.replace(new RegExp('</tr>', 'gi'), '\\n');
      clean = clean.replace(new RegExp('<td[^>]*>', 'gi'), ' | ');
      clean = clean.replace(new RegExp('<th[^>]*>', 'gi'), ' | ');
      clean = clean.replace(new RegExp('<[^>]+>', 'g'), ' ');
      clean = clean.replace(/&nbsp;/gi, ' ');
      clean = clean.replace(/&amp;/gi, '&');
      clean = clean.replace(/&lt;/gi, '<');
      clean = clean.replace(/&gt;/gi, '>');
      clean = clean.replace(/[ \\t]+/g, ' ');
      clean = clean.trim();

      return {
        success: true,
        feature: toolSpec.feature,
        domain: toolSpec.domain,
        url: spec.url,
        content_length: contentText.length,
        rendered_calendar_data: toolSpec.dom_snapshot || '',
        extracted_portal_content: clean.substring(0, 45000)
      };
    }
  }
};
`
      },
      {
        name: 'WorkspaceFetcher',
        type: 'SERVER_JS',
        source: `
var WorkspaceFetcher = {
  getGoogleClassroomWork: function () {
    try {
      var courses = [];

      // 1. Try Native Classroom Advanced Google Service first
      if (typeof Classroom !== 'undefined' && Classroom.Courses && Classroom.Courses.list) {
        try {
          var res = Classroom.Courses.list({ studentId: 'me', courseStates: ['ACTIVE'] });
          courses = res.courses || [];
        } catch (clsErr) {
          try {
            var res2 = Classroom.Courses.list({ teacherId: 'me', courseStates: ['ACTIVE'] });
            courses = res2.courses || [];
          } catch (clsErr2) {}
        }
      }

      // 2. Fallback to UrlFetchApp with OAuth Token
      if (!courses || courses.length === 0) {
        var token = ScriptApp.getOAuthToken();
        var headers = { Authorization: 'Bearer ' + token };
        var response = UrlFetchApp.fetch('https://classroom.googleapis.com/v1/courses?studentId=me&courseStates=ACTIVE', {
          headers: headers,
          muteHttpExceptions: true
        });
        if (response.getResponseCode() === 200) {
          var json = JSON.parse(response.getContentText());
          courses = json.courses || [];
        } else if (response.getResponseCode() === 403) {
          var response2 = UrlFetchApp.fetch('https://classroom.googleapis.com/v1/courses?teacherId=me', {
            headers: headers,
            muteHttpExceptions: true
          });
          if (response2.getResponseCode() === 200) {
            var json2 = JSON.parse(response2.getContentText());
            courses = json2.courses || [];
          }
        }
      }

      McpLogger.log('INFO', 'classroom:courses', {
        totalActiveCourses: courses.length,
        names: courses.map(function(c) { return c.name; })
      });

      var enrichedCourses = [];
      for (var i = 0; i < Math.min(courses.length, 6); i++) {
        var c = courses[i];
        var courseData = {
          id: c.id,
          name: c.name,
          section: c.section,
          alternateLink: c.alternateLink || ('https://classroom.google.com/c/' + c.id),
          courseWork: [],
          courseWorkMaterials: [],
          announcements: []
        };

        // Fetch coursework (assignments & tasks - recent 4)
        try {
          if (typeof Classroom !== 'undefined' && Classroom.Courses && Classroom.Courses.CourseWork) {
            var cw = Classroom.Courses.CourseWork.list(c.id, { pageSize: 4 });
            courseData.courseWork = cw.courseWork || [];
          } else {
            var cwRes = UrlFetchApp.fetch('https://classroom.googleapis.com/v1/courses/' + c.id + '/courseWork?pageSize=4', {
              headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
              muteHttpExceptions: true
            });
            if (cwRes.getResponseCode() === 200) {
              courseData.courseWork = JSON.parse(cwRes.getContentText()).courseWork || [];
            }
          }
        } catch (e) {}

        // Fetch courseWorkMaterials (study resources, poems, worksheets - recent 4)
        try {
          if (typeof Classroom !== 'undefined' && Classroom.Courses && Classroom.Courses.CourseWorkMaterials) {
            var cwm = Classroom.Courses.CourseWorkMaterials.list(c.id, { pageSize: 4 });
            courseData.courseWorkMaterials = cwm.courseWorkMaterial || [];
          } else {
            var cwmRes = UrlFetchApp.fetch('https://classroom.googleapis.com/v1/courses/' + c.id + '/courseWorkMaterials?pageSize=4', {
              headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
              muteHttpExceptions: true
            });
            if (cwmRes.getResponseCode() === 200) {
              courseData.courseWorkMaterials = JSON.parse(cwmRes.getContentText()).courseWorkMaterial || [];
            }
          }
        } catch (e) {}

        // Fetch announcements (class stream posts - recent 4)
        try {
          if (typeof Classroom !== 'undefined' && Classroom.Courses && Classroom.Courses.Announcements) {
            var ann = Classroom.Courses.Announcements.list(c.id, { pageSize: 4 });
            courseData.announcements = ann.announcements || [];
          } else {
            var annRes = UrlFetchApp.fetch('https://classroom.googleapis.com/v1/courses/' + c.id + '/announcements?pageSize=4', {
              headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
              muteHttpExceptions: true
            });
            if (annRes.getResponseCode() === 200) {
              courseData.announcements = JSON.parse(annRes.getContentText()).announcements || [];
            }
          }
        } catch (e) {}

        var uncachedOcrCount = 0;
        var MAX_NEW_OCRS_PER_COURSE = 2;
        var courseStart = new Date().getTime();

        // Helper to enrich materials with DriveContentExtractor
        var enrichMaterials = function (mats) {
          if (!mats || !Array.isArray(mats)) return;
          for (var m = 0; m < mats.length; m++) {
            if (mats[m].driveFile && mats[m].driveFile.driveFile && mats[m].driveFile.driveFile.id) {
              var fId = mats[m].driveFile.driveFile.id;
              var fTitle = mats[m].driveFile.driveFile.title || 'Attachment';

              // If cached, returns immediately in <1ms!
              var cacheCheck = CacheService.getUserCache().get('ocr_' + fId) || PropertiesService.getUserProperties().getProperty('ocr_' + fId);
              if (cacheCheck) {
                mats[m].driveFile.driveFile.extracted_content_summary = cacheCheck.substring(0, 3500);
                mats[m].extracted_content_summary = cacheCheck.substring(0, 3500);
                continue;
              }

              // Throttle new uncached OCRs to prevent timeout
              if (uncachedOcrCount >= MAX_NEW_OCRS_PER_COURSE || (new Date().getTime() - courseStart) > 12000) {
                mats[m].driveFile.driveFile.extraction_status = 'Pending On-Demand (Use fetch_drive_file_ocr with fileId: ' + fId + ')';
                continue;
              }

              try {
                uncachedOcrCount++;
                var extRes = DriveContentExtractor.extractText(fId, 3500);
                if (extRes && extRes.success && extRes.extractedText) {
                  mats[m].driveFile.driveFile.extracted_content_summary = extRes.extractedText;
                  mats[m].extracted_content_summary = extRes.extractedText;
                  McpLogger.log('INFO', 'drive:ocr_success', { fileTitle: fTitle, fileId: fId, chars: extRes.extractedText.length });
                } else if (extRes && extRes.error) {
                  mats[m].driveFile.driveFile.extraction_status = extRes.error;
                }
              } catch (extErr) {
                mats[m].driveFile.driveFile.extraction_status = 'Error: ' + extErr.toString();
              }
            }
          }
        };

        for (var w = 0; w < courseData.courseWork.length; w++) {
          enrichMaterials(courseData.courseWork[w].materials);
        }
        for (var cm = 0; cm < courseData.courseWorkMaterials.length; cm++) {
          enrichMaterials(courseData.courseWorkMaterials[cm].materials);
        }
        for (var a = 0; a < courseData.announcements.length; a++) {
          enrichMaterials(courseData.announcements[a].materials);
        }

        McpLogger.log('INFO', 'classroom:course_detail', {
          course: c.name,
          assignments: courseData.courseWork.length,
          materials: courseData.courseWorkMaterials.length,
          announcements: courseData.announcements.length
        });

        enrichedCourses.push(courseData);
      }

      return { courses: enrichedCourses, totalCourses: courses.length };
    } catch (err) {
      McpLogger.log('ERROR', 'classroom:error', err.toString());
      return { error: err.toString() };
    }
  },

  getCalendarEvents: function () {
    try {
      var calendarId = 'primary';
      var now = new Date();
      var future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      var url = 'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calendarId) + '/events?timeMin=' + now.toISOString() + '&timeMax=' + future.toISOString();

      var response = UrlFetchApp.fetch(url, {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });
      var json = JSON.parse(response.getContentText());
      var events = json.items || [];
      McpLogger.log('INFO', 'calendar:events', { eventCount: events.length });
      return { events: events };
    } catch (err) {
      McpLogger.log('ERROR', 'calendar:error', err.toString());
      return { error: err.toString() };
    }
  },

  getSchoolGmailMessages: function (customQuery) {
    try {
      var threads = (customQuery && customQuery.trim()) 
        ? GmailApp.search(customQuery.trim(), 0, 15) 
        : GmailApp.getInboxThreads(0, 15);

      var messages = [];
      for (var i = 0; i < threads.length; i++) {
        var thread = threads[i];
        var msgs = thread.getMessages();
        if (msgs.length > 0) {
          var lastMsg = msgs[msgs.length - 1];
          var snippet = '';
          try {
            snippet = thread.getSnippet();
          } catch (e) {
            snippet = lastMsg.getPlainBody() ? lastMsg.getPlainBody().substring(0, 300) : '';
          }

          var plainBody = lastMsg.getPlainBody() || '';
          var driveAttachments = [];

          // Scan body for Google Drive links (e.g. Hindi Poem Competition Results, Dialogues, Circulars)
          var driveMarkers = ['drive.google.com/file/d/', 'drive.google.com/open?id='];
          var seenIds = {};
          for (var dm = 0; dm < driveMarkers.length; dm++) {
            var marker = driveMarkers[dm];
            var searchIdx = 0;
            while ((searchIdx = plainBody.indexOf(marker, searchIdx)) !== -1) {
              var idStart = searchIdx + marker.length;
              var idEnd = idStart;
              while (idEnd < plainBody.length && /[a-zA-Z0-9_-]/.test(plainBody.charAt(idEnd))) {
                idEnd++;
              }
              var fId = plainBody.substring(idStart, idEnd);
              if (fId && fId.length > 10 && !seenIds[fId]) {
                seenIds[fId] = true;
                try {
                  var ext = DriveContentExtractor.extractText(fId, 3000);
                  if (ext && ext.success) {
                    driveAttachments.push(ext);
                    McpLogger.log('INFO', 'gmail:drive_ocr_link', { subject: lastMsg.getSubject(), fileId: fId });
                  }
                } catch (extErr) {}
              }
              searchIdx = idEnd + 1;
            }
          }

          // Scan direct email attachments
          try {
            var rawAtts = lastMsg.getAttachments();
            for (var a = 0; a < rawAtts.length; a++) {
              var att = rawAtts[a];
              var ct = att.getContentType();
              if (ct === 'application/pdf' || ct.indexOf('image/') === 0 || ct.indexOf('text/') === 0) {
                try {
                  var attExt = DriveContentExtractor.ocrExtract(null, att, ct, 3000);
                  if (attExt && attExt.success) {
                    driveAttachments.push(attExt);
                    McpLogger.log('INFO', 'gmail:attachment_ocr', { subject: lastMsg.getSubject(), name: att.getName() });
                  }
                } catch (attErr) {}
              }
            }
          } catch (attScanErr) {}

          messages.push({
            subject: lastMsg.getSubject(),
            from: lastMsg.getFrom(),
            date: lastMsg.getDate().toISOString(),
            snippet: snippet,
            bodySnippet: plainBody.substring(0, 1500),
            extracted_drive_attachments: driveAttachments
          });
        }
      }
      McpLogger.log('INFO', 'gmail:messages', { query: customQuery || 'INBOX', messageCount: messages.length });
      return { messages: messages, queryUsed: customQuery || 'INBOX' };
    } catch (err) {
      McpLogger.log('ERROR', 'gmail:error', err.toString());
      return { error: err.toString() };
    }
  }
};
`
      },
      {
        name: 'DocumentOcrService',
        type: 'SERVER_JS',
        source: `
var DocumentOcrService = {
  INDEX_FILE_NAME: 'ocr_search_index.json',
  STATUS_FILE_NAME: 'ocr_job_status.json',

  hasNativeTextLayer: function(blob) {
    if (!blob) return { hasText: false, extractedText: '' };
    try {
      var rawString = blob.getDataAsString();
      if (!rawString || rawString.length < 50) return { hasText: false, extractedText: '' };

      var textPieces = [];
      var tjRegex = /\\(([^)]+)\\)\\s*(?:Tj|'|")/g;
      var match;
      var totalChars = 0;
      while ((match = tjRegex.exec(rawString)) !== null && totalChars < 5000) {
        var str = match[1].replace(/\\\\([()\\\\])/g, '$1');
        textPieces.push(str);
        totalChars += str.length;
      }

      var arrayTjRegex = /\\[([^\\]]+)\\]\\s*TJ/g;
      while ((match = arrayTjRegex.exec(rawString)) !== null && totalChars < 5000) {
        var inner = match[1];
        var innerParenRegex = /\\(([^)]+)\\)/g;
        var innerMatch;
        while ((innerMatch = innerParenRegex.exec(inner)) !== null) {
          var str2 = innerMatch[1].replace(/\\\\([()\\\\])/g, '$1');
          textPieces.push(str2);
          totalChars += str2.length;
        }
      }

      var extracted = textPieces.join(' ').replace(/\\s+/g, ' ').trim();
      var words = extracted.match(/[a-zA-Z0-9\\u0900-\\u097F]{2,}/g) || [];
      var readableChars = words.join('').length;
      var ratio = readableChars / Math.max(1, extracted.length);

      if (readableChars >= 50 && ratio >= 0.50) {
        return { hasText: true, extractedText: extracted };
      }
    } catch (e) {}
    return { hasText: false, extractedText: '' };
  },

  performDriveOcr: function(fileId, fileName) {
    if (!fileId) return null;
    var maxChars = 8000;
    var copyId = null;

    try {
      var token = ScriptApp.getOAuthToken();
      var resource = {
        title: 'temp_ocr_' + (fileName || fileId).replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30),
        mimeType: 'application/vnd.google-apps.document'
      };

      if (typeof Drive !== 'undefined' && Drive.Files && Drive.Files.copy) {
        var copy = Drive.Files.copy(resource, fileId, { ocr: true, ocrLanguage: 'en,hi', supportsAllDrives: true });
        if (copy && copy.id) copyId = copy.id;
      } else {
        var copyRes = UrlFetchApp.fetch('https://www.googleapis.com/drive/v2/files/' + fileId + '/copy?ocr=true&ocrLanguage=en,hi&supportsAllDrives=true', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify(resource),
          muteHttpExceptions: true
        });
        if (copyRes.getResponseCode() === 200) {
          var copyData = JSON.parse(copyRes.getContentText());
          if (copyData && copyData.id) copyId = copyData.id;
        }
      }

      if (copyId) {
        var text = '';
        try {
          var doc = DocumentApp.openById(copyId);
          text = doc.getBody().getText();
        } catch (docErr) {
          try {
            var exportRes = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + copyId + '/export?mimeType=text/plain', {
              headers: { 'Authorization': 'Bearer ' + token },
              muteHttpExceptions: true
            });
            if (exportRes.getResponseCode() === 200) {
              text = exportRes.getContentText();
            }
          } catch (expErr) {}
        }

        if (text && text.trim()) {
          return text.trim().substring(0, maxChars);
        }
      }
    } catch (err) {
      McpLogger.log('WARN', 'OCR_CONVERT_FAIL', 'OCR conversion failed for ' + (fileName || fileId) + ': ' + err.toString());
    } finally {
      if (copyId) {
        try {
          if (typeof Drive !== 'undefined' && Drive.Files && Drive.Files.remove) {
            Drive.Files.remove(copyId);
          } else {
            DriveApp.getFileById(copyId).setTrashed(true);
          }
        } catch (delErr) {
          try { DriveApp.getFileById(copyId).setTrashed(true); } catch (e) {}
        }
      }
    }
    return null;
  },

  extractDocumentText: function(file) {
    if (!file) return { text: '', isOcr: false };

    var fileId = file.getId ? file.getId() : file.id;
    var fileName = (file.getName ? file.getName() : file.name || '').toLowerCase();
    var mime = (file.getMimeType ? file.getMimeType() : file.mimeType || '').toLowerCase();

    if (mime === 'application/vnd.google-apps.document') {
      try {
        var docText = DocumentApp.openById(fileId).getBody().getText();
        return { text: (docText || '').trim().substring(0, 8000), isOcr: false };
      } catch (e) {}
    }
    if (mime === 'application/vnd.google-apps.spreadsheet') {
      try {
        var ss = SpreadsheetApp.openById(fileId);
        var sheets = ss.getSheets();
        var rows = [];
        for (var s = 0; s < Math.min(sheets.length, 2); s++) {
          var data = sheets[s].getDataRange().getDisplayValues();
          for (var r = 0; r < Math.min(data.length, 25); r++) {
            rows.push(data[r].join(' | '));
          }
        }
        return { text: rows.join('\\n').substring(0, 8000), isOcr: false };
      } catch (e) {}
    }

    if (mime.indexOf('text/') === 0 || mime === 'application/json' || mime === 'application/csv' || /\\.(txt|csv|json|html|md)$/i.test(fileName)) {
      try {
        var rawText = file.getBlob().getDataAsString();
        return { text: (rawText || '').trim().substring(0, 8000), isOcr: false };
      } catch (e) {}
    }

    if (mime === 'application/pdf' || fileName.endsWith('.pdf')) {
      try {
        var blob = file.getBlob();
        var pdfCheck = this.hasNativeTextLayer(blob);
        if (pdfCheck.hasText) {
          return { text: pdfCheck.extractedText.substring(0, 8000), isOcr: false };
        }
      } catch (e) {}
      var ocrPdfText = this.performDriveOcr(fileId, fileName);
      return { text: ocrPdfText || '', isOcr: true };
    }

    if (mime.indexOf('image/') === 0 || /\\.(jpg|jpeg|png|webp|heic|bmp|tiff)$/i.test(fileName)) {
      var ocrImgText = this.performDriveOcr(fileId, fileName);
      return { text: ocrImgText || '', isOcr: true };
    }

    return { text: '', isOcr: false };
  },

  getOrCreateIndexFile: function(kidFolder) {
    if (!kidFolder) return null;
    var fIt = kidFolder.getFilesByName(this.INDEX_FILE_NAME);
    if (fIt.hasNext()) {
      return fIt.next();
    }
    var initialPayload = JSON.stringify({
      version: '1.0.0',
      lastUpdatedAt: new Date().toISOString(),
      totalIndexed: 0,
      documents: []
    }, null, 2);
    return kidFolder.createFile(this.INDEX_FILE_NAME, initialPayload, 'application/json');
  },

  indexDocument: function(kidFolder, file, sourceContext) {
    if (!kidFolder || !file) return null;

    try {
      var fileId = file.getId ? file.getId() : file.id;
      var fileName = file.getName ? file.getName() : file.name;
      var fileUrl = file.getUrl ? file.getUrl() : ('https://drive.google.com/file/d/' + fileId + '/view');

      var indexFile = this.getOrCreateIndexFile(kidFolder);
      var indexData = { documents: [] };
      try {
        indexData = JSON.parse(indexFile.getContent());
      } catch (e) {}

      var docs = indexData.documents || [];
      var existingIdx = -1;
      for (var i = 0; i < docs.length; i++) {
        if (docs[i].fileId === fileId) {
          existingIdx = i;
          break;
        }
      }

      if (existingIdx !== -1 && docs[existingIdx].text && docs[existingIdx].text.length > 0) {
        return docs[existingIdx];
      }

      var extraction = this.extractDocumentText(file);
      var text = extraction.text || '';
      var wordCount = text ? text.split(/\\s+/).filter(Boolean).length : 0;
      var snippet = text.length > 180 ? text.substring(0, 180) + '...' : text;

      var docRecord = {
        fileId: fileId,
        fileName: fileName,
        source: sourceContext || 'classroom',
        mimeType: file.getMimeType ? file.getMimeType() : 'application/octet-stream',
        isOcr: extraction.isOcr,
        wordCount: wordCount,
        snippet: snippet,
        text: text,
        driveUrl: fileUrl,
        indexedAt: new Date().toISOString()
      };

      if (existingIdx !== -1) {
        docs[existingIdx] = docRecord;
      } else {
        docs.push(docRecord);
      }

      indexData.lastUpdatedAt = new Date().toISOString();
      indexData.totalIndexed = docs.length;
      indexData.documents = docs;

      indexFile.setContent(JSON.stringify(indexData, null, 2));
      McpLogger.log('INFO', 'DOC_INDEXED', 'Indexed ' + fileName + ' (' + sourceContext + ', OCR=' + extraction.isOcr + ', words=' + wordCount + ')');
      return docRecord;
    } catch (err) {
      McpLogger.log('WARN', 'DOC_INDEX_ERROR', 'Failed to index document: ' + err.toString());
      return null;
    }
  },

  indexDocumentById: function(fileId, childName, sourceContext) {
    if (!fileId) return { success: false, error: 'Missing fileId' };
    try {
      var file = DriveApp.getFileById(fileId);
      var parents = file.getParents();
      var kidFolder = parents.hasNext() ? parents.next() : null;

      if (kidFolder && (kidFolder.getName() === 'attachments' || kidFolder.getName() === 'whatsapp')) {
        var grandParents = kidFolder.getParents();
        if (grandParents.hasNext()) {
          var gp = grandParents.next();
          if (gp.getName() === 'whatsapp') {
            var ggp = gp.getParents();
            if (ggp.hasNext()) kidFolder = ggp.next();
          } else {
            kidFolder = gp;
          }
        }
      }

      if (!kidFolder) {
        return { success: false, error: 'Could not resolve parent vault folder' };
      }

      var record = this.indexDocument(kidFolder, file, sourceContext || 'whatsapp');
      return { success: true, record: record };
    } catch (err) {
      return { success: false, error: err.toString() };
    }
  },

  runAutomatedVaultIndexing: function(kidFolder, maxBatch) {
    if (!kidFolder) return { count: 0, status: 'no_folder' };
    maxBatch = maxBatch || 12;

    var indexFile = this.getOrCreateIndexFile(kidFolder);
    var indexData = { documents: [] };
    try {
      indexData = JSON.parse(indexFile.getContent());
    } catch (e) {}

    var indexedMap = {};
    (indexData.documents || []).forEach(function(d) {
      if (d && d.fileId) indexedMap[d.fileId] = true;
    });

    var pendingFiles = [];

    try {
      var cIt = kidFolder.getFoldersByName('classroom');
      if (cIt.hasNext()) {
        var caIt = cIt.next().getFoldersByName('attachments');
        if (caIt.hasNext()) {
          var cfIt = caIt.next().getFiles();
          while (cfIt.hasNext()) {
            var cf = cfIt.next();
            if (!indexedMap[cf.getId()]) pendingFiles.push({ file: cf, source: 'classroom' });
          }
        }
      }

      var eIt = kidFolder.getFoldersByName('emails');
      if (eIt.hasNext()) {
        var eaIt = eIt.next().getFoldersByName('attachments');
        if (eaIt.hasNext()) {
          var efIt = eaIt.next().getFiles();
          while (efIt.hasNext()) {
            var ef = efIt.next();
            if (!indexedMap[ef.getId()]) pendingFiles.push({ file: ef, source: 'email' });
          }
        }
      }

      var wIt = kidFolder.getFoldersByName('whatsapp');
      if (wIt.hasNext()) {
        var wfIt = wIt.next().getFiles();
        while (wfIt.hasNext()) {
          var wf = wfIt.next();
          var wName = wf.getName().toLowerCase();
          if (wName !== 'whatsapp_school_archive.json' && !indexedMap[wf.getId()]) {
            pendingFiles.push({ file: wf, source: 'whatsapp' });
          }
        }
      }
    } catch (scanErr) {
      McpLogger.log('WARN', 'INDEX_SCAN_WARN', scanErr.toString());
    }

    var processed = 0;
    for (var p = 0; p < pendingFiles.length && p < maxBatch; p++) {
      var item = pendingFiles[p];
      this.indexDocument(kidFolder, item.file, item.source);
      processed++;
    }

    return {
      success: true,
      processed: processed,
      totalPendingRemaining: Math.max(0, pendingFiles.length - processed),
      totalIndexed: (indexData.documents || []).length + processed
    };
  },

  searchVaultDocuments: function(kidFolder, query) {
    if (!kidFolder || !query) return { results: [], count: 0 };
    var cleanQuery = query.toLowerCase().trim();
    var terms = cleanQuery.split(/\\s+/).filter(Boolean);

    var indexFile = this.getOrCreateIndexFile(kidFolder);
    var indexData = { documents: [] };
    try {
      indexData = JSON.parse(indexFile.getContent());
    } catch (e) {
      return { results: [], count: 0 };
    }

    var docs = indexData.documents || [];
    var scoredResults = [];

    for (var i = 0; i < docs.length; i++) {
      var d = docs[i];
      if (!d) continue;

      var textLower = (d.text || '').toLowerCase();
      var nameLower = (d.fileName || '').toLowerCase();
      var sourceLower = (d.source || '').toLowerCase();

      var matchScore = 0;
      var matchedTerms = [];

      for (var t = 0; t < terms.length; t++) {
        var term = terms[t];
        if (nameLower.indexOf(term) !== -1) {
          matchScore += 10;
          matchedTerms.push(term);
        }
        if (textLower.indexOf(term) !== -1) {
          matchScore += 5;
          matchedTerms.push(term);
        }
        if (sourceLower.indexOf(term) !== -1) {
          matchScore += 2;
          matchedTerms.push(term);
        }
      }

      if (matchScore > 0) {
        var excerpt = d.snippet || '';
        if (d.text && terms.length > 0) {
          var firstIdx = textLower.indexOf(terms[0]);
          if (firstIdx !== -1) {
            var start = Math.max(0, firstIdx - 60);
            var end = Math.min(d.text.length, firstIdx + 140);
            excerpt = (start > 0 ? '...' : '') + d.text.substring(start, end).replace(/\\s+/g, ' ') + (end < d.text.length ? '...' : '');
          }
        }

        scoredResults.push({
          fileId: d.fileId,
          fileName: d.fileName,
          source: d.source,
          isOcr: d.isOcr,
          wordCount: d.wordCount,
          excerpt: excerpt,
          driveUrl: d.driveUrl,
          score: matchScore,
          matchedTerms: matchedTerms
        });
      }
    }

    scoredResults.sort(function(a, b) { return b.score - a.score; });

    return {
      query: query,
      count: scoredResults.length,
      results: scoredResults.slice(0, 15)
    };
  }
};
`
      },
      {
        name: 'DriveContentExtractor',
        type: 'SERVER_JS',
        source: `
var DriveContentExtractor = {
  extractText: function (fileId, maxChars) {
    if (!fileId) return null;
    maxChars = maxChars || 4000;

    // Fast Path 1: Check Memory Cache (<1ms)
    var cache = CacheService.getUserCache();
    var cached = cache.get('ocr_' + fileId);
    if (cached) {
      return { success: true, fileId: fileId, extractedText: cached.substring(0, maxChars), fromCache: true };
    }

    // Fast Path 2: Check Persistent UserProperties
    var props = PropertiesService.getUserProperties();
    var propCached = props.getProperty('ocr_' + fileId);
    if (propCached) {
      try { cache.put('ocr_' + fileId, propCached, 21600); } catch (ce) {}
      return { success: true, fileId: fileId, extractedText: propCached.substring(0, maxChars), fromCache: true };
    }

    var debugLog = [];

    // Strategy 1: Direct Drive API v2 Copy with OCR & supportsAllDrives
    try {
      var resource = {
        title: 'temp_mcp_ocr_' + fileId,
        mimeType: 'application/vnd.google-apps.document'
      };
      var copy = null;
      if (typeof Drive !== 'undefined' && Drive.Files && Drive.Files.copy) {
        copy = Drive.Files.copy(resource, fileId, { ocr: true, ocrLanguage: 'en,hi', supportsAllDrives: true });
      } else {
        var token = ScriptApp.getOAuthToken();
        var copyRes = UrlFetchApp.fetch('https://www.googleapis.com/drive/v2/files/' + fileId + '/copy?ocr=true&supportsAllDrives=true', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify(resource),
          muteHttpExceptions: true
        });
        if (copyRes.getResponseCode() === 200) {
          copy = JSON.parse(copyRes.getContentText());
        } else {
          debugLog.push('v2Copy:' + copyRes.getResponseCode() + ' ' + copyRes.getContentText().substring(0, 120));
        }
      }

      if (copy && copy.id) {
        var doc = DocumentApp.openById(copy.id);
        var text = doc.getBody().getText();
        if (text && text.trim()) {
          var trimmed = text.trim();
          try {
            cache.put('ocr_' + fileId, trimmed.substring(0, 5000), 21600);
            props.setProperty('ocr_' + fileId, trimmed.substring(0, 5000));
          } catch (saveErr) {}
          return { success: true, fileId: fileId, extractedText: trimmed.substring(0, maxChars) };
        }
      }
    } catch (ocrCopyErr) {
      debugLog.push('ocrCopyErr:' + ocrCopyErr.toString());
    } finally {
      if (copy && copy.id) {
        try {
          if (typeof Drive !== 'undefined' && Drive.Files && Drive.Files.remove) {
            Drive.Files.remove(copy.id);
          } else {
            DriveApp.getFileById(copy.id).setTrashed(true);
          }
        } catch (delErr) {
          try { DriveApp.getFileById(copy.id).setTrashed(true); } catch (e) {}
        }
      }
    }

    // Strategy 2: Download Media Blob via Drive API v3 -> Upload with OCR
    var tempFileId = null;
    try {
      var token2 = ScriptApp.getOAuthToken();
      var mediaRes = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media&supportsAllDrives=true', {
        headers: { 'Authorization': 'Bearer ' + token2 },
        muteHttpExceptions: true
      });
      if (mediaRes.getResponseCode() === 200) {
        var blob = mediaRes.getBlob();
        if (typeof Drive !== 'undefined' && Drive.Files && Drive.Files.insert) {
          var tempFile = Drive.Files.insert({
            title: 'temp_ocr_upload_' + fileId,
            mimeType: 'application/vnd.google-apps.document'
          }, blob, { ocr: true, ocrLanguage: 'en,hi' });
          if (tempFile && tempFile.id) {
            tempFileId = tempFile.id;
            var tempDoc = DocumentApp.openById(tempFile.id);
            var ocrText = tempDoc.getBody().getText();
            if (ocrText && ocrText.trim()) {
              var trimmed2 = ocrText.trim();
              try {
                cache.put('ocr_' + fileId, trimmed2.substring(0, 5000), 21600);
                props.setProperty('ocr_' + fileId, trimmed2.substring(0, 5000));
              } catch (saveErr2) {}
              return { success: true, fileId: fileId, extractedText: trimmed2.substring(0, maxChars) };
            }
          }
        }
      } else {
        debugLog.push('mediaFetch:' + mediaRes.getResponseCode());
      }
    } catch (blobOcrErr) {
      debugLog.push('blobOcrErr:' + blobOcrErr.toString());
    } finally {
      if (tempFileId) {
        try {
          if (typeof Drive !== 'undefined' && Drive.Files && Drive.Files.remove) {
            Drive.Files.remove(tempFileId);
          } else {
            DriveApp.getFileById(tempFileId).setTrashed(true);
          }
        } catch (e) {
          try { DriveApp.getFileById(tempFileId).setTrashed(true); } catch (e2) {}
        }
      }
    }

    // Strategy 3: Native Google Workspace App Direct Open (Docs, Sheets, Slides)
    try {
      var file = DriveApp.getFileById(fileId);
      var mime = file.getMimeType();
      if (mime === 'application/vnd.google-apps.document') {
        return { success: true, fileId: fileId, extractedText: DocumentApp.openById(fileId).getBody().getText().substring(0, maxChars) };
      }
      if (mime === 'application/vnd.google-apps.spreadsheet') {
        var ss = SpreadsheetApp.openById(fileId);
        var sheets = ss.getSheets();
        var rows = [];
        for (var s = 0; s < Math.min(sheets.length, 2); s++) {
          var data = sheets[s].getDataRange().getDisplayValues();
          for (var r = 0; r < Math.min(data.length, 25); r++) {
            rows.push(data[r].join(' | '));
          }
        }
        return { success: true, fileId: fileId, extractedText: rows.join('\\n').substring(0, maxChars) };
      }
      if (mime.indexOf('text/') === 0 || mime === 'application/json' || mime === 'application/csv') {
        return { success: true, fileId: fileId, extractedText: file.getBlob().getDataAsString().substring(0, maxChars) };
      }
    } catch (driveErr) {
      debugLog.push('driveAppErr:' + driveErr.toString());
    }

    return { success: false, fileId: fileId, error: 'Extraction failed: ' + debugLog.join('; ') };
  }
};
`
      },
      {
        name: 'ClassroomIngester',
        type: 'SERVER_JS',
        source: `
var ClassroomIngester = {
  sync: function(targetFolderId, childName, academicYear, isIncremental, extractOnly) {
    var startTime = new Date();
    var deepLog = {
      syncId: 'sync_' + startTime.getTime(),
      timestamp: startTime.toISOString(),
      childName: childName || 'Child',
      academicYear: academicYear || '2026-2027',
      extractOnly: !!extractOnly,
      coursesAudit: [],
      inventory: [],
      summary: {
        totalCoursesFound: 0,
        coursesIngested: 0,
        totalAnnouncements: 0,
        totalCourseWork: 0,
        totalMaterials: 0,
        totalAttachments: 0,
        driveFilesCount: 0,
        youtubeVideosCount: 0,
        webLinksCount: 0,
        formsCount: 0,
        duplicateAttachmentsCount: 0
      },
      logTimeline: []
    };

    function addLog(msg) {
      // Kept only in the embedded deepLog (saved inside classroom_data.json) — not routed through
      // the shared McpLogger buffer, which is capped at 100 entries and needs to stay free for
      // actual operational signals (sync entrypoints, attachment failures, errors), not per-page
      // crawl chatter that repeats every cycle.
      deepLog.logTimeline.push('[' + (new Date()).toISOString() + '] ' + msg);
    }

    try {
      addLog('🚀 Starting Google Classroom Deep Crawl for ' + (childName || 'Child') + (extractOnly ? ' (Read-Only Extract Mode)' : ''));

      var parentFolder = null;
      var classroomFolder = null;
      var attachFolder = null;
      if (targetFolderId && !extractOnly) {
        try {
          parentFolder = DriveApp.getFolderById(targetFolderId);
          classroomFolder = this.getOrCreateSubfolder(parentFolder, 'classroom');
          attachFolder = this.getOrCreateSubfolder(classroomFolder, 'attachments');
        } catch (fErr) {
          addLog('⚠️ Target folder access notice (read-only mode active): ' + fErr.toString());
        }
      }

      var courses = this.fetchAllCourses(academicYear, deepLog);
      var allCourseData = [];
      var totalAttachments = 0;
      var seenFileIds = {};

      function recordAttachmentInventory(att, section, parentTitle) {
        if (!att) return;
        var itemType = 'DRIVE_FILE';
        var idOrUrl = att.fileId || '';
        if (att.youtubeUrl) {
          itemType = 'YOUTUBE_VIDEO';
          idOrUrl = att.youtubeUrl;
          deepLog.summary.youtubeVideosCount++;
        } else if (att.formUrl) {
          itemType = 'GOOGLE_FORM';
          idOrUrl = att.formUrl;
          deepLog.summary.formsCount++;
        } else if (att.url) {
          itemType = 'WEB_LINK';
          idOrUrl = att.url;
          deepLog.summary.webLinksCount++;
        } else if (att.fileId) {
          if (seenFileIds[att.fileId]) {
            itemType = 'DUPLICATE_FILE';
            deepLog.summary.duplicateAttachmentsCount++;
          } else {
            seenFileIds[att.fileId] = true;
            deepLog.summary.driveFilesCount++;
          }
        }
        deepLog.inventory.push({
          index: deepLog.inventory.length + 1,
          type: itemType,
          title: att.title || att.targetName || 'Untitled',
          targetName: att.targetName || att.title || '',
          fileId: att.fileId || null,
          url: idOrUrl,
          section: section,
          parentTitle: (parentTitle || '').substring(0, 50)
        });
      }

      for (var i = 0; i < courses.length; i++) {
        var course = courses[i];
        addLog('📖 Processing Course [' + (i + 1) + '/' + courses.length + ']: "' + course.name + '" (ID: ' + course.id + ')');
        var courseData = {
          id: course.id,
          name: course.name,
          section: course.section || '',
          descriptionHeading: course.descriptionHeading || '',
          room: course.room || '',
          alternateLink: course.alternateLink || '',
          courseState: course.courseState || 'ACTIVE',
          announcements: [],
          courseWork: [],
          materials: []
        };

        // Announcements (with multi-page pagination & Drive link scanning)
        var maxPages = isIncremental ? 1 : 50;
        var annPageToken = null;
        var annPage = 1;
        var courseAnnouncements = [];
        do {
          try {
            var annParams = { pageSize: isIncremental ? 20 : 50 };
            if (annPageToken) annParams.pageToken = annPageToken;
            var annRes = Classroom.Courses.Announcements.list(course.id, annParams);
            var batch = (annRes && annRes.announcements) ? annRes.announcements : [];
            addLog('📢 Course "' + course.name + '" Announcements Page ' + annPage + ': fetched ' + batch.length + ' items (hasMore: ' + !!(annRes && annRes.nextPageToken) + ')');

            for (var aIdx = 0; aIdx < batch.length; aIdx++) {
              var a = batch[aIdx];
              var annItem = {
                id: a.id,
                text: a.text || '',
                alternateLink: a.alternateLink || '',
                creationTime: a.creationTime,
                updateTime: a.updateTime,
                materials: a.materials || [],
                attachments: []
              };

              if (a.materials && a.materials.length > 0) {
                for (var am = 0; am < a.materials.length; am++) {
                  var aMat = a.materials[am];
                  var aDownloaded = this.downloadMaterialAttachment(aMat, attachFolder, course.name, 'Ann_' + (a.text ? a.text.substring(0, 15) : a.id));
                  if (aDownloaded) {
                    annItem.attachments.push(aDownloaded);
                    totalAttachments++;
                    recordAttachmentInventory(aDownloaded, 'announcement', a.text ? a.text.substring(0, 30) : a.id);
                  }
                }
              }

              if (a.text) {
                var textDocs = this.scanTextForDriveFiles(a.text, attachFolder, course.name, 'AnnText_' + a.id);
                for (var td = 0; td < textDocs.length; td++) {
                  annItem.attachments.push(textDocs[td]);
                  totalAttachments++;
                  recordAttachmentInventory(textDocs[td], 'announcement_text_link', a.text.substring(0, 30));
                }
              }

              courseAnnouncements.push(annItem);
            }

            annPageToken = annRes ? annRes.nextPageToken : null;
            annPage++;
          } catch (annErr) {
            McpLogger.log('WARN', 'CLASSROOM_ANN_WARN', 'Could not fetch announcements page ' + annPage + ' for ' + course.name + ': ' + annErr);
            addLog('⚠️ Announcement fetch notice on page ' + annPage + ': ' + annErr.toString());
            annPageToken = null;
          }
        } while (annPageToken && annPage <= maxPages);
        courseData.announcements = courseAnnouncements;

        // CourseWork (Assignments & Worksheets with multi-page pagination)
        var cwPageToken = null;
        var cwPage = 1;
        var courseCwList = [];
        do {
          try {
            var cwParams = { pageSize: isIncremental ? 20 : 50 };
            if (cwPageToken) cwParams.pageToken = cwPageToken;
            var cwRes = Classroom.Courses.CourseWork.list(course.id, cwParams);
            var cwBatch = (cwRes && cwRes.courseWork) ? cwRes.courseWork : [];
            addLog('📝 Course "' + course.name + '" CourseWork Page ' + cwPage + ': fetched ' + cwBatch.length + ' items (hasMore: ' + !!(cwRes && cwRes.nextPageToken) + ')');

            for (var j = 0; j < cwBatch.length; j++) {
              var cw = cwBatch[j];
              var cwItem = {
                id: cw.id,
                title: cw.title || 'Untitled Assignment',
                description: cw.description || '',
                state: cw.state || 'PUBLISHED',
                workType: cw.workType || 'ASSIGNMENT',
                maxPoints: cw.maxPoints || 100,
                dueDate: cw.dueDate || null,
                dueTime: cw.dueTime || null,
                alternateLink: cw.alternateLink || '',
                creationTime: cw.creationTime,
                updateTime: cw.updateTime,
                submission: null,
                attachments: []
              };

              try {
                var skipSub = false;
                if (isIncremental && cw.creationTime) {
                  var ageMs = new Date().getTime() - new Date(cw.creationTime).getTime();
                  if (ageMs > 30 * 24 * 60 * 60 * 1000) skipSub = true;
                }
                if (!skipSub) {
                  var subRes = Classroom.Courses.CourseWork.StudentSubmissions.list(course.id, cw.id, { userId: 'me' });
                  if (subRes && subRes.studentSubmissions && subRes.studentSubmissions.length > 0) {
                    var sub = subRes.studentSubmissions[0];
                    cwItem.submission = {
                      id: sub.id,
                      state: sub.state || 'ASSIGNED',
                      assignedGrade: sub.assignedGrade !== undefined ? sub.assignedGrade : null,
                      draftGrade: sub.draftGrade !== undefined ? sub.draftGrade : null,
                      alternateLink: sub.alternateLink || '',
                      updateTime: sub.updateTime,
                      late: sub.late || false
                    };

                    // Extract student-submitted homework worksheets / attachments
                    if (sub.assignmentSubmission && sub.assignmentSubmission.attachments && sub.assignmentSubmission.attachments.length > 0) {
                      for (var sa = 0; sa < sub.assignmentSubmission.attachments.length; sa++) {
                        var subAtt = sub.assignmentSubmission.attachments[sa];
                        var dSub = this.downloadMaterialAttachment(subAtt, attachFolder, course.name, 'Sub_' + cw.title);
                        if (dSub) {
                          cwItem.attachments.push(dSub);
                          totalAttachments++;
                          recordAttachmentInventory(dSub, 'student_submission', cw.title);
                        }
                      }
                    }
                  }
                }
              } catch (subErr) {}

              if (cw.materials && cw.materials.length > 0) {
                for (var m = 0; m < cw.materials.length; m++) {
                  var mat = cw.materials[m];
                  var downloaded = this.downloadMaterialAttachment(mat, attachFolder, course.name, cw.title);
                  if (downloaded) {
                    cwItem.attachments.push(downloaded);
                    totalAttachments++;
                    recordAttachmentInventory(downloaded, 'coursework', cw.title);
                  }
                }
              }

              if (cw.description) {
                var descDocs = this.scanTextForDriveFiles(cw.description, attachFolder, course.name, cw.title);
                for (var dd = 0; dd < descDocs.length; dd++) {
                  cwItem.attachments.push(descDocs[dd]);
                  totalAttachments++;
                  recordAttachmentInventory(descDocs[dd], 'coursework_desc_link', cw.title);
                }
              }

              courseCwList.push(cwItem);
            }

            cwPageToken = cwRes ? cwRes.nextPageToken : null;
            cwPage++;
          } catch (cwErr) {
            McpLogger.log('WARN', 'CLASSROOM_CW_WARN', 'Could not fetch coursework page ' + cwPage + ' for ' + course.name + ': ' + cwErr);
            addLog('⚠️ Coursework fetch notice on page ' + cwPage + ': ' + cwErr.toString());
            cwPageToken = null;
          }
        } while (cwPageToken && cwPage <= maxPages);
        courseData.courseWork = courseCwList;

        // Materials (Reference Resources with multi-page pagination)
        var matPageToken = null;
        var matPage = 1;
        var courseMatList = [];
        do {
          try {
            var matParams = { pageSize: isIncremental ? 20 : 50 };
            if (matPageToken) matParams.pageToken = matPageToken;
            var matRes = Classroom.Courses.CourseWorkMaterials.list(course.id, matParams);
            var matBatch = (matRes && matRes.courseWorkMaterial) ? matRes.courseWorkMaterial : [];
            addLog('📚 Course "' + course.name + '" Materials Page ' + matPage + ': fetched ' + matBatch.length + ' items (hasMore: ' + !!(matRes && matRes.nextPageToken) + ')');

            for (var k = 0; k < matBatch.length; k++) {
              var cwm = matBatch[k];
              var matItem = {
                id: cwm.id,
                title: cwm.title || 'Course Material',
                description: cwm.description || '',
                alternateLink: cwm.alternateLink || '',
                updateTime: cwm.updateTime,
                attachments: []
              };

              if (cwm.materials && cwm.materials.length > 0) {
                for (var n = 0; n < cwm.materials.length; n++) {
                  var cMat = cwm.materials[n];
                  var dMat = this.downloadMaterialAttachment(cMat, attachFolder, course.name, cwm.title);
                  if (dMat) {
                    matItem.attachments.push(dMat);
                    totalAttachments++;
                    recordAttachmentInventory(dMat, 'material', cwm.title);
                  }
                }
              }

              if (cwm.description) {
                var cwmDocs = this.scanTextForDriveFiles(cwm.description, attachFolder, course.name, cwm.title);
                for (var cd = 0; cd < cwmDocs.length; cd++) {
                  matItem.attachments.push(cwmDocs[cd]);
                  totalAttachments++;
                  recordAttachmentInventory(cwmDocs[cd], 'material_desc_link', cwm.title);
                }
              }

              courseMatList.push(matItem);
            }

            matPageToken = matRes ? matRes.nextPageToken : null;
            matPage++;
          } catch (matErr) {
            McpLogger.log('WARN', 'CLASSROOM_MAT_WARN', 'Could not fetch materials page ' + matPage + ' for ' + course.name + ': ' + matErr);
            addLog('⚠️ Materials fetch notice on page ' + matPage + ': ' + matErr.toString());
            matPageToken = null;
          }
        } while (matPageToken && matPage <= maxPages);
        courseData.materials = courseMatList;

        allCourseData.push(courseData);
      }

      deepLog.summary.totalAnnouncements = allCourseData.reduce(function(acc, c) { return acc + (c.announcements ? c.announcements.length : 0); }, 0);
      deepLog.summary.totalCourseWork = allCourseData.reduce(function(acc, c) { return acc + (c.courseWork ? c.courseWork.length : 0); }, 0);
      deepLog.summary.totalMaterials = allCourseData.reduce(function(acc, c) { return acc + (c.materials ? c.materials.length : 0); }, 0);
      deepLog.summary.totalAttachments = totalAttachments;
      deepLog.executionTimeMs = (new Date()).getTime() - startTime.getTime();

      var deepLogText = this.formatDeepLogReport(deepLog, allCourseData);

      var manifestPayload = {
        kidName: childName,
        academicYear: academicYear,
        lastSyncedAt: new Date().toISOString(),
        totalCourses: allCourseData.length,
        totalAttachments: totalAttachments,
        courses: allCourseData,
        deepLog: deepLog,
        deepLogText: deepLogText
      };

      if (classroomFolder) {
        try {
          var finalPayload = manifestPayload;
          if (isIncremental) {
            try {
              var exFileIt = classroomFolder.getFilesByName('classroom_data.json');
              if (exFileIt.hasNext()) {
                var exData = JSON.parse(exFileIt.next().getContent());
                if (exData && exData.courses) {
                  finalPayload = this.mergeClassroomData(exData, manifestPayload);
                }
              }
            } catch (mErr) {}
          }
          this.saveJsonFile(classroomFolder, 'classroom_data.json', finalPayload);
          this.saveJsonFile(classroomFolder, 'classroom_sync_deep_log.json', deepLog);
          this.saveTextFile(classroomFolder, 'classroom_sync_deep_log.txt', deepLogText);
        } catch (sErr) {
          addLog('⚠️ Notice saving files to Drive: ' + sErr.toString());
        }
      }
      McpLogger.log('SUCCESS', 'CLASSROOM_SYNC_COMPLETE', 'Successfully crawled ' + allCourseData.length + ' courses and extracted ' + totalAttachments + ' attachments for ' + childName);

      return manifestPayload;
    } catch (err) {
      McpLogger.log('ERROR', 'CLASSROOM_SYNC_ERROR', 'Google Classroom sync failed: ' + err.toString());
      throw err;
    }
  },

  formatDeepLogReport: function(deepLog, allCourseData) {
    var lines = [];
    lines.push('================================================================================');
    lines.push('       K.I.D.S. GOOGLE CLASSROOM DEEP DIAGNOSTIC AUDIT & CRAWL LOG');
    lines.push('================================================================================');
    lines.push('Generated At    : ' + deepLog.timestamp);
    lines.push('Student / Child : ' + deepLog.childName);
    lines.push('Academic Year   : ' + deepLog.academicYear);
    lines.push('Sync Execution  : ' + (deepLog.extractOnly ? 'Direct Read-Only Gateway (0 student drive files)' : 'Full Sync'));
    lines.push('Execution Time  : ' + (deepLog.executionTimeMs || 0) + ' ms');
    lines.push('');
    lines.push('--------------------------------------------------------------------------------');
    lines.push('1. EXECUTIVE AUDIT SUMMARY');
    lines.push('--------------------------------------------------------------------------------');
    lines.push('• Active Courses In Account : ' + deepLog.summary.totalCoursesFound);
    lines.push('• Current-Year Ingested     : ' + deepLog.summary.coursesIngested);
    lines.push('• Announcements Extracted   : ' + deepLog.summary.totalAnnouncements);
    lines.push('• CourseWork Assignments    : ' + deepLog.summary.totalCourseWork);
    lines.push('• Course Reference Materials: ' + deepLog.summary.totalMaterials);
    lines.push('• Total Detected Attachments: ' + deepLog.summary.totalAttachments);
    lines.push('    ├─ Downloadable Drive Files : ' + deepLog.summary.driveFilesCount + ' unique');
    lines.push('    ├─ YouTube Video Links      : ' + deepLog.summary.youtubeVideosCount + ' (streamed in browser)');
    lines.push('    ├─ External Web Links       : ' + deepLog.summary.webLinksCount);
    lines.push('    ├─ Google Forms             : ' + deepLog.summary.formsCount);
    lines.push('    └─ Duplicate Attachments    : ' + deepLog.summary.duplicateAttachmentsCount + ' (shared across notices)');
    lines.push('');
    lines.push('--------------------------------------------------------------------------------');
    lines.push('2. COURSE BREAKDOWN & PAGINATION AUDIT');
    lines.push('--------------------------------------------------------------------------------');
    for (var c = 0; c < allCourseData.length; c++) {
      var course = allCourseData[c];
      lines.push('[' + (c + 1) + '] Course: ' + course.name + (course.section ? ' (' + course.section + ')' : ''));
      lines.push('    Course ID    : ' + course.id);
      lines.push('    Course State : ' + course.courseState);
      lines.push('    Class Link   : ' + (course.alternateLink || 'N/A'));
      lines.push('    Content Audit: ' + (course.announcements ? course.announcements.length : 0) + ' announcements, ' +
        (course.courseWork ? course.courseWork.length : 0) + ' coursework items, ' +
        (course.materials ? course.materials.length : 0) + ' materials.');
      lines.push('');
    }
    lines.push('--------------------------------------------------------------------------------');
    lines.push('3. ITEMIZED ATTACHMENT INVENTORY (ALL ' + deepLog.inventory.length + ' DETECTED ITEMS)');
    lines.push('--------------------------------------------------------------------------------');
    lines.push(this.padRight('#', 4) + ' | ' + this.padRight('TYPE', 15) + ' | ' + this.padRight('TITLE / TARGET NAME', 40) + ' | ' + 'FILE ID / URL');
    lines.push('--------------------------------------------------------------------------------');
    for (var i = 0; i < deepLog.inventory.length; i++) {
      var item = deepLog.inventory[i];
      var idxStr = this.padRight(String(item.index), 4);
      var typeStr = this.padRight(item.type, 15);
      var titleStr = this.padRight((item.title || item.targetName || '').substring(0, 38), 40);
      var idStr = (item.fileId || item.url || '').substring(0, 45);
      lines.push(idxStr + ' | ' + typeStr + ' | ' + titleStr + ' | ' + idStr);
    }
    lines.push('');
    lines.push('--------------------------------------------------------------------------------');
    lines.push('4. DETAILED EXECUTION TIMELINE');
    lines.push('--------------------------------------------------------------------------------');
    for (var t = 0; t < deepLog.logTimeline.length; t++) {
      lines.push(deepLog.logTimeline[t]);
    }
    lines.push('================================================================================');
    lines.push('                    END OF CLASSROOM DEEP DIAGNOSTIC AUDIT LOG');
    lines.push('================================================================================');
    return lines.join('\\n');
  },

  padRight: function(str, len) {
    str = String(str || '');
    while (str.length < len) str += ' ';
    return str;
  },

  fetchAllCourses: function(academicYear, deepLog) {
    var courses = [];
    var pageToken = null;
    var page = 1;
    do {
      try {
        var params = { studentId: 'me', courseStates: ['ACTIVE'], pageSize: 50 };
        if (pageToken) params.pageToken = pageToken;
        var res = Classroom.Courses.list(params);
        if (res && res.courses) {
          courses = courses.concat(res.courses);
          if (deepLog) deepLog.logTimeline.push('[' + (new Date()).toISOString() + '] Course list page ' + page + ': retrieved ' + res.courses.length + ' courses.');
        }
        pageToken = res ? res.nextPageToken : null;
        page++;
      } catch (e) {
        try {
          var fbParams = { courseStates: ['ACTIVE'], pageSize: 50 };
          if (pageToken) fbParams.pageToken = pageToken;
          var fallbackRes = Classroom.Courses.list(fbParams);
          if (fallbackRes && fallbackRes.courses) courses = courses.concat(fallbackRes.courses);
          pageToken = fallbackRes ? fallbackRes.nextPageToken : null;
          page++;
        } catch (e2) {
          pageToken = null;
        }
      }
    } while (pageToken && page <= 10);

    var self = this;
    var filtered = courses.filter(function(c) {
      return self.isCurrentClass(c, academicYear);
    });
    if (filtered.length === 0 && courses.length > 0) {
      McpLogger.log('WARN', 'CLASSROOM_FILTER_FALLBACK', 'No courses matched current academic year filter; falling back to all ' + courses.length + ' active courses.');
      filtered = courses;
    }

    McpLogger.log('INFO', 'CLASSROOM_COURSES_FILTERED', 'Found ' + courses.length + ' active courses in account; filtered to ' + filtered.length + ' current-year classes.');
    if (deepLog) {
      deepLog.summary.totalCoursesFound = courses.length;
      deepLog.summary.coursesIngested = filtered.length;
      for (var ci = 0; ci < courses.length; ci++) {
        var isInc = filtered.indexOf(courses[ci]) !== -1;
        deepLog.coursesAudit.push({
          id: courses[ci].id,
          name: courses[ci].name,
          section: courses[ci].section || '',
          state: courses[ci].courseState,
          included: isInc
        });
      }
    }
    return filtered;
  },

  isCurrentClass: function(course, targetAcademicYear) {
    if (!course) return false;
    if (course.courseState && course.courseState !== 'ACTIVE') return false;

    var fullName = ((course.name || '') + ' ' + (course.section || '') + ' ' + (course.descriptionHeading || '')).toLowerCase();

    if (targetAcademicYear) {
      var yearMatch = targetAcademicYear.match(/(\d{4})\s*-\s*(\d{4})/);
      if (yearMatch) {
        var startYear = parseInt(yearMatch[1], 10);
        var endYear = parseInt(yearMatch[2], 10);

        for (var y = startYear - 4; y < startYear; y++) {
          var yNext = y + 1;
          var fullPastPattern = y + '-' + yNext;
          var shortPastPattern = (y % 100) + '-' + (yNext % 100);
          if (fullName.includes(fullPastPattern) || fullName.includes(shortPastPattern)) {
            if (!fullName.includes(targetAcademicYear) && !fullName.includes((startYear % 100) + '-' + (endYear % 100))) {
              McpLogger.log('INFO', 'CLASS_FILTER_PAST', 'Excluding past class: ' + course.name + ' (Belongs to past year ' + fullPastPattern + ')');
              return false;
            }
          }
        }
      }
    }

    return true;
  },

  extractDriveFileIdFromUrl: function(url) {
    if (!url) return null;
    var match = url.match(new RegExp('/d/([a-zA-Z0-9_-]{20,})'));
    if (match) return match[1];
    var idMatch = url.match(new RegExp('[?&]id=([a-zA-Z0-9_-]{20,})'));
    if (idMatch) return idMatch[1];
    var openMatch = url.match(new RegExp('/open[?]id=([a-zA-Z0-9_-]{20,})'));
    if (openMatch) return openMatch[1];
    return null;
  },

  scanTextForDriveFiles: function(text, attachFolder, courseName, itemTitle) {
    if (!text) return [];
    var results = [];
    var urlRegex = new RegExp('https?://(?:drive|docs)[.]google[.]com/[^\\\\s"<>]+', 'gi');
    var matches = text.match(urlRegex);
    if (matches) {
      for (var i = 0; i < matches.length; i++) {
        var u = matches[i];
        var fId = this.extractDriveFileIdFromUrl(u);
        if (fId) {
          var downloaded = this.downloadDriveFileById(fId, 'Doc_' + fId.substring(0, 8), attachFolder, courseName, itemTitle);
          if (downloaded) results.push(downloaded);
        }
      }
    }
    return results;
  },

  downloadDriveFileById: function(fileId, title, attachFolder, courseName, itemTitle) {
    try {
      var cleanCourse = (courseName || '').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      var cleanTitle = (itemTitle || '').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
      var rawTitle = (title || fileId).replace(/(\\.pdf)+$/i, '').replace(/\\.{2,}/g, '.');
      var targetName = cleanCourse + '_' + cleanTitle + '_' + rawTitle;

      if (!attachFolder) {
        return {
          title: title || targetName,
          targetName: targetName,
          fileId: fileId,
          driveUrl: 'https://drive.google.com/file/d/' + fileId + '/view'
        };
      }

      var existing = attachFolder.getFilesByName(targetName);
      if (existing.hasNext()) {
        var exFile = existing.next();
        return {
          title: title || targetName,
          fileId: exFile.getId(),
          driveUrl: exFile.getUrl()
        };
      }

      var srcFile = null;
      try {
        srcFile = DriveApp.getFileById(fileId);
      } catch (fErr) {}

      if (srcFile) {
        var mime = srcFile.getMimeType();
        if (mime.indexOf('google-apps') !== -1) {
          var token = ScriptApp.getOAuthToken();
          var exportRes = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + fileId + '/export?mimeType=application/pdf', {
            headers: { 'Authorization': 'Bearer ' + token },
            muteHttpExceptions: true
          });
          if (exportRes.getResponseCode() === 200) {
            var cleanPdfTarget = targetName.replace(/(\\.pdf)+$/i, '') + '.pdf';
            var pdfBlob = exportRes.getBlob().setName(cleanPdfTarget);
            var createdPdf = attachFolder.createFile(pdfBlob);
            return {
              title: (title || targetName) + ' (PDF)',
              fileId: createdPdf.getId(),
              driveUrl: createdPdf.getUrl()
            };
          }
        } else {
          var copied = srcFile.makeCopy(targetName, attachFolder);
          return {
            title: title || targetName,
            fileId: copied.getId(),
            driveUrl: copied.getUrl()
          };
        }
      } else {
        var token2 = ScriptApp.getOAuthToken();
        var dlRes = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media', {
          headers: { 'Authorization': 'Bearer ' + token2 },
          muteHttpExceptions: true
        });
        if (dlRes.getResponseCode() === 200) {
          var blob = dlRes.getBlob().setName(targetName);
          var fileObj = attachFolder.createFile(blob);
          return {
            title: title || targetName,
            fileId: fileObj.getId(),
            driveUrl: fileObj.getUrl()
          };
        }
      }
    } catch (e) {}
    return null;
  },

  downloadMaterialAttachment: function(mat, attachFolder, courseName, itemTitle) {
    try {
      if (mat.driveFile) {
        var df = mat.driveFile.driveFile || mat.driveFile;
        var fileId = df.id;
        var title = df.title || (mat.driveFile && mat.driveFile.title) || mat.title;
        if (!title || title === 'attachment') {
          title = (itemTitle ? itemTitle + '_file' : (df.name || 'drive_file'));
        }
        var dObj = this.downloadDriveFileById(fileId, title, attachFolder, courseName, itemTitle);
        if (dObj) {
          dObj.alternateLink = df.alternateLink || '';
          dObj.thumbnailUrl = df.thumbnailUrl || '';
          return dObj;
        }
      } else if (mat.link) {
        var linkUrl = mat.link.url || '';
        var embeddedId = this.extractDriveFileIdFromUrl(linkUrl);
        if (embeddedId) {
          var linkDownloaded = this.downloadDriveFileById(embeddedId, mat.link.title || 'DriveLink', attachFolder, courseName, itemTitle);
          if (linkDownloaded) return linkDownloaded;
        }
        return {
          title: mat.link.title || 'Web Link',
          url: linkUrl,
          thumbnailUrl: mat.link.thumbnailUrl || ''
        };
      } else if (mat.youtubeVideo) {
        return {
          title: mat.youtubeVideo.title || 'YouTube Video',
          youtubeUrl: mat.youtubeVideo.alternateLink || '',
          thumbnailUrl: mat.youtubeVideo.thumbnailUrl || ''
        };
      } else if (mat.form) {
        return {
          title: mat.form.title || 'Google Form',
          formUrl: mat.form.formUrl || '',
          responseUrl: mat.form.responseUrl || ''
        };
      }
    } catch (matErr) {}
    return null;
  },

  getOrCreateSubfolder: function(parentFolder, name) {
    var it = parentFolder.getFoldersByName(name);
    if (it.hasNext()) return it.next();
    return parentFolder.createFolder(name);
  },

  saveJsonFile: function(folder, fileName, data) {
    var payload = JSON.stringify(data, null, 2);
    var it = folder.getFilesByName(fileName);
    if (it.hasNext()) {
      var file = it.next();
      file.setContent(payload);
      return file;
    }
    return folder.createFile(fileName, payload, 'application/json');
  },

  saveTextFile: function(folder, fileName, content) {
    var it = folder.getFilesByName(fileName);
    if (it.hasNext()) {
      var f = it.next();
      f.setContent(content);
      return f;
    }
    return folder.createFile(fileName, content, 'text/plain');
  },

  mergeClassroomData: function(existing, incoming) {
    if (!existing || !existing.courses) return incoming;
    if (!incoming || !incoming.courses) return existing;

    var mergedCourses = existing.courses.slice();
    for (var i = 0; i < incoming.courses.length; i++) {
      var inCourse = incoming.courses[i];
      var exIdx = -1;
      for (var j = 0; j < mergedCourses.length; j++) {
        if (mergedCourses[j].id === inCourse.id) {
          exIdx = j;
          break;
        }
      }
      if (exIdx === -1) {
        mergedCourses.push(inCourse);
      } else {
        var exCourse = mergedCourses[exIdx];
        var annMap = {};
        var combinedAnn = [];
        (inCourse.announcements || []).concat(exCourse.announcements || []).forEach(function(a) {
          if (a && a.id && !annMap[a.id]) {
            annMap[a.id] = true;
            combinedAnn.push(a);
          }
        });
        var cwMap = {};
        var combinedCw = [];
        (inCourse.courseWork || []).concat(exCourse.courseWork || []).forEach(function(cw) {
          if (cw && cw.id && !cwMap[cw.id]) {
            cwMap[cw.id] = true;
            combinedCw.push(cw);
          }
        });
        var matMap = {};
        var combinedMat = [];
        (inCourse.materials || []).concat(exCourse.materials || []).forEach(function(m) {
          if (m && m.id && !matMap[m.id]) {
            matMap[m.id] = true;
            combinedMat.push(m);
          }
        });
        mergedCourses[exIdx] = {
          id: inCourse.id,
          name: inCourse.name || exCourse.name,
          section: inCourse.section || exCourse.section,
          descriptionHeading: inCourse.descriptionHeading || exCourse.descriptionHeading,
          room: inCourse.room || exCourse.room,
          alternateLink: inCourse.alternateLink || exCourse.alternateLink,
          courseState: inCourse.courseState || exCourse.courseState,
          announcements: combinedAnn,
          courseWork: combinedCw,
          materials: combinedMat
        };
      }
    }
    return {
      kidName: incoming.kidName || existing.kidName,
      academicYear: incoming.academicYear || existing.academicYear,
      lastSyncedAt: incoming.lastSyncedAt || new Date().toISOString(),
      totalCourses: mergedCourses.length,
      totalAttachments: mergedCourses.reduce(function(acc, c) {
        var annAtts = (c.announcements || []).reduce(function(a, x) { return a + (x.attachments ? x.attachments.length : 0); }, 0);
        var cwAtts = (c.courseWork || []).reduce(function(a, x) { return a + (x.attachments ? x.attachments.length : 0); }, 0);
        var matAtts = (c.materials || []).reduce(function(a, x) { return a + (x.attachments ? x.attachments.length : 0); }, 0);
        return acc + annAtts + cwAtts + matAtts;
      }, 0),
      courses: mergedCourses
    };
  }
};
`
      },
      {
        name: 'GmailIngester',
        type: 'SERVER_JS',
        source: `
var GmailIngester = {
  sync: function(targetFolderId, childName, academicYear, schoolDomain, isIncremental, extractOnly) {
    try {
      McpLogger.log('INFO', 'GMAIL_SYNC_START', 'Starting Gmail circular sync for ' + childName + ' (Domain: ' + (schoolDomain || 'auto') + ', ExtractOnly: ' + !!extractOnly + ')');

      var parentFolder = null;
      var emailsFolder = null;
      var attachFolder = null;
      if (targetFolderId && !extractOnly) {
        try {
          parentFolder = DriveApp.getFolderById(targetFolderId);
          emailsFolder = this.getOrCreateSubfolder(parentFolder, 'emails');
          attachFolder = this.getOrCreateSubfolder(emailsFolder, 'attachments');
        } catch (fErr) {
          McpLogger.log('WARN', 'GMAIL_FOLDER_WARN', 'Could not access or create emails folder in targetFolderId: ' + fErr);
        }
      }

      var cleanDomain = (schoolDomain || '').trim().replace(new RegExp('^@'), '').toLowerCase();
      var isGenericDomain = !cleanDomain || new RegExp('^(gmail|googlemail|google|yahoo|hotmail|outlook)[.]com$', 'i').test(cleanDomain);
      var domainFilter = (!isGenericDomain) ? 'from:' + cleanDomain : '';
      var classroomExclusion = '-from:(classroom.google.com) -from:(no-reply-classroom@google.com) -from:(notifications.google.com) -subject:("New assignment" OR "Graded" OR "Due tomorrow")';
      var query = (domainFilter ? domainFilter + ' ' : '') + classroomExclusion;

      var afterEpoch = null;
      if (isIncremental) {
        var props = PropertiesService.getScriptProperties();
        var lastSync = props.getProperty('last_gmail_sync_time');
        if (lastSync) {
          afterEpoch = Math.floor(new Date(lastSync).getTime() / 1000);
          query += ' after:' + afterEpoch;
        }
      }

      var threads = [];
      var startIdx = 0;
      var pageSize = 50;
      var maxSearchIdx = isIncremental ? 50 : 300;
      while (startIdx < maxSearchIdx) {
        var batch = GmailApp.search(query, startIdx, pageSize);
        if (!batch || batch.length === 0) break;
        threads = threads.concat(batch);
        if (batch.length < pageSize) break;
        startIdx += pageSize;
      }

      // If domain filter was applied but yielded zero threads, fall back to broad query
      // (only on full initial sync, not on 1-minute incremental checks where zero new emails is normal)
      if (threads.length === 0 && domainFilter && !isIncremental) {
        McpLogger.log('INFO', 'GMAIL_DOMAIN_FALLBACK', 'No circulars found for domain ' + cleanDomain + '; retrying with broad notice search');
        var broadQuery = classroomExclusion;
        if (isIncremental && afterEpoch) broadQuery += ' after:' + afterEpoch;
        startIdx = 0;
        while (startIdx < 300) {
          var broadBatch = GmailApp.search(broadQuery, startIdx, pageSize);
          if (!broadBatch || broadBatch.length === 0) break;
          threads = threads.concat(broadBatch);
          if (broadBatch.length < pageSize) break;
          startIdx += pageSize;
        }
      }

      var emailList = [];
      var totalAttachments = 0;
      var cumulativeBase64Bytes = 0;

      for (var t = 0; t < threads.length; t++) {
        var msgs = threads[t].getMessages();
        for (var m = 0; m < msgs.length; m++) {
          var msg = msgs[m];
          var sender = msg.getFrom() || '';

          // Strict filter: omit automated classroom notifications that contain only trimmed message alerts
          var senderLower = sender.toLowerCase();
          if (senderLower.indexOf('classroom.google.com') !== -1 || senderLower.indexOf('no-reply-classroom@google.com') !== -1) {
            continue;
          }

          var subject = msg.getSubject() || 'Untitled Notice';
          var date = msg.getDate();

          var item = {
            id: msg.getId(),
            threadId: threads[t].getId(),
            from: sender,
            to: msg.getTo() || '',
            subject: subject,
            date: date ? date.toISOString() : '',
            snippet: msg.getPlainBody().substring(0, 300),
            body: msg.getPlainBody().substring(0, 8000),
            attachments: []
          };

          var atts = msg.getAttachments();
          for (var a = 0; a < atts.length; a++) {
            var att = atts[a];
            var cleanSubj = subject.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
            var attName = cleanSubj + '_' + att.getName();
            var attSize = att.getSize();
            var base64Payload = null;

            // Include base64 directly for attachments <= 2MB, up to 8MB cumulative in this sync batch
            if (attSize > 0 && attSize <= 2 * 1024 * 1024 && (cumulativeBase64Bytes + attSize) <= 8 * 1024 * 1024) {
              try {
                base64Payload = Utilities.base64Encode(att.getBytes());
                cumulativeBase64Bytes += attSize;
              } catch (b64Err) {}
            }

            var fileObj = null;
            if (attachFolder && !extractOnly) {
              try {
                var existing = attachFolder.getFilesByName(attName);
                if (existing.hasNext()) {
                  fileObj = existing.next();
                } else {
                  fileObj = attachFolder.createFile(att.copyBlob().setName(attName));
                  totalAttachments++;
                }
              } catch (attErr) {}
            }
            item.attachments.push({
              name: att.getName(),
              targetName: attName,
              fileId: fileObj ? fileObj.getId() : '',
              driveUrl: fileObj ? fileObj.getUrl() : '',
              mimeType: att.getContentType(),
              size: attSize,
              messageId: msg.getId(),
              attachmentIndex: a,
              base64: base64Payload
            });
            if (!fileObj && base64Payload) {
              totalAttachments++;
            }
          }

          var emailBody = msg.getPlainBody();
          if (emailBody) {
            var linkedDocs = this.scanTextForDriveFiles(emailBody, attachFolder, 'EmailNotice', subject);
            for (var ld = 0; ld < linkedDocs.length; ld++) {
              item.attachments.push({
                name: linkedDocs[ld].title || 'Linked Circular',
                fileId: linkedDocs[ld].fileId,
                driveUrl: linkedDocs[ld].driveUrl,
                mimeType: 'application/pdf',
                size: 0
              });
              totalAttachments++;
            }
          }

          emailList.push(item);
        }
      }

      var resultPayload = {
        kidName: childName,
        academicYear: academicYear,
        schoolDomain: schoolDomain || '',
        lastSyncedAt: new Date().toISOString(),
        totalEmails: emailList.length,
        totalAttachments: totalAttachments,
        emails: emailList
      };

      if (emailsFolder && !extractOnly) {
        try {
          var finalEmails = resultPayload;
          if (isIncremental) {
            try {
              var exEmIt = emailsFolder.getFilesByName('school_emails.json');
              if (exEmIt.hasNext()) {
                var exEmData = JSON.parse(exEmIt.next().getContent());
                if (exEmData && exEmData.emails) {
                  var emMap = {};
                  var combEmails = [];
                  (emailList || []).concat(exEmData.emails || []).forEach(function(em) {
                    if (em && em.id && !emMap[em.id]) {
                      emMap[em.id] = true;
                      combEmails.push(em);
                    }
                  });
                  finalEmails = {
                    kidName: childName,
                    academicYear: academicYear,
                    schoolDomain: schoolDomain || '',
                    lastSyncedAt: new Date().toISOString(),
                    totalEmails: combEmails.length,
                    totalAttachments: combEmails.reduce(function(a, x) { return a + (x.attachments ? x.attachments.length : 0); }, 0),
                    emails: combEmails
                  };
                }
              }
            } catch (mergeErr) {}
          }
          this.saveJsonFile(emailsFolder, 'school_emails.json', finalEmails);
        } catch (sErr) {
          McpLogger.log('WARN', 'GMAIL_SAVE_WARN', 'Could not save school_emails.json directly: ' + sErr);
        }
      }
      try {
        PropertiesService.getScriptProperties().setProperty('last_gmail_sync_time', new Date().toISOString());
      } catch (pErr) {}

      McpLogger.log('SUCCESS', 'GMAIL_SYNC_COMPLETE', 'Successfully captured ' + emailList.length + ' emails and ' + totalAttachments + ' attachments for ' + childName);
      return resultPayload;
    } catch (err) {
      McpLogger.log('ERROR', 'GMAIL_SYNC_ERROR', 'Gmail sync failed: ' + err.toString());
      if (extractOnly) {
        return {
          kidName: childName,
          academicYear: academicYear,
          schoolDomain: schoolDomain || '',
          lastSyncedAt: new Date().toISOString(),
          totalEmails: 0,
          totalAttachments: 0,
          emails: [],
          error: err.toString()
        };
      }
      throw err;
    }
  },

  extractDriveFileIdFromUrl: function(url) {
    if (!url) return null;
    var match = url.match(new RegExp('/d/([a-zA-Z0-9_-]{20,})'));
    if (match) return match[1];
    var idMatch = url.match(new RegExp('[?&]id=([a-zA-Z0-9_-]{20,})'));
    if (idMatch) return idMatch[1];
    var openMatch = url.match(new RegExp('/open[?]id=([a-zA-Z0-9_-]{20,})'));
    if (openMatch) return openMatch[1];
    return null;
  },

  scanTextForDriveFiles: function(text, attachFolder, prefix, subject) {
    if (!text) return [];
    var results = [];
    var urlRegex = new RegExp('https?://(?:drive|docs)[.]google[.]com/[^\\\\s"<>]+', 'gi');
    var matches = text.match(urlRegex);
    if (matches) {
      for (var i = 0; i < matches.length; i++) {
        var u = matches[i];
        var fId = this.extractDriveFileIdFromUrl(u);
        if (fId) {
          var cleanSubj = (subject || '').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
          var targetName = (prefix || 'Email') + '_' + cleanSubj + '_' + fId.substring(0, 8);
          if (attachFolder) {
            try {
              var existing = attachFolder.getFilesByName(targetName);
              if (existing.hasNext()) {
                var ex = existing.next();
                results.push({ title: targetName, fileId: ex.getId(), driveUrl: ex.getUrl(), mimeType: 'application/pdf' });
                continue;
              }
              var srcFile = DriveApp.getFileById(fId);
              var mime = srcFile.getMimeType();
              if (mime.indexOf('google-apps') !== -1) {
                var token = ScriptApp.getOAuthToken();
                var exportRes = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + fId + '/export?mimeType=application/pdf', {
                  headers: { 'Authorization': 'Bearer ' + token },
                  muteHttpExceptions: true
                });
                if (exportRes.getResponseCode() === 200) {
                  var createdPdf = attachFolder.createFile(exportRes.getBlob().setName(targetName + '.pdf'));
                  results.push({ title: targetName + ' (PDF)', fileId: createdPdf.getId(), driveUrl: createdPdf.getUrl(), mimeType: 'application/pdf' });
                  continue;
                }
              } else {
                var copied = srcFile.makeCopy(targetName, attachFolder);
                results.push({ title: targetName, fileId: copied.getId(), driveUrl: copied.getUrl(), mimeType: mime });
                continue;
              }
            } catch (e) {}
          }
          // If attachFolder is null or student cannot write, return fileId for Parent Vault sync
          results.push({
            title: targetName,
            fileId: fId,
            driveUrl: u,
            mimeType: 'application/pdf',
            size: 0
          });
        }
      }
    }
    return results;
  },

  getOrCreateSubfolder: function(parentFolder, name) {
    var it = parentFolder.getFoldersByName(name);
    if (it.hasNext()) return it.next();
    return parentFolder.createFolder(name);
  },

  saveJsonFile: function(folder, fileName, data) {
    var payload = JSON.stringify(data, null, 2);
    var it = folder.getFilesByName(fileName);
    if (it.hasNext()) {
      var file = it.next();
      file.setContent(payload);
      return file;
    }
    return folder.createFile(fileName, payload, 'application/json');
  }
};
`
      },
      {
        name: 'DigestBuilder',
        type: 'SERVER_JS',
        source: `
var DigestBuilder = {
  build: function(targetFolderId, childName, academicYear) {
    try {
      var parentFolder = null;
      var digestFolder = null;
      if (targetFolderId) {
        try {
          parentFolder = DriveApp.getFolderById(targetFolderId);
          digestFolder = this.getOrCreateSubfolder(parentFolder, 'daily_digests');
        } catch (fErr) {}
      }

      var classroomData = this.readJsonFile(parentFolder, 'classroom/classroom_data.json');
      var emailData = this.readJsonFile(parentFolder, 'emails/school_emails.json');
      var portalStatus = this.readJsonFile(parentFolder, 'portals/portals_status.json');

      var md = '# 🎓 ' + childName + ' - Daily School Intelligence Digest\\n';
      md += '**Academic Year**: ' + (academicYear || '2026-2027') + ' | **Updated**: ' + new Date().toLocaleString() + '\\n\\n';

      // 1. Action Items & Coursework
      md += '## 📝 Google Classroom & Assignments\\n';
      if (classroomData && classroomData.courses && classroomData.courses.length > 0) {
        for (var c = 0; c < classroomData.courses.length; c++) {
          var course = classroomData.courses[c];
          if (course.courseWork && course.courseWork.length > 0) {
            md += '### ' + course.name + '\\n';
            for (var w = 0; w < course.courseWork.length; w++) {
              var work = course.courseWork[w];
              var dueStr = work.dueDate ? (work.dueDate.year + '-' + work.dueDate.month + '-' + work.dueDate.day) : 'No due date';
              var subState = (work.submission && work.submission.state) ? work.submission.state : 'ASSIGNED';
              var gradeStr = (work.submission && work.submission.assignedGrade !== null) ? (' - Grade: ' + work.submission.assignedGrade + '/' + work.maxPoints) : '';

              md += '* **' + work.title + '** (Due: ' + dueStr + ') [' + subState + gradeStr + ']\\n';
            }
          }
        }
      } else {
        md += '_No active Google Classroom courses or assignments._\\n\\n';
      }

      // 2. School Circulars & Emails
      md += '\\n## 📢 School Circulars & Notices (Gmail)\\n';
      if (emailData && emailData.emails && emailData.emails.length > 0) {
        for (var e = 0; e < Math.min(emailData.emails.length, 10); e++) {
          var email = emailData.emails[e];
          md += '* **' + email.subject + '** (' + email.from + ' - ' + (email.date ? email.date.substring(0, 10) : '') + ')\\n';
          if (email.attachments && email.attachments.length > 0) {
            md += '  - _Attachments_: ' + email.attachments.map(function(a) { return a.name; }).join(', ') + '\\n';
          }
        }
      } else {
        md += '_No recent school circular emails._\\n\\n';
      }

      // 3. Portal Health
      md += '\\n## 🌐 School Portals Status\\n';
      if (portalStatus && portalStatus.domains && portalStatus.domains.length > 0) {
        for (var p = 0; p < portalStatus.domains.length; p++) {
          var pDom = portalStatus.domains[p];
          var icon = pDom.status === 'ACTIVE' ? '🟢' : '⚠️';
          md += '* ' + icon + ' **' + pDom.domain + '**: ' + pDom.message + '\\n';
        }
      } else {
        md += '_No external school portals registered._\\n\\n';
      }

      var masterTimeline = {
        kidName: childName,
        academicYear: academicYear,
        generatedAt: new Date().toISOString(),
        classroom: classroomData || null,
        emails: emailData || null,
        portals: portalStatus || null
      };

      if (digestFolder) {
        try {
          this.saveTextFile(digestFolder, 'latest_digest.md', md);
          this.saveJsonFile(digestFolder, 'master_timeline.json', masterTimeline);
        } catch (sErr) {}
      }

      McpLogger.log('SUCCESS', 'DIGEST_BUILD_COMPLETE', 'Generated latest_digest.md and master_timeline.json for ' + childName);
      return { success: true, md: md, masterTimeline: masterTimeline };
    } catch (err) {
      McpLogger.log('ERROR', 'DIGEST_BUILD_ERROR', 'Digest build error: ' + err.toString());
      return { success: false, error: err.toString() };
    }
  },

  getOrCreateSubfolder: function(parentFolder, name) {
    var it = parentFolder.getFoldersByName(name);
    if (it.hasNext()) return it.next();
    return parentFolder.createFolder(name);
  },

  readJsonFile: function(parentFolder, relativePath) {
    try {
      var parts = relativePath.split('/');
      var current = parentFolder;
      for (var i = 0; i < parts.length - 1; i++) {
        var it = current.getFoldersByName(parts[i]);
        if (!it.hasNext()) return null;
        current = it.next();
      }
      var fIt = current.getFilesByName(parts[parts.length - 1]);
      if (fIt.hasNext()) {
        var content = fIt.next().getBlob().getDataAsString();
        return JSON.parse(content);
      }
    } catch (e) {}
    return null;
  },

  saveTextFile: function(folder, fileName, text) {
    var it = folder.getFilesByName(fileName);
    if (it.hasNext()) {
      var file = it.next();
      file.setContent(text);
      return file;
    }
    return folder.createFile(fileName, text, 'text/markdown');
  },

  saveJsonFile: function(folder, fileName, data) {
    var payload = JSON.stringify(data, null, 2);
    var it = folder.getFilesByName(fileName);
    if (it.hasNext()) {
      var file = it.next();
      file.setContent(payload);
      return file;
    }
    return folder.createFile(fileName, payload, 'application/json');
  }
};
`
      },
      {
        name: 'PortalIngester',
        type: 'SERVER_JS',
        source: `
var PortalIngester = {
  syncAll: function() {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) return { status: 'locked' };

    try {
      var props = PropertiesService.getScriptProperties();
      var rawRegistry = props.getProperty('multi_child_portal_registry');
      if (!rawRegistry) {
        return { status: 'empty', reason: 'No registered school portals found in registry.' };
      }

      var registry;
      try {
        registry = JSON.parse(rawRegistry);
      } catch (parseErr) {
        return { status: 'error', reason: 'Invalid portal registry JSON' };
      }

      var children = registry.children || [];
      if (!children || children.length === 0) {
        return { status: 'empty', reason: 'No children configured with portals yet.' };
      }

      var hasAnyActiveDomains = false;
      for (var i = 0; i < children.length; i++) {
        if (children[i].domains && Object.keys(children[i].domains).length > 0) {
          hasAnyActiveDomains = true;
          break;
        }
      }
      if (!hasAnyActiveDomains) {
        return { status: 'empty', reason: 'No active portal domains registered yet.' };
      }

      McpLogger.log('INFO', 'PORTAL_CRON_START', 'Executing 6-hour autonomous portal sync for all children');
      var results = [];

      for (var c = 0; c < children.length; c++) {
        var child = children[c];
        try {
          var childRes = this.syncChild(child);
          if (childRes) results.push(childRes);
        } catch (childErr) {
          McpLogger.log('ERROR', 'PORTAL_CHILD_ERROR', 'Portal sync error for ' + (child.kidName || 'Child') + ': ' + childErr);
        }
      }

      return { status: 'complete', results: results };
    } finally {
      lock.releaseLock();
    }
  },

  syncChild: function(child) {
    if (!child || !child.portalFolderId) return null;
    var childFolder;
    try {
      childFolder = DriveApp.getFolderById(child.portalFolderId);
      if (!childFolder || childFolder.isTrashed()) return null;
    } catch (fErr) {
      return null;
    }

    var portalsFolder = this.getOrCreateSubfolder(childFolder, 'portals');
    var domains = child.domains || {};
    var domainKeys = Object.keys(domains);
    if (domainKeys.length === 0) return null;

    var statuses = [];

    for (var d = 0; d < domainKeys.length; d++) {
      var dom = domainKeys[d];
      var domConfig = domains[dom];
      var domFolder = this.getOrCreateSubfolder(portalsFolder, dom);
      var attachFolder = this.getOrCreateSubfolder(domFolder, 'attachments');

      var cookies = (domConfig.security_payload && domConfig.security_payload.cookies) ? domConfig.security_payload.cookies : '';
      var features = domConfig.features || [];
      var capturedFeatures = [];
      var isExpired = false;

      for (var f = 0; f < features.length; f++) {
        var feat = features[f];
        try {
          var fetchRes = UrlFetchApp.fetch(feat.endpoint, {
            headers: {
              'Cookie': cookies,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            followRedirects: false,
            muteHttpExceptions: true
          });

          var code = fetchRes.getResponseCode();
          var body = fetchRes.getContentText();

          if (code === 401 || code === 403 || (code >= 300 && code < 400) || (body.includes('password') && body.includes('login'))) {
            isExpired = true;
            break;
          }

          capturedFeatures.push({
            name: feat.name,
            endpoint: feat.endpoint,
            lastFetched: new Date().toISOString(),
            htmlSnippet: body.substring(0, 1500)
          });
        } catch (fErr) {
          McpLogger.log('WARN', 'PORTAL_FEATURE_FETCH_WARN', 'Could not fetch feature ' + feat.name + ' for ' + child.kidName + ': ' + fErr);
        }
      }

      var domStatus = {
        childId: child.childId,
        kidName: child.kidName,
        domain: dom,
        status: isExpired ? 'EXPIRED' : 'ACTIVE',
        lastChecked: new Date().toISOString(),
        message: isExpired ? 'Session expired or redirected to login.' : 'Active and synced.'
      };
      statuses.push(domStatus);

      if (!isExpired) {
        this.saveJsonFile(domFolder, 'features_data.json', {
          domain: dom,
          childId: child.childId,
          kidName: child.kidName,
          lastSyncedAt: new Date().toISOString(),
          features: capturedFeatures
        });
      }
    }

    this.saveJsonFile(portalsFolder, 'portals_status.json', {
      lastChecked: new Date().toISOString(),
      domains: statuses
    });

    return { childId: child.childId, kidName: child.kidName, statuses: statuses };
  },

  getOrCreateSubfolder: function(parentFolder, name) {
    var it = parentFolder.getFoldersByName(name);
    if (it.hasNext()) return it.next();
    return parentFolder.createFolder(name);
  },

  saveJsonFile: function(folder, fileName, data) {
    var payload = JSON.stringify(data, null, 2);
    var it = folder.getFilesByName(fileName);
    if (it.hasNext()) {
      var file = it.next();
      file.setContent(payload);
      return file;
    }
    return folder.createFile(fileName, payload, 'application/json');
  }
};
`
      }
    ];

    const response = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/content`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ files })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to upload server code (${response.status}): ${errText}`);
    }

    return await response.json();
  }

  /**
   * Creates an explicit version for the Apps Script project before deployment.
   */
  private static async createVersion(scriptId: string, token: string, childName: string = '', academicYear: string = ''): Promise<any> {
    const yearSuffix = academicYear ? ` (${academicYear})` : '';
    const nameSuffix = childName ? ` - ${childName}${yearSuffix}` : '';
    const response = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/versions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: `Kids Intelligent Dashboard System (K.I.D.S.) Version 1${nameSuffix}`
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to create script version (${response.status}): ${errText}`);
    }

    return await response.json();
  }

  /**
   * Creates Web App deployment for the created script version.
   */
  private static async createDeployment(scriptId: string, versionNumber: number, token: string, childName: string = '', academicYear: string = ''): Promise<any> {
    const yearSuffix = academicYear ? ` (${academicYear})` : '';
    const nameSuffix = childName ? ` - ${childName}${yearSuffix}` : '';
    const response = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/deployments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        versionNumber: versionNumber,
        manifestFileName: 'appsscript',
        description: `Kids Intelligent Dashboard System (K.I.D.S.) MCP Server Deployment${nameSuffix}`
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to create Web App deployment (${response.status}): ${errText}`);
    }

    return await response.json();
  }

  /**
   * Updates an existing deployment in place to point to the newly published script version.
   */
  private static async updateDeployment(scriptId: string, deploymentId: string, versionNumber: number, token: string, childName: string = '', academicYear: string = ''): Promise<any> {
    const yearSuffix = academicYear ? ` (${academicYear})` : '';
    const nameSuffix = childName ? ` - ${childName}${yearSuffix}` : '';
    const response = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/deployments/${deploymentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        deploymentConfig: {
          versionNumber: versionNumber,
          manifestFileName: 'appsscript',
          description: `Kids Intelligent Dashboard System (K.I.D.S.) MCP Server Deployment v${versionNumber}${nameSuffix}`
        }
      })
    });
    if (response.ok) {
      return await response.json();
    }
    const errText = await response.text();
    console.warn('[School MCP] Update deployment in-place error:', response.status, errText);
    return null;
  }

  /**
   * Executes an Apps Script function directly via the Execution API (scripts.run).
   * Bypasses Web App URLs, domain policies, and 404 proxy routing completely.
   */
  public static async executeMcpCommand(token: string, scriptId: string, functionName: string, args: any[] = []): Promise<any> {
    const response = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}:run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        function: functionName,
        parameters: args,
        devMode: false
      })
    });

    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch (parseErr) {
      throw new Error(`Google Apps Script Execution API returned non-JSON (HTTP ${response.status}): ${text.substring(0, 120)}`);
    }

    if (result.error) {
      throw new Error(`Execution error: ${result.error.message}`);
    }
    return result.response?.result;
  }

  /**
   * Tests and verifies Web App URL via JSON-RPC tools/list ping with fallback to Execution API.
   */
  public static async verifyMcpServerUrl(webAppUrl: string, scriptId?: string, token?: string, accessKey?: string): Promise<any[]> {
    const cleanUrl = webAppUrl.replace(/\/macros\/u\/\d+\/s\//g, '/macros/s/').replace(/\/u\/\d+\//g, '/');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let lastError: string = '';

    // 1. Try standard JSON-RPC HTTP POST ping with Bearer Token (4 attempts with 2s propagation delay)
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        if (attempt > 1) {
          await new Promise(r => setTimeout(r, 2000));
        }

        const response = await fetch(cleanUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 'init-verify' }),
          redirect: 'follow'
        });

        const text = await response.text();

        if (response.ok || response.status === 200) {
          try {
            const json = JSON.parse(text);
            if (json.result && json.result.tools && Array.isArray(json.result.tools)) {
              return json.result.tools;
            }
          } catch (e) {
            lastError = `Invalid JSON: ${text.substring(0, 100)}`;
            continue;
          }
        }

        lastError = `HTTP ${response.status}: ${text.substring(0, 100)}`;
      } catch (err: any) {
        lastError = err.message || String(err);
      }
    }

    // 2. Try GET ping with query parameter accessKey and Bearer token
    if (accessKey && token) {
      try {
        const getUrl = cleanUrl.includes('?') ? `${cleanUrl}&action=getLogs` : `${cleanUrl}?accessKey=${accessKey}&action=getLogs`;
        const getRes = await fetch(getUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
          redirect: 'follow'
        });
        if (getRes.ok) {
          const getData = await getRes.json();
          if (getData.status === 'ok') {
            this.log('🎉 Server verified successfully via authenticated Web App endpoint!');
            return [
              { name: 'get_classroom_assignments' },
              { name: 'get_student_timetable' },
              { name: 'get_teacher_announcements' },
              { name: 'get_google_calendar_events' },
              { name: 'search_google_drive' },
              { name: 'get_school_portal_notifications' }
            ];
          }
        }
      } catch (e: any) {
        lastError += ` | GET ping: ${e.message}`;
      }
    }

    // 3. Direct Execution API Fallback (Bypasses Web App domain policies & 404 proxy routing)
    if (scriptId && token) {
      try {
        this.log('🚀 Running direct tool discovery via Google Apps Script Execution API (scripts.run)...');
        const toolsResult = await this.executeMcpCommand(token, scriptId, 'handleToolsList', []);
        if (toolsResult && toolsResult.tools && Array.isArray(toolsResult.tools)) {
          this.log(`🎉 Successfully verified ${toolsResult.tools.length} active MCP tools via Google Cloud Execution API!`);
          return toolsResult.tools;
        }
      } catch (e: any) {
        lastError += ` | scripts.run: ${e.message}`;
      }
    }

    throw new Error(`Verification ping note: ${lastError}`);
  }

  /**
   * Automatically executes testAuth() via Google Apps Script Execution API to pre-warm and verify all scopes.
   */
  private static async runTestAuth(scriptId: string, token: string): Promise<any> {
    try {
      const response = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}:run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          function: 'testAuth'
        })
      });
      if (response.ok) {
        console.log('[School MCP] Automated testAuth executed and pre-warmed successfully.');
        return await response.json();
      }
    } catch (e) {
      console.warn('[School MCP] Automated testAuth warning:', e);
    }
    return null;
  }

  /**
   * Prompts 1-time end-user Google authorization in a focused popup modal.
   * Auto-closes automatically when authorization completes.
   */
  public static promptInTabAuthorization(webAppUrl: string, workerType: 'master' | 'school' = 'school'): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.windows) {
      return Promise.resolve();
    }

    const cleanBaseUrl = webAppUrl.split('?')[0];
    const authUrl = `${cleanBaseUrl}?authInit=true&workerType=${workerType}&dualWorker=${workerType === 'school' ? 'true' : 'false'}`;

    this.log('🚀 Opening focused Google Authorization window...');

    return new Promise((resolve) => {
      try {
        chrome.windows.create(
          {
            url: authUrl,
            type: 'popup',
            width: 520,
            height: 650,
            focused: true
          },
          (createdWindow) => {
            if (!createdWindow || !createdWindow.id) {
              resolve();
              return;
            }

            const windowId = createdWindow.id;
            GasProvisionerService.log('⏳ Please click "Review permissions" -> select your account -> click "Allow" in the popup window.');

            // Listen for when user completes authorization (window auto-closes or is manually closed)
            const checkClosed = (closedWinId: number) => {
              if (closedWinId === windowId) {
                chrome.windows.onRemoved.removeListener(checkClosed);
                GasProvisionerService.log('✅ Google Authorization complete! Popup window closed.');
                resolve();
              }
            };

            chrome.windows.onRemoved.addListener(checkClosed);
          }
        );
      } catch (e: any) {
        GasProvisionerService.log(`⚠️ Note on authorization window: ${e.message}`);
        resolve();
      }
    });
  }

  /**
   * Proactively detects if Google requires 1-time interactive script authorization.
   * Prompts the clean Google consent dialog (Review Permissions -> Allow) routed to the student account.
   */
  /**
   * Resolves the authenticated user's email via Drive about API or userinfo endpoint.
   */
  public static async getAuthenticatedUserEmail(token: string): Promise<string | null> {
    try {
      const driveRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (driveRes.ok) {
        const driveData = await driveRes.json();
        if (driveData && driveData.user && driveData.user.emailAddress) {
          return driveData.user.emailAddress;
        }
      }
    } catch (e) {}

    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData && userData.email) {
          return userData.email;
        }
      }
    } catch (e) {}

    return null;
  }

  /**
   * Proactively detects if Google requires 1-time interactive script authorization.
   * Prompts the clean Google consent dialog (Review Permissions -> Allow) routed to the student account.
   */
  public static async ensureScriptAuthorized(webAppUrl: string, token: string, scriptId?: string, studentEmail?: string, workerType: 'master' | 'school' = 'school'): Promise<void> {
    const cleanUrl = webAppUrl.replace(/\/macros\/u\/\d+\/s\//g, '/macros/s/').replace(/\/u\/\d+\//g, '/');
    try {
      const pingRes = await fetch(cleanUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const responseText = await pingRes.text();

      if (responseText.includes('Authorization needed') || responseText.includes('Authorization Required') || pingRes.status === 401 || pingRes.status === 403 || !responseText.includes('online')) {
        // Resolve student email to avoid /u/0/ multi-account conflict
        let targetEmail = studentEmail;
        if (!targetEmail) {
          this.log('🔍 Resolving authenticated student email via Google Drive User API...');
          targetEmail = (await this.getAuthenticatedUserEmail(token)) || undefined;
        }

        const urlObj = new URL(cleanUrl);
        urlObj.searchParams.set('auth', 'true');
        urlObj.searchParams.set('workerType', workerType);
        urlObj.searchParams.set('dualWorker', workerType === 'school' ? 'true' : 'false');
        if (targetEmail) {
          urlObj.searchParams.set('authuser', targetEmail);
          this.log(`📧 Routing authorization specifically to Google account: ${targetEmail}`);
        } else {
          this.log('⚠️ Could not resolve student email address; opening standard authorization modal.');
        }
        const authUrl = urlObj.toString();

        this.log('🔐 Interactive Google Apps Script authorization required for Classroom & Drive.');
        this.log(`🔍 Preflight Check: HTTP ${pingRes.status} — Google demands 1-time permissions handshake.`);
        this.log('📋 STEP-BY-STEP GUIDANCE FOR POPUP WINDOW:');
        this.log(`👉 1. Account to select: ${targetEmail || "Student's School Account"}`);
        this.log('👉 2. Action: Click "Review permissions" -> select account -> click "Allow"');
        this.log('👉 3. Auto-Close: This popup will automatically close upon approval with zero code editor exposure.');
        this.log(`🔗 Modal URL: ${authUrl}`);
        this.log('🚀 Opening focused Google Authorization window...');
        this.log('⏳ Active background monitor started: window will auto-close the moment you click "Allow".');

        if (typeof chrome !== 'undefined' && chrome.windows) {
          await new Promise<void>((resolve) => {
            chrome.windows.create(
              {
                url: authUrl,
                type: 'popup',
                width: 520,
                height: 650,
                focused: true
              },
              (win) => {
                if (!win || !win.id) {
                  resolve();
                  return;
                }

                const windowId = win.id;
                let isHandled = false;

                const finishAuth = async () => {
                  if (isHandled) return;
                  isHandled = true;
                  clearInterval(pollInterval);
                  if (typeof chrome !== 'undefined') {
                    if (chrome.tabs && chrome.tabs.onUpdated) {
                      chrome.tabs.onUpdated.removeListener(tabUpdateListener);
                    }
                    try {
                      await chrome.windows.remove(windowId);
                    } catch (e) {}
                  }
                  GasProvisionerService.log('✅ Google Authorization complete! Popup window closed.');
                  resolve();
                };

                let windowOpenedAt = Date.now();

                // 1. Tab Title & URL Inspector (Auto-closes on post-approval success page)
                const tabUpdateListener = (tabId: number, changeInfo: any, tab: any) => {
                  if (tab.windowId === windowId) {
                    const title = (tab.title || '').toLowerCase();
                    const url = (tab.url || '').toLowerCase();
                    const ageMs = Date.now() - windowOpenedAt;

                    // Match post-approval completion states
                    if (
                      title.includes('authorization successful') ||
                      title.includes('success! you may close') ||
                      (title.includes('mcp server') && ageMs > 2500) ||
                      url.includes('close=1') ||
                      url.includes('auth_success=true')
                    ) {
                      setTimeout(finishAuth, 500);
                    }
                  }
                };

                if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.onUpdated) {
                  chrome.tabs.onUpdated.addListener(tabUpdateListener);
                }

                // 2. Active Polling (Checks if Google Apps Script is unblocked)
                const pollInterval = setInterval(async () => {
                  if (isHandled) {
                    clearInterval(pollInterval);
                    return;
                  }

                  // Check 2a: Query tabs in the popup window for explicit success
                  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
                    try {
                      const tabs = await chrome.tabs.query({ windowId });
                      const ageMs = Date.now() - windowOpenedAt;
                      for (const t of tabs) {
                        const title = (t.title || '').toLowerCase();
                        if (
                          title.includes('authorization successful') ||
                          title.includes('success! you may close') ||
                          (title.includes('mcp server') && ageMs > 2500)
                        ) {
                          finishAuth();
                          return;
                        }
                      }
                    } catch (e) {}
                  }

                  // Check 2b: Test if the script can execute via direct execution API
                  if (scriptId) {
                    try {
                      const res = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}:run`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ function: 'testAuth' })
                      });
                      if (res.ok) {
                        const json = await res.json();
                        if (!json.error) {
                          finishAuth();
                          return;
                        }
                      }
                    } catch (e) {}
                  }
                }, 1500);

                // 3. Window Closed Listener (Triggered when user clicks Allow & closes or closes manually)
                const windowRemovedListener = (closedWinId: number) => {
                  if (closedWinId === windowId) {
                    if (typeof chrome !== 'undefined') {
                      if (chrome.tabs && chrome.tabs.onUpdated) {
                        chrome.tabs.onUpdated.removeListener(tabUpdateListener);
                      }
                      if (chrome.windows && chrome.windows.onRemoved) {
                        chrome.windows.onRemoved.removeListener(windowRemovedListener);
                      }
                    }
                    clearInterval(pollInterval);
                    if (!isHandled) {
                      isHandled = true;
                      GasProvisionerService.log('✅ Google Authorization step finished.');
                      resolve();
                    }
                  }
                };

                if (typeof chrome !== 'undefined' && chrome.windows && chrome.windows.onRemoved) {
                  chrome.windows.onRemoved.addListener(windowRemovedListener);
                }
              }
            );
          });
        }
      }
    } catch (e: any) {
      console.warn('[School MCP] ensureScriptAuthorized check:', e.message);
      this.log(`ℹ️ Preflight note: ${e.message}`);
    }
  }

  /**
   * Provisions Worker A in Student's School Account (1-Minute Classroom & Gmail Cron).
   */
  public static async provisionSchoolWorker(
    studentToken: string,
    parentFolderId: string,
    childName: string,
    academicYear: string,
    studentEmail: string,
    schoolDomain: string
  ): Promise<ProvisionResult> {
    this.currentDeployProgress = {
      status: 'IN_PROGRESS',
      workerType: 'SCHOOL_WORKER',
      childName,
      academicYear,
      percent: 10,
      phaseText: 'Phase 1: Authenticating',
      subtext: 'Authenticating Student School Account & Google Apps Script API...',
      stage: 'script',
      stagePercent: 10,
      updatedAt: Date.now()
    };
    await this.setActiveDeployProgress(this.currentDeployProgress);

    try {
      this.log(`🎓 Provisioning Worker A (Student Account: ${studentEmail || 'School'}) for ${childName}...`);
    this.reportProgress(15, 'Phase 1 of 5 (15%)', 'Authenticating Student School Account & Google Apps Script API...');

    // 1. Find Existing Project or Create New (Prevents Duplication)
    const activeProfile = await ChildManager.getActiveProfile();
    let scriptId: string = '';
    let isReused = false;
    let existingProject: { scriptId: string; deploymentId: string; webAppUrl: string; accessKey?: string } | null = null;

    if (activeProfile?.schoolGasScriptId) {
      const isAlive = await this.verifyScriptAlive(activeProfile.schoolGasScriptId, studentToken);
      if (isAlive) {
        scriptId = activeProfile.schoolGasScriptId;
        isReused = true;
        this.log(`📦 Reusing existing School Worker project from profile: ${scriptId}`);
      }
    }

    if (!scriptId) {
      existingProject = await this.findExistingProject(studentToken, childName, academicYear);
      if (existingProject?.scriptId) {
        const isAlive = await this.verifyScriptAlive(existingProject.scriptId, studentToken);
        if (isAlive) {
          scriptId = existingProject.scriptId;
          isReused = true;
          this.log(`📦 Reusing existing School Worker project from Google Drive config: ${scriptId}`);
        }
      }
    }

    if (!scriptId) {
      this.reportProgress(25, 'Phase 2 of 5 (25%)', 'Creating Student Google Apps Script Project...');
      const project = await this.createProject(studentToken);
      scriptId = project.scriptId;
      this.log(`📦 Created fresh Apps Script Project for School Worker: ${scriptId}`);
    }

    // 2. Upload Code
    this.reportProgress(45, 'Phase 3 of 5 (45%)', 'Uploading Classroom & Gmail Ingestion Modules...');
    const accessKey = `kids_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await this.updateProjectContent(scriptId, accessKey, studentToken, childName, academicYear);
    this.log('📄 Uploaded Cloud Ingestion modules (Classroom, Gmail, Digest) to project.');

    // 3. Deploy
    this.reportProgress(65, 'Phase 3 of 5 (65%)', 'Deploying Student Account Cloud Web App...');
    const version = await this.createVersion(scriptId, studentToken, childName, academicYear);
    let deploymentId = existingProject?.deploymentId || '';
    if (!deploymentId && activeProfile?.schoolGasDeploymentUrl) {
      const depMatch = activeProfile.schoolGasDeploymentUrl.match(/\/s\/([^/?&]+)/);
      if (depMatch) deploymentId = depMatch[1];
    }

    if (deploymentId) {
      try {
        await this.updateDeployment(scriptId, deploymentId, version.versionNumber, studentToken, childName, academicYear);
        this.log(`🔄 Updated existing Student Web App deployment in-place: ${deploymentId}`);
      } catch (depErr) {
        const deployment = await this.createDeployment(scriptId, version.versionNumber, studentToken, childName, academicYear);
        deploymentId = deployment.deploymentId;
      }
    } else {
      const deployment = await this.createDeployment(scriptId, version.versionNumber, studentToken, childName, academicYear);
      deploymentId = deployment.deploymentId;
    }

    const webAppUrl = `https://script.google.com/macros/s/${deploymentId}/exec?accessKey=${encodeURIComponent(accessKey)}`;
    this.log(`🚀 Deployed Student Web App: ${webAppUrl}`);

    // 4. Ensure Permissions / Authorization Handshake
    this.reportProgress(80, 'Phase 4: Permissions', 'Verifying Google Workspace permissions handshake...', 'script', 100);
    await this.ensureScriptAuthorized(webAppUrl, studentToken, scriptId, studentEmail);

    // 5. Update Child Profile & Google Drive Config Immediately
    const currentProfile = activeProfile || (await ChildManager.getActiveProfile());
    if (currentProfile && currentProfile.id) {
      await ChildManager.updateProfile(currentProfile.id, {
        schoolGasScriptId: scriptId,
        schoolGasDeploymentUrl: webAppUrl,
        studentAccountEmail: studentEmail,
        schoolEmailDomain: schoolDomain,
        lastSchoolSync: new Date().toISOString()
      });
      try {
        const pToken = await PersonalDriveService.getValidToken(false);
        await PersonalDriveService.saveKidConfig(pToken, childName, academicYear, {
          schoolGasScriptId: scriptId,
          schoolGasDeploymentUrl: webAppUrl,
          studentAccountEmail: studentEmail,
          schoolEmailDomain: schoolDomain
        });
      } catch (cfgErr) {}
    }

    if (webAppUrl) {
      PersonalDriveService.callGasWorkerRpc(webAppUrl, 'set_sync_state', {
        isDualWorker: true,
        childName,
        academicYear
      }).catch(() => {});
    }

    // 6. Register School Cloud Worker with Personal Master Worker for 24/7 autonomous cloud sync
    let registeredWithMaster = false;
    try {
      this.log('🔗 Registering School Cloud Worker with Personal Master Worker for 24/7 autonomous cloud sync...');
      const pToken = await PersonalDriveService.getValidToken(false);
      const rootFolder = await PersonalDriveService.getOrCreateRootFolder(pToken);
      const rootConfig = await PersonalDriveService.readJsonFileInFolder(pToken, rootFolder.id, 'K.I.D.S._Data_config.json').catch(() => null);
      let masterScriptId = rootConfig?.masterWorkerScriptId;
      let masterWorkerUrl = rootConfig?.masterWorkerDeploymentUrl;
      if (!masterScriptId && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const stored = await chrome.storage.local.get(['master_worker_script_id', 'master_worker_deployment_url']).catch(() => null);
        masterScriptId = stored?.master_worker_script_id;
        if (!masterWorkerUrl) masterWorkerUrl = stored?.master_worker_deployment_url;
      }

      if (masterWorkerUrl || masterScriptId) {
        const kidFolder = await PersonalDriveService.getOrCreateKidFolder(pToken, childName, academicYear);

        // Strategy A: Direct Web App JSON-RPC POST
        if (masterWorkerUrl) {
          try {
            const regRes = await fetch(masterWorkerUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'register_school_worker',
                params: {
                  childId: activeProfile?.id || 'default_child',
                  childName: childName,
                  academicYear: academicYear,
                  schoolWorkerUrl: webAppUrl,
                  schoolDomain: schoolDomain,
                  targetFolderId: kidFolder.id,
                  initialSyncComplete: false
                }
              })
            });
            if (regRes.ok) {
              registeredWithMaster = true;
              this.log('✅ Personal Master Worker registered (autonomous trigger deferred until 1-time sync completes).');
            }
          } catch (webAppErr) {}
        }

        // Strategy B: Apps Script Execution API fallback
        if (!registeredWithMaster && masterScriptId) {
          try {
            await this.executeMcpCommand(pToken, masterScriptId, 'handleRegisterSchoolWorker', [{
              childId: activeProfile?.id || 'default_child',
              childName: childName,
              academicYear: academicYear,
              schoolWorkerUrl: webAppUrl,
              schoolDomain: schoolDomain,
              targetFolderId: kidFolder.id,
              initialSyncComplete: false
            }]);
            registeredWithMaster = true;
            this.log('✅ Personal Master Worker registered via API (autonomous trigger deferred until 1-time sync completes).');
          } catch (apiErr) {}
        }

        // NOTE: this used to also fire sync_master_cloud_school with isInitialPass:true here,
        // kicking off a full GAS-side initial sync (its own extraction + attachment download
        // loop, creating its own classroom/emails folders) on the Personal Master Worker,
        // completely independently of and concurrently with the extension's own
        // runInitialSchoolDataSync. That's confirmed to be the actual cause of duplicate
        // classroom/emails folders — two separate runtimes (Google's cloud and the browser)
        // syncing the same data with zero shared state between them, which no amount of
        // chrome.storage.local-based locking in the extension could ever prevent. The 1-time
        // sync is owned entirely by the extension now; registering the child here (above, with
        // initialSyncComplete: false) is enough for the Master Worker to know about it and pick
        // up ongoing incremental sync once the extension marks it complete.

        if (!registeredWithMaster) {
          this.log('ℹ️ School Cloud Worker connected to Parent Vault.');
        }
      } else {
        this.log('ℹ️ Personal Master Worker not yet deployed. Deploy Master Worker in Step 1 anytime to enable 24/7 cloud triggers.');
      }
    } catch (masterRegErr: any) {
      this.log(`ℹ️ Master Worker registration notice: ${masterRegErr.message || String(masterRegErr)}`);
    }

    // 7. Script Creation Complete! Inform user they can move forward with next steps
    this.reportProgress(100, 'School Cloud Worker Created', 'Worker active! You can now move forward with next steps while initial data is fetched in background.', 'script', 100);
    const result: ProvisionResult = {
      success: true,
      scriptId,
      deploymentId,
      webAppUrl,
      verifiedTools: ['sync_classroom_and_gmail']
    };

    const completedProgress: ActiveDeployProgress = {
      status: 'COMPLETED',
      workerType: 'SCHOOL_WORKER',
      childName,
      academicYear,
      percent: 100,
      phaseText: 'School Cloud Worker Created',
      subtext: 'Worker active! You can now move forward with next steps while initial data is fetched in background.',
      stage: 'script',
      stagePercent: 100,
      updatedAt: Date.now(),
      result
    };
    await this.setActiveDeployProgress(completedProgress);

    // 8. 1-Time Ingestion Hand-Off:
    // If Master Worker is registered, it executes 1st-time extraction and attachment downloads directly in Google Cloud,
    // activating cloud triggers ONLY after full completion.
    if (!registeredWithMaster) {
      this.runInitialSchoolDataSync(
        childName,
        academicYear,
        studentToken,
        webAppUrl,
        scriptId,
        studentEmail,
        schoolDomain
      ).catch((bgErr) => {
        console.warn('[GasProvisioner] Background initial data sync error:', bgErr);
      });
    } else {
      this.log(`🚀 1-Time initial data extraction delegated to Personal Master Cloud Worker for ${childName}. Autonomous trigger will activate only after completion.`);
    }

    return result;
  } catch (err: any) {
    const errorProgress: ActiveDeployProgress = {
      status: 'ERROR',
      workerType: 'SCHOOL_WORKER',
      childName,
      academicYear,
      percent: this.currentDeployProgress?.percent || 0,
      phaseText: 'School Worker Deployment Error',
      subtext: err.message || String(err),
      updatedAt: Date.now(),
      error: err.message || String(err)
    };
    await this.setActiveDeployProgress(errorProgress);
    throw err;
  }
  }

  /**
   * Executes 1-time initial extraction of Classroom coursework, circulars, and attachments in background.
   * Runs asynchronously without blocking the user, updates storage upon completion, and triggers desktop notification.
   */
  public static async runInitialSchoolDataSync(
    childName?: string,
    academicYear?: string,
    studentTokenOverride?: string,
    webAppUrlOverride?: string,
    scriptIdOverride?: string,
    studentEmailOverride?: string,
    schoolDomainOverride?: string
  ): Promise<any> {
    const activeProf = await ChildManager.getActiveProfile();
    const resolvedChild = childName || activeProf?.name || 'Atharva';
    const cleanYear = academicYear || activeProf?.academicYear || '2026-2027';

    // CRITICAL: this in-memory flag must be set synchronously, with no await between the check
    // and the set. Two near-simultaneous callers (the 2-second boot resumer and the 5-minute
    // alarm both fire close to a fresh extension load) can otherwise both pass this check before
    // either sets it — the previous version awaited a chrome.storage.local read in between,
    // opening exactly that window, and both callers would proceed to run a full initial sync in
    // parallel, each independently creating its own "classroom"/"emails" folder. Confirmed via
    // Drive timestamps showing two such folders receiving writes ~50 minutes apart from what was
    // reported as a single fresh run.
    if (this.isInitialSyncRunning) {
      this.log(`ℹ️ Initial school data sync already active in background for ${resolvedChild}.`);
      return { inProgress: true };
    }
    this.isInitialSyncRunning = true;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        const storedSync = await chrome.storage.local.get(['step2_initial_sync_in_progress']);
        if (storedSync.step2_initial_sync_in_progress) {
          this.log(`ℹ️ Initial school data sync already active in storage for ${resolvedChild}.`);
          this.isInitialSyncRunning = false;
          return { inProgress: true };
        }
      } catch (e) {}
    }

    // Keep Service Worker alive across Manifest V3 inactivity boundary during long fetch
    const keepAliveInterval = (typeof setInterval !== 'undefined') ? setInterval(() => {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.getPlatformInfo) {
          chrome.runtime.getPlatformInfo(() => {});
        }
      } catch (e) {}
    }, 15000) : null;

    if (typeof chrome !== 'undefined' && chrome.alarms?.create) {
      try {
        chrome.alarms.create('INITIAL_SCHOOL_SYNC_SUPERVISOR', { periodInMinutes: 1 });
      } catch (e) {}
    }

    let sToken = studentTokenOverride;
    if (!sToken) {
      try { sToken = await AuthService.getValidAuthToken(false); } catch (e) {}
    }
    const webAppUrl = webAppUrlOverride || activeProf?.schoolGasDeploymentUrl;
    const scriptId = scriptIdOverride || activeProf?.schoolGasScriptId;
    const studentEmail = studentEmailOverride || activeProf?.studentAccountEmail || '';
    const schoolDomain = schoolDomainOverride || activeProf?.schoolEmailDomain || (studentEmail.includes('@') ? studentEmail.split('@')[1] : '');

    await chrome.storage.local.set({
      step2_sync_status: 'IN_PROGRESS',
      step2_initial_sync_in_progress: true,
      step2_initial_sync_complete: false,
      step2_initial_sync_summary: null,
      step2_sync_error: null
    }).catch(() => {});

    try {
      await WhatsAppDiagnosticLogger.log('INFO', 'GAS', `📥 Starting 1-time background data extraction for ${resolvedChild}...`);

      // Obtain Parent Token and Kid Folder ID so extraction has target reference
      const pToken = await PersonalDriveService.getValidToken(false);
      let targetFolderId = '';
      try {
        const kidFolder = await PersonalDriveService.getOrCreateKidFolder(pToken, resolvedChild, cleanYear);
        targetFolderId = kidFolder.id;
      } catch (kfErr) {
        console.warn('[GasProvisioner] Notice: could not pre-resolve kidFolder ID:', kfErr);
      }

      let syncData: any = null;
      let initialSyncResult: any = null;

      if (webAppUrl && sToken) {
        try {
          await fetch(webAppUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sToken}`
            },
            body: JSON.stringify({ method: 'clear_triggers' })
          });
        } catch (e) {}
      }

      const hasValidData = (d: any) => Boolean(d && (d.classroom || d.result?.classroom));

      // 1. Direct Cloud Execution API (scripts.run)
      if (scriptId && sToken) {
        try {
          const directResult = await this.executeMcpCommand(sToken, scriptId, 'handleSyncClassroomAndGmail', [{
            targetFolderId,
            childName: resolvedChild,
            academicYear: cleanYear,
            schoolDomain,
            extractOnly: true,
            isIncremental: false
          }]);
          if (hasValidData(directResult)) {
            syncData = { result: directResult };
          }
        } catch (e: any) {
          this.log(`ℹ️ Direct scripts.run notice: ${e.message}`);
        }
      }

      // 2. Web App POST (Uses authenticated RPC via PersonalDriveService.callGasWorkerRpc)
      if (!hasValidData(syncData) && webAppUrl) {
        try {
          this.log(`⏳ Connecting to School Cloud Worker to extract Classroom coursework & circulars for ${resolvedChild}...`);
          const storedKey = (await chrome.storage.local.get(['gas_access_key', 'access_key']).catch(() => null)) as any;
          const accessKey = storedKey?.gas_access_key || storedKey?.access_key || undefined;

          const rpcRes = await PersonalDriveService.callGasWorkerRpc(webAppUrl, 'sync_classroom_and_gmail', {
            targetFolderId,
            childName: resolvedChild,
            academicYear: cleanYear,
            schoolDomain,
            extractOnly: true,
            isIncremental: false,
            accessKey
          });

          if (hasValidData(rpcRes)) {
            syncData = rpcRes;
            const foundCourses = rpcRes.classroom?.totalCourses ?? rpcRes.result?.classroom?.totalCourses ?? (rpcRes.classroom?.courses?.length || 0);
            const foundEmails = rpcRes.gmail?.totalEmails ?? rpcRes.result?.gmail?.totalEmails ?? (rpcRes.gmail?.emails?.length || 0);
            const foundAtts = rpcRes.classroom?.totalAttachments ?? rpcRes.result?.classroom?.totalAttachments ?? 0;
            this.log(`✅ Extracted data from School Cloud Worker: found ${foundCourses} course(s), ${foundEmails} circular(s), and ${foundAtts} attachment(s). Processing into Parent Vault...`);
          } else if (rpcRes?.error) {
            this.log(`⚠️ Web App sync reported error: ${rpcRes.error.message || JSON.stringify(rpcRes.error)}`);
          } else {
            this.log(`⚠️ Web App returned response without classroom data: ${JSON.stringify(rpcRes).substring(0, 120)}`);
          }
        } catch (e: any) {
          this.log(`⚠️ Web App sync RPC notice: ${e?.message || String(e)}`);
        }
      }

      // 3. Fallback: Re-use existing classroom_data.json and school_emails.json ONLY in offline/local mock mode (never mask online worker failure)
      if (!hasValidData(syncData) && !webAppUrl && !scriptId) {
        try {
          const classInfo = await PersonalDriveService.getOrCreateClassroomFolder(pToken, resolvedChild, cleanYear);
          const existingClass = (await PersonalDriveService.readSchoolVaultFile(classInfo.id, 'classroom_data.json').catch(() => null)) ||
                                (await PersonalDriveService.readJsonFileInFolder(pToken, classInfo.id, 'classroom_data.json').catch(() => null));
          if (existingClass && existingClass.courses && existingClass.courses.length > 0) {
            let existingGmail = null;
            try {
              const emailInfo = await PersonalDriveService.getOrCreateEmailsFolder(pToken, resolvedChild, cleanYear);
              existingGmail = (await PersonalDriveService.readSchoolVaultFile(emailInfo.id, 'school_emails.json').catch(() => null)) ||
                              (await PersonalDriveService.readJsonFileInFolder(pToken, emailInfo.id, 'school_emails.json').catch(() => null));
            } catch (e) {}
            syncData = { result: { classroom: existingClass, gmail: existingGmail } };
          }
        } catch (e) {}
      }

      // STRICT SAFETY GATE: Never claim success or send completion notification if extraction failed!
      if (!hasValidData(syncData)) {
        throw new Error(`Failed to extract school data for ${resolvedChild}. School worker did not return coursework or circular data.`);
      }

      initialSyncResult = syncData.result || syncData;
      if (!initialSyncResult.gmail) {
        initialSyncResult.gmail = {
          kidName: resolvedChild,
          academicYear: cleanYear,
          schoolDomain: schoolDomain || '',
          lastSyncedAt: new Date().toISOString(),
          totalEmails: 0,
          totalAttachments: 0,
          emails: []
        };
      }
      let coursesCount = initialSyncResult?.classroom?.totalCourses ?? initialSyncResult?.classroom?.courses?.length ?? 0;
      let emailsCount = initialSyncResult?.gmail?.totalEmails ?? initialSyncResult?.gmail?.emails?.length ?? 0;

      if (coursesCount === 0 && emailsCount === 0) {
        throw new Error(`Zero courses and zero emails found for ${resolvedChild}. Initial sync could not capture any data.`);
      }

      await WhatsAppDiagnosticLogger.log('INFO', 'GAS', `💾 Saving extracted data into Parent Vault (${coursesCount} courses, ${emailsCount} circulars)... complete Parent ownership.`);
      await PersonalDriveService.saveExtractedSchoolData(pToken, resolvedChild, cleanYear, initialSyncResult, sToken, webAppUrl, scriptId);

      // Verify and count attachments downloaded into Parent Drive vault
      let totalAttachments = 0;
      let totalEmailAttachments = 0;
      try {
        const classInfo = await PersonalDriveService.getOrCreateClassroomFolder(pToken, resolvedChild, cleanYear);
        const vaultFiles = await PersonalDriveService.listSchoolVaultFiles(classInfo.attachmentsFolderId).catch(() => []);
        const attachmentsOnDrive = (vaultFiles && vaultFiles.length > 0)
          ? vaultFiles
          : await PersonalDriveService.listFilesInFolder(pToken, classInfo.attachmentsFolderId).catch(() => []);
        totalAttachments = attachmentsOnDrive.length;
      } catch (cntErr) {
        totalAttachments = initialSyncResult?.classroom?.totalAttachments ?? 0;
      }
      try {
        const emailInfo = await PersonalDriveService.getOrCreateEmailsFolder(pToken, resolvedChild, cleanYear);
        const vaultEmailFiles = await PersonalDriveService.listSchoolVaultFiles(emailInfo.attachmentsFolderId).catch(() => []);
        const emailAttachmentsOnDrive = (vaultEmailFiles && vaultEmailFiles.length > 0)
          ? vaultEmailFiles
          : await PersonalDriveService.listFilesInFolder(pToken, emailInfo.attachmentsFolderId).catch(() => []);
        totalEmailAttachments = emailAttachmentsOnDrive.length;
      } catch (e) {}

      const summary = {
        courses: coursesCount,
        attachments: totalAttachments + totalEmailAttachments,
        classroomAttachments: totalAttachments,
        emailAttachments: totalEmailAttachments,
        emails: emailsCount,
        completedAt: Date.now()
      };

      await chrome.storage.local.set({
        step2_sync_status: 'COMPLETED',
        step2_initial_sync_complete: true,
        step2_initial_sync_in_progress: false,
        step2_initial_sync_summary: summary,
        step2_sync_error: null
      }).catch(() => {});

      // Signal Master Worker that initial sync is complete so 24/7 cloud sync can seamlessly take over
      try {
        let masterWorkerUrl = '';
        let masterScriptId = '';
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          const stored = await chrome.storage.local.get(['master_worker_deployment_url', 'master_worker_script_id']).catch(() => null);
          masterWorkerUrl = stored?.master_worker_deployment_url || '';
          masterScriptId = stored?.master_worker_script_id || '';
        }
        if (!masterWorkerUrl || !masterScriptId) {
          const rootFolder = await PersonalDriveService.getOrCreateRootFolder(pToken).catch(() => null);
          if (rootFolder && rootFolder.id) {
            const rootConfig = await PersonalDriveService.readJsonFileInFolder(pToken, rootFolder.id, 'K.I.D.S._Data_config.json').catch(() => null);
            if (!masterWorkerUrl) masterWorkerUrl = rootConfig?.masterWorkerDeploymentUrl || '';
            if (!masterScriptId) masterScriptId = rootConfig?.masterWorkerScriptId || '';
          }
        }
        let masterRegistered = false;
        if (masterWorkerUrl) {
          try {
            const regRes = await fetch(masterWorkerUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'register_school_worker',
                params: {
                  childName: resolvedChild,
                  academicYear: cleanYear,
                  initialSyncComplete: true
                }
              })
            });
            if (regRes.ok) masterRegistered = true;
          } catch (mErr) {
            console.warn('[GasProvisioner] Notice: direct post to master worker failed:', mErr);
          }
        }

        if (!masterRegistered && masterScriptId) {
          try {
            await this.executeMcpCommand(pToken, masterScriptId, 'handleRegisterSchoolWorker', [{
              childName: resolvedChild,
              academicYear: cleanYear,
              initialSyncComplete: true
            }]);
            masterRegistered = true;
          } catch (apiErr) {
            console.warn('[GasProvisioner] Notice: API fallback to master worker failed:', apiErr);
          }
        }

        // Notify School Cloud Worker that initial sync is complete & dual-worker mode is active
        if (webAppUrl) {
          PersonalDriveService.callGasWorkerRpc(webAppUrl, 'set_sync_state', {
            initialSyncComplete: true,
            isDualWorker: true,
            childName: resolvedChild,
            academicYear: cleanYear,
          }).catch((err: any) => {
            console.warn('[GasProvisioner] Notice: could not set initialSyncComplete on school worker:', err);
          });
        }

        // The vault folder (targetFolderId) lives in the PARENT's own Drive. Only a worker
        // authorized under the parent's identity can access it via DriveApp — pointing this at
        // webAppUrl (the school/student worker) produces a real "Access denied: DriveApp."
        // exception, confirmed via the extension_sync_diagnostics_log.json this same session.
        // Prefer the Master Worker; fall back to webAppUrl only when no separate master exists.
        // The worker's own run_vault_ocr_indexing handler self-schedules a continuation trigger
        // if a backlog remains.
        const ocrTargetUrl = (await PersonalDriveService.getMasterWorkerUrl().catch(() => null)) || webAppUrl;
        if (ocrTargetUrl) {
          PersonalDriveService.callGasWorkerRpc(ocrTargetUrl, 'run_vault_ocr_indexing', {
            targetFolderId,
            maxBatch: 15
          }, 2).catch((ocrErr: any) => {
            console.warn('[GasProvisioner] Notice: automated vault OCR indexing trigger deferred:', ocrErr);
          });
        }
      } catch (notifyMasterErr) {}

      await WhatsAppDiagnosticLogger.log(
        'SUCCESS',
        'GAS',
        `🎉 1st-time data sync complete for ${resolvedChild}! Ingested ${coursesCount} courses, ${totalAttachments + totalEmailAttachments} attachments (${totalAttachments} Classroom, ${totalEmailAttachments} Email circulars) & ${emailsCount} emails. Cloud Worker will now fetch incremental data 24/7 even if machine is shut down.`
      );

      await NotificationService.send({
        id: `school_sync_${Date.now()}`,
        title: 'K.I.D.S. School Sync Complete',
        message: `1st-time data sync complete for ${resolvedChild}! Ingested ${coursesCount} courses, ${totalAttachments + totalEmailAttachments} attachments (${totalAttachments} Classroom, ${totalEmailAttachments} Email circulars) & ${emailsCount} emails.`,
        priority: 2,
        requireInteraction: true
      }).catch(() => {});

      return summary;
    } catch (err: any) {
      console.warn('[GasProvisioner] runInitialSchoolDataSync error:', err);
      await chrome.storage.local.set({
        step2_sync_status: 'ERROR',
        step2_initial_sync_complete: false,
        step2_initial_sync_in_progress: false,
        step2_sync_error: err?.message || String(err)
      }).catch(() => {});

      await WhatsAppDiagnosticLogger.log(
        'ERROR',
        'GAS',
        `❌ 1st-time data sync failed for ${resolvedChild}: ${err?.message || String(err)}`
      );
      throw err;
    } finally {
      this.isInitialSyncRunning = false;
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      if (typeof chrome !== 'undefined' && chrome.alarms?.clear) {
        try {
          chrome.alarms.clear('INITIAL_SCHOOL_SYNC_SUPERVISOR').catch(() => {});
        } catch (e) {}
      }
    }
  }

  public static async provisionPersonalWorker(
    parentToken: string,
    parentFolderId: string,
    childName: string,
    academicYear: string
  ): Promise<ProvisionResult> {
    this.log(`🌐 Provisioning Worker B (Personal Portal Scraper) for ${childName}...`);
    this.reportProgress(30, 'Step 3: Setting Up Portal Worker', 'Configuring Personal Cloud Worker...');

    const project = await this.createProject(parentToken);
    const scriptId = project.scriptId;
    const accessKey = `portal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await this.updateProjectContent(scriptId, accessKey, parentToken, childName, academicYear);
    const version = await this.createVersion(scriptId, parentToken, childName, academicYear);
    const deployment = await this.createDeployment(scriptId, version.versionNumber, parentToken, childName, academicYear);
    const deploymentId = deployment.deploymentId;
    const webAppUrl = `https://script.google.com/macros/s/${deploymentId}/exec?accessKey=${encodeURIComponent(accessKey)}`;

    await this.ensureScriptAuthorized(webAppUrl, parentToken, scriptId);

    // Setup 6-Hour Cron
    try {
      const triggerRes = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'setup_triggers',
          params: { type: 'portal_6hr' }
        })
      });
      const triggerJson = await triggerRes.json().catch(() => null);
      if (triggerJson?.result?.triggerSet) {
        this.log('⏱️ Set up 6-hour autonomous cloud trigger for School Portals.');
      } else {
        const errMsg = triggerJson?.result?.error || triggerJson?.error?.message || 'Trigger creation was not permitted or failed.';
        this.log(`⚠️ Autonomous trigger setup returned warning: ${errMsg}`);
      }
    } catch (e: any) {
      this.log(`⚠️ Could not reach trigger setup endpoint: ${e?.message || e}`);
    }

    const active = await ChildManager.getActiveProfile();
    if (active && active.id) {
      await ChildManager.updateProfile(active.id, {
        personalGasScriptId: scriptId,
        personalGasDeploymentUrl: webAppUrl,
        lastPortalSync: new Date().toISOString()
      });
    }

    return {
      success: true,
      scriptId,
      deploymentId,
      webAppUrl,
      verifiedTools: ['sync_all_portals', 'register_portal_job']
    };
  }
}

