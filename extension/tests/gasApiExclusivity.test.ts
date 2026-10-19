import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { GasProvisionerService } from '../src/services/gasProvisioner';

describe('GAS API Exclusivity & Architectural Guard Rail', () => {
  const srcDir = path.resolve(__dirname, '../src');
  const gasServerDir = path.resolve(__dirname, '../../gas-mcp-server/src');

  function getAllFiles(dir: string, extensions: string[] = ['.ts', '.js', '.gs']): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllFiles(fullPath, extensions));
      } else if (extensions.some(ext => file.endsWith(ext))) {
        results.push(fullPath);
      }
    }
    return results;
  }

  it('guarantees ZERO Drive API calls are used to manage Apps Script projects', () => {
    const extensionSrcFiles = getAllFiles(srcDir, ['.ts', '.js']);
    
    // Forbidden patterns where Drive API is used against scriptId or GAS project types
    const forbiddenPatterns = [
      /drive\/v3\/files\/\$?\{?scriptId/i,
      /drive\/v3\/files\/\$?\{?gasScriptId/i,
      /drive\/v3\/files\/\$?\{?schoolGasScriptId/i,
      /drive\/v3\/files\/\$?\{?personalGasScriptId/i,
      /application\/vnd\.google-apps\.script/i,
      /purgeSelfFromDrive/i,
      /action\s*===?\s*['"]purgeSelf['"]/i
    ];

    for (const file of extensionSrcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(srcDir, file);

      for (const pattern of forbiddenPatterns) {
        expect(
          pattern.test(content),
          `Violation in ${relativePath}: Found forbidden Drive API usage on Apps Script project matching pattern ${pattern.toString()}. GAS project lifecycle must be managed exclusively via Apps Script REST API (script.googleapis.com).`
        ).toBe(false);
      }
    }
  });

  it('guarantees Apps Script source code NEVER uses DriveApp to manipulate the script project file', () => {
    const gasFiles = getAllFiles(gasServerDir, ['.gs']);
    
    for (const file of gasFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(gasServerDir, file);

      // Must never attempt to trash or delete self via DriveApp
      expect(
        content.includes('DriveApp.getFileById(ScriptApp.getScriptId())'),
        `Violation in ${relativePath}: Apps Script project must never manipulate its own project file via DriveApp.`
      ).toBe(false);

      expect(
        content.includes('purgeSelfFromDrive'),
        `Violation in ${relativePath}: Found legacy purgeSelfFromDrive routine.`
      ).toBe(false);
    }
  });

  it('guarantees deleteScriptProject decommission uses 100% Apps Script REST API and ZERO Drive API calls', async () => {
    const fetchCalls: { url: string; method: string }[] = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = vi.fn(async (url: any, opts: any = {}) => {
      const urlStr = url.toString();
      const method = (opts.method || 'GET').toUpperCase();
      fetchCalls.push({ url: urlStr, method });

      if (urlStr.includes('/deployments')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            deployments: [
              { deploymentId: 'dep_123' },
              { deploymentId: 'dep_456' }
            ]
          })
        } as any;
      }

      if (urlStr.includes('/content')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({})
        } as any;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({})
      } as any;
    });

    try {
      const testScriptId = 'test_script_id_exclusivity';
      const testToken = 'mock_oauth_token';
      const result = await GasProvisionerService.deleteScriptProject(testScriptId, testToken);

      expect(result).toBe(true);
      expect(fetchCalls.length).toBeGreaterThan(0);

      for (const call of fetchCalls) {
        // EVERY call must be to script.googleapis.com
        expect(
          call.url.startsWith('https://script.googleapis.com/v1/projects/'),
          `Non-Apps Script API call detected during decommission: ${call.method} ${call.url}`
        ).toBe(true);

        // ZERO calls to Drive API
        expect(
          call.url.includes('drive.googleapis.com') || call.url.includes('/drive/v3/'),
          `Forbidden Drive API call detected during decommission: ${call.method} ${call.url}`
        ).toBe(false);
      }

      // Verify that deployments were fetched and deleted via Apps Script API
      const deploymentDeletes = fetchCalls.filter(c => c.method === 'DELETE' && c.url.includes('/deployments/'));
      expect(deploymentDeletes.length).toBe(2);

      // Verify that code content was wiped via Apps Script API
      const contentWipe = fetchCalls.filter(c => c.method === 'PUT' && c.url.includes('/content'));
      expect(contentWipe.length).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('guarantees createProject uses 100% Apps Script REST API without Drive parentId parameter', async () => {
    const fetchCalls: { url: string; body?: any }[] = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = vi.fn(async (url: any, opts: any = {}) => {
      fetchCalls.push({
        url: url.toString(),
        body: opts.body ? JSON.parse(opts.body) : undefined
      });
      return {
        ok: true,
        status: 200,
        json: async () => ({ scriptId: 'created_script_id_123' })
      } as any;
    });

    try {
      const project = await (GasProvisionerService as any).createProject('mock_token');
      expect(project.scriptId).toBe('created_script_id_123');
      expect(fetchCalls.length).toBe(1);
      expect(fetchCalls[0].url).toBe('https://script.googleapis.com/v1/projects');
      expect(fetchCalls[0].body?.parentId).toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('guarantees createProject assigns permanent role-based titles without child names or academic years', async () => {
    const fetchCalls: { url: string; body?: any }[] = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = vi.fn(async (url: any, opts: any = {}) => {
      fetchCalls.push({
        url: url.toString(),
        body: opts.body ? JSON.parse(opts.body) : undefined
      });
      return {
        ok: true,
        status: 200,
        json: async () => ({ scriptId: 'created_script_id_test' })
      } as any;
    });

    try {
      // Default / School
      await (GasProvisionerService as any).createProject('mock_token', 'school');
      expect(fetchCalls[fetchCalls.length - 1].body?.title).toBe('Kids Intelligent Dashboard System (K.I.D.S.) - School Worker');

      // Master
      await (GasProvisionerService as any).createProject('mock_token', 'master');
      expect(fetchCalls[fetchCalls.length - 1].body?.title).toBe('Kids Intelligent Dashboard System (K.I.D.S.) - Master Worker');

      // Ensure none of them contain year strings or child identifiers
      for (const call of fetchCalls) {
        expect(call.body?.title).not.toMatch(/\d{4}-\d{4}/);
        expect(call.body?.title).not.toContain('Atharva');
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('guarantees portal scraping is consolidated into Master Worker (provisionPersonalWorker is removed)', () => {
    expect((GasProvisionerService as any).provisionPersonalWorker).toBeUndefined();
  });

  it('guarantees renameAppsScriptProject is a complete no-op making zero API calls', async () => {
    const originalFetch = globalThis.fetch;
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as any;

    try {
      await GasProvisionerService.renameAppsScriptProject('test_script_id', 'NewKidName', '2026-2027', 'mock_token');
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
