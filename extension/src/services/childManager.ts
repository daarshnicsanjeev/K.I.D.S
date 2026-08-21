/**
 * Child Profile Manager
 * Handles multi-child state, active child context, and storage scoping.
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
   * Loads all child profiles from storage.
   * Automatically migrates legacy single-child state if no profiles exist.
   */
  public static async getProfiles(): Promise<ChildProfile[]> {
    const data = await chrome.storage.local.get([
      this.STORAGE_KEY_PROFILES,
      'personal_drive_account_email',
      'personal_drive_folder_id',
      'mcp_gas_url',
      'mcp_script_id',
      'tracked_whatsapp_chats'
    ]);

    let profiles: ChildProfile[] = data[this.STORAGE_KEY_PROFILES] || [];

    // Auto-migration for existing single-child installations
    if (profiles.length === 0) {
      const defaultName = 'Child 1';
      const initialProfile: ChildProfile = {
        id: `child_${Date.now()}`,
        name: defaultName,
        createdAt: Date.now(),
        accountEmail: data.personal_drive_account_email || undefined,
        folderId: data.personal_drive_folder_id || undefined,
        gasScriptId: data.mcp_script_id || undefined,
        gasDeploymentUrl: data.mcp_gas_url || undefined,
        trackedChats: data.tracked_whatsapp_chats || []
      };

      profiles = [initialProfile];
      await chrome.storage.local.set({
        [this.STORAGE_KEY_PROFILES]: profiles,
        [this.STORAGE_KEY_ACTIVE_ID]: initialProfile.id
      });
    }

    return profiles;
  }

  /**
   * Gets the active child profile.
   */
  public static async getActiveProfile(): Promise<ChildProfile> {
    const profiles = await this.getProfiles();
    const activeData = await chrome.storage.local.get([this.STORAGE_KEY_ACTIVE_ID]);
    const activeId = activeData[this.STORAGE_KEY_ACTIVE_ID];

    const found = profiles.find(p => p.id === activeId);
    if (found) return found;

    // Fallback to first profile
    if (profiles.length > 0) {
      await chrome.storage.local.set({ [this.STORAGE_KEY_ACTIVE_ID]: profiles[0].id });
      return profiles[0];
    }

    // Create default if somehow empty
    const created = await this.createProfile('Child 1');
    return created;
  }

  /**
   * Sets the active child ID.
   */
  public static async setActiveProfileId(childId: string): Promise<ChildProfile | null> {
    const profiles = await this.getProfiles();
    const found = profiles.find(p => p.id === childId);
    if (found) {
      await chrome.storage.local.set({ [this.STORAGE_KEY_ACTIVE_ID]: childId });
      return found;
    }
    return null;
  }

  /**
   * Creates a new child profile.
   */
  public static async createProfile(name: string): Promise<ChildProfile> {
    const cleanName = this.sanitizeName(name) || `Child_${Date.now().toString().slice(-4)}`;
    const profiles = await this.getProfiles();

    const newProfile: ChildProfile = {
      id: `child_${cleanName.toLowerCase()}_${Date.now()}`,
      name: cleanName,
      createdAt: Date.now(),
      trackedChats: []
    };

    profiles.push(newProfile);
    await chrome.storage.local.set({
      [this.STORAGE_KEY_PROFILES]: profiles,
      [this.STORAGE_KEY_ACTIVE_ID]: newProfile.id
    });

    return newProfile;
  }

  /**
   * Updates an existing child profile.
   */
  public static async updateProfile(childId: string, updates: Partial<ChildProfile>): Promise<ChildProfile | null> {
    const profiles = await this.getProfiles();
    const idx = profiles.findIndex(p => p.id === childId);
    if (idx === -1) return null;

    if (updates.name) {
      updates.name = this.sanitizeName(updates.name) || profiles[idx].name;
    }

    profiles[idx] = { ...profiles[idx], ...updates };
    await chrome.storage.local.set({ [this.STORAGE_KEY_PROFILES]: profiles });
    return profiles[idx];
  }

  /**
   * Deletes a child profile.
   */
  public static async deleteProfile(childId: string): Promise<{ success: boolean; activeProfile: ChildProfile }> {
    let profiles = await this.getProfiles();
    if (profiles.length <= 1) {
      throw new Error('Cannot delete the only child profile. Rename it instead.');
    }

    profiles = profiles.filter(p => p.id !== childId);
    const activeData = await chrome.storage.local.get([this.STORAGE_KEY_ACTIVE_ID]);
    let newActiveId = activeData[this.STORAGE_KEY_ACTIVE_ID];

    if (newActiveId === childId) {
      newActiveId = profiles[0].id;
    }

    await chrome.storage.local.set({
      [this.STORAGE_KEY_PROFILES]: profiles,
      [this.STORAGE_KEY_ACTIVE_ID]: newActiveId
    });

    const activeProfile = profiles.find(p => p.id === newActiveId) || profiles[0];
    return { success: true, activeProfile };
  }
}
