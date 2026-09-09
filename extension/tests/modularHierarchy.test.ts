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
          if ((f as any).trashed) return false;
          if (f.parents && f.parents.length > 0 && !q.includes(`'${f.parents[0]}' in parents`)) {
            return false;
          }
          if (q.includes(`name = '${f.name}'`)) return true;
          if (q.includes(`name = 'attachments' or name = 'Attachments'`) && f.name.toLowerCase() === 'attachments') return true;
          if (q.includes(`groups_manifest.json`) && f.name.includes('groups_manifest.json')) return true;
          if (q.includes(`_archive.json`) && f.name.includes('_archive.json')) return true;
          if (!q.includes('name =') && !q.includes('name contains')) return true;
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
        mockDriveFiles.push({ id: newId, name, parents, content, mimeType: name.endsWith('.json') ? 'application/json' : 'application/vnd.google-apps.folder' });
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
        if (found) {
          if (opts.body) {
            try {
              const bodyJson = JSON.parse(opts.body);
              if (bodyJson.trashed) (found as any).trashed = true;
              else found.content = opts.body;
            } catch (e) {
              found.content = opts.body;
            }
          }
          if (urlStr.includes('addParents=')) {
            const addP = new URL(urlStr).searchParams.get('addParents');
            if (addP) found.parents = [addP];
          }
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

  it('should NEVER create attachments folder directly in child root (places it under messaging_tools)', async () => {
    mockDriveFiles = [
      { id: 'folder_root', name: 'K.I.D.S. Data', parents: [] },
      { id: 'folder_2026_2027', name: '2026-2027', parents: ['folder_root'] },
      { id: 'folder_atharva', name: 'Atharva', parents: ['folder_2026_2027'] },
      { id: 'folder_msg', name: 'messaging_tools', parents: ['folder_atharva'] }
    ];

    const result = await PersonalDriveService.getOrCreateAttachmentsFolder('mock_token', 'Atharva');
    expect(result.id).toBeDefined();

    // Verify created folder has parent folder_msg (messaging_tools), NOT folder_atharva
    const createdFolder = mockDriveFiles.find(f => f.id === result.id);
    expect(createdFolder).toBeDefined();
    expect(createdFolder?.parents).toContain('folder_msg');
    expect(createdFolder?.parents).not.toContain('folder_atharva');
  });

  it('should store K.I.D.S._groups_manifest.json inside messaging_tools, NOT in child root', async () => {
    mockDriveFiles = [
      { id: 'folder_root', name: 'K.I.D.S. Data', parents: [] },
      { id: 'folder_2026_2027', name: '2026-2027', parents: ['folder_root'] },
      { id: 'folder_atharva', name: 'Atharva', parents: ['folder_2026_2027'] },
      { id: 'folder_msg', name: 'messaging_tools', parents: ['folder_atharva'] }
    ];

    await PersonalDriveService.updateGroupsManifest('mock_token', 'Atharva', [
      { chatName: '3B Cambridge 2026 - 27', sender: 'Teacher', body: 'Homework assigned', timestamp: '10:00 AM' }
    ]);

    const manifestFile = mockDriveFiles.find(f => f.name === 'K.I.D.S._groups_manifest.json');
    expect(manifestFile).toBeDefined();
    expect(manifestFile?.parents).toContain('folder_msg');
    expect(manifestFile?.parents).not.toContain('folder_atharva');
  });

  it('should sanitize child directory: relocate errant attachments and purge rogue files from child root', async () => {
    // Setup initial tree with errant folders & rogue files directly under Atharva root
    const errantFolder = {
      id: 'errant_attachments_id',
      name: 'Attachments',
      parents: ['folder_atharva'],
      mimeType: 'application/vnd.google-apps.folder',
      trashed: false
    };
    const errantFile = {
      id: 'file_in_errant_folder',
      name: 'Atharva_Circular.pdf',
      parents: ['errant_attachments_id'],
      mimeType: 'application/pdf',
      trashed: false
    };
    const rogueManifest1 = {
      id: 'rogue_manifest_1',
      name: 'K.I.D.S._groups_manifest.json',
      parents: ['folder_atharva'],
      mimeType: 'application/json',
      trashed: false
    };
    const rogueManifest2 = {
      id: 'rogue_manifest_2',
      name: 'K (1).I.D.S._groups_manifest.json',
      parents: ['folder_atharva'],
      mimeType: 'application/json',
      trashed: false
    };

    mockDriveFiles = [
      { id: 'folder_root', name: 'K.I.D.S. Data', parents: [] },
      { id: 'folder_2026_2027', name: '2026-2027', parents: ['folder_root'] },
      { id: 'folder_atharva', name: 'Atharva', parents: ['folder_2026_2027'] },
      { id: 'folder_msg', name: 'messaging_tools', parents: ['folder_atharva'] },
      errantFolder,
      errantFile,
      rogueManifest1,
      rogueManifest2
    ];

    const cleanupRes = await PersonalDriveService.sanitizeChildDirectoryStructure('mock_token', 'Atharva', '2026-2027');

    expect(cleanupRes.cleanedFolders).toBeGreaterThanOrEqual(1);
    expect(cleanupRes.movedFiles).toBeGreaterThanOrEqual(1);
    expect(cleanupRes.cleanedFiles).toBeGreaterThanOrEqual(1);

    // Errant folder should be marked as trashed
    expect((errantFolder as any).trashed).toBe(true);

    // File in errant folder should have been relocated out of the errant folder
    expect(errantFile.parents).not.toContain('errant_attachments_id');
    expect(errantFile.parents[0]).not.toBe('folder_atharva');

    // Rogue duplicate manifest in child root should be trashed
    expect((rogueManifest2 as any).trashed).toBe(true);
  });

  it('deduplicates and skips classroom attachments when filename has special characters sanitized on Drive', async () => {
    // Setup folder hierarchy
    mockDriveFiles = [
      { id: 'folder_root', name: 'K.I.D.S. Data', parents: [] },
      { id: 'folder_2026_2027', name: '2026-2027', parents: ['folder_root'] },
      { id: 'folder_atharva', name: 'Atharva', parents: ['folder_2026_2027'] },
      { id: 'folder_classroom', name: 'classroom', parents: ['folder_atharva'] },
      { id: 'folder_attachments', name: 'attachments', parents: ['folder_classroom'] },
      {
        id: 'file_classroom_data',
        name: 'classroom_data.json',
        parents: ['folder_classroom'],
        content: JSON.stringify({
          courses: [
            {
              name: 'Grade 3B CAIE',
              announcements: [
                {
                  id: 'ann_1',
                  attachments: [
                    {
                      fileId: 'att_123',
                      title: 'Jul 5, 2026 at 11:39 AM.jpg',
                      targetName: 'Grade_3B_CAIE_Ann_Dear_Parents____Jul 5, 2026 at 11:39 AM.jpg'
                    }
                  ]
                }
              ]
            }
          ]
        })
      },
      // Already downloaded file on Google Drive (colon sanitized to underscore)
      {
        id: 'file_jul_5_jpg',
        name: 'Grade_3B_CAIE_Ann_Dear_Parents____Jul 5, 2026 at 11_39 AM.jpg',
        parents: ['folder_attachments'],
        mimeType: 'image/jpeg'
      }
    ];

    const res = await PersonalDriveService.syncClassroomAttachments('mock_token', undefined, 'Atharva', '2026-2027');

    expect(res.total).toBe(1);
    expect(res.skipped).toBe(1);
    expect(res.downloaded).toBe(0);
    expect(res.failed).toBe(0);
  });

  it('creates root folder and root json file on login, but never creates year or child folders before selection', async () => {
    mockDriveFiles = [];

    // Simulate login: saveRootConfig is invoked
    await PersonalDriveService.saveRootConfig('mock_token');

    // Verify root folder 'K.I.D.S. Data' was created
    const rootFolder = mockDriveFiles.find(f => f.name === 'K.I.D.S. Data');
    expect(rootFolder).toBeDefined();

    // Verify root config 'K.I.D.S._Data_config.json' was created in root
    const rootConfig = mockDriveFiles.find(f => f.name === 'K.I.D.S._Data_config.json');
    expect(rootConfig).toBeDefined();
    expect(rootConfig?.parents).toContain(rootFolder?.id);

    // Verify that NO year folders (e.g. 2026-2027) or child folders were created
    const yearFolders = mockDriveFiles.filter(f => f.name.includes('2026') || f.name.includes('2025'));
    expect(yearFolders.length).toBe(0);

    // Recovery check returns 0 and creates no additional folders
    const restoreRes = await PersonalDriveService.restoreAllProfilesFromDrive('mock_token');
    expect(restoreRes.restoredCount).toBe(0);
    expect(restoreRes.profiles).toEqual([]);
    expect(mockDriveFiles.filter(f => f.name.includes('2026') || f.name.includes('2025')).length).toBe(0);
  });

  it('does NOT create messaging_tools or messaging_tools_config.json when child has 0 tracked chats (Step 2 quarantine)', async () => {
    mockDriveFiles = [];
    mockStorage['personal_drive_account_email'] = 'parent@test.com';

    // Step 2 profile: has school/portal data, but ZERO tracked chats
    const profile = await ChildManager.createProfile('Atharva', '2026-2027');
    await ChildManager.updateProfile(profile.id, {
      gasScriptId: 'script_123',
      gasDeploymentUrl: 'https://script.google.com/macros/s/AK_TEST/exec?accessKey=Key_ABC',
      portalDomains: ['edusprint.in'],
      registeredTools: [],
      trackedChats: [] // No WhatsApp chats configured yet (still in Step 2)
    });

    await PersonalDriveService.syncFullModularHierarchy('mock_token');

    // Kid config and portal config should be created
    expect(mockDriveFiles.find(f => f.name === 'Atharva_config.json')).toBeDefined();
    expect(mockDriveFiles.find(f => f.name === 'portal_tools_config.json')).toBeDefined();

    // messaging_tools folder and messaging_tools_config.json MUST NOT be created
    const msgFolder = mockDriveFiles.find(f => f.name === 'messaging_tools');
    expect(msgFolder).toBeUndefined();
    const msgConfig = mockDriveFiles.find(f => f.name === 'messaging_tools_config.json');
    expect(msgConfig).toBeUndefined();
  });

  it('sanitizeChildDirectoryStructure does not create messaging_tools when child directory has no errant files', async () => {
    mockDriveFiles = [
      { id: 'folder_root', name: 'K.I.D.S. Data', parents: [] },
      { id: 'folder_2026_2027', name: '2026-2027', parents: ['folder_root'] },
      { id: 'folder_atharva', name: 'Atharva', parents: ['folder_2026_2027'] },
      { id: 'folder_classroom', name: 'classroom', parents: ['folder_atharva'] },
      { id: 'folder_emails', name: 'emails', parents: ['folder_atharva'] }
    ];

    const cleanupRes = await PersonalDriveService.sanitizeChildDirectoryStructure('mock_token', 'Atharva', '2026-2027');

    expect(cleanupRes.cleanedFolders).toBe(0);
    expect(cleanupRes.movedFiles).toBe(0);
    expect(cleanupRes.cleanedFiles).toBe(0);

    // messaging_tools must NOT have been created
    const msgFolder = mockDriveFiles.find(f => f.name === 'messaging_tools');
    expect(msgFolder).toBeUndefined();
  });

  it('sanitizeChildDirectoryStructure cleans up duplicate archives with (1) in messaging_tools', async () => {
    const canonicalArchive = {
      id: 'archive_canonical',
      name: 'K.I.D.S._Atharva_archive.json',
      parents: ['folder_msg'],
      modifiedTime: new Date(Date.now()).toISOString(),
      content: '[]'
    };
    const duplicateArchive = {
      id: 'archive_dup_1',
      name: 'K (1).I.D.S._Atharva_archive.json',
      parents: ['folder_msg'],
      modifiedTime: new Date(Date.now() - 60000).toISOString(),
      content: '[]'
    };

    mockDriveFiles = [
      { id: 'folder_root', name: 'K.I.D.S. Data', parents: [] },
      { id: 'folder_2026_2027', name: '2026-2027', parents: ['folder_root'] },
      { id: 'folder_atharva', name: 'Atharva', parents: ['folder_2026_2027'] },
      { id: 'folder_msg', name: 'messaging_tools', parents: ['folder_atharva'] },
      canonicalArchive,
      duplicateArchive
    ];

    const cleanupRes = await PersonalDriveService.sanitizeChildDirectoryStructure('mock_token', 'Atharva', '2026-2027');

    expect(cleanupRes.cleanedFiles).toBeGreaterThanOrEqual(1);
    expect((duplicateArchive as any).trashed).toBe(true);
    expect((canonicalArchive as any).trashed).toBeFalsy();
  });
});


