/**
 * Just-In-Time (Lazy) Token Resolver
 * Manages Google OAuth access tokens with local expiration caching and automatic 401 self-healing.
 */

export interface CachedTokenInfo {
  token: string;
  expiry: number;
}

export class AuthService {
  public static STORAGE_KEY_TOKEN = 'gasToken';
  public static STORAGE_KEY_EXPIRY = 'gasTokenExpiry';

  /**
   * Retrieves a valid Google OAuth access token.
   * Reads from cache first; triggers interactive webAuthFlow only when token is missing or near expiration.
   */
  public static async getValidAuthToken(forceInteractive: boolean = false): Promise<string> {
    if (typeof chrome === 'undefined' || !chrome.identity) {
      return "mock_oauth_access_token_dev";
    }

    const now = Date.now();

    // 1. Check local cache and expiration if not forced interactive
    if (!forceInteractive) {
      try {
        const { gasToken, gasTokenExpiry } = await chrome.storage.local.get([
          this.STORAGE_KEY_TOKEN,
          this.STORAGE_KEY_EXPIRY
        ]);

        // If token exists and has at least 2 minutes (120,000 ms) remaining before expiration, reuse it
        if (gasToken && gasTokenExpiry && now < gasTokenExpiry - 120000) {
          return gasToken;
        }
      } catch (e) {
        console.warn('[AuthService] Error reading token from storage:', e);
      }
    }

    // 2. Token is missing or expired
    if (!forceInteractive) {
      // Attempt 100% silent refresh without any UI popup
      try {
        return await this.launchSilentAuth();
      } catch (silentErr) {
        throw new Error('OAuth token expired. Interactive login required.');
      }
    }

    // 3. User explicitly triggered interactive login
    return this.launchInteractiveAuth();
  }

  /**
   * Attempts silent background OAuth authorization without popping up a window.
   */
  private static launchSilentAuth(): Promise<string> {
    return new Promise((resolve, reject) => {
      const manifest = chrome.runtime.getManifest();
      const clientId = manifest.oauth2?.client_id;
      if (!clientId || clientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
        return reject(new Error("Please configure a valid OAuth Client ID in manifest.json."));
      }

      const redirectUri = chrome.identity.getRedirectURL();
      const scopes = (manifest.oauth2?.scopes && manifest.oauth2.scopes.length > 0)
        ? manifest.oauth2.scopes.join(' ')
        : [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/script.projects',
            'https://www.googleapis.com/auth/script.deployments',
            'https://www.googleapis.com/auth/drive.file'
          ].join(' ');

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('response_type', 'token');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', scopes);

      chrome.identity.launchWebAuthFlow(
        { url: authUrl.toString(), interactive: false },
        async (redirectUrl) => {
          if (chrome.runtime.lastError || !redirectUrl) {
            return reject(new Error('Silent auth failed.'));
          }

          try {
            const parsedUrl = new URL(redirectUrl);
            const hash = parsedUrl.hash.startsWith('#') ? parsedUrl.hash.substring(1) : parsedUrl.hash;
            const hashParams = new URLSearchParams(hash);
            const accessToken = hashParams.get('access_token');
            const expiresInSec = parseInt(hashParams.get('expires_in') || '3600', 10);
            const error = hashParams.get('error');

            if (error || !accessToken) {
              return reject(new Error(error || 'No token returned'));
            }

            const expiryTimestamp = Date.now() + expiresInSec * 1000;
            await chrome.storage.local.set({
              [AuthService.STORAGE_KEY_TOKEN]: accessToken,
              [AuthService.STORAGE_KEY_EXPIRY]: expiryTimestamp
            });

            resolve(accessToken);
          } catch (e: any) {
            reject(e);
          }
        }
      );
    });
  }

