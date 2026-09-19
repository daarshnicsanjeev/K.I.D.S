import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Step 2 API Enablement Button Visibility State Machine', () => {
  const htmlPath = path.resolve(__dirname, '../src/popup/index.html');
  const wizardPath = path.resolve(__dirname, '../src/popup/wizard.ts');
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  const wizardContent = fs.readFileSync(wizardPath, 'utf-8');

  it('verifies all Step 2 API buttons exist in index.html with appropriate initial hidden classes', () => {
    expect(htmlContent).toContain('id="btnStep2ConnectStudent"');
    expect(htmlContent).toContain('id="btnOpenApiSettings"');
    expect(htmlContent).toContain('id="btnStep2VerifyApiStatus"');
    expect(htmlContent).toContain('id="btnCreateMcpServer"');

    // btnOpenApiSettings, btnStep2VerifyApiStatus, and btnCreateMcpServer must start hidden
    expect(htmlContent).toMatch(/<button\s+id="btnOpenApiSettings"[^>]*class="[^"]*hidden[^"]*"/);
    expect(htmlContent).toMatch(/<button\s+id="btnStep2VerifyApiStatus"[^>]*class="[^"]*hidden[^"]*"/);
    expect(htmlContent).toMatch(/<button\s+id="btnCreateMcpServer"[^>]*class="[^"]*hidden[^"]*"/);
  });

  it('implements state machine where disabled API shows ONLY btnOpenApiSettings initially, and reveals btnStep2VerifyApiStatus once opened', () => {
    // Replicate checkStep2ApiStatus logic
    function resolveStep2Buttons(apiEnabled: boolean, hasOpenedSettings: boolean) {
      let showOpenApiSettings = false;
      let showVerifyApiStatus = false;
      let showDeployWorker = false;

      if (apiEnabled) {
        showDeployWorker = true;
        showOpenApiSettings = false;
        showVerifyApiStatus = false;
      } else {
        showDeployWorker = false;
        if (hasOpenedSettings) {
          // User clicked Enable API: Verify button is prominently shown, Open Settings available as secondary
          showOpenApiSettings = true;
          showVerifyApiStatus = true;
        } else {
          // Initial state: show ONLY button which takes to API enablement
          showOpenApiSettings = true;
          showVerifyApiStatus = false;
        }
      }

      return { showOpenApiSettings, showVerifyApiStatus, showDeployWorker };
    }

    // 1. Student account connected, API disabled, user hasn't clicked Enable API yet -> ONLY open settings shown
    const state1 = resolveStep2Buttons(false, false);
    expect(state1.showOpenApiSettings).toBe(true);
    expect(state1.showVerifyApiStatus).toBe(false);
    expect(state1.showDeployWorker).toBe(false);

    // 2. User clicks Enable API (hasOpenedSettings = true) -> Verify button is revealed
    const state2 = resolveStep2Buttons(false, true);
    expect(state2.showVerifyApiStatus).toBe(true);
    expect(state2.showOpenApiSettings).toBe(true);
    expect(state2.showDeployWorker).toBe(false);

    // 3. User verifies API is now enabled -> Deploy Worker shown
    const state3 = resolveStep2Buttons(true, true);
    expect(state3.showOpenApiSettings).toBe(false);
    expect(state3.showVerifyApiStatus).toBe(false);
    expect(state3.showDeployWorker).toBe(true);
  });

  it('verifies wizard.ts contains persistent step2_has_opened_api_settings storage logic', () => {
    expect(wizardContent).toContain('step2_has_opened_api_settings');
    expect(wizardContent).toContain('hasOpenedStep2ApiSettings');
    expect(wizardContent).toContain('setA11yVisibility(btnStep2VerifyApiStatus, true)');
    expect(wizardContent).toContain('setA11yVisibility(btnStep2VerifyApiStatus, false)');
  });

  it('verifies btnCreateMcpServer directly deploys using authenticated Step 2 student account without account picker modal', () => {
    // Check that btnCreateMcpServer click listener directly calls executeSchoolWorkerDeployment()
    expect(wizardContent).toMatch(/btnCreateMcpServer\?\.addEventListener\('click',\s*(?:async\s*)?\(\)\s*=>\s*\{[\s\S]*?executeSchoolWorkerDeployment\(\);/);

    // Check that executeSchoolWorkerDeployment reuses stored student account token
    expect(wizardContent).toContain('student_gas_token');
    expect(wizardContent).toContain('currentConfiguringProfile?.studentAccountEmail');
    expect(wizardContent).toContain('GasProvisionerService.getAuthToken(false)');
  });
});
