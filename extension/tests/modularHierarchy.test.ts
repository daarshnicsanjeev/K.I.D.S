import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChildManager } from '../src/services/childManager';
import { PersonalDriveService } from '../src/services/personalDriveService';

describe('5-Tier Modular Cloud Architecture', () => {
  let mockStorage: Record<string, any> = {};
  let mockDriveFiles: Array<{ id: string; name: string; parents: string[]; content?: string; mimeType?: string }> = [];

  beforeEach(() => {
    mockStorage = {};
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

      if (urlStr.includes('/drive/v3/files?') && (!opts || !opts.method || opts.method === 'GET')) {
        const urlParams = new URL(urlStr).searchParams;
        const q = decodeURIComponent(urlParams.get('q') || '');
        const matched = mockDriveFiles.filter(f => {
          if (q.includes(`name = '${f.name}'`)) {
            if (f.parents && f.parents.length > 0) {
              return q.includes(`'${f.parents[0]}' in parents`);
            }
            return true;
          }
          return false;
        });

        return {
          ok: true,
          status: 200,
          json: async () => ({ files: matched })
        };
      }

      if (urlStr.includes('alt=media')) {
        const match = urlStr.match(/\/files\/([^\/\?]+)/);
        const fileId = match ? match[1] : '';
        const found = mockDriveFiles.find(f => f.id === fileId);
        return {
          ok: true,
          status: 200,
          json: async () => JSON.parse(found?.content || '{}')
        };
      }

      if (opts?.method === 'POST') {
        let name = 'file';
        let parents: string[] = [];
        let content = '';

        if (opts.body && typeof opts.body === 'string') {
          if (opts.body.startsWith('{')) {
            const body = JSON.parse(opts.body);
            name = body.name || name;
            parents = body.parents || [];
          } else {
            const metaMatch = opts.body.match(/Content-Type: application\/json[^\r\n]*\r\n\r\n(\{.*?\})\r\n/s);
            if (metaMatch) {
              const meta = JSON.parse(metaMatch[1]);
              name = meta.name || name;
              parents = meta.parents || [];
            }
            const contentMatch = opts.body.match(/Content-Type: application\/json\r\n\r\n(\{.*?\})\r\n--/s);
            if (contentMatch) {
              content = contentMatch[1];
            }
          }
        }

        const newId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        mockDriveFiles.push({ id: newId, name, parents, content });
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: newId, name, webViewLink: `https://drive.google.com/drive/folders/${newId}` })
        };
      }

      if (opts?.method === 'PATCH') {
        const match = urlStr.match(/\/files\/([^\/\?]+)/);
        const fileId = match ? match[1] : '';
        const found = mockDriveFiles.find(f => f.id === fileId);
        if (found && opts.body) {
          found.content = opts.body;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: fileId, name: found?.name })
        };
      }

      return { ok: true, status: 200, json: async () => ({}) };
    });
  });

  it('should create complete 5-tier folder structure and modular configs', async () => {
    mockStorage['personal_drive_account_email'] = 'parent@test.com';

    const profile = await ChildManager.createProfile('Atharva', '2026-2027');
    await ChildManager.updateProfile(profile.id, {
      gasScriptId: 'script_123',
      gasDeploymentUrl: 'https://script.google.com/macros/s/AK_TEST/exec?accessKey=Key_ABC',
      portalDomains: ['edusprint.in'],
      registeredTools: [
        { domain: 'edusprint.in', feature: 'Homework', name: 'get_edusprint_homework', url: 'https://edusprint.in/hw' }
      ],
      trackedChats: [
        { id: 'wa_1', name: 'Grade 3B', platform: 'WhatsApp', enabled: true, noticeCount: 5 }
      ]
    });

    await PersonalDriveService.syncFullModularHierarchy('mock_token');

    const rootConfig = mockDriveFiles.find(f => f.name === 'K.I.D.S._Data_config.json');
    expect(rootConfig).toBeDefined();
    const parsedRoot = JSON.parse(rootConfig?.content || '{}');
    expect(parsedRoot.personalEmailAddress).toBe('parent@test.com');
    expect(parsedRoot.activeAcademicYear).toBe('2026-2027');
    expect(parsedRoot.academicYears[0].year).toBe('2026-2027');

    const yearConfig = mockDriveFiles.find(f => f.name === '2026-2027_config.json');
    expect(yearConfig).toBeDefined();
    const parsedYear = JSON.parse(yearConfig?.content || '{}');
    expect(parsedYear.children[0].childName).toBe('Atharva');
    expect(parsedYear.children[0].isActive).toBe(true);

    const kidConfig = mockDriveFiles.find(f => f.name === 'Atharva_config.json');
    expect(kidConfig).toBeDefined();
    const parsedKid = JSON.parse(kidConfig?.content || '{}');
    expect(parsedKid.scriptId).toBe('script_123');
    expect(parsedKid.url).toContain('AK_TEST');

    const portalConfig = mockDriveFiles.find(f => f.name === 'portal_tools_config.json');
    expect(portalConfig).toBeDefined();
    const parsedPortal = JSON.parse(portalConfig?.content || '{}');
    expect(parsedPortal.portals[0].domain).toBe('edusprint.in');
    expect(parsedPortal.portals[0].tools[0].name).toBe('get_edusprint_homework');

    const msgConfig = mockDriveFiles.find(f => f.name === 'messaging_tools_config.json');
    expect(msgConfig).toBeDefined();
    const parsedMsg = JSON.parse(msgConfig?.content || '{}');
    expect(parsedMsg.groups[0].chatName).toBe('Grade 3B');
    expect(parsedMsg.groups[0].platform).toBe('WhatsApp');
  });

  it('should restore profiles from 5-tier Drive configs during simulated machine change', async () => {
    mockDriveFiles = [
      { id: 'folder_root', name: 'K.I.D.S. Data', parents: [] },
      { id: 'file_root_config', name: 'K.I.D.S._Data_config.json', parents: ['folder_root'], content: JSON.stringify({ version: '1.0', personalEmailAddress: 'parent@test.com', activeAcademicYear: '2026-2027', academicYears: [{ year: '2026-2027', isActive: true }] }) },
      { id: 'folder_2026_2027', name: '2026-2027', parents: ['folder_root'] },
      { id: 'file_year_config', name: '2026-2027_config.json', parents: ['folder_2026_2027'], content: JSON.stringify({ academicYear: '2026-2027', activeChildId: 'child_atharva_test', children: [{ id: 'child_atharva_test', childName: 'Atharva', isActive: true, isRemoved: false }] }) },
      { id: 'folder_atharva', name: 'Atharva', parents: ['folder_2026_2027'] },
      { id: 'file_atharva_config', name: 'Atharva_config.json', parents: ['folder_atharva'], content: JSON.stringify({ kidName: 'Atharva', academicYear: '2026-2027', hasClassroom: true, classroomEmail: 'atharva@school.edu', scriptId: 'script_atharva_999', deploymentId: 'AK_DEP_999', url: 'https://script.google.com/macros/s/AK_DEP_999/exec?accessKey=Key_999' }) },
      { id: 'folder_portal_tools', name: 'portal_tools', parents: ['folder_atharva'] },
      { id: 'file_portal_config', name: 'portal_tools_config.json', parents: ['folder_portal_tools'], content: JSON.stringify({ kidName: 'Atharva', academicYear: '2026-2027', portals: [{ domain: 'canvas.instructure.com', portalName: 'CANVAS', baseUrl: 'https://canvas.instructure.com', tools: [{ feature: 'Assignments', name: 'get_canvas_assignments', url: 'https://canvas.instructure.com/courses/1/assignments' }] }] }) },
      { id: 'folder_messaging_tools', name: 'messaging_tools', parents: ['folder_atharva'] },
      { id: 'file_msg_config', name: 'messaging_tools_config.json', parents: ['folder_messaging_tools'], content: JSON.stringify({ kidName: 'Atharva', academicYear: '2026-2027', groups: [{ id: 'g_wa', chatName: 'Grade 3 Parents', platform: 'WhatsApp', isActive: true, noticesCount: 15 }] }) }
    ];

    const restoreRes = await PersonalDriveService.restoreAllProfilesFromDrive('mock_token');
    expect(restoreRes.restoredCount).toBe(1);
    expect(restoreRes.profiles[0].name).toBe('Atharva');
    expect(restoreRes.profiles[0].gasScriptId).toBe('script_atharva_999');
    expect(restoreRes.profiles[0].portalDomains).toContain('canvas.instructure.com');
    expect(restoreRes.profiles[0].registeredTools[0].name).toBe('get_canvas_assignments');
    expect(restoreRes.profiles[0].trackedChats[0].name).toBe('Grade 3 Parents');
  });
});
