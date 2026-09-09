/**
 * Kids Intelligent Dashboard System (K.I.D.S.)
 * Kid Profile Manager
 * Handles multi-kid state, clean first-name validation, academic year stamps, and cross-machine sync.
 */

export interface ChildProfile {
  id: string; // Unique identifier: e.g. "kid_atharva_1724239200"
  name: string; // First name: e.g. "Atharva"
  academicYear: string; // e.g. "2026-2027"
  createdAt: number;
  step1Confirmed?: boolean;
  accountEmail?: string;
  studentAccountEmail?: string;
  schoolEmailDomain?: string;
  photoDataUrl?: string;
  folderId?: string;
  folderUrl?: string;
  gasScriptId?: string;
  gasDeploymentUrl?: string;
  personalGasScriptId?: string;
  personalGasDeploymentUrl?: string;
  schoolGasScriptId?: string;
  schoolGasDeploymentUrl?: string;
  deployedGasVersion?: string;
  deployedGasHash?: string;
  hasClassroom?: boolean;
  portalDomain?: string;
  portalDomains?: string[];
  registeredTools?: any[];
  trackedChats?: any[];
  lastSchoolSync?: string;
  lastPortalSync?: string;
  isRemoved?: boolean;
}

export class ChildManager {
  public static STORAGE_KEY_PROFILES = 'multi_child_profiles';
  public static STORAGE_KEY_ACTIVE_ID = 'active_child_id';

  /**
   * Calculates 3 academic years (Past, Current, Future) based on date.
   */
  public static getCalculatedAcademicYears(date: Date = new Date()): { past: string; current: string; future: string } {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12
    const startYear = month >= 4 ? year : year - 1;
    const endYear = startYear + 1;

    return {
      past: `${startYear - 1}-${endYear - 1}`,
      current: `${startYear}-${endYear}`,
      future: `${startYear + 1}-${endYear + 1}`
    };
  }

