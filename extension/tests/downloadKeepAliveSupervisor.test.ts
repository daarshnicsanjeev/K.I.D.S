import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PersonalDriveService } from '../src/services/personalDriveService';

describe('Download Keep-Alive & Supervisor Engine', () => {
  let createdAlarms: Record<string, any> = {};
  let clearedAlarms: string[] = [];
  let localStorageMock: Record<string, any> = {};
  let originalSetInterval: typeof setInterval;
  let originalClearInterval: typeof clearInterval;
  let intervalsStarted: any[] = [];
  let intervalsCleared: any[] = [];

  beforeEach(() => {
    createdAlarms = {};
    clearedAlarms = [];
    localStorageMock = {};
    intervalsStarted = [];
    intervalsCleared = [];

    originalSetInterval = global.setInterval;
    originalClearInterval = global.clearInterval;

    global.setInterval = vi.fn((fn, ms) => {
      const id = { fn, ms, id: Math.random() };
      intervalsStarted.push(id);
      return id as any;
    }) as any;

    global.clearInterval = vi.fn((id) => {
      intervalsCleared.push(id);
    }) as any;

    (global as any).chrome = {
      runtime: {
        sendMessage: undefined,
        getPlatformInfo: vi.fn().mockResolvedValue({ os: 'win', arch: 'x86-64' })
      },
      alarms: {
        create: vi.fn((name, info) => {
          createdAlarms[name] = info;
        }),
        clear: vi.fn((name) => {
          clearedAlarms.push(name);
          delete createdAlarms[name];
        })
      },
      storage: {
        local: {
          get: vi.fn(async (keys) => {
            if (Array.isArray(keys)) {
              const res: Record<string, any> = {};
              keys.forEach(k => { res[k] = localStorageMock[k]; });
              return res;
            }
            return localStorageMock;
          }),
          set: vi.fn(async (data) => {
            Object.assign(localStorageMock, data);
          }),
          remove: vi.fn(async (keys) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach(k => delete localStorageMock[k]);
          })
        }
      }
    };
  });

  afterEach(() => {
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    vi.restoreAllMocks();
  });

  it('registers KEEP_ALIVE_DOWNLOAD_SUPERVISOR and starts heartbeat on sync, and cleans up on completion', async () => {
    // Mock getValidToken and getOrCreateClassroomFolder
    vi.spyOn(PersonalDriveService, 'getValidToken').mockResolvedValue('test-parent-token');
    vi.spyOn(PersonalDriveService, 'resolveChildName').mockResolvedValue('Atharva');
    vi.spyOn(PersonalDriveService, 'getOrCreateClassroomFolder').mockResolvedValue({
      id: 'mock-classroom-folder',
      attachmentsFolderId: 'mock-attachments-folder'
    });
    vi.spyOn(PersonalDriveService, 'readJsonFileInFolder').mockResolvedValue({
      courses: []
    });

    const result = await PersonalDriveService.syncClassroomAttachments('parent-tok', 'student-tok', 'Atharva', '2026-2027');

    // 1. Check supervisor alarm was created with 1-minute period
    expect(chrome.alarms.create).toHaveBeenCalledWith('KEEP_ALIVE_DOWNLOAD_SUPERVISOR', { periodInMinutes: 1 });

    // 2. Check 15-second heartbeat interval was started
    expect(intervalsStarted.length).toBeGreaterThanOrEqual(1);
    expect(intervalsStarted[0].ms).toBe(15000);

    // 3. Check supervisor alarm was cleared in finally
    expect(chrome.alarms.clear).toHaveBeenCalledWith('KEEP_ALIVE_DOWNLOAD_SUPERVISOR');

    // 4. Check heartbeat interval was cleared in finally
    expect(intervalsCleared.length).toBeGreaterThanOrEqual(1);

    // 5. Check progress state was set to false
    expect(localStorageMock.classroom_attachment_sync_in_progress).toBe(false);
  });
});
