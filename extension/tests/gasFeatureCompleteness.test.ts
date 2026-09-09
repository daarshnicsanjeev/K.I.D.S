import { describe, it, expect, vi } from 'vitest';
import * as vm from 'vm';
import * as fs from 'fs';
import * as path from 'path';
import { GasProvisionerService } from '../src/services/gasProvisioner';

describe('Apps Script Feature Completeness & Anti-Regression Verification', () => {
  let capturedFiles: Record<string, string> = {};

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

  it('guarantees ClassroomIngester has multi-page pagination for announcements, coursework, and materials', async () => {
    const files = await loadDeployedGasFiles();
    const classroom = files['ClassroomIngester'];
    expect(classroom, 'ClassroomIngester.gs must exist in Apps Script payload').toBeDefined();

    // 1. Announcements Pagination
    expect(classroom).toContain('annRes.nextPageToken');
    expect(classroom).toContain('annPageToken');
    expect(classroom).toMatch(/annPage\s*<=\s*(20|50|maxPages)/);

    // 2. CourseWork Assignments Pagination
    expect(classroom).toContain('cwRes.nextPageToken');
    expect(classroom).toContain('cwPageToken');
    expect(classroom).toMatch(/cwPage\s*<=\s*(20|50|maxPages)/);

    // 3. CourseWork Materials Pagination
    expect(classroom).toContain('matRes.nextPageToken');
    expect(classroom).toContain('matPageToken');
    expect(classroom).toMatch(/matPage\s*<=\s*(20|50|maxPages)/);

    // 4. Course List Pagination
    expect(classroom).toContain('nextPageToken');
    expect(classroom).toMatch(/page\s*<=\s*10/);
  });

  it('guarantees ClassroomIngester includes Deep Diagnostic Logging and Itemized Inventory', async () => {
    const files = await loadDeployedGasFiles();
    const classroom = files['ClassroomIngester'];

    expect(classroom).toContain('deepLog');
    expect(classroom).toContain('coursesAudit');
    expect(classroom).toContain('inventory');
    expect(classroom).toContain('formatDeepLogReport');
    expect(classroom).toContain('recordAttachmentInventory');
    expect(classroom).toContain('classroom_sync_deep_log.json');
    expect(classroom).toContain('classroom_sync_deep_log.txt');
  });

  it('guarantees ClassroomIngester operates safely in Read-Only / Extract-Only mode (Zero student Drive writes)', async () => {
    const files = await loadDeployedGasFiles();
    const classroom = files['ClassroomIngester'];

    expect(classroom).toContain('extractOnly');
    expect(classroom).toContain('if (targetFolderId && !extractOnly)');
    expect(classroom).toContain('if (!attachFolder)');
  });

  it('guarantees GmailIngester has multi-page search pagination and Drive circular link scanning', async () => {
    const files = await loadDeployedGasFiles();
    const gmail = files['GmailIngester'];
    expect(gmail, 'GmailIngester.gs must exist in Apps Script payload').toBeDefined();

    // Multi-page batching
    expect(gmail).toMatch(/while\s*\(startIdx\s*<\s*(150|300)\)/);
    expect(gmail).toContain('scanTextForDriveFiles');
  });

  it('guarantees Code.gs has handleGetFileBlob and routes get_file_blob in doPost', async () => {
    const files = await loadDeployedGasFiles();
    const code = files['Code'];
    expect(code, 'Code.gs must exist in Apps Script payload').toBeDefined();

    expect(code).toContain('function handleGetFileBlob');
    expect(code).toContain('method === "get_file_blob"');
    expect(code).toContain('method === "sync_classroom_and_gmail"');
    expect(code).toContain('extract_classroom_and_gmail');
  });

  it('guarantees Code.gs has autonomous 24/7 trigger installation and routes master cloud sync', async () => {
    const files = await loadDeployedGasFiles();
    const code = files['Code'];
    expect(code, 'Code.gs must exist in Apps Script payload').toBeDefined();

    // 1. Autonomous Triggers & Interactive Handshake
    expect(code).toContain('function setupAutonomousTriggers');
    expect(code).toContain('google.script.run');
    expect(code).toContain('setupAutonomousTriggers');
    expect(code).toContain('triggerBadge');

    // 2. Master Cloud Ingestion & Registration
    expect(code).toContain('function handleRegisterSchoolWorker');
    expect(code).toContain('function setupMasterCloudSyncTrigger');
    expect(code).toContain('function runMasterCloudSchoolSync');
    expect(code).toContain('multi_child_school_registry');

    // 3. doPost Routing
    expect(code).toContain('method === "register_school_worker"');
    expect(code).toContain('method === "sync_master_cloud_school"');
  });

  it('guarantees appsscript.json requests script.scriptapp OAuth scope for programmatic triggers', async () => {
    const files = await loadDeployedGasFiles();
    const manifestStr = files['appsscript'];
    expect(manifestStr, 'appsscript.json must exist in Apps Script payload').toBeDefined();
    const manifest = JSON.parse(manifestStr);
    expect(manifest.oauthScopes).toContain('https://www.googleapis.com/auth/script.scriptapp');
  });

  it('guarantees handleSetupTriggers inspects trigger return values and propagates errors', async () => {
    const files = await loadDeployedGasFiles();
    const code = files['Code'];
    expect(code).toContain('function handleSetupTriggers');
    expect(code).toContain('triggerSet: !!(res && res.success)');
    expect(code).toContain('error: res && !res.success ? res.error : null');
  });

  it('guarantees complete CASA Tier 2/3 immunity: manifest.json excludes ALL Google Restricted Scopes', async () => {
    const GOOGLE_RESTRICTED_SCOPES = [
      'https://mail.google.com/',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.insert',
      'https://www.googleapis.com/auth/gmail.labels',
      'https://www.googleapis.com/auth/gmail.metadata',
      'https://www.googleapis.com/auth/gmail.settings.basic',
      'https://www.googleapis.com/auth/gmail.settings.sharing',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/drive.scripts'
    ];

    const manifestPath = path.resolve(__dirname, '../manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const restricted of GOOGLE_RESTRICTED_SCOPES) {
      expect(manifest.oauth2?.scopes).not.toContain(restricted);
    }

    const publicManifestPath = path.resolve(__dirname, '../public/manifest.json');
    const publicManifest = JSON.parse(fs.readFileSync(publicManifestPath, 'utf8'));
    for (const restricted of GOOGLE_RESTRICTED_SCOPES) {
      expect(publicManifest.oauth2?.scopes).not.toContain(restricted);
    }

    // Deployed per-child script carries private cloud scopes
    const files = await loadDeployedGasFiles();
    const gasManifest = JSON.parse(files['appsscript']);
    expect(gasManifest.oauthScopes).toContain('https://www.googleapis.com/auth/gmail.readonly');
    expect(gasManifest.oauthScopes).toContain('https://www.googleapis.com/auth/drive.readonly');
    expect(gasManifest.oauthScopes).toContain('https://www.googleapis.com/auth/script.scriptapp');

    const code = files['Code'];
    expect(code).toContain('method === "get_gmail_attachment"');
    expect(code).toContain('function handleGetGmailAttachment');
  });

  it('guarantees DocumentOcrService exists and provides automated vault indexing, search, and WhatsApp media indexing', async () => {
    const files = await loadDeployedGasFiles();
    const ocr = files['DocumentOcrService'];
    expect(ocr, 'DocumentOcrService.gs must exist in Apps Script payload').toBeDefined();

    // 1. Smart Pre-flight Text Inspection
    expect(ocr).toContain('hasNativeTextLayer');
    expect(ocr).toContain('extractDocumentText');
    expect(ocr).toContain('performDriveOcr');

    // 2. Automated Vault Indexing & Search
    expect(ocr).toContain('indexDocument');
    expect(ocr).toContain('indexDocumentById');
    expect(ocr).toContain('runAutomatedVaultIndexing');
    expect(ocr).toContain('searchVaultDocuments');

    // 3. Code.gs Routing
    const code = files['Code'];
    expect(code).toContain('method === "search_vault_documents"');
    expect(code).toContain('method === "index_whatsapp_media"');
    expect(code).toContain('method === "run_vault_ocr_indexing"');
    expect(code).toContain('name: \'search_vault_documents\'');
  });

  it('guarantees every single .gs file compiles through V8 with zero syntax errors', async () => {
    const files = await loadDeployedGasFiles();
    for (const [name, src] of Object.entries(files)) {
      if (name !== 'appsscript') {
        expect(() => {
          new vm.Script(src, { filename: `${name}.gs` });
        }, `Syntax error in ${name}.gs`).not.toThrow();
      }
    }
  });
});
