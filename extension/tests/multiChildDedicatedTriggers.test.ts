import { describe, it, expect, vi } from 'vitest';
import * as vm from 'vm';
import * as fs from 'fs';
import * as path from 'path';

describe('Multi-Child Dedicated Triggers & Step 3 Portal Burst Engine', () => {
  const codePath = path.resolve(__dirname, '../../gas-mcp-server/src/Code.gs');
  const portalCodePath = path.resolve(__dirname, '../../gas-mcp-server/src/PortalIngester.gs');
  const ocrCodePath = path.resolve(__dirname, '../../gas-mcp-server/src/DocumentOcrService.gs');
  const code = fs.readFileSync(codePath, 'utf-8');
  const portalCode = fs.readFileSync(portalCodePath, 'utf-8');
  const ocrCode = fs.readFileSync(ocrCodePath, 'utf-8');
  const fullCode = code + '\n' + portalCode + '\n' + ocrCode;

  it('verifies runChildSchoolSyncTrigger resolves e.triggerUid to the target child', () => {
    const scriptProps: Record<string, string> = {
      'trigger_child_trig_101': 'child_atharva',
      'trigger_child_trig_102': 'child_ananya',
      'quiet_hours_disabled': 'true',
      'multi_child_school_registry': JSON.stringify({
        children: [
          { childId: 'child_atharva', kidName: 'Atharva', initialSyncComplete: true, schoolWorkerUrl: 'https://school1.test', targetFolderId: 'f1' },
          { childId: 'child_ananya', kidName: 'Ananya', initialSyncComplete: true, schoolWorkerUrl: 'https://school2.test', targetFolderId: 'f2' }
        ]
      })
    };

    const fetchedUrls: string[] = [];

    const sandbox: any = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (key: string) => scriptProps[key] || null,
          setProperty: (key: string, val: string) => { scriptProps[key] = val; },
          deleteProperty: (key: string) => { delete scriptProps[key]; }
        })
      },
      LockService: {
        getScriptLock: () => ({
          tryLock: () => true,
          releaseLock: () => {}
        })
      },
      DriveApp: {
        getFolderById: (id: string) => ({
          isTrashed: () => false,
          getFoldersByName: () => ({ hasNext: () => false }),
          createFolder: () => ({
            getFilesByName: () => ({ hasNext: () => false }),
            createFile: () => ({})
          })
        })
      },
      UrlFetchApp: {
        fetch: vi.fn((url: string) => {
          fetchedUrls.push(url);
          return {
            getResponseCode: () => 200,
            getContentText: () => JSON.stringify({ result: { classroom: { courses: [] } } })
          };
        })
      },
      McpLogger: { log: () => {} }
    };

    const ctx = vm.createContext(sandbox);
    vm.runInContext(code + '\nres1 = runChildSchoolSyncTrigger({ triggerUid: "trig_101" });', ctx);
    expect(fetchedUrls).toContain('https://school1.test');
    expect(fetchedUrls).not.toContain('https://school2.test');

    vm.runInContext('res2 = runChildSchoolSyncTrigger({ triggerUid: "trig_102" });', ctx);
    expect(fetchedUrls).toContain('https://school2.test');
  });

  it('verifies non-blocking child locks allow parallel execution for different children', () => {
    const scriptProps: Record<string, string> = {
      'quiet_hours_disabled': 'true',
      'multi_child_school_registry': JSON.stringify({
        children: [
          { childId: 'child_atharva', kidName: 'Atharva', initialSyncComplete: true, schoolWorkerUrl: 'https://school1.test', targetFolderId: 'f1' },
          { childId: 'child_ananya', kidName: 'Ananya', initialSyncComplete: true, schoolWorkerUrl: 'https://school2.test', targetFolderId: 'f2' }
        ]
      })
    };

    // Simulate child_atharva has an active in-flight sync lock (locked for next 4 minutes)
    const now = Date.now();
    scriptProps['child_sync_lock_child_atharva'] = (now + 240000).toString();

    const sandbox: any = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (key: string) => scriptProps[key] || null,
          setProperty: (key: string, val: string) => { scriptProps[key] = val; },
          deleteProperty: (key: string) => { delete scriptProps[key]; }
        })
      },
      LockService: {
        getScriptLock: () => ({
          tryLock: () => true,
          releaseLock: () => {}
        })
      },
      McpLogger: { log: () => {} },
      DriveApp: {
        getFolderById: (id: string) => ({
          isTrashed: () => false,
          getFoldersByName: () => ({ hasNext: () => false }),
          createFolder: () => ({
            getFilesByName: () => ({ hasNext: () => false }),
            createFile: () => ({})
          })
        })
      },
      UrlFetchApp: {
        fetch: () => ({
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ result: { classroom: { courses: [] } } })
        })
      }
    };

    const ctx = vm.createContext(sandbox);

    // 1. Atharva's trigger fires -> detects in-progress lock -> safely skips without error
    vm.runInContext(code + '\nresAtharva = runMasterCloudSchoolSync(false, "child_atharva", false);', ctx);
    expect(sandbox.resAtharva).toEqual({ skipped: true, reason: 'Sync already in progress for child child_atharva' });

    // 2. Ananya's trigger fires concurrently -> NOT blocked by Atharva's lock -> executes smoothly!
    vm.runInContext('resAnanya = runMasterCloudSchoolSync(false, "child_ananya", false);', ctx);
    expect(sandbox.resAnanya.skipped).toBeUndefined();
    expect(sandbox.resAnanya.success).toBe(true);
  });

  it('verifies runChildPortalSyncTrigger resolves e.triggerUid and dispatches to PortalIngester.syncChildBurst', () => {
    const scriptProps: Record<string, string> = {
      'portal_trigger_child_trig_999': 'child_atharva'
    };

    let syncBurstChild: string | null = null;

    const sandbox: any = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (key: string) => scriptProps[key] || null,
          setProperty: (key: string, val: string) => { scriptProps[key] = val; },
          deleteProperty: (key: string) => { delete scriptProps[key]; }
        })
      },
      PortalIngester: {
        syncChildBurst: vi.fn((childId: string) => {
          syncBurstChild = childId;
          return { status: 'complete', childId };
        }),
        syncAll: vi.fn()
      },
      McpLogger: { log: () => {} }
    };

    const ctx = vm.createContext(sandbox);
    vm.runInContext(code + '\nres = runChildPortalSyncTrigger({ triggerUid: "trig_999" });', ctx);

    expect(sandbox.PortalIngester.syncChildBurst).toHaveBeenCalledWith('child_atharva');
    expect(syncBurstChild).toBe('child_atharva');
  });

  it('verifies PortalIngester.syncChildBurst enforces fair-share burst budget and schedules 10-minute continuation', () => {
    // 1 child with 1 portal containing 10 features (exceeding BURST_MAX_FEATURES = 6)
    const featuresList = Array.from({ length: 10 }, (_, i) => ({
      name: `Feature_${i + 1}`,
      endpoint: `https://portal.school.test/feat_${i + 1}`
    }));

    const scriptProps: Record<string, string> = {
      'quiet_hours_disabled': 'true',
      'multi_child_portal_registry': JSON.stringify({
        children: [
          {
            childId: 'child_atharva',
            kidName: 'Atharva',
            portalFolderId: 'folder_portal_ath',
            domains: {
              'portal.school.test': {
                security_payload: { cookies: 'auth_token=xyz123' },
                features: featuresList
              }
            }
          }
        ]
      })
    };

    let scheduledTriggerHandler = '';
    let scheduledDelayMs = 0;
    let createdTriggerUid = 'trig_portal_cont_1';

    const mockSavedFiles: Record<string, string> = {};

    const sandbox: any = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (key: string) => scriptProps[key] || null,
          setProperty: (key: string, val: string) => { scriptProps[key] = val; },
          deleteProperty: (key: string) => { delete scriptProps[key]; }
        })
      },
      ScriptApp: {
        getProjectTriggers: () => [],
        deleteTrigger: vi.fn(),
        newTrigger: (handler: string) => {
          scheduledTriggerHandler = handler;
          return {
            timeBased: () => ({
              after: (ms: number) => {
                scheduledDelayMs = ms;
                return {
                  create: () => ({
                    getUniqueId: () => createdTriggerUid
                  })
                };
              }
            })
          };
        }
      },
      DriveApp: {
        getFolderById: () => {
          const createFolder = (fName = 'folder'): any => {
            const subfolders: Record<string, any> = {};
            const files: Record<string, any> = {};
            return {
              getName: () => fName,
              isTrashed: () => false,
              getFoldersByName: (name: string) => ({
                hasNext: () => !!subfolders[name],
                next: () => subfolders[name]
              }),
              createFolder: (name: string) => {
                subfolders[name] = createFolder(name);
                return subfolders[name];
              },
              getFilesByName: (name: string) => ({
                hasNext: () => !!files[name],
                next: () => files[name]
              }),
              getFiles: () => {
                const list = Object.values(files);
                let idx = 0;
                return {
                  hasNext: () => idx < list.length,
                  next: () => list[idx++]
                };
              },
              createFile: (name: string, content: any) => {
                const fileObj = {
                  getName: () => name,
                  getId: () => 'file_' + name,
                  getBlob: () => ({ getDataAsString: () => typeof content === 'string' ? content : '', getBytes: () => [] }),
                  setContent: (c: string) => { mockSavedFiles[name] = c; }
                };
                files[name] = fileObj;
                mockSavedFiles[name] = content;
                return fileObj;
              }
            };
          };
          return createFolder('root');
        }
      },
      UrlFetchApp: {
        fetch: vi.fn(() => ({
          getResponseCode: () => 200,
          getContentText: () => '<div>Portal content ok</div>'
        }))
      },
      Date: class extends Date {
        constructor(...args: any[]) {
          if (args.length > 0) {
            super(...(args as [any]));
          } else {
            super('2026-09-12T04:30:00.000Z');
          }
        }
        static now() {
          return new Date('2026-09-12T04:30:00.000Z').getTime();
        }
      },
      McpLogger: { log: () => {} }
    };

    const ctx = vm.createContext(sandbox);

    // Run burst 1
    vm.runInContext(fullCode + '\nresBurst1 = PortalIngester.syncChildBurst("child_atharva");', ctx);

    // Should have processed 6 features, then stopped and scheduled continuation in 10 minutes (600,000 ms)
    expect(sandbox.resBurst1.status).toBe('continuation_scheduled');
    expect(sandbox.resBurst1.nextInMinutes).toBe(10);
    expect(scheduledTriggerHandler).toBe('runPortalSync_Atharva');
    expect(scheduledDelayMs).toBe(10 * 60 * 1000);

    // Progress checkpoint saved in properties
    const savedProg = JSON.parse(scriptProps['portal_prog_child_atharva']);
    expect(savedProg.featIdx).toBe(6);

    // Run burst 2 (resuming from checkpoint)
    vm.runInContext('resBurst2 = PortalIngester.syncChildBurst("child_atharva");', ctx);

    // All remaining 4 features processed -> cycle complete -> scheduled for next 6-hour slot (360 mins)
    expect(sandbox.resBurst2.status).toBe('cycle_complete');
    expect(sandbox.resBurst2.nextInHours).toBe(6);
    expect(scheduledDelayMs).toBe(360 * 60 * 1000); // 6 hours

    // Progress checkpoint cleaned up
    expect(scriptProps['portal_prog_child_atharva']).toBeUndefined();
  });

  it('verifies pauseNightlySyncTriggers and resumeMorningSyncTriggers manage quiet hours across children', () => {
    const scriptProps: Record<string, string> = {
      'multi_child_school_registry': JSON.stringify({
        children: [
          { childId: 'c1', kidName: 'Atharva', initialSyncComplete: true },
          { childId: 'c2', kidName: 'Ananya', initialSyncComplete: true },
          { childId: 'c3', kidName: 'Unregistered', initialSyncComplete: false }
        ]
      }),
      'multi_child_portal_registry': JSON.stringify({
        children: [
          { childId: 'c1', kidName: 'Atharva', domains: { 'portal.school.test': {} } }
        ]
      })
    };

    const triggersInProject: any[] = [
      { getHandlerFunction: () => 'runChildSchoolSyncTrigger', getUniqueId: () => 'u1' },
      { getHandlerFunction: () => 'runSchoolSync_Atharva', getUniqueId: () => 'u2' },
      { getHandlerFunction: () => 'runPortalSync_Atharva', getUniqueId: () => 'u3' },
      { getHandlerFunction: () => 'runAutonomousVaultOcr', getUniqueId: () => 'u4' }
    ];

    let deletedTriggers: string[] = [];
    let createdTriggers: { handler: string; cadence?: string; delayMs?: number }[] = [];

    const sandbox: any = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (key: string) => scriptProps[key] || null,
          setProperty: (key: string, val: string) => { scriptProps[key] = val; },
          deleteProperty: (key: string) => { delete scriptProps[key]; }
        })
      },
      ScriptApp: {
        getProjectTriggers: () => triggersInProject,
        deleteTrigger: vi.fn((trig: any) => {
          deletedTriggers.push(trig.getHandlerFunction());
        }),
        newTrigger: vi.fn((handler: string) => ({
          timeBased: () => ({
            everyMinutes: (m: number) => ({
              create: () => {
                createdTriggers.push({ handler, cadence: `everyMinutes(${m})` });
                return { getUniqueId: () => 'new_u_' + Math.random() };
              }
            }),
            after: (ms: number) => ({
              create: () => {
                createdTriggers.push({ handler, delayMs: ms });
                return { getUniqueId: () => 'new_after_' + Math.random() };
              }
            }),
            atHour: () => ({ inTimezone: () => ({ everyDays: () => ({ create: () => {} }) }) })
          })
        }))
      },
      Date: class extends Date {
        constructor(...args: any[]) {
          if (args.length > 0) {
            super(...(args as [any]));
          } else {
            super('2026-09-12T04:30:00.000Z');
          }
        }
        static now() {
          return new Date('2026-09-12T04:30:00.000Z').getTime();
        }
      },
      McpLogger: { log: () => {} }
    };

    const ctx = vm.createContext(sandbox);

    // 1. 11 PM IST: Nightly Pause
    vm.runInContext(fullCode + '\npauseRes = pauseNightlySyncTriggers();', ctx);
    expect(sandbox.pauseRes.paused).toBe(true);
    expect(deletedTriggers).toContain('runChildSchoolSyncTrigger');
    expect(deletedTriggers).toContain('runSchoolSync_Atharva');
    expect(deletedTriggers).toContain('runPortalSync_Atharva');
    expect(deletedTriggers).toContain('runAutonomousVaultOcr');

    // 2. 6 AM IST: Morning Resume
    // Mock daytime hour in IST
    const originalDate = globalThis.Date;
    try {
      // Return 7:00 AM IST (1:30 AM UTC)
      const fakeDaytime = new Date('2026-09-12T01:30:00.000Z');
      (globalThis as any).Date = class extends originalDate {
        constructor() {
          super();
          return fakeDaytime;
        }
        static now() { return fakeDaytime.getTime(); }
      };

      vm.runInContext('resumeRes = resumeMorningSyncTriggers();', ctx);
      expect(sandbox.resumeRes.resumed).toBe(true);
      expect(sandbox.resumeRes.restoredChildrenCount).toBe(2); // Atharva and Ananya (completed only)

      const schoolCreated = createdTriggers.filter(t => t.handler.indexOf('runSchoolSync_') === 0 || t.handler === 'runChildSchoolSyncTrigger');
      expect(schoolCreated.length).toBe(2);
      expect(schoolCreated.map(t => t.handler)).toEqual(['runSchoolSync_Atharva', 'runSchoolSync_Ananya']);

      const portalCreated = createdTriggers.filter(t => t.handler.indexOf('runPortalSync_') === 0 || t.handler === 'runChildPortalSyncTrigger');
      expect(portalCreated.length).toBe(1); // Atharva has registered portal
      expect(portalCreated.map(t => t.handler)).toEqual(['runPortalSync_Atharva']);
    } finally {
      globalThis.Date = originalDate;
    }
  });

  it('verifies PortalIngester downloads portal attachments and DocumentOcrService indexes them into search_vault_documents', () => {
    const scriptProps: Record<string, string> = {
      'quiet_hours_disabled': 'true',
      'multi_child_portal_registry': JSON.stringify({
        children: [
          {
            childId: 'child_atharva',
            kidName: 'Atharva',
            portalFolderId: 'folder_portal_ath',
            domains: {
              'portal.school.test': {
                security_payload: { cookies: 'auth_token=xyz123' },
                features: [
                  {
                    name: 'Fee Receipts',
                    endpoint: 'https://portal.school.test/fees/receipt_q1.pdf'
                  },
                  {
                    name: 'Notice Board',
                    endpoint: 'https://portal.school.test/notices/index.html'
                  }
                ]
              }
            }
          }
        ]
      })
    };

    const scheduledTriggers: string[] = [];
    const filesCreated: Record<string, any> = {};

    const createFolder = (fName = 'folder'): any => {
      const subfolders: Record<string, any> = {};
      const files: Record<string, any> = {};
      const folderObj: any = {
        getName: () => fName,
        isTrashed: () => false,
        getParents: () => ({
          hasNext: () => false
        }),
        getFoldersByName: (name: string) => ({
          hasNext: () => !!subfolders[name],
          next: () => subfolders[name]
        }),
        getFolders: () => {
          const list = Object.values(subfolders);
          let idx = 0;
          return {
            hasNext: () => idx < list.length,
            next: () => list[idx++]
          };
        },
        createFolder: (name: string) => {
          subfolders[name] = createFolder(name);
          return subfolders[name];
        },
        getFilesByName: (name: string) => ({
          hasNext: () => !!files[name],
          next: () => files[name]
        }),
        getFiles: () => {
          const list = Object.values(files);
          let idx = 0;
          return {
            hasNext: () => idx < list.length,
            next: () => list[idx++]
          };
        },
        createFile: (nameOrBlob: any, content?: any, mimeType?: string) => {
          let fileName = '';
          let fileContent = content;
          let fileBlob: any = null;

          if (typeof nameOrBlob === 'object' && nameOrBlob && typeof nameOrBlob.getName === 'function') {
            fileName = nameOrBlob.getName();
            fileBlob = nameOrBlob;
            fileContent = nameOrBlob.getDataAsString ? nameOrBlob.getDataAsString() : '';
          } else {
            fileName = String(nameOrBlob);
          }

          const fileObj = {
            getName: () => fileName,
            getId: () => 'file_' + fileName,
            getMimeType: () => mimeType || 'application/pdf',
            getUrl: () => 'https://drive.google.com/open?id=file_' + fileName,
            getBlob: () => ({
              getDataAsString: () => typeof fileObj._content === 'string' ? fileObj._content : '',
              getBytes: () => [1, 2, 3],
              setName: (n: string) => fileObj
            }),
            setContent: (c: string) => { fileObj._content = c; },
            _content: fileContent
          };
          files[fileName] = fileObj;
          filesCreated[fileName] = fileObj;
          return fileObj;
        }
      };
      return folderObj;
    };

    const rootKidVault = createFolder('Atharva_Vault');

    const sandbox: any = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (key: string) => scriptProps[key] || null,
          setProperty: (key: string, val: string) => { scriptProps[key] = val; },
          deleteProperty: (key: string) => { delete scriptProps[key]; }
        })
      },
      ScriptApp: {
        getProjectTriggers: () => [],
        deleteTrigger: vi.fn(),
        newTrigger: (handler: string) => ({
          timeBased: () => ({
            after: () => ({
              create: () => {
                scheduledTriggers.push(handler);
                return { getUniqueId: () => 'trig_' + handler };
              }
            })
          })
        })
      },
      DriveApp: {
        getFolderById: () => rootKidVault,
        getFileById: (id: string) => {
          const cleanName = id.replace('file_', '');
          return filesCreated[cleanName] || null;
        }
      },
      UrlFetchApp: {
        fetch: vi.fn((url: string) => {
          if (url.includes('receipt_q1.pdf')) {
            const pdfText = '%PDF-1.4 (Quarter 1 Tuition Fee Paid INR 25000 for student Atharva Grade 5 Academic Year 2026-2027) Tj';
            return {
              getResponseCode: () => 200,
              getHeaders: () => ({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="fee_receipt_q1.pdf"' }),
              getContentText: () => pdfText,
              getBlob: () => ({
                setName: (n: string) => ({
                  getName: () => n,
                  getDataAsString: () => pdfText,
                  getBytes: () => [1, 2, 3]
                })
              })
            };
          }
          if (url.includes('notices/index.html')) {
            return {
              getResponseCode: () => 200,
              getHeaders: () => ({ 'Content-Type': 'text/html' }),
              getContentText: () => '<html><body><h1>School Notices</h1><a href="/downloads/annual_sports_circular_2026.pdf">Download Sports Day Circular</a></body></html>',
              getBlob: () => ({
                setName: (n: string) => ({
                  getName: () => n,
                  getDataAsString: () => '<html><body>Notices</body></html>',
                  getBytes: () => [1, 2, 3]
                })
              })
            };
          }
          if (url.includes('annual_sports_circular_2026.pdf')) {
            const pdfText = '%PDF-1.4 (Annual Sports Day Championship on 15 October 2026 Athletics 100m Sprint Relay Race and Long Jump Competition) Tj';
            return {
              getResponseCode: () => 200,
              getHeaders: () => ({ 'Content-Type': 'application/pdf' }),
              getContentText: () => pdfText,
              getBlob: () => ({
                setName: (n: string) => ({
                  getName: () => n,
                  getDataAsString: () => pdfText,
                  getBytes: () => [1, 2, 3]
                })
              })
            };
          }
          return {
            getResponseCode: () => 200,
            getHeaders: () => ({ 'Content-Type': 'text/plain' }),
            getContentText: () => 'default',
            getBlob: () => ({ setName: (n: string) => ({ getName: () => n, getDataAsString: () => 'default', getBytes: () => [] }) })
          };
        })
      },
      Date: class extends Date {
        constructor(...args: any[]) {
          if (args.length > 0) {
            super(...(args as [any]));
          } else {
            super('2026-09-12T04:30:00.000Z');
          }
        }
        static now() {
          return new Date('2026-09-12T04:30:00.000Z').getTime();
        }
      },
      McpLogger: { log: () => {} },
      LockService: {
        getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} })
      }
    };

    const ctx = vm.createContext(sandbox);

    // 1. Run Portal Burst Sync
    vm.runInContext(fullCode + '\nsyncResult = PortalIngester.syncChildBurst("child_atharva");', ctx);
    expect(sandbox.syncResult.status).toBe('cycle_complete');

    // Verify attachments were saved in Google Drive
    expect(filesCreated['fee_receipt_q1.pdf']).toBeDefined();
    expect(filesCreated['annual_sports_circular_2026.pdf']).toBeDefined();

    // Verify autonomous OCR trigger was automatically scheduled
    expect(scheduledTriggers).toContain('runAutonomousVaultOcr');

    // 2. Run Automated Vault Indexing via DocumentOcrService
    vm.runInContext('ocrResult = DocumentOcrService.runAutomatedVaultIndexing(DriveApp.getFolderById("any"), 10);', ctx);
    expect(sandbox.ocrResult.success).toBe(true);
    expect(sandbox.ocrResult.processed).toBeGreaterThanOrEqual(2);

    // 3. Verify search_vault_documents finds the portal documents
    vm.runInContext('feeSearch = DocumentOcrService.searchVaultDocuments(DriveApp.getFolderById("any"), "tuition fee");', ctx);
    expect(sandbox.feeSearch.results.length).toBeGreaterThan(0);
    expect(sandbox.feeSearch.results[0].source).toBe('portal');
    expect(sandbox.feeSearch.results[0].fileName).toBe('fee_receipt_q1.pdf');

    vm.runInContext('sportsSearch = DocumentOcrService.searchVaultDocuments(DriveApp.getFolderById("any"), "sports day athletics");', ctx);
    expect(sandbox.sportsSearch.results.length).toBeGreaterThan(0);
    expect(sandbox.sportsSearch.results[0].source).toBe('portal');
    expect(sandbox.sportsSearch.results[0].fileName).toBe('annual_sports_circular_2026.pdf');
  });

  it('verifies per-child triggers are explicitly identifiable by child name in Google Apps Script triggers dashboard', () => {
    const scriptProps: Record<string, string> = {
      'multi_child_school_registry': JSON.stringify({
        children: [
          { childId: 'child_atharva', kidName: 'Atharva', initialSyncComplete: true },
          { childId: 'child_ananya', kidName: 'Ananya', initialSyncComplete: true }
        ]
      }),
      'multi_child_portal_registry': JSON.stringify({
        children: [
          { childId: 'child_atharva', kidName: 'Atharva', domains: { 'school.portal.test': {} } }
        ]
      })
    };

    const createdTriggers: { name: string; type: string; cadence?: string; delayMs?: number; uid: string }[] = [];
    const projectTriggers: any[] = [];

    const sandbox: any = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (k: string) => scriptProps[k] || null,
          setProperty: (k: string, v: string) => { scriptProps[k] = v; },
          deleteProperty: (k: string) => { delete scriptProps[k]; }
        })
      },
      ScriptApp: {
        getProjectTriggers: () => projectTriggers,
        deleteTrigger: vi.fn((trig: any) => {
          const idx = projectTriggers.indexOf(trig);
          if (idx !== -1) projectTriggers.splice(idx, 1);
        }),
        newTrigger: vi.fn((handlerName: string) => ({
          timeBased: () => ({
            everyMinutes: (mins: number) => ({
              create: () => {
                const uid = 'trig_uid_' + Math.random().toString(36).substring(2);
                const trig = {
                  name: handlerName,
                  type: 'timeBased',
                  cadence: `everyMinutes(${mins})`,
                  uid,
                  getUniqueId: () => uid,
                  getHandlerFunction: () => handlerName
                };
                createdTriggers.push(trig);
                projectTriggers.push(trig);
                return trig;
              }
            }),
            after: (ms: number) => ({
              create: () => {
                const uid = 'trig_portal_uid_' + Math.random().toString(36).substring(2);
                const trig = {
                  name: handlerName,
                  type: 'timeBased',
                  delayMs: ms,
                  uid,
                  getUniqueId: () => uid,
                  getHandlerFunction: () => handlerName
                };
                createdTriggers.push(trig);
                projectTriggers.push(trig);
                return trig;
              }
            }),
            atHour: () => ({ inTimezone: () => ({ everyDays: () => ({ create: () => {} }) }) })
          })
        }))
      },
      Date: class extends Date {
        constructor(...args: any[]) {
          if (args.length > 0) {
            super(...(args as [any]));
          } else {
            // 10:00 AM IST (daytime, not quiet hours)
            super('2026-09-12T04:30:00.000Z');
          }
        }
        static now() {
          return new Date('2026-09-12T04:30:00.000Z').getTime();
        }
      },
      McpLogger: { log: () => {} }
    };

    const ctx = vm.createContext(sandbox);
    vm.runInContext(fullCode, ctx);

    // 1. Setup school trigger for Atharva -> handler must be runSchoolSync_Atharva
    const resAtharva = vm.runInContext('setupChildSchoolSyncTrigger("child_atharva", 1);', ctx);
    expect(resAtharva.success).toBe(true);
    expect(resAtharva.handler).toBe('runSchoolSync_Atharva');
    expect(createdTriggers.some(t => t.name === 'runSchoolSync_Atharva')).toBe(true);

    // 2. Setup school trigger for Ananya -> handler must be runSchoolSync_Ananya
    const resAnanya = vm.runInContext('setupChildSchoolSyncTrigger("child_ananya", 1);', ctx);
    expect(resAnanya.success).toBe(true);
    expect(resAnanya.handler).toBe('runSchoolSync_Ananya');
    expect(createdTriggers.some(t => t.name === 'runSchoolSync_Ananya')).toBe(true);

    // 3. Setup portal trigger for Atharva -> handler must be runPortalSync_Atharva
    const resPortalAtharva = vm.runInContext('setupChildPortalTrigger("child_atharva", 10);', ctx);
    expect(resPortalAtharva.success).toBe(true);
    expect(resPortalAtharva.handler).toBe('runPortalSync_Atharva');
    expect(createdTriggers.some(t => t.name === 'runPortalSync_Atharva')).toBe(true);

    // 4. Setup trigger for child without explicit kidName in registry -> cleans ID, e.g. child_rohan -> Rohan
    const resRohan = vm.runInContext('setupChildSchoolSyncTrigger("child_rohan", 1);', ctx);
    expect(resRohan.success).toBe(true);
    expect(resRohan.handler).toBe('runSchoolSync_Rohan');

    // 5. Re-creating trigger for Atharva should cleanly delete old trigger without touching Ananya's
    const preCount = projectTriggers.length;
    vm.runInContext('setupChildSchoolSyncTrigger("child_atharva", 5);', ctx);
    // Project triggers count should remain the same because old Atharva trigger was replaced
    expect(projectTriggers.filter(t => t.name === 'runSchoolSync_Atharva').length).toBe(1);
    expect(projectTriggers.filter(t => t.name === 'runSchoolSync_Ananya').length).toBe(1);
  });
});
