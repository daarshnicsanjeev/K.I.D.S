import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GasProvisionerService } from '../src/services/gasProvisioner';
import { PersonalDriveService } from '../src/services/personalDriveService';

describe('Master Worker & Step 1 Deduplication', () => {
  let mockStorage: Record<string, any> = {};

  beforeEach(() => {
    mockStorage = {};
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
        getManifest: vi.fn(() => ({ oauth2: { client_id: 'mock_client_id' } }))
      }
    };
    (globalThis as any).fetch = vi.fn();
  });

  it('PersonalDriveService.findFileByName searches Google Drive correctly', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        files: [
          { id: 'file_pdf_123', name: 'Curriculum_Schedule.pdf', mimeType: 'application/pdf' }
        ]
      })
    });

    const result = await PersonalDriveService.findFileByName(
      'token_123',
      'Curriculum_Schedule.pdf',
      'application/pdf'
    );

    expect(result).not.toBeNull();
    expect(result?.id).toBe('file_pdf_123');
    expect(result?.name).toBe('Curriculum_Schedule.pdf');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("Curriculum_Schedule.pdf"),
      expect.any(Object)
    );
  });

  it('PersonalDriveService.trashFile moves file to Google Drive trash', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 'file_trash_123', trashed: true })
    });

    const ok = await PersonalDriveService.trashFile('token_123', 'file_trash_123');
    expect(ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/drive/v3/files/file_trash_123'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ trashed: true })
      })
    );
  });

  it('PersonalDriveService.deleteFilePermanently permanently purges file via DELETE', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 204
    });

    const res = await PersonalDriveService.deleteFilePermanently('token_123', 'file_del_123');
    expect(res.success).toBe(true);
    expect(res.status).toBe(204);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/drive/v3/files/file_del_123?supportsAllDrives=true'),
      expect.objectContaining({
        method: 'DELETE'
      })
    );
  });

  it('PersonalDriveService.saveRootConfig preserves masterWorkerScriptId and deployment metadata', async () => {
    mockStorage['personal_drive_folder_id'] = 'root_folder_789';
    mockStorage['personal_drive_account_email'] = 'parent@gmail.com';
    mockStorage['master_worker_script_id'] = 'script_abc_123';
    mockStorage['master_worker_deployment_id'] = 'dep_xyz_456';
    mockStorage['master_worker_deployment_url'] = 'https://script.google.com/macros/s/dep_xyz_456/exec';

    vi.spyOn(PersonalDriveService, 'getOrCreateRootFolder').mockResolvedValue({ id: 'root_folder_789' });
    vi.spyOn(PersonalDriveService, 'readJsonFileInFolder').mockResolvedValue(null);

    let savedData: any = null;
    vi.spyOn(PersonalDriveService, 'saveJsonFileInFolder').mockImplementation(async (_t, _fId, fileName, content) => {
      if (fileName === 'K.I.D.S._Data_config.json') {
        savedData = content;
      }
    });

    await PersonalDriveService.saveRootConfig('token_123');

    expect(savedData).not.toBeNull();
    expect(savedData.masterWorkerScriptId).toBe('script_abc_123');
    expect(savedData.masterWorkerDeploymentId).toBe('dep_xyz_456');
    expect(savedData.masterWorkerDeploymentUrl).toBe('https://script.google.com/macros/s/dep_xyz_456/exec');
  });

  it('GasProvisionerService.getMasterWorkerStatus falls back to root config when storage is empty', async () => {
    vi.spyOn(PersonalDriveService, 'getValidToken').mockResolvedValue('token_123');
    vi.spyOn(PersonalDriveService, 'getOrCreateRootFolder').mockResolvedValue({ id: 'root_folder_789' });
    vi.spyOn(PersonalDriveService, 'readJsonFileInFolder').mockResolvedValue({
      masterWorkerScriptId: 'script_from_root_config',
      masterWorkerDeploymentUrl: 'https://script.google.com/macros/s/exec'
    });

    const status = await GasProvisionerService.getMasterWorkerStatus('token_123');

    expect(status.isDeployed).toBe(true);
    expect(status.scriptId).toBe('script_from_root_config');
  });

  it('GasProvisionerService.provisionPersonalMasterWorker reuses verified master_worker_script_id when deployed', async () => {
    mockStorage['master_worker_script_id'] = 'existing_verified_script';

    vi.spyOn(PersonalDriveService, 'readJsonFileInFolder').mockResolvedValue({});
    vi.spyOn(GasProvisionerService, 'verifyScriptAlive').mockResolvedValue(true);

    const createProjectSpy = vi.spyOn(GasProvisionerService as any, 'createProject');
    vi.spyOn(GasProvisionerService as any, 'updateProjectContent').mockResolvedValue({});
    vi.spyOn(GasProvisionerService as any, 'createVersion').mockResolvedValue({ versionNumber: 1 });
    vi.spyOn(GasProvisionerService as any, 'createDeployment').mockResolvedValue({
      deploymentId: 'dep_1',
      entryPoints: [{ entryPointType: 'WEB_APP', webApp: { url: 'https://script.google.com/macros/s/dep_1/exec' } }]
    });
    vi.spyOn(GasProvisionerService as any, 'runTestAuth').mockResolvedValue({ authorized: true });
    vi.spyOn(GasProvisionerService as any, 'ensureScriptAuthorized').mockResolvedValue(true);
    vi.spyOn(PersonalDriveService, 'saveRootConfig').mockResolvedValue();

    const res = await GasProvisionerService.provisionPersonalMasterWorker('parent_token', 'root_id');

    expect(res.success).toBe(true);
    expect(res.scriptId).toBe('existing_verified_script');
    expect(createProjectSpy).not.toHaveBeenCalled();
  });

  it('GasProvisionerService.provisionPersonalMasterWorker trashes incomplete project to Drive Trash on failure', async () => {
    mockStorage = {};

    vi.spyOn(PersonalDriveService, 'readJsonFileInFolder').mockResolvedValue({});
    vi.spyOn(GasProvisionerService as any, 'createProject').mockResolvedValue({ scriptId: 'failed_script_789' });
    vi.spyOn(GasProvisionerService as any, 'updateProjectContent').mockRejectedValue(new Error('Auth failed'));
    const deleteSpy = vi.spyOn(GasProvisionerService as any, 'deleteScriptProject').mockResolvedValue(true);
    const deletePermSpy = vi.spyOn(PersonalDriveService, 'deleteFilePermanently').mockResolvedValue({ success: true, status: 204 });

    await expect(GasProvisionerService.provisionPersonalMasterWorker('parent_token', 'root_id')).rejects.toThrow('Auth failed');

    expect(deleteSpy).toHaveBeenCalledWith('failed_script_789', 'parent_token', '');
    expect(deletePermSpy).toHaveBeenCalledWith('parent_token', 'failed_script_789');
    expect(mockStorage['pending_master_worker_script_id']).toBeUndefined();
    expect(mockStorage['master_worker_script_id']).toBeUndefined();
  });
});
