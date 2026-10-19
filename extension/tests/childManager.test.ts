import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChildManager } from '../src/services/childManager';
import { PersonalDriveService } from '../src/services/personalDriveService';

describe('ChildManager & Multi-Child Partitioning', () => {
  let mockStorage: Record<string, any> = {};

  beforeEach(() => {
    mockStorage = {};
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn(async (keys: string[] | string | null) => {
            if (!keys) return { ...mockStorage };
            if (typeof keys === 'string') return { [keys]: mockStorage[keys] };
            const res: Record<string, any> = {};
            keys.forEach(k => { res[k] = mockStorage[k]; });
            return res;
          }),
          set: vi.fn(async (items: Record<string, any>) => {
            Object.assign(mockStorage, items);
          }),
          remove: vi.fn(async (keys: string[] | string) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach(k => delete mockStorage[k]);
          })
        }
      },
      runtime: {
        getManifest: vi.fn(() => ({ oauth2: { client_id: 'mock_client_id' } }))
      }
    };
  });

  it('should auto-migrate legacy single-child configuration when autoCreate is true', async () => {
    mockStorage['personal_drive_account_email'] = 'parent@gmail.com';
    mockStorage['personal_drive_folder_id'] = 'folder_123';
    mockStorage['mcp_gas_url'] = 'https://script.google.com/macros/s/exec';

    const profiles = await ChildManager.getProfiles(true);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].name).toBe('Child 1');
    expect(profiles[0].accountEmail).toBe('parent@gmail.com');
    expect(profiles[0].folderId).toBe('folder_123');

    const active = await ChildManager.getActiveProfile();
    expect(active?.id).toBe(profiles[0].id);
    expect(active?.name).toBe('Child 1');
  });

  it('should create and switch to a new child profile with sanitized name', async () => {
    const p1 = await ChildManager.createProfile('Daarshnic  ');
    expect(p1.name).toBe('Daarshnic');

    const p2 = await ChildManager.createProfile('Ananya #2');
    expect(p2.name).toBe('Ananya2');

    const all = await ChildManager.getProfiles();
    expect(all.length).toBeGreaterThanOrEqual(2);

    const active = await ChildManager.getActiveProfile();
    expect(active.id).toBe(p2.id);
    expect(active.name).toBe('Ananya2');
  });

  it('should switch active profile by ID', async () => {
    const p1 = await ChildManager.createProfile('Daarshnic');
    const p2 = await ChildManager.createProfile('Ananya');

    await ChildManager.setActiveProfileId(p1.id);
    const active = await ChildManager.getActiveProfile();
    expect(active.id).toBe(p1.id);
    expect(active.name).toBe('Daarshnic');
  });

  it('should update profile name and properties', async () => {
    const p1 = await ChildManager.createProfile('Daarsh');
    await ChildManager.updateProfile(p1.id, { name: 'Daarshnic', folderId: 'folder_abc' });

    const active = await ChildManager.getActiveProfile();
    expect(active.name).toBe('Daarshnic');
    expect(active.folderId).toBe('folder_abc');
  });

  it('should allow deleting the only remaining child profile and return null activeProfile', async () => {
    const created = await ChildManager.createProfile('Daarshnic');
    const profiles = await ChildManager.getProfiles();
    expect(profiles).toHaveLength(1);

    const res = await ChildManager.deleteProfile(created.id);
    expect(res.success).toBe(true);
    expect(res.activeProfile).toBeNull();
    expect(res.remainingCount).toBe(0);

    const remaining = await ChildManager.getProfiles();
    expect(remaining).toHaveLength(0);
    expect(await ChildManager.hasConfiguredChild()).toBe(false);
  });

  it('should delete a secondary profile and fallback active child correctly', async () => {
    // Start with 2 explicit profiles
    const prof1 = { id: 'child_daarshnic', name: 'Daarshnic', createdAt: 1000 };
    const prof2 = { id: 'child_ananya', name: 'Ananya', createdAt: 2000 };
    mockStorage[ChildManager.STORAGE_KEY_PROFILES] = [prof1, prof2];
    mockStorage[ChildManager.STORAGE_KEY_ACTIVE_ID] = prof2.id;

    expect((await ChildManager.getActiveProfile())?.id).toBe('child_ananya');

    const res = await ChildManager.deleteProfile('child_ananya');
    expect(res.success).toBe(true);
    expect(res.activeProfile?.id).toBe('child_daarshnic');
    expect(res.remainingCount).toBe(1);

    const remaining = await ChildManager.getProfiles();
    expect(remaining.some(p => p.id === 'child_ananya')).toBe(false);
  });

  it('should correctly evaluate hasConfiguredChild status', async () => {
    expect(await ChildManager.hasConfiguredChild()).toBe(false);

    await ChildManager.createProfile('Daarshnic');
    expect(await ChildManager.hasConfiguredChild()).toBe(true);
  });

  it('should merge profiles restored from Google Drive', async () => {
    const driveProfiles = [
      { id: 'child_daarshnic', name: 'Daarshnic', createdAt: 1000, folderId: 'folder_drive_1' },
      { id: 'child_ananya', name: 'Ananya', createdAt: 2000, folderId: 'folder_drive_2' }
    ];

    const merged = await ChildManager.mergeRestoredProfiles(driveProfiles);
    expect(merged).toHaveLength(2);
    expect(merged.map(m => m.name)).toEqual(['Daarshnic', 'Ananya']);

    const active = await ChildManager.getActiveProfile();
    expect(active?.name).toBe('Daarshnic');
  });

  it('should prevent duplicate profiles and reuse existing profile when names match case-insensitively', async () => {
    const p1 = await ChildManager.createProfile('Atharva', '2026-2027');
    expect(p1.name).toBe('Atharva');
    expect(p1.academicYear).toBe('2026-2027');

    // Simulate second call with different casing / whitespace
    const p2 = await ChildManager.createProfile('  atharva  ', '2027-2028');
    expect(p2.id).toBe(p1.id);
    expect(p2.name).toBe('Atharva');
    expect(p2.academicYear).toBe('2027-2028');

    const all = await ChildManager.getProfiles(false);
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(p1.id);
  });
});
