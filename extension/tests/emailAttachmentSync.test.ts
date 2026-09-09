import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PersonalDriveService } from '../src/services/personalDriveService';

describe('School Email Attachment Synchronization Engine', () => {
  let createdAlarms: Record<string, any> = {};
  let clearedAlarms: string[] = [];
  let localStorageMock: Record<string, any> = {};
  let savedFiles: Array<{ folderId: string; fileName: string; bytes: any; mimeType: string }> = [];

  beforeEach(() => {
    createdAlarms = {};
    clearedAlarms = [];
    localStorageMock = {};
    savedFiles = [];

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

    vi.spyOn(PersonalDriveService, 'saveBinaryFileInFolder').mockImplementation(async (tok, folderId, fileName, bytes, mimeType) => {
      savedFiles.push({ folderId, fileName, bytes, mimeType });
      return { id: `file-${fileName}` };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('syncs direct email attachments and linked drive circulars into Parent Vault with 100% Parent Ownership', async () => {
    vi.spyOn(PersonalDriveService, 'getOrCreateEmailsFolder').mockResolvedValue({
      id: 'mock-emails-folder-id',
      attachmentsFolderId: 'mock-attachments-folder-id',
      kidFolderId: 'mock-kid-folder-id'
    });

    vi.spyOn(PersonalDriveService, 'readJsonFileInFolder').mockResolvedValue({
      totalEmails: 2,
      emails: [
        {
          id: 'msg-001',
          subject: 'Fee Circular Term 1',
          attachments: [
            {
              name: 'fee_schedule.pdf',
              targetName: 'Fee_Circular_Term_1_fee_schedule.pdf',
              mimeType: 'application/pdf',
              size: 1024,
              messageId: 'msg-001',
              attachmentIndex: 0
            }
          ]
        },
        {
          id: 'msg-002',
          subject: 'Annual Day Circular',
          attachments: [
            {
              name: 'costume_guidelines.pdf',
              targetName: 'Annual_Day_Circular_costume_guidelines.pdf',
              fileId: 'drive-doc-12345',
              mimeType: 'application/pdf',
              size: 2048
            }
          ]
        }
      ]
    });

    // Mock existing files: empty initially
    vi.spyOn(PersonalDriveService, 'listFilesInFolder').mockResolvedValue([]);

    // Mock downloadGmailAttachment
    vi.spyOn(PersonalDriveService, 'downloadGmailAttachment').mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]).buffer,
      mimeType: 'application/pdf',
      fileName: 'Fee_Circular_Term_1_fee_schedule.pdf'
    });

    // Mock downloadDriveFileContent
    vi.spyOn(PersonalDriveService, 'downloadDriveFileContent').mockResolvedValue({
      bytes: new Uint8Array([4, 5, 6]).buffer,
      mimeType: 'application/pdf',
      fileName: 'Annual_Day_Circular_costume_guidelines.pdf'
    });

    const result = await PersonalDriveService.syncEmailAttachments('mock-parent-token', 'mock-student-token', 'Atharva', '2026-2027');

    expect(result.total).toBe(2);
    expect(result.downloaded).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);

    // Verify both files were saved to the parent attachments folder
    expect(savedFiles.length).toBe(2);
    expect(savedFiles[0].folderId).toBe('mock-attachments-folder-id');
    expect(savedFiles[0].fileName).toBe('Fee_Circular_Term_1_fee_schedule.pdf');
    expect(savedFiles[1].folderId).toBe('mock-attachments-folder-id');
    expect(savedFiles[1].fileName).toBe('Annual_Day_Circular_costume_guidelines.pdf');

    // Verify alarm lifecycle
    expect(chrome.alarms.create).toHaveBeenCalledWith('KEEP_ALIVE_DOWNLOAD_SUPERVISOR', { periodInMinutes: 1 });
    expect(chrome.alarms.clear).toHaveBeenCalledWith('KEEP_ALIVE_DOWNLOAD_SUPERVISOR');
  });

  it('skips attachments that are already present in Parent Vault attachments folder', async () => {
    vi.spyOn(PersonalDriveService, 'getOrCreateEmailsFolder').mockResolvedValue({
      id: 'mock-emails-folder-id',
      attachmentsFolderId: 'mock-attachments-folder-id',
      kidFolderId: 'mock-kid-folder-id'
    });

    vi.spyOn(PersonalDriveService, 'readJsonFileInFolder').mockResolvedValue({
      emails: [
        {
          id: 'msg-001',
          subject: 'Fee Circular Term 1',
          attachments: [
            {
              name: 'fee_schedule.pdf',
              targetName: 'Fee_Circular_Term_1_fee_schedule.pdf',
              mimeType: 'application/pdf',
              messageId: 'msg-001'
            }
          ]
        }
      ]
    });

    // File already exists on Drive
    vi.spyOn(PersonalDriveService, 'listFilesInFolder').mockResolvedValue([
      { id: 'ex-1', name: 'fee_circular_term_1_fee_schedule.pdf' }
    ]);

    const result = await PersonalDriveService.syncEmailAttachments('mock-parent-token', 'mock-student-token', 'Atharva', '2026-2027');

    expect(result.total).toBe(1);
    expect(result.downloaded).toBe(0);
    expect(result.skipped).toBe(1);
    expect(savedFiles.length).toBe(0);
  });
});
