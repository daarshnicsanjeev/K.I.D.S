import { describe, it, expect, vi } from 'vitest';
import * as vm from 'vm';
import * as fs from 'fs';
import * as path from 'path';
import { GasProvisionerService } from '../src/services/gasProvisioner';

describe('Trigger Lifecycle & Fast-Exit Guard Engine', () => {
  async function loadDeployedGasFiles(): Promise<Record<string, string>> {
    const originalFetch = globalThis.fetch;
    const filesMap: Record<string, string> = {};

    globalThis.fetch = vi.fn(async (url: any, opts: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('/content')) {
        const parsed = JSON.parse(opts.body);
        for (const file of parsed.files) {
          filesMap[file.name] = file.source;
        }
        return { ok: true, status: 200, json: async () => ({}) } as any;
      }
      return { ok: true, status: 200, json: async () => ({}) } as any;
    });

    try {
      await GasProvisionerService.updateProjectContent(
        'test_script_id',
        'test_access_key',
        'test_token',
        'Atharva',
        '2026-2027'
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
    return filesMap;
  }

  it('guarantees fast-exit guards exist in deployed Code.gs and gas-mcp-server/src/Code.gs', async () => {
    const files = await loadDeployedGasFiles();
    const deployedCode = files['Code'];
    const repoCodePath = path.resolve(__dirname, '../../gas-mcp-server/src/Code.gs');
    const repoCode = fs.readFileSync(repoCodePath, 'utf-8');

    for (const code of [deployedCode, repoCode]) {
      // 1. Check initial_sync_complete fast exit in runIncrementalSchoolSync
      expect(code).toContain("props.getProperty('initial_sync_complete') !== 'true'");
      expect(code).toContain("reason: 'awaiting_1time_sync_completion'");

      // 2. Check dual-worker passive mode trigger cleanup & exit
      expect(code).toContain("props.getProperty('is_dual_worker') === 'true'");
      expect(code).toContain("reason: 'managed_by_master_worker'");

      // 3. Check strict initialSyncComplete in runMasterCloudSchoolSync
      expect(code).toContain('if (ch.initialSyncComplete !== true)');

      // 4. Check quiet hours fast-exit
      expect(code).toContain("status: 'quiet_hours_ist_11pm_to_6am'");

      // 5. Check handleSetSyncState
      expect(code).toContain('function handleSetSyncState');
      expect(code).toContain('method === "set_sync_state"');
    }
  });

  it('verifies runIncrementalSchoolSync fast-exits in <5ms when initial sync is incomplete', () => {
    const repoCodePath = path.resolve(__dirname, '../../gas-mcp-server/src/Code.gs');
    const code = fs.readFileSync(repoCodePath, 'utf-8');

    const scriptProps: Record<string, string> = {
      target_folder_id: 'folder_123',
      initial_sync_complete: 'false'
    };

    let classroomSyncCalled = false;

    const sandbox = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (key: string) => scriptProps[key] || null,
          setProperty: (key: string, val: string) => { scriptProps[key] = val; },
          setProperties: (props: Record<string, string>) => { Object.assign(scriptProps, props); }
        })
      },
      LockService: {
        getScriptLock: () => ({
          tryLock: () => true,
          releaseLock: () => {}
        })
      },
      ClassroomIngester: {
        sync: () => { classroomSyncCalled = true; }
      },
      GmailIngester: {
        sync: () => {}
      },
      DigestBuilder: {
        build: () => {}
      },
      McpLogger: {
        log: () => {}
      },
      ScriptApp: {
        getProjectTriggers: () => []
      },
      CONFIG: {
        childName: 'Atharva',
        academicYear: '2026-2027'
      }
    };

    const ctx = vm.createContext(sandbox);
    vm.runInContext(code + '\ntestResult = runIncrementalSchoolSync();', ctx);

    const result = (sandbox as any).testResult;
    expect(result).toEqual({ skipped: true, reason: 'awaiting_1time_sync_completion' });
    expect(classroomSyncCalled).toBe(false);
  });

  it('verifies runIncrementalSchoolSync self-cleans trigger and exits when is_dual_worker is active', () => {
    const repoCodePath = path.resolve(__dirname, '../../gas-mcp-server/src/Code.gs');
    const code = fs.readFileSync(repoCodePath, 'utf-8');

    const scriptProps: Record<string, string> = {
      target_folder_id: 'folder_123',
      initial_sync_complete: 'true',
      is_dual_worker: 'true'
    };

    let deletedTriggerName = '';
    const mockTriggers = [
      { getHandlerFunction: () => 'runIncrementalSchoolSync' }
    ];

    const sandbox = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (key: string) => scriptProps[key] || null,
          setProperty: (key: string, val: string) => { scriptProps[key] = val; },
          setProperties: (props: Record<string, string>) => { Object.assign(scriptProps, props); }
        })
      },
      LockService: {
        getScriptLock: () => ({
          tryLock: () => true,
          releaseLock: () => {}
        })
      },
      ClassroomIngester: {
        sync: () => {}
      },
      GmailIngester: {
        sync: () => {}
      },
      DigestBuilder: {
        build: () => {}
      },
      McpLogger: {
        log: () => {}
      },
      ScriptApp: {
        getProjectTriggers: () => mockTriggers,
        deleteTrigger: (trig: any) => { deletedTriggerName = trig.getHandlerFunction(); }
      },
      CONFIG: {
        childName: 'Atharva',
        academicYear: '2026-2027'
      }
    };

    const ctx = vm.createContext(sandbox);
    vm.runInContext(code + '\ntestResult = runIncrementalSchoolSync();', ctx);

    const result = (sandbox as any).testResult;
    expect(result).toEqual({ skipped: true, reason: 'managed_by_master_worker' });
    expect(deletedTriggerName).toBe('runIncrementalSchoolSync');
  });

  it('verifies handleSetSyncState updates properties and cleans up school triggers', () => {
    const repoCodePath = path.resolve(__dirname, '../../gas-mcp-server/src/Code.gs');
    const code = fs.readFileSync(repoCodePath, 'utf-8');

    const scriptProps: Record<string, string> = {};
    let deletedTriggerName = '';
    const mockTriggers = [
      { getHandlerFunction: () => 'runIncrementalSchoolSync' }
    ];

    const sandbox = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (key: string) => scriptProps[key] || null,
          setProperty: (key: string, val: string) => { scriptProps[key] = val; },
          setProperties: (props: Record<string, string>) => { Object.assign(scriptProps, props); }
        })
      },
      ScriptApp: {
        getProjectTriggers: () => mockTriggers,
        deleteTrigger: (trig: any) => { deletedTriggerName = trig.getHandlerFunction(); }
      }
    };

    const ctx = vm.createContext(sandbox);
    vm.runInContext(
      code + '\ntestResult = handleSetSyncState({ initialSyncComplete: true, isDualWorker: true });',
      ctx
    );

    const result = (sandbox as any).testResult;
    expect(result.success).toBe(true);
    expect(scriptProps.initial_sync_complete).toBe('true');
    expect(scriptProps.is_dual_worker).toBe('true');
    expect(deletedTriggerName).toBe('runIncrementalSchoolSync');
  });

  it('verifies setupAutonomousTriggers skips creating runIncrementalSchoolSync in dual-worker mode', () => {
    const repoCodePath = path.resolve(__dirname, '../../gas-mcp-server/src/Code.gs');
    const code = fs.readFileSync(repoCodePath, 'utf-8');

    const scriptProps: Record<string, string> = {
      is_dual_worker: 'true'
    };

    let newTriggerCreated = false;

    const sandbox = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (key: string) => scriptProps[key] || null,
          setProperty: (key: string, val: string) => { scriptProps[key] = val; }
        })
      },
      ScriptApp: {
        getProjectTriggers: () => [],
        deleteTrigger: () => {},
        newTrigger: () => {
          newTriggerCreated = true;
          return {
            timeBased: () => ({
              everyMinutes: () => ({ create: () => {} })
            })
          };
        }
      },
      McpLogger: {
        log: () => {}
      }
    };

    const ctx = vm.createContext(sandbox);
    vm.runInContext(code + '\ntestResult = setupAutonomousTriggers("school");', ctx);

    const result = (sandbox as any).testResult;
    expect(result.success).toBe(true);
    expect(newTriggerCreated).toBe(false);
    expect(result.installed[0]).toContain('managed by Master Cloud Worker');
  });

  it('verifies Master Cloud trigger defaults to 1-minute cadence for real-time emergency alerting', () => {
    const repoCodePath = path.resolve(__dirname, '../../gas-mcp-server/src/Code.gs');
    const code = fs.readFileSync(repoCodePath, 'utf-8');

    let minutesSet: number | null = null;
    let hoursSet: number | null = null;

    const sandbox = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (key: string) => {
            if (key === 'multi_child_school_registry') {
              return JSON.stringify({ children: [{ kidName: 'Atharva', initialSyncComplete: true }] });
            }
            return null;
          },
          setProperty: () => {}
        })
      },
      ScriptApp: {
        getProjectTriggers: () => [],
        deleteTrigger: () => {},
        newTrigger: () => ({
          timeBased: () => ({
            everyMinutes: (m: number) => {
              minutesSet = m;
              return { create: () => {} };
            },
            everyHours: (h: number) => {
              hoursSet = h;
              return { create: () => {} };
            }
          })
        })
      },
      McpLogger: {
        log: () => {}
      }
    };

    const ctx = vm.createContext(sandbox);
    vm.runInContext(code + '\ntestResult = setupMasterCloudSyncTrigger();', ctx);

    const result = (sandbox as any).testResult;
    expect(result.success).toBe(true);
    expect(result.cadence).toBe('everyMinutes(1)');
    expect(minutesSet).toBe(1);

    // Test autonomous setup for Master when child has completed 1-time sync
    vm.runInContext('testAutoResult = setupAutonomousTriggers("master");', ctx);
    const autoResult = (sandbox as any).testAutoResult;
    expect(autoResult.success).toBe(true);
    expect(autoResult.installed).toContain('runMasterCloudSchoolSync (1m)');
  });

  it('verifies handleRegisterSchoolWorker defers trigger creation until initialSyncComplete is true', () => {
    const repoCodePath = path.resolve(__dirname, '../../gas-mcp-server/src/Code.gs');
    const code = fs.readFileSync(repoCodePath, 'utf-8');

    let triggerCreated = false;
    let propsStore: Record<string, string> = {};

    const sandbox = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (key: string) => propsStore[key] || null,
          setProperty: (key: string, val: string) => { propsStore[key] = val; }
        })
      },
      ScriptApp: {
        getProjectTriggers: () => [],
        deleteTrigger: () => {},
        newTrigger: () => ({
          timeBased: () => ({
            everyMinutes: () => {
              triggerCreated = true;
              return { create: () => {} };
            }
          })
        })
      },
      McpLogger: { log: () => {} }
    };

    const ctx = vm.createContext(sandbox);

    // 1. Initial Step 2 registration: initialSyncComplete is false -> trigger DEFERRED
    vm.runInContext(code + '\nstep2Res = handleRegisterSchoolWorker({ childName: "Atharva", initialSyncComplete: false });', ctx);
    const step2Result = (sandbox as any).step2Res;
    expect(step2Result.registered).toBe(true);
    expect(step2Result.initialSyncComplete).toBe(false);
    expect(step2Result.triggerResult.deferred).toBe(true);
    expect(step2Result.triggerResult.reason).toBe('awaiting_1time_sync_completion');
    expect(triggerCreated).toBe(false);

    // 2. Initial sync completion re-registration: initialSyncComplete is true -> trigger CREATED (1m)
    vm.runInContext('syncCompleteRes = handleRegisterSchoolWorker({ childName: "Atharva", initialSyncComplete: true });', ctx);
    const syncCompleteResult = (sandbox as any).syncCompleteRes;
    expect(syncCompleteResult.registered).toBe(true);
    expect(syncCompleteResult.initialSyncComplete).toBe(true);
    expect(syncCompleteResult.triggerResult.success).toBe(true);
    expect(syncCompleteResult.triggerResult.cadence).toBe('everyMinutes(1)');
    expect(triggerCreated).toBe(true);
  });

  it('verifies runMasterCloudSchoolSync fast-exits BEFORE lock when initialSyncComplete is false', () => {
    const repoCodePath = path.resolve(__dirname, '../../gas-mcp-server/src/Code.gs');
    const code = fs.readFileSync(repoCodePath, 'utf-8');

    let lockAttempted = false;
    const propsStore: Record<string, string> = {
      multi_child_school_registry: JSON.stringify({
        children: [{
          kidName: 'Atharva',
          schoolWorkerUrl: 'https://script.google.com/macros/s/xyz/exec',
          targetFolderId: 'target_123',
          initialSyncComplete: false
        }]
      })
    };

    const sandbox = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (key: string) => propsStore[key] || null
        })
      },
      LockService: {
        getScriptLock: () => {
          lockAttempted = true;
          return {
            tryLock: () => true,
            releaseLock: () => {}
          };
        }
      },
      UrlFetchApp: {
        fetch: () => { throw new Error('UrlFetchApp should NOT be called!'); }
      },
      DriveApp: {
        getFolderById: () => { throw new Error('DriveApp should NOT be called!'); }
      },
      McpLogger: { log: () => {} }
    };

    const ctx = vm.createContext(sandbox);
    vm.runInContext(code + '\nfastExitRes = runMasterCloudSchoolSync();', ctx);

    const fastExitResult = (sandbox as any).fastExitRes;
    expect(fastExitResult.status).toBe('awaiting_1time_sync_completion');
    expect(fastExitResult.skipped).toBe(true);
    // Lock was never even touched! Zero contention!
    expect(lockAttempted).toBe(false);
  });

  it('verifies setupAutonomousTriggers("master") defers trigger if no child has completed 1-time sync', () => {
    const repoCodePath = path.resolve(__dirname, '../../gas-mcp-server/src/Code.gs');
    const code = fs.readFileSync(repoCodePath, 'utf-8');

    let newTriggerCreated = false;

    const sandbox = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (key: string) => {
            if (key === 'multi_child_school_registry') {
              return JSON.stringify({
                children: [{ kidName: 'Atharva', initialSyncComplete: false }]
              });
            }
            return null;
          }
        })
      },
      ScriptApp: {
        getProjectTriggers: () => [],
        deleteTrigger: () => {},
        newTrigger: (fnName: string) => ({
          timeBased: () => ({
            everyMinutes: () => {
              if (fnName === 'runMasterCloudSchoolSync') newTriggerCreated = true;
              return { create: () => {} };
            },
            everyHours: () => ({ create: () => {} })
          })
        })
      },
      McpLogger: { log: () => {} }
    };

    const ctx = vm.createContext(sandbox);
    vm.runInContext(code + '\nmasterAutoRes = setupAutonomousTriggers("master");', ctx);

    const res = (sandbox as any).masterAutoRes;
    expect(res.success).toBe(true);
    expect(newTriggerCreated).toBe(false);
    expect(res.installed).toContain('runMasterCloudSchoolSync (deferred until 1-time sync completes)');
    expect(res.installed).toContain('runIncrementalPortalSync (6h)');
  });

  it('verifies mergeClassroomData preserves historical assignments while prepending real-time emergency notices', () => {
    const repoCodePath = path.resolve(__dirname, '../../gas-mcp-server/src/Code.gs');
    const code = fs.readFileSync(repoCodePath, 'utf-8');

    const existingClassroom = {
      kidName: 'Atharva',
      academicYear: '2026-2027',
      totalCourses: 1,
      courses: [
        {
          id: 'course_101',
          name: 'Grade 3B Math',
          announcements: [
            { id: 'ann_old', text: 'Old announcement from last month' }
          ],
          courseWork: [
            { id: 'cw_1', title: 'Worksheet 1' },
            { id: 'cw_2', title: 'Worksheet 2' }
          ],
          materials: []
        }
      ]
    };

    const incomingEmergencyDelta = {
      kidName: 'Atharva',
      academicYear: '2026-2027',
      totalCourses: 1,
      courses: [
        {
          id: 'course_101',
          name: 'Grade 3B Math',
          announcements: [
            { id: 'ann_emergency', text: '🚨 URGENT EMERGENCY: School closed early today due to heavy rains!' }
          ],
          courseWork: [],
          materials: []
        }
      ]
    };

    const sandbox = {
      existingClassroom,
      incomingEmergencyDelta
    };

    const ctx = vm.createContext(sandbox);
    vm.runInContext(code + '\nmergedResult = mergeClassroomData(existingClassroom, incomingEmergencyDelta);', ctx);

    const merged = (sandbox as any).mergedResult;
    expect(merged.courses).toHaveLength(1);
    const course = merged.courses[0];

    // Verify announcements: emergency alert is at the front, old announcement is preserved!
    expect(course.announcements).toHaveLength(2);
    expect(course.announcements[0].id).toBe('ann_emergency');
    expect(course.announcements[0].text).toContain('URGENT EMERGENCY');
    expect(course.announcements[1].id).toBe('ann_old');

    // Verify historical coursework: 100% preserved even though incoming delta had 0 coursework!
    expect(course.courseWork).toHaveLength(2);
    expect(course.courseWork[0].id).toBe('cw_1');
    expect(course.courseWork[1].id).toBe('cw_2');
  });

  it('verifies runMasterCloudSchoolSync directly deletes 1-minute trigger when quiet hours start', () => {
    const repoCodePath = path.resolve(__dirname, '../../gas-mcp-server/src/Code.gs');
    const code = fs.readFileSync(repoCodePath, 'utf-8');

    // 18:00 UTC = 23:30 IST (11:30 PM IST)
    const nightTimeMs = new Date('2026-09-08T18:00:00.000Z').getTime();

    let deletedTriggerName = '';
    const mockTriggers = [
      { getHandlerFunction: () => 'runMasterCloudSchoolSync' },
      { getHandlerFunction: () => 'runIncrementalPortalSync' }
    ];

    const sandbox = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (k: string) => null
        })
      },
      LockService: {
        getScriptLock: () => { throw new Error('Lock should NOT be called during quiet hours'); }
      },
      ScriptApp: {
        getProjectTriggers: () => mockTriggers,
        deleteTrigger: (trig: any) => { deletedTriggerName = trig.getHandlerFunction(); }
      },
      McpLogger: { log: () => {} },
      Date: class MockDate extends Date {
        constructor(...args: any[]) {
          if (args.length > 0) super(args[0], ...args.slice(1));
          else super(nightTimeMs);
        }
      }
    };

    const ctx = vm.createContext(sandbox);
    vm.runInContext(code + '\nquietResult = runMasterCloudSchoolSync();', ctx);

    const res = (sandbox as any).quietResult;
    expect(res.skipped).toBe(true);
    expect(res.status).toBe('quiet_hours_ist_11pm_to_6am');
    // Verify 1-minute trigger was DIRECTLY DELETED from ScriptApp!
    expect(deletedTriggerName).toBe('runMasterCloudSchoolSync');
  });

  it('verifies pauseNightlySyncTriggers deletes 1-minute triggers and resumeMorningSyncTriggers restores them at 6 AM', () => {
    const repoCodePath = path.resolve(__dirname, '../../gas-mcp-server/src/Code.gs');
    const code = fs.readFileSync(repoCodePath, 'utf-8');

    const deleted: string[] = [];
    let createdTriggerName = '';

    const triggers = [
      { getHandlerFunction: () => 'runMasterCloudSchoolSync' }
    ];

    const sandbox = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (k: string) => {
            if (k === 'multi_child_school_registry') {
              return JSON.stringify({ children: [{ kidName: 'Atharva', initialSyncComplete: true }] });
            }
            return null;
          }
        })
      },
      ScriptApp: {
        getProjectTriggers: () => triggers,
        deleteTrigger: (trig: any) => { deleted.push(trig.getHandlerFunction()); },
        newTrigger: (name: string) => ({
          timeBased: () => ({
            everyMinutes: (m: number) => {
              createdTriggerName = `${name} (${m}m)`;
              return { create: () => {} };
            }
          })
        })
      },
      McpLogger: { log: () => {} }
    };

    const ctx = vm.createContext(sandbox);

    // 1. Test 11 PM Pause: directly deletes 1-minute trigger
    vm.runInContext(code + '\npauseResult = pauseNightlySyncTriggers();', ctx);
    const pauseRes = (sandbox as any).pauseResult;
    expect(pauseRes.paused).toBe(true);
    expect(pauseRes.deletedTriggers).toBe(1);
    expect(deleted).toContain('runMasterCloudSchoolSync');

    // 2. Test 6 AM Resume: directly restores 1-minute trigger
    vm.runInContext('resumeResult = resumeMorningSyncTriggers();', ctx);
    const resumeRes = (sandbox as any).resumeResult;
    expect(resumeRes.resumed).toBe(true);
    expect(createdTriggerName).toBe('runMasterCloudSchoolSync (1m)');
  });

  it('verifies runMasterCloudSchoolSync runs during active daytime (10 AM IST) or when forced', () => {
    const repoCodePath = path.resolve(__dirname, '../../gas-mcp-server/src/Code.gs');
    const code = fs.readFileSync(repoCodePath, 'utf-8');

    // 04:30 UTC = 10:00 AM IST
    const dayTimeMs = new Date('2026-09-08T04:30:00.000Z').getTime();
    // 18:00 UTC = 23:30 IST (Night)
    const nightTimeMs = new Date('2026-09-08T18:00:00.000Z').getTime();

    // 1. Daytime run -> should NOT exit on quiet hours, but proceed to check registry
    const daySandbox = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (k: string) => null // no registry -> status: awaiting_step2_registration
        })
      },
      Date: class MockDate extends Date {
        constructor(...args: any[]) {
          if (args.length > 0) super(args[0], ...args.slice(1));
          else super(dayTimeMs);
        }
      }
    };
    const dayCtx = vm.createContext(daySandbox);
    vm.runInContext(code + '\ndayResult = runMasterCloudSchoolSync();', dayCtx);
    const dayRes = (daySandbox as any).dayResult;
    expect(dayRes.status).toBe('awaiting_step2_registration');

    // 2. Nighttime run with forceRun=true -> bypasses quiet hours
    const forceSandbox = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (k: string) => null
        })
      },
      Date: class MockDate extends Date {
        constructor(...args: any[]) {
          if (args.length > 0) super(args[0], ...args.slice(1));
          else super(nightTimeMs);
        }
      }
    };
    const forceCtx = vm.createContext(forceSandbox);
    vm.runInContext(code + '\nforceResult = runMasterCloudSchoolSync(true);', forceCtx);
    const forceRes = (forceSandbox as any).forceResult;
    expect(forceRes.status).toBe('awaiting_step2_registration');
  });

  it('verifies runIncrementalSchoolSync fast-exits during quiet hours (11 PM to 6 AM IST)', () => {
    const repoCodePath = path.resolve(__dirname, '../../gas-mcp-server/src/Code.gs');
    const code = fs.readFileSync(repoCodePath, 'utf-8');

    // 20:00 UTC = 01:30 AM IST (Night)
    const midnightTimeMs = new Date('2026-09-08T20:00:00.000Z').getTime();

    let deletedTrigger = false;
    const sandbox = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (k: string) => null
        })
      },
      ScriptApp: {
        getProjectTriggers: () => [{ getHandlerFunction: () => 'runIncrementalSchoolSync' }],
        deleteTrigger: () => { deletedTrigger = true; }
      },
      McpLogger: { log: () => {} },
      Date: class MockDate extends Date {
        constructor(...args: any[]) {
          if (args.length > 0) super(args[0], ...args.slice(1));
          else super(midnightTimeMs);
        }
      }
    };

    const ctx = vm.createContext(sandbox);
    vm.runInContext(code + '\nincQuietRes = runIncrementalSchoolSync();', ctx);

    const res = (sandbox as any).incQuietRes;
    expect(res.skipped).toBe(true);
    expect(res.status).toBe('quiet_hours_ist_11pm_to_6am');
    expect(deletedTrigger).toBe(true);
  });

  it('verifies runMasterCloudSchoolSync uses 1-query batch cache instead of N individual getFilesByName lookups', () => {
    const repoCodePath = path.resolve(__dirname, '../../gas-mcp-server/src/Code.gs');
    const code = fs.readFileSync(repoCodePath, 'utf-8');

    // Daytime: 10:00 AM IST
    const dayTimeMs = new Date('2026-09-08T04:30:00.000Z').getTime();

    let attachFolderGetFilesCalled = 0;
    let emailAttachFolderGetFilesCalled = 0;
    let attachFolderGetFilesByNameCalled = 0;
    let emailAttachFolderGetFilesByNameCalled = 0;
    let urlFetchBlobCalls = 0;
    let setContentCalls = 0;

    // Create 50 course items and 30 email attachments
    const announcements = [];
    for (let i = 0; i < 50; i++) {
      announcements.push({
        id: 'ann_' + i,
        attachments: [{ fileId: 'file_' + i, title: 'Attachment_' + i + '.pdf' }]
      });
    }

    const emails = [];
    for (let j = 0; j < 30; j++) {
      emails.push({
        id: 'msg_' + j,
        subject: 'Notice ' + j,
        attachments: [{ name: 'Circular_' + j + '.pdf', cleanName: 'Circular_' + j + '.pdf' }]
      });
    }

    // Mock Drive folder with files existing
    const mockClassFiles = announcements.map(a => ({
      getName: () => 'Math_' + a.attachments[0].title
    }));

    const mockEmailFiles = emails.map(e => ({
      getName: () => e.attachments[0].cleanName
    }));

    function makeIterator(arr: any[]) {
      let idx = 0;
      return {
        hasNext: () => idx < arr.length,
        next: () => arr[idx++]
      };
    }

    const attachFolder = {
      getFiles: () => {
        attachFolderGetFilesCalled++;
        return makeIterator(mockClassFiles);
      },
      getFilesByName: (name: string) => {
        attachFolderGetFilesByNameCalled++;
        return makeIterator([]);
      },
      createFile: () => {}
    };

    const emailAttachFolder = {
      getFiles: () => {
        emailAttachFolderGetFilesCalled++;
        return makeIterator(mockEmailFiles);
      },
      getFilesByName: (name: string) => {
        emailAttachFolderGetFilesByNameCalled++;
        return makeIterator([]);
      },
      createFile: () => {}
    };

    const classroomFolder = {
      getFoldersByName: (name: string) => {
        if (name === 'attachments') return makeIterator([attachFolder]);
        return makeIterator([]);
      },
      createFolder: () => attachFolder,
      getFilesByName: (name: string) => {
        if (name === 'classroom_data.json') {
          return makeIterator([{
            getContent: () => JSON.stringify({
              kidName: 'Atharva',
              courses: [{ id: 'course_1', name: 'Math', announcements }]
            }, null, 2),
            setContent: () => { setContentCalls++; }
          }]);
        }
        return makeIterator([]);
      },
      createFile: () => {}
    };

    const emailsFolder = {
      getFoldersByName: (name: string) => {
        if (name === 'attachments') return makeIterator([emailAttachFolder]);
        return makeIterator([]);
      },
      createFolder: () => emailAttachFolder,
      getFilesByName: (name: string) => {
        if (name === 'school_emails.json') {
          return makeIterator([{
            getContent: () => JSON.stringify({
              kidName: 'Atharva',
              emails: emails
            }, null, 2),
            setContent: () => { setContentCalls++; }
          }]);
        }
        return makeIterator([]);
      },
      createFile: () => {}
    };

    const kidFolder = {
      isTrashed: () => false,
      getFoldersByName: (name: string) => {
        if (name === 'classroom') return makeIterator([classroomFolder]);
        if (name === 'emails') return makeIterator([emailsFolder]);
        return makeIterator([]);
      },
      createFolder: (name: string) => (name === 'classroom' ? classroomFolder : emailsFolder),
      getFilesByName: () => makeIterator([])
    };

    const sandbox = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (k: string) => {
            if (k === 'multi_child_school_registry') {
              return JSON.stringify({
                children: [{
                  kidName: 'Atharva',
                  schoolWorkerUrl: 'https://script.google.com/macros/s/student/exec',
                  targetFolderId: 'kid_folder_123',
                  initialSyncComplete: true
                }]
              });
            }
            return null;
          }
        })
      },
      LockService: {
        getScriptLock: () => ({
          tryLock: () => true,
          releaseLock: () => {}
        })
      },
      DriveApp: {
        getFolderById: () => kidFolder
      },
      UrlFetchApp: {
        fetch: (url: string, opts: any) => {
          const payload = JSON.parse(opts.payload);
          if (payload.method === 'extract_classroom_and_gmail') {
            return {
              getResponseCode: () => 200,
              getContentText: () => JSON.stringify({
                result: {
                  classroom: {
                    kidName: 'Atharva',
                    courses: [{ id: 'course_1', name: 'Math', announcements }]
                  },
                  gmail: {
                    kidName: 'Atharva',
                    emails: emails
                  }
                }
              })
            };
          }
          if (payload.method === 'get_file_blob' || payload.method === 'get_gmail_attachment') {
            urlFetchBlobCalls++;
            return {
              getResponseCode: () => 200,
              getContentText: () => JSON.stringify({ result: { base64: 'AAAA' } })
            };
          }
          return { getResponseCode: () => 200, getContentText: () => '{}' };
        }
      },
      Utilities: {
        base64Decode: () => [],
        newBlob: () => ({})
      },
      McpLogger: { log: () => {} },
      Date: class MockDate extends Date {
        constructor(...args: any[]) {
          if (args.length > 0) super(args[0], ...args.slice(1));
          else super(dayTimeMs);
        }
      }
    };

    const ctx = vm.createContext(sandbox);
    vm.runInContext(code + '\nbatchRes = runMasterCloudSchoolSync();', ctx);

    const res = (sandbox as any).batchRes;
    expect(res.success).toBe(true);
    expect(res.syncedCount).toBe(1);

    // CRITICAL ASSERTIONS:
    // 1. Batch getFiles was called exactly ONCE per attachments folder!
    expect(attachFolderGetFilesCalled).toBe(1);
    expect(emailAttachFolderGetFilesCalled).toBe(1);

    // 2. Individual sequential getFilesByName lookups inside the loops MUST BE ZERO!
    expect(attachFolderGetFilesByNameCalled).toBe(0);
    expect(emailAttachFolderGetFilesByNameCalled).toBe(0);

    // 3. Since all files already existed in the batch cache, NO blob fetch queries were made!
    expect(urlFetchBlobCalls).toBe(0);
  });
});

