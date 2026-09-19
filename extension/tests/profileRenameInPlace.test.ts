import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChildManager } from '../src/services/childManager';
import { PersonalDriveService } from '../src/services/personalDriveService';

describe('Step 1 Profile In-Place Rename & Strict Validation', () => {
  let mockStorage: Record<string, any> = {};
  let mockDriveFiles: Array<{
    id: string;
    name: string;
    parents: string[];
    mimeType?: string;
    content?: any;
    trashed?: boolean;
  }> = [];

  beforeEach(() => {
    mockStorage = { access_key: 'mock_access_key' };
    mockDriveFiles = [];

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
        },
        sync: {
          get: vi.fn(async () => ({})),
          set: vi.fn(async () => ({})),
          remove: vi.fn(async () => ({}))
        }
      },
      runtime: {
        getManifest: vi.fn(() => ({ oauth2: { client_id: 'mock_client_id' } }))
      }
    };

    (globalThis as any).fetch = vi.fn(async (url: string, opts?: any) => {
      const urlStr = url.toString();

      if (urlStr.includes('script.googleapis.com')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'success' })
        };
      }

      // 1. Search files: GET /drive/v3/files?q=...
      if (urlStr.includes('/drive/v3/files?') && (!opts || !opts.method || opts.method === 'GET')) {
        const urlParams = new URL(urlStr).searchParams;
        const q = decodeURIComponent(urlParams.get('q') || '');
        const matched = mockDriveFiles.filter(f => {
          if (f.trashed) return false;
          if (f.parents && f.parents.length > 0 && q.includes(`'${f.parents[0]}' in parents`)) {
            // matches parent
          } else if (q.includes('in parents')) {
            const parentMatch = q.match(/'([^']+)' in parents/);
            if (parentMatch && (!f.parents || !f.parents.includes(parentMatch[1]))) {
              return false;
            }
          }
          if (q.includes(`name = '${f.name}'`)) return true;
          if (q.includes(`name contains`)) {
            const matchContains = q.match(/name contains '([^']+)'/);
            if (matchContains && f.name.includes(matchContains[1])) return true;
          }
          if (!q.includes('name =') && !q.includes('name contains')) return true;
          return false;
        });

        return {
          ok: true,
          status: 200,
          json: async () => ({ files: matched })
        };
      }

      // 2. Read file content: GET /drive/v3/files/{id}?alt=media
      if (urlStr.includes('/drive/v3/files/') && urlStr.includes('alt=media')) {
        const idMatch = urlStr.match(/\/files\/([^\/?]+)/);
        const fileId = idMatch ? idMatch[1] : '';
        const found = mockDriveFiles.find(f => f.id === fileId);
        if (found) {
          return {
            ok: true,
            status: 200,
            json: async () => (found.content || {})
          };
        }
        return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) };
      }

      // 3. Rename or Move file/folder: PATCH /drive/v3/files/{id}
      if (urlStr.includes('/drive/v3/files/') && opts && opts.method === 'PATCH') {
        const idMatch = urlStr.match(/\/files\/([^\/?]+)/);
        const fileId = idMatch ? idMatch[1] : '';
        const found = mockDriveFiles.find(f => f.id === fileId);

        if (found) {
          if (opts.body) {
            try {
              const bodyJson = JSON.parse(opts.body);
              if (bodyJson.name) found.name = bodyJson.name;
              if (bodyJson.trashed !== undefined) found.trashed = bodyJson.trashed;
            } catch (e) {}
          }
          if (urlStr.includes('addParents=')) {
            const urlObj = new URL(urlStr);
            const addP = urlObj.searchParams.get('addParents');
            if (addP) found.parents = [addP];
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({ id: found.id, name: found.name, webViewLink: `https://drive.google.com/mock/${found.id}` })
          };
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ id: fileId, status: 'updated' })
        };
      }

      // 4. Update file media: PATCH /upload/drive/v3/files/{id}?uploadType=media
      if (urlStr.includes('/upload/drive/v3/files/') && opts && opts.method === 'PATCH') {
        const idMatch = urlStr.match(/\/files\/([^\/?]+)/);
        const fileId = idMatch ? idMatch[1] : '';
        const found = mockDriveFiles.find(f => f.id === fileId);
        if (found && opts.body) {
          try {
            found.content = JSON.parse(opts.body);
          } catch (e) {}
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: fileId })
        };
      }

      // 5. Create file or folder: POST /drive/v3/files or /upload/drive/v3/files
      if ((urlStr.includes('/drive/v3/files') || urlStr.includes('/upload/drive/v3/files')) && opts && opts.method === 'POST') {
        let name = 'new_file';
        let parents: string[] = [];
        let mimeType = 'application/json';
        let content: any = null;

        if (opts.body) {
          if (typeof opts.body === 'string' && opts.body.startsWith('{')) {
            const parsed = JSON.parse(opts.body);
            name = parsed.name || name;
            parents = parsed.parents || parents;
            mimeType = parsed.mimeType || mimeType;
          } else if (typeof opts.body === 'string' && opts.body.includes('Content-Type: application/json')) {
            const parts = opts.body.split('\r\n\r\n');
            if (parts.length >= 2) {
              try {
                const meta = JSON.parse(parts[1].split('\r\n')[0]);
                name = meta.name || name;
                parents = meta.parents || parents;
              } catch (e) {}
            }
          }
        }

        const newId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const created = { id: newId, name, parents, mimeType, content };
        mockDriveFiles.push(created);
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: newId, name, webViewLink: `https://drive.google.com/mock/${newId}` })
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({})
      };
    });
  });

  // ==========================================
  // 1. STRICT VALIDATION MATRIX TESTS
  // ==========================================
  describe('Strict Child Name Validation Matrix', () => {
    it('should reject empty or whitespace-only inputs', () => {
      const v1 = ChildManager.validateFirstName('');
      expect(v1.valid).toBe(false);
      expect(v1.error).toContain('cannot be blank or only spaces');

      const v2 = ChildManager.validateFirstName('   ');
      expect(v2.valid).toBe(false);
      expect(v2.error).toContain('cannot be blank or only spaces');

      const v3 = ChildManager.validateFirstName('\t\n  ');
      expect(v3.valid).toBe(false);
      expect(v3.error).toContain('cannot be blank or only spaces');
    });

    it('should reject illegal filesystem and Google Drive path characters', () => {
      const illegalChars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
      for (const char of illegalChars) {
        const res = ChildManager.validateFirstName(`Atharva${char}Sharma`);
        expect(res.valid).toBe(false);
        expect(res.error).toContain('cannot be used in folder or file names');
      }
    });

    it('should reject non-letter symbols and digits', () => {
      const symbols = ['Atharva123', 'Kid#1', 'Child@School', 'Kid$', 'Atharva!', 'Kid+1'];
      for (const input of symbols) {
        const res = ChildManager.validateFirstName(input);
        expect(res.valid).toBe(false);
        expect(res.error).toContain('First name can only contain letters, spaces, or hyphens');
      }
    });

    it('should reject punctuation-only strings without real letters', () => {
      const punctuationOnly = ['---', ' - ', '--', "''", "-'-"];
      for (const input of punctuationOnly) {
        const res = ChildManager.validateFirstName(input);
        expect(res.valid).toBe(false);
      }
    });

    it('should reject names starting or ending with hyphens or apostrophes', () => {
      const leadingTrailing = ['-Atharva', 'Atharva-', "'Atharva'", "Atharva'"];
      for (const input of leadingTrailing) {
        const res = ChildManager.validateFirstName(input);
        expect(res.valid).toBe(false);
        expect(res.error).toContain('cannot start or end with a hyphen or space');
      }
    });

    it('should reject names shorter than 2 letters or longer than 30 characters', () => {
      const short = ChildManager.validateFirstName('A');
      expect(short.valid).toBe(false);
      expect(short.error).toContain('at least 2 alphabetic letters');

      const long = ChildManager.validateFirstName('A'.repeat(31));
      expect(long.valid).toBe(false);
      expect(long.error).toContain('cannot exceed 30 letters');
    });

    it('should reject reserved system and device names', () => {
      const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'LPT1'];
      for (const name of reserved) {
        const res = ChildManager.validateFirstName(name);
        expect(res.valid).toBe(false);
        expect(res.error).toContain('reserved system name');
      }
    });

    it('should normalize multiple spaces, multiple hyphens, and apply proper capitalization', () => {
      const res1 = ChildManager.validateFirstName('  atharva   sharma  ');
      expect(res1.valid).toBe(true);
      expect(res1.cleanName).toBe('Atharva Sharma');

      const res2 = ChildManager.validateFirstName('mary--jane');
      expect(res2.valid).toBe(true);
      expect(res2.cleanName).toBe('Mary-Jane');

      const res3 = ChildManager.validateFirstName("o'connor");
      expect(res3.valid).toBe(true);
      expect(res3.cleanName).toBe("O'Connor");
    });
  });

  // ==========================================
  // 2. IN-PLACE DRIVE RENAME TESTS
  // ==========================================
  describe('In-Place Drive Folder & File Renaming', () => {
    const OLD_NAME = 'Atharva';
    const NEW_NAME = 'Atharva Sharma';
    const ACADEMIC_YEAR = '2026-2027';

    beforeEach(async () => {
      const rootFolder = { id: 'root_kids_data', name: 'K.I.D.S. Data', parents: [] };
      const yearFolder = { id: 'year_2026_2027', name: ACADEMIC_YEAR, parents: ['root_kids_data'] };
      const kidFolder = { id: 'kid_atharva_folder_id', name: OLD_NAME, parents: ['year_2026_2027'] };
      const profileFolder = { id: 'profile_subfolder', name: 'profile', parents: ['kid_atharva_folder_id'] };
      const msgFolder = { id: 'msg_subfolder', name: 'messaging_tools', parents: ['kid_atharva_folder_id'] };

      const kidConfig = {
        id: 'file_kid_config',
        name: `${OLD_NAME}_config.json`,
        parents: ['kid_atharva_folder_id'],
        content: { kidName: OLD_NAME, academicYear: ACADEMIC_YEAR }
      };

      const photoFile = {
        id: 'file_photo',
        name: `${OLD_NAME}_photo.jpg`,
        parents: ['profile_subfolder']
      };

      const yearConfig = {
        id: 'file_year_config',
        name: `${ACADEMIC_YEAR}_config.json`,
        parents: ['year_2026_2027'],
        content: {
          academicYear: ACADEMIC_YEAR,
          children: [{ id: 'child_1', childName: OLD_NAME, relativeConfigPath: `${OLD_NAME}/${OLD_NAME}_config.json` }]
        }
      };

      mockDriveFiles = [rootFolder, yearFolder, kidFolder, profileFolder, msgFolder, kidConfig, photoFile, yearConfig];

      await ChildManager.createProfile(OLD_NAME, ACADEMIC_YEAR);
      const active = await ChildManager.getActiveProfile();
      if (active) {
        await ChildManager.updateProfile(active.id, {
          folderId: 'kid_atharva_folder_id',
          schoolGasScriptId: 'script_gas_123'
        });
      }
    });

    it('should perform NO-OP and make zero Drive calls when name is unchanged', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      fetchSpy.mockClear();

      const result = await PersonalDriveService.renameChildNameInPlace(
        'mock_token',
        OLD_NAME,
        '  atharva  ',
        ACADEMIC_YEAR,
        'kid_atharva_folder_id'
      );

      expect(result.success).toBe(true);
      expect(result.changed).toBe(false);
      const patchCalls = fetchSpy.mock.calls.filter(c => c[1]?.method === 'PATCH');
      expect(patchCalls).toHaveLength(0);
    });

    it('should rename folder in-place preserving the exact same folder ID', async () => {
      const result = await PersonalDriveService.renameChildNameInPlace(
        'mock_token',
        OLD_NAME,
        NEW_NAME,
        ACADEMIC_YEAR,
        'kid_atharva_folder_id'
      );

      expect(result.success).toBe(true);
      expect(result.changed).toBe(true);
      expect(result.folderId).toBe('kid_atharva_folder_id');

      const renamedFolder = mockDriveFiles.find(f => f.id === 'kid_atharva_folder_id');
      expect(renamedFolder?.name).toBe('Atharva Sharma');
    });

    it('should rename internal config and photo files in-place', async () => {
      await PersonalDriveService.renameChildNameInPlace(
        'mock_token',
        OLD_NAME,
        NEW_NAME,
        ACADEMIC_YEAR,
        'kid_atharva_folder_id'
      );

      const configFile = mockDriveFiles.find(f => f.id === 'file_kid_config');
      expect(configFile?.name).toBe('Atharva Sharma_config.json');

      const photoFile = mockDriveFiles.find(f => f.id === 'file_photo');
      expect(photoFile?.name).toBe('Atharva Sharma_photo.jpg');
    });

    it('should update child name inside Year config (Tier 1) content', async () => {
      await PersonalDriveService.renameChildNameInPlace(
        'mock_token',
        OLD_NAME,
        NEW_NAME,
        ACADEMIC_YEAR,
        'kid_atharva_folder_id'
      );

      const yearConfigFile = mockDriveFiles.find(f => f.id === 'file_year_config');
      expect(yearConfigFile?.content.children[0].childName).toBe('Atharva Sharma');
      expect(yearConfigFile?.content.children[0].relativeConfigPath).toBe('Atharva Sharma/Atharva Sharma_config.json');
    });

    it('preserves permanent role-based Apps Script project title without unnecessary renaming', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      await PersonalDriveService.renameChildNameInPlace(
        'mock_token',
        OLD_NAME,
        NEW_NAME,
        ACADEMIC_YEAR,
        'kid_atharva_folder_id'
      );

      // In Dual Worker architecture, GAS projects use permanent role titles and are never renamed
      const scriptCalls = fetchSpy.mock.calls.filter(c =>
        c[0].toString().includes('script_gas_123')
      );
      expect(scriptCalls).toHaveLength(0);

      // Zero Drive API calls on Apps Script project
      const forbiddenDriveCall = fetchSpy.mock.calls.find(c =>
        c[0].toString().includes('drive/v3/files/script_gas_123')
      );
      expect(forbiddenDriveCall).toBeUndefined();
    });
  });

  // ==========================================
  // 3. IN-PLACE ACADEMIC YEAR MOVE TESTS
  // ==========================================
  describe('In-Place Academic Year Relocation', () => {
    const CHILD_NAME = 'Atharva';
    const OLD_YEAR = '2025-2026';
    const NEW_YEAR = '2026-2027';

    beforeEach(async () => {
      const rootFolder = { id: 'root_kids_data', name: 'K.I.D.S. Data', parents: [] };
      const oldYearFolder = { id: 'year_2025_2026', name: OLD_YEAR, parents: ['root_kids_data'] };
      const targetYearFolder = { id: 'year_2026_2027', name: NEW_YEAR, parents: ['root_kids_data'] };
      const kidFolder = { id: 'kid_atharva_folder_id', name: CHILD_NAME, parents: ['year_2025_2026'] };

      const oldYearConfig = {
        id: 'file_old_year_cfg',
        name: `${OLD_YEAR}_config.json`,
        parents: ['year_2025_2026'],
        content: { academicYear: OLD_YEAR, children: [{ childName: CHILD_NAME }] }
      };

      const kidConfig = {
        id: 'file_kid_cfg',
        name: `${CHILD_NAME}_config.json`,
        parents: ['kid_atharva_folder_id'],
        content: { kidName: CHILD_NAME, academicYear: OLD_YEAR }
      };

      mockDriveFiles = [rootFolder, oldYearFolder, targetYearFolder, kidFolder, oldYearConfig, kidConfig];

      await ChildManager.createProfile(CHILD_NAME, OLD_YEAR);
      const active = await ChildManager.getActiveProfile();
      if (active) {
        await ChildManager.updateProfile(active.id, {
          folderId: 'kid_atharva_folder_id',
          schoolGasScriptId: 'script_gas_123'
        });
      }
    });

    it('should perform NO-OP when academic year is unchanged', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      fetchSpy.mockClear();

      const res = await PersonalDriveService.moveChildToNewAcademicYear(
        'mock_token',
        CHILD_NAME,
        OLD_YEAR,
        OLD_YEAR,
        'kid_atharva_folder_id'
      );

      expect(res.success).toBe(true);
      expect(res.changed).toBe(false);
      const patchCalls = fetchSpy.mock.calls.filter(c => c[1]?.method === 'PATCH');
      expect(patchCalls).toHaveLength(0);
    });

    it('should move child folder in-place preserving the exact same folder ID', async () => {
      const res = await PersonalDriveService.moveChildToNewAcademicYear(
        'mock_token',
        CHILD_NAME,
        OLD_YEAR,
        NEW_YEAR,
        'kid_atharva_folder_id'
      );

      expect(res.success).toBe(true);
      expect(res.changed).toBe(true);
      expect(res.folderId).toBe('kid_atharva_folder_id');

      const movedFolder = mockDriveFiles.find(f => f.id === 'kid_atharva_folder_id');
      expect(movedFolder?.parents).toContain('year_2026_2027');
    });

    it('should update academicYear inside kid_config.json', async () => {
      await PersonalDriveService.moveChildToNewAcademicYear(
        'mock_token',
        CHILD_NAME,
        OLD_YEAR,
        NEW_YEAR,
        'kid_atharva_folder_id'
      );

      const kidCfg = mockDriveFiles.find(f => f.id === 'file_kid_cfg');
      expect(kidCfg?.content.academicYear).toBe(NEW_YEAR);
    });

    it('preserves permanent role-based Apps Script project title across academic year moves', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      await PersonalDriveService.moveChildToNewAcademicYear(
        'mock_token',
        CHILD_NAME,
        OLD_YEAR,
        NEW_YEAR,
        'kid_atharva_folder_id'
      );

      // In Dual Worker architecture, GAS projects use permanent role titles and are never renamed
      const scriptCalls = fetchSpy.mock.calls.filter(c =>
        c[0].toString().includes('script_gas_123')
      );
      expect(scriptCalls).toHaveLength(0);

      // Zero Drive API calls on Apps Script project
      const forbiddenDriveCall = fetchSpy.mock.calls.find(c =>
        c[0].toString().includes('drive/v3/files/script_gas_123')
      );
      expect(forbiddenDriveCall).toBeUndefined();
    });
  });
});
