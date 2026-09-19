import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChildManager, ChildProfile } from '../src/services/childManager';
import { GasProvisionerService, SyncQueueItem } from '../src/services/gasProvisioner';
import { checkAndAutoResumeInitialSync, handleMessage } from '../src/background/serviceWorker';

describe('Multi-Child FIFO Background Sync Queue & Per-Child Progress Tracking', () => {
  let localStorageMock: Record<string, any> = {};
  let sentMessages: any[] = [];

  beforeEach(() => {
    localStorageMock = {};
    sentMessages = [];

    GasProvisionerService.isInitialSyncRunning = false;
    GasProvisionerService.activeSyncingChildId = null;
    GasProvisionerService.activeSyncingChildName = null;

    (global as any).chrome = {
      runtime: {
        sendMessage: vi.fn((msg) => {
          sentMessages.push(msg);
          return Promise.resolve();
        }),
        getPlatformInfo: vi.fn().mockResolvedValue({ os: 'win', arch: 'x86-64' }),
        onStartup: { addListener: vi.fn() },
        onInstalled: { addListener: vi.fn() },
        onMessage: { addListener: vi.fn() }
      },
      alarms: {
        create: vi.fn(),
        clear: vi.fn().mockResolvedValue(true)
      },
      storage: {
        local: {
          get: vi.fn(async (keys) => {
            if (Array.isArray(keys)) {
              const res: Record<string, any> = {};
              keys.forEach((k) => { res[k] = localStorageMock[k]; });
              return res;
            }
            if (typeof keys === 'string') {
              return { [keys]: localStorageMock[keys] };
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

  describe('ChildManager Sync Status & Queue Tracking', () => {
    it('updates per-child sync status and records completion timestamp', async () => {
      const mockProfiles: ChildProfile[] = [
        {
          id: 'child_atharva',
          name: 'Atharva',
          academicYear: '2026-2027',
          studentAccountEmail: 'atharva@school.edu',
          initialSyncStatus: 'IDLE'
        },
        {
          id: 'child_ananya',
          name: 'Ananya',
          academicYear: '2026-2027',
          studentAccountEmail: 'ananya@school.edu',
          initialSyncStatus: 'IDLE'
        }
      ];

      localStorageMock[ChildManager.STORAGE_KEY_PROFILES] = mockProfiles;
      localStorageMock[ChildManager.STORAGE_KEY_ACTIVE_ID] = 'child_atharva';

      // 1. Update Atharva to IN_PROGRESS
      await ChildManager.updateChildSyncStatus('child_atharva', 'IN_PROGRESS', { stage: 'CLASSROOM_METADATA' } as any);
      let profiles = await ChildManager.getProfiles(false);
      let atharva = profiles.find(p => p.id === 'child_atharva');
      expect(atharva?.initialSyncStatus).toBe('IN_PROGRESS');
      expect(atharva?.initialSyncProgress?.stage).toBe('CLASSROOM_METADATA');

      // 2. Update Ananya to QUEUED
      await ChildManager.updateChildSyncStatus('child_ananya', 'QUEUED');
      profiles = await ChildManager.getProfiles(false);
      let ananya = profiles.find(p => p.id === 'child_ananya');
      expect(ananya?.initialSyncStatus).toBe('QUEUED');

      // 3. Verify getQueuedChildProfiles returns only queued profiles
      const queued = await ChildManager.getQueuedChildProfiles();
      expect(queued.length).toBe(1);
      expect(queued[0].id).toBe('child_ananya');

      // 4. Mark Atharva as COMPLETED
      await ChildManager.updateChildSyncStatus('child_atharva', 'COMPLETED');
      profiles = await ChildManager.getProfiles(false);
      atharva = profiles.find(p => p.id === 'child_atharva');
      expect(atharva?.initialSyncStatus).toBe('COMPLETED');
      expect(atharva?.initialSyncCompletedAt).toBeDefined();
    });
  });

  describe('GasProvisionerService FIFO Queue Operations', () => {
    it('manages sync queue with enqueue, peek, dequeue, and remove', async () => {
      const mockProfiles: ChildProfile[] = [
        { id: 'child_1', name: 'Child One', academicYear: '2026-2027', initialSyncStatus: 'IDLE' },
        { id: 'child_2', name: 'Child Two', academicYear: '2026-2027', initialSyncStatus: 'IDLE' }
      ];
      localStorageMock[ChildManager.STORAGE_KEY_PROFILES] = mockProfiles;

      // 1. Initially queue is empty
      const initialQueue = await GasProvisionerService.getSyncQueue();
      expect(initialQueue).toEqual([]);

      // 2. Enqueue Child 1
      const item1: SyncQueueItem = {
        childId: 'child_1',
        childName: 'Child One',
        academicYear: '2026-2027'
      };
      const pos1 = await GasProvisionerService.enqueueSync(item1);
      expect(pos1).toBe(1);

      // Verify profile is updated to QUEUED
      let profiles = await ChildManager.getProfiles(false);
      expect(profiles.find(p => p.id === 'child_1')?.initialSyncStatus).toBe('QUEUED');

      // 3. Enqueue Child 2
      const item2: SyncQueueItem = {
        childId: 'child_2',
        childName: 'Child Two',
        academicYear: '2026-2027'
      };
      const pos2 = await GasProvisionerService.enqueueSync(item2);
      expect(pos2).toBe(2);

      // Verify peek returns the head of the queue (Child 1)
      const peeked = await GasProvisionerService.peekSyncQueue();
      expect(peeked?.childId).toBe('child_1');

      // 4. Dequeue Child 1
      const dequeued = await GasProvisionerService.dequeueSync();
      expect(dequeued?.childId).toBe('child_1');

      // Verify remaining queue has Child 2
      const remaining = await GasProvisionerService.getSyncQueue();
      expect(remaining.length).toBe(1);
      expect(remaining[0].childId).toBe('child_2');

      // 5. Remove Child 2 from queue
      const removed = await GasProvisionerService.removeSyncFromQueue('child_2');
      expect(removed).toBe(true);
      expect(await GasProvisionerService.getSyncQueue()).toEqual([]);
    });

    it('prevents duplicate queue entries for the same child', async () => {
      const item: SyncQueueItem = {
        childId: 'child_1',
        childName: 'Child One',
        academicYear: '2026-2027'
      };
      const pos1 = await GasProvisionerService.enqueueSync(item);
      expect(pos1).toBe(1);

      const pos2 = await GasProvisionerService.enqueueSync(item);
      expect(pos2).toBe(1); // Position unchanged because already queued

      const queue = await GasProvisionerService.getSyncQueue();
      expect(queue.length).toBe(1);
    });
  });

  describe('Sequential Execution & FIFO Queue Auto-Advancement', () => {
    it('enqueues Child 2 when Child 1 is actively syncing and returns queued state', async () => {
      const mockProfiles: ChildProfile[] = [
        {
          id: 'child_1',
          name: 'Atharva',
          academicYear: '2026-2027',
          studentAccountEmail: 'atharva@school.edu',
          schoolGasDeploymentUrl: 'https://gas.script/atharva',
          schoolGasScriptId: 'script_atharva',
          initialSyncStatus: 'IDLE'
        },
        {
          id: 'child_2',
          name: 'Ananya',
          academicYear: '2026-2027',
          studentAccountEmail: 'ananya@school.edu',
          schoolGasDeploymentUrl: 'https://gas.script/ananya',
          schoolGasScriptId: 'script_ananya',
          initialSyncStatus: 'IDLE'
        }
      ];
      localStorageMock[ChildManager.STORAGE_KEY_PROFILES] = mockProfiles;
      localStorageMock[ChildManager.STORAGE_KEY_ACTIVE_ID] = 'child_1';

      // Mock runInitialSchoolDataSync state:
      // When runInitialSchoolDataSync executes for child_1, simulate active execution
      GasProvisionerService.isInitialSyncRunning = true;
      GasProvisionerService.activeSyncingChildId = 'child_1';
      GasProvisionerService.activeSyncingChildName = 'Atharva';

      // Now user triggers sync for child_2 (Ananya) while Atharva is syncing
      const resultChild2 = await GasProvisionerService.runInitialSchoolDataSync(
        'Ananya',
        '2026-2027',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { childId: 'child_2' }
      );

      // Verify Child 2 was queued rather than running concurrently
      expect(resultChild2.queued).toBe(true);
      expect(resultChild2.childName).toBe('Ananya');
      expect(resultChild2.position).toBe(1);

      // Verify queue state in storage
      const queue = await GasProvisionerService.getSyncQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].childId).toBe('child_2');

      // Verify Child 2's profile shows QUEUED
      const profiles = await ChildManager.getProfiles(false);
      expect(profiles.find(p => p.id === 'child_2')?.initialSyncStatus).toBe('QUEUED');
    });
  });

  describe('Service Worker Status & Crash Recovery', () => {
    it('responds to GET_SYNC_QUEUE_STATUS message with active child and queued children', async () => {
      GasProvisionerService.activeSyncingChildId = 'child_1';
      GasProvisionerService.activeSyncingChildName = 'Atharva';
      localStorageMock['multi_child_sync_queue'] = [
        { childId: 'child_2', childName: 'Ananya', academicYear: '2026-2027', enqueuedAt: Date.now() }
      ];

      const response = await handleMessage({ type: 'GET_SYNC_QUEUE_STATUS' });
      expect(response.activeChildId).toBe('child_1');
      expect(response.activeChildName).toBe('Atharva');
      expect(response.isRunning).toBe(false);
      expect(response.queue.length).toBe(1);
      expect(response.queue[0].childName).toBe('Ananya');
    });

    it('auto-resumes queued child when active sync is complete or absent', async () => {
      const mockProfiles: ChildProfile[] = [
        {
          id: 'child_1',
          name: 'Atharva',
          academicYear: '2026-2027',
          initialSyncStatus: 'COMPLETED'
        },
        {
          id: 'child_2',
          name: 'Ananya',
          academicYear: '2026-2027',
          initialSyncStatus: 'QUEUED'
        }
      ];
      localStorageMock[ChildManager.STORAGE_KEY_PROFILES] = mockProfiles;
      localStorageMock['step2_initial_sync_complete'] = true;
      localStorageMock['step2_initial_sync_in_progress'] = false;
      localStorageMock['multi_child_sync_queue'] = [
        { childId: 'child_2', childName: 'Ananya', academicYear: '2026-2027', enqueuedAt: Date.now() }
      ];

      const runSyncSpy = vi.spyOn(GasProvisionerService, 'runInitialSchoolDataSync').mockResolvedValue({ success: true });

      await checkAndAutoResumeInitialSync('test_supervisor');

      // Verify that Child 2 is launched
      expect(runSyncSpy).toHaveBeenCalledWith(
        'Ananya',
        '2026-2027',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { childId: 'child_2' }
      );
    });
  });
});
