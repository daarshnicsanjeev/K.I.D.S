/**
 * PersonalDriveService
 * Directly manages WhatsApp archiving and attachment storage on the PARENT'S PERSONAL Google Drive,
 * ensuring complete privacy isolation from school-administered student accounts.
 */

export interface PersonalDriveFolderInfo {
  isCreated: boolean;
  accountEmail: string;
  folderId?: string;
  folderName: string;
  folderUrl?: string;
}

export class PersonalDriveService {
  private static FOLDER_NAME = 'School Portal MCP Intelligence';
  private static ARCHIVE_FILE_NAME = 'whatsapp_school_archive.json';

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
      'https://www.googleapis.com/auth/drive.file'
    ].join(' ');

    const email = state.personal_drive_account_email || '';
    let authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}`;

    if (email) {
      authUrl += `&login_hint=${encodeURIComponent(email)}`;
    }

    return new Promise((resolve, reject) => {
      // 1. Try silent background refresh
      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: false }, async (responseUrl) => {
        if (!chrome.runtime.lastError && responseUrl) {
          const urlParams = new URLSearchParams(new URL(responseUrl).hash.substring(1));
          const token = urlParams.get('access_token');
          if (token) {
            await chrome.storage.local.set({ personal_drive_auth_token: token, personal_drive_connected: true });
            return resolve(token);
          }
        }

        // 2. Fallback to existing token if available
        if (state.personal_drive_auth_token && !forceRefresh) {
          return resolve(state.personal_drive_auth_token);
        }

        // 3. Fallback to interactive sign-in
        chrome.identity.launchWebAuthFlow({ url: authUrl + '&prompt=select_account', interactive: true }, async (interactiveUrl) => {
          if (chrome.runtime.lastError || !interactiveUrl) {
            return reject(new Error(chrome.runtime.lastError?.message || 'Authentication failed.'));
          }
          const urlParams = new URLSearchParams(new URL(interactiveUrl).hash.substring(1));
          const token = urlParams.get('access_token');
          if (token) {
            await chrome.storage.local.set({ personal_drive_auth_token: token, personal_drive_connected: true });
            return resolve(token);
          }
          reject(new Error('No access token returned by Google Sign-In.'));
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
   * Retrieves existing Personal Drive folder info (without creating it if not present).
   */
  public static async getPersonalFolderInfo(token?: string): Promise<PersonalDriveFolderInfo> {
    const state = await chrome.storage.local.get(['personal_drive_account_email', 'personal_drive_folder_id']);
    const email = state.personal_drive_account_email || '';

    if (state.personal_drive_folder_id) {
      try {
        const res = await this.fetchWithAuth(
          `https://www.googleapis.com/drive/v3/files/${state.personal_drive_folder_id}?fields=id,name,webViewLink,trashed`,
          {},
          token
        );
        if (res.ok) {
          const data = await res.json();
          if (!data.trashed) {
            return {
              isCreated: true,
              accountEmail: email,
              folderId: data.id,
              folderName: data.name,
              folderUrl: data.webViewLink
            };
          }
        }
      } catch (e) {}
    }

    // Check by name
    try {
      const q = encodeURIComponent(`name = '${this.FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
      const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)`, {}, token);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          const folder = searchData.files[0];
          await chrome.storage.local.set({ personal_drive_folder_id: folder.id });
          return {
            isCreated: true,
            accountEmail: email,
            folderId: folder.id,
            folderName: folder.name,
            folderUrl: folder.webViewLink
          };
        }
      }
    } catch (e) {}

    return {
      isCreated: false,
      accountEmail: email,
      folderName: this.FOLDER_NAME
    };
  }

  /**
   * Gets or creates the folder on the Personal Google Drive lazily.
   */
  public static async getOrCreatePersonalFolder(token?: string): Promise<{ id: string; webViewLink?: string }> {
    const existing = await this.getPersonalFolderInfo(token);
    if (existing.isCreated && existing.folderId) {
      return { id: existing.folderId, webViewLink: existing.folderUrl };
    }

    // Create new folder on Personal Drive
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
      token
    );

    if (!res.ok) {
      throw new Error(`Failed to create personal Drive folder: HTTP ${res.status}`);
    }

    const created = await res.json();
    await chrome.storage.local.set({ personal_drive_folder_id: created.id });
    return { id: created.id, webViewLink: created.webViewLink };
  }

  /**
   * Saves messages to whatsapp_school_archive.json on the Personal Drive folder.
   */
  public static async saveMessagesToPersonalDrive(token?: string, newMessages: any[] = []): Promise<{ saved: number; total: number }> {
    if (!newMessages || newMessages.length === 0) return { saved: 0, total: 0 };

    const folder = await this.getOrCreatePersonalFolder(token);

    // 1. Search for existing archive file inside the folder
    let fileId: string | null = null;
    let existingMessages: any[] = [];

    const q = encodeURIComponent(`name = '${this.ARCHIVE_FILE_NAME}' and '${folder.id}' in parents and trashed = false`);
    const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {}, token);

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        fileId = searchData.files[0].id;
        try {
          const downloadRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {}, token);
          if (downloadRes.ok) {
            existingMessages = await downloadRes.json();
          }
        } catch (e) {
          existingMessages = [];
        }
      }
    }

    // 2. Merge, Deduplicate & Backfill Attachment Links
    const seen = new Map<string, any>();
    existingMessages.forEach((m: any) => seen.set(`${m.chatName}_${m.timestamp}_${m.body}`, m));

    let addedCount = 0;
    let updatedCount = 0;
    newMessages.forEach((m: any) => {
      const key = `${m.chatName}_${m.timestamp}_${m.body}`;
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

    if (existingMessages.length > 500) {
      existingMessages = existingMessages.slice(0, 500);
    }

    const payload = JSON.stringify(existingMessages, null, 2);

    // 3. Upload/Update to Personal Drive
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
        name: this.ARCHIVE_FILE_NAME,
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
        token
      );
    }

    return { saved: addedCount, total: existingMessages.length };
  }

  private static TRACKED_CHATS_FILE_NAME = 'tracked_whatsapp_chats.json';

  /**
   * Saves tracked WhatsApp groups metadata to Personal Drive (School Portal MCP Intelligence).
   */
  public static async saveTrackedChatsToPersonalDrive(token?: string, trackedChats: any[] = []): Promise<void> {
    try {
      const folder = await this.getOrCreatePersonalFolder(token);

      // Search for existing tracked chats file in folder
      const q = encodeURIComponent(`name = '${this.TRACKED_CHATS_FILE_NAME}' and '${folder.id}' in parents and trashed = false`);
      const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {}, token);

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
            token
          );
          return;
        }
      }

      // Create new file
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;
      const metadata = {
        name: this.TRACKED_CHATS_FILE_NAME,
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
        token
      );
    } catch (e) {
      console.warn('[PersonalDriveService] Could not backup tracked chats to Drive:', e);
    }
  }

  /**
   * Loads tracked WhatsApp groups from Personal Drive if available.
   */
  private static ATTACHMENTS_FOLDER_NAME = 'Attachments';

  /**
   * Gets or creates the Attachments subfolder inside the School Portal MCP Intelligence folder.
   */
  public static async getOrCreateAttachmentsFolder(token?: string): Promise<{ id: string; webViewLink?: string }> {
    const parentFolder = await this.getOrCreatePersonalFolder(token);

    // Search for existing Attachments folder
    const q = encodeURIComponent(`name = '${this.ATTACHMENTS_FOLDER_NAME}' and '${parentFolder.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)`, {}, token);

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
          parents: [parentFolder.id],
          description: 'School Notices, Homework PDFs & Image Attachments'
        })
      },
      token
    );

    if (!res.ok) {
      throw new Error(`Failed to create Attachments folder: HTTP ${res.status}`);
    }

    const created = await res.json();
    return { id: created.id, webViewLink: created.webViewLink };
  }

  /**
   * Directly uploads a PDF, image, or document attachment to the Attachments folder on Personal Drive.
   */
  public static async uploadAttachmentFile(
    token: string | undefined,
    fileData: { name: string; mimeType: string; base64Content: string }
  ): Promise<{ fileId: string; webViewLink: string; name: string } | null> {
    try {
      if (!fileData || !fileData.base64Content) return null;

      const validToken = token || await this.getValidToken(false);
      const folder = await this.getOrCreateAttachmentsFolder(validToken);
      // Convert base64 to binary ArrayBuffer
      const byteCharacters = atob(fileData.base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      let finalName = (fileData.name || `attachment_${Date.now()}`).replace(/[\\/:*?"<>|]/g, '_');

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

          // If content was modified (different size), auto-version it: "FileName (v2).pdf"
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
   * Loads tracked WhatsApp groups from Personal Drive if available.
   */
  public static async loadTrackedChatsFromPersonalDrive(token?: string): Promise<any[] | null> {
    try {
      const folder = await this.getPersonalFolderInfo(token);
      if (!folder.isCreated || !folder.folderId) return null;

      const q = encodeURIComponent(`name = '${this.TRACKED_CHATS_FILE_NAME}' and '${folder.folderId}' in parents and trashed = false`);
      const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {}, token);

      if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.files && data.files.length > 0) {
          const fileId = data.files[0].id;
          const downloadRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {}, token);
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
}
