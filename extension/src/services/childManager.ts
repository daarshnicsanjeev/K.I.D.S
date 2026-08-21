/**
 * Child Profile Manager
 * Handles multi-child state, cross-machine sync (chrome.storage.sync & Drive), and onboarding lifecycle.
 */

export interface ChildProfile {
  id: string; // Unique identifier: e.g. "child_daarshnic_1724239200"
  name: string; // First name: e.g. "Daarshnic"
  createdAt: number;
  accountEmail?: string;
  folderId?: string;
  folderUrl?: string;
  gasScriptId?: string;
  gasDeploymentUrl?: string;
  trackedChats?: any[];
}

export class ChildManager {
  public static STORAGE_KEY_PROFILES = 'multi_child_profiles';
  public static STORAGE_KEY_ACTIVE_ID = 'active_child_id';

  /**
   * Sanitizes child name (alphanumeric only, clean first name).
   */
  public static sanitizeName(name: string): string {
    return (name || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  }

  /**
   * Checks if user has already configured at least one named child profile.
   */
  public static async hasConfiguredChild(): Promise<boolean> {
    const profiles = await this.getProfiles(false);
    return profiles.length > 0 && profiles.some(p => p.name && p.name.trim() !== '');
  }

  /**
   * Loads all child profiles from storage (checking sync storage first for cross-machine persistence).
   */
  public static async getProfiles(autoCreate = false): Promise<ChildProfile[]> {
    let syncData: any = {};
    let localData: any = {};

    if (typeof chrome !== 'undefined' && chrome.storage) {
      if (chrome.storage.sync) {
        try {
          syncData = await chrome.storage.sync.get([this.STORAGE_KEY_PROFILES, this.STORAGE_KEY_ACTIVE_ID]);
        } catch (e) {}
      }
      if (chrome.storage.local) {
        try {
          localData = await chrome.storage.local.get([
            this.STORAGE_KEY_PROFILES,
            this.STORAGE_KEY_ACTIVE_ID,
            'personal_drive_account_email',
            'personal_drive_folder_id',
            'mcp_gas_url',
            'mcp_script_id',
            'tracked_whatsapp_chats'
          ]);
        } catch (e) {}
      }
    }

    let profiles: ChildProfile[] = syncData[this.STORAGE_KEY_PROFILES] || localData[this.STORAGE_KEY_PROFILES] || [];

    // Filter out invalid/empty entries
    profiles = profiles.filter(p => p && p.id && p.name);

    if (profiles.length === 0 && autoCreate) {
      const initialProfile: ChildProfile = {
        id: `child_${Date.now()}`,
        name: 'Child 1',
        createdAt: Date.now(),
        accountEmail: localData.personal_drive_account_email || undefined,
        folderId: localData.personal_drive_folder_id || undefined,
        gasScriptId: localData.mcp_script_id || undefined,
        gasDeploymentUrl: localData.mcp_gas_url || undefined,
        trackedChats: localData.tracked_whatsapp_chats || []
      };

      profiles = [initialProfile];
      await this.saveProfiles(profiles, initialProfile.id);
    }

    return profiles;
  }

  /**
   * Gets the active child profile.
   */
  public static async getActiveProfile(): Promise<ChildProfile | null> {
    const profiles = await this.getProfiles(false);
    if (profiles.length === 0) return null;

    let activeId: string | undefined;
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const syncData = chrome.storage.sync ? await chrome.storage.sync.get([this.STORAGE_KEY_ACTIVE_ID]) : {};
      const localData = chrome.storage.local ? await chrome.storage.local.get([this.STORAGE_KEY_ACTIVE_ID]) : {};
      activeId = syncData[this.STORAGE_KEY_ACTIVE_ID] || localData[this.STORAGE_KEY_ACTIVE_ID];
    }

    const found = profiles.find(p => p.id === activeId);
    if (found) return found;

    return profiles[0];
  }

  /**
   * Saves profiles to both sync and local storage for cross-machine resilience.
   */
  private static async saveProfiles(profiles: ChildProfile[], activeId?: string): Promise<void> {
    const payload: Record<string, any> = {
      [this.STORAGE_KEY_PROFILES]: profiles
    };
    if (activeId) {
      payload[this.STORAGE_KEY_ACTIVE_ID] = activeId;
    }

    if (typeof chrome !== 'undefined' && chrome.storage) {
      if (chrome.storage.local) {
        await chrome.storage.local.set(payload).catch(() => {});
      }
      if (chrome.storage.sync) {
        await chrome.storage.sync.set(payload).catch(() => {});
      }
    }
  }

  /**
   * Sets the active child ID.
   */
  public static async setActiveProfileId(childId: string): Promise<ChildProfile | null> {
    const profiles = await this.getProfiles(false);
    const found = profiles.find(p => p.id === childId);
    if (found) {
      await this.saveProfiles(profiles, childId);
      return found;
    }
    return null;
  }

  /**
   * Creates a new child profile and sets it active.
   */
  public static async createProfile(name: string): Promise<ChildProfile> {
    const cleanName = this.sanitizeName(name);
    if (!cleanName) {
      throw new Error('Child first name is required.');
    }

    const profiles = await this.getProfiles(false);
    const newProfile: ChildProfile = {
      id: `child_${cleanName.toLowerCase()}_${Date.now()}`,
      name: cleanName,
      createdAt: Date.now(),
      trackedChats: []
    };

    profiles.push(newProfile);
    await this.saveProfiles(profiles, newProfile.id);
    return newProfile;
  }

  /**
   * Updates an existing child profile.
   */
  public static async updateProfile(childId: string, updates: Partial<ChildProfile>): Promise<ChildProfile | null> {
    const profiles = await this.getProfiles(false);
    const idx = profiles.findIndex(p => p.id === childId);
    if (idx === -1) return null;

    if (updates.name) {
      updates.name = this.sanitizeName(updates.name) || profiles[idx].name;
    }

    profiles[idx] = { ...profiles[idx], ...updates };
    await this.saveProfiles(profiles);
    return profiles[idx];
  }

  /**
   * Deletes a child profile.
   */
  public static async deleteProfile(childId: string): Promise<{ success: boolean; activeProfile: ChildProfile }> {
    let profiles = await this.getProfiles(false);
    if (profiles.length <= 1) {
      throw new Error('Cannot delete the only child profile. Rename it instead.');
    }

    profiles = profiles.filter(p => p.id !== childId);
    const newActiveId = profiles[0].id;

    await this.saveProfiles(profiles, newActiveId);
    return { success: true, activeProfile: profiles[0] };
  }

  /**
   * Imports or merges profiles restored from Google Drive.
   */
  public static async mergeRestoredProfiles(restoredProfiles: ChildProfile[]): Promise<ChildProfile[]> {
    if (!restoredProfiles || !Array.isArray(restoredProfiles) || restoredProfiles.length === 0) {
      return await this.getProfiles(false);
    }

    const current = await this.getProfiles(false);
    const map = new Map<string, ChildProfile>();

    restoredProfiles.forEach(p => {
      if (p && p.name) map.set(p.name.toLowerCase(), p);
    });

    current.forEach(p => {
      if (p && p.name) map.set(p.name.toLowerCase(), { ...map.get(p.name.toLowerCase()), ...p });
    });

    const merged = Array.from(map.values());
    const active = merged[0];
    await this.saveProfiles(merged, active ? active.id : undefined);
    return merged;
  }
}
