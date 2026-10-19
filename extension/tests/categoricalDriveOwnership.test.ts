import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PersonalDriveService } from '../src/services/personalDriveService';

describe('Categorical Drive Single-Ownership & Vault Gateway Bridge', () => {
  let mockStorage: Record<string, any> = {};
  let fetchHistory: Array<{ url: string; opts?: any }> = [];

  beforeEach(() => {
    mockStorage = {
      master_worker_deployment_url: 'https://script.google.com/macros/s/AK_MASTER/exec?accessKey=MasterKey123',
      master_worker_script_id: 'master_script_id_123',
      gas_access_key: 'MasterKey123'
    };
    fetchHistory = [];

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
        getManifest: vi.fn(() => ({ oauth2: { client_id: '161904522090-test.apps.googleusercontent.com' } }))
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('callGasWorkerRpc: Fail-Fast vs Transient Retry Classification', () => {
    it('fails fast on durable HTTP 401/403/404 errors with 0 retries', async () => {
      let fetchCount = 0;
      (globalThis as any).fetch = vi.fn(async (url: string, opts?: any) => {
        fetchCount++;
        fetchHistory.push({ url, opts });
        return {
          ok: false,
          status: 404,
          statusText: 'Not Found'
        } as any;
      });

      const res = await PersonalDriveService.callGasWorkerRpc(
        'https://script.google.com/macros/s/AK_TEST/exec',
        'get_vault_file',
        { folderId: 'folder123', fileName: 'classroom_data.json' },
        3
      );

      expect(fetchCount).toBe(1);
      expect(res.success).toBe(false);
      expect(res.durable).toBe(true);
      expect(res.status).toBe(404);
    });

    it('fails fast on durable JSON-RPC error messages (unauthorized, not found)', async () => {
      let fetchCount = 0;
      (globalThis as any).fetch = vi.fn(async (url: string, opts?: any) => {
        fetchCount++;
        fetchHistory.push({ url, opts });
        return {
          ok: true,
          status: 200,
          json: async () => ({
            jsonrpc: '2.0',
            id: 1,
            error: { code: -32000, message: 'Unauthorized: Invalid or missing accessKey' }
          })
        } as any;
      });

      const res = await PersonalDriveService.callGasWorkerRpc(
        'https://script.google.com/macros/s/AK_TEST/exec',
        'get_vault_file',
        { folderId: 'folder123', fileName: 'classroom_data.json' },
        3
      );

      expect(fetchCount).toBe(1);
      expect(res.success).toBe(false);
      expect(res.durable).toBe(true);
      expect(res.error).toContain('Unauthorized');
    });

    it('retries on transient HTTP 500/429 errors up to maxRetries before stopping', async () => {
      let fetchCount = 0;
      (globalThis as any).fetch = vi.fn(async (url: string, opts?: any) => {
        fetchCount++;
        fetchHistory.push({ url, opts });
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        } as any;
      });

      const res = await PersonalDriveService.callGasWorkerRpc(
        'https://script.google.com/macros/s/AK_TEST/exec',
        'get_vault_file',
        { folderId: 'folder123', fileName: 'classroom_data.json' },
        3
      );

      expect(fetchCount).toBe(3);
      expect(res.success).toBe(false);
      expect(res.retryable).toBe(true);
    });

    it('automatically attaches accessKey to query string and request body', async () => {
      let capturedBody: any = null;
      let capturedUrl = '';
      (globalThis as any).fetch = vi.fn(async (url: string, opts?: any) => {
        capturedUrl = url;
        capturedBody = JSON.parse(opts.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            jsonrpc: '2.0',
            id: 1,
            result: { success: true }
          })
        } as any;
      });

      await PersonalDriveService.callGasWorkerRpc(
        'https://script.google.com/macros/s/AK_TEST/exec',
        'test_method',
        { foo: 'bar' }
      );

      expect(capturedUrl).toContain('accessKey=MasterKey123');
      expect(capturedBody.accessKey).toBe('MasterKey123');
      expect(capturedBody.params.accessKey).toBe('MasterKey123');
      expect(capturedBody.method).toBe('test_method');
    });
  });

  describe('readSchoolVaultFile: Master Worker Vault Gateway RPC', () => {
    it('queries Master Worker get_vault_file with ZERO direct Drive REST calls', async () => {
      const mockCoursework = { courses: [{ id: 'c1', name: 'Mathematics 101' }] };

      (globalThis as any).fetch = vi.fn(async (url: string, opts?: any) => {
        fetchHistory.push({ url, opts });
        if (url.includes('script.google.com/macros/s/AK_MASTER/exec')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              jsonrpc: '2.0',
              id: 1,
              result: {
                success: true,
                id: 'file_math_123',
                name: 'classroom_data.json',
                content: mockCoursework
              }
            })
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      const result = await PersonalDriveService.readSchoolVaultFile(
        'class_folder_abc',
        'classroom_data.json'
      );

      expect(result).toEqual(mockCoursework);

      // Verify ZERO direct Drive REST calls were made
      const driveRestCalls = fetchHistory.filter(h => h.url.includes('googleapis.com/drive'));
      expect(driveRestCalls.length).toBe(0);

      // Verify call went to Master Worker with method get_vault_file
      const masterCall = fetchHistory.find(h => h.url.includes('AK_MASTER'));
      expect(masterCall).toBeDefined();
      const body = JSON.parse(masterCall!.opts.body);
      expect(body.method).toBe('get_vault_file');
      expect(body.params.folderId).toBe('class_folder_abc');
      expect(body.params.fileName).toBe('classroom_data.json');
    });
  });

  describe('listSchoolVaultFiles: Master Worker Vault Gateway RPC', () => {
    it('queries Master Worker list_vault_files with ZERO direct Drive REST calls and ZERO list merging', async () => {
      const mockFiles = [
        { id: 'att_1', name: 'Syllabus.pdf', mimeType: 'application/pdf', size: 1024, lastUpdated: '2026-09-01T10:00:00Z' },
        { id: 'att_2', name: 'Homework1.pdf', mimeType: 'application/pdf', size: 2048, lastUpdated: '2026-09-02T10:00:00Z' }
      ];

      (globalThis as any).fetch = vi.fn(async (url: string, opts?: any) => {
        fetchHistory.push({ url, opts });
        if (url.includes('script.google.com/macros/s/AK_MASTER/exec')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              jsonrpc: '2.0',
              id: 1,
              result: {
                success: true,
                files: mockFiles
              }
            })
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      const files = await PersonalDriveService.listSchoolVaultFiles('attachments_folder_xyz');

      expect(files).toEqual(mockFiles);

      // Verify ZERO direct Drive REST calls
      const driveRestCalls = fetchHistory.filter(h => h.url.includes('googleapis.com/drive'));
      expect(driveRestCalls.length).toBe(0);

      // Verify call payload
      const masterCall = fetchHistory.find(h => h.url.includes('AK_MASTER'));
      const body = JSON.parse(masterCall!.opts.body);
      expect(body.method).toBe('list_vault_files');
      expect(body.params.folderId).toBe('attachments_folder_xyz');
    });
  });

  describe('saveSchoolVaultFile: Master Worker Vault Gateway RPC', () => {
    it('delegates saving Category 1 files to Master Worker save_vault_file', async () => {
      (globalThis as any).fetch = vi.fn(async (url: string, opts?: any) => {
        fetchHistory.push({ url, opts });
        if (url.includes('script.google.com/macros/s/AK_MASTER/exec')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              jsonrpc: '2.0',
              id: 1,
              result: {
                success: true,
                id: 'saved_file_999',
                created: true,
                duplicatesTrashed: 0
              }
            })
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      const res = await PersonalDriveService.saveSchoolVaultFile(
        'folder_target_456',
        'classroom_data.json',
        { test: 'data' }
      );

      expect(res.success).toBe(true);
      expect(res.id).toBe('saved_file_999');

      const masterCall = fetchHistory.find(h => h.url.includes('AK_MASTER'));
      const body = JSON.parse(masterCall!.opts.body);
      expect(body.method).toBe('save_vault_file');
      expect(body.params.folderId).toBe('folder_target_456');
      expect(body.params.fileName).toBe('classroom_data.json');
    });
  });

  describe('downloadDriveFileContent: Direct to Worker without Direct Drive REST v3', () => {
    it('calls get_file_blob directly on worker without attempting direct Drive REST v3', async () => {
      const sampleText = 'Hello World Attachment';
      const base64Data = btoa(sampleText);

      (globalThis as any).fetch = vi.fn(async (url: string, opts?: any) => {
        fetchHistory.push({ url, opts });
        if (url.includes('student_worker_url')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              jsonrpc: '2.0',
              id: 1,
              result: {
                base64: base64Data,
                mimeType: 'application/pdf',
                name: 'Homework.pdf'
              }
            })
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      const dlResult = await PersonalDriveService.downloadDriveFileContent(
        'drive_file_id_789',
        'mock_student_token',
        'https://script.google.com/macros/s/student_worker_url/exec?accessKey=StudentKey',
        'mock_script_id',
        'mock_parent_token'
      );

      expect(dlResult).not.toBeNull();
      expect(dlResult!.mimeType).toBe('application/pdf');
      expect(dlResult!.fileName).toBe('Homework.pdf');
      expect(dlResult!.bytes).toBeDefined();

      // Zero direct Drive REST v3 calls
      const driveRestCalls = fetchHistory.filter(h => h.url.includes('googleapis.com/drive'));
      expect(driveRestCalls.length).toBe(0);

      // Verify get_file_blob call
      const workerCall = fetchHistory.find(h => h.url.includes('student_worker_url'));
      expect(workerCall).toBeDefined();
      const body = JSON.parse(workerCall!.opts.body);
      expect(body.method).toBe('get_file_blob');
      expect(body.params.fileId).toBe('drive_file_id_789');
    });
  });

  describe('claimFullParentVaultOwnership: Safe No-Op', () => {
    it('is deactivated as a safe no-op returning 0 migrated and 0 purged without crawling Drive', async () => {
      (globalThis as any).fetch = vi.fn();

      const result = await PersonalDriveService.claimFullParentVaultOwnership('parent_token', 'student_token');

      expect(result).toEqual({ migratedCount: 0, purgedCount: 0 });
      expect((globalThis as any).fetch).not.toHaveBeenCalled();
    });
  });
});
