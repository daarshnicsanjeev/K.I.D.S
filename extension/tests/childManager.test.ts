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

  it('should auto-migrate legacy single-child configuration into Child 1 profile', async () => {
    mockStorage['personal_drive_account_email'] = 'parent@gmail.com';
    mockStorage['personal_drive_folder_id'] = 'folder_123';
    mockStorage['mcp_gas_url'] = 'https://script.google.com/macros/s/exec';

    const profiles = await ChildManager.getProfiles();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].name).toBe('Child 1');
    expect(profiles[0].accountEmail).toBe('parent@gmail.com');
    expect(profiles[0].folderId).toBe('folder_123');

    const active = await ChildManager.getActiveProfile();
    expect(active.id).toBe(profiles[0].id);
    expect(active.name).toBe('Child 1');
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

  it('should prevent deleting the only remaining child profile', async () => {
    const profiles = await ChildManager.getProfiles();
    expect(profiles).toHaveLength(1);

    await expect(ChildManager.deleteProfile(profiles[0].id)).rejects.toThrow(
      'Cannot delete the only child profile. Rename it instead.'
    );
  });

  it('should delete a secondary profile and fallback active child correctly', async () => {
    // Start with 2 explicit profiles
    const prof1 = { id: 'child_daarshnic', name: 'Daarshnic', createdAt: 1000 };
    const prof2 = { id: 'child_ananya', name: 'Ananya', createdAt: 2000 };
    mockStorage[ChildManager.STORAGE_KEY_PROFILES] = [prof1, prof2];
    mockStorage[ChildManager.STORAGE_KEY_ACTIVE_ID] = prof2.id;

    expect((await ChildManager.getActiveProfile()).id).toBe('child_ananya');

    const res = await ChildManager.deleteProfile('child_ananya');
    expect(res.success).toBe(true);
    expect(res.activeProfile.id).toBe('child_daarshnic');

    const remaining = await ChildManager.getProfiles();
    expect(remaining.some(p => p.id === 'child_ananya')).toBe(false);
  });

  it('should sanitize child names cleanly', () => {
    expect(ChildManager.sanitizeName('  Daarshnic  ')).toBe('Daarshnic');
    expect(ChildManager.sanitizeName('Child 3 (Grade 4)')).toBe('Child3Grade4');
    expect(ChildManager.sanitizeName('Aarav-Kumar_1')).toBe('Aarav-Kumar_1');
  });
});
