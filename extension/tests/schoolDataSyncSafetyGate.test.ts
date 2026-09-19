import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GasProvisionerService } from '../src/services/gasProvisioner';
import { PersonalDriveService } from '../src/services/personalDriveService';
import { ChildManager } from '../src/services/childManager';

describe('School Data Initial Sync Safety Gate', () => {
  let mockStorage: Record<string, any> = {};
  let createdNotifications: any[] = [];
  let originalFetch: any;

  beforeEach(() => {
    mockStorage = {};
    createdNotifications = [];
    originalFetch = globalThis.fetch;

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
      notifications: {
        create: vi.fn((opts: any, cb?: () => void) => {
          createdNotifications.push(opts);
          if (cb) cb();
        })
      }
    };

    vi.spyOn(ChildManager, 'getActiveProfile').mockResolvedValue({
      id: 'profile_1',
      name: 'Atharva',
      academicYear: '2026-2027',
      schoolGasScriptId: 'script_123',
      schoolGasDeploymentUrl: 'https://script.google.com/macros/s/test/exec',
      studentAccountEmail: 'atharva.chaodhari@myglobal.school',
      schoolEmailDomain: 'myglobal.school'
    } as any);

    vi.spyOn(PersonalDriveService, 'getValidToken').mockResolvedValue('mock_parent_token');
    vi.spyOn(PersonalDriveService, 'getOrCreateKidFolder').mockResolvedValue({ id: 'mock_kid_folder_id', webViewLink: '' });
    vi.spyOn(PersonalDriveService, 'getOrCreateClassroomFolder').mockResolvedValue({
      id: 'mock_class_folder_id',
      attachmentsFolderId: 'mock_attach_folder_id'
    } as any);
    vi.spyOn(PersonalDriveService, 'readJsonFileInFolder').mockResolvedValue(null);
    vi.spyOn(PersonalDriveService, 'saveExtractedSchoolData').mockResolvedValue(undefined as any);
    vi.spyOn(PersonalDriveService, 'listFilesInFolder').mockResolvedValue([]);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('blocks completion and avoids desktop notifications if student worker extraction fails', async () => {
    vi.spyOn(GasProvisionerService, 'executeMcpCommand').mockRejectedValue(new Error('DriveApp permission denied'));

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal Server Error' })
    } as any);

    await expect(GasProvisionerService.runInitialSchoolDataSync(
      'Atharva',
      '2026-2027',
      'mock_student_token',
      'https://script.google.com/macros/s/test/exec',
      'script_123'
    )).rejects.toThrow();

    expect(mockStorage['step2_sync_status']).toBe('ERROR');
    expect(mockStorage['step2_initial_sync_complete']).toBe(false);
    expect(createdNotifications).toHaveLength(0);
  });

  it('blocks completion and avoids desktop notifications if 0 courses and 0 emails are returned', async () => {
    vi.spyOn(GasProvisionerService, 'executeMcpCommand').mockResolvedValue({
      classroom: {
        totalCourses: 0,
        courses: []
      },
      gmail: {
        totalEmails: 0,
        emails: []
      }
    });

    await expect(GasProvisionerService.runInitialSchoolDataSync(
      'Atharva',
      '2026-2027',
      'mock_student_token',
      'https://script.google.com/macros/s/test/exec',
      'script_123'
    )).rejects.toThrow(/Zero courses and zero emails found/);

    expect(mockStorage['step2_sync_status']).toBe('ERROR');
    expect(mockStorage['step2_initial_sync_complete']).toBe(false);
    expect(createdNotifications).toHaveLength(0);
  });

  it('marks COMPLETED and creates desktop notification only when real data is captured', async () => {
    vi.spyOn(GasProvisionerService, 'executeMcpCommand').mockResolvedValue({
      classroom: {
        totalCourses: 8,
        totalAttachments: 2,
        courses: [{ id: 'c1', name: 'Grade 3B Math' }]
      },
      gmail: {
        totalEmails: 3,
        emails: [{ id: 'm1', subject: 'School Circular' }]
      }
    });

    vi.spyOn(PersonalDriveService, 'listFilesInFolder').mockResolvedValue([
      { id: 'f1', name: 'Math_Worksheet.pdf', mimeType: 'application/pdf' },
      { id: 'f2', name: 'Science_Lab.pdf', mimeType: 'application/pdf' }
    ]);

    const res = await GasProvisionerService.runInitialSchoolDataSync(
      'Atharva',
      '2026-2027',
      'mock_student_token',
      'https://script.google.com/macros/s/test/exec',
      'script_123'
    );

    expect(res).toBeDefined();
    expect(res.courses).toBe(8);
    expect(res.emails).toBe(3);
    expect(res.attachments).toBe(2);

    expect(mockStorage['step2_sync_status']).toBe('COMPLETED');
    expect(mockStorage['step2_initial_sync_complete']).toBe(true);

    expect(createdNotifications).toHaveLength(1);
    expect(createdNotifications[0].title).toBe('K.I.D.S. Vault Ready (Atharva)');
    expect(createdNotifications[0].message).toContain('8 course(s)');
    expect(createdNotifications[0].message).toContain('2 attachment(s)');
    expect(createdNotifications[0].message).toContain('3 circular(s)');
  });

  it('invokes PersonalDriveService.callGasWorkerRpc with isIncremental: false and extractOnly: true when Web App fallback is used', async () => {
    vi.spyOn(GasProvisionerService, 'executeMcpCommand').mockRejectedValue(new Error('scripts.run disabled'));

    const rpcSpy = vi.spyOn(PersonalDriveService, 'callGasWorkerRpc').mockResolvedValue({
      classroom: {
        totalCourses: 1,
        totalAttachments: 208,
        courses: [{ id: 'course_3b', name: 'Grade 3B CAIE' }]
      },
      gmail: {
        totalEmails: 15,
        emails: [{ id: 'email_1', subject: 'Circular on Annual Day' }]
      }
    });

    vi.spyOn(PersonalDriveService, 'listFilesInFolder').mockResolvedValue(
      new Array(208).fill(null).map((_, i) => ({ id: `f_${i}`, name: `file_${i}.pdf` }))
    );

    const res = await GasProvisionerService.runInitialSchoolDataSync(
      'Atharva',
      '2026-2027',
      'mock_student_token',
      'https://script.google.com/macros/s/test/exec',
      'script_123'
    );

    expect(rpcSpy).toHaveBeenCalledWith(
      'https://script.google.com/macros/s/test/exec',
      'sync_classroom_and_gmail',
      expect.objectContaining({
        extractOnly: true,
        isIncremental: false,
        childName: 'Atharva'
      })
    );

    expect(res).toBeDefined();
    expect(res.courses).toBe(1);
    expect(res.emails).toBe(15);
    expect(res.attachments).toBe(208);
    expect(mockStorage['step2_sync_status']).toBe('COMPLETED');
    expect(mockStorage['step2_initial_sync_complete']).toBe(true);
  });

  it('marks INTERRUPTED and suppresses completion notification when saveExtractedSchoolData reports interruption or missing attachments', async () => {
    vi.spyOn(GasProvisionerService, 'executeMcpCommand').mockResolvedValue({
      classroom: {
        totalCourses: 1,
        totalAttachments: 228,
        courses: [{ id: 'course_1', name: 'Grade 3B CAIE' }]
      },
      gmail: {
        totalEmails: 66,
        totalAttachments: 2,
        emails: [{ id: 'm1', subject: 'Circular' }]
      }
    });

    // Only 50 files reached disk before network loss
    vi.spyOn(PersonalDriveService, 'listFilesInFolder').mockResolvedValue(
      new Array(50).fill(null).map((_, i) => ({ id: `f_${i}`, name: `file_${i}.pdf` }))
    );
    vi.spyOn(PersonalDriveService, 'listSchoolVaultFiles').mockResolvedValue(
      new Array(50).fill(null).map((_, i) => ({ id: `f_${i}`, name: `file_${i}.pdf` }))
    );
    vi.spyOn(PersonalDriveService, 'saveExtractedSchoolData').mockResolvedValue({
      classroomDownloaded: 50,
      emailDownloaded: 0,
      totalDownloaded: 50,
      totalSkipped: 0,
      totalFailed: 180,
      interrupted: true
    } as any);

    await expect(GasProvisionerService.runInitialSchoolDataSync(
      'Atharva',
      '2026-2027',
      'mock_student_token',
      'https://script.google.com/macros/s/test/exec',
      'script_123'
    )).rejects.toThrow(/Initial sync interrupted due to network loss or errors/);

    expect(mockStorage['step2_sync_status']).toBe('INTERRUPTED');
    expect(mockStorage['step2_initial_sync_complete']).toBe(false);
    expect(createdNotifications).toHaveLength(0);
  });
});

