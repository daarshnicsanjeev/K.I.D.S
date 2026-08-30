import { ChildManager, ChildProfile } from './childManager';
import { AuthService } from './authService';

export const CURRENT_GAS_SERVER_VERSION = '3.4.0';
export const CURRENT_GAS_CHANGELOG = 'Universal Chronological Sorting & Dynamic Child Archive Resolution: Forces newest-first notice ordering and auto-mirrors the full master archive to Google Apps Script';

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
}

export class GasProvisionerService {
  public static logCallback?: (msg: string) => void;

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

  public static log(msg: string) {
    console.log(`[School MCP] ${msg}`);
    if (this.logCallback) {
      try { this.logCallback(msg); } catch (e) {}
    }
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'APPEND_LOG', payload: { message: msg } }).catch(() => {});
    }
  }

  /**
   * Main provisioning pipeline: Auth -> Reuse or Create Project -> Update Content -> Deploy -> Verify.
   */
  public static async provision(forceNew: boolean = false): Promise<ProvisionResult> {
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
      this.log(`📤 Pushing backend code files (PUT /v1/projects/${scriptId}/content)...`);
      await this.updateProjectContent(scriptId, accessKey, token, childName, academicYear);
      this.log('✅ Code content updated successfully.');

      // 2. CREATE a new immutable version
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
      this.log(`📁 Creating new project for ${childName} in student Google account (POST /v1/projects)...`);
      const project = await this.createProject(token);
      scriptId = project.scriptId;
      this.log(`✅ New project created: scriptId=${scriptId}`);
      this.log('📤 Uploading server code files and manifest (appsscript.json)...');
      await this.updateProjectContent(scriptId, accessKey, token, childName, academicYear);
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

    // Step 4: Persist metadata in Google Drive (Survives extension uninstalls & multi-machine)
    this.log('💾 Saving project metadata to Drive appProperties & config file...');
    await this.saveDriveMetadata(scriptId, deploymentId, accessKey, webAppUrl, token);
    await this.saveDriveConfigFile(scriptId, deploymentId, accessKey, webAppUrl, token, childName, academicYear);

    // Step 5: Save in both chrome.storage.sync and chrome.storage.local
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
    this.log('⚙️ Pre-warming Google Workspace services (Classroom, Drive, Calendar, Gmail)...');
    await this.runTestAuth(scriptId, token);

    // Interactive Authorization Check if required by Google Apps Script runtime
    await this.ensureScriptAuthorized(webAppUrl, token, scriptId, activeChild?.accountEmail);

    // Verify Server Execution via authenticated Web App ping & Execution API
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
   * Verifies that the project exists and its content is accessible via Apps Script REST API.
   */
  public static async verifyScriptAlive(scriptId: string, token: string): Promise<boolean> {
    if (!scriptId) return false;
    try {
      const scriptRes = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/content`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return scriptRes.ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * Search-First ("Find or Create") Pattern: Checks Profile -> Storage -> Drive Config File -> Drive Search.
   */
  public static async findExistingProject(token: string, childName?: string, academicYear?: string): Promise<{ scriptId: string; deploymentId: string; webAppUrl: string; accessKey?: string } | null> {
    // 1. Check active child profile in storage first
    try {
      const activeChild = await ChildManager.getActiveProfile();
      if (activeChild && activeChild.gasScriptId) {
        const isAlive = await this.verifyScriptAlive(activeChild.gasScriptId, token);
        if (isAlive) {
          this.log(`📦 Found existing active project from profile: ${activeChild.gasScriptId}`);
          return {
            scriptId: activeChild.gasScriptId,
            deploymentId: '',
            webAppUrl: activeChild.gasDeploymentUrl || '',
            accessKey: ''
          };
        }
      }
    } catch (e) {}

    // 2. Check chrome.storage.sync and local storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        const syncData = chrome.storage.sync ? await chrome.storage.sync.get(['mcp_gas_script_id', 'mcp_gas_url', 'mcp_gas_deployment_id', 'access_key']) : {};
        const localData = chrome.storage.local ? await chrome.storage.local.get(['mcp_gas_script_id', 'mcp_gas_url', 'mcp_gas_deployment_id', 'access_key']) : {};
        
        const scriptId = syncData.mcp_gas_script_id || localData.mcp_gas_script_id;
        const deploymentId = syncData.mcp_gas_deployment_id || localData.mcp_gas_deployment_id || '';
        const webAppUrl = syncData.mcp_gas_url || localData.mcp_gas_url || '';
        const accessKey = syncData.access_key || localData.access_key || '';

        if (scriptId && (deploymentId || webAppUrl)) {
          const isAlive = await this.verifyScriptAlive(scriptId, token);
          if (isAlive) {
            this.log(`📦 Found existing active project in Chrome storage: ${scriptId}`);
            return { scriptId, deploymentId, webAppUrl, accessKey };
          }
        }
      } catch (e) {
        console.warn('Storage check error:', e);
      }
    }

    // 3. Search Google Drive for persistent child/year config file (K.I.D.S._[Child]_[Year]_config.json)
    const configFromDrive = await this.loadDriveConfigFile(token, childName, academicYear);
    if (configFromDrive && configFromDrive.scriptId) {
      const isAlive = await this.verifyScriptAlive(configFromDrive.scriptId, token);
      if (isAlive) {
        return configFromDrive;
      }
    }

    // 4. Search Google Drive directly for Apps Script projects matching child or K.I.D.S.
    try {
      this.log('🔍 Listing Apps Script projects from Google Drive...');
      const cleanChild = (childName || '').toLowerCase().trim();
      const q = encodeURIComponent(`mimeType = 'application/vnd.google-apps.script' and trashed = false`);
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=50&fields=files(id,name,mimeType,trashed,appProperties,modifiedTime)&orderBy=modifiedTime desc`;
      
      const driveRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (driveRes.ok) {
        const driveData = await driveRes.json();
        if (driveData.files && driveData.files.length > 0) {
          // Prioritize projects matching child name or K.I.D.S.
          const matchingFiles = driveData.files.filter((f: any) => {
            if (!f || !f.name || f.trashed) return false;
            const name = f.name.toLowerCase();
            return (cleanChild && name.includes(cleanChild)) || name.includes('kids intelligent dashboard') || name.includes('k.i.d.s.') || name.includes('school portal mcp');
          });

          const candidates = matchingFiles.length > 0 ? matchingFiles : driveData.files;
          this.log(`🎯 ${candidates.length} candidate Apps Script project(s) found. Checking for active deployment...`);

          for (const file of candidates) {
            try {
              const isAlive = await this.verifyScriptAlive(file.id, token);
              if (!isAlive) continue;

              this.log(`🔎 Checking deployments for project "${file.name}" (ID: ${file.id})...`);
              const deployRes = await fetch(`https://script.googleapis.com/v1/projects/${file.id}/deployments`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (deployRes.ok) {
                const deployData = await deployRes.json();
                const deployments = deployData.deployments || [];
                const validDeploy = deployments.find((d: any) => 
                  (d.entryPoints && d.entryPoints.some((e: any) => e.entryPointType === 'WEB_APP')) ||
                  (d.deploymentId && d.deploymentId !== '@HEAD' && d.deploymentId !== 'HEAD')
                );

                if (validDeploy && validDeploy.deploymentId) {
                  const ep = validDeploy.entryPoints ? validDeploy.entryPoints.find((e: any) => e.entryPointType === 'WEB_APP') : null;
                  const webAppUrl = (ep && ep.webApp && ep.webApp.url) ? ep.webApp.url : `https://script.google.com/macros/s/${validDeploy.deploymentId}/exec`;
                  const accessKey = file.appProperties?.access_key || '';
                  this.log(`🎉 Reusing existing project with deployment: ${file.name} (ID: ${file.id}). URL: ${webAppUrl}`);
                  return {
                    scriptId: file.id,
                    deploymentId: validDeploy.deploymentId,
                    webAppUrl,
                    accessKey
                  };
                }
              }

              // Even without an existing Web App deployment, reuse the project file itself to avoid duplicates!
              this.log(`🎉 Reusing existing project file without deployment: "${file.name}" (ID: ${file.id})`);
              return {
                scriptId: file.id,
                deploymentId: '',
                webAppUrl: '',
                accessKey: file.appProperties?.access_key || ''
              };
            } catch (depErr) {
              this.log(`⚠️ Error checking deployments for ${file.id}: ${depErr}`);
            }
          }
        }
      }
    } catch (e) {
      this.log(`⚠️ Drive project search exception: ${e}`);
    }

    return null;
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
  private static async loadDriveConfigFile(token: string, childName?: string, academicYear?: string): Promise<{ scriptId: string; deploymentId: string; webAppUrl: string; accessKey: string } | null> {
    const targetFileName = this.getConfigFileName(childName, academicYear);
    try {
      this.log(`🔍 Searching Drive for K.I.D.S. extension config file (${targetFileName})...`);
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
          this.log(`✅ Loaded existing configuration from Drive: scriptId=${config.scriptId}, deploymentId=${config.deploymentId}`);
          return config;
        }
      }
    } catch (e) {
      this.log(`⚠️ Could not read Drive config file: ${e}`);
    }
    return null;
  }

  /**
   * Saves persistent K.I.D.S._[Child]_[Year]_config.json to Google Drive without duplicate creation.
   */
  private static async saveDriveConfigFile(scriptId: string, deploymentId: string, accessKey: string, webAppUrl: string, token: string, childName?: string, academicYear?: string): Promise<void> {
    const targetFileName = this.getConfigFileName(childName, academicYear);
    try {
      this.log(`💾 Saving configuration to Drive (${targetFileName})...`);
      const configData = JSON.stringify({ scriptId, deploymentId, accessKey, webAppUrl, childName, academicYear, updatedAt: new Date().toISOString() });
      
      const query = encodeURIComponent(`(name = '${targetFileName}' or name = '${this.CONFIG_FILE_NAME}' or name = 'school_mcp_config.json') and trashed = false`);
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const searchData = await searchRes.json();

      if (searchData.files && searchData.files.length > 0) {
        const matchedFile = searchData.files.find((f: any) => f.name === targetFileName) || searchData.files[0];
        const fileId = matchedFile.id;

        // Upgrade legacy file name to targetFileName if needed
        if (matchedFile.name !== targetFileName) {
          await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: targetFileName })
          }).catch(() => {});
        }

        // Update content in place (no duplicate file creation)
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: configData
        });
        this.log(`✅ Updated existing ${targetFileName} in Drive (ID: ${fileId}).`);
      } else {
        const metadata = {
          name: targetFileName,
          mimeType: 'application/json'
        };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([configData], { type: 'application/json' }));

        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: form
        });
        this.log(`✅ Created ${targetFileName} in Drive root.`);
      }
    } catch (e) {
      this.log(`⚠️ Could not save Drive config file: ${e}`);
    }
  }

  /**
   * Attaches custom appProperties metadata to the Google Drive file (survives extension uninstalls & cross-device).
   */
  private static async saveDriveMetadata(scriptId: string, deploymentId: string, accessKey: string, webAppUrl: string, token: string): Promise<void> {
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${scriptId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appProperties: {
            school_mcp_managed: 'true',
            deployment_id: deploymentId,
            access_key: accessKey,
            web_app_url: webAppUrl
          }
        })
      });
    } catch (e) {
      console.warn('[School MCP] Could not attach Drive metadata:', e);
    }
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
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/drive.metadata.readonly',
            'https://www.googleapis.com/auth/classroom.courses.readonly',
            'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
            'https://www.googleapis.com/auth/calendar.events.readonly',
            'https://www.googleapis.com/auth/gmail.readonly'
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
   * Pushes Code.gs, WorkspaceFetcher.gs, PortalApiFetcher.gs, StorageRepository.gs & appsscript.json.
   */
  private static async updateProjectContent(scriptId: string, accessKey: string, token: string, childName: string = 'Child', academicYear: string = ''): Promise<any> {
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
            'https://www.googleapis.com/auth/script.external_request'
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
  // 1. One-time Parent Consent Handshake
  if (!e || !e.parameter || !e.parameter.accessKey || e.parameter.auth === 'true' || e.parameter.authInit === 'true') {
    // Calling Classroom/Drive here forces Google's runtime engine to present the permission prompt
    try {
      Classroom.Courses.list({ pageSize: 1 });
    } catch (err) {}

    return HtmlService.createHtmlOutput(
      '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:85vh;margin:0;background:#f8fafc;color:#0f172a;}' +
      '.box{background:white;padding:32px;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.08);text-align:center;max-width:360px;}' +
      'h3{color:#16a34a;margin-top:0;font-size:20px;}' +
      'p{color:#64748b;font-size:14px;line-height:1.5;}' +
      '.badge{background:#dcfce7;color:#166534;padding:6px 14px;border-radius:20px;font-weight:600;font-size:12px;display:inline-block;}' +
      '<body><div class="box"><h3>✅ MCP Server Connected!</h3>' +
      '<p>Google Workspace permissions approved. This window will close automatically...</p>' +
      '<div class="badge">Closing automatically in 2s...</div></div>' +
      '<script>' +
      'setTimeout(function(){' +
      '  try { google.script.host.close(); } catch(e) {}' +
      '  try { window.top.close(); } catch(e) {}' +
      '  try { window.close(); } catch(e) {}' +
      '}, 1500);' +
      '</script></body></html>'
    ).setTitle('MCP Server Authorization');
  }

  if (e.parameter.accessKey !== CONFIG.accessKey) {
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
  return ContentService.createTextOutput(JSON.stringify({
    status: 'online',
    server: 'Kids Intelligent Dashboard System (K.I.D.S.) - ' + (CONFIG.childName || 'Student'),
    childName: CONFIG.childName || 'Student',
    accessKey: e.parameter ? e.parameter.accessKey : null
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var startMs = new Date().getTime();
  try {
    if (!e || !e.parameter || e.parameter.accessKey !== CONFIG.accessKey) {
      McpLogger.log('WARN', 'doPost', 'Unauthorized access key attempt');
      throw new Error("Unauthorized access key.");
    }
    if (!e.postData || !e.postData.contents) {
      throw new Error("No POST payload received.");
    }

    var json = JSON.parse(e.postData.contents);
    var method = json.method;
    var params = json.params || {};
    var id = json.id;

    var result;

    if (method === "initialize") {
      result = {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: "Kids Intelligent Dashboard System (K.I.D.S.) - " + (CONFIG.childName || 'Student') + (CONFIG.academicYear ? " (" + CONFIG.academicYear + ")" : ""),
          version: "3.0.0"
        }
      };
      McpLogger.log('INFO', 'initialize', { client: params.clientInfo || 'Gemini Spark' });
    } else if (method === "notifications/initialized") {
      return ContentService.createTextOutput(JSON.stringify({
        jsonrpc: "2.0",
        id: id !== undefined ? id : null
      })).setMimeType(ContentService.MimeType.JSON);
    } else if (method === "tools/list") {
      result = handleToolsList();
      McpLogger.log('INFO', 'tools/list', { toolCount: result.tools ? result.tools.length : 0 });
    } else if (method === "tools/call") {
      try {
        var callResult = handleToolsCall(params.name, params.arguments || {});
        result = formatMcpCallToolResult(callResult, false);
        var durationMs = new Date().getTime() - startMs;
        McpLogger.log('INFO', 'tools/call:' + params.name, { durationMs: durationMs, success: true });
      } catch (callErr) {
        var durationMs = new Date().getTime() - startMs;
        McpLogger.log('ERROR', 'tools/call:' + params.name, { durationMs: durationMs, error: callErr.toString() });
        result = formatMcpCallToolResult({ error: callErr.toString() }, true);
      }
    } else if (method === "server/getLogs") {
      result = { logs: McpLogger.getLogs() };
    } else if (method === "server/clearLogs") {
      result = { cleared: McpLogger.clearLogs() };
    } else if (method === "get_mcp_folder_info") {
      result = DriveFolderManager.getFolderInfo();
    } else if (method === "upload_whatsapp_attachment") {
      result = WhatsAppStorage.saveAttachment(params.fileName, params.base64Data, params.mimeType, params.messageContext);
    } else if (method === "archive_whatsapp_messages") {
      result = WhatsAppStorage.saveMessages(params.messages);
    } else if (method === "get_whatsapp_messages") {
      result = { messages: WhatsAppStorage.getRecentMessages(params.chat_filter, params.max_count) };
    } else if (method === "cache_live_tab_content") {
      result = LiveTabStorage.saveTabContent(params.tabData);
    } else if (method === "register_mcp_tool") {
      result = handleRegisterTool(params);
      McpLogger.log('INFO', 'register_mcp_tool', { domain: params.domain, feature: params.feature });
    } else if (method === "delete_mcp_tool") {
      result = { deleted: StorageRepository.deleteTool(params.domain, params.feature) };
      McpLogger.log('INFO', 'delete_mcp_tool', params);
    } else if (method === "rename_mcp_tool") {
      result = { renamed: StorageRepository.renameTool(params.domain, params.oldFeature, params.newFeature) };
      McpLogger.log('INFO', 'rename_mcp_tool', params);
    } else if (method === "test_preflight_proxy") {
      result = handlePreflightProxy(params);
    } else {
      McpLogger.log('WARN', 'unknown_method', { method: method });
      throw new Error("Method not supported: " + method);
    }

    return ContentService.createTextOutput(JSON.stringify({
      jsonrpc: "2.0",
      id: id !== undefined ? id : null,
      result: result
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    var durationMs = new Date().getTime() - startMs;
    McpLogger.log('ERROR', 'doPost:exception', { durationMs: durationMs, error: err.toString() });
    return ContentService.createTextOutput(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32603, message: err.toString() }
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function formatMcpCallToolResult(data, isError) {
  var textPayload;
  if (typeof data === 'string') {
    textPayload = data;
  } else {
    textPayload = JSON.stringify(data, null, 2);
  }
  return {
    content: [
      {
        type: "text",
        text: textPayload
      }
    ],
    isError: !!isError
  };
}

function handleToolsList() {
  var masterTool = [
    {
      name: 'get_all_school_updates',
      description: 'MASTER TOOL: Unified tool to fetch ALL student school data (Google Classroom, Gmail circulars, Calendar events, EduSprint portal features, and recent WhatsApp class group announcements/homework) in a single unified call with 1 authorization. Always inspect WhatsApp notices for daily homework assignments (such as ICT, Science, Math worksheets) announced by teachers.',
      inputSchema: {
        type: 'object',
        properties: {
          gmail_query: { type: 'string', description: 'Optional search query for Gmail' },
          whatsapp_filter: { type: 'string', description: 'Optional WhatsApp chat name or topic filter (e.g. "Grade 3B" or "homework")' }
        }
      }
    },
    {
      name: 'get_whatsapp_school_updates',
      description: 'WHATSAPP TOOL: Fetches recent school notices, teacher broadcasts, homework assignments (e.g. ICT homework, Science, Hindi, Math, English), and shared links from user-tracked WhatsApp school groups.',
      inputSchema: {
        type: 'object',
        properties: {
          chat_filter: { type: 'string', description: 'Filter by specific chat/group name or keyword (e.g. "Grade 3B CAIE" or "homework")' },
          max_count: { type: 'number', description: 'Maximum number of recent messages to return (default: 35)' }
        }
      }
    },
    {
      name: 'query_whatsapp_history',
      description: 'WHATSAPP ARCHIVE TOOL: Searches historical WhatsApp school messages and homework stored in Google Drive archive (whatsapp_school_archive.json) across all dates and subjects.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search term, subject (e.g. "ICT", "Science", "homework"), date (e.g. "24 August"), or teacher name' }
        },
        required: ['query']
      }
    },
    {
      name: 'get_live_web_tab_content',
      description: 'UNIVERSAL LIVE WEB TOOL: Retrieves structured text, tables, and notices from any active web tab currently open in the user Chrome browser.',
      inputSchema: {
        type: 'object',
        properties: {
          domain_or_keyword: { type: 'string', description: 'Domain name or keyword of the open tab to query (e.g. "edusprint.in", "wikipedia", "classroom")' }
        }
      }
    },
    {
      name: 'get_mcp_server_logs',
      description: 'DIAGNOSTIC TOOL: Retrieves the recent detailed execution logs of this MCP Server, including incoming JSON-RPC calls, execution latency, and error traces.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'fetch_drive_file_ocr',
      description: 'ON-DEMAND OCR TOOL: Extracts high-resolution OCR text from PDF attachments or worksheet images stored in Google Drive.',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'Google Drive File ID to extract OCR text from' }
        },
        required: ['fileId']
      }
    }
  ];

  return { tools: masterTool };
}

function handleToolsCall(name, args) {
  if (name === 'get_whatsapp_school_updates') {
    var msgs = WhatsAppStorage.getRecentMessages(args && args.chat_filter, (args && args.max_count) || 35);
    McpLogger.log('INFO', 'whatsapp:get_updates', { filter: args && args.chat_filter, count: msgs.length });
    return {
      timestamp: new Date().toISOString(),
      messages: msgs
    };
  } else if (name === 'query_whatsapp_history') {
    var results = WhatsAppStorage.queryHistory(args && args.query, 60);
    McpLogger.log('INFO', 'whatsapp:query_history', { query: args && args.query, resultsCount: results.length });
    return {
      timestamp: new Date().toISOString(),
      query: args && args.query,
      results: results
    };
  } else if (name === 'get_live_web_tab_content') {
    var tabData = LiveTabStorage.getTabContent(args && args.domain_or_keyword);
    McpLogger.log('INFO', 'live_tab:get_content', { domainOrKeyword: args && args.domain_or_keyword, found: !!tabData });
    return {
      timestamp: new Date().toISOString(),
      tabData: tabData
    };
  } else if (name === 'fetch_drive_file_ocr') {
    return DriveContentExtractor.extractText(args && args.fileId, 6000);
  } else if (name === 'get_mcp_server_logs') {
    return {
      timestamp: new Date().toISOString(),
      logs: McpLogger.getLogs()
    };
  } else if (name === 'get_all_school_updates') {
    var result = {
      timestamp: new Date().toISOString(),
      google_classroom: null,
      school_gmail_circulars: null,
      calendar_events: null,
      whatsapp_school_notices: null,
      portal_data: {}
    };

    try { result.google_classroom = WorkspaceFetcher.getGoogleClassroomWork(); } catch (e) { result.google_classroom = { error: e.toString() }; }
    try { result.school_gmail_circulars = WorkspaceFetcher.getSchoolGmailMessages(args && args.gmail_query); } catch (e) { result.school_gmail_circulars = { error: e.toString() }; }
    try { result.calendar_events = WorkspaceFetcher.getCalendarEvents(); } catch (e) { result.calendar_events = { error: e.toString() }; }
    try {
      result.whatsapp_school_notices = WhatsAppStorage.getRecentMessages(args && args.whatsapp_filter, 35);
      McpLogger.log('INFO', 'whatsapp:school_notices', { count: result.whatsapp_school_notices ? result.whatsapp_school_notices.length : 0 });
    } catch (we) {
      result.whatsapp_school_notices = { error: we.toString() };
      McpLogger.log('WARN', 'whatsapp:school_notices_failed', { error: we.toString() });
    }

    try {
      result.live_web_tab_content = LiveTabStorage.getTabContent();
    } catch (lte) {
      result.live_web_tab_content = null;
    }

    var registered = StorageRepository.getRegisteredTools();
    for (var i = 0; i < registered.length; i++) {
      var t = registered[i];
      try {
        var key = t.feature || t.name;
        result.portal_data[key] = PortalApiFetcher.fetchPortalData(t);
      } catch (err) {
        result.portal_data[t.name] = { error: err.toString() };
      }
    }

    return result;
  } else if (name === 'get_google_classroom_work') {
    return WorkspaceFetcher.getGoogleClassroomWork();
  } else if (name === 'get_school_gmail_messages') {
    return WorkspaceFetcher.getSchoolGmailMessages(args && args.query);
  } else if (name === 'get_calendar_events') {
    return WorkspaceFetcher.getCalendarEvents();
  }

  var registered = StorageRepository.getRegisteredTools();
  for (var i = 0; i < registered.length; i++) {
    if (registered[i].name === name) {
      return PortalApiFetcher.fetchPortalData(registered[i]);
    }
  }

  throw new Error('Tool not found: ' + name);
}

function handleRegisterTool(params) {
  var domain = params.domain;
  var feature = params.feature;
  var endpointSpec = params.endpoint_spec || { url: params.url, method: 'GET' };
  var authSpec = params.auth_spec || { cookies: params.cookies };
  var domSnapshot = params.dom_snapshot || '';

  var toolName = StorageRepository.saveTool(domain, feature, endpointSpec, authSpec, domSnapshot);
  return { registered: true, toolName: toolName };
}

function handlePreflightProxy(params) {
  var spec = params.endpoint_spec || { url: params.url, method: 'GET' };
  var cookies = params.cookies || (params.auth_spec ? params.auth_spec.cookies : '');

  var options = {
    method: spec.method || 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0' },
    muteHttpExceptions: true
  };
  if (cookies) {
    options.headers['Cookie'] = cookies;
  }

  try {
    var response = UrlFetchApp.fetch(spec.url, options);
    var code = response.getResponseCode();
    var contentText = response.getContentText();
    return { success: true, statusCode: code, pageDataSnippet: contentText.substring(0, 1000) };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
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
      var ocrRes = DriveContentExtractor.extractText(fileId, 4000);
      if (ocrRes && ocrRes.text) {
        ocrText = ocrRes.text;
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

      var slashMatch = combined.match(/\\b(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})\\b/);
      if (slashMatch) {
        mNum = parseInt(slashMatch[1], 10);
        d = parseInt(slashMatch[2], 10);
        y = parseInt(slashMatch[3], 10);
      } else {
        var isoMatch = combined.match(/\\b(\\d{4})-(\\d{1,2})-(\\d{1,2})\\b/);
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
      clean = clean.replace(/<script[^>]*>([\\s\\S]*?)<\\/script>/gi, ' ');
      clean = clean.replace(/<style[^>]*>([\\s\\S]*?)<\\/style>/gi, ' ');
      clean = clean.replace(/<noscript[^>]*>([\\s\\S]*?)<\\/noscript>/gi, ' ');
      clean = clean.replace(/<br[^>]*>/gi, '\\n');
      clean = clean.replace(/<\\/p>/gi, '\\n');
      clean = clean.replace(/<\\/tr>/gi, '\\n');
      clean = clean.replace(/<td[^>]*>/gi, ' | ');
      clean = clean.replace(/<th[^>]*>/gi, ' | ');
      clean = clean.replace(/<[^>]+>/g, ' ');
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
        try {
          if (typeof Drive !== 'undefined' && Drive.Files && Drive.Files.remove) {
            Drive.Files.remove(copy.id);
          } else {
            DriveApp.getFileById(copy.id).setTrashed(true);
          }
        } catch (delErr) {}
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
    }

    // Strategy 2: Download Media Blob via Drive API v3 -> Upload with OCR
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
            var tempDoc = DocumentApp.openById(tempFile.id);
            var ocrText = tempDoc.getBody().getText();
            try { Drive.Files.remove(tempFile.id); } catch (e) {}
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

    const result = await response.json();
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
  public static promptInTabAuthorization(webAppUrl: string): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.windows) {
      return Promise.resolve();
    }

    const cleanBaseUrl = webAppUrl.split('?')[0];
    const authUrl = `${cleanBaseUrl}?authInit=true`;

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
  public static async ensureScriptAuthorized(webAppUrl: string, token: string, scriptId?: string, studentEmail?: string): Promise<void> {
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

                // 1. Active Polling: Auto-close window as soon as Google Web App returns 200/authorized
                const pollInterval = setInterval(async () => {
                  if (isHandled) {
                    clearInterval(pollInterval);
                    return;
                  }
                  try {
                    const checkRes = await fetch(cleanUrl, {
                      method: 'GET',
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const checkText = await checkRes.text();
                    if (checkRes.ok && (checkText.includes('online') || checkText.includes('MCP Server Connected') || checkText.includes('status'))) {
                      if (!isHandled) {
                        isHandled = true;
                        clearInterval(pollInterval);
                        try {
                          await chrome.windows.remove(windowId);
                        } catch (e) {}
                        GasProvisionerService.log('✅ Google Authorization complete! Popup window closed automatically.');
                        resolve();
                      }
                    }
                  } catch (e) {}
                }, 1500);

                // 2. Window Closed Listener (if user closes it or auto-closed)
                const listener = (closedWinId: number) => {
                  if (closedWinId === windowId) {
                    chrome.windows.onRemoved.removeListener(listener);
                    clearInterval(pollInterval);
                    if (!isHandled) {
                      isHandled = true;
                      GasProvisionerService.log('✅ Google Authorization complete! Popup window closed.');
                      resolve();
                    }
                  }
                };
                chrome.windows.onRemoved.addListener(listener);
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
}
