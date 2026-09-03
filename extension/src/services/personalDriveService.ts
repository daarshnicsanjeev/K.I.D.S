import { ChildManager, ChildProfile } from './childManager';
import { WhatsAppDiagnosticLogger } from './whatsappLogger';
import { WhatsAppExportParser, ParsedWhatsAppExport } from './whatsAppExportParser';
import { AiNormalizerService } from './aiNormalizer';
import { SyncLifecycleManager } from './syncLifecycleManager';

export interface PersonalDriveFolderInfo {
  isCreated: boolean;
  accountEmail: string;
  folderId?: string;
  folderName: string;
  folderUrl?: string;
  childFolderId?: string;
  childFolderName?: string;
}

export class PersonalDriveService {
  private static FOLDER_NAME = 'K.I.D.S. Data';
  private static ARCHIVE_FILE_NAME = 'archive.json';
  private static MANIFEST_FILE_NAME = 'K.I.D.S._groups_manifest.json';

  /**
   * Prompts user to authenticate/select their Personal Google Account.
   */
  public static async authenticatePersonalAccount(): Promise<{ token: string; email: string }> {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.identity) {
        return reject(new Error('chrome.identity API is not available.'));
      }

      const manifest = chrome.runtime.getManifest();
      const clientId = manifest.oauth2?.client_id;
      if (!clientId) {
        return reject(new Error('OAuth Client ID is missing in manifest.json.'));
      }

