import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GasProvisionerService, ActiveDeployProgress } from '../src/services/gasProvisioner';

describe('Deploy Progress Persistence & State Restoration', () => {
  let mockStorage: Record<string, any> = {};
  let sentMessages: any[] = [];

  beforeEach(() => {
    mockStorage = {};
    sentMessages = [];

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
      runtime: {
        sendMessage: vi.fn(async (msg: any) => {
          sentMessages.push(msg);
          return { success: true };
        })
      }
    };
  });

  it('should persist progress updates to chrome.storage.local and broadcast via runtime message', async () => {
    const recordedCallbackUpdates: any[] = [];
    GasProvisionerService.setProgressCallback((pct, phase, sub, stage, stagePct) => {
      recordedCallbackUpdates.push({ pct, phase, sub, stage, stagePct });
    });

    GasProvisionerService.reportProgress(45, 'Phase 3: Code Upload', 'Uploading modules...', 'script', 70);

    expect(recordedCallbackUpdates).toHaveLength(1);
    expect(recordedCallbackUpdates[0].pct).toBe(45);
    expect(recordedCallbackUpdates[0].stage).toBe('script');

    const storedProgress = mockStorage['active_deploy_progress'] as ActiveDeployProgress;
    expect(storedProgress).toBeDefined();
    expect(storedProgress.status).toBe('IN_PROGRESS');
    expect(storedProgress.percent).toBe(45);
    expect(storedProgress.phaseText).toBe('Phase 3: Code Upload');
    expect(storedProgress.subtext).toBe('Uploading modules...');
    expect(storedProgress.stage).toBe('script');
    expect(storedProgress.stagePercent).toBe(70);
    await new Promise(r => setTimeout(r, 10));

    // Verify broadcast runtime message
    const deployBroadcast = sentMessages.find(m => m.type === 'DEPLOY_PROGRESS_UPDATE');
    expect(deployBroadcast).toBeDefined();
    expect(deployBroadcast.payload.percent).toBe(45);
  });

  it('should retrieve active deploy progress via getActiveDeployProgress', async () => {
    const initialProgress: ActiveDeployProgress = {
      status: 'IN_PROGRESS',
      workerType: 'SCHOOL_WORKER',
      childName: 'Atharva',
      academicYear: '2026-2027',
      percent: 85,
      phaseText: 'Phase 5: Securing Gateway',
      subtext: 'Securing Student Worker as pure read-only gateway...',
      stage: 'data',
      stagePercent: 15,
      updatedAt: Date.now()
    };

    await GasProvisionerService.setActiveDeployProgress(initialProgress);

    const retrieved = await GasProvisionerService.getActiveDeployProgress();
    expect(retrieved).toEqual(initialProgress);
    expect(mockStorage['active_deploy_progress']).toEqual(initialProgress);
  });

  it('should mark status as COMPLETED when percent reaches 100%', async () => {
    GasProvisionerService.reportProgress(100, 'Step 2 Complete', '1-Time extraction complete', 'data', 100);

    const stored = mockStorage['active_deploy_progress'] as ActiveDeployProgress;
    expect(stored.status).toBe('COMPLETED');
    expect(stored.percent).toBe(100);
  });

  it('should clear active deploy progress when clearActiveDeployProgress is called', async () => {
    mockStorage['active_deploy_progress'] = {
      status: 'COMPLETED',
      workerType: 'SCHOOL_WORKER',
      percent: 100,
      phaseText: 'Done',
      subtext: 'Finished',
      updatedAt: Date.now()
    };

    await GasProvisionerService.clearActiveDeployProgress();
    expect(mockStorage['active_deploy_progress']).toBeUndefined();
    const retrieved = await GasProvisionerService.getActiveDeployProgress();
    expect(retrieved).toBeNull();
  });
});
