import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncLifecycleManager } from '../src/services/syncLifecycleManager';

describe('SyncLifecycleManager - Mutex & Lifecycle Concurrency Control', () => {
  let localStorageMock: Record<string, any> = {};

  beforeEach(async () => {
    localStorageMock = {};
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn(async (keys?: string | string[] | null) => {
            if (!keys) return { ...localStorageMock };
            if (typeof keys === 'string') return { [keys]: localStorageMock[keys] };
            if (Array.isArray(keys)) {
              const res: Record<string, any> = {};
              keys.forEach(k => { if (k in localStorageMock) res[k] = localStorageMock[k]; });
              return res;
            }
            return { ...localStorageMock };
          }),
          set: vi.fn(async (obj: Record<string, any>) => {
            Object.assign(localStorageMock, obj);
          })
        }
      }
    };
    await SyncLifecycleManager.forceReleaseAllLocks();
  });

  it('acquires sync singleton lock and rejects concurrent duplicate instances', async () => {
    localStorageMock.tracked_whatsapp_chats = [{ title: '3B Cambridge 2026 - 27' }];
    
    // First instance acquires lock
    const acquired1 = await SyncLifecycleManager.acquireSyncLock('3B Cambridge 2026 - 27');
    expect(acquired1).toBe(true);

    const status1 = await SyncLifecycleManager.getLockStatus();
    expect(status1.isSyncRunning).toBe(true);
    expect(status1.activeTargetGroup).toBe('3B Cambridge 2026 - 27');
    expect(status1.state).toBe('SYNCING');

    // Second concurrent instance attempts to run
    const canRun2 = await SyncLifecycleManager.canRunBackgroundSync(false);
    expect(canRun2.allowed).toBe(false);
    expect(canRun2.reason).toContain('Another sync instance is already running');

    // Second acquire attempt fails
    const acquired2 = await SyncLifecycleManager.acquireSyncLock('Grade 3B IG parent group');
    expect(acquired2).toBe(false);

    // First instance completes and releases lock
    await SyncLifecycleManager.releaseSyncLock();
    const status2 = await SyncLifecycleManager.getLockStatus();
    expect(status2.isSyncRunning).toBe(false);
    expect(status2.state).toBe('IDLE');

    // Now a new instance can acquire
    const acquired3 = await SyncLifecycleManager.acquireSyncLock('Grade 3B IG parent group');
    expect(acquired3).toBe(true);
    await SyncLifecycleManager.releaseSyncLock();
  });

  it('blocks background sync completely while export ingestion is active or queued', async () => {
    localStorageMock.tracked_whatsapp_chats = [{ title: '3B Cambridge 2026 - 27' }];

    // Enqueue 2 export files
    const count1 = await SyncLifecycleManager.acquireIngestionLock();
    expect(count1).toBe(1);
    const count2 = await SyncLifecycleManager.acquireIngestionLock();
    expect(count2).toBe(2);

    const status = await SyncLifecycleManager.getLockStatus();
    expect(status.isIngestionRunning).toBe(true);
    expect(status.inFlightIngestionsCount).toBe(2);
    expect(status.state).toBe('INGESTING');

    // Background sync tries to run -> blocked
    const canRun = await SyncLifecycleManager.canRunBackgroundSync(false);
    expect(canRun.allowed).toBe(false);
    expect(canRun.reason).toContain('Export ingestion is currently active');

    // Complete first file
    const remaining1 = await SyncLifecycleManager.releaseIngestionLock();
    expect(remaining1).toBe(1);

    // Background sync still blocked
    const canRunStill = await SyncLifecycleManager.canRunBackgroundSync(false);
    expect(canRunStill.allowed).toBe(false);

    // Complete second file
    const remaining2 = await SyncLifecycleManager.releaseIngestionLock();
    expect(remaining2).toBe(0);

    // Background sync now unblocked
    const canRunFinal = await SyncLifecycleManager.canRunBackgroundSync(false);
    expect(canRunFinal.allowed).toBe(true);
  });

  it('enforces Zero-Group Strict Guard when 0 groups are tracked', async () => {
    localStorageMock.tracked_whatsapp_chats = [];
    localStorageMock.target_whatsapp_chats = '';

    const canRun = await SyncLifecycleManager.canRunBackgroundSync(false);
    expect(canRun.allowed).toBe(false);
    expect(canRun.reason).toContain('Zero tracked groups configured');
  });

  it('supports mid-flight abort signals globally and for specific groups', async () => {
    localStorageMock.tracked_whatsapp_chats = [
      { title: 'Group A' },
      { title: 'Group B' }
    ];

    await SyncLifecycleManager.acquireSyncLock('Group A');

    // Request abort for Group A only
    await SyncLifecycleManager.requestAbort('Group A');
    expect(await SyncLifecycleManager.isAborted('Group A')).toBe(true);
    expect(await SyncLifecycleManager.isAborted('Group B')).toBe(false);

    // Request global abort
    await SyncLifecycleManager.requestAbort();
    expect(await SyncLifecycleManager.isAborted('Group B')).toBe(true);
    expect(await SyncLifecycleManager.isAborted()).toBe(true);

    await SyncLifecycleManager.releaseSyncLock();
  });

  it('recovers stale sync locks after timeout', async () => {
    localStorageMock.tracked_whatsapp_chats = [{ title: '3B Cambridge 2026 - 27' }];
    localStorageMock.sync_is_running = true;
    localStorageMock.sync_started_at = Date.now() - (10 * 60 * 1000); // 10 minutes ago (stale)

    const canRun = await SyncLifecycleManager.canRunBackgroundSync(false);
    expect(canRun.allowed).toBe(true); // Recovered stale lock and allowed new run
  });
});
