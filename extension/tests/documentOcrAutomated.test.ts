import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vm from 'vm';
import * as fs from 'fs';
import * as path from 'path';
import { PersonalDriveService } from '../src/services/personalDriveService';

describe('Fully Automated Document OCR & Search Engine', () => {
  let gasContext: any;
  let ocrService: any;
  let mockDriveFiles: Record<string, any> = {};
  let localStorageMock: Record<string, any> = {};

  beforeEach(() => {
    mockDriveFiles = {};
    localStorageMock = {};

    (global as any).chrome = {
      runtime: {
        getManifest: () => ({ oauth2: { client_id: 'test-client' } }),
        getPlatformInfo: vi.fn().mockResolvedValue({ os: 'win', arch: 'x86-64' }),
        lastError: null
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

    // Load DocumentOcrService source from GAS file
    const ocrFilePath = path.resolve(__dirname, '../../gas-mcp-server/src/DocumentOcrService.gs');
    const ocrSource = fs.readFileSync(ocrFilePath, 'utf8');

    // Create realistic GAS VM sandbox
    gasContext = {
      McpLogger: {
        log: vi.fn()
      },
      ScriptApp: {
        getOAuthToken: () => 'mock_oauth_token'
      },
      UrlFetchApp: {
        fetch: vi.fn((url: string, opts: any) => {
          if (url.includes('/copy?ocr=true')) {
            return {
              getResponseCode: () => 200,
              getContentText: () => JSON.stringify({ id: 'temp_ocr_doc_123' })
            };
          }
          if (url.includes('/export?mimeType=text%2Fplain')) {
            return {
              getResponseCode: () => 200,
              getContentText: () => 'OCR Extracted Text: Bring your geometry compass and ruler tomorrow for math class.'
            };
          }
          return { getResponseCode: () => 404, getContentText: () => '{}' };
        })
      },
      DriveApp: {
        getFileById: vi.fn((id: string) => {
          if (mockDriveFiles[id]) return mockDriveFiles[id];
          return {
            getId: () => id,
            getName: () => 'sample_file.pdf',
            getUrl: () => `https://drive.google.com/file/d/${id}/view`,
            setTrashed: vi.fn(),
            getParents: () => ({
              hasNext: () => false,
              next: () => null
            })
          };
        })
      },
      DocumentApp: {
        openById: vi.fn((id: string) => ({
          getBody: () => ({
            getText: () => {
              if (id === 'temp_ocr_doc_123') {
                return 'OCR Extracted Text: Bring your geometry compass and ruler tomorrow for math class.';
              }
              return 'This is a Google Doc containing school history project notes about the Indus Valley Civilization.';
            }
          })
        }))
      },
      SpreadsheetApp: {
        openById: vi.fn((id: string) => ({
          getSheets: () => [{
            getDataRange: () => ({
              getDisplayValues: () => [
                ['Subject', 'Marks', 'Grade'],
                ['Mathematics', '95', 'A1'],
                ['Science', '92', 'A1']
              ]
            })
          }]
        }))
      }
    };

    vm.createContext(gasContext);
    vm.runInContext(ocrSource, gasContext);
    ocrService = gasContext.DocumentOcrService;
  });

  it('correctly detects native selectable text layer in digital PDFs and skips OCR', () => {
    // Digital PDF with font and Tj / TJ text stream operators (> 80 legible chars)
    const digitalPdfStream = `
      %PDF-1.4
      1 0 obj
      << /Type /Catalog /Pages 2 0 R >>
      endobj
      4 0 obj
      << /Length 250 >>
      stream
      BT
      /F1 12 Tf
      [(Welcome to) -10 (Grade 7 Mathematics)] TJ
      (Chapter 4: Linear Equations with variables x and y.) Tj
      (Solve all 20 homework problems given in the exercise sheet.) Tj
      (Due date for submission is Friday morning.) Tj
      ET
      endstream
      endobj
    `;

    const digitalBlob = {
      getDataAsString: () => digitalPdfStream
    };

    const result = ocrService.hasNativeTextLayer(digitalBlob);
    expect(result.hasText).toBe(true);
    expect(result.extractedText).toContain('Grade 7 Mathematics');
    expect(result.extractedText).toContain('Linear Equations');
  });

  it('detects scanned raster PDFs lacking text layers and flags them for Drive OCR', () => {
    // Scanned PDF contains only /XObject /Image and no Tj/TJ text operators
    const scannedPdfStream = `
      %PDF-1.4
      1 0 obj
      << /Type /Page /Resources << /XObject << /Im0 4 0 R >> >> >>
      endobj
      4 0 obj
      << /Type /XObject /Subtype /Image /Width 1600 /Height 2400 /BitsPerComponent 8 /ColorSpace /DeviceRGB /Length 98450 >>
      stream
      \x89PNG\r\n\x1a\n...binary bitmap data...
      endstream
      endobj
    `;

    const scannedBlob = {
      getDataAsString: () => scannedPdfStream
    };

    const result = ocrService.hasNativeTextLayer(scannedBlob);
    expect(result.hasText).toBe(false);
    expect(result.extractedText).toBe('');
  });

  it('smart routing skips OCR for Google Docs, Sheets, and Text files', () => {
    // 1. Google Doc
    const gDocFile = {
      getId: () => 'gdoc_101',
      getName: () => 'History Project.gdoc',
      getMimeType: () => 'application/vnd.google-apps.document'
    };
    const gDocRes = ocrService.extractDocumentText(gDocFile);
    expect(gDocRes.isOcr).toBe(false);
    expect(gDocRes.text).toContain('Indus Valley Civilization');

    // 2. Google Sheet
    const gSheetFile = {
      getId: () => 'gsheet_102',
      getName: () => 'Report Card.gsheet',
      getMimeType: () => 'application/vnd.google-apps.spreadsheet'
    };
    const gSheetRes = ocrService.extractDocumentText(gSheetFile);
    expect(gSheetRes.isOcr).toBe(false);
    expect(gSheetRes.text).toContain('Mathematics | 95 | A1');

    // 3. Plain Text File
    const textFile = {
      getId: () => 'txt_103',
      getName: () => 'circular.txt',
      getMimeType: () => 'text/plain',
      getBlob: () => ({ getDataAsString: () => 'Parent-Teacher Meeting scheduled for Saturday at 10 AM.' })
    };
    const txtRes = ocrService.extractDocumentText(textFile);
    expect(txtRes.isOcr).toBe(false);
    expect(txtRes.text).toContain('Parent-Teacher Meeting');
  });

  it('routes scanned PDFs and images to performDriveOcr with isOcr=true', () => {
    // 1. Image file (e.g. WhatsApp blackboard photo)
    const imageFile = {
      getId: () => 'img_201',
      getName: () => 'blackboard_notes.jpg',
      getMimeType: () => 'image/jpeg'
    };
    const imgRes = ocrService.extractDocumentText(imageFile);
    expect(imgRes.isOcr).toBe(true);
    expect(imgRes.text).toContain('geometry compass and ruler');

    // 2. Scanned raster PDF (no text layer)
    const scannedPdfFile = {
      getId: () => 'scan_202',
      getName: () => 'scanned_worksheet.pdf',
      getMimeType: () => 'application/pdf',
      getBlob: () => ({
        getDataAsString: () => '%PDF-1.4 image stream only without text operators'
      })
    };
    const pdfRes = ocrService.extractDocumentText(scannedPdfFile);
    expect(pdfRes.isOcr).toBe(true);
    expect(pdfRes.text).toContain('geometry compass and ruler');
  });

  it('indexes documents and provides scored keyword search across Classroom, Gmail, and WhatsApp', () => {
    let indexContent = JSON.stringify({
      version: '1.0.0',
      documents: []
    });

    const mockIndexFile = {
      getContent: () => indexContent,
      setContent: (c: string) => { indexContent = c; }
    };

    const mockFolder = {
      getFilesByName: vi.fn((name: string) => {
        if (name === 'ocr_search_index.json') {
          return { hasNext: () => true, next: () => mockIndexFile };
        }
        return { hasNext: () => false, next: () => null };
      }),
      createFile: vi.fn(() => mockIndexFile)
    };

    // Index 1: Classroom Math Worksheet (Digital PDF)
    ocrService.indexDocument(mockFolder, {
      getId: () => 'cw_1',
      getName: () => 'Linear_Equations_Assignment.pdf',
      getMimeType: () => 'application/pdf',
      getUrl: () => 'https://drive.google.com/cw_1',
      getBlob: () => ({
        getDataAsString: () => `[(Grade 7) -5 (Algebra)] TJ (Linear equations problem set: solve for x: 3x + 5 = 20) Tj (Graph lines on coordinate plane) Tj`
      })
    }, 'classroom');

    // Index 2: Email Circular (Plain Text)
    ocrService.indexDocument(mockFolder, {
      getId: () => 'em_1',
      getName: () => 'Annual_Sports_Day_Notice.txt',
      getMimeType: () => 'text/plain',
      getUrl: () => 'https://drive.google.com/em_1',
      getBlob: () => ({
        getDataAsString: () => 'Notice: Annual Sports Day will be held on December 15th. Registration fee is Rs 500.'
      })
    }, 'email');

    // Index 3: WhatsApp Photo (Image OCR)
    ocrService.indexDocument(mockFolder, {
      getId: () => 'wa_1',
      getName: () => 'Atharva_board_diagram.jpg',
      getMimeType: () => 'image/jpeg',
      getUrl: () => 'https://drive.google.com/wa_1'
    }, 'whatsapp');

    // Verify index structure
    const parsedIndex = JSON.parse(indexContent);
    expect(parsedIndex.documents.length).toBe(3);

    // Search 1: "linear equations"
    const search1 = ocrService.searchVaultDocuments(mockFolder, 'linear equations');
    expect(search1.count).toBeGreaterThanOrEqual(1);
    expect(search1.results[0].fileId).toBe('cw_1');
    expect(search1.results[0].fileName).toBe('Linear_Equations_Assignment.pdf');
    expect(search1.results[0].excerpt.toLowerCase()).toContain('linear equations');

    // Search 2: "sports day fee"
    const search2 = ocrService.searchVaultDocuments(mockFolder, 'sports day fee');
    expect(search2.count).toBeGreaterThanOrEqual(1);
    expect(search2.results[0].fileId).toBe('em_1');
    expect(search2.results[0].source).toBe('email');

    // Search 3: "geometry compass" (matched in WhatsApp OCR result)
    const search3 = ocrService.searchVaultDocuments(mockFolder, 'geometry compass');
    expect(search3.count).toBeGreaterThanOrEqual(1);
    expect(search3.results[0].fileId).toBe('wa_1');
    expect(search3.results[0].source).toBe('whatsapp');
    expect(search3.results[0].isOcr).toBe(true);

    // Search 4: Unmatched query
    const search4 = ocrService.searchVaultDocuments(mockFolder, 'astronomy telescope');
    expect(search4.count).toBe(0);
    expect(search4.results).toEqual([]);
  });

  it('PersonalDriveService triggers Master OCR index automatically when uploading WhatsApp attachments', async () => {
    localStorageMock['master_worker_deployment_url'] = 'https://script.google.com/macros/s/master_deployment_id/exec';
    localStorageMock['personal_drive_auth_token'] = 'test_token';

    let rpcCalls: Array<{ method: string; params: any }> = [];

    // Mock fetch for Drive multipart upload & Master Worker RPC
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (url: any, opts: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('files?uploadType=multipart')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'uploaded_wa_file_999',
            name: 'Atharva_math_notes.png',
            webViewLink: 'https://drive.google.com/uploaded_wa_file_999'
          })
        } as any;
      }
      if (urlStr.includes('/macros/s/master_deployment_id/exec')) {
        const payload = JSON.parse(opts.body);
        rpcCalls.push({ method: payload.method, params: payload.params });
        return {
          ok: true,
          status: 200,
          json: async () => ({
            jsonrpc: '2.0',
            result: { success: true }
          })
        } as any;
      }
      // Differentiate folder search from file name search
      if (urlStr.includes('mimeType') || urlStr.includes('parents')) {
        if (urlStr.includes('name = \'') && urlStr.includes('.png')) {
          // File search: not found, proceed to upload
          return {
            ok: true,
            status: 200,
            json: async () => ({ files: [] })
          } as any;
        }
        // Folder search: found attachments folder
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'attachments_folder_id', name: 'attachments' }] })
        } as any;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ files: [] })
      } as any;
    });

    try {
      const uploadRes = await PersonalDriveService.uploadAttachmentFile(
        'mock_token',
        {
          name: 'math_notes.png',
          mimeType: 'image/png',
          base64Content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        },
        'Atharva',
        'Grade 7 Parents'
      );

      expect(uploadRes).not.toBeNull();
      expect(uploadRes?.fileId).toBe('uploaded_wa_file_999');

      // Wait a tick for background async triggerMasterOcrIndex to resolve
      await new Promise(r => setTimeout(r, 60));

      // Verify that triggerMasterOcrIndex was dispatched to Master Worker
      const ocrCall = rpcCalls.find(c => c.method === 'index_whatsapp_media');
      expect(ocrCall).toBeDefined();
      expect(ocrCall?.params.fileId).toBe('uploaded_wa_file_999');
      expect(ocrCall?.params.childName).toBe('Atharva');
      expect(ocrCall?.params.source).toBe('whatsapp');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('PersonalDriveService.triggerMasterVaultOcrIndexing executes run_vault_ocr_indexing on Master Worker', async () => {
    localStorageMock['master_worker_deployment_url'] = 'https://script.google.com/macros/s/master_deployment_id/exec';

    let rpcMethodCalled = '';
    let rpcParamsCalled: any = null;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (url: any, opts: any) => {
      const payload = JSON.parse(opts.body);
      rpcMethodCalled = payload.method;
      rpcParamsCalled = payload.params;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          jsonrpc: '2.0',
          result: { success: true, processed: 8, totalPendingRemaining: 0, totalIndexed: 25 }
        })
      } as any;
    });

    try {
      const result = await PersonalDriveService.triggerMasterVaultOcrIndexing('kid_folder_123', 15);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.processed).toBe(8);
      expect(rpcMethodCalled).toBe('run_vault_ocr_indexing');
      expect(rpcParamsCalled.targetFolderId).toBe('kid_folder_123');
      expect(rpcParamsCalled.maxBatch).toBe(15);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('PersonalDriveService.searchVaultDocuments executes search_vault_documents on Master Worker', async () => {
    localStorageMock['master_worker_deployment_url'] = 'https://script.google.com/macros/s/master_deployment_id/exec';

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (url: any, opts: any) => {
      const payload = JSON.parse(opts.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          jsonrpc: '2.0',
          result: {
            success: true,
            query: payload.params.query,
            totalMatches: 1,
            matches: [
              {
                fileId: 'f_123',
                fileName: 'Linear_Equations.pdf',
                source: 'classroom',
                score: 15,
                excerpt: 'Solve for x: 2x + 4 = 10'
              }
            ]
          }
        })
      } as any;
    });

    try {
      const searchRes = await PersonalDriveService.searchVaultDocuments('Linear Equations');
      expect(searchRes.success).toBe(true);
      expect(searchRes.totalMatches).toBe(1);
      expect(searchRes.matches[0].fileName).toBe('Linear_Equations.pdf');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('runAutonomousVaultOcr in Code.gs automatically self-schedules continuation until pending files reach 0', () => {
    const codeFilePath = path.resolve(__dirname, '../../gas-mcp-server/src/Code.gs');
    const code = fs.readFileSync(codeFilePath, 'utf8');

    let triggerCreated = false;
    let triggerAfterMs = 0;
    let deletedTriggers: string[] = [];

    let mockPending = 25;
    const sandbox = {
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (k: string) => {
            if (k === 'multi_child_school_registry') {
              return JSON.stringify({
                children: [{ kidName: 'Atharva', targetFolderId: 'kid_folder_123' }]
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
        getFolderById: (id: string) => ({
          getId: () => id,
          isTrashed: () => false
        })
      },
      DocumentOcrService: {
        runAutomatedVaultIndexing: (folder: any, batch: number) => {
          mockPending = Math.max(0, mockPending - batch);
          return {
            success: true,
            processed: batch,
            totalPendingRemaining: mockPending
          };
        }
      },
      ScriptApp: {
        getProjectTriggers: () => [],
        deleteTrigger: (trig: any) => { deletedTriggers.push(trig.getHandlerFunction()); },
        newTrigger: (fnName: string) => ({
          timeBased: () => ({
            after: (ms: number) => ({
              create: () => {
                triggerCreated = true;
                triggerAfterMs = ms;
              }
            })
          })
        })
      },
      McpLogger: {
        log: () => {}
      }
    };

    const ctx = vm.createContext(sandbox);

    // Pass 1: mockPending = 25 -> Remaining = 10 -> Continuation trigger created for 20s
    vm.runInContext(code + '\nocrRes1 = runAutonomousVaultOcr();', ctx);
    const res1 = (sandbox as any).ocrRes1;
    expect(res1.success).toBe(true);
    expect(res1.totalRemaining).toBe(10);
    expect(triggerCreated).toBe(true);
    expect(triggerAfterMs).toBe(20000);

    // Pass 2: Remaining = 0 -> All done -> No continuation trigger created
    triggerCreated = false;
    vm.runInContext(code + '\nocrRes2 = runAutonomousVaultOcr();', ctx);
    const res2 = (sandbox as any).ocrRes2;
    expect(res2.success).toBe(true);
    expect(res2.totalRemaining).toBe(0);
    expect(triggerCreated).toBe(false);
  });

  it('preserves all indexed documents across multiple calls using native getBlob().getDataAsString() without wiping', () => {
    let persistedIndexString = JSON.stringify({
      version: '1.0.0',
      totalIndexed: 0,
      documents: []
    });

    // Real DriveApp.File object: NO getContent() method, only getBlob().getDataAsString() and setContent()
    const mockRealDriveFile = {
      getBlob: () => ({
        getDataAsString: () => persistedIndexString
      }),
      setContent: (c: string) => { persistedIndexString = c; }
    };

    const mockFolder = {
      getFilesByName: vi.fn((name: string) => {
        if (name === 'ocr_search_index.json') {
          return { hasNext: () => true, next: () => mockRealDriveFile };
        }
        return { hasNext: () => false, next: () => null };
      }),
      createFile: vi.fn(() => mockRealDriveFile)
    };

    // Index Document 1
    const doc1 = ocrService.indexDocument(mockFolder, {
      getId: () => 'file_doc_1',
      getName: () => 'Worksheet_Math_Addition.pdf',
      getMimeType: () => 'application/pdf',
      getUrl: () => 'https://drive.google.com/file_doc_1',
      getBlob: () => ({
        getDataAsString: () => `(Grade 3 Math Worksheet: 12 + 15 = 27) Tj (Practice basic addition) Tj`
      })
    }, 'classroom');

    expect(doc1).not.toBeNull();
    let parsedIndex = JSON.parse(persistedIndexString);
    expect(parsedIndex.documents.length).toBe(1);
    expect(parsedIndex.documents[0].fileId).toBe('file_doc_1');

    // Index Document 2: MUST NOT wipe Document 1!
    const doc2 = ocrService.indexDocument(mockFolder, {
      getId: () => 'file_doc_2',
      getName: () => 'Circular_Holiday_Notice.pdf',
      getMimeType: () => 'application/pdf',
      getUrl: () => 'https://drive.google.com/file_doc_2',
      getBlob: () => ({
        getDataAsString: () => `(School Notice: School remains closed on Friday for festival) Tj`
      })
    }, 'email');

    expect(doc2).not.toBeNull();
    parsedIndex = JSON.parse(persistedIndexString);
    expect(parsedIndex.documents.length).toBe(2);
    expect(parsedIndex.documents.map((d: any) => d.fileId)).toEqual(['file_doc_1', 'file_doc_2']);

    // Index Document 3: MUST NOT wipe Document 1 and 2!
    const doc3 = ocrService.indexDocument(mockFolder, {
      getId: () => 'file_doc_3',
      getName: () => 'Science_Circuits.pdf',
      getMimeType: () => 'application/pdf',
      getUrl: () => 'https://drive.google.com/file_doc_3',
      getBlob: () => ({
        getDataAsString: () => `(Electric circuits and switches: series and parallel) Tj`
      })
    }, 'classroom');

    expect(doc3).not.toBeNull();
    parsedIndex = JSON.parse(persistedIndexString);
    expect(parsedIndex.documents.length).toBe(3);
    expect(parsedIndex.totalIndexed).toBe(3);
    expect(parsedIndex.documents.map((d: any) => d.fileId)).toEqual(['file_doc_1', 'file_doc_2', 'file_doc_3']);

    // Re-indexing Document 1 returns cached entry with 0 duplicate additions
    const doc1Cached = ocrService.indexDocument(mockFolder, {
      getId: () => 'file_doc_1',
      getName: () => 'Worksheet_Math_Addition.pdf',
      getMimeType: () => 'application/pdf',
      getUrl: () => 'https://drive.google.com/file_doc_1'
    }, 'classroom');

    expect(doc1Cached.fileId).toBe('file_doc_1');
    parsedIndex = JSON.parse(persistedIndexString);
    expect(parsedIndex.documents.length).toBe(3);
  });
});
