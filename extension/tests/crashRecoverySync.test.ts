import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkAndAutoResumeInitialSync } from '../src/background/serviceWorker';
import { GasProvisionerService } from '../src/services/gasProvisioner';
import { ChildManager } from '../src/services/childManager';
import { PersonalDriveService } from '../src/services/personalDriveService';

describe('Automatic Crash Recovery & 1-Time Sync Auto-Resumption', () => {
  let localStorageMock: Record<string, any> = {};
  let alarmsCreated: Record<string, any> = {};
  let alarmsCleared: string[] = [];

  beforeEach(() => {
    localStorageMock = {};
    alarmsCreated = {};
    alarmsCleared = [];
    GasProvisionerService.isInitialSyncRunning = false;

    (global as any).chrome = {
      runtime: {
        sendMessage: vi.fn().mockReturnValue(Promise.resolve()),
        getPlatformInfo: vi.fn().mockResolvedValue({ os: 'win', arch: 'x86-64' }),
        onStartup: { addListener: vi.fn() },
        onInstalled: { addListener: vi.fn() },
        onMessage: { addListener: vi.fn() }
      },
      alarms: {
        create: vi.fn((name, info) => {
          alarmsCreated[name] = info;
        }),
        clear: vi.fn(async (name) => {
          alarmsCleared.push(name);
          delete alarmsCreated[name];
        })
      },
      storage: {
        local: {
          get: vi.fn(async (keys) => {
            if (Array.isArray(keys)) {
              const res: Record<string, any> = {};
              keys.forEach((k) => { res[k] = localStorageMock[k]; });
              return res;
            }
            return localStorageMock;
          }),
          set: vi.fn(async (data) => {
            Object.assign(localStorageMock, data);
          }),
          remove: vi.fn(async (keys) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach((k) => delete localStorageMock[k]);
          })
        }
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not resume if initial sync is already marked complete', async () => {
    localStorageMock = {
      step2_initial_sync_complete: true,
      step2_initial_sync_in_progress: false
    };

    vi.spyOn(ChildManager, 'getActiveProfile').mockResolvedValue({
      id: 'child_1',
      name: 'Atharva',
      academicYear: '2026-2027',
      schoolGasDeploymentUrl: 'https://script.google.com/macros/s/test/exec'
    } as any);

    const runSyncSpy = vi.spyOn(GasProvisionerService, 'runInitialSchoolDataSync').mockResolvedValue({ success: true });

    const resumed = await checkAndAutoResumeInitialSync('test_trigger');
    expect(resumed).toBe(false);
    expect(runSyncSpy).not.toHaveBeenCalled();
  });

  it('detects orphaned stale in-progress lock from previous crashed session and auto-resumes', async () => {
    // Simulating Chrome crash mid-sync:
    // Storage has in_progress: true, but in-memory isInitialSyncRunning is false!
    localStorageMock = {
      step2_initial_sync_complete: false,
      step2_initial_sync_in_progress: true,
      step2_sync_heartbeat: Date.now() - 120000 // 2 minutes ago
    };

    vi.spyOn(ChildManager, 'getActiveProfile').mockResolvedValue({
      id: 'child_1',
      name: 'Atharva',
      academicYear: '2026-2027',
      schoolGasDeploymentUrl: 'https://script.google.com/macros/s/test/exec'
    } as any);

    const runSyncSpy = vi.spyOn(GasProvisionerService, 'runInitialSchoolDataSync').mockResolvedValue({ success: true });

    const resumed = await checkAndAutoResumeInitialSync('browser_startup');
    expect(resumed).toBe(true);
    expect(runSyncSpy).toHaveBeenCalledWith(
      'Atharva',
      '2026-2027',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { forceResume: true }
    );
  });

  it('does not attempt auto-resume if already running in memory', async () => {
    GasProvisionerService.isInitialSyncRunning = true;

    const runSyncSpy = vi.spyOn(GasProvisionerService, 'runInitialSchoolDataSync');
    const resumed = await checkAndAutoResumeInitialSync('popup_health_check');

    expect(resumed).toBe(false);
    expect(runSyncSpy).not.toHaveBeenCalled();
  });

  it('gasProvisioner allows runInitialSchoolDataSync when forceResume is true despite storage in_progress flag', async () => {
    localStorageMock = {
      step2_initial_sync_in_progress: true,
      step2_initial_sync_complete: false,
      step2_sync_heartbeat: Date.now()
    };

    vi.spyOn(ChildManager, 'getActiveProfile').mockResolvedValue({
      id: 'child_1',
      name: 'Atharva',
      academicYear: '2026-2027',
      schoolGasDeploymentUrl: 'https://script.google.com/macros/s/test/exec'
    } as any);

    vi.spyOn(PersonalDriveService, 'getValidToken').mockResolvedValue('mock_parent_token');
    vi.spyOn(PersonalDriveService, 'getOrCreateKidFolder').mockResolvedValue({ id: 'mock_kid_folder_id', webViewLink: '' });
    vi.spyOn(PersonalDriveService, 'getOrCreateClassroomFolder').mockResolvedValue({
      id: 'mock_class_folder_id',
      attachmentsFolderId: 'mock_attach_folder_id'
    } as any);
    vi.spyOn(PersonalDriveService, 'readJsonFileInFolder').mockResolvedValue(null);
    vi.spyOn(PersonalDriveService, 'saveExtractedSchoolData').mockResolvedValue(undefined as any);
    vi.spyOn(PersonalDriveService, 'callGasWorkerRpc').mockResolvedValue({
      classroom: {
        totalCourses: 1,
        courses: [{ id: 'course_1', name: 'Mathematics' }]
      },
      gmail: {
        totalEmails: 1,
        emails: [{ id: 'email_1', subject: 'Circular' }]
      },
      attachments: []
    } as any);

    vi.spyOn(PersonalDriveService, 'listFilesInFolder').mockResolvedValue([]);

    const mockData = {
      result: {
        classroom: {
          totalCourses: 1,
          courses: [{ id: 'course_1', name: 'Mathematics' }]
        },
        gmail: {
          totalEmails: 1,
          emails: [{ id: 'email_1', subject: 'Circular' }]
        },
        attachments: []
      }
    };
    (global as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify(mockData),
      json: async () => mockData
    });

    const result = await GasProvisionerService.runInitialSchoolDataSync(
      'Atharva',
      '2026-2027',
      'mock_token',
      'https://script.google.com/macros/s/test/exec',
      'mock_script_id',
      'student@school.org',
      'school.org',
      { forceResume: true }
    );

    expect(result).toBeDefined();
    expect(localStorageMock.step2_initial_sync_complete).toBe(true);
    expect(localStorageMock.step2_initial_sync_in_progress).toBe(false);
    expect(alarmsCleared).toContain('INITIAL_SCHOOL_SYNC_SUPERVISOR');
  });
});