  /**
   * Triggers the Google OAuth authorization flow interactively.
   */
  private static launchInteractiveAuth(): Promise<string> {
    return new Promise((resolve, reject) => {
      const manifest = chrome.runtime.getManifest();
      const clientId = manifest.oauth2?.client_id;

      if (!clientId || clientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
        return reject(new Error("Please configure a valid OAuth Client ID in manifest.json."));
      }

      const redirectUri = chrome.identity.getRedirectURL();
      const scopes = (manifest.oauth2?.scopes && manifest.oauth2.scopes.length > 0)
        ? manifest.oauth2.scopes.join(' ')
        : [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/script.projects',
            'https://www.googleapis.com/auth/script.deployments',
            'https://www.googleapis.com/auth/drive.file'
          ].join(' ');

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('response_type', 'token');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('prompt', 'consent select_account');

      chrome.identity.launchWebAuthFlow(
        { url: authUrl.toString(), interactive: true },
        async (redirectUrl) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          if (!redirectUrl) {
            return reject(new Error('Google Sign-in modal was closed.'));
          }

          try {
            const parsedUrl = new URL(redirectUrl);
            const hash = parsedUrl.hash.startsWith('#') ? parsedUrl.hash.substring(1) : parsedUrl.hash;
            const hashParams = new URLSearchParams(hash);
            const accessToken = hashParams.get('access_token');
            const grantedScope = hashParams.get('scope') || '';
            const expiresInSec = parseInt(hashParams.get('expires_in') || '3600', 10);
            const error = hashParams.get('error');

            if (error) {
              return reject(new Error(`OAuth Error: ${error}`));
            }
            if (!accessToken) {
              return reject(new Error('No access token returned from Google.'));
            }

            const hasScriptProjects = grantedScope.includes('script.projects') || grantedScope.includes('/auth/script');
            const hasScriptDeployments = grantedScope.includes('script.deployments');
            if (grantedScope && (!hasScriptProjects || !hasScriptDeployments)) {
              await chrome.storage.local.remove([AuthService.STORAGE_KEY_TOKEN, AuthService.STORAGE_KEY_EXPIRY]);
              return reject(new Error("⚠️ Google Apps Script permissions were not granted. Please sign in again and ensure you check 'Select all' on the Google authorization screen."));
            }

            // Save token and calculated expiry time
            const expiryTimestamp = Date.now() + expiresInSec * 1000;
            await chrome.storage.local.set({
              [AuthService.STORAGE_KEY_TOKEN]: accessToken,
              [AuthService.STORAGE_KEY_EXPIRY]: expiryTimestamp
            });

            // Automatically close any leftover "Authorization Status" Chromium redirect windows
            setTimeout(() => {
              AuthService.cleanupAuthRedirectWindows();
            }, 300);

            resolve(accessToken);
          } catch (err: any) {
            reject(new Error(`Failed to parse redirect URL: ${err.message}`));
          }
        }
      );
    });
  }

  /**
   * Cleans up and closes any leftover Chrome OAuth "Authorization Status" popup windows.
   */
  public static async cleanupAuthRedirectWindows(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.windows) return;
    try {
      const wins = await chrome.windows.getAll({ populate: true });
      for (const win of wins) {
        if (win.tabs) {
          for (const tab of win.tabs) {
            if (tab.url && (tab.url.includes('chromiumapp.org') || tab.title?.includes('Authorization Status') || tab.url.includes('oauth2/v2/auth'))) {
              if (win.id) {
                await chrome.windows.remove(win.id).catch(() => {});
              }
            }
          }
        }
      }
    } catch (e) {}
  }

  /**
   * Clears cached token upon logout or 401 expiration.
   */
  public static async clearCachedToken(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.remove([this.STORAGE_KEY_TOKEN, this.STORAGE_KEY_EXPIRY]).catch(() => {});
    }
  }

  /**
   * Self-Healing Executor: Executes an API call with automatic 401 retry.
   */
  public static async executeWithAutoAuth<T>(apiCall: (token: string) => Promise<T>): Promise<T> {
    let token = await this.getValidAuthToken();
    try {
      return await apiCall(token);
    } catch (error: any) {
      // If Google returns 401 Unauthorized, clear stale token and prompt once more
      if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('UNAUTHENTICATED')) {
        await this.clearCachedToken();
        token = await this.getValidAuthToken(true);
        return await apiCall(token);
      }
      throw error;
    }
  }
}
