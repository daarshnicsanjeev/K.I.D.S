import { ChildManager } from './childManager';
import { WhatsAppDiagnosticLogger } from './whatsappLogger';
import { WhatsAppExportParser, ParsedWhatsAppExport } from './whatsAppExportParser';
import { AiNormalizerService } from './aiNormalizer';

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
   * Gets or creates the dedicated child subfolder inside School Portal MCP Intelligence.
   */
  public static async getOrCreatePersonalFolder(token?: string, childName?: string): Promise<{ id: string; webViewLink?: string; rootId: string }> {
    const validToken = token || await this.getValidToken(false);
    const rootFolder = await this.getOrCreateRootFolder(validToken);
    const resolvedChild = await this.resolveChildName(childName);

    // Search for existing child subfolder
    const childQ = encodeURIComponent(`name = '${resolvedChild}' and '${rootFolder.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const childSearchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${childQ}&fields=files(id,name,webViewLink)`, {}, validToken);

    if (childSearchRes.ok) {
      const childData = await childSearchRes.json();
      if (childData.files && childData.files.length > 0) {
        await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `[DRIVE_CHILD_FOLDER_FOUND] Found existing subfolder "${resolvedChild}" (ID: ${childData.files[0].id})`);
        return {
          id: childData.files[0].id,
          webViewLink: childData.files[0].webViewLink,
          rootId: rootFolder.id
        };
      }
    }

    await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `[DRIVE_CHILD_FOLDER_CREATE] Creating subfolder "${resolvedChild}" inside root folder (ID: ${rootFolder.id})...`);

    // Create child subfolder
    const res = await this.fetchWithAuth(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: resolvedChild,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootFolder.id],
          description: `School Intelligence Archive for ${resolvedChild}`
        })
      },
      validToken
    );

    if (!res.ok) {
      const err = await res.text();
      await WhatsAppDiagnosticLogger.log('ERROR', 'DRIVE', `[DRIVE_CHILD_FOLDER_ERROR] Failed to create subfolder "${resolvedChild}": HTTP ${res.status} | ${err}`);
      throw new Error(`Failed to create child folder "${resolvedChild}": HTTP ${res.status}`);
    }

    const created = await res.json();
    await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `🎉 [DRIVE_CHILD_FOLDER_SUCCESS] Successfully created child folder "${resolvedChild}" (ID: ${created.id})!`);
    return { id: created.id, webViewLink: created.webViewLink, rootId: rootFolder.id };
  }

  /**
   * Saves messages to [ChildName]_whatsapp_school_archive.json in the child's folder.
   */
  public static async saveMessagesToPersonalDrive(
    token?: string,
    newMessages: any[] = [],
    childName?: string
  ): Promise<{ saved: number; total: number }> {
    if (!newMessages || newMessages.length === 0) return { saved: 0, total: 0 };

    const validToken = token || await this.getValidToken(false);
    const resolvedChild = await this.resolveChildName(childName);
    const folder = await this.getOrCreatePersonalFolder(validToken, resolvedChild);
    const archiveFileName = `${resolvedChild}_${this.ARCHIVE_FILE_NAME}`;

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

    return { saved: addedCount, total: existingMessages.length };
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
   * Gets or creates the Attachments subfolder inside the Child's folder.
   */
  public static async getOrCreateAttachmentsFolder(token?: string, childName?: string): Promise<{ id: string; webViewLink?: string }> {
    const validToken = token || await this.getValidToken(false);
    const resolvedChild = await this.resolveChildName(childName);
    const parentFolder = await this.getOrCreatePersonalFolder(validToken, resolvedChild);

    // Search for existing Attachments folder
    const q = encodeURIComponent(`name = '${this.ATTACHMENTS_FOLDER_NAME}' and '${parentFolder.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
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
          parents: [parentFolder.id],
          description: `School Notices, Homework PDFs & Image Attachments for ${resolvedChild}`
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
   * Directly uploads a PDF, image, or document attachment to the child's Attachments folder with name prefix.
   */
  public static async uploadAttachmentFile(
    token: string | undefined,
    fileData: { name: string; mimeType: string; base64Content: string },
    childName?: string
  ): Promise<{ fileId: string; webViewLink: string; name: string } | null> {
    try {
      if (!fileData || !fileData.base64Content) return null;

      const validToken = token || await this.getValidToken(false);
      const resolvedChild = await this.resolveChildName(childName);
      const folder = await this.getOrCreateAttachmentsFolder(validToken, resolvedChild);
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

  /**
   * Searches user's Google Drive for any WhatsApp Export archives / files.
   */
  public static async searchWhatsAppExports(token?: string): Promise<Array<{ id: string; name: string; mimeType: string; size?: string; createdTime?: string; webViewLink?: string }>> {
    try {
      const validToken = token || await this.getValidToken(false);
      await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', '🔍 [EXPORT_SCAN_START] Scanning Google Drive for WhatsApp chat export archives ("WhatsApp Chat")...');

      const q = encodeURIComponent(`name contains 'WhatsApp Chat' and trashed = false`);
      const res = await this.fetchWithAuth(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,createdTime,webViewLink)&orderBy=createdTime desc`,
        {},
        validToken
      );

      if (!res.ok) {
        const errTxt = await res.text();
        await WhatsAppDiagnosticLogger.log('ERROR', 'DRIVE', `[EXPORT_SCAN_FAIL] Google Drive search failed: HTTP ${res.status} | ${errTxt}`);
        throw new Error(`Drive search failed: HTTP ${res.status}`);
      }

      const data = await res.json();
      const files = data.files || [];
      await WhatsAppDiagnosticLogger.log('SUCCESS', 'DRIVE', `🔍 [EXPORT_SCAN_FOUND] Found ${files.length} export file(s) on Google Drive.`, {
        count: files.length,
        files: files.map((f: any) => ({ name: f.name, id: f.id, size: f.size, createdTime: f.createdTime }))
      });
      return files;
    } catch (e: any) {
      await WhatsAppDiagnosticLogger.log('ERROR', 'DRIVE', `[EXPORT_SCAN_ERROR] Error searching for WhatsApp exports: ${e.message}`);
      console.warn('[PersonalDriveService] searchWhatsAppExports error:', e);
      return [];
    }
  }

  /**
   * Ingests a discovered WhatsApp Export file from Google Drive, unzips/parses media & notices,
   * passes through AI normalization, and updates the child's master archive on Drive.
   */
  public static async ingestWhatsAppExport(
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
          await WhatsAppDiagnosticLogger.log('INFO', 'DRIVE', `📎 [EXPORT_ATTACH_UPLOAD ${aIdx + 1}/${parsed.attachments.length}] Uploading "${att.name}" (${att.mimeType}) to Google Drive folder for ${resolvedChild}...`);
          const uploaded = await this.uploadAttachmentFile(validToken, att, resolvedChild);
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
