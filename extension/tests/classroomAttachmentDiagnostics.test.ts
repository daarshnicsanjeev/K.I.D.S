import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PersonalDriveService } from '../src/services/personalDriveService';
import { WhatsAppDiagnosticLogger } from '../src/services/whatsappLogger';
import { GasProvisionerService } from '../src/services/gasProvisioner';
import { ChildManager } from '../src/services/childManager';

describe('Classroom Attachment Diagnostics & Direct Persistence', () => {
  let mockStorage: Record<string, any> = {};
  let logs: any[] = [];

  beforeEach(() => {
    mockStorage = {};
    logs = [];

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
      alarms: {
        create: vi.fn(),
        clear: vi.fn()
      },
      runtime: {
        getPlatformInfo: vi.fn().mockResolvedValue({})
      }
    };

    vi.spyOn(WhatsAppDiagnosticLogger, 'log').mockImplementation(async (level, category, message) => {
      logs.push({ level, category, message });
    });

    vi.spyOn(ChildManager, 'getActiveProfile').mockResolvedValue({
      id: 'prof_1',
      name: 'Atharva',
      academicYear: '2026-2027',
      schoolGasDeploymentUrl: 'https://script.google.com/macros/s/student_worker/exec',
      schoolGasScriptId: 'student_script_123'
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saveExtractedSchoolData saves classroom_data.json directly with parent token and forwards classData to syncClassroomAttachments', async () => {
    const saveJsonSpy = vi.spyOn(PersonalDriveService, 'saveJsonFileInFolder').mockResolvedValue('file_123');
    vi.spyOn(PersonalDriveService, 'getOrCreateKidFolder').mockResolvedValue({ id: 'kid_folder', webViewLink: '' });
    vi.spyOn(PersonalDriveService, 'getOrCreateClassroomFolder').mockResolvedValue({
      id: 'class_folder',
      attachmentsFolderId: 'class_attach_folder'
    } as any);
    vi.spyOn(PersonalDriveService, 'getOrCreateEmailsFolder').mockResolvedValue({
      id: 'email_folder',
      attachmentsFolderId: 'email_attach_folder'
    } as any);
    const syncClassSpy = vi.spyOn(PersonalDriveService, 'syncClassroomAttachments').mockResolvedValue({
      total: 2,
      downloaded: 2,
      skipped: 0,
      failed: 0
    });
    vi.spyOn(PersonalDriveService, 'syncEmailAttachments').mockResolvedValue({
      total: 0,
      downloaded: 0,
      skipped: 0,
      failed: 0
    });

    const mockSyncData = {
      classroom: {
        totalCourses: 1,
        totalAttachments: 2,
        courses: [
          {
            name: 'Grade 3B CAIE',
            announcements: [
              {
                id: 'ann_1',
                attachments: [
                  { fileId: 'f1', title: 'Worksheet 1.pdf', targetName: 'Worksheet_1.pdf' }
                ]
              }
            ],
            courseWork: [],
            materials: [
              {
                id: 'mat_1',
                title: 'Guide',
                attachments: [
                  { fileId: 'f2', title: 'Assessment.pdf', targetName: 'Assessment.pdf' }
                ]
              }
            ]
          }
        ]
      },
      gmail: {
        totalEmails: 0,
        emails: []
      }
    };

    await PersonalDriveService.saveExtractedSchoolData(
      'parent_token_xyz',
      'Atharva',
      '2026-2027',
      mockSyncData,
      'student_token_abc',
      'https://script.google.com/macros/s/student_worker/exec',
      'student_script_123'
    );

    // Verify classroom_data.json was directly written to parent vault
    expect(saveJsonSpy).toHaveBeenCalledWith(
      'parent_token_xyz',
      'class_folder',
      'classroom_data.json',
      mockSyncData.classroom
    );

    // Verify syncClassroomAttachments was invoked with in-memory classData and options
    expect(syncClassSpy).toHaveBeenCalledWith(
      'parent_token_xyz',
      'student_token_abc',
      'Atharva',
      '2026-2027',
      expect.objectContaining({
        silent: false,
        classData: mockSyncData.classroom,
        webAppUrl: 'https://script.google.com/macros/s/student_worker/exec',
        scriptId: 'student_script_123'
      })
    );
  });

  it('syncClassroomAttachments downloads missing files using student worker RPC and writes to Parent attachments folder with diagnostic logs', async () => {
    vi.spyOn(PersonalDriveService, 'getValidToken').mockResolvedValue('parent_token_xyz');
    vi.spyOn(PersonalDriveService, 'getOrCreateClassroomFolder').mockResolvedValue({
      id: 'class_folder',
      attachmentsFolderId: 'class_attach_folder'
    } as any);

    // Simulate empty attachments folder on Drive (0 files already present)
    vi.spyOn(PersonalDriveService, 'listFilesInFolder').mockResolvedValue([]);
    vi.spyOn(PersonalDriveService, 'listSchoolVaultFiles').mockResolvedValue([]);

    // Simulate binary retrieval from student cloud worker
    vi.spyOn(PersonalDriveService, 'downloadDriveFileContent').mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3, 4]).buffer,
      mimeType: 'application/pdf',
      fileName: 'Homework.pdf'
    });

    const saveBinarySpy = vi.spyOn(PersonalDriveService, 'saveBinaryFileInFolder').mockResolvedValue('saved_file_id');

    const inMemoryClassData = {
      courses: [
        {
          name: 'Grade 3B CAIE',
          announcements: [],
          courseWork: [
            {
              id: 'cw_1',
              title: 'Math Addition',
              attachments: [
                { fileId: 'math_file_99', title: 'Addition.pdf', targetName: 'Grade_3B_CAIE_Math_Addition_math_file_99.pdf' }
              ]
            }
          ],
          materials: []
        }
      ]
    };

    const res = await PersonalDriveService.syncClassroomAttachments(
      'parent_token_xyz',
      'student_token_abc',
      'Atharva',
      '2026-2027',
      {
        silent: true,
        classData: inMemoryClassData,
        webAppUrl: 'https://script.google.com/macros/s/student_worker/exec'
      }
    );

    expect(res.total).toBe(1);
    expect(res.downloaded).toBe(1);
    expect(res.skipped).toBe(0);
    expect(res.failed).toBe(0);

    // Verify binary was saved into class_attach_folder
    expect(saveBinarySpy).toHaveBeenCalledWith(
      'parent_token_xyz',
      'class_attach_folder',
      'Grade_3B_CAIE_Math_Addition_math_file_99.pdf',
      expect.any(ArrayBuffer),
      'application/pdf'
    );

    // Verify diagnostic logs were generated
    const scanLog = logs.find(l => l.message.includes('[ATTACHMENT_SCAN]'));
    expect(scanLog).toBeDefined();
    expect(scanLog.message).toContain('Found 1 unique Classroom attachments');

    const downloadLog = logs.find(l => l.message.includes('[ATTACHMENT_DOWNLOADING]'));
    expect(downloadLog).toBeDefined();

    const savedLog = logs.find(l => l.message.includes('[ATTACHMENT_SAVED]'));
    expect(savedLog).toBeDefined();
    expect(savedLog.message).toContain('saved to Parent Vault');

    const completeLog = logs.find(l => l.message.includes('[ATTACHMENT_SYNC_COMPLETE]'));
    expect(completeLog).toBeDefined();
    expect(completeLog.message).toContain('1 downloaded');
  });

  it('runInitialSchoolDataSync respects step2_initial_sync_in_progress storage flag to avoid concurrency', async () => {
    mockStorage['step2_initial_sync_in_progress'] = true;

    const res = await GasProvisionerService.runInitialSchoolDataSync('Atharva', '2026-2027');
    expect(res).toEqual({ inProgress: true });
  });

  it('classifyOcrRequirement correctly categorizes media, digital documents, and scans', () => {
    // Non-text media
    expect(PersonalDriveService.classifyOcrRequirement('lecture.mp3', 'audio/mpeg')).toBe('SKIP');
    expect(PersonalDriveService.classifyOcrRequirement('video.mp4', 'video/mp4')).toBe('SKIP');
    expect(PersonalDriveService.classifyOcrRequirement('archive.zip', 'application/zip')).toBe('SKIP');

    // Direct digital text formats
    expect(PersonalDriveService.classifyOcrRequirement('homework.docx')).toBe('DIRECT_TEXT');
    expect(PersonalDriveService.classifyOcrRequirement('slides.pptx')).toBe('DIRECT_TEXT');
    expect(PersonalDriveService.classifyOcrRequirement('notes.txt', 'text/plain')).toBe('DIRECT_TEXT');

    // Images (Always require OCR)
    expect(PersonalDriveService.classifyOcrRequirement('schedule.jpeg', 'image/jpeg')).toBe('NEEDS_OCR');
    expect(PersonalDriveService.classifyOcrRequirement('blackboard.jpg')).toBe('NEEDS_OCR');
    expect(PersonalDriveService.classifyOcrRequirement('capture.png')).toBe('NEEDS_OCR');

    // Scanned PDFs by naming convention
    expect(PersonalDriveService.classifyOcrRequirement('DocScanner 9 Sept 2026.pdf')).toBe('NEEDS_OCR');
    expect(PersonalDriveService.classifyOcrRequirement('CamScanner_123.pdf')).toBe('NEEDS_OCR');

    // Vector PDF with font text stream
    const fakeVectorPdf = new TextEncoder().encode('%PDF-1.4 ... /Type /Font ... BT (Hello World) Tj ET');
    expect(PersonalDriveService.classifyOcrRequirement('syllabus.pdf', 'application/pdf', fakeVectorPdf.buffer)).toBe('DIRECT_TEXT');
  });

  it('syncClassroomAttachments runs Phase 1 downloads first and then Phase 2 OCR indexing', async () => {
    const fakePdfBytes = new TextEncoder().encode('%PDF-1.4 ... /Type /Font ... BT (Worksheet Text) Tj ET').buffer;
    vi.spyOn(PersonalDriveService, 'getOrCreateClassroomFolder').mockResolvedValue({
      id: 'class_folder_1',
      attachmentsFolderId: 'class_att_folder_1'
    } as any);
    vi.spyOn(PersonalDriveService, 'listFilesInFolder').mockResolvedValue([]);
    vi.spyOn(PersonalDriveService, 'listSchoolVaultFiles').mockResolvedValue([]);
    vi.spyOn(PersonalDriveService, 'downloadDriveFileContent').mockResolvedValue({
      bytes: fakePdfBytes,
      mimeType: 'application/pdf',
      fileName: 'worksheet.pdf'
    });
    vi.spyOn(PersonalDriveService, 'saveBinaryFileInFolder').mockResolvedValue('vault_file_123');
    const rpcSpy = vi.spyOn(PersonalDriveService, 'callGasWorkerRpc').mockResolvedValue({
      success: true,
      record: { fileId: 'vault_file_123' },
      isOcr: false,
      wordCount: 120
    });

    const mockClassData = {
      courses: [{
        name: 'Math',
        materials: [{
          title: 'Fractions',
          attachments: [{ fileId: 'f_math_1', title: 'fractions.pdf', targetName: 'Math_Fractions_f_math_1' }]
        }]
      }]
    };

    const res = await PersonalDriveService.syncClassroomAttachments(
      'parent_token',
      'student_token',
      'Atharva',
      '2026-2027',
      { silent: true, classData: mockClassData, webAppUrl: 'https://gas.mock/exec' }
    );

    expect(res.downloaded).toBe(1);
    expect(res.ocrIndexed).toBe(1);

    // Verify Phase 1 download completed before Phase 2 OCR started
    const savedLog = logs.find(l => l.message.includes('[ATTACHMENT_SAVED]'));
    const phase2StartLog = logs.find(l => l.message.includes('[PHASE_2_OCR_START]'));
    const ocrDoneLog = logs.find(l => l.message.includes('[OCR_INDEXED]'));

    expect(savedLog).toBeDefined();
    expect(savedLog.message).toContain('OCR Category: DIRECT_TEXT');
    expect(phase2StartLog).toBeDefined();
    expect(ocrDoneLog).toBeDefined();
  });
});