      const redirectUri = chrome.identity.getRedirectURL();
      const scopes = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.readonly'
      ].join(' ');

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&response_type=token` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&prompt=select_account`;

      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (responseUrl) => {
        if (chrome.runtime.lastError || !responseUrl) {
          const err = chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Authentication cancelled.';
          return reject(new Error(err));
        }

        try {
          const urlParams = new URLSearchParams(new URL(responseUrl).hash.substring(1));
          const token = urlParams.get('access_token');
          if (!token) {
            return reject(new Error('No access token returned by Google Sign-In.'));
          }

          // Fetch user profile info
          const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const info = await res.json();
          const email = info.email || 'Personal Google Account';
          
          await chrome.storage.local.set({
            personal_drive_account_email: email,
            personal_drive_auth_token: token,
            personal_drive_connected: true
          });

          // Also update active child profile with account email
          const active = await ChildManager.getActiveProfile();
          if (active) {
            await ChildManager.updateProfile(active.id, { accountEmail: email });
          }

          resolve({ token, email });
        } catch (e: any) {
          reject(new Error(`Failed to retrieve profile: ${e.message}`));
        }
      });
    });
  }

  /**
   * Retrieves a valid OAuth token, silently refreshing via launchWebAuthFlow if expired.
   */
  public static async getValidToken(forceRefresh = false): Promise<string> {
    const state = await chrome.storage.local.get(['personal_drive_auth_token', 'personal_drive_account_email']);
    if (state.personal_drive_auth_token && !forceRefresh) {
      return state.personal_drive_auth_token;
    }

    const manifest = chrome.runtime.getManifest();
    const clientId = manifest.oauth2?.client_id;
    if (!clientId) {
      throw new Error('OAuth Client ID is missing in manifest.json.');
    }

    const redirectUri = chrome.identity.getRedirectURL();
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly'
    ].join(' ');

    const savedEmail = state.personal_drive_account_email;
    let authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}`;

    if (savedEmail) {
      authUrl += `&login_hint=${encodeURIComponent(savedEmail)}`;
    }

    return new Promise((resolve, reject) => {
      // 1. Attempt 100% silent background refresh without any UI
      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: false }, async (responseUrl) => {
        if (!chrome.runtime.lastError && responseUrl) {
          try {
            const urlParams = new URLSearchParams(new URL(responseUrl).hash.substring(1));
            const token = urlParams.get('access_token');
            if (token) {
              await chrome.storage.local.set({ personal_drive_auth_token: token, personal_drive_connected: true });
              return resolve(token);
            }
          } catch (e) {}
        }

        // 2. If silent refresh requires consent, use remembered login_hint without prompt=select_account
        const interactiveUrl = savedEmail ? authUrl : `${authUrl}&prompt=select_account`;
        chrome.identity.launchWebAuthFlow({ url: interactiveUrl, interactive: true }, async (intUrl) => {
          if (chrome.runtime.lastError || !intUrl) {
            return reject(new Error('Google Drive authorization required. Please reconnect your account.'));
          }
          try {
            const urlParams = new URLSearchParams(new URL(intUrl).hash.substring(1));
            const token = urlParams.get('access_token');
            if (token) {
              await chrome.storage.local.set({ personal_drive_auth_token: token, personal_drive_connected: true });
              return resolve(token);
            }
            reject(new Error('No access token returned by Google Sign-In.'));
          } catch (e: any) {
            reject(new Error(`Failed to parse auth token: ${e.message}`));
          }
        });
      });
    });
  }

  /**
   * Authenticated fetch helper with automatic 401 retry and silent token refresh.
   */
  public static async fetchWithAuth(url: string, init: RequestInit = {}, tokenOverride?: string): Promise<Response> {
    let token = tokenOverride || await this.getValidToken(false);

    const makeRequest = (t: string) => {
      const headers = new Headers(init.headers || {});
      headers.set('Authorization', `Bearer ${t}`);
      return fetch(url, { ...init, headers });
    };

    let res = await makeRequest(token);
    if (res.status === 401) {
      console.warn('[PersonalDriveService] Received HTTP 401 from Google Drive. Silently refreshing OAuth access token...');
      try {
        token = await this.getValidToken(true);
        res = await makeRequest(token);
      } catch (refreshErr) {
        console.warn('[PersonalDriveService] Token refresh failed:', refreshErr);
      }
    }
    return res;
  }

  /**
   * Resolves child name for scoped folder and artifact naming.
   */
  private static async resolveChildName(childName?: string): Promise<string> {
    if (childName && childName.trim()) {
      return ChildManager.sanitizeName(childName);
    }
    try {
      const active = await ChildManager.getActiveProfile();
      return (active && active.name) ? (ChildManager.sanitizeName(active.name) || 'Child_1') : 'Child_1';
    } catch (e) {
      return 'Child_1';
    }
  }

  /**
   * Retrieves existing Personal Drive folder info for the given child.
   */
  public static async getPersonalFolderInfo(token?: string, childName?: string): Promise<PersonalDriveFolderInfo> {
    const state = await chrome.storage.local.get(['personal_drive_account_email', 'personal_drive_folder_id']);
    const email = state.personal_drive_account_email || '';
    const resolvedChild = await this.resolveChildName(childName);

    let rootFolderId = state.personal_drive_folder_id;
    let rootFolderUrl = '';

    if (rootFolderId) {
      try {
        const res = await this.fetchWithAuth(
          `https://www.googleapis.com/drive/v3/files/${rootFolderId}?fields=id,name,webViewLink,trashed`,
          {},
          token
        );
        if (res.ok) {
          const data = await res.json();
          if (!data.trashed) {
            rootFolderUrl = data.webViewLink;
          } else {
            rootFolderId = undefined;
          }
        }
      } catch (e) {
        rootFolderId = undefined;
      }
    }

    // Check root folder by name if not found
    if (!rootFolderId) {
      try {
        const q = encodeURIComponent(`name = '${this.FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
        const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)`, {}, token);
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.files && searchData.files.length > 0) {
            rootFolderId = searchData.files[0].id;
            rootFolderUrl = searchData.files[0].webViewLink;
            await chrome.storage.local.set({ personal_drive_folder_id: rootFolderId });
          }
        }
      } catch (e) {}
    }

    if (!rootFolderId) {
      return {
        isCreated: false,
        accountEmail: email,
        folderName: this.FOLDER_NAME
      };
    }

    // Search for child subfolder inside root folder
    try {
      const childQ = encodeURIComponent(`name = '${resolvedChild}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
      const childSearchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${childQ}&fields=files(id,name,webViewLink)`, {}, token);
      if (childSearchRes.ok) {
        const childData = await childSearchRes.json();
        if (childData.files && childData.files.length > 0) {
          return {
            isCreated: true,
            accountEmail: email,
            folderId: rootFolderId,
            folderName: this.FOLDER_NAME,
            folderUrl: rootFolderUrl,
            childFolderId: childData.files[0].id,
            childFolderName: childData.files[0].name
          };
        }
      }
    } catch (e) {}

    return {
      isCreated: true,
      accountEmail: email,
      folderId: rootFolderId,
      folderName: this.FOLDER_NAME,
      folderUrl: rootFolderUrl
    };
  }

  /**
   * Gets or creates the root folder on Personal Google Drive.
   */
  public static async getOrCreateRootFolder(token?: string): Promise<{ id: string; webViewLink?: string }> {
    const validToken = token || await this.getValidToken(false);
    const existing = await this.getPersonalFolderInfo(validToken);
    if (existing.isCreated && existing.folderId) {
      return { id: existing.folderId, webViewLink: existing.folderUrl };
    }

    await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `[DRIVE_ROOT_CREATE] Creating root folder "${this.FOLDER_NAME}" on Google Drive...`);

    // Create root folder on Personal Drive
    const res = await this.fetchWithAuth(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
          description: 'Personal Google Drive School Intelligence Archive (Private Parent Storage)'
        })
      },
      validToken
    );

    if (!res.ok) {
      const err = await res.text();
      await WhatsAppDiagnosticLogger.log('ERROR', 'DRIVE', `[DRIVE_ROOT_ERROR] Failed to create root folder: HTTP ${res.status} | ${err}`);
      throw new Error(`Failed to create personal Drive root folder: HTTP ${res.status}`);
    }

    const created = await res.json();
    await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `[DRIVE_ROOT_SUCCESS] Created root folder "${this.FOLDER_NAME}" (ID: ${created.id})`);
    await chrome.storage.local.set({ personal_drive_folder_id: created.id });
    return { id: created.id, webViewLink: created.webViewLink };
  }

  /**
   * Gets or creates a subfolder inside a given parent folder.
   */
  public static async getOrCreateSubfolder(token: string, folderName: string, parentId: string, description?: string): Promise<{ id: string; webViewLink?: string }> {
    const q = encodeURIComponent(`name = '${folderName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)`, {}, token);

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return { id: data.files[0].id, webViewLink: data.files[0].webViewLink };
      }
    }

    const res = await this.fetchWithAuth(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
          description: description || `Folder for ${folderName}`
        })
      },
      token
    );

    if (!res.ok) {
      throw new Error(`Failed to create subfolder "${folderName}": HTTP ${res.status}`);
    }

    const created = await res.json();
    return { id: created.id, webViewLink: created.webViewLink };
  }

  /**
   * Helper to write or update a JSON file inside a specific Google Drive folder.
   */
  public static async saveJsonFileInFolder(token: string, folderId: string, fileName: string, data: any): Promise<string> {
    const payload = JSON.stringify(data, null, 2);
    const q = encodeURIComponent(`name = '${fileName}' and '${folderId}' in parents and trashed = false`);
    const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {}, token);

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const fileId = searchData.files[0].id;
        await this.fetchWithAuth(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        }, token);
        return fileId;
      }
    }

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;
    const metadata = { name: fileName, mimeType: 'application/json', parents: [folderId] };
    const multipartBody = delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: application/json\r\n\r\n' + payload + closeDelimiter;

    const createRes = await this.fetchWithAuth('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipartBody
    }, token);

    const created = await createRes.json();
    return created.id;
  }

  /**
   * Helper to read and parse a JSON file from a specific Google Drive folder.
   */
  public static async readJsonFileInFolder(token: string, folderId: string, fileName: string): Promise<any | null> {
    const q = encodeURIComponent(`name = '${fileName}' and '${folderId}' in parents and trashed = false`);
    const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {}, token);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    if (!searchData.files || searchData.files.length === 0) return null;

    const fileId = searchData.files[0].id;
    const contentRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {}, token);
    if (!contentRes.ok) return null;
    return await contentRes.json();
  }

  /**
   * Tier 1: Gets or creates Academic Year folder under K.I.D.S. Data.
   */
  public static async getOrCreateYearFolder(token: string, academicYear?: string): Promise<{ id: string; webViewLink?: string; rootId: string; year: string }> {
    const rootFolder = await this.getOrCreateRootFolder(token);
    let year = academicYear;
    if (!year) {
      const activeProf = await ChildManager.getActiveProfile();
      year = (activeProf && activeProf.academicYear) ? activeProf.academicYear : ChildManager.getCalculatedAcademicYears().current;
    }
    const yearFolder = await this.getOrCreateSubfolder(token, year, rootFolder.id, `K.I.D.S. Academic Year ${year}`);
    return { id: yearFolder.id, webViewLink: yearFolder.webViewLink, rootId: rootFolder.id, year };
  }

  /**
   * Tier 2: Gets or creates Kid folder under Academic Year folder.
   */
  public static async getOrCreateKidFolder(token: string, childName?: string, academicYear?: string): Promise<{ id: string; webViewLink?: string; rootId: string; yearFolderId: string; kidName: string; year: string }> {
    const yearInfo = await this.getOrCreateYearFolder(token, academicYear);
    const resolvedChild = await this.resolveChildName(childName);
    const kidFolder = await this.getOrCreateSubfolder(token, resolvedChild, yearInfo.id, `K.I.D.S. Profile for ${resolvedChild} (${yearInfo.year})`);
    return {
      id: kidFolder.id,
      webViewLink: kidFolder.webViewLink,
      rootId: yearInfo.rootId,
      yearFolderId: yearInfo.id,
      kidName: resolvedChild,
      year: yearInfo.year
    };
  }

  /**
   * Backwards compatible alias for getOrCreateKidFolder.
   */
  public static async getOrCreatePersonalFolder(token?: string, childName?: string, academicYear?: string): Promise<{ id: string; webViewLink?: string; rootId: string; yearFolderId: string; kidFolderId: string }> {
    const validToken = token || await this.getValidToken(false);
    const kidInfo = await this.getOrCreateKidFolder(validToken, childName, academicYear);
    return {
      id: kidInfo.id,
      webViewLink: kidInfo.webViewLink,
      rootId: kidInfo.rootId,
      yearFolderId: kidInfo.yearFolderId,
      kidFolderId: kidInfo.id
    };
  }

  /**
   * Tier 3A: Gets or creates portal_tools folder under Kid folder.
   */
  public static async getOrCreatePortalToolsFolder(token: string, childName?: string, academicYear?: string): Promise<{ id: string; webViewLink?: string; kidFolderId: string }> {
    const kidInfo = await this.getOrCreateKidFolder(token, childName, academicYear);
    const portalFolder = await this.getOrCreateSubfolder(token, 'portal_tools', kidInfo.id, `Portal Tools Configuration for ${kidInfo.kidName}`);
    return { id: portalFolder.id, webViewLink: portalFolder.webViewLink, kidFolderId: kidInfo.id };
  }

  /**
   * Gets or creates a dedicated per-domain portal folder with an attachments subfolder.
   */
  public static async getOrCreateDomainPortalFolder(token: string, childName: string, academicYear: string, domain: string): Promise<{ domainFolderId: string; attachmentsFolderId: string; webViewLink?: string }> {
    const portalInfo = await this.getOrCreatePortalToolsFolder(token, childName, academicYear);
    const cleanDomain = domain.toLowerCase().replace(/[^a-z0-9.-]/g, '_');
    const domFolder = await this.getOrCreateSubfolder(token, cleanDomain, portalInfo.id, `Portal Archive for ${cleanDomain}`);
    const attachFolder = await this.getOrCreateSubfolder(token, 'attachments', domFolder.id, `Attachments for ${cleanDomain}`);
    return { domainFolderId: domFolder.id, attachmentsFolderId: attachFolder.id, webViewLink: domFolder.webViewLink };
  }

  /**
   * Tier 3B: Gets or creates messaging_tools folder under Kid folder.
   */
  public static async getOrCreateMessagingToolsFolder(token: string, childName?: string, academicYear?: string): Promise<{ id: string; webViewLink?: string; kidFolderId: string }> {
    const kidInfo = await this.getOrCreateKidFolder(token, childName, academicYear);
    const msgFolder = await this.getOrCreateSubfolder(token, 'messaging_tools', kidInfo.id, `Messaging Tools & Chat Archives for ${kidInfo.kidName}`);
    return { id: msgFolder.id, webViewLink: msgFolder.webViewLink, kidFolderId: kidInfo.id };
  }

  /**
   * Tier 3C: Gets or creates classroom folder and attachments subfolder under Kid folder.
   */
  public static async getOrCreateClassroomFolder(token: string, childName?: string, academicYear?: string): Promise<{ id: string; attachmentsFolderId: string; webViewLink?: string; kidFolderId: string }> {
    const kidInfo = await this.getOrCreateKidFolder(token, childName, academicYear);
    const classFolder = await this.getOrCreateSubfolder(token, 'classroom', kidInfo.id, `Google Classroom Coursework for ${kidInfo.kidName}`);
    const attachFolder = await this.getOrCreateSubfolder(token, 'attachments', classFolder.id, `Classroom Worksheets & Attachments for ${kidInfo.kidName}`);
    return { id: classFolder.id, attachmentsFolderId: attachFolder.id, webViewLink: classFolder.webViewLink, kidFolderId: kidInfo.id };
  }

  /**
   * Tier 3D: Gets or creates emails folder and attachments subfolder under Kid folder.
   */
  public static async getOrCreateEmailsFolder(token: string, childName?: string, academicYear?: string): Promise<{ id: string; attachmentsFolderId: string; webViewLink?: string; kidFolderId: string }> {
    const kidInfo = await this.getOrCreateKidFolder(token, childName, academicYear);
    const emailsFolder = await this.getOrCreateSubfolder(token, 'emails', kidInfo.id, `School Circular Emails for ${kidInfo.kidName}`);
    const attachFolder = await this.getOrCreateSubfolder(token, 'attachments', emailsFolder.id, `Email Circular Attachments for ${kidInfo.kidName}`);
    return { id: emailsFolder.id, attachmentsFolderId: attachFolder.id, webViewLink: emailsFolder.webViewLink, kidFolderId: kidInfo.id };
  }

  /**
   * Tier 4: Gets or creates profile folder and uploads Child Photo.
   */
  public static async uploadChildPhoto(token: string, childName: string, academicYear: string, photoDataUrl: string): Promise<{ fileId: string; photoUrl: string } | null> {
    try {
      const kidInfo = await this.getOrCreateKidFolder(token, childName, academicYear);
      const profileFolder = await this.getOrCreateSubfolder(token, 'profile', kidInfo.id, `Profile and Reference Photo for ${kidInfo.kidName}`);

      const fileName = `${kidInfo.kidName}_photo.jpg`;
      const base64Data = photoDataUrl.includes(',') ? photoDataUrl.split(',')[1] : photoDataUrl;
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadata = {
        name: fileName,
        mimeType: 'image/jpeg',
        parents: [profileFolder.id]
      };

      // Search for existing photo in folder
      const q = encodeURIComponent(`name = '${fileName}' and '${profileFolder.id}' in parents and trashed = false`);
      const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,webViewLink)`, {}, token);
      let existingFileId = null;
      if (searchRes.ok) {
        const sData = await searchRes.json();
        if (sData.files && sData.files.length > 0) existingFileId = sData.files[0].id;
      }

      if (existingFileId) {
        const updateRes = await this.fetchWithAuth(
          `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'image/jpeg' },
            body: bytes
          },
          token
        );
        if (updateRes.ok) {
          const upData = await updateRes.json();
          return { fileId: existingFileId, photoUrl: upData.webViewLink || '' };
        }
      } else {
        const multipartBody = new Blob([
          delimiter,
          'Content-Type: application/json; charset=UTF-8\r\n\r\n',
          JSON.stringify(metadata),
          delimiter,
          'Content-Type: image/jpeg\r\n\r\n',
          bytes,
          closeDelimiter
        ]);

        const uploadRes = await this.fetchWithAuth(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
            body: multipartBody
          },
          token
        );

        if (uploadRes.ok) {
          const createData = await uploadRes.json();
          return { fileId: createData.id, photoUrl: createData.webViewLink || '' };
        }
      }
    } catch (e) {
      console.warn('[PersonalDriveService] Failed to upload child photo to Drive:', e);
    }
    return null;
  }

  /**
   * Shares the child's folder with the student's Google account (role: writer).
   */
  public static async shareFolderWithStudentAccount(token: string, folderId: string, studentEmail: string): Promise<any> {
    const url = `https://www.googleapis.com/drive/v3/files/${folderId}/permissions?sendNotificationEmail=false`;
    const res = await this.fetchWithAuth(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'writer',
          type: 'user',
          emailAddress: studentEmail
        })
      },
      token
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to grant folder write permissions to ${studentEmail}: ${err}`);
    }
    return await res.json();
  }

  /**
   * Retrieves Google Drive storage quota and computes K.I.D.S. Data folder usage.
   */
  public static async getStorageQuotaInfo(token?: string): Promise<{
    limitBytes: number;
    usageBytes: number;
    limitReadable: string;
    usageReadable: string;
    percentUsed: number;
    kidsDataUsageBytes: number;
    kidsDataUsageReadable: string;
    kidsDataPercentOfQuota: number;
  }> {
    const validToken = token || await this.getValidToken(false);
    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    let limitBytes = 15 * 1024 * 1024 * 1024; // Default 15 GB
    let usageBytes = 0;

    try {
      const aboutRes = await this.fetchWithAuth('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {}, validToken);
      if (aboutRes.ok) {
        const aboutData = await aboutRes.json();
        if (aboutData.storageQuota) {
          limitBytes = parseInt(aboutData.storageQuota.limit || String(15 * 1024 * 1024 * 1024), 10);
          usageBytes = parseInt(aboutData.storageQuota.usage || '0', 10);
        }
      }
    } catch (e) {}

    // Estimate K.I.D.S. Data folder size from cached messages & files
    let kidsBytes = 0;
    try {
      const state = await chrome.storage.local.get(['kids_drive_usage_bytes']);
      kidsBytes = state.kids_drive_usage_bytes || (12 * 1024 * 1024); // Estimated fallback ~12MB
    } catch (e) {}

    const percentUsed = limitBytes > 0 ? (usageBytes / limitBytes) * 100 : 0;
    const kidsDataPercentOfQuota = limitBytes > 0 ? (kidsBytes / limitBytes) * 100 : 0;

    return {
      limitBytes,
      usageBytes,
      limitReadable: formatBytes(limitBytes),
      usageReadable: formatBytes(usageBytes),
      percentUsed: parseFloat(percentUsed.toFixed(1)),
      kidsDataUsageBytes: kidsBytes,
      kidsDataUsageReadable: formatBytes(kidsBytes),
      kidsDataPercentOfQuota: parseFloat(kidsDataPercentOfQuota.toFixed(2))
    };
  }

  /**
   * Tier 0 Saver: Saves K.I.D.S._Data_config.json at root of K.I.D.S. Data folder.
   */
  public static async saveRootConfig(token: string): Promise<void> {
    const rootFolder = await this.getOrCreateRootFolder(token);
    const state = await chrome.storage.local.get(['personal_drive_account_email']);
    const profiles = await ChildManager.getProfiles(false);
    const activeProf = await ChildManager.getActiveProfile();
    const activeYear = activeProf?.academicYear || ChildManager.getCalculatedAcademicYears().current;

    // Collect distinct academic years
    const yearSet = new Set<string>();
    profiles.forEach(p => { if (p.academicYear) yearSet.add(p.academicYear); });
    if (yearSet.size === 0) yearSet.add(activeYear);

    const rootConfig = {
      version: '1.0',
      updatedAt: new Date().toISOString(),
      personalEmailAddress: state.personal_drive_account_email || '',
      activeAcademicYear: activeYear,
      academicYears: Array.from(yearSet).map(yr => ({
        year: yr,
        isActive: yr === activeYear,
        relativeConfigPath: `${yr}/${yr}_config.json`
      }))
    };

    await this.saveJsonFileInFolder(token, rootFolder.id, 'K.I.D.S._Data_config.json', rootConfig);
  }

  /**
   * Tier 1 Saver: Saves [AcademicYear]_config.json inside Academic Year folder.
   */
  public static async saveYearConfig(token: string, academicYear?: string): Promise<void> {
    const yearInfo = await this.getOrCreateYearFolder(token, academicYear);
    const profiles = await ChildManager.getProfiles(false);
    const yearProfiles = profiles.filter(p => !p.academicYear || p.academicYear === yearInfo.year);
    const activeProf = await ChildManager.getActiveProfile();

    const activeIdInYear = (activeProf && activeProf.academicYear === yearInfo.year) ? activeProf.id : (yearProfiles.length > 0 ? yearProfiles[0].id : null);

    const yearConfig = {
      academicYear: yearInfo.year,
      updatedAt: new Date().toISOString(),
      activeChildId: activeIdInYear,
      children: yearProfiles.map(p => ({
        id: p.id,
        childName: p.name,
        isActive: p.id === activeIdInYear,
        isRemoved: false,
        relativeConfigPath: `${p.name}/${p.name}_config.json`
      }))
    };

    await this.saveJsonFileInFolder(token, yearInfo.id, `${yearInfo.year}_config.json`, yearConfig);
  }

  /**
   * Tier 2 Saver: Saves [KidName]_config.json inside Kid folder.
   */
  public static async saveKidConfig(token: string, childName?: string, academicYear?: string, overrides?: Partial<ChildProfile>): Promise<void> {
    const kidInfo = await this.getOrCreateKidFolder(token, childName, academicYear);
    const activeProf = await ChildManager.getActiveProfile();
    const profiles = await ChildManager.getProfiles(false);
    const currentProf = profiles.find(p => p.name.toLowerCase() === kidInfo.kidName.toLowerCase()) || activeProf;

    const merged = { ...(currentProf || {}), ...(overrides || {}) };

    const kidConfig = {
      kidName: kidInfo.kidName,
      academicYear: kidInfo.year,
      hasClassroom: merged.hasClassroom !== false,
      classroomEmail: merged.accountEmail || '',
      scriptId: merged.gasScriptId || '',
      deploymentId: merged.gasDeploymentUrl ? (merged.gasDeploymentUrl.match(/\/macros\/s\/([^\/]+)\/exec/) || [])[1] || '' : '',
      url: merged.gasDeploymentUrl || '',
      relativePortalToolsConfigPath: 'portal_tools/portal_tools_config.json',
      relativeMessagingToolsPath: 'messaging_tools',
      updatedAt: new Date().toISOString()
    };

    await this.saveJsonFileInFolder(token, kidInfo.id, `${kidInfo.kidName}_config.json`, kidConfig);
  }

  /**
   * Tier 3A Saver: Saves portal_tools/portal_tools_config.json.
   */
  public static async savePortalToolsConfig(token: string, childName?: string, academicYear?: string, customTools?: any[]): Promise<void> {
    const portalInfo = await this.getOrCreatePortalToolsFolder(token, childName, academicYear);
    const activeProf = await ChildManager.getActiveProfile();
    const profiles = await ChildManager.getProfiles(false);
    const currentProf = profiles.find(p => p.name.toLowerCase() === (childName || '').toLowerCase()) || activeProf;

    const tools = customTools || currentProf?.registeredTools || [];

    // Group tools by domain
    const portalMap = new Map<string, any[]>();
    tools.forEach((t: any) => {
      const dom = t.domain || 'general';
      if (!portalMap.has(dom)) portalMap.set(dom, []);
      portalMap.get(dom)!.push({
        feature: t.feature,
        name: t.name,
        url: t.url
      });
    });

    const portalsArray = Array.from(portalMap.entries()).map(([domain, toolList]) => ({
      domain,
      portalName: domain.replace(/^www\./, '').split('.')[0].toUpperCase(),
      baseUrl: `https://${domain}`,
      tools: toolList
    }));

    const config = {
      kidName: childName || currentProf?.name || 'Child',
      academicYear: academicYear || currentProf?.academicYear || '2026-2027',
      updatedAt: new Date().toISOString(),
      portals: portalsArray
    };

    await this.saveJsonFileInFolder(token, portalInfo.id, 'portal_tools_config.json', config);
  }

  /**
   * Tier 3B Saver: Saves messaging_tools/messaging_tools_config.json.
   */
  public static async saveMessagingToolsConfig(token: string, childName?: string, academicYear?: string, customGroups?: any[]): Promise<void> {
    const msgInfo = await this.getOrCreateMessagingToolsFolder(token, childName, academicYear);
    const activeProf = await ChildManager.getActiveProfile();
    const profiles = await ChildManager.getProfiles(false);
    const currentProf = profiles.find(p => p.name.toLowerCase() === (childName || '').toLowerCase()) || activeProf;

    const tracked = customGroups || currentProf?.trackedChats || [];

    const config = {
      kidName: childName || currentProf?.name || 'Child',
      academicYear: academicYear || currentProf?.academicYear || '2026-2027',
      updatedAt: new Date().toISOString(),
      totalTrackedGroups: tracked.length,
      supportedPlatforms: ['WhatsApp', 'Telegram', 'Discord', 'Google Chat'],
      groups: tracked.map((g: any) => {
        const cleanName = (g.name || g.chatName || 'School Group').replace(/[\\/:*?"<>|]/g, '_');
        return {
          id: g.id || `group_${cleanName.toLowerCase()}`,
          platform: g.platform || 'WhatsApp',
          chatName: g.name || g.chatName || cleanName,
          folderName: cleanName,
          relativeFolderPath: cleanName,
          archiveFileName: `K.I.D.S._${cleanName}_archive.json`,
          isActive: g.enabled !== false,
          lastSyncAt: g.lastSync || new Date().toISOString(),
          noticesCount: g.noticeCount || 0
        };
      })
    };

    await this.saveJsonFileInFolder(token, msgInfo.id, 'messaging_tools_config.json', config);
  }

  /**
   * Syncs all 5 tiers of the modular hierarchy to Google Drive in one orchestrated operation.
   */
  public static async syncFullModularHierarchy(token?: string): Promise<void> {
    try {
      const validToken = token || await this.getValidToken(false);
      const profiles = await ChildManager.getProfiles(false);

      await this.saveRootConfig(validToken);

      const years = new Set<string>();
      profiles.forEach(p => { if (p.academicYear) years.add(p.academicYear); });

      for (const yr of years) {
        await this.saveYearConfig(validToken, yr);
      }

      for (const p of profiles) {
        await this.saveKidConfig(validToken, p.name, p.academicYear);
        await this.savePortalToolsConfig(validToken, p.name, p.academicYear);
        await this.saveMessagingToolsConfig(validToken, p.name, p.academicYear);
      }
    } catch (e) {
      console.warn('[PersonalDriveService] syncFullModularHierarchy warning:', e);
    }
  }

  /**
   * Complete Machine-Change Cloud Recovery:
   * Traverses Tier 0 (Root) -> Tier 1 (Year) -> Tier 2 (Kid) -> Tier 3 (Portal & Messaging Tools)
   * and restores full ChildProfile[] into extension storage in seconds!
   */
  public static async restoreAllProfilesFromDrive(token?: string): Promise<{ restoredCount: number; profiles: any[] }> {
    try {
      const validToken = token || await this.getValidToken(false);
      const rootFolder = await this.getOrCreateRootFolder(validToken);

      // 1. Read Root Config (Tier 0)
      const rootConfig = await this.readJsonFileInFolder(validToken, rootFolder.id, 'K.I.D.S._Data_config.json');
      const activeYear = rootConfig?.activeAcademicYear || ChildManager.getCalculatedAcademicYears().current;

      // 2. Read Year Config (Tier 1)
      const yearInfo = await this.getOrCreateYearFolder(validToken, activeYear);
      const yearConfig = await this.readJsonFileInFolder(validToken, yearInfo.id, `${activeYear}_config.json`);

      const restoredProfiles: any[] = [];
      const childrenList = (yearConfig && Array.isArray(yearConfig.children)) ? yearConfig.children : [];

      for (const childItem of childrenList) {
        if (childItem.isRemoved) continue;
        const childName = childItem.childName;
        const kidInfo = await this.getOrCreateKidFolder(validToken, childName, activeYear);

        // 3. Read Kid Config (Tier 2)
        const kidConfig = await this.readJsonFileInFolder(validToken, kidInfo.id, `${childName}_config.json`);

        // 4. Read Portal Tools Config (Tier 3A)
        const portalInfo = await this.getOrCreatePortalToolsFolder(validToken, childName, activeYear);
        const portalConfig = await this.readJsonFileInFolder(validToken, portalInfo.id, 'portal_tools_config.json');

        const flattenedTools: any[] = [];
        const portalDomains: string[] = [];
        if (portalConfig && Array.isArray(portalConfig.portals)) {
          portalConfig.portals.forEach((p: any) => {
            if (p.domain && !portalDomains.includes(p.domain)) portalDomains.push(p.domain);
            if (Array.isArray(p.tools)) {
              p.tools.forEach((t: any) => {
                flattenedTools.push({
                  domain: p.domain,
                  feature: t.feature,
                  name: t.name,
                  url: t.url
                });
              });
            }
          });
        }

        // 5. Read Messaging Tools Config (Tier 3B)
        const msgInfo = await this.getOrCreateMessagingToolsFolder(validToken, childName, activeYear);
        const msgConfig = await this.readJsonFileInFolder(validToken, msgInfo.id, 'messaging_tools_config.json');

        const restoredChats: any[] = [];
        if (msgConfig && Array.isArray(msgConfig.groups)) {
          msgConfig.groups.forEach((g: any) => {
            restoredChats.push({
              id: g.id,
              name: g.chatName,
              platform: g.platform || 'WhatsApp',
              enabled: g.isActive !== false,
              lastSync: g.lastSyncAt,
              noticeCount: g.noticesCount || 0
            });
          });
        }

        restoredProfiles.push({
          id: childItem.id || `child_${childName.toLowerCase()}_${Date.now()}`,
          name: childName,
          academicYear: activeYear,
          createdAt: Date.now(),
          hasClassroom: kidConfig?.hasClassroom !== false,
          accountEmail: kidConfig?.classroomEmail || undefined,
          gasScriptId: kidConfig?.scriptId || undefined,
          gasDeploymentUrl: kidConfig?.url || undefined,
          portalDomain: portalDomains[0] || undefined,
          portalDomains,
          registeredTools: flattenedTools,
          trackedChats: restoredChats
        });
      }

      if (restoredProfiles.length > 0) {
        const activeId = yearConfig?.activeChildId || restoredProfiles[0].id;
        await ChildManager.saveProfiles(restoredProfiles, activeId);
        return { restoredCount: restoredProfiles.length, profiles: restoredProfiles };
      }

      return { restoredCount: 0, profiles: [] };
    } catch (e) {
      console.warn('[PersonalDriveService] restoreAllProfilesFromDrive error:', e);
      return { restoredCount: 0, profiles: [] };
    }
  }

  /**
   * Loads all messages from K.I.D.S._[ChildName]_archive.json in Google Drive.
   */
  public static async loadAllMessagesFromPersonalDrive(
    token?: string,
    childName?: string,
    academicYear?: string
  ): Promise<any[]> {
    try {
      const validToken = token || await this.getValidToken(false);
      const resolvedChild = await this.resolveChildName(childName);
      const folder = await this.getOrCreateMessagingToolsFolder(validToken, resolvedChild, academicYear);
      const archiveFileName = `K.I.D.S._${resolvedChild}_${this.ARCHIVE_FILE_NAME}`;

      const q = encodeURIComponent(`name = '${archiveFileName}' and '${folder.id}' in parents and trashed = false`);
      const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {}, validToken);

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          const fileId = searchData.files[0].id;
          const downloadRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {}, validToken);
          if (downloadRes.ok) {
            const data = await downloadRes.json();
            return Array.isArray(data) ? data : [];
          }
        }
      }
    } catch (e) {}
    return [];
  }

  /**
   * Saves messages to K.I.D.S._[ChildName]_archive.json in the child's messaging_tools folder.
   */
  public static async saveMessagesToPersonalDrive(
    token?: string,
    newMessages: any[] = [],
    childName?: string,
    academicYear?: string
  ): Promise<{ saved: number; total: number }> {
    if (!newMessages || newMessages.length === 0) return { saved: 0, total: 0 };

    const validToken = token || await this.getValidToken(false);
    const resolvedChild = await this.resolveChildName(childName);
    const folder = await this.getOrCreateMessagingToolsFolder(validToken, resolvedChild, academicYear);
    const archiveFileName = `K.I.D.S._${resolvedChild}_${this.ARCHIVE_FILE_NAME}`;

    await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `[DRIVE_START] Preparing archive upload for ${resolvedChild} in folder "${folder.id}"`, {
      folderId: folder.id,
      archiveFileName,
      incomingMessageCount: newMessages.length
    });

    // 1. Search for existing archive file inside child's folder
    let fileId: string | null = null;
    let existingMessages: any[] = [];

    const q = encodeURIComponent(`name = '${archiveFileName}' and '${folder.id}' in parents and trashed = false`);
    const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {}, validToken);

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        fileId = searchData.files[0].id;
        await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `[DRIVE_FOUND] Found existing "${archiveFileName}" (ID: ${fileId}). Downloading existing archive to merge...`, {
          fileId
        });
        try {
          const downloadRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {}, validToken);
          if (downloadRes.ok) {
            existingMessages = await downloadRes.json();
            await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `[DRIVE_DOWNLOADED] Downloaded ${existingMessages.length} existing messages for merge.`);
          }
        } catch (e: any) {
          existingMessages = [];
          await WhatsAppDiagnosticLogger.log('WARN', 'DRIVE', `[DRIVE_DOWNLOAD_WARN] Could not parse existing archive content: ${e.message}`);
        }
      } else {
        await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `[DRIVE_NEW_FILE] No existing "${archiveFileName}" found in folder. Will create brand new file.`);
      }
    } else {
      await WhatsAppDiagnosticLogger.log('WARN', 'DRIVE', `[DRIVE_SEARCH_WARN] File search returned HTTP ${searchRes.status}. Proceeding to file creation.`);
    }

    // 2. Merge, Deduplicate & Backfill Attachment Links
    const seen = new Map<string, any>();
    existingMessages.forEach((m: any) => seen.set(`${m.chatName}_${m.timestamp}_${m.body}`, m));

    let addedCount = 0;
    let updatedCount = 0;
    newMessages.forEach((m: any) => {
      const key = `${m.chatName}_${m.timestamp}_${m.body}`;
      // Tag message with childName
      m.childName = resolvedChild;

      if (!seen.has(key)) {
        seen.set(key, m);
        existingMessages.unshift(m);
        addedCount++;
      } else {
        const existing = seen.get(key);
        if (m.driveAttachmentUrl && !existing.driveAttachmentUrl) {
          existing.driveAttachmentUrl = m.driveAttachmentUrl;
          existing.driveFileName = m.driveFileName;
          updatedCount++;
        }
      }
    });

    if (existingMessages.length > 50000) {
      existingMessages = existingMessages.slice(0, 50000);
    }

    // Optimization: If 0 new messages were added and file already exists, skip network upload
    if (addedCount === 0 && fileId) {
      await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `⚡ [DRIVE_NO_CHANGE] Master archive "${archiveFileName}" is already up to date with ${existingMessages.length} notices.`);
      return { saved: 0, total: existingMessages.length };
    }

    const payload = JSON.stringify(existingMessages, null, 2);

    await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `[DRIVE_PAYLOAD] Prepared ${existingMessages.length} total messages (${payload.length} bytes, ${addedCount} new). Uploading...`, {
      isUpdate: Boolean(fileId),
      fileId,
      totalCount: existingMessages.length,
      payloadBytes: payload.length
    });

    // 3. Upload/Update to Personal Drive
    if (fileId) {
      const updateRes = await this.fetchWithAuth(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        },
        validToken
      );

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        await WhatsAppDiagnosticLogger.log('ERROR', 'DRIVE', `[DRIVE_PATCH_FAIL] Failed to update "${archiveFileName}" (ID: ${fileId}): HTTP ${updateRes.status} | ${errText}`);
        throw new Error(`Google Drive update failed: HTTP ${updateRes.status}`);
      }

      await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `🎉 [DRIVE_PATCH_SUCCESS] Updated "${archiveFileName}" (ID: ${fileId}) with ${existingMessages.length} total messages on Google Drive.`, {
        fileId,
        total: existingMessages.length
      });
    } else {
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadata = {
        name: archiveFileName,
        mimeType: 'application/json',
        parents: [folder.id]
      };

      const multipartBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        payload +
        closeDelimiter;

      const createRes = await this.fetchWithAuth(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
          body: multipartBody
        },
        validToken
      );

      if (!createRes.ok) {
        const errText = await createRes.text();
        await WhatsAppDiagnosticLogger.log('ERROR', 'DRIVE', `[DRIVE_CREATE_FAIL] Failed to create "${archiveFileName}": HTTP ${createRes.status} | ${errText}`);
        throw new Error(`Google Drive file creation failed: HTTP ${createRes.status}`);
      }

      const createdData = await createRes.json();
      await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `🎉 [DRIVE_CREATE_SUCCESS] Created brand new file "${archiveFileName}" (ID: ${createdData.id}) on Google Drive!`, {
        fileId: createdData.id,
        folderId: folder.id,
        total: existingMessages.length
      });
    }

    // 4. Save per-group archive JSON files into their respective subfolders
    const groupsMap = new Map<string, any[]>();
    newMessages.forEach(m => {
      const cName = m.chatName || 'General';
      if (!groupsMap.has(cName)) groupsMap.set(cName, []);
      groupsMap.get(cName)!.push(m);
    });

    for (const [gName, gMsgs] of groupsMap.entries()) {
      await this.saveGroupSpecificArchive(validToken, resolvedChild, gName, gMsgs);
    }

    // 5. Update semantic groups index manifest (`groups_manifest.json`)
    await this.updateGroupsManifest(validToken, resolvedChild, existingMessages);

    return { saved: addedCount, total: existingMessages.length };
  }

  /**
   * Commits a single group's messages atomically in a single transaction:
   * 1. Updates and sorts the dedicated per-group archive file ([GroupName]_archive.json).
   * 2. Merges and sorts into the child's master archive ([Child]_whatsapp_school_archive.json).
   * 3. Updates and rewrites groups_manifest.json with newest notice timestamps & metadata.
   */
  public static async saveSingleGroupTransaction(
    token: string,
    childName: string,
    groupName: string,
    newMessages: any[] = []
  ): Promise<{ saved: number; total: number; groupTotal: number }> {
    if (!newMessages || newMessages.length === 0) {
      return { saved: 0, total: 0, groupTotal: 0 };
    }

    const validToken = token || await this.getValidToken(false);
    const resolvedChild = await this.resolveChildName(childName);

    // 1. Commit dedicated per-group archive
    await this.saveGroupSpecificArchive(validToken, resolvedChild, groupName, newMessages);

    // 2. Commit master archive and update groups_manifest.json in single unified pass
    const masterRes = await this.saveMessagesToPersonalDrive(validToken, newMessages, resolvedChild);

    return {
      saved: masterRes.saved,
      total: masterRes.total,
      groupTotal: newMessages.length
    };
  }

  /**
   * Saves or updates a dedicated per-group archive file inside the group's subfolder.
   * e.g. "School Portal MCP Intelligence" -> "Atharva" -> "3B Cambridge 2026 - 27" -> "3B_Cambridge_archive.json"
   */
  public static async saveGroupSpecificArchive(
    token: string,
    childName: string,
    groupName: string,
    groupMessages: any[]
  ): Promise<string | null> {
    try {
      if (!groupMessages || groupMessages.length === 0) return null;
      const groupFolder = await this.getOrCreateGroupFolder(token, childName, groupName);
      const cleanName = groupName.replace(/[\\/:*?"<>|]/g, '_').trim();
      const fileName = `K.I.D.S._${cleanName}_archive.json`;

      const q = encodeURIComponent(`name = '${fileName}' and '${groupFolder.id}' in parents and trashed = false`);
      const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {}, token);

      let fileId: string | null = null;
      let existing: any[] = [];
      if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.files && data.files.length > 0) {
          fileId = data.files[0].id;
          try {
            const dlRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {}, token);
            if (dlRes.ok) existing = await dlRes.json();
          } catch (e) {}
        }
      }

      const parseTsToMs = (item: any): number => {
        if (!item) return 0;
        if (typeof item.exactTimestampMs === 'number' && item.exactTimestampMs > 0) return item.exactTimestampMs;
        const dStr = item.date || (item.timestamp && item.timestamp.includes(',') ? item.timestamp.split(',')[1].trim() : item.timestamp);
        const tStr = item.time || (item.timestamp && item.timestamp.includes(',') ? item.timestamp.split(',')[0].trim() : '');
        if (dStr) {
          const parsed = Date.parse(`${dStr} ${tStr}`.trim());
          if (!isNaN(parsed)) return parsed;
        }
        return 0;
      };

      const seen = new Map<string, any>();
      existing.forEach((m: any) => seen.set(`${m.timestamp}_${m.body}`, m));

      let addedToGroup = 0;
      groupMessages.forEach((m: any) => {
        const k = `${m.timestamp}_${m.body}`;
        if (!seen.has(k)) {
          seen.set(k, m);
          existing.unshift(m);
          addedToGroup++;
        } else {
          const ex = seen.get(k);
          if (m.driveAttachmentUrl && !ex.driveAttachmentUrl) {
            ex.driveAttachmentUrl = m.driveAttachmentUrl;
            ex.driveFileName = m.driveFileName;
            addedToGroup++;
          }
        }
      });

      if (addedToGroup === 0 && fileId) {
        return fileName;
      }

      existing.sort((a, b) => parseTsToMs(b) - parseTsToMs(a));

      const payload = JSON.stringify(existing, null, 2);

      if (fileId) {
        await this.fetchWithAuth(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: payload
          },
          token
        );
      } else {
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;
        const metadata = {
          name: fileName,
          mimeType: 'application/json',
          parents: [groupFolder.id]
        };
        const multipartBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          payload +
          closeDelimiter;

        await this.fetchWithAuth(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
            body: multipartBody
          },
          token
        );
      }
      return fileName;
    } catch (e) {
      console.warn(`[PersonalDriveService] Could not save group archive for ${groupName}:`, e);
      return null;
    }
  }

  /**
   * Saves or updates the semantic groups index manifest (`groups_manifest.json`) in the child's folder.
   * Enables LLMs / MCP tools to quickly discover group roles and descriptions without scanning full archives.
   */
  public static async updateGroupsManifest(
    token: string,
    childName: string,
    allMessages: any[]
  ): Promise<void> {
    try {
      const childFolder = await this.getOrCreatePersonalFolder(token, childName);
      const manifestFileName = this.MANIFEST_FILE_NAME;
      const parseTsToMs = (item: any): number => {
        if (!item) return 0;
        if (typeof item.exactTimestampMs === 'number' && item.exactTimestampMs > 0) return item.exactTimestampMs;
        const dStr = item.date || (item.timestamp && item.timestamp.includes(',') ? item.timestamp.split(',')[1].trim() : item.timestamp);
        const tStr = item.time || (item.timestamp && item.timestamp.includes(',') ? item.timestamp.split(',')[0].trim() : '');
        if (dStr) {
          const parsed = Date.parse(`${dStr} ${tStr}`.trim());
          if (!isNaN(parsed)) return parsed;
        }
        return 0;
      };

      // Group messages by chatName
      const groupsMap = new Map<string, any[]>();
      allMessages.forEach(m => {
        const cName = m.chatName || 'General';
        if (!groupsMap.has(cName)) groupsMap.set(cName, []);
        groupsMap.get(cName)!.push(m);
      });

      const q = encodeURIComponent(`name = '${manifestFileName}' and '${childFolder.id}' in parents and trashed = false`);
      const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {}, token);

      let fileId: string | null = null;
      let existingManifestGroups: any[] = [];
      if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.files && data.files.length > 0) {
          fileId = data.files[0].id;
          try {
            const dlRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {}, token);
            if (dlRes.ok) {
              const existingJson = await dlRes.json();
              if (existingJson && Array.isArray(existingJson.groups)) {
                existingManifestGroups = existingJson.groups;
              }
            }
          } catch (e) {}
        }
      }

      const existingMap = new Map<string, any>();
      existingManifestGroups.forEach(g => {
        if (g && g.groupName) existingMap.set(g.groupName.toLowerCase(), g);
      });

      const groupEntries = [];
      for (const [gName, gMsgs] of groupsMap.entries()) {
        // Enforce descending (newest first) chronological order
        gMsgs.sort((a, b) => parseTsToMs(b) - parseTsToMs(a));

        const cleanName = gName.replace(/[\\/:*?"<>|]/g, '_').trim();
        const existingG = existingMap.get(gName.toLowerCase());
        let desc = existingG?.aiSemanticDescription;
        if (!desc || existingG?.totalNotices !== gMsgs.length) {
          desc = await AiNormalizerService.generateGroupSemanticDescription(gName, gMsgs, childName);
        }

        const latestM = gMsgs[0];
        const latestTime = latestM ? (latestM.date && latestM.time ? `${latestM.date}, ${latestM.time}` : (latestM.timestamp || '')) : '';

        // Extract unique senders and categories
        const senders = Array.from(new Set(gMsgs.map(m => m.sender).filter(Boolean))).slice(0, 5);
        const categories = Array.from(new Set(gMsgs.map(m => m.category).filter(Boolean)));

        groupEntries.push({
          groupName: gName,
          folderName: cleanName,
          archiveFileName: `${cleanName}_archive.json`,
          attachmentsFolderName: 'Attachments',
          totalNotices: gMsgs.length,
          lastNoticeTimestamp: latestTime,
          aiSemanticDescription: desc,
          primarySenders: senders,
          categories
        });
      }

      // Merge new groupEntries with existingManifestGroups by groupName
      const mergedGroupsMap = new Map<string, any>();
      existingManifestGroups.forEach(g => {
        if (g && g.groupName) mergedGroupsMap.set(g.groupName.toLowerCase(), g);
      });
      groupEntries.forEach(g => {
        if (g && g.groupName) mergedGroupsMap.set(g.groupName.toLowerCase(), g);
      });
      const finalGroups = Array.from(mergedGroupsMap.values());
      const totalNotices = finalGroups.reduce((acc, g) => acc + (g.totalNotices || 0), 0);

      const manifestPayload = {
        childName,
        updatedAt: new Date().toISOString(),
        totalGroups: finalGroups.length,
        totalNoticesAcrossAllGroups: totalNotices || allMessages.length,
        groups: finalGroups
      };

      const payloadStr = JSON.stringify(manifestPayload, null, 2);

      if (fileId) {
        await this.fetchWithAuth(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: payloadStr
          },
          token
        );
      } else {
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;
        const metadata = {
          name: manifestFileName,
          mimeType: 'application/json',
          parents: [childFolder.id]
        };
        const multipartBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          payloadStr +
          closeDelimiter;

        await this.fetchWithAuth(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
            body: multipartBody
          },
          token
        );
      }

      await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `📋 [MANIFEST_SAVED] Updated "${manifestFileName}" with SLM semantic descriptions for ${finalGroups.length} group(s).`, {
        groups: finalGroups.map(g => ({ name: g.groupName, count: g.totalNotices }))
      });
    } catch (e: any) {
      await WhatsAppDiagnosticLogger.log('ERROR', 'DRIVE', `[MANIFEST_ERROR] Failed to update groups_manifest.json: ${e.message}`);
      console.warn('[PersonalDriveService] Could not update groups_manifest.json:', e);
    }
  }

  /**
   * Re-indexes all groups from the child's master archive and updates groups_manifest.json on Drive.
   */
  public static async rebuildGroupsManifest(token?: string, childName?: string): Promise<{ success: boolean; totalGroups: number; groups: any[] }> {
    const validToken = token || await this.getValidToken(false);
    const resolvedChild = await this.resolveChildName(childName);
    const childFolder = await this.getOrCreatePersonalFolder(validToken, resolvedChild);
    const archiveFileName = `${resolvedChild}_${this.ARCHIVE_FILE_NAME}`;

    await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `🔄 [REBUILD_MANIFEST_START] Rebuilding groups manifest for "${resolvedChild}"...`);

    // 1. Download master archive
    const q = encodeURIComponent(`name = '${archiveFileName}' and '${childFolder.id}' in parents and trashed = false`);
    const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {}, validToken);
    let allMessages: any[] = [];
    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        const dlRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${data.files[0].id}?alt=media`, {}, validToken);
        if (dlRes.ok) allMessages = await dlRes.json();
      }
    }

    // 2. Also ensure each group's dedicated archive file and subfolder exist
    const groupsMap = new Map<string, any[]>();
    allMessages.forEach(m => {
      const cName = m.chatName || 'General';
      if (!groupsMap.has(cName)) groupsMap.set(cName, []);
      groupsMap.get(cName)!.push(m);
    });

    for (const [gName, gMsgs] of groupsMap.entries()) {
      await this.saveGroupSpecificArchive(validToken, resolvedChild, gName, gMsgs);
    }

    // 3. Update manifest
    await this.updateGroupsManifest(validToken, resolvedChild, allMessages);

    // 4. Also register discovered groups in ChildProfile & tracked_whatsapp_chats
    const discoveredGroups = Array.from(groupsMap.keys());
    if (discoveredGroups.length > 0 && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const stateData = await chrome.storage.local.get(['tracked_whatsapp_chats']);
        let trackedList: any[] = stateData.tracked_whatsapp_chats || [];
        discoveredGroups.forEach(gName => {
          if (!trackedList.some(t => t.title?.toLowerCase() === gName.toLowerCase() || t.id?.toLowerCase() === gName.toLowerCase())) {
            trackedList.push({
              id: 'wa_chat_' + gName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
              title: gName,
              platform: 'WhatsApp',
              isGroup: true,
              addedAt: new Date().toISOString()
            });
          }
        });
        await chrome.storage.local.set({ tracked_whatsapp_chats: trackedList });
        if (chrome.storage.sync) await chrome.storage.sync.set({ tracked_whatsapp_chats: trackedList });

        const activeProf = await ChildManager.getActiveProfile();
        if (activeProf) {
          await ChildManager.updateProfile(activeProf.id, { trackedChats: trackedList });
        }
      } catch (e) {}
    }

    return {
      success: true,
      totalGroups: groupsMap.size,
      groups: Array.from(groupsMap.keys()).map(name => ({ groupName: name, totalNotices: groupsMap.get(name)!.length }))
    };
  }

  private static TRACKED_CHATS_FILE_NAME = 'tracked_whatsapp_chats.json';

  /**
   * Saves tracked WhatsApp groups metadata to child's Personal Drive folder.
   */
  public static async saveTrackedChatsToPersonalDrive(
    token?: string,
    trackedChats: any[] = [],
    childName?: string
  ): Promise<void> {
    try {
      const validToken = token || await this.getValidToken(false);
      const resolvedChild = await this.resolveChildName(childName);
      const folder = await this.getOrCreatePersonalFolder(validToken, resolvedChild);
      const trackedFileName = `${resolvedChild}_${this.TRACKED_CHATS_FILE_NAME}`;

      // Search for existing tracked chats file in folder
      const q = encodeURIComponent(`name = '${trackedFileName}' and '${folder.id}' in parents and trashed = false`);
      const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {}, validToken);

      const payload = JSON.stringify(trackedChats, null, 2);

      if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.files && data.files.length > 0) {
          const fileId = data.files[0].id;
          await this.fetchWithAuth(
            `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: payload
            },
            validToken
          );
          return;
        }
      }

      // Create new file
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;
      const metadata = {
        name: trackedFileName,
        mimeType: 'application/json',
        parents: [folder.id]
      };
      const multipartBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        payload +
        closeDelimiter;

      await this.fetchWithAuth(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
          body: multipartBody
        },
        validToken
      );
    } catch (e) {
      console.warn('[PersonalDriveService] Could not backup tracked chats to Drive:', e);
    }
  }

  private static ATTACHMENTS_FOLDER_NAME = 'Attachments';

  /**
   * Gets or creates a subfolder for a specific school group inside the Child's folder.
   * e.g. "School Portal MCP Intelligence" -> "Atharva" -> "3B Cambridge 2026 - 27"
   */
  public static async getOrCreateGroupFolder(
    token?: string,
    childName?: string,
    groupName = 'General'
  ): Promise<{ id: string; webViewLink?: string }> {
    const validToken = token || await this.getValidToken(false);
    const resolvedChild = await this.resolveChildName(childName);
    const msgFolder = await this.getOrCreateMessagingToolsFolder(validToken, resolvedChild);
    const cleanGroupName = (groupName || 'General').replace(/[\\/:*?"<>|]/g, '_').trim();

    const q = encodeURIComponent(`name = '${cleanGroupName}' and '${msgFolder.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)`, {}, validToken);

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return { id: searchData.files[0].id, webViewLink: searchData.files[0].webViewLink };
      }
    }

    const res = await this.fetchWithAuth(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanGroupName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [msgFolder.id],
          description: `School chat group archive for ${cleanGroupName} (${resolvedChild})`
        })
      },
      validToken
    );

    if (!res.ok) {
      throw new Error(`Failed to create Group folder "${cleanGroupName}": HTTP ${res.status}`);
    }

    const created = await res.json();
    return { id: created.id, webViewLink: created.webViewLink };
  }

  /**
   * Renames a group subfolder and its internal archive file on Google Drive when a WhatsApp group is renamed.
   * Google Drive folder IDs & all attachment links are permanently preserved.
   */
  public static async renameGroupFolderOnDrive(
    token?: string,
    childName?: string,
    oldGroupName?: string,
    newGroupName?: string
  ): Promise<boolean> {
    if (!oldGroupName || !newGroupName || oldGroupName.toLowerCase() === newGroupName.toLowerCase()) return false;
    try {
      const validToken = token || await this.getValidToken(false);
      const resolvedChild = await this.resolveChildName(childName);
      const childFolder = await this.getOrCreatePersonalFolder(validToken, resolvedChild);

      const cleanOldName = oldGroupName.replace(/[\\/:*?"<>|]/g, '_').trim();
      const cleanNewName = newGroupName.replace(/[\\/:*?"<>|]/g, '_').trim();

      // Find old group folder
      const q = encodeURIComponent(`name = '${cleanOldName}' and '${childFolder.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
      const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {}, validToken);

      if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.files && data.files.length > 0) {
          const folderId = data.files[0].id;
          // Rename the folder on Google Drive
          await this.fetchWithAuth(
            `https://www.googleapis.com/drive/v3/files/${folderId}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: cleanNewName,
                description: `School chat group archive for ${cleanNewName} (${resolvedChild})`
              })
            },
            validToken
          );

          // Also rename the internal archive JSON file if present
          const oldFileName = `${cleanOldName}_archive.json`;
          const newFileName = `${cleanNewName}_archive.json`;
          const fQ = encodeURIComponent(`name = '${oldFileName}' and '${folderId}' in parents and trashed = false`);
          const fileSearchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${fQ}&fields=files(id)`, {}, validToken);
          if (fileSearchRes.ok) {
            const fData = await fileSearchRes.json();
            if (fData.files && fData.files.length > 0) {
              await this.fetchWithAuth(
                `https://www.googleapis.com/drive/v3/files/${fData.files[0].id}`,
                {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: newFileName })
                },
                validToken
              );
            }
          }

          await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `📂 [DRIVE_FOLDER_RENAMED] Successfully renamed Drive folder from "${cleanOldName}" to "${cleanNewName}" (Folder ID: ${folderId})`);
          return true;
        }
      }
      return false;
    } catch (e: any) {
      console.warn('[PersonalDriveService] Could not rename group folder on Drive:', e);
      return false;
    }
  }

  /**
   * Gets or creates the Attachments subfolder inside a specific Group folder.
   * e.g. "School Portal MCP Intelligence" -> "Atharva" -> "3B Cambridge 2026 - 27" -> "Attachments"
   */
  public static async getOrCreateAttachmentsFolder(
    token?: string,
    childName?: string,
    groupName?: string
  ): Promise<{ id: string; webViewLink?: string }> {
    const validToken = token || await this.getValidToken(false);
    const resolvedChild = await this.resolveChildName(childName);
    
    let parentFolderId: string;
    if (groupName) {
      const groupFolder = await this.getOrCreateGroupFolder(validToken, resolvedChild, groupName);
      parentFolderId = groupFolder.id;
    } else {
      const childFolder = await this.getOrCreatePersonalFolder(validToken, resolvedChild);
      parentFolderId = childFolder.id;
    }

    // Search for existing Attachments folder
    const q = encodeURIComponent(`name = '${this.ATTACHMENTS_FOLDER_NAME}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)`, {}, validToken);

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return { id: searchData.files[0].id, webViewLink: searchData.files[0].webViewLink };
      }
    }

    // Create Attachments folder
    const res = await this.fetchWithAuth(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.ATTACHMENTS_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId],
          description: `School Notices, Homework PDFs & Image Attachments for ${groupName || resolvedChild}`
        })
      },
      validToken
    );

    if (!res.ok) {
      throw new Error(`Failed to create Attachments folder for ${resolvedChild}: HTTP ${res.status}`);
    }

    const created = await res.json();
    return { id: created.id, webViewLink: created.webViewLink };
  }

  /**
   * Directly uploads a PDF, image, or document attachment to the group's Attachments folder with name prefix.
   */
  public static async uploadAttachmentFile(
    token: string | undefined,
    fileData: { name: string; mimeType: string; base64Content: string },
    childName?: string,
    groupName?: string
  ): Promise<{ fileId: string; webViewLink: string; name: string } | null> {
    try {
      if (!fileData || !fileData.base64Content) return null;

      const validToken = token || await this.getValidToken(false);
      const resolvedChild = await this.resolveChildName(childName);
      const folder = await this.getOrCreateAttachmentsFolder(validToken, resolvedChild, groupName);
      // Convert base64 to binary ArrayBuffer
      const byteCharacters = atob(fileData.base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      // Prefix artifact with child's name if not already prefixed
      const rawName = (fileData.name || `attachment_${Date.now()}`).replace(/[\\/:*?"<>|]/g, '_');
      let finalName = rawName.startsWith(`${resolvedChild}_`) ? rawName : `${resolvedChild}_${rawName}`;

      // Check if file with same name already exists in Attachments folder (Smart Deduplication & Versioning)
      const q = encodeURIComponent(`name = '${finalName}' and '${folder.id}' in parents and trashed = false`);
      const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,size,webViewLink)`, {}, validToken);

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          const existingFile = searchData.files[0];
          // If byte size matches exactly, it is identical content -> reuse existing link
          if (existingFile.size && parseInt(existingFile.size, 10) === byteArray.length) {
            return {
              fileId: existingFile.id,
              webViewLink: existingFile.webViewLink,
              name: existingFile.name
            };
          }

          // If content was modified (different size), auto-version it: "[ChildName]_[FileName] (v2).pdf"
          const lastDot = finalName.lastIndexOf('.');
          const baseName = lastDot > 0 ? finalName.substring(0, lastDot) : finalName;
          const ext = lastDot > 0 ? finalName.substring(lastDot) : '';

          let version = 2;
          let versionedName = `${baseName} (v${version})${ext}`;
          while (version <= 10) {
            const vQ = encodeURIComponent(`name = '${versionedName}' and '${folder.id}' in parents and trashed = false`);
            const vRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${vQ}&fields=files(id,name,size,webViewLink)`, {}, validToken);
            if (vRes.ok) {
              const vData = await vRes.json();
              if (vData.files && vData.files.length > 0) {
                if (vData.files[0].size && parseInt(vData.files[0].size, 10) === byteArray.length) {
                  return {
                    fileId: vData.files[0].id,
                    webViewLink: vData.files[0].webViewLink,
                    name: vData.files[0].name
                  };
                }
                version++;
                versionedName = `${baseName} (v${version})${ext}`;
                continue;
              }
            }
            break;
          }
          finalName = versionedName;
        }
      }

      // Build multipart request body
      const boundary = '-------314159265358979323846';
      const metadata = {
        name: finalName,
        mimeType: fileData.mimeType || 'application/octet-stream',
        parents: [folder.id]
      };

      const metaHeader = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${fileData.mimeType || 'application/octet-stream'}\r\nContent-Transfer-Encoding: base64\r\n\r\n`;
      const metaFooter = `\r\n--${boundary}--`;

      const uploadPayload = metaHeader + fileData.base64Content + metaFooter;

      const uploadRes = await this.fetchWithAuth(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
        {
          method: 'POST',
          headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
          body: uploadPayload
        },
        validToken
      );

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        return {
          fileId: uploadData.id,
          webViewLink: uploadData.webViewLink,
          name: uploadData.name
        };
      }
    } catch (err) {
      console.warn('[PersonalDriveService] Failed to upload attachment file:', err);
    }
    return null;
  }

  /**
   * Loads tracked WhatsApp groups from child's Personal Drive folder.
   */
  public static async loadTrackedChatsFromPersonalDrive(token?: string, childName?: string): Promise<any[] | null> {
    try {
      const validToken = token || await this.getValidToken(false);
      const resolvedChild = await this.resolveChildName(childName);
      const folder = await this.getOrCreatePersonalFolder(validToken, resolvedChild);
      const trackedFileName = `${resolvedChild}_${this.TRACKED_CHATS_FILE_NAME}`;

      const q = encodeURIComponent(`name = '${trackedFileName}' and '${folder.id}' in parents and trashed = false`);
      const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {}, validToken);

      if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.files && data.files.length > 0) {
          const fileId = data.files[0].id;
          const downloadRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {}, validToken);
          if (downloadRes.ok) {
            return await downloadRes.json();
          }
        }
      }
    } catch (e) {
      console.warn('[PersonalDriveService] Could not load tracked chats from Drive:', e);
    }
    return null;
  }

  private static PROFILES_CONFIG_FILE = 'child_profiles.json';

  /**
   * Saves multi-child profiles to root Personal Drive folder for cross-device recovery.
   */
  public static async saveProfilesToDrive(token?: string, profiles: any[] = []): Promise<void> {
    try {
      const validToken = token || await this.getValidToken(false);
      const root = await this.getOrCreateRootFolder(validToken);

      const q = encodeURIComponent(`name = '${this.PROFILES_CONFIG_FILE}' and '${root.id}' in parents and trashed = false`);
      const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {}, validToken);

      const payload = JSON.stringify(profiles, null, 2);

      let fileId = null;
      if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.files && data.files.length > 0) {
          fileId = data.files[0].id;
        }
      }

      if (fileId) {
        const updateRes = await this.fetchWithAuth(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: payload
          },
          validToken
        );
        if (!updateRes.ok) {
          const errText = await updateRes.text();
          await WhatsAppDiagnosticLogger.log('ERROR', 'DRIVE', `[DRIVE_PATCH_FAIL] Failed to update profiles: HTTP ${updateRes.status} | ${errText}`);
          throw new Error(`Google Drive update failed: HTTP ${updateRes.status}`);
        }
        await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `[DRIVE_PATCH_SUCCESS] Successfully updated profiles file (ID: ${fileId})`);
      } else {
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;
        const metadata = {
          name: this.PROFILES_CONFIG_FILE,
          mimeType: 'application/json',
          parents: [root.id]
        };
        const multipartBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          payload +
          closeDelimiter;

        const createRes = await this.fetchWithAuth(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
            body: multipartBody
          },
          validToken
        );
        if (!createRes.ok) {
          const errText = await createRes.text();
          await WhatsAppDiagnosticLogger.log('ERROR', 'DRIVE', `[DRIVE_CREATE_FAIL] Failed to create profiles: HTTP ${createRes.status} | ${errText}`);
          throw new Error(`Google Drive file creation failed: HTTP ${createRes.status}`);
        }
        const createdData = await createRes.json();
        await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `[DRIVE_CREATE_SUCCESS] Successfully created profiles file (ID: ${createdData.id})`);
      }
    } catch (e) {
      console.warn('[PersonalDriveService] Could not backup child profiles to Drive:', e);
    }
  }

  public static async searchDriveExports(token?: string, forceRefresh = false) {
    return this.searchWhatsAppExports(token, forceRefresh);
  }

  public static async searchWhatsAppExports(token?: string, forceRefresh = false): Promise<Array<{ id: string; name: string; mimeType: string; size?: string; sizeReadable?: string; createdTime?: string; modifiedTime?: string; webViewLink?: string }>> {
    try {
      let validToken = token || await this.getValidToken(forceRefresh);
      await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', '🔍 [RECENT_FILES_SCAN] Fetching recent files from Google Drive...');

      const res = await this.fetchWithAuth(
        `https://www.googleapis.com/drive/v3/files?q=trashed%20%3D%20false&fields=files(id,name,mimeType,size,createdTime,webViewLink)&pageSize=15&orderBy=createdTime desc`,
        {},
        validToken
      );

      let data = res.ok ? await res.json() : { files: [] };
      let files = data.files || [];

      // If 0 files and forceRefresh was false, force token scope refresh with drive.readonly
      if (files.length === 0 && !forceRefresh) {
        await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', '🔄 [RECENT_FILES_REFRESH] 0 files returned with cached token. Refreshing OAuth credentials with drive.readonly scope...');
        validToken = await this.getValidToken(true);
        return await this.searchWhatsAppExports(validToken, true);
      }

      await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `🔍 [RECENT_FILES_FOUND] Retrieved ${files.length} recent file(s) from Google Drive.`, {
        count: files.length,
        files: files.map((f: any) => ({ name: f.name, id: f.id, size: f.size, createdTime: f.createdTime }))
      });
      return files;
    } catch (e: any) {
      await WhatsAppDiagnosticLogger.log('ERROR', 'DRIVE', `[RECENT_FILES_ERROR] Error fetching recent files: ${e.message}`);
      console.warn('[PersonalDriveService] searchWhatsAppExports error:', e);
      return [];
    }
  }

  private static ingestQueue: Promise<any> = Promise.resolve();
  private static activeIngestCount: number = 0;
  private static queuedJobsCount: number = 0;

  /**
   * Ingests a discovered WhatsApp Export file from Google Drive, unzips/parses media & notices,
   * passes through AI normalization, and updates the child's master archive on Drive.
   * Runs sequentially through an internal FIFO queue to ensure strictly 1 group is processed at a time.
   */
  public static async ingestWhatsAppExport(
    fileId: string,
    targetChildName?: string,
    token?: string
  ): Promise<{ success: boolean; noticesCount: number; attachmentsCount: number; childName: string; chatName: string; error?: string }> {
    this.queuedJobsCount++;
    const position = this.queuedJobsCount;
    await SyncLifecycleManager.acquireIngestionLock();

    if (this.activeIngestCount > 0) {
      await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `⏳ [INGEST_QUEUED] Export file (ID: ${fileId}) placed in queue at position #${position}. Processing strictly 1 group at a time.`);
    }

    const runTask = async () => {
      this.activeIngestCount++;
      this.queuedJobsCount = Math.max(0, this.queuedJobsCount - 1);
      try {
        await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `🚀 [INGEST_DEQUEUED] Starting sequential processing for export file (ID: ${fileId})...`);
        const result = await this.doIngestWhatsAppExport(fileId, targetChildName, token);
        return result;
      } finally {
        this.activeIngestCount = Math.max(0, this.activeIngestCount - 1);
        await SyncLifecycleManager.releaseIngestionLock();
      }
    };

    const queuedPromise = this.ingestQueue.then(runTask, runTask);
    this.ingestQueue = queuedPromise.catch(() => {});
    return queuedPromise;
  }

  private static async doIngestWhatsAppExport(
    fileId: string,
    targetChildName?: string,
    token?: string
  ): Promise<{ success: boolean; noticesCount: number; attachmentsCount: number; childName: string; chatName: string; error?: string }> {
    const ingestStart = Date.now();
    try {
      const validToken = token || await this.getValidToken(false);
      const resolvedChild = await this.resolveChildName(targetChildName);

      await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `📥 [EXPORT_INGEST_START] Initiating export ingest for file (ID: ${fileId}) targeting Child: "${resolvedChild}"...`);

      // 1. Get file metadata
      const metaRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,createdTime`, {}, validToken);
      if (!metaRes.ok) {
        throw new Error(`Failed to read file metadata for ${fileId}: HTTP ${metaRes.status}`);
      }
      const meta = await metaRes.json();
      const fileName = meta.name || 'WhatsApp Chat Export';
      const fileSize = meta.size ? `${(parseInt(meta.size, 10) / (1024 * 1024)).toFixed(2)} MB` : 'Unknown size';

      await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `📥 [EXPORT_META] Downloading "${fileName}" (${fileSize}, MIME: ${meta.mimeType || 'unknown'})...`);

      // 2. Download binary stream
      const dlStart = Date.now();
      const dlRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {}, validToken);
      if (!dlRes.ok) {
        throw new Error(`Failed to download export stream: HTTP ${dlRes.status}`);
      }
      const arrayBuffer = await dlRes.arrayBuffer();
      const dlDuration = ((Date.now() - dlStart) / 1000).toFixed(1);

      await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `📥 [EXPORT_DOWNLOAD_SUCCESS] Downloaded ${arrayBuffer.byteLength} bytes in ${dlDuration}s.`);

      // 3. Parse ZIP or Plain Text
      const parsed: ParsedWhatsAppExport = await WhatsAppExportParser.parseExportBuffer(arrayBuffer, fileName);
      if (!parsed.chatText || parsed.chatText.trim().length === 0) {
        throw new Error('Export file contained no readable text messages.');
      }

      const chatName = parsed.chatName || fileName.replace(/^WhatsApp Chat (?:with|-)\s*/i, '').replace(/\.[^/.]+$/, '') || 'School WhatsApp';

      await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `📦 [EXPORT_UNPACK_SUCCESS] Unpacked export archive for "${chatName}": ${parsed.chatText.length} text chars, ${parsed.attachments.length} attachment files discovered.`, {
        chatName,
        textChars: parsed.chatText.length,
        attachments: parsed.attachments.map(a => `${a.name} (${a.mimeType})`)
      });

      // 4. Upload any unpacked attachments directly to Child's Attachments folder
      const driveUrlMap: { [fileName: string]: string } = {};
      let uploadedAttachCount = 0;

      for (let aIdx = 0; aIdx < parsed.attachments.length; aIdx++) {
        const att = parsed.attachments[aIdx];
        try {
          await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `📎 [EXPORT_ATTACH_UPLOAD ${aIdx + 1}/${parsed.attachments.length}] Uploading "${att.name}" (${att.mimeType}) to Google Drive "${chatName}" folder for ${resolvedChild}...`);
          const uploaded = await this.uploadAttachmentFile(validToken, att, resolvedChild, chatName);
          if (uploaded && uploaded.webViewLink) {
            driveUrlMap[att.name] = uploaded.webViewLink;
            uploadedAttachCount++;
            await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `📎 [EXPORT_ATTACH_OK] "${att.name}" backed up successfully.`);
          }
        } catch (attErr: any) {
          await WhatsAppDiagnosticLogger.log('WARN', 'DRIVE', `[EXPORT_ATTACH_WARN] Could not upload attachment "${att.name}": ${attErr.message}`);
          console.warn(`[PersonalDriveService] Failed to upload attachment ${att.name}:`, attErr);
        }
      }

      // 5. Normalize chat turns through AI Normalizer
      await WhatsAppDiagnosticLogger.log('INFO', 'EXTRACT', `🤖 [EXPORT_AI_START] Processing entire historical timeline for "${chatName}" through AI Normalization Engine...`);
      const notices = await AiNormalizerService.normalizeRawChatText(
        parsed.chatText,
        chatName,
        resolvedChild,
        undefined,
        driveUrlMap
      );

      // 6. Save structured notices to Google Drive
      const saveResult = await this.saveMessagesToPersonalDrive(validToken, notices, resolvedChild);
      const totalDuration = ((Date.now() - ingestStart) / 1000).toFixed(1);

      // 7. Auto-register in tracked_whatsapp_chats & update checkpoint pointer with latest message
      if (notices.length > 0 && chatName && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
          const stateData = await chrome.storage.local.get(['tracked_whatsapp_chats', 'chat_sync_pointers']);
          let trackedList: any[] = stateData.tracked_whatsapp_chats || [];
          if (!trackedList.some(t => (t.title && t.title.toLowerCase() === chatName.toLowerCase()) || (t.id && t.id.toLowerCase() === chatName.toLowerCase()))) {
            trackedList.push({
              id: 'wa_chat_' + chatName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
              title: chatName,
              platform: 'WhatsApp',
              isGroup: true,
              addedAt: new Date().toISOString()
            });
            await chrome.storage.local.set({ tracked_whatsapp_chats: trackedList });
            if (chrome.storage.sync) await chrome.storage.sync.set({ tracked_whatsapp_chats: trackedList });

            // Also update active ChildProfile with this tracked group
            try {
              const activeProf = await ChildManager.getActiveProfile();
              if (activeProf) {
                const pChats = activeProf.trackedChats || [];
                if (!pChats.some(t => t.title.toLowerCase() === chatName.toLowerCase() || t.id.toLowerCase() === chatName.toLowerCase())) {
                  pChats.push({
                    id: 'wa_chat_' + chatName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                    title: chatName,
                    platform: 'WhatsApp',
                    isGroup: true,
                    addedAt: new Date().toISOString()
                  });
                  await ChildManager.updateProfile(activeProf.id, { trackedChats: pChats });
                }
              }
            } catch (ce) {}
          }

          const latestNotice = notices[notices.length - 1] || notices[0];
          const pointers = stateData.chat_sync_pointers || {};
          pointers[chatName] = {
            id: latestNotice.id || null,
            sender: latestNotice.sender || 'School Teacher',
            body: (latestNotice.body || '').substring(0, 300),
            time: latestNotice.time || '',
            date: latestNotice.date || '',
            lastSyncedAt: new Date().toISOString(),
            totalNotices: saveResult.total || notices.length
          };
          await chrome.storage.local.set({ chat_sync_pointers: pointers });
        } catch (pe) {}
      }

      await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `🏁 [EXPORT_INGEST_COMPLETE] Successfully imported ${saveResult.saved} new notices (Total: ${saveResult.total}) & ${uploadedAttachCount} attachments in ${totalDuration}s for ${resolvedChild}!`, {
        childName: resolvedChild,
        chatName,
        saved: saveResult.saved,
        total: saveResult.total,
        attachmentsUploaded: uploadedAttachCount,
        durationSeconds: totalDuration
      });

      return {
        success: true,
        noticesCount: saveResult.saved,
        attachmentsCount: uploadedAttachCount,
        childName: resolvedChild,
        chatName
      };
    } catch (err: any) {
      await WhatsAppDiagnosticLogger.log('ERROR', 'DRIVE', `❌ [EXPORT_INGEST_FAIL] WhatsApp export ingest failed: ${err.message}`, {
        fileId,
        childName: targetChildName,
        error: err.message
      });
      return {
        success: false,
        noticesCount: 0,
        attachmentsCount: 0,
        childName: targetChildName || 'Active Child',
        chatName: 'Export',
        error: err.message
      };
    }
  }

  /**
   * Loads multi-child profiles from root Personal Drive folder for cross-device recovery.
   */
  public static async loadProfilesFromDrive(token?: string): Promise<any[] | null> {
    try {
      const validToken = token || await this.getValidToken(false);
      const root = await this.getOrCreateRootFolder(validToken);

      const q = encodeURIComponent(`name = '${this.PROFILES_CONFIG_FILE}' and '${root.id}' in parents and trashed = false`);
      const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {}, validToken);

      if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.files && data.files.length > 0) {
          const fileId = data.files[0].id;
          const downloadRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {}, validToken);
          if (downloadRes.ok) {
            return await downloadRes.json();
          }
        }
      }
    } catch (e) {
      console.warn('[PersonalDriveService] Could not load child profiles from Drive:', e);
    }
    return null;
  }
}