  /**
   * Validates clean first name (letters, spaces, hyphens, 2-30 characters) for UI inputs and Google Drive filesystem safety.
   */
  public static validateFirstName(name: string): { valid: boolean; error?: string; cleanName: string } {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: "Please enter your child's first name (cannot be blank or only spaces).", cleanName: '' };
    }

    // 1. Check for blank or only whitespace
    if (/^\s*$/.test(name)) {
      return { valid: false, error: "Please enter your child's first name (cannot be blank or only spaces).", cleanName: '' };
    }

    // 2. Check for prohibited Drive & filesystem path characters
    if (/[/\\:*?"<>|\x00-\x1F\x7F]/.test(name)) {
      return { valid: false, error: 'Invalid characters: / \\ : * ? " < > | cannot be used in folder or file names.', cleanName: '' };
    }

    const trimmed = name.trim();

    // 3. Check Windows/POSIX reserved names (e.g. CON, PRN, AUX, NUL, COM1-9, LPT1-9)
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    if (reservedNames.includes(trimmed.toUpperCase())) {
      return { valid: false, error: `${trimmed} is a reserved system name. Please choose a different name.`, cleanName: '' };
    }

    // 4. Reject numbers and symbols that are not letters, spaces, hyphens, or apostrophes
    if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
      return { valid: false, error: 'First name can only contain letters, spaces, or hyphens.', cleanName: trimmed.replace(/[^a-zA-Z\s'-]/g, '') };
    }

    // 5. Check for leading or trailing hyphens or apostrophes
    if (trimmed.startsWith('-') || trimmed.endsWith('-') || trimmed.startsWith("'") || trimmed.endsWith("'")) {
      return { valid: false, error: 'Name cannot start or end with a hyphen or space.', cleanName: trimmed };
    }

    // 6. Check for at least 2 alphabetic letters (blocks "---", " - ", "''", etc.)
    const lettersOnly = trimmed.replace(/[^a-zA-Z]/g, '');
    if (lettersOnly.length < 2) {
      return { valid: false, error: 'Name must contain at least 2 alphabetic letters.', cleanName: trimmed };
    }

    // 7. Check length limits
    if (trimmed.length > 30) {
      return { valid: false, error: 'First name cannot exceed 30 letters.', cleanName: trimmed };
    }

    // 8. Normalization: collapse multiple spaces and multiple hyphens
    const normalized = trimmed
      .replace(/\s+/g, ' ')
      .replace(/-+/g, '-');

    // 9. Capitalize each word nicely (respecting spaces and hyphens)
    const formatted = normalized
      .split(' ')
      .map(word => {
        return word
          .split('-')
          .map(part => {
            return part
              .split("'")
              .map(seg => seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase())
              .join("'");
          })
          .join('-');
      })
      .join(' ');

    return { valid: true, cleanName: formatted };
  }

  /**
   * Sanitizes kid name (alphanumeric, underscores, hyphens).
   */
  public static sanitizeName(name: string): string {
    return (name || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  }

  /**
   * Checks if user has already configured at least one named kid profile.
   */
  public static async hasConfiguredChild(): Promise<boolean> {
    const profiles = await this.getProfiles(false);
    return profiles.length > 0 && profiles.some(p => {
      const n = (p.name || '').trim().toLowerCase();
      return n !== '' && n !== 'child 1' && n !== 'child_1' && n !== 'child1';
    });
  }

  /**
   * Loads all kid profiles from storage.
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
            'tracked_whatsapp_chats',
            'registered_portal_tools'
          ]);
        } catch (e) {}
      }
    }

    const localProfiles: ChildProfile[] = Array.isArray(localData[this.STORAGE_KEY_PROFILES]) ? localData[this.STORAGE_KEY_PROFILES] : [];
    const syncProfiles: ChildProfile[] = Array.isArray(syncData[this.STORAGE_KEY_PROFILES]) ? syncData[this.STORAGE_KEY_PROFILES] : [];

    let profiles: ChildProfile[] = [];
    if (localProfiles.length > 0) {
      profiles = localProfiles;
      if (syncProfiles.length > 0) {
        profiles = localProfiles.map(lp => {
          const sp = syncProfiles.find(s => s.id === lp.id);
          if (!sp) return lp;
          return {
            ...sp,
            ...lp,
            registeredTools: (Array.isArray(lp.registeredTools) && lp.registeredTools.length > 0) ? lp.registeredTools : (sp.registeredTools || []),
            trackedChats: (Array.isArray(lp.trackedChats) && lp.trackedChats.length > 0) ? lp.trackedChats : (sp.trackedChats || []),
            portalDomain: lp.portalDomain || sp.portalDomain,
            portalDomains: (Array.isArray(lp.portalDomains) && lp.portalDomains.length > 0) ? lp.portalDomains : (sp.portalDomains || [])
          };
        });
      }
    } else if (syncProfiles.length > 0) {
      profiles = syncProfiles;
    }

    // Filter out invalid/empty entries
    profiles = profiles.filter(p => p && p.id && p.name);

    if (profiles.length === 0 && autoCreate) {
      const defaultYears = this.getCalculatedAcademicYears();
      const initialProfile: ChildProfile = {
        id: `child_${Date.now()}`,
        name: 'Child 1',
        academicYear: defaultYears.current,
        createdAt: Date.now(),
        accountEmail: localData.personal_drive_account_email || undefined,
        folderId: localData.personal_drive_folder_id || undefined,
        gasScriptId: localData.mcp_script_id || undefined,
        gasDeploymentUrl: localData.mcp_gas_url || undefined,
        hasClassroom: true,
        registeredTools: localData.registered_portal_tools || [],
        trackedChats: localData.tracked_whatsapp_chats || []
      };

      profiles = [initialProfile];
      await this.saveProfiles(profiles, initialProfile.id);
    }

    return profiles;
  }

  /**
   * Gets the active kid profile.
   */
  public static async getActiveProfile(): Promise<ChildProfile | null> {
    const profiles = await this.getProfiles(false);
    if (profiles.length === 0) return null;

    let activeId: string | undefined;
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const localData = chrome.storage.local ? await chrome.storage.local.get([this.STORAGE_KEY_ACTIVE_ID]) : {};
      const syncData = chrome.storage.sync ? await chrome.storage.sync.get([this.STORAGE_KEY_ACTIVE_ID]) : {};
      activeId = localData[this.STORAGE_KEY_ACTIVE_ID] || syncData[this.STORAGE_KEY_ACTIVE_ID];
    }

    const found = profiles.find(p => p.id === activeId);
    if (found) return found;

    return profiles[0];
  }

  /**
   * Saves profiles to both sync and local storage for cross-machine resilience.
   */
  public static async saveProfiles(profiles: ChildProfile[], activeId?: string): Promise<void> {
    if (!activeId && profiles.length > 0) {
      try {
        const local = await chrome.storage.local.get([this.STORAGE_KEY_ACTIVE_ID]);
        activeId = local[this.STORAGE_KEY_ACTIVE_ID] || profiles[0].id;
      } catch {
        activeId = profiles[0].id;
      }
    }

    const payload: Record<string, any> = {
      [this.STORAGE_KEY_PROFILES]: profiles
    };
    if (activeId) {
      payload[this.STORAGE_KEY_ACTIVE_ID] = activeId;
      const activeProf = profiles.find(p => p.id === activeId);
      if (activeProf) {
        if (Array.isArray(activeProf.trackedChats)) {
          payload['tracked_whatsapp_chats'] = activeProf.trackedChats;
        }
        if (Array.isArray(activeProf.registeredTools)) {
          payload['registered_portal_tools'] = activeProf.registeredTools;
        }
        if (activeProf.portalDomain) {
          payload['portal_domain'] = activeProf.portalDomain;
        }
        if (Array.isArray(activeProf.portalDomains)) {
          payload['portal_domains'] = activeProf.portalDomains;
        }
        if (activeProf.gasDeploymentUrl) {
          payload['mcp_gas_url'] = activeProf.gasDeploymentUrl;
        }
        if (activeProf.gasScriptId) {
          payload['mcp_script_id'] = activeProf.gasScriptId;
        }
      }
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
   * Sets the active kid ID.
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
   * Creates a new kid profile and sets it active.
   */
  public static async createProfile(name: string, academicYear?: string, hasClassroom: boolean = true): Promise<ChildProfile> {
    const validation = this.validateFirstName(name);
    const cleanName = validation.valid ? validation.cleanName : this.sanitizeName(name);
    if (!cleanName) {
      throw new Error(validation.error || 'Child first name is required.');
    }
    const year = academicYear || this.getCalculatedAcademicYears().current;

    let profiles = await this.getProfiles(false);

    // If the only existing profile is a placeholder ("Child 1"), rename it instead of duplicating
    if (profiles.length === 1) {
      const n = (profiles[0].name || '').toLowerCase();
      if (n === 'child 1' || n === 'child_1' || n === 'child1') {
        profiles[0].name = cleanName;
        profiles[0].academicYear = year;
        profiles[0].hasClassroom = hasClassroom;
        await this.saveProfiles(profiles, profiles[0].id);
        return profiles[0];
      }
    }

    const newProfile: ChildProfile = {
      id: `child_${cleanName.toLowerCase()}_${Date.now()}`,
      name: cleanName,
      academicYear: year,
      hasClassroom: hasClassroom,
      createdAt: Date.now(),
      registeredTools: [],
      trackedChats: []
    };

    profiles.push(newProfile);
    await this.saveProfiles(profiles, newProfile.id);
    return newProfile;
  }

  /**
   * Updates an existing kid profile.
   */
  public static async updateProfile(childId: string, updates: Partial<ChildProfile>): Promise<ChildProfile | null> {
    const profiles = await this.getProfiles(false);
    const idx = profiles.findIndex(p => p.id === childId);
    if (idx === -1) return null;

    if (updates.name) {
      const val = this.validateFirstName(updates.name);
      updates.name = val.valid ? val.cleanName : (this.sanitizeName(updates.name) || profiles[idx].name);
    }

    profiles[idx] = { ...profiles[idx], ...updates };
    await this.saveProfiles(profiles);
    return profiles[idx];
  }

  /**
   * Deletes a kid profile.
   */
  public static async deleteProfile(childId: string): Promise<{ success: boolean; activeProfile: ChildProfile | null; remainingCount: number }> {
    let profiles = await this.getProfiles(false);
    profiles = profiles.filter(p => p.id !== childId);

    if (profiles.length === 0) {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        if (chrome.storage.local) {
          await chrome.storage.local.set({ [this.STORAGE_KEY_PROFILES]: [] });
          await chrome.storage.local.remove([this.STORAGE_KEY_ACTIVE_ID]);
        }
        if (chrome.storage.sync) {
          await chrome.storage.sync.set({ [this.STORAGE_KEY_PROFILES]: [] });
          await chrome.storage.sync.remove([this.STORAGE_KEY_ACTIVE_ID]);
        }
      }
      return { success: true, activeProfile: null, remainingCount: 0 };
    }

    const newActiveId = profiles[0].id;
    await this.saveProfiles(profiles, newActiveId);
    return { success: true, activeProfile: profiles[0], remainingCount: profiles.length };
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

  /**
   * Safely renames an existing child profile after running strict validation.
   */
  public static async renameProfile(childId: string, newName: string): Promise<ChildProfile> {
    const val = this.validateFirstName(newName);
    if (!val.valid) {
      throw new Error(val.error || 'Invalid name');
    }
    const updated = await this.updateProfile(childId, { name: val.cleanName });
    if (!updated) {
      throw new Error(`Child profile "${childId}" was not found.`);
    }
    return updated;
  }

  /**
   * Safely updates the academic year of an existing child profile.
   */
  public static async updateAcademicYear(childId: string, newYear: string): Promise<ChildProfile> {
    const cleanYear = (newYear || '').trim();
    if (!cleanYear) {
      throw new Error('Academic year cannot be empty.');
    }
    const updated = await this.updateProfile(childId, { academicYear: cleanYear });
    if (!updated) {
      throw new Error(`Child profile "${childId}" was not found.`);
    }
    return updated;
  }
}

