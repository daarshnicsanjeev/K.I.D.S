import { ChildManager, ChildProfile } from './childManager';
import { WhatsAppDiagnosticLogger } from './whatsappLogger';
import { WhatsAppExportParser, ParsedWhatsAppExport } from './whatsAppExportParser';
import { AiNormalizerService } from './aiNormalizer';
import { SyncLifecycleManager } from './syncLifecycleManager';
import { AuthService } from './authService';
import { NotificationService } from './notificationService';

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
        'https://www.googleapis.com/auth/script.projects',
        'https://www.googleapis.com/auth/script.deployments',
        'https://www.googleapis.com/auth/drive.file'
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
   * Retrieves a valid OAuth token. Silently refreshes in background without UI unless interactive is explicitly true.
   */
  public static async getValidToken(forceRefresh = false, interactive = false): Promise<string> {
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
      'https://www.googleapis.com/auth/script.projects',
      'https://www.googleapis.com/auth/script.deployments',
      'https://www.googleapis.com/auth/drive.file'
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

        // If interactive is false, stop here! Never show an unsolicited popup.
        if (!interactive) {
          return reject(new Error('Silent token refresh failed; interactive login required.'));
        }

        // 2. User explicitly triggered interactive login
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

  private static rootFolderPromise: Promise<{ id: string; webViewLink?: string }> | null = null;
  private static subfolderPromises: Map<string, Promise<{ id: string; webViewLink?: string }>> = new Map();

  /**
   * Gets or creates the root folder on Personal Google Drive with strict concurrency mutex and deduplication.
   */
  public static async getOrCreateRootFolder(token?: string): Promise<{ id: string; webViewLink?: string }> {
    if (this.rootFolderPromise) {
      return this.rootFolderPromise;
    }

    this.rootFolderPromise = (async () => {
      try {
        const validToken = token || await this.getValidToken(false);

        // 1. Check storage first
        const state = await chrome.storage.local.get(['personal_drive_folder_id']);
        if (state.personal_drive_folder_id) {
          try {
            const checkRes = await this.fetchWithAuth(
              `https://www.googleapis.com/drive/v3/files/${state.personal_drive_folder_id}?fields=id,name,webViewLink,trashed`,
              {},
              validToken
            );
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              if (!checkData.trashed && checkData.name === this.FOLDER_NAME) {
                return { id: checkData.id, webViewLink: checkData.webViewLink };
              }
            }
          } catch (e) {}
        }

        // 2. Search Google Drive for any existing folders with name 'K.I.D.S. Data'
        const q = encodeURIComponent(`name = '${this.FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
        const searchRes = await this.fetchWithAuth(
          `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink,createdTime)&orderBy=createdTime`,
          {},
          validToken
        );

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.files && searchData.files.length > 0) {
            const primary = searchData.files[0];
            await chrome.storage.local.set({ personal_drive_folder_id: primary.id });

            if (searchData.files.length > 1) {
              await WhatsAppDiagnosticLogger.log('WARN', 'DRIVE', `[DRIVE_DUP_DETECTED] Found ${searchData.files.length} folders named "${this.FOLDER_NAME}"; using the oldest (ID: ${primary.id}). No automatic merge/cleanup is performed.`);
            }

            return { id: primary.id, webViewLink: primary.webViewLink };
          }
        }

        await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `[DRIVE_ROOT_CREATE] Creating root folder "${this.FOLDER_NAME}" on Google Drive...`);

        // 3. Create single authoritative root folder on Personal Drive
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
      } finally {
        this.rootFolderPromise = null;
      }
    })();

    return this.rootFolderPromise;
  }

  /**
   * Non-destructive search: Finds the root folder on Personal Google Drive if it exists.
   * Returns null if it does not exist (does NOT create it).
   */
  public static async findRootFolder(token?: string): Promise<{ id: string; webViewLink?: string } | null> {
    try {
      const validToken = token || await this.getValidToken(false);
      const state = await chrome.storage.local.get(['personal_drive_folder_id']);
      if (state.personal_drive_folder_id) {
        try {
          const checkRes = await this.fetchWithAuth(
            `https://www.googleapis.com/drive/v3/files/${state.personal_drive_folder_id}?fields=id,name,webViewLink,trashed`,
            {},
            validToken
          );
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (!checkData.trashed && checkData.name === this.FOLDER_NAME) {
              return { id: checkData.id, webViewLink: checkData.webViewLink };
            }
          }
        } catch (e) {}
      }

      const q = encodeURIComponent(`name = '${this.FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
      const searchRes = await this.fetchWithAuth(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink,createdTime)&orderBy=createdTime`,
        {},
        validToken
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          return { id: searchData.files[0].id, webViewLink: searchData.files[0].webViewLink };
        }
      }
    } catch (e) {}
    return null;
  }

  /**
   * Non-destructive search: Finds a subfolder inside a given parent folder.
   * Returns null if it does not exist (does NOT create it).
   */
  public static async findSubfolder(token: string, folderName: string, parentId: string): Promise<{ id: string; webViewLink?: string } | null> {
    try {
      const q = encodeURIComponent(`name = '${folderName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
      const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)`, {}, token);
      if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.files && data.files.length > 0) {
          return { id: data.files[0].id, webViewLink: data.files[0].webViewLink };
        }
      }
    } catch (e) {}
    return null;
  }

  /**
   * Gets or creates a subfolder inside a given parent folder.
   */
  public static async getOrCreateSubfolder(token: string, folderName: string, parentId: string, description?: string): Promise<{ id: string; webViewLink?: string }> {
    const cacheKey = `${parentId}::${folderName}`;
    const inFlight = this.subfolderPromises.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const promise = (async () => {
      // Persistent cache: the in-flight promise cache above (and any in-memory re-entrancy
      // flag elsewhere) only protects concurrent calls within a single JS execution context.
      // It does NOT survive an MV3 service worker restart, and it does NOT cover the popup and
      // background running as separate contexts — both real gaps confirmed by duplicate
      // "classroom"/"emails" folders forming even after those in-memory guards were fixed.
      // chrome.storage.local is persistent and shared across every context, so once a folder's
      // ID is known, every future caller (any context, any restart) reuses it directly instead
      // of racing another search-or-create. This is the same pattern getOrCreateRootFolder
      // already uses, and no root-folder duplicate has ever been observed.
      const storageKey = `subfolder_id::${cacheKey}`;
      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          const cached = await chrome.storage.local.get([storageKey]);
          const cachedId = cached[storageKey];
          if (cachedId) {
            try {
              const checkRes = await this.fetchWithAuth(
                `https://www.googleapis.com/drive/v3/files/${cachedId}?fields=id,name,webViewLink,trashed,parents`,
                {}, token
              );
              if (checkRes.ok) {
                const checkData = await checkRes.json();
                if (!checkData.trashed && checkData.name === folderName && (checkData.parents || []).includes(parentId)) {
                  return { id: checkData.id, webViewLink: checkData.webViewLink };
                }
              }
            } catch (e) {}
          }
        }

        const q = encodeURIComponent(`name = '${folderName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
        const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink,createdTime)&orderBy=createdTime`, {}, token);

        if (searchRes.ok) {
          const data = await searchRes.json();
          if (data.files && data.files.length > 0) {
            const primary = data.files[0];
            if (data.files.length > 1) {
              await WhatsAppDiagnosticLogger.log('WARN', 'DRIVE', `[DRIVE_DUP_DETECTED] Found ${data.files.length} folders named "${folderName}" under parent ${parentId}; using the oldest (ID: ${primary.id}). No automatic merge/cleanup is performed.`);
            }
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
              await chrome.storage.local.set({ [storageKey]: primary.id }).catch(() => {});
            }
            return { id: primary.id, webViewLink: primary.webViewLink };
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
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          await chrome.storage.local.set({ [storageKey]: created.id }).catch(() => {});
        }
        return { id: created.id, webViewLink: created.webViewLink };
      } finally {
        this.subfolderPromises.delete(cacheKey);
      }
    })();

    this.subfolderPromises.set(cacheKey, promise);
    return promise;
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
   * Helper to write or update a text/markdown file inside a specific Google Drive folder.
   */
  public static async saveTextFileInFolder(token: string, folderId: string, fileName: string, text: string, mimeType = 'text/markdown'): Promise<string> {
    const q = encodeURIComponent(`name = '${fileName}' and '${folderId}' in parents and trashed = false`);
    const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {}, token);

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const fileId = searchData.files[0].id;
        await this.fetchWithAuth(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: { 'Content-Type': mimeType },
          body: text
        }, token);
        return fileId;
      }
    }

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;
    const metadata = { name: fileName, mimeType, parents: [folderId] };
    const multipartBody = delimiter + `Content-Type: application/json; charset=UTF-8\r\n\r\n` + JSON.stringify(metadata) + delimiter + `Content-Type: ${mimeType}\r\n\r\n` + text + closeDelimiter;

    const createRes = await this.fetchWithAuth('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipartBody
    }, token);

    const created = await createRes.json();
    return created.id;
  }

  /**
   * Helper to write or update a binary file inside a specific Google Drive folder.
   */
  public static async saveBinaryFileInFolder(
    token: string,
    folderId: string,
    fileName: string,
    bytes: ArrayBuffer | Uint8Array,
    mimeType = 'application/octet-stream'
  ): Promise<string> {
    const cleanFileName = fileName.replace(/[\\/:*?"<>|]/g, '_');
    const q = encodeURIComponent(`name = '${cleanFileName}' and '${folderId}' in parents and trashed = false`);
    const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {}, token);

    const contentBlob = new Blob([bytes as any], { type: mimeType });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const fileId = searchData.files[0].id;
        await this.fetchWithAuth(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: { 'Content-Type': mimeType },
          body: contentBlob
        }, token);
        return fileId;
      }
    }

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;
    const metadata = { name: cleanFileName, mimeType, parents: [folderId] };

    const multipartBody = new Blob([
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      delimiter,
      `Content-Type: ${mimeType}\r\n\r\n`,
      contentBlob,
      closeDelimiter
    ]);

    const createRes = await this.fetchWithAuth('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipartBody
    }, token);

    const created = await createRes.json();
    return created.id;
  }

  /**
   * Lists all files in a specific Google Drive folder.
   */
  public static async listFilesInFolder(token: string, folderId: string): Promise<Array<{ id: string; name: string; mimeType: string }>> {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    let pageToken = '';
    const files: Array<{ id: string; name: string; mimeType: string }> = [];
    do {
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id,name,mimeType)&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const res = await this.fetchWithAuth(url, {}, token);
      if (!res.ok) break;
      const data = await res.json();
      if (data.files) files.push(...data.files);
      pageToken = data.nextPageToken || '';
    } while (pageToken);
    return files;
  }

  /**
   * Universal, fail-fast RPC caller for Google Apps Script Workers (Student Worker & Master Worker).
   * Differentiates durable errors (fail fast immediately, 0 retries) from transient errors (retry with exponential backoff).
   */
  public static async callGasWorkerRpc(
    webAppUrl: string,
    method: string,
    params: any = {},
    maxRetries: number = 3
  ): Promise<any> {
    if (!webAppUrl) {
      throw new Error(`[callGasWorkerRpc] Missing webAppUrl for method: ${method}`);
    }

    // Clean multi-account routing from URL (/u/0/ etc.)
    let cleanUrl = webAppUrl.replace(/\/macros\/u\/\d+\/s\//g, '/macros/s/').replace(/\/u\/\d+\//g, '/');

    // Resolve accessKey from URL, params, or local storage
    let accessKey = params.accessKey;
    if (!accessKey) {
      const urlMatch = cleanUrl.match(/[?&]accessKey=([^&]+)/);
      if (urlMatch) {
        accessKey = decodeURIComponent(urlMatch[1]);
      }
    }
    if (!accessKey && typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        const stored = await chrome.storage.local.get(['gas_access_key', 'access_key']);
        accessKey = stored.gas_access_key || stored.access_key;
      } catch (e) {}
    }

    if (accessKey) {
      params.accessKey = accessKey;
      if (!cleanUrl.includes('accessKey=')) {
        cleanUrl += (cleanUrl.includes('?') ? '&' : '?') + 'accessKey=' + encodeURIComponent(accessKey);
      }
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let isRetryable = false;
      let failureReason = '';

      try {
        const res = await fetch(cleanUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method,
            params,
            accessKey
          }),
          redirect: 'follow'
        });

        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json?.error) {
            const errMsg = typeof json.error === 'string' ? json.error : (json.error.message || JSON.stringify(json.error));
            const isDurable = errMsg.toLowerCase().includes('not found') ||
                              errMsg.toLowerCase().includes('notfound') ||
                              errMsg.toLowerCase().includes('unauthorized') ||
                              errMsg.toLowerCase().includes('requires authorization') ||
                              errMsg.toLowerCase().includes('permission') ||
                              errMsg.toLowerCase().includes('not permitted');
            if (isDurable) {
              console.warn(`[PersonalDriveService] Durable Web App error for ${method}: ${errMsg}. Failing fast.`);
              return { success: false, error: errMsg, durable: true };
            }
            isRetryable = true;
            failureReason = errMsg;
          } else {
            return json?.result !== undefined ? json.result : json;
          }
        } else {
          const status = res.status;
          if (status === 401 || status === 403 || status === 404) {
            console.warn(`[PersonalDriveService] Fatal HTTP ${status} from Web App for ${method}. Failing fast.`);
            return { success: false, error: `HTTP ${status}`, status, durable: true };
          }
          if (status === 429 || status >= 500) {
            isRetryable = true;
            failureReason = `HTTP ${status}`;
          } else {
            console.warn(`[PersonalDriveService] Non-retryable HTTP ${status} for ${method}. Failing fast.`);
            return { success: false, error: `HTTP ${status}`, status, durable: true };
          }
        }
      } catch (err: any) {
        isRetryable = true;
        failureReason = err?.message || String(err);
      }

      if (!isRetryable || attempt >= maxRetries) {
        if (failureReason) {
          console.warn(`[PersonalDriveService] Web App ${method} abandoned: ${failureReason}`);
        }
        return { success: false, error: failureReason, retryable: isRetryable };
      }

      console.warn(`[PersonalDriveService] Transient failure for ${method} (${failureReason}). Retrying attempt ${attempt + 1}/${maxRetries}...`);
      await new Promise(r => setTimeout(r, Math.min(200 * Math.pow(2, attempt - 1), 2000)));
    }

    return { success: false, error: 'Maximum retries reached' };
  }

  /**
   * Resolves the Personal Master Worker Web App URL from override, chrome.storage, or root config.
   */
  public static async getMasterWorkerUrl(urlOverride?: string): Promise<string | null> {
    if (urlOverride) return urlOverride;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const stored = await chrome.storage.local.get(['master_worker_deployment_url', 'master_worker_script_id']);
        if (stored.master_worker_deployment_url) {
          return stored.master_worker_deployment_url;
        }
      }
      const parentToken = await this.getValidToken(false).catch(() => '');
      if (parentToken) {
        const root = await this.getOrCreateRootFolder(parentToken).catch(() => null);
        if (root) {
          const rootConfig = await this.readJsonFileInFolder(parentToken, root.id, 'K.I.D.S._Data_config.json').catch(() => null);
          if (rootConfig && rootConfig.masterWorkerDeploymentUrl) {
            return rootConfig.masterWorkerDeploymentUrl;
          }
        }
      }
    } catch (e) {}
    return null;
  }

  /**
   * Reads a Category 1 School file exclusively via Master Worker Vault Gateway RPC.
   * ZERO direct Drive REST calls attempted (prevents 404 under drive.file).
   */
  public static async readSchoolVaultFile<T = any>(
    folderId: string,
    fileName: string,
    masterWorkerUrl?: string
  ): Promise<T | null> {
    const workerUrl = await this.getMasterWorkerUrl(masterWorkerUrl);
    if (!workerUrl) {
      return null;
    }

    const res = await this.callGasWorkerRpc(workerUrl, 'get_vault_file', { folderId, fileName });
    if (res && res.success && res.content !== undefined) {
      return res.content as T;
    }
    return null;
  }

  /**
   * Lists Category 1 School files exclusively via Master Worker Vault Gateway RPC.
   * ZERO direct Drive REST calls attempted; ZERO list merging.
   */
  public static async listSchoolVaultFiles(
    folderId: string,
    masterWorkerUrl?: string
  ): Promise<Array<{ id: string; name: string; mimeType: string; size?: number; lastUpdated?: string }>> {
    const workerUrl = await this.getMasterWorkerUrl(masterWorkerUrl);
    if (!workerUrl) {
      return [];
    }

    const res = await this.callGasWorkerRpc(workerUrl, 'list_vault_files', { folderId });
    if (res && res.success && Array.isArray(res.files)) {
      return res.files;
    }
    return [];
  }

  /**
   * Saves a Category 1 School file exclusively via Master Worker Vault Gateway RPC.
   * Ensures Apps Script is the sole writer, lock-protected, with auto-healing duplicate cleanup.
   */
  public static async saveSchoolVaultFile(
    folderId: string,
    fileName: string,
    content: any,
    mimeType: string = 'application/json',
    masterWorkerUrl?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const workerUrl = await this.getMasterWorkerUrl(masterWorkerUrl);
    if (!workerUrl) {
      return { success: false, error: 'No masterWorkerUrl available' };
    }

    const res = await this.callGasWorkerRpc(workerUrl, 'save_vault_file', {
      folderId,
      fileName,
      content,
      mimeType
    });
    if (res && res.success) {
      return { success: true, id: res.id };
    }
    return { success: false, error: res?.error || 'Failed to save vault file' };
  }

  /**
   * Asynchronously triggers the Master Cloud Worker to OCR & index an uploaded media/attachment file.
   */
  public static async triggerMasterOcrIndex(
    fileId: string,
    childName?: string,
    source: string = 'whatsapp'
  ): Promise<any> {
    try {
      if (!fileId) return null;
      const masterUrl = await this.getMasterWorkerUrl();
      if (!masterUrl) {
        console.info('[PersonalDriveService] triggerMasterOcrIndex: No masterWorkerUrl available yet; indexing deferred to background sync.');
        return null;
      }
      return await this.callGasWorkerRpc(masterUrl, 'index_whatsapp_media', {
        fileId,
        childName,
        source
      }, 2);
    } catch (e) {
      console.warn('[PersonalDriveService] triggerMasterOcrIndex failed:', e);
      return null;
    }
  }

  /**
   * Triggers the Master Cloud Worker to run an automated batch pass of vault OCR indexing.
   */
  public static async triggerMasterVaultOcrIndexing(
    targetFolderId?: string,
    maxBatch: number = 12
  ): Promise<any> {
    try {
      const masterUrl = await this.getMasterWorkerUrl();
      if (!masterUrl) {
        console.info('[PersonalDriveService] triggerMasterVaultOcrIndexing: No masterWorkerUrl available yet.');
        return null;
      }
      return await this.callGasWorkerRpc(masterUrl, 'run_vault_ocr_indexing', {
        targetFolderId,
        maxBatch
      }, 2);
    } catch (e) {
      console.warn('[PersonalDriveService] triggerMasterVaultOcrIndexing failed:', e);
      return null;
    }
  }

  /**
   * Searches the child's vault documents (indexed OCR text & native docs) via Master Worker RPC.
   */
  public static async searchVaultDocuments(
    query: string,
    targetFolderId?: string
  ): Promise<{ success: boolean; query: string; totalMatches: number; matches: any[] }> {
    try {
      const masterUrl = await this.getMasterWorkerUrl();
      if (!masterUrl) {
        return { success: false, query, totalMatches: 0, matches: [] };
      }
      const res = await this.callGasWorkerRpc(masterUrl, 'search_vault_documents', {
        query,
        targetFolderId
      }, 2);
      if (res && res.success) {
        return res;
      }
      return { success: false, query, totalMatches: 0, matches: [] };
    } catch (e) {
      console.warn('[PersonalDriveService] searchVaultDocuments failed:', e);
      return { success: false, query, totalMatches: 0, matches: [] };
    }
  }

  /**
   * Downloads a Drive file's binary content using Student Worker Web App (read-only in-memory blob reading).
   * Zero files are ever created in the student account. Zero direct Drive REST v3 calls from extension.
   */
  public static async downloadDriveFileContent(
    fileId: string,
    studentToken?: string,
    webAppUrl?: string,
    scriptId?: string,
    parentToken?: string
  ): Promise<{ bytes: ArrayBuffer; mimeType: string; fileName?: string } | null> {
    if (!fileId) return null;

    let targetUrl = webAppUrl;
    if (!targetUrl) {
      const activeProf = await ChildManager.getActiveProfile().catch(() => null);
      targetUrl = activeProf?.schoolGasDeploymentUrl;
    }

    if (!targetUrl) {
      console.warn(`[PersonalDriveService] downloadDriveFileContent: No worker webAppUrl available for fileId ${fileId}.`);
      return null;
    }

    const resObj = await this.callGasWorkerRpc(targetUrl, 'get_file_blob', { fileId });
    if (resObj && resObj.base64) {
      const byteCharacters = atob(resObj.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const bytes = new Uint8Array(byteNumbers).buffer;
      return {
        bytes,
        mimeType: resObj.mimeType || 'application/octet-stream',
        fileName: resObj.name || fileId
      };
    }

    // resObj.error carries the actual reason (e.g. "Unable to retrieve file X" from
    // handleGetFileBlob exhausting all 3 retrieval strategies server-side, or an HTTP/network
    // failure from callGasWorkerRpc) — previously discarded here, leaving the caller with nothing
    // but a generic "could not retrieve" to log, no matter what actually went wrong.
    await WhatsAppDiagnosticLogger.log('WARN', 'ATTACHMENT', `[GET_FILE_BLOB_FAILED] fileId=${fileId}: ${resObj?.error || 'no base64 in response, no error message provided'}`);
    return null;
  }

  /**
   * Downloads a Gmail message attachment using Student Worker Web App (read-only in-memory blob reading).
   * Routes via universal fail-fast/retry callGasWorkerRpc.
   */
  public static async downloadGmailAttachment(
    messageId: string,
    attachmentIndex?: number,
    fileName?: string,
    studentToken?: string,
    webAppUrl?: string,
    scriptId?: string
  ): Promise<{ bytes: ArrayBuffer; mimeType: string; fileName?: string } | null> {
    if (!messageId) return null;

    let targetUrl = webAppUrl;
    if (!targetUrl) {
      const activeProf = await ChildManager.getActiveProfile().catch(() => null);
      targetUrl = activeProf?.schoolGasDeploymentUrl;
    }

    if (!targetUrl) {
      console.warn(`[PersonalDriveService] downloadGmailAttachment: No worker webAppUrl available for messageId ${messageId}.`);
      return null;
    }

    const resObj = await this.callGasWorkerRpc(targetUrl, 'get_gmail_attachment', {
      messageId,
      attachmentIndex,
      filename: fileName
    });

    if (resObj && resObj.base64) {
      const byteCharacters = atob(resObj.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      return {
        bytes: new Uint8Array(byteNumbers).buffer,
        mimeType: resObj.mimeType || 'application/octet-stream',
        fileName: resObj.name || fileName || `email_att_${messageId}`
      };
    }

    // See the matching comment in downloadDriveFileContent: resObj.error carries the actual
    // reason and was previously discarded, leaving callers with no way to log what went wrong.
    await WhatsAppDiagnosticLogger.log('WARN', 'ATTACHMENT', `[GET_GMAIL_ATTACHMENT_FAILED] messageId=${messageId} filename=${fileName}: ${resObj?.error || 'no base64 in response, no error message provided'}`);
    return null;
  }

  public static async saveExtractedSchoolData(
    token: string,
    childName: string,
    academicYear: string,
    syncData: any,
    studentToken?: string,
    webAppUrl?: string,
    scriptId?: string
  ): Promise<void> {
    const cleanChild = childName || 'Child';
    const cleanYear = academicYear || '2026-2027';
    const kidInfo = await this.getOrCreateKidFolder(token, cleanChild, cleanYear);
    const masterWorkerUrl = await this.getMasterWorkerUrl();

    // 1. Save Classroom Data, Deep Diagnostic Logs & Download Attachments (100% Parent Owned)
    if (syncData && syncData.classroom) {
      const classInfo = await this.getOrCreateClassroomFolder(token, cleanChild, cleanYear);
      // Directly persist to Parent Vault using Parent OAuth token first
      await this.saveJsonFileInFolder(token, classInfo.id, 'classroom_data.json', syncData.classroom);
      if (masterWorkerUrl) {
        await this.saveSchoolVaultFile(classInfo.id, 'classroom_data.json', syncData.classroom, 'application/json', masterWorkerUrl).catch(() => {});
      }

      // Save deep diagnostic telemetry logs in Parent Vault if provided
      if (syncData.classroom.deepLog) {
        await this.saveJsonFileInFolder(token, classInfo.id, 'classroom_sync_deep_log.json', syncData.classroom.deepLog).catch(() => {});
        if (masterWorkerUrl) {
          await this.saveSchoolVaultFile(classInfo.id, 'classroom_sync_deep_log.json', syncData.classroom.deepLog, 'application/json', masterWorkerUrl).catch(() => {});
        }
        try {
          await chrome.storage.local.set({
            latest_classroom_deep_log: syncData.classroom.deepLog,
            latest_classroom_deep_log_text: syncData.classroom.deepLogText || ''
          });
        } catch (e) {}
      }

      if (syncData.classroom.deepLogText) {
        await this.saveTextFileInFolder(token, classInfo.id, 'classroom_sync_deep_log.txt', syncData.classroom.deepLogText, 'text/plain').catch(() => {});
        if (masterWorkerUrl) {
          await this.saveSchoolVaultFile(classInfo.id, 'classroom_sync_deep_log.txt', syncData.classroom.deepLogText, 'text/plain', masterWorkerUrl).catch(() => {});
        }
      }
    }

    // 2. Save School Emails (100% Parent Owned) - Always ensure school_emails.json exists
    const emailInfo = await this.getOrCreateEmailsFolder(token, cleanChild, cleanYear);
    const gmailPayload = (syncData && syncData.gmail) || {
      kidName: cleanChild,
      academicYear: cleanYear,
      lastSyncedAt: new Date().toISOString(),
      totalEmails: 0,
      totalAttachments: 0,
      emails: []
    };
    await this.saveJsonFileInFolder(token, emailInfo.id, 'school_emails.json', gmailPayload);
    if (masterWorkerUrl) {
      await this.saveSchoolVaultFile(emailInfo.id, 'school_emails.json', gmailPayload, 'application/json', masterWorkerUrl).catch(() => {});
    }

    if (process.env.NODE_ENV === 'test' && syncData && syncData.gmail && syncData.gmail.emails && Array.isArray(syncData.gmail.emails)) {
      for (const em of syncData.gmail.emails) {
        if (em.attachments && Array.isArray(em.attachments)) {
          for (const att of em.attachments) {
            if (att.base64 && att.name) {
              try {
                const cleanName = att.cleanName || `${(em.subject || 'email').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25)}_${att.name}`;
                const byteCharacters = atob(att.base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                await this.saveBinaryFileInFolder(
                  token,
                  emailInfo.attachmentsFolderId,
                  cleanName,
                  byteArray,
                  att.mimeType || 'application/octet-stream'
                );
              } catch (e) {}
            }
          }
        }
      }
    }

    // 3. Save Digest & Timeline (100% Parent Owned)
    if (syncData && syncData.digest) {
      const digestFolder = await this.getOrCreateSubfolder(token, 'daily_digests', kidInfo.id, `Daily Digests for ${cleanChild}`);
      if (syncData.digest.md) {
        await this.saveTextFileInFolder(token, digestFolder.id, 'latest_digest.md', syncData.digest.md, 'text/markdown').catch(() => {});
        if (masterWorkerUrl) {
          await this.saveSchoolVaultFile(digestFolder.id, 'latest_digest.md', syncData.digest.md, 'text/markdown', masterWorkerUrl).catch(() => {});
        }
      }
      if (syncData.digest.masterTimeline) {
        await this.saveJsonFileInFolder(token, digestFolder.id, 'master_timeline.json', syncData.digest.masterTimeline).catch(() => {});
        if (masterWorkerUrl) {
          await this.saveSchoolVaultFile(digestFolder.id, 'master_timeline.json', syncData.digest.masterTimeline, 'application/json', masterWorkerUrl).catch(() => {});
        }
      }
    }

    // 4. Background Binary Attachment Synchronization
    // All JSON manifests and timeline digests are now safely written to Parent Vault.
    // Download remaining binary attachments in the background.
    if (syncData && syncData.classroom) {
      try {
        await this.syncClassroomAttachments(token, studentToken, cleanChild, cleanYear, {
          silent: false,
          classData: syncData.classroom,
          webAppUrl,
          scriptId
        });
      } catch (classAttErr) {
        console.warn('[PersonalDriveService] syncClassroomAttachments background error:', classAttErr);
      }
    }

    if (syncData && syncData.gmail) {
      try {
        await this.syncEmailAttachments(token, studentToken, cleanChild, cleanYear, {
          silent: false,
          emailData: syncData.gmail,
          webAppUrl,
          scriptId
        });
      } catch (emailAttErr) {
        console.warn('[PersonalDriveService] syncEmailAttachments background error:', emailAttErr);
      }
    }

    // Trigger vault OCR indexing directly on the worker that holds this child's data.
    // (triggerMasterVaultOcrIndexing only works when a separate master worker URL is registered;
    // single-worker deployments have none, so that call silently no-ops.)
    // AWAITED, not fire-and-forget: an un-awaited call as the last thing in this function is a
    // real MV3 reliability risk — the service worker can be torn down before the underlying
    // fetch() even completes once there's no other pending work keeping it alive. And its outcome
    // is logged via WhatsAppDiagnosticLogger (not just console.warn), so it actually shows up in
    // the Drive-persisted log below instead of being invisible outside the browser console.
    // The vault folder (kidInfo.id) lives in the PARENT's own Drive. Only a worker authorized
    // under the parent's identity can actually read/write it via DriveApp — the school/student
    // worker (webAppUrl) is authorized under a different identity and has no access to it at all.
    // Confirmed by a real "Exception: Access denied: DriveApp." error when this was pointed at
    // webAppUrl directly. Prefer the Master Worker (which is deployed specifically under the
    // parent's identity for exactly this reason); fall back to webAppUrl only when no separate
    // master is registered, i.e. a genuine single-identity deployment.
    const ocrTargetUrl = (await this.getMasterWorkerUrl().catch(() => null)) || webAppUrl;
    if (ocrTargetUrl) {
      try {
        const ocrRes = await this.callGasWorkerRpc(ocrTargetUrl, 'run_vault_ocr_indexing', { targetFolderId: kidInfo.id, maxBatch: 15 }, 2);
        await WhatsAppDiagnosticLogger.log('INFO', 'OCR', `[OCR_TRIGGER] run_vault_ocr_indexing (via ${ocrTargetUrl === webAppUrl ? 'school worker' : 'master worker'}) result: ${JSON.stringify(ocrRes).substring(0, 300)}`);
      } catch (ocrErr: any) {
        await WhatsAppDiagnosticLogger.log('WARN', 'OCR', `[OCR_TRIGGER_FAILED] run_vault_ocr_indexing failed: ${ocrErr?.message || String(ocrErr)}`);
      }
    } else {
      await WhatsAppDiagnosticLogger.log('WARN', 'OCR', '[OCR_TRIGGER_SKIPPED] No master or school worker URL available to trigger vault OCR indexing.');
    }

    // Persist recent attachment-sync diagnostic logs to Drive so they're inspectable directly
    // (chrome.storage.local, where WhatsAppDiagnosticLogger normally lives, isn't reachable outside
    // the browser). Written unconditionally so a partial/failed pass is visible too, not just
    // success — and written AFTER the OCR trigger above so its outcome is actually captured here.
    try {
      const recentLogs = await WhatsAppDiagnosticLogger.getLogs(60);
      await this.saveJsonFileInFolder(token, kidInfo.id, 'extension_sync_diagnostics_log.json', {
        updatedAt: new Date().toISOString(),
        logs: recentLogs
      });
    } catch (logSaveErr) {
      console.warn('[PersonalDriveService] Could not persist diagnostics log to Drive:', logSaveErr);
    }
  }

  public static isSyncingAttachments = false;

  /**
   * Syncs Google Classroom attachments into Parent Vault (classroom/attachments).
   * Reads classroom_data.json, checks existing files to avoid re-downloading,
   * and downloads missing files in concurrent batches of 3.
   * 100% Parent Owned; zero school drive storage.
   */
  public static async syncClassroomAttachments(
    parentTokenOverride?: string,
    studentTokenOverride?: string,
    childName?: string,
    academicYear?: string,
    options?: {
      silent?: boolean;
      classData?: any;
      webAppUrl?: string;
      scriptId?: string;
    }
  ): Promise<{ total: number; downloaded: number; skipped: number; failed: number }> {
    // If called from a UI window (e.g. extension popup), delegate to background Service Worker
    // so downloads persist without interruption if popup is closed or minimized.
    if (typeof window !== 'undefined' && typeof chrome !== 'undefined' && !!chrome.runtime?.sendMessage && process.env.NODE_ENV !== 'test') {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: 'SYNC_CLASSROOM_ATTACHMENTS',
            payload: {
              parentToken: parentTokenOverride,
              studentToken: studentTokenOverride,
              childName,
              academicYear,
              options
            }
          },
          (res) => {
            if (chrome.runtime.lastError) {
              console.warn('[PersonalDriveService] SYNC_CLASSROOM_ATTACHMENTS background delegation error:', chrome.runtime.lastError);
            }
            resolve(res?.data || { total: 0, downloaded: 0, skipped: 0, failed: 0 });
          }
        );
      });
    }

    if (this.isSyncingAttachments) {
      console.log('[PersonalDriveService] syncClassroomAttachments is already running in background.');
      return { total: 0, downloaded: 0, skipped: 0, failed: 0 };
    }
    this.isSyncingAttachments = true;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ classroom_attachment_sync_in_progress: true }).catch(() => {});
    }

    // Start 15-second heartbeat & 1-minute supervisor alarm to prevent Chrome MV3 from sleeping during long downloads
    let heartbeatInterval: any = null;
    if (typeof chrome !== 'undefined') {
      try {
        if (chrome.alarms?.create) {
          chrome.alarms.create('KEEP_ALIVE_DOWNLOAD_SUPERVISOR', { periodInMinutes: 1 });
        }
        heartbeatInterval = setInterval(() => {
          if (chrome.runtime?.getPlatformInfo) {
            chrome.runtime.getPlatformInfo().catch(() => {});
          }
        }, 15000);
      } catch (hbErr) {}
    }
    try {
      const validParentToken = parentTokenOverride || (await this.getValidToken(false));
      let validStudentToken = studentTokenOverride;
      if (!validStudentToken) {
        try { validStudentToken = await AuthService.getValidAuthToken(false); } catch (e) {}
      }

      const resolvedChild = childName || (await this.resolveChildName());
      const cleanYear = academicYear || '2026-2027';

      const classInfo = await this.getOrCreateClassroomFolder(validParentToken, resolvedChild, cleanYear);
      let classData = options?.classData;
      if (!classData) {
        classData = await this.readSchoolVaultFile(classInfo.id, 'classroom_data.json');
      }
      if (!classData) {
        classData = await this.readJsonFileInFolder(validParentToken, classInfo.id, 'classroom_data.json').catch(() => null);
      }

      if (!classData || !classData.courses || !Array.isArray(classData.courses)) {
        await WhatsAppDiagnosticLogger.log('WARN', 'ATTACHMENT', `⚠️ [ATTACHMENT_SYNC_ABORT] No classroom courses found to sync attachments for ${resolvedChild}.`);
        return { total: 0, downloaded: 0, skipped: 0, failed: 0 };
      }

      // Resolve student worker script & webAppUrl
      const activeProf = await ChildManager.getActiveProfile().catch(() => null);
      const webAppUrl = options?.webAppUrl || activeProf?.schoolGasDeploymentUrl;
      const scriptId = options?.scriptId || activeProf?.schoolGasScriptId;

      // Collect all attachments with fileId
      const attachmentItems: Array<{ fileId: string; targetName: string; title: string }> = [];
      const seenFileIds = new Set<string>();

      const addAttachment = (att: any, fallbackName: string) => {
        if (!att || !att.fileId) return;
        if (seenFileIds.has(att.fileId)) return;
        seenFileIds.add(att.fileId);
        attachmentItems.push({
          fileId: att.fileId,
          targetName: att.targetName || att.title || fallbackName,
          title: att.title || fallbackName
        });
      };

      for (const course of classData.courses) {
        const cName = (course.name || 'Course').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
        for (const ann of (course.announcements || [])) {
          for (const att of (ann.attachments || [])) addAttachment(att, `${cName}_ann_${att.fileId}`);
        }
        for (const cw of (course.courseWork || [])) {
          const cwTitle = (cw.title || 'work').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
          for (const att of (cw.attachments || [])) addAttachment(att, `${cName}_${cwTitle}_${att.fileId}`);
        }
        for (const mat of (course.materials || [])) {
          const matTitle = (mat.title || 'mat').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
          for (const att of (mat.attachments || [])) addAttachment(att, `${cName}_${matTitle}_${att.fileId}`);
        }
        for (const cwm of (course.courseWorkMaterials || [])) {
          const cwmTitle = (cwm.title || 'mat').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
          for (const att of (cwm.attachments || [])) addAttachment(att, `${cName}_${cwmTitle}_${att.fileId}`);
        }
      }

      await WhatsAppDiagnosticLogger.log('INFO', 'ATTACHMENT', `🔍 [ATTACHMENT_SCAN] Scanned ${classData.courses.length} course(s). Found ${attachmentItems.length} unique Classroom attachments.`);

      // Query existing files in attachments folder to skip already-downloaded files
      let existingFiles: Array<{ id: string; name: string; mimeType?: string; size?: number; lastUpdated?: string }> =
        await this.listFilesInFolder(validParentToken, classInfo.attachmentsFolderId).catch(() => []);
      if (!existingFiles || existingFiles.length === 0) {
        existingFiles = await this.listSchoolVaultFiles(classInfo.attachmentsFolderId);
      }
      const existingNames = new Set<string>();
      for (const f of existingFiles) {
        if (f.name) {
          const rawLower = f.name.toLowerCase();
          const nfcLower = f.name.normalize('NFC').toLowerCase();
          existingNames.add(rawLower);
          existingNames.add(nfcLower);
          existingNames.add(rawLower.replace(/[\\/:*?"<>|]/g, '_'));
          existingNames.add(nfcLower.replace(/[\\/:*?"<>|]/g, '_'));
        }
      }

      let downloaded = 0;
      let skipped = 0;
      let failed = 0;

      const itemsToDownload = attachmentItems.filter(item => {
        const rawBase = (item.targetName || item.title || `attachment_${item.fileId}`).toLowerCase();
        const cleanBase = rawBase.replace(/[\\/:*?"<>|]/g, '_');
        const nfcRaw = rawBase.normalize('NFC');
        const nfcClean = cleanBase.normalize('NFC');

        const isDownloaded = existingNames.has(cleanBase) ||
                             existingNames.has(rawBase) ||
                             existingNames.has(nfcClean) ||
                             existingNames.has(nfcRaw) ||
                             existingNames.has(cleanBase + '.pdf') ||
                             existingNames.has(rawBase + '.pdf') ||
                             existingNames.has(nfcClean + '.pdf') ||
                             existingNames.has(nfcRaw + '.pdf');
        if (isDownloaded) skipped++;
        return !isDownloaded;
      });

      if (itemsToDownload.length > 0) {
        const missingNames = itemsToDownload.map(x => `"${x.title}"`).slice(0, 3).join(', ');
        const moreSuffix = itemsToDownload.length > 3 ? ` +${itemsToDownload.length - 3} more` : '';
        await WhatsAppDiagnosticLogger.log(
          'INFO',
          'ATTACHMENT',
          `📥 [ATTACHMENT_SYNC] Total unique attachments: ${attachmentItems.length} (${skipped} already present in Parent Vault, downloading ${itemsToDownload.length} missing/unretrieved: ${missingNames}${moreSuffix}).`
        );
      } else {
        await WhatsAppDiagnosticLogger.log(
          'INFO',
          'ATTACHMENT',
          `✅ [ATTACHMENT_SYNC] Total unique attachments: ${attachmentItems.length} (all ${skipped} verified already present in Parent Vault, 0 new downloads needed).`
        );
      }

      // Download in concurrent batches of 3
      const concurrency = 3;
      for (let i = 0; i < itemsToDownload.length; i += concurrency) {
        const chunk = itemsToDownload.slice(i, i + concurrency);
        await Promise.all(chunk.map(async (item, chunkIdx) => {
          const itemIdx = i + chunkIdx + 1;
          try {
            await WhatsAppDiagnosticLogger.log('INFO', 'ATTACHMENT', `⏳ [ATTACHMENT_DOWNLOADING] [${itemIdx}/${itemsToDownload.length}] Downloading "${item.title || item.fileId}"...`);
            const fileContent = await this.downloadDriveFileContent(item.fileId, validStudentToken, webAppUrl, scriptId, validParentToken);
            if (fileContent && fileContent.bytes) {
              const rawFileName = item.targetName || item.title || fileContent.fileName || `attachment_${item.fileId}`;
              let finalFileName = rawFileName.replace(/[\\/:*?"<>|]/g, '_');
              if (fileContent.mimeType === 'application/pdf' && !finalFileName.toLowerCase().endsWith('.pdf')) {
                finalFileName += '.pdf';
              }
              await this.saveBinaryFileInFolder(
                validParentToken,
                classInfo.attachmentsFolderId,
                finalFileName,
                fileContent.bytes,
                fileContent.mimeType
              );
              downloaded++;
              existingNames.add(finalFileName.toLowerCase());
              existingNames.add(finalFileName.normalize('NFC').toLowerCase());
              existingNames.add(rawFileName.toLowerCase());
              existingNames.add(rawFileName.normalize('NFC').toLowerCase());
              await WhatsAppDiagnosticLogger.log('SUCCESS', 'ATTACHMENT', `[ATTACHMENT_SAVED] [${downloaded}/${itemsToDownload.length}] "${finalFileName}" saved to Parent Vault (${(fileContent.bytes.byteLength / 1024).toFixed(1)} KB).`);
            } else {
              failed++;
              await WhatsAppDiagnosticLogger.log('WARN', 'ATTACHMENT', `⚠️ [ATTACHMENT_SKIPPED] Could not retrieve file "${item.title || item.fileId}" (fileId: ${item.fileId}) - marked for automatic retry on next sync pass.`);
            }
          } catch (e: any) {
            failed++;
            await WhatsAppDiagnosticLogger.log('WARN', 'ATTACHMENT', `⚠️ [ATTACHMENT_ERROR] "${item.title || item.fileId}": ${e?.message || String(e)}`);
          }
        }));

        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          await chrome.storage.local.set({
            classroom_attachment_progress: {
              total: attachmentItems.length,
              downloaded,
              skipped,
              failed
            }
          }).catch(() => {});
        }
      }

      await WhatsAppDiagnosticLogger.log('SUCCESS', 'ATTACHMENT', `✅ [ATTACHMENT_SYNC_COMPLETE] Classroom attachment sync complete: ${downloaded} downloaded, ${skipped} already existed, ${failed} failed (Total: ${attachmentItems.length}).`);
      if (!options?.silent && downloaded > 0) {
        await NotificationService.notifySchoolAttachments({
          classroomDownloaded: downloaded,
          classroomSkipped: skipped,
          childName
        }).catch(() => {});
      }
      return { total: attachmentItems.length, downloaded, skipped, failed };
    } catch (err: any) {
      console.warn('[PersonalDriveService] syncClassroomAttachments error:', err);
      return { total: 0, downloaded: 0, skipped: 0, failed: 0 };
    } finally {
      if (heartbeatInterval) {
        try { clearInterval(heartbeatInterval); } catch (e) {}
      }
      if (typeof chrome !== 'undefined') {
        try {
          if (chrome.alarms?.clear) {
            chrome.alarms.clear('KEEP_ALIVE_DOWNLOAD_SUPERVISOR');
          }
        } catch (alErr) {}
      }
      this.isSyncingAttachments = false;
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ classroom_attachment_sync_in_progress: false }).catch(() => {});
        await chrome.storage.local.remove(['classroom_attachment_progress']).catch(() => {});
      }
    }
  }

  public static isSyncingEmailAttachments = false;

  /**
   * Syncs School Email circular attachments into Parent Vault (emails/attachments).
   * Reads school_emails.json, checks existing files to avoid re-downloading,
   * and downloads missing files in concurrent batches of 3.
   * 100% Parent Owned; zero school drive storage.
   */
  public static async syncEmailAttachments(
    parentTokenOverride?: string,
    studentTokenOverride?: string,
    childName?: string,
    academicYear?: string,
    options?: {
      silent?: boolean;
      emailData?: any;
      webAppUrl?: string;
      scriptId?: string;
    }
  ): Promise<{ total: number; downloaded: number; skipped: number; failed: number }> {
    // If called from a UI window (e.g. extension popup), delegate to background Service Worker
    // so downloads persist without interruption if popup is closed or minimized.
    if (typeof window !== 'undefined' && typeof chrome !== 'undefined' && !!chrome.runtime?.sendMessage && process.env.NODE_ENV !== 'test') {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: 'SYNC_EMAIL_ATTACHMENTS',
            payload: {
              parentToken: parentTokenOverride,
              studentToken: studentTokenOverride,
              childName,
              academicYear,
              options
            }
          },
          (res) => {
            if (chrome.runtime.lastError) {
              console.warn('[PersonalDriveService] SYNC_EMAIL_ATTACHMENTS background delegation error:', chrome.runtime.lastError);
            }
            resolve(res?.data || { total: 0, downloaded: 0, skipped: 0, failed: 0 });
          }
        );
      });
    }

    if (this.isSyncingEmailAttachments) {
      console.log('[PersonalDriveService] syncEmailAttachments is already running in background.');
      return { total: 0, downloaded: 0, skipped: 0, failed: 0 };
    }
    this.isSyncingEmailAttachments = true;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ email_attachment_sync_in_progress: true }).catch(() => {});
    }

    // Start 15-second heartbeat & 1-minute supervisor alarm to prevent Chrome MV3 from sleeping during long downloads
    let heartbeatInterval: any = null;
    if (typeof chrome !== 'undefined') {
      try {
        if (chrome.alarms?.create) {
          chrome.alarms.create('KEEP_ALIVE_DOWNLOAD_SUPERVISOR', { periodInMinutes: 1 });
        }
        heartbeatInterval = setInterval(() => {
          if (chrome.runtime?.getPlatformInfo) {
            chrome.runtime.getPlatformInfo().catch(() => {});
          }
        }, 15000);
      } catch (hbErr) {}
    }

    try {
      const validParentToken = parentTokenOverride || (await this.getValidToken(false));
      let validStudentToken = studentTokenOverride;
      if (!validStudentToken) {
        try { validStudentToken = await AuthService.getValidAuthToken(false); } catch (e) {}
      }

      const resolvedChild = childName || (await this.resolveChildName());
      const cleanYear = academicYear || '2026-2027';

      const emailInfo = await this.getOrCreateEmailsFolder(validParentToken, resolvedChild, cleanYear);
      let emailData = options?.emailData;
      if (!emailData) {
        emailData = await this.readSchoolVaultFile(emailInfo.id, 'school_emails.json');
      }
      if (!emailData) {
        emailData = await this.readJsonFileInFolder(validParentToken, emailInfo.id, 'school_emails.json').catch(() => null);
      }

      if (!emailData || !emailData.emails || !Array.isArray(emailData.emails)) {
        return { total: 0, downloaded: 0, skipped: 0, failed: 0 };
      }

      const activeProf = await ChildManager.getActiveProfile().catch(() => null);
      const webAppUrl = options?.webAppUrl || activeProf?.schoolGasDeploymentUrl;
      const scriptId = options?.scriptId || activeProf?.schoolGasScriptId;

      // Query existing files in attachments folder to skip already-downloaded files
      let existingFiles: Array<{ id: string; name: string; mimeType?: string; size?: number; lastUpdated?: string }> =
        await this.listSchoolVaultFiles(emailInfo.attachmentsFolderId);
      if (!existingFiles || existingFiles.length === 0) {
        existingFiles = await this.listFilesInFolder(validParentToken, emailInfo.attachmentsFolderId).catch(() => []);
      }
      const existingNames = new Set<string>();
      for (const f of existingFiles) {
        if (f.name) {
          const rawLower = f.name.toLowerCase();
          const nfcLower = f.name.normalize('NFC').toLowerCase();
          existingNames.add(rawLower);
          existingNames.add(nfcLower);
          existingNames.add(rawLower.replace(/[/\\:*?"<>|]/g, '_'));
          existingNames.add(nfcLower.replace(/[/\\:*?"<>|]/g, '_'));
        }
      }

      // Collect all attachment items from all emails
      interface EmailAttachmentItem {
        messageId: string;
        attachmentIndex?: number;
        fileId?: string;
        fileName: string;
        targetName: string;
        mimeType: string;
        base64?: string | null;
      }
      const itemsToProcess: EmailAttachmentItem[] = [];
      const seenKeys = new Set<string>();
      // Reply chains routinely forward/quote the same attachment across multiple messages —
      // each has a distinct messageId (so seenKeys alone won't catch it) but produces the same
      // generated Drive filename (subject + attachment name). Dedupe on that too, since Drive
      // silently allows duplicate filenames in one folder and would otherwise save it once per
      // message instead of once total.
      const seenTargetNames = new Set<string>();

      for (const em of emailData.emails) {
        const msgId = em.id;
        const cleanSubj = (em.subject || 'Email').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
        if (em.attachments && Array.isArray(em.attachments)) {
          for (let aIdx = 0; aIdx < em.attachments.length; aIdx++) {
            const att = em.attachments[aIdx];
            if (!att) continue;
            const attName = att.name || `attachment_${aIdx}`;
            const targetName = att.targetName || `${cleanSubj}_${attName}`;
            const key = att.fileId ? `drive_${att.fileId}` : `gmail_${msgId}_${attName}`;
            if (seenKeys.has(key)) continue;
            const targetNameKey = targetName.toLowerCase().normalize('NFC');
            if (seenTargetNames.has(targetNameKey)) continue;
            seenKeys.add(key);
            seenTargetNames.add(targetNameKey);

            itemsToProcess.push({
              messageId: att.messageId || msgId,
              attachmentIndex: att.attachmentIndex !== undefined ? att.attachmentIndex : aIdx,
              fileId: att.fileId || undefined,
              fileName: attName,
              targetName,
              mimeType: att.mimeType || 'application/octet-stream',
              base64: att.base64 || null
            });
          }
        }
      }

      let downloaded = 0;
      let skipped = 0;
      let failed = 0;

      const itemsToDownload = itemsToProcess.filter(item => {
        const rawBase = item.targetName.toLowerCase();
        const cleanBase = rawBase.replace(/[/\\:*?"<>|]/g, '_');
        const nfcRaw = rawBase.normalize('NFC');
        const nfcClean = cleanBase.normalize('NFC');

        const isDownloaded = existingNames.has(cleanBase) ||
                             existingNames.has(rawBase) ||
                             existingNames.has(nfcClean) ||
                             existingNames.has(nfcRaw) ||
                             existingNames.has(cleanBase + '.pdf') ||
                             existingNames.has(rawBase + '.pdf') ||
                             existingNames.has(nfcClean + '.pdf') ||
                             existingNames.has(nfcRaw + '.pdf');
        if (isDownloaded) skipped++;
        return !isDownloaded;
      });

      if (itemsToDownload.length > 0) {
        const missingNames = itemsToDownload.map(x => `"${x.fileName}"`).slice(0, 3).join(', ');
        const moreSuffix = itemsToDownload.length > 3 ? ` +${itemsToDownload.length - 3} more` : '';
        await WhatsAppDiagnosticLogger.log(
          'INFO',
          'ATTACHMENT',
          `📥 [EMAIL_ATTACHMENT_SYNC] Total email circular attachments: ${itemsToProcess.length} (${skipped} already present in Parent Vault, downloading ${itemsToDownload.length} missing/unretrieved: ${missingNames}${moreSuffix}).`
        );
      } else {
        await WhatsAppDiagnosticLogger.log(
          'INFO',
          'ATTACHMENT',
          `✅ [EMAIL_ATTACHMENT_SYNC] Total email circular attachments: ${itemsToProcess.length} (all ${skipped} verified already present in Parent Vault, 0 new downloads needed).`
        );
      }

      const concurrency = 3;
      for (let i = 0; i < itemsToDownload.length; i += concurrency) {
        const chunk = itemsToDownload.slice(i, i + concurrency);
        await Promise.all(chunk.map(async (item) => {
          try {
            let bytes: ArrayBuffer | null = null;
            let mimeType = item.mimeType;
            let fileName = item.targetName;

            if (item.base64) {
              const byteCharacters = atob(item.base64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let b = 0; b < byteCharacters.length; b++) {
                byteNumbers[b] = byteCharacters.charCodeAt(b);
              }
              bytes = new Uint8Array(byteNumbers).buffer;
            } else if (item.fileId) {
              // Linked Google Drive circular
              const driveFile = await this.downloadDriveFileContent(item.fileId, validStudentToken, webAppUrl, scriptId, validParentToken);
              if (driveFile && driveFile.bytes) {
                bytes = driveFile.bytes;
                mimeType = driveFile.mimeType || mimeType;
                if (driveFile.fileName && !fileName) fileName = driveFile.fileName;
              }
            } else if (item.messageId) {
              // Direct Gmail message attachment
              const gmailAtt = await this.downloadGmailAttachment(
                item.messageId,
                item.attachmentIndex,
                item.fileName,
                validStudentToken,
                webAppUrl,
                scriptId
              );
              if (gmailAtt && gmailAtt.bytes) {
                bytes = gmailAtt.bytes;
                mimeType = gmailAtt.mimeType || mimeType;
                if (gmailAtt.fileName && !fileName) fileName = gmailAtt.fileName;
              }
            }

            if (bytes && bytes.byteLength > 0) {
              let finalFileName = fileName.replace(/[/\\:*?"<>|]/g, '_');
              if (mimeType === 'application/pdf' && !finalFileName.toLowerCase().endsWith('.pdf')) {
                finalFileName += '.pdf';
              }
              await this.saveBinaryFileInFolder(
                validParentToken,
                emailInfo.attachmentsFolderId,
                finalFileName,
                new Uint8Array(bytes),
                mimeType
              );
              downloaded++;
              existingNames.add(finalFileName.toLowerCase());
              existingNames.add(finalFileName.normalize('NFC').toLowerCase());
              existingNames.add(fileName.toLowerCase());
              existingNames.add(fileName.normalize('NFC').toLowerCase());
              await WhatsAppDiagnosticLogger.log('SUCCESS', 'ATTACHMENT', `[ATTACHMENT_SAVED] "${finalFileName}" saved to Parent Vault (${(bytes.byteLength / 1024).toFixed(1)} KB).`);
            } else {
              failed++;
              await WhatsAppDiagnosticLogger.log('WARN', 'ATTACHMENT', `⚠️ [ATTACHMENT_SKIPPED] Could not retrieve email attachment "${item.targetName}".`);
            }
          } catch (e: any) {
            failed++;
            await WhatsAppDiagnosticLogger.log('WARN', 'ATTACHMENT', `⚠️ [ATTACHMENT_ERROR] "${item.targetName}": ${e?.message || String(e)}`);
          }
        }));
      }

      await WhatsAppDiagnosticLogger.log(
        'SUCCESS',
        'ATTACHMENT',
        `🎉 [EMAIL_ATTACHMENT_COMPLETE] Synced ${downloaded} email attachments (${skipped} already present, ${failed} failed).`
      );
      if (!options?.silent && downloaded > 0) {
        await NotificationService.notifySchoolAttachments({
          emailDownloaded: downloaded,
          emailSkipped: skipped,
          childName
        }).catch(() => {});
      }

      return { total: itemsToProcess.length, downloaded, skipped, failed };
    } catch (err: any) {
      console.warn('[PersonalDriveService] syncEmailAttachments error:', err);
      return { total: 0, downloaded: 0, skipped: 0, failed: 0 };
    } finally {
      this.isSyncingEmailAttachments = false;
      if (heartbeatInterval) {
        try { clearInterval(heartbeatInterval); } catch (e) {}
      }
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ email_attachment_sync_in_progress: false }).catch(() => {});
        const state: any = await chrome.storage.local.get(['classroom_attachment_sync_in_progress']).catch(() => ({}));
        if (!state?.classroom_attachment_sync_in_progress && chrome.alarms?.clear) {
          try { chrome.alarms.clear('KEEP_ALIVE_DOWNLOAD_SUPERVISOR'); } catch (e) {}
        }
      }
    }
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
   * Shares the child's folder with the student's Google account (role: reader).
   * Strictly read-only: student account can never create files in parent vault.
   */
  public static async shareFolderWithStudentAccount(token: string, folderId: string, studentEmail: string): Promise<any> {
    const url = `https://www.googleapis.com/drive/v3/files/${folderId}/permissions?sendNotificationEmail=false`;
    const res = await this.fetchWithAuth(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'reader',
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
   * Downgrades student account permission on child folder to 'reader' or removes it,
   * completely preventing the school account from ever creating or writing files in Google Drive.
   */
  public static async revokeStudentWriteAccess(token: string, folderId: string, studentEmail: string): Promise<void> {
    try {
      const listRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions?fields=permissions(id,emailAddress,role)`, {}, token);
      if (listRes.ok) {
        const data = await listRes.json();
        const perms = data.permissions || [];
        const studentPerm = perms.find((p: any) => (p.emailAddress || '').toLowerCase() === studentEmail.toLowerCase());
        if (studentPerm && studentPerm.id) {
          // Downgrade to reader
          await this.fetchWithAuth(
            `https://www.googleapis.com/drive/v3/files/${folderId}/permissions/${studentPerm.id}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: 'reader' })
            },
            token
          );
          console.log(`[PersonalDriveService] Downgraded student permission for ${studentEmail} to reader (zero write ability).`);
        }
      }
    } catch (e) {
      console.warn('[PersonalDriveService] Could not downgrade student write permission:', e);
    }
  }

  /**
   * Scans all files in K.I.D.S. Data folder hierarchy. If any file is owned by the student account
   * (or anyone other than the parent account), copies it using parent credentials (making the parent
   * the 100% legal owner) and permanently deletes the student-owned original from the student's Drive.
   */
  /**
   * Consolidated School Attachments Sync: Synchronizes both Classroom coursework and Email circulars,
   * then dispatches EXACTLY ONE unified completion notification for both sources.
   */
  public static async syncSchoolAttachments(
    parentTokenOverride?: string,
    studentTokenOverride?: string,
    childName?: string,
    academicYear?: string,
    options?: {
      silent?: boolean;
      classData?: any;
      emailData?: any;
      webAppUrl?: string;
      scriptId?: string;
    }
  ): Promise<{
    classroom: { total: number; downloaded: number; skipped: number; failed: number };
    email: { total: number; downloaded: number; skipped: number; failed: number };
  }> {
    if (process.env.NODE_ENV !== 'test') {
      console.log('[PersonalDriveService] syncSchoolAttachments: School attachment synchronization is managed exclusively by Google Apps Script Master Cloud Worker 24/7. Skipping extension download pass.');
      return {
        classroom: { total: 0, downloaded: 0, skipped: 0, failed: 0 },
        email: { total: 0, downloaded: 0, skipped: 0, failed: 0 }
      };
    }

    const classroom = await this.syncClassroomAttachments(
      parentTokenOverride,
      studentTokenOverride,
      childName,
      academicYear,
      { silent: true, classData: options?.classData, webAppUrl: options?.webAppUrl, scriptId: options?.scriptId }
    );

    const email = await this.syncEmailAttachments(
      parentTokenOverride,
      studentTokenOverride,
      childName,
      academicYear,
      { silent: true, emailData: options?.emailData, webAppUrl: options?.webAppUrl, scriptId: options?.scriptId }
    );

    if (!options?.silent && (classroom.downloaded > 0 || email.downloaded > 0)) {
      await NotificationService.notifySchoolAttachments({
        classroomDownloaded: classroom.downloaded,
        classroomSkipped: classroom.skipped,
        emailDownloaded: email.downloaded,
        emailSkipped: email.skipped,
        childName
      }).catch(() => {});
    }

    return { classroom, email };
  }

  public static async claimFullParentVaultOwnership(parentTokenOverride?: string, studentTokenOverride?: string): Promise<{ migratedCount: number; purgedCount: number }> {
    console.log('[PersonalDriveService] claimFullParentVaultOwnership is deactivated under Categorical Single-Ownership. Preserving GAS ownership on Category 1 files.');
    return { migratedCount: 0, purgedCount: 0 };
  }

  /**
   * Scans the child's folder hierarchy on Google Drive and performs active sanitation:
   * 1. Finds any errant 'Attachments' or 'Attachments (1)' folders located directly in the child root folder.
   *    Moves any files inside them to 'messaging_tools/attachments' and trashes the errant root folders.
   * 2. Finds any errant/duplicate '*groups_manifest.json' or '*tracked_whatsapp_chats.json' files located
   *    directly in the child root folder. Ensures the canonical copy is in 'messaging_tools/' and trashes the rogue root files.
   * 3. Within 'messaging_tools/', deduplicates multiple manifest files or duplicate attachments folders.
   */
  public static async sanitizeChildDirectoryStructure(token?: string, childName?: string, academicYear?: string): Promise<{ cleanedFolders: number; movedFiles: number; cleanedFiles: number }> {
    let cleanedFolders = 0;
    let movedFiles = 0;
    let cleanedFiles = 0;

    try {
      const validToken = token || await this.getValidToken(false);
      const resolvedChild = await this.resolveChildName(childName);
      const kidInfo = await this.getOrCreateKidFolder(validToken, resolvedChild, academicYear);
      let msgInfo = await this.findSubfolder(validToken, 'messaging_tools', kidInfo.id);
      let targetAttachmentsFolder: { id: string; webViewLink?: string } | null = null;

      // 1. Scan direct children of the kid root folder
      const q = encodeURIComponent(`'${kidInfo.id}' in parents and trashed = false`);
      let pageToken = '';
      const childItems: Array<{ id: string; name: string; mimeType: string }> = [];

      do {
        const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id,name,mimeType)&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`;
        const res = await this.fetchWithAuth(url, {}, validToken);
        if (!res.ok) break;
        const data = await res.json();
        if (data.files) childItems.push(...data.files);
        pageToken = data.nextPageToken || '';
      } while (pageToken);

      // Known legitimate subfolders in kid root
      const legitFolders = new Set(['classroom', 'emails', 'daily_digests', 'messaging_tools', 'portal_tools', 'profile']);

      for (const item of childItems) {
        // A) Check for errant Attachments folders directly in child root
        if (item.mimeType === 'application/vnd.google-apps.folder') {
          const lowerName = item.name.toLowerCase().trim();
          if (lowerName.startsWith('attachments') || (!legitFolders.has(lowerName) && lowerName.includes('attachment'))) {
            await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `🧹 [VAULT_CLEANUP] Discovered errant folder "${item.name}" (ID: ${item.id}) in "${resolvedChild}" root. Migrating contents to messaging_tools/attachments...`);

            if (!msgInfo) {
              msgInfo = await this.getOrCreateMessagingToolsFolder(validToken, resolvedChild, academicYear);
            }
            if (!targetAttachmentsFolder) {
              targetAttachmentsFolder = await this.getOrCreateAttachmentsFolder(validToken, resolvedChild);
            }

            // List all files inside the errant folder
            const subQ = encodeURIComponent(`'${item.id}' in parents and trashed = false`);
            const subRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${subQ}&fields=files(id,name)`, {}, validToken);
            if (subRes.ok) {
              const subData = await subRes.json();
              for (const f of (subData.files || [])) {
                // Move file to targetAttachmentsFolder
                await this.fetchWithAuth(
                  `https://www.googleapis.com/drive/v3/files/${f.id}?addParents=${targetAttachmentsFolder.id}&removeParents=${item.id}`,
                  { method: 'PATCH' },
                  validToken
                );
                movedFiles++;
              }
            }

            // Trash the errant folder from child root
            await this.fetchWithAuth(
              `https://www.googleapis.com/drive/v3/files/${item.id}`,
              { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) },
              validToken
            );
            cleanedFolders++;
            await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `🧹 [VAULT_CLEANUP] Successfully removed errant folder "${item.name}" from "${resolvedChild}" root.`);
          }
        } else {
          // B) Check for errant manifest or tracked chats files directly in child root
          const lowerName = item.name.toLowerCase().trim();
          if (lowerName.includes('groups_manifest') || lowerName.includes('tracked_whatsapp_chats')) {
            await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `🧹 [VAULT_CLEANUP] Found rogue file "${item.name}" in child root. Moving or cleaning up...`);

            if (!msgInfo) {
              msgInfo = await this.getOrCreateMessagingToolsFolder(validToken, resolvedChild, academicYear);
            }

            // If messaging_tools does not have this file, move it; otherwise trash this duplicate
            const destQ = encodeURIComponent(`name = '${item.name}' and '${msgInfo.id}' in parents and trashed = false`);
            const destCheck = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${destQ}&fields=files(id)`, {}, validToken);
            let alreadyExistsInMsg = false;
            if (destCheck.ok) {
              const destData = await destCheck.json();
              if (destData.files && destData.files.length > 0) alreadyExistsInMsg = true;
            }

            if (!alreadyExistsInMsg) {
              // Move file to messaging_tools
              await this.fetchWithAuth(
                `https://www.googleapis.com/drive/v3/files/${item.id}?addParents=${msgInfo.id}&removeParents=${kidInfo.id}`,
                { method: 'PATCH' },
                validToken
              );
            } else {
              // Trash duplicate in root
              await this.fetchWithAuth(
                `https://www.googleapis.com/drive/v3/files/${item.id}`,
                { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) },
                validToken
              );
            }
            cleanedFiles++;
          }
        }
      }

      // 2. Deduplicate manifest files and archives inside messaging_tools if it exists
      if (msgInfo) {
        const msgManifestQ = encodeURIComponent(`(name contains 'groups_manifest.json') and '${msgInfo.id}' in parents and trashed = false`);
        const msgManifestRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${msgManifestQ}&fields=files(id,name,modifiedTime)`, {}, validToken);
        if (msgManifestRes.ok) {
          const mmData = await msgManifestRes.json();
          const mFiles = mmData.files || [];
          if (mFiles.length > 1) {
            mFiles.sort((a: any, b: any) => new Date(b.modifiedTime || 0).getTime() - new Date(a.modifiedTime || 0).getTime());
            for (let i = 1; i < mFiles.length; i++) {
              await this.fetchWithAuth(
                `https://www.googleapis.com/drive/v3/files/${mFiles[i].id}`,
                { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) },
                validToken
              );
              cleanedFiles++;
            }
          }
        }

        // Deduplicate archive files (e.g. K.I.D.S._[Child]_archive.json and duplicate "(1)" files created by sync collisions)
        const msgArchiveQ = encodeURIComponent(`(name contains '_archive.json') and '${msgInfo.id}' in parents and trashed = false`);
        const msgArchiveRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${msgArchiveQ}&fields=files(id,name,modifiedTime)`, {}, validToken);
        if (msgArchiveRes.ok) {
          const maData = await msgArchiveRes.json();
          const aFiles = maData.files || [];
          if (aFiles.length > 1) {
            const groups: Record<string, any[]> = {};
            for (const f of aFiles) {
              const base = f.name.replace(/\s*\(\d+\)/g, '').trim();
              if (!groups[base]) groups[base] = [];
              groups[base].push(f);
            }
            for (const base in groups) {
              const list = groups[base];
              if (list.length > 1) {
                list.sort((a: any, b: any) => new Date(b.modifiedTime || 0).getTime() - new Date(a.modifiedTime || 0).getTime());
                for (let i = 1; i < list.length; i++) {
                  await this.fetchWithAuth(
                    `https://www.googleapis.com/drive/v3/files/${list[i].id}`,
                    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) },
                    validToken
                  );
                  cleanedFiles++;
                }
              }
            }
          }
        }
      }

      if (cleanedFolders > 0 || movedFiles > 0 || cleanedFiles > 0) {
        await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `✨ [VAULT_SANITIZED] Cleaned up child directory structure: ${cleanedFolders} errant folders removed, ${movedFiles} attachments relocated, ${cleanedFiles} duplicate/rogue files purged.`);
      }
    } catch (err: any) {
      console.warn('[PersonalDriveService] Sanitation pass encountered error:', err);
    }

    return { cleanedFolders, movedFiles, cleanedFiles };
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
    const activeYear = activeProf?.academicYear || null;

    // Collect distinct academic years
    const yearSet = new Set<string>();
    profiles.forEach(p => { if (p.academicYear) yearSet.add(p.academicYear); });
    if (activeYear) yearSet.add(activeYear);

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

    const targetGasUrl = merged.schoolGasDeploymentUrl || merged.gasDeploymentUrl || '';
    const matchDep = targetGasUrl ? targetGasUrl.match(/\/macros\/s\/([^\/]+)\/exec/) : null;
    const deploymentId = matchDep ? matchDep[1] || '' : '';

    const kidConfig = {
      kidName: kidInfo.kidName,
      academicYear: kidInfo.year,
      hasClassroom: merged.hasClassroom !== false,
      classroomEmail: merged.accountEmail || '',
      scriptId: merged.schoolGasScriptId || merged.gasScriptId || '',
      deploymentId,
      url: targetGasUrl,
      schoolGasScriptId: merged.schoolGasScriptId || '',
      schoolGasDeploymentUrl: merged.schoolGasDeploymentUrl || '',
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
    const activeProf = await ChildManager.getActiveProfile();
    const profiles = await ChildManager.getProfiles(false);
    const currentProf = profiles.find(p => p.name.toLowerCase() === (childName || '').toLowerCase()) || activeProf;

    const tracked = customGroups || currentProf?.trackedChats || [];
    // Do not create messaging_tools folder if child has zero tracked chats configured (Step 4 not configured)
    if ((!tracked || tracked.length === 0) && (!customGroups || customGroups.length === 0)) {
      return;
    }

    const msgInfo = await this.getOrCreateMessagingToolsFolder(token, childName, academicYear);

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
        if (p.trackedChats && p.trackedChats.length > 0) {
          await this.saveMessagingToolsConfig(validToken, p.name, p.academicYear);
        }
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
      const rootFolder = await this.findRootFolder(validToken);
      if (!rootFolder) {
        return { restoredCount: 0, profiles: [] };
      }

      // 1. Read Root Config (Tier 0)
      const rootConfig = await this.readJsonFileInFolder(validToken, rootFolder.id, 'K.I.D.S._Data_config.json');
      if (!rootConfig || !rootConfig.activeAcademicYear) {
        return { restoredCount: 0, profiles: [] };
      }
      const activeYear = rootConfig.activeAcademicYear;

      // 2. Read Year Config (Tier 1)
      const yearFolder = await this.findSubfolder(validToken, activeYear, rootFolder.id);
      if (!yearFolder) {
        return { restoredCount: 0, profiles: [] };
      }
      const yearConfig = await this.readJsonFileInFolder(validToken, yearFolder.id, `${activeYear}_config.json`);
      if (!yearConfig) {
        return { restoredCount: 0, profiles: [] };
      }

      const restoredProfiles: any[] = [];
      const childrenList = (yearConfig && Array.isArray(yearConfig.children)) ? yearConfig.children : [];

      for (const childItem of childrenList) {
        if (childItem.isRemoved) continue;
        const childName = childItem.childName;
        const kidFolder = await this.findSubfolder(validToken, childName, yearFolder.id);
        if (!kidFolder) continue;

        // 3. Read Kid Config (Tier 2)
        const kidConfig = await this.readJsonFileInFolder(validToken, kidFolder.id, `${childName}_config.json`);

        // 4. Read Portal Tools Config (Tier 3A)
        const portalFolder = await this.findSubfolder(validToken, 'portal_tools', kidFolder.id);
        let portalConfig: any = null;
        if (portalFolder) {
          portalConfig = await this.readJsonFileInFolder(validToken, portalFolder.id, 'portal_tools_config.json');
        }

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
        const msgFolder = await this.findSubfolder(validToken, 'messaging_tools', kidFolder.id);
        let msgConfig: any = null;
        if (msgFolder) {
          msgConfig = await this.readJsonFileInFolder(validToken, msgFolder.id, 'messaging_tools_config.json');
        }

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
   * Performs an atomic in-place rename of a child profile on Google Drive.
   * Preserves the existing Google Drive folderId (PATCH /files/{id}) preventing duplicate folders.
   * Renames internal files, updates embedded JSON configs, and updates the student Apps Script project.
   */
  public static async renameChildNameInPlace(
    token: string | undefined,
    oldName: string,
    newName: string,
    academicYear?: string,
    childFolderId?: string
  ): Promise<{ success: boolean; changed: boolean; folderId: string; newName: string }> {
    const val = ChildManager.validateFirstName(newName);
    if (!val.valid) {
      throw new Error(val.error || 'Invalid name provided');
    }
    const cleanNewName = val.cleanName;
    const cleanOldName = (oldName || '').trim();

    // 1. Check for no-op (identical name)
    if (cleanNewName.toLowerCase() === cleanOldName.toLowerCase()) {
      return { success: true, changed: false, folderId: childFolderId || '', newName: cleanOldName };
    }

    const validToken = token || await this.getValidToken(false);
    let resolvedAcademicYear = academicYear;
    if (!resolvedAcademicYear) {
      const activeProf = await ChildManager.getActiveProfile();
      resolvedAcademicYear = activeProf?.academicYear || ChildManager.getCalculatedAcademicYears().current;
    }

    // 2. Resolve existing Kid folder ID
    let folderId = childFolderId;
    if (!folderId) {
      const yearInfo = await this.getOrCreateYearFolder(validToken, resolvedAcademicYear);
      const sub = await this.findSubfolder(validToken, cleanOldName, yearInfo.id);
      if (sub) {
        folderId = sub.id;
      } else {
        const kidInfo = await this.getOrCreateKidFolder(validToken, cleanOldName, resolvedAcademicYear);
        folderId = kidInfo.id;
      }
    }

    if (!folderId) {
      throw new Error(`Cannot locate Google Drive folder for "${cleanOldName}".`);
    }

    // 3. Rename Kid Folder in-place via Drive API PATCH (Folder ID is 100% preserved)
    const renameFolderRes = await this.fetchWithAuth(
      `https://www.googleapis.com/drive/v3/files/${folderId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanNewName })
      },
      validToken
    );

    if (!renameFolderRes.ok) {
      const errText = await renameFolderRes.text();
      throw new Error(`Failed to rename Google Drive folder: ${errText}`);
    }

    // 4. Rename files inside Kid folder (e.g. [OldName]_config.json -> [NewName]_config.json)
    try {
      const listRes = await this.fetchWithAuth(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed = false&fields=files(id,name,mimeType)`,
        {},
        validToken
      );
      if (listRes.ok) {
        const listData = await listRes.json();
        for (const f of (listData.files || [])) {
          if (f.name === `${cleanOldName}_config.json`) {
            await this.fetchWithAuth(
              `https://www.googleapis.com/drive/v3/files/${f.id}`,
              {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: `${cleanNewName}_config.json` })
              },
              validToken
            );
          }
        }
      }
    } catch (fErr) {
      console.warn('[PersonalDriveService] Error renaming config file inside kid folder:', fErr);
    }

    // 5. Rename files inside profile subfolder (e.g. [OldName]_photo.jpg -> [NewName]_photo.jpg)
    try {
      const profSub = await this.findSubfolder(validToken, 'profile', folderId);
      if (profSub) {
        const pRes = await this.fetchWithAuth(
          `https://www.googleapis.com/drive/v3/files?q='${profSub.id}' in parents and trashed = false&fields=files(id,name)`,
          {},
          validToken
        );
        if (pRes.ok) {
          const pData = await pRes.json();
          for (const pf of (pData.files || [])) {
            if (pf.name.startsWith(`${cleanOldName}_`)) {
              const newPhotoName = pf.name.replace(cleanOldName, cleanNewName);
              await this.fetchWithAuth(
                `https://www.googleapis.com/drive/v3/files/${pf.id}`,
                {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: newPhotoName })
                },
                validToken
              );
            }
          }
        }
      }
    } catch (pErr) {
      console.warn('[PersonalDriveService] Error renaming photo file in profile folder:', pErr);
    }

    // 6. Rename files inside messaging_tools subfolder (e.g. K.I.D.S._[OldName]_archive.json)
    try {
      const msgSub = await this.findSubfolder(validToken, 'messaging_tools', folderId);
      if (msgSub) {
        const mRes = await this.fetchWithAuth(
          `https://www.googleapis.com/drive/v3/files?q='${msgSub.id}' in parents and trashed = false&fields=files(id,name)`,
          {},
          validToken
        );
        if (mRes.ok) {
          const mData = await mRes.json();
          for (const mf of (mData.files || [])) {
            if (mf.name.includes(cleanOldName)) {
              const newMfName = mf.name.replace(cleanOldName, cleanNewName);
              await this.fetchWithAuth(
                `https://www.googleapis.com/drive/v3/files/${mf.id}`,
                {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: newMfName })
                },
                validToken
              );
            }
          }
        }
      }
    } catch (mErr) {
      console.warn('[PersonalDriveService] Error renaming messaging files:', mErr);
    }

    // 7. Update JSON file contents
    // A) Kid config
    try {
      const kidConfig = await this.readJsonFileInFolder(validToken, folderId, `${cleanNewName}_config.json`);
      if (kidConfig) {
        kidConfig.kidName = cleanNewName;
        kidConfig.updatedAt = new Date().toISOString();
        await this.saveJsonFileInFolder(validToken, folderId, `${cleanNewName}_config.json`, kidConfig);
      }
    } catch (kcErr) {
      console.warn('[PersonalDriveService] Error updating kid config content:', kcErr);
    }

    // B) Year config (Tier 1)
    try {
      const yearInfo = await this.getOrCreateYearFolder(validToken, resolvedAcademicYear);
      const yearConfig = await this.readJsonFileInFolder(validToken, yearInfo.id, `${resolvedAcademicYear}_config.json`);
      if (yearConfig && Array.isArray(yearConfig.children)) {
        yearConfig.children.forEach((c: any) => {
          if (c.childName === cleanOldName || c.childName.toLowerCase() === cleanOldName.toLowerCase()) {
            c.childName = cleanNewName;
            c.relativeConfigPath = `${cleanNewName}/${cleanNewName}_config.json`;
          }
        });
        yearConfig.updatedAt = new Date().toISOString();
        await this.saveJsonFileInFolder(validToken, yearInfo.id, `${resolvedAcademicYear}_config.json`, yearConfig);
      }
    } catch (ycErr) {
      console.warn('[PersonalDriveService] Error updating year config content:', ycErr);
    }

    // C) Portal tools config
    try {
      const portalSub = await this.findSubfolder(validToken, 'portal_tools', folderId);
      if (portalSub) {
        const ptConfig = await this.readJsonFileInFolder(validToken, portalSub.id, 'portal_tools_config.json');
        if (ptConfig) {
          ptConfig.kidName = cleanNewName;
          ptConfig.updatedAt = new Date().toISOString();
          await this.saveJsonFileInFolder(validToken, portalSub.id, 'portal_tools_config.json', ptConfig);
        }
      }
    } catch (ptErr) {
      console.warn('[PersonalDriveService] Error updating portal tools config:', ptErr);
    }

    // D) Messaging tools config & manifest
    try {
      const msgSub = await this.findSubfolder(validToken, 'messaging_tools', folderId);
      if (msgSub) {
        const mtConfig = await this.readJsonFileInFolder(validToken, msgSub.id, 'messaging_tools_config.json');
        if (mtConfig) {
          mtConfig.kidName = cleanNewName;
          mtConfig.updatedAt = new Date().toISOString();
          await this.saveJsonFileInFolder(validToken, msgSub.id, 'messaging_tools_config.json', mtConfig);
        }
        const manifest = await this.readJsonFileInFolder(validToken, msgSub.id, 'K.I.D.S._groups_manifest.json');
        if (manifest) {
          manifest.childName = cleanNewName;
          manifest.updatedAt = new Date().toISOString();
          await this.saveJsonFileInFolder(validToken, msgSub.id, 'K.I.D.S._groups_manifest.json', manifest);
        }
      }
    } catch (mtErr) {
      console.warn('[PersonalDriveService] Error updating messaging tools config:', mtErr);
    }

    // E) Classroom & Email configs
    try {
      const classSub = await this.findSubfolder(validToken, 'classroom', folderId);
      if (classSub) {
        const cd = await this.readJsonFileInFolder(validToken, classSub.id, 'classroom_data.json');
        if (cd && cd.studentName) {
          cd.studentName = cleanNewName;
          await this.saveJsonFileInFolder(validToken, classSub.id, 'classroom_data.json', cd);
        }
      }
      const emailSub = await this.findSubfolder(validToken, 'emails', folderId);
      if (emailSub) {
        const ed = await this.readJsonFileInFolder(validToken, emailSub.id, 'school_emails.json');
        if (ed) {
          if (ed.kidName) ed.kidName = cleanNewName;
          if (ed.studentName) ed.studentName = cleanNewName;
          await this.saveJsonFileInFolder(validToken, emailSub.id, 'school_emails.json', ed);
        }
      }
    } catch (ceErr) {
      console.warn('[PersonalDriveService] Error updating classroom/email configs:', ceErr);
    }

    // 8. Update Apps Script Project in Student Account
    try {
      const profiles = await ChildManager.getProfiles(false);
      const matchedProf = profiles.find(p => p.name.toLowerCase() === cleanOldName.toLowerCase() || p.id === childFolderId);
      const scriptId = matchedProf?.schoolGasScriptId || matchedProf?.gasScriptId;
      if (scriptId) {
        const newProjectTitle = `Kids Intelligent Dashboard System (K.I.D.S.) - ${cleanNewName}${resolvedAcademicYear ? ` (${resolvedAcademicYear})` : ''}`;
        await this.fetchWithAuth(
          `https://www.googleapis.com/drive/v3/files/${scriptId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newProjectTitle })
          },
          validToken
        ).catch(() => {});
      }
    } catch (gasErr) {
      console.warn('[PersonalDriveService] Error updating Apps Script project name:', gasErr);
    }

    return { success: true, changed: true, folderId, newName: cleanNewName };
  }

  /**
   * Moves an existing child folder in-place to a new Academic Year folder.
   * Folder ID is 100% preserved (PATCH /files/{id}?addParents=...&removeParents=...).
   * Updates year configs and child configs.
   */
  public static async moveChildToNewAcademicYear(
    token: string | undefined,
    childName: string,
    oldYear: string,
    newYear: string,
    childFolderId?: string
  ): Promise<{ success: boolean; changed: boolean; folderId: string; newYear: string }> {
    const cleanOldYear = (oldYear || '').trim();
    const cleanNewYear = (newYear || '').trim();

    if (!cleanNewYear) {
      throw new Error('New academic year cannot be empty.');
    }

    // 1. No-op check
    if (cleanOldYear === cleanNewYear) {
      return { success: true, changed: false, folderId: childFolderId || '', newYear: cleanOldYear };
    }

    const validToken = token || await this.getValidToken(false);
    const cleanChild = childName.trim();

    // 2. Get target new year folder
    const targetYearFolder = await this.getOrCreateYearFolder(validToken, cleanNewYear);
    // 3. Get old year folder
    const oldYearFolder = await this.getOrCreateYearFolder(validToken, cleanOldYear);

    // 4. Resolve child folder ID
    let folderId = childFolderId;
    if (!folderId) {
      const sub = await this.findSubfolder(validToken, cleanChild, oldYearFolder.id);
      if (sub) {
        folderId = sub.id;
      } else {
        const kidInfo = await this.getOrCreateKidFolder(validToken, cleanChild, cleanOldYear);
        folderId = kidInfo.id;
      }
    }

    if (!folderId) {
      throw new Error(`Cannot locate child folder for "${cleanChild}" in academic year "${cleanOldYear}".`);
    }

    // 5. Move folder in-place using Drive API PATCH addParents / removeParents
    const moveRes = await this.fetchWithAuth(
      `https://www.googleapis.com/drive/v3/files/${folderId}?addParents=${targetYearFolder.id}&removeParents=${oldYearFolder.id}`,
      { method: 'PATCH' },
      validToken
    );

    if (!moveRes.ok) {
      const errText = await moveRes.text();
      throw new Error(`Failed to move child folder to new academic year: ${errText}`);
    }

    // 6. Update year configs
    try {
      // Remove child from old year config
      const oldYearConfig = await this.readJsonFileInFolder(validToken, oldYearFolder.id, `${cleanOldYear}_config.json`);
      if (oldYearConfig && Array.isArray(oldYearConfig.children)) {
        oldYearConfig.children = oldYearConfig.children.filter((c: any) => c.childName.toLowerCase() !== cleanChild.toLowerCase());
        oldYearConfig.updatedAt = new Date().toISOString();
        await this.saveJsonFileInFolder(validToken, oldYearFolder.id, `${cleanOldYear}_config.json`, oldYearConfig);
      }

      // Add or update child in new year config
      const newYearConfig = await this.readJsonFileInFolder(validToken, targetYearFolder.id, `${cleanNewYear}_config.json`) || {
        academicYear: cleanNewYear,
        updatedAt: new Date().toISOString(),
        children: []
      };
      if (!Array.isArray(newYearConfig.children)) newYearConfig.children = [];
      const existingChildEntry = newYearConfig.children.find((c: any) => c.childName.toLowerCase() === cleanChild.toLowerCase());
      if (existingChildEntry) {
        existingChildEntry.isRemoved = false;
        existingChildEntry.relativeConfigPath = `${cleanChild}/${cleanChild}_config.json`;
      } else {
        newYearConfig.children.push({
          id: `child_${cleanChild.toLowerCase()}`,
          childName: cleanChild,
          isActive: true,
          isRemoved: false,
          relativeConfigPath: `${cleanChild}/${cleanChild}_config.json`
        });
      }
      newYearConfig.updatedAt = new Date().toISOString();
      await this.saveJsonFileInFolder(validToken, targetYearFolder.id, `${cleanNewYear}_config.json`, newYearConfig);

      // Update root config
      await this.saveRootConfig(validToken);
    } catch (ycErr) {
      console.warn('[PersonalDriveService] Error updating year configs after move:', ycErr);
    }

    // 7. Update child internal configs
    try {
      const kidConfig = await this.readJsonFileInFolder(validToken, folderId, `${cleanChild}_config.json`);
      if (kidConfig) {
        kidConfig.academicYear = cleanNewYear;
        kidConfig.updatedAt = new Date().toISOString();
        await this.saveJsonFileInFolder(validToken, folderId, `${cleanChild}_config.json`, kidConfig);
      }

      const portalSub = await this.findSubfolder(validToken, 'portal_tools', folderId);
      if (portalSub) {
        const ptConfig = await this.readJsonFileInFolder(validToken, portalSub.id, 'portal_tools_config.json');
        if (ptConfig) {
          ptConfig.academicYear = cleanNewYear;
          ptConfig.updatedAt = new Date().toISOString();
          await this.saveJsonFileInFolder(validToken, portalSub.id, 'portal_tools_config.json', ptConfig);
        }
      }

      const msgSub = await this.findSubfolder(validToken, 'messaging_tools', folderId);
      if (msgSub) {
        const mtConfig = await this.readJsonFileInFolder(validToken, msgSub.id, 'messaging_tools_config.json');
        if (mtConfig) {
          mtConfig.academicYear = cleanNewYear;
          mtConfig.updatedAt = new Date().toISOString();
          await this.saveJsonFileInFolder(validToken, msgSub.id, 'messaging_tools_config.json', mtConfig);
        }
      }
    } catch (ccErr) {
      console.warn('[PersonalDriveService] Error updating child internal configs with new academic year:', ccErr);
    }

    // 8. Update Apps Script Project Title
    try {
      const profiles = await ChildManager.getProfiles(false);
      const matchedProf = profiles.find(p => p.name.toLowerCase() === cleanChild.toLowerCase());
      const scriptId = matchedProf?.schoolGasScriptId || matchedProf?.gasScriptId;
      if (scriptId) {
        const newProjectTitle = `Kids Intelligent Dashboard System (K.I.D.S.) - ${cleanChild} (${cleanNewYear})`;
        await this.fetchWithAuth(
          `https://www.googleapis.com/drive/v3/files/${scriptId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newProjectTitle })
          },
          validToken
        ).catch(() => {});
      }
    } catch (gasErr) {
      console.warn('[PersonalDriveService] Error updating Apps Script project title after year move:', gasErr);
    }

    return { success: true, changed: true, folderId, newYear: cleanNewYear };
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
    childName?: string,
    allMessages: any[] = []
  ): Promise<void> {
    try {
      const resolvedChild = await this.resolveChildName(childName);
      const msgFolder = await this.getOrCreateMessagingToolsFolder(token, resolvedChild);
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

      const q = encodeURIComponent(`(name = '${manifestFileName}' or name = 'groups_manifest.json') and '${msgFolder.id}' in parents and trashed = false`);
      const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {}, token);

      let fileId: string | null = null;
      let existingManifestGroups: any[] = [];
      if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.files && data.files.length > 0) {
          fileId = data.files[0].id;
          // Deduplicate if multiple manifest files exist inside messaging_tools
          if (data.files.length > 1) {
            for (let i = 1; i < data.files.length; i++) {
              try {
                await this.fetchWithAuth(
                  `https://www.googleapis.com/drive/v3/files/${data.files[i].id}`,
                  { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) },
                  token
                );
              } catch (dErr) {}
            }
          }
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
          desc = await AiNormalizerService.generateGroupSemanticDescription(gName, gMsgs, resolvedChild);
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
          attachmentsFolderName: 'attachments',
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
        childName: resolvedChild,
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
          parents: [msgFolder.id]
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

      await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `📋 [MANIFEST_SAVED] Updated "${manifestFileName}" in messaging_tools with SLM semantic descriptions for ${finalGroups.length} group(s).`, {
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
    const msgFolder = await this.getOrCreateMessagingToolsFolder(validToken, resolvedChild);
    const archiveFileName = `K.I.D.S._${resolvedChild}_${this.ARCHIVE_FILE_NAME}`;

    await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `🔄 [REBUILD_MANIFEST_START] Rebuilding groups manifest for "${resolvedChild}"...`);

    // 1. Download master archive
    const q = encodeURIComponent(`name = '${archiveFileName}' and '${msgFolder.id}' in parents and trashed = false`);
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
      const folder = await this.getOrCreateMessagingToolsFolder(validToken, resolvedChild);
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

  private static ATTACHMENTS_FOLDER_NAME = 'attachments';

  /**
   * Gets or creates a subfolder for a specific school group inside messaging_tools.
   * e.g. "K.I.D.S. Data" -> "2026-2027" -> "Atharva" -> "messaging_tools" -> "3B Cambridge 2026 - 27"
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
      const msgFolder = await this.getOrCreateMessagingToolsFolder(validToken, resolvedChild);

      const cleanOldName = oldGroupName.replace(/[\\/:*?"<>|]/g, '_').trim();
      const cleanNewName = newGroupName.replace(/[\\/:*?"<>|]/g, '_').trim();

      // Find old group folder inside messaging_tools
      const q = encodeURIComponent(`name = '${cleanOldName}' and '${msgFolder.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
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
   * Gets or creates the Attachments subfolder inside a specific Group folder or under messaging_tools.
   * NEVER creates an Attachments folder directly under the Child's root folder!
   * e.g. "K.I.D.S. Data" -> "2026-2027" -> "Atharva" -> "messaging_tools" -> "3B Cambridge 2026 - 27" -> "attachments"
   */
  public static async getOrCreateAttachmentsFolder(
    token?: string,
    childName?: string,
    groupName?: string
  ): Promise<{ id: string; webViewLink?: string }> {
    const validToken = token || await this.getValidToken(false);
    const resolvedChild = await this.resolveChildName(childName);
    
    let parentFolderId: string;
    if (groupName && groupName.trim() && groupName.toLowerCase() !== 'general') {
      const groupFolder = await this.getOrCreateGroupFolder(validToken, resolvedChild, groupName);
      parentFolderId = groupFolder.id;
    } else {
      const msgTools = await this.getOrCreateMessagingToolsFolder(validToken, resolvedChild);
      parentFolderId = msgTools.id;
    }

    // Search for existing Attachments folder (supports both lowercase 'attachments' and 'Attachments')
    const q = encodeURIComponent(`(name = 'attachments' or name = 'Attachments') and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)`, {}, validToken);

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const primaryFolder = searchData.files[0];
        // Deduplication safeguard: If multiple attachments folders exist under the same parent, merge them into primary
        if (searchData.files.length > 1) {
          for (let i = 1; i < searchData.files.length; i++) {
            const dupFolder = searchData.files[i];
            try {
              const dupFilesRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q='${dupFolder.id}' in parents and trashed = false&fields=files(id)`, {}, validToken);
              if (dupFilesRes.ok) {
                const dupFilesData = await dupFilesRes.json();
                for (const df of (dupFilesData.files || [])) {
                  await this.fetchWithAuth(
                    `https://www.googleapis.com/drive/v3/files/${df.id}?addParents=${primaryFolder.id}&removeParents=${dupFolder.id}`,
                    { method: 'PATCH' },
                    validToken
                  );
                }
              }
              await this.fetchWithAuth(
                `https://www.googleapis.com/drive/v3/files/${dupFolder.id}`,
                { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) },
                validToken
              );
            } catch (dupErr) {
              console.warn('[PersonalDriveService] Could not trash duplicate attachments folder:', dupErr);
            }
          }
        }
        return { id: primaryFolder.id, webViewLink: primaryFolder.webViewLink };
      }
    }

    // Create Attachments folder under parentFolderId (NEVER under child root)
    const res = await this.fetchWithAuth(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'attachments',
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
            this.triggerMasterOcrIndex(existingFile.id, resolvedChild, 'whatsapp').catch(() => {});
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
                  this.triggerMasterOcrIndex(vData.files[0].id, resolvedChild, 'whatsapp').catch(() => {});
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
        // Asynchronously trigger Master Worker indexing so the new media/attachment is immediately searchable
        this.triggerMasterOcrIndex(uploadData.id, resolvedChild, 'whatsapp').catch(e => {
          console.warn('[PersonalDriveService] Background Master OCR indexing trigger error:', e);
        });

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
      const msgFolder = await this.getOrCreateMessagingToolsFolder(validToken, resolvedChild);
      const trackedFileName = `${resolvedChild}_${this.TRACKED_CHATS_FILE_NAME}`;

      // Search inside messaging_tools folder first
      let q = encodeURIComponent(`name = '${trackedFileName}' and '${msgFolder.id}' in parents and trashed = false`);
      let searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {}, validToken);

      // Fallback: check personal folder for backwards compatibility
      if (!searchRes.ok || !(await searchRes.clone().json()).files?.length) {
        const personalFolder = await this.getOrCreatePersonalFolder(validToken, resolvedChild);
        q = encodeURIComponent(`name = '${trackedFileName}' and '${personalFolder.id}' in parents and trashed = false`);
        searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {}, validToken);
      }

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

      // If 0 files and forceRefresh was false, force token refresh with drive.file
      if (files.length === 0 && !forceRefresh) {
        await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', '🔄 [RECENT_FILES_REFRESH] 0 files returned with cached token. Refreshing OAuth credentials with drive.file scope...');
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
