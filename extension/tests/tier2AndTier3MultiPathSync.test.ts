import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vm from 'vm';
import { GasProvisionerService, CURRENT_GAS_SERVER_VERSION } from '../src/services/gasProvisioner';
import { ClassroomBrowserExtractor } from '../src/services/classroomBrowserExtractor';
import { ChildManager, ChildProfile } from '../src/services/childManager';
import { PersonalDriveService } from '../src/services/personalDriveService';

describe('3-Tier Multi-Path School Sync Tests', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    (globalThis as any).chrome = {
      storage: {
        local: {
          store: {} as Record<string, any>,
          get: vi.fn(async (keys: string | string[]) => {
            const result: Record<string, any> = {};
            const keyArr = Array.isArray(keys) ? keys : [keys];
            keyArr.forEach(k => {
              if (k in (globalThis as any).chrome.storage.local.store) {
                result[k] = (globalThis as any).chrome.storage.local.store[k];
              }
            });
            return result;
          }),
          set: vi.fn(async (items: Record<string, any>) => {
            Object.assign((globalThis as any).chrome.storage.local.store, items);
          }),
          remove: vi.fn(async () => {})
        }
      },
      tabs: {
        query: vi.fn(),
        create: vi.fn()
      },
      scripting: {
        executeScript: vi.fn()
      },
      runtime: {
        sendMessage: vi.fn().mockResolvedValue({})
      }
    };
  });

  describe('Tier 2: Standalone Worker Code Generator', () => {
    it('generates a valid, self-contained standalone Apps Script file with pre-populated parameters', () => {
      const code = GasProvisionerService.generateStandaloneSchoolWorkerCode(
        'folder_vault_123',
        'Anvesha',
        '2026-2027',
        'secure_key_abc'
      );

      expect(code).toBeDefined();
      expect(typeof code).toBe('string');

      // Header & instructions
      expect(code).toContain('DEPLOYMENT INSTRUCTIONS');
      expect(code).toContain('script.new');
      expect(code).toContain('Who has access: Anyone');

      // Embedded config
      expect(code).toContain('accessKey: "secure_key_abc"');
      expect(code).toContain('childName: "Anvesha"');
      expect(code).toContain('academicYear: "2026-2027"');
      expect(code).toContain('targetFolderId: "folder_vault_123"');
      expect(code).toContain(`version: "${CURRENT_GAS_SERVER_VERSION}"`);

      // Endpoints & Handlers
      expect(code).toContain('function doGet(e)');
      expect(code).toContain('function doPost(e)');
      expect(code).toContain("action === 'ping'");
      expect(code).toContain('extractClassroomData');
      expect(code).toContain('extractGmailCirculars');
      expect(code).toContain('setupAutomatic1MinTrigger');
      expect(code).toContain('runSchoolCloudSync');
    });

    it('escapes special characters in child names and academic years cleanly', () => {
      const code = GasProvisionerService.generateStandaloneSchoolWorkerCode(
        'folder_xyz',
        'Test "Kid"',
        '2026-2027',
        'key'
      );
      expect(code).toContain('childName: "Test \\"Kid\\""');
    });
  });

  describe('Tier 2: Web App URL Verification & Connection', () => {
    it('rejects invalid or empty Web App URLs', async () => {
      const emptyCheck = await GasProvisionerService.verifyGasWebAppUrl('');
      expect(emptyCheck.success).toBe(false);
      expect(emptyCheck.error).toContain('Please enter');

      const nonGoogleCheck = await GasProvisionerService.verifyGasWebAppUrl('https://example.com');
      expect(nonGoogleCheck.success).toBe(false);
      expect(nonGoogleCheck.error).toContain('Invalid Web App URL');

      const missingExecCheck = await GasProvisionerService.verifyGasWebAppUrl('https://script.google.com/macros/s/AKfycb_test/edit');
      expect(missingExecCheck.success).toBe(false);
    });

    it('successfully verifies a responsive Web App URL', async () => {
      const validUrl = 'https://script.google.com/macros/s/AKfycb_abcdef12345/exec';
      (globalThis as any).fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          success: true,
          status: 'ready',
          worker: 'K.I.D.S. School Worker',
          version: CURRENT_GAS_SERVER_VERSION
        })
      });

      const result = await GasProvisionerService.verifyGasWebAppUrl(validUrl, 'secret_key');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Connected successfully');
    });

    it('detects Google login redirect when "Who has access" is not set to Anyone', async () => {
      const validUrl = 'https://script.google.com/macros/s/AKfycb_restricted/exec';
      (globalThis as any).fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '<html><head><title>Google Accounts: Sign in</title></head><body>accounts.google.com/signin</body></html>'
      });

      const result = await GasProvisionerService.verifyGasWebAppUrl(validUrl);
      expect(result.success).toBe(false);
      expect(result.error).toContain('"Who has access" MUST be set to "Anyone"');
    });

    it('connectManualSchoolWorker validates and updates child profile', async () => {
      const validUrl = 'https://script.google.com/macros/s/AKfycb_valid123/exec';
      (globalThis as any).fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, status: 'ready' })
      });

      const testProfile: ChildProfile = {
        id: 'kid_test_1',
        name: 'Anvesha',
        academicYear: '2026-2027',
        createdAt: Date.now()
      };
      await ChildManager.saveProfiles([testProfile], testProfile.id);

      const conn = await GasProvisionerService.connectManualSchoolWorker('kid_test_1', validUrl);
      expect(conn.success).toBe(true);

      const updated = await ChildManager.getActiveProfile();
      expect(updated?.syncMethod).toBe('GAS_MANUAL');
      expect(updated?.gasDeploymentUrl).toBe(validUrl);
      expect(updated?.schoolGasDeploymentUrl).toBe(validUrl);
    });
  });

  describe('Tier 3: ClassroomBrowserExtractor', () => {
    it('handles browser session extraction with open classroom tab', async () => {
      const mockTab = { id: 101, url: 'https://classroom.google.com' };
      (chrome.tabs.query as any).mockResolvedValue([mockTab]);

      (chrome.scripting.executeScript as any).mockResolvedValue([
        {
          result: [
            {
              id: 'course_101',
              name: 'Grade 5 English',
              alternateLink: 'https://classroom.google.com/c/course_101'
            }
          ]
        }
      ]);

      vi.spyOn(PersonalDriveService, 'getValidToken').mockResolvedValue('mock_parent_token');
      vi.spyOn(PersonalDriveService, 'saveExtractedSchoolData').mockResolvedValue({
        classroomDownloaded: 10,
        emailDownloaded: 0,
        totalDownloaded: 10,
        totalSkipped: 0,
        totalFailed: 0
      });

      const profile: ChildProfile = {
        id: 'kid_browser_test',
        name: 'Anvesha',
        academicYear: '2026-2027',
        createdAt: Date.now()
      };
      await ChildManager.saveProfiles([profile], profile.id);

      const progressUpdates: any[] = [];
      const result = await ClassroomBrowserExtractor.extractClassroomData(profile, {
        mode: 'ONE_TIME_FULL',
        onProgress: (p) => progressUpdates.push(p)
      });

      expect(result.success).toBe(true);
      expect(result.coursesCount).toBe(1);
      expect(result.savedAttachments).toBe(10);
      expect(progressUpdates.some(p => p.phase === 'COMPLETED')).toBe(true);

      const updated = (await ChildManager.getProfiles(false)).find(p => p.id === 'kid_browser_test');
      expect(updated?.syncMethod).toBe('BROWSER_EXTENSION');
      expect(updated?.schoolGasDeploymentUrl).toBe('browser_extension');
      expect(updated?.initialSyncStatus).toBe('COMPLETED');
    });

    it('reports clear error if student is not logged in or no courses detected', async () => {
      (chrome.tabs.query as any).mockResolvedValue([]);
      (globalThis as any).fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><body>Welcome to Google Classroom</body></html>'
      });

      vi.spyOn(PersonalDriveService, 'getValidToken').mockResolvedValue('mock_parent_token');

      const profile: ChildProfile = {
        id: 'kid_empty_test',
        name: 'Anvesha',
        academicYear: '2026-2027',
        createdAt: Date.now()
      };

      const result = await ClassroomBrowserExtractor.extractClassroomData(profile, {
        mode: 'ONE_TIME_FULL'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('classroom.google.com');
    });

    it('extractUserPrefix accurately parses multi-account index', () => {
      expect(ClassroomBrowserExtractor.extractUserPrefix('https://classroom.google.com/u/2/h/st')).toBe('/u/2');
      expect(ClassroomBrowserExtractor.extractUserPrefix('https://classroom.google.com/u/1/c/12345')).toBe('/u/1');
      expect(ClassroomBrowserExtractor.extractUserPrefix('https://classroom.google.com/h')).toBe('');
      expect(ClassroomBrowserExtractor.extractUserPrefix(undefined)).toBe('');
    });

    it('parseCourseId accurately extracts course ID from diverse URL patterns', () => {
      expect(ClassroomBrowserExtractor.parseCourseId('/u/2/c/NjQ5NjIzNDU1MjYy')).toBe('NjQ5NjIzNDU1MjYy');
      expect(ClassroomBrowserExtractor.parseCourseId('https://classroom.google.com/c/123456789/a')).toBe('123456789');
      expect(ClassroomBrowserExtractor.parseCourseId('/u/0/r/course_abc_123')).toBe('course_abc_123');
      expect(ClassroomBrowserExtractor.parseCourseId('/u/2/h/st')).toBeNull(); // home page
      expect(ClassroomBrowserExtractor.parseCourseId('/u/2/calendar')).toBeNull();
    });

    it('scoreClassroomTab prioritizes student multi-account tabs (/u/2/) over parent account (/u/0/) and gives highest bonus to active tabs', () => {
      const parentTab = { id: 1, url: 'https://classroom.google.com/u/0/h', active: false } as chrome.tabs.Tab;
      const studentTab = { id: 2, url: 'https://classroom.google.com/u/2/h/st', active: false } as chrome.tabs.Tab;
      const activeStudentTab = { id: 3, url: 'https://classroom.google.com/u/2/h/st', active: true } as chrome.tabs.Tab;

      const parentScore = ClassroomBrowserExtractor.scoreClassroomTab(parentTab);
      const studentScore = ClassroomBrowserExtractor.scoreClassroomTab(studentTab);
      const activeStudentScore = ClassroomBrowserExtractor.scoreClassroomTab(activeStudentTab);

      expect(studentScore).toBeGreaterThan(parentScore);
      expect(activeStudentScore).toBeGreaterThan(studentScore);
    });

    it('findClassroomTab picks the active student tab (/u/2/h/st) when multiple tabs are open', async () => {
      const tabs = [
        { id: 1, url: 'https://classroom.google.com/u/0/h', active: false },
        { id: 2, url: 'https://classroom.google.com/u/2/h/st', active: true }
      ];

      (chrome.tabs.query as any).mockImplementation(async (queryInfo: any) => {
        if (queryInfo.active && queryInfo.currentWindow) {
          return [tabs[1]]; // User is actively viewing tab 2
        }
        return tabs;
      });

      const selected = await ClassroomBrowserExtractor.findClassroomTab();
      expect(selected?.id).toBe(2);
      expect(selected?.url).toContain('/u/2/h/st');
    });

    it('handles announcements with 5 to 10 attachments cleanly without duplicates', async () => {
      // Create a mock announcement container with 7 distinct attachments (some having duplicate anchors)
      const mockAttachmentsMap = new Map<string, any>();
      const rawLinks = [
        { href: 'https://drive.google.com/file/d/111111111111111111111111111111111/view', text: '', aria: 'Thumbnail' },
        { href: 'https://drive.google.com/file/d/111111111111111111111111111111111/view', text: 'Maths_Worksheet_1.pdf', aria: '' },
        { href: 'https://drive.google.com/file/d/222222222222222222222222222222222/view', text: 'Science_Project.pdf', aria: '' },
        { href: 'https://docs.google.com/document/d/333333333333333333333333333333333/edit', text: 'English_Essay_Guidelines.docx', aria: '' },
        { href: 'https://docs.google.com/presentation/d/444444444444444444444444444444444/edit', text: 'History_Slides.pptx', aria: '' },
        { href: 'https://drive.google.com/file/d/555555555555555555555555555555555/view', text: 'Geography_Map.png', aria: '' },
        { href: 'https://drive.google.com/file/d/666666666666666666666666666666666/view', text: 'Circular_Annual_Day.pdf', aria: '' },
        { href: 'https://drive.google.com/file/d/777777777777777777777777777777777/view', text: 'Fee_Payment_Schedule.pdf', aria: '' }
      ];

      for (const a of rawLinks) {
        const href = a.href;
        const attTitle = (a.text || a.aria || '').trim();
        const dMatch = href.match(/\/(?:file\/d\/|[a-z]+\/d\/|open\?id=)([a-zA-Z0-9_-]{20,})/);
        const fId = dMatch ? dMatch[1] : undefined;
        const attKey = fId || href;
        if (!attKey) continue;

        const existing = mockAttachmentsMap.get(attKey);
        if (existing) {
          const isPlaceholder = !existing.title ||
            ['attachment', 'thumbnail', 'file', 'preview'].includes(existing.title.toLowerCase().trim()) ||
            (attTitle && attTitle.length > existing.title.length && !['attachment', 'thumbnail'].includes(attTitle.toLowerCase().trim()));
          if (isPlaceholder && attTitle) {
            existing.title = attTitle;
          }
        } else {
          mockAttachmentsMap.set(attKey, {
            title: attTitle || 'Attachment',
            fileId: fId,
            id: fId,
            alternateLink: href,
            downloadUrl: fId ? `https://drive.google.com/uc?id=${fId}&export=download` : href
          });
        }
      }

      const attachments = Array.from(mockAttachmentsMap.values());
      expect(attachments.length).toBe(7);
      // Verify duplicate anchor was merged and thumbnail was upgraded with real file title
      expect(attachments[0].title).toBe('Maths_Worksheet_1.pdf');
      expect(attachments[1].title).toBe('Science_Project.pdf');
      expect(attachments[2].fileId).toBe('333333333333333333333333333333333');
      expect(attachments[6].fileId).toBe('777777777777777777777777777777777');
    });

    it('scrapeCourseClassworkTab extracts materials and attachments via background tab injection', async () => {
      (chrome.tabs.query as any).mockResolvedValue([]);
      (chrome.tabs.create as any).mockResolvedValue({ id: 505, url: 'https://classroom.google.com/u/2/w/c123/t/all' });
      chrome.tabs.remove = vi.fn().mockResolvedValue(undefined) as any;

      (chrome.scripting.executeScript as any).mockResolvedValue([
        {
          result: {
            materials: [
              {
                id: 'mat_1',
                title: 'Notes - Chapter 1',
                attachments: [
                  {
                    title: 'Chapter_1_Notes.pdf',
                    fileId: '111111111111111111111111111111111',
                    downloadUrl: 'https://drive.google.com/uc?id=111111111111111111111111111111111&export=download'
                  }
                ]
              }
            ],
            courseWork: [
              {
                id: 'cw_1',
                title: 'Geography Question Bank',
                attachments: [
                  {
                    title: 'Geography_QB.pdf',
                    fileId: '222222222222222222222222222222222',
                    downloadUrl: 'https://drive.google.com/uc?id=222222222222222222222222222222222&export=download'
                  }
                ]
              }
            ],
            attachmentsCount: 2
          }
        }
      ]);

      const res = await ClassroomBrowserExtractor.scrapeCourseClassworkTab('c123', '/u/2', 'STD- VIII (B)');
      expect(res).not.toBeNull();
      expect(res?.materials.length).toBe(1);
      expect(res?.materials[0].title).toBe('Notes - Chapter 1');
      expect(res?.courseWork.length).toBe(1);
      expect(res?.courseWork[0].title).toBe('Geography Question Bank');
      expect(res?.attachmentsCount).toBe(2);
      expect(chrome.tabs.remove).toHaveBeenCalledWith(505);
    });

    it('PersonalDriveService.downloadDriveFileContent succeeds in Tier 3 without GAS worker via direct session download', async () => {
      const mockPdfBytes = new TextEncoder().encode('%PDF-1.4 Mock PDF Content').buffer;
      (globalThis as any).fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/pdf' }),
        arrayBuffer: async () => mockPdfBytes
      });

      const res = await PersonalDriveService.downloadDriveFileContent('file_tier3_123', undefined, 'browser_extension');
      expect(res).not.toBeNull();
      expect(res?.mimeType).toBe('application/pdf');
      expect(res?.bytes.byteLength).toBeGreaterThan(0);
    });
  });

  describe('Option A: Self-Hosted Google Sheet Template Generator', () => {
    it('generates a branded setup spreadsheet, container-bound script, and public /copy URL', async () => {
      let createdSpreadsheet: any = null;
      let createdProject: any = null;
      let uploadedContent: any = null;
      let permissionCreated: any = null;

      (globalThis as any).fetch = vi.fn(async (url: any, opts: any = {}) => {
        const urlStr = url.toString();
        const method = (opts.method || 'GET').toUpperCase();

        // 1. Search existing files (return empty to trigger creation)
        if (urlStr.includes('/drive/v3/files?') && method === 'GET') {
          return {
            ok: true,
            status: 200,
            json: async () => ({ files: [] })
          } as any;
        }

        // 2. Create spreadsheet
        if (urlStr.includes('/drive/v3/files') && method === 'POST' && !urlStr.includes('permissions')) {
          createdSpreadsheet = JSON.parse(opts.body);
          return {
            ok: true,
            status: 200,
            json: async () => ({ id: 'sheet_mock_999' })
          } as any;
        }

        // 3. Create container-bound script
        if (urlStr.includes('/v1/projects') && method === 'POST') {
          createdProject = JSON.parse(opts.body);
          return {
            ok: true,
            status: 200,
            json: async () => ({ scriptId: 'script_mock_888' })
          } as any;
        }

        // 4. Upload script content
        if (urlStr.includes('/content') && method === 'PUT') {
          uploadedContent = JSON.parse(opts.body);
          return {
            ok: true,
            status: 200,
            json: async () => ({})
          } as any;
        }

        // 5. Create permission
        if (urlStr.includes('/permissions') && method === 'POST') {
          permissionCreated = JSON.parse(opts.body);
          return {
            ok: true,
            status: 200,
            json: async () => ({ id: 'perm_mock_777' })
          } as any;
        }

        return { ok: true, status: 200, json: async () => ({}) } as any;
      });

      const result = await GasProvisionerService.generateChildSetupSheet(
        'mock_parent_token',
        'Atharva',
        '2026-2027',
        'https://script.google.com/macros/s/master_dep_123/exec?accessKey=key123',
        'key123'
      );

      expect(result).toBeDefined();
      expect(result.spreadsheetId).toBe('sheet_mock_999');
      expect(result.copyUrl).toBe('https://docs.google.com/spreadsheets/d/sheet_mock_999/copy');

      // Verify spreadsheet creation
      expect(createdSpreadsheet.name).toBe('K.I.D.S. School Sync - Atharva');
      expect(createdSpreadsheet.mimeType).toBe('application/vnd.google-apps.spreadsheet');

      // Verify container-bound script creation with parentId
      expect(createdProject.parentId).toBe('sheet_mock_999');
      expect(createdProject.title).toBe('K.I.D.S. School Sync - Atharva');

      // Verify permission set to public reader
      expect(permissionCreated.role).toBe('reader');
      expect(permissionCreated.type).toBe('anyone');

      // Verify uploaded content files and valid JS syntax
      expect(uploadedContent.files).toHaveLength(2);
      const codeFile = uploadedContent.files.find((f: any) => f.name === 'Code');
      expect(codeFile).toBeDefined();
      expect(codeFile.source).toContain('setup24x7CloudSync');
      expect(codeFile.source).toContain('runClassroomSync');
      expect(codeFile.source).toContain('push_school_data');
      expect(codeFile.source).toContain('Atharva');

      // Syntax check using vm.Script
      expect(() => {
        new vm.Script(codeFile.source, { filename: 'StudentSyncSheet.gs' });
      }).not.toThrow();
    });

    it('reuses existing setup spreadsheet if one already exists in Parent Drive', async () => {
      (globalThis as any).fetch = vi.fn(async (url: any, opts: any = {}) => {
        const urlStr = url.toString();
        const method = (opts.method || 'GET').toUpperCase();

        if (urlStr.includes('/drive/v3/files?') && method === 'GET') {
          return {
            ok: true,
            status: 200,
            json: async () => ({ files: [{ id: 'sheet_existing_456', name: 'K.I.D.S. School Sync - Atharva' }] })
          } as any;
        }

        return { ok: true, status: 200, json: async () => ({}) } as any;
      });

      const result = await GasProvisionerService.generateChildSetupSheet(
        'mock_parent_token',
        'Atharva',
        '2026-2027',
        'https://script.google.com/macros/s/master_dep_123/exec?accessKey=key123'
      );

      expect(result.spreadsheetId).toBe('sheet_existing_456');
      expect(result.copyUrl).toBe('https://docs.google.com/spreadsheets/d/sheet_existing_456/copy');
    });
  });
});
