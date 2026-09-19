import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PersonalDriveService } from '../src/services/personalDriveService';

describe('Step 4 Show Recent Uploads from Google Drive Filter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('filters out folders and files located inside our main Google Drive folder or any of its subfolders', async () => {
    const rootFolderId = 'folder_kids_data_root';
    const yearFolderId = 'folder_year_2026';
    const kidFolderId = 'folder_atharva_vault';
    const attachmentsFolderId = 'folder_classroom_attachments';
    const externalFolderId = 'folder_user_downloads';

    // Mock getOrCreateRootFolder
    vi.spyOn(PersonalDriveService, 'getOrCreateRootFolder').mockResolvedValue({
      id: rootFolderId,
      webViewLink: 'https://drive.google.com/folders/' + rootFolderId
    });

    // Mock fetchWithAuth for folder hierarchy discovery and file listing
    vi.spyOn(PersonalDriveService, 'fetchWithAuth').mockImplementation(async (url: string) => {
      // 1. Folder hierarchy discovery query
      if (url.includes("mimeType%20%3D%20'application%2Fvnd.google-apps.folder'") || url.includes("mimeType = 'application/vnd.google-apps.folder'")) {
        return {
          ok: true,
          json: async () => ({
            files: [
              { id: rootFolderId, parents: ['root'] },
              { id: yearFolderId, parents: [rootFolderId] },
              { id: kidFolderId, parents: [yearFolderId] },
              { id: attachmentsFolderId, parents: [kidFolderId] },
              { id: externalFolderId, parents: ['root'] } // User's own folder outside main folder
            ]
          })
        } as any;
      }

      // 2. Recent files query
      if (url.includes('orderBy=createdTime%20desc') || url.includes('orderBy=createdTime desc')) {
        return {
          ok: true,
          json: async () => ({
            files: [
              // Inside main folder subtree -> MUST BE FILTERED OUT
              { id: 'f_root_config', name: 'K.I.D.S._Data_config.json', mimeType: 'application/json', parents: [rootFolderId], size: '500' },
              { id: 'f_profile_cfg', name: 'profiles_config.json', mimeType: 'application/json', parents: [rootFolderId], size: '1200' },
              { id: 'f_classroom_json', name: 'classroom_data.json', mimeType: 'application/json', parents: [kidFolderId], size: '4500' },
              { id: 'f_worksheet_pdf', name: 'fractions_worksheet.pdf', mimeType: 'application/pdf', parents: [attachmentsFolderId], size: '150000' },
              { id: 'f_portal_receipt', name: 'fee_receipt_q1.pdf', mimeType: 'application/pdf', parents: [kidFolderId], size: '85000' },
              { id: 'f_ocr_index', name: 'ocr_search_index.json', mimeType: 'application/json', parents: [kidFolderId], size: '25000' },

              // Folder item itself -> MUST BE FILTERED OUT
              { id: externalFolderId, name: 'My Other Folder', mimeType: 'application/vnd.google-apps.folder', parents: ['root'] },

              // Files OUTSIDE main folder -> MUST BE INCLUDED
              { id: 'f_whatsapp_zip', name: 'WhatsApp Chat - Grade 5 Parents.zip', mimeType: 'application/zip', parents: ['root'], size: '2500000', createdTime: '2026-09-12T10:00:00Z' },
              { id: 'f_chat_txt', name: 'chat_export_bus_route.txt', mimeType: 'text/plain', parents: [externalFolderId], size: '45000', createdTime: '2026-09-12T09:30:00Z' }
            ]
          })
        } as any;
      }

      return { ok: false, status: 404, json: async () => ({}) } as any;
    });

    const results = await PersonalDriveService.searchWhatsAppExports('mock_token', true);

    // Verify results ONLY contain files outside our main folder
    expect(results).toHaveLength(2);
    expect(results.map(r => r.name)).toEqual([
      'WhatsApp Chat - Grade 5 Parents.zip',
      'chat_export_bus_route.txt'
    ]);

    // Verify none of the files inside K.I.D.S. Data or any of its subfolders are included
    const resultNames = results.map(r => r.name);
    expect(resultNames).not.toContain('K.I.D.S._Data_config.json');
    expect(resultNames).not.toContain('profiles_config.json');
    expect(resultNames).not.toContain('classroom_data.json');
    expect(resultNames).not.toContain('fractions_worksheet.pdf');
    expect(resultNames).not.toContain('fee_receipt_q1.pdf');
    expect(resultNames).not.toContain('ocr_search_index.json');
    expect(resultNames).not.toContain('My Other Folder');

    // Verify human-readable sizes were computed
    expect(results[0].sizeReadable).toBe('2.4 MB');
    expect(results[1].sizeReadable).toBe('43.9 KB');
  });
});
