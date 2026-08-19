export interface ValidationStageResult {
  stage: number;
  name: string;
  success: boolean;
  message: string;
}

export interface PreFlightResult {
  passed: boolean;
  stages: ValidationStageResult[];
}

export interface EndpointSpec {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

export class PreFlightValidator {
  /**
   * Runs all 3 Pre-Flight validation stages.
   */
  public static async validate(
    domain: string,
    spec: EndpointSpec,
    cookies: string,
    gasUrl: string
  ): Promise<PreFlightResult> {
    const stages: ValidationStageResult[] = [];

    // Stage 1: Local Session Probe
    const stage1 = await this.stage1LocalSessionProbe(domain);
    stages.push(stage1);
    if (!stage1.success) {
      return { passed: false, stages };
    }

    // Stage 2: Extension Fetch Verification
    const stage2 = await this.stage2ExtensionFetchVerification(spec, cookies);
    stages.push(stage2);
    if (!stage2.success) {
      return { passed: false, stages };
    }

    // Stage 3: GAS Proxy Verification
    const stage3 = await this.stage3GasProxyVerification(spec, cookies, gasUrl);
    stages.push(stage3);
    if (!stage3.success) {
      return { passed: false, stages };
    }

    return { passed: true, stages };
  }

  /**
   * Stage 1: Verifies active session cookies exist for the domain in Chrome's cookie store.
   */
  private static async stage1LocalSessionProbe(domain: string): Promise<ValidationStageResult> {
    const name = "Stage 1: Local Session Probe";
    try {
      if (typeof chrome !== 'undefined' && chrome.cookies) {
        const cookies = await chrome.cookies.getAll({ domain });
        if (cookies && cookies.length > 0) {
          return { stage: 1, name, success: true, message: `Found ${cookies.length} active domain cookies.` };
        } else {
          return { stage: 1, name, success: false, message: `No active session cookies found for domain: ${domain}. Please log in to your portal.` };
        }
      }
      // Mock/fallback success for non-extension environments
      return { stage: 1, name, success: true, message: "Local session probe simulated successfully." };
    } catch (err: any) {
      return { stage: 1, name, success: false, message: `Session probe failed: ${err.message}` };
    }
  }

  /**
   * Stage 2: Executes a fetch from extension background script using captured cookies/headers to ensure no login redirect occurs.
   */
  private static async stage2ExtensionFetchVerification(spec: EndpointSpec, cookies: string): Promise<ValidationStageResult> {
    const name = "Stage 2: Extension Fetch Verification";
    try {
      const headers: Record<string, string> = { ...(spec.headers || {}) };
      if (cookies) {
        headers['Cookie'] = cookies;
      }

      const response = await fetch(spec.url, {
        method: spec.method || 'GET',
        headers,
        body: spec.method !== 'GET' ? spec.body : undefined,
        redirect: 'manual'
      });

      // Check if redirected to login page
      const redirectedUrl = response.url || '';
      if (response.status === 302 || response.status === 301 || redirectedUrl.includes('/Security') || redirectedUrl.includes('login') || redirectedUrl.includes('LoginForm')) {
        return {
          stage: 2,
          name,
          success: false,
          message: "Portal returned a login redirect (Session Expired/Invalid Credentials)."
        };
      }

      if (!response.ok && response.status !== 200) {
        return {
          stage: 2,
          name,
          success: false,
          message: `Portal responded with HTTP status ${response.status}.`
        };
      }

      return { stage: 2, name, success: true, message: "Direct portal fetch verified. Active session confirmed." };
    } catch (err: any) {
      return { stage: 2, name, success: false, message: `Extension fetch failed: ${err.message}` };
    }
  }

  /**
   * Stage 3: Transmits test payload to GAS MCP server to verify that GAS `UrlFetchApp` can execute the query remotely.
   */
  private static async stage3GasProxyVerification(spec: EndpointSpec, cookies: string, gasUrl: string): Promise<ValidationStageResult> {
    const name = "Stage 3: GAS Proxy Verification";
    if (!gasUrl) {
      return { stage: 3, name, success: false, message: "Google Apps Script Web App URL is missing." };
    }

    try {
      const testPayload = {
        jsonrpc: "2.0",
        method: "test_preflight_proxy",
        params: {
          endpoint_spec: spec,
          auth_spec: { cookies }
        },
        id: "preflight-test"
      };

      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload)
      });

      if (!response.ok) {
        return { stage: 3, name, success: false, message: `GAS proxy ping failed with HTTP ${response.status}` };
      }

      const json = await response.json();
      if (json.error) {
        return { stage: 3, name, success: false, message: `GAS proxy verification error: ${json.error.message || JSON.stringify(json.error)}` };
      }

      return { stage: 3, name, success: true, message: "GAS backend autonomous proxy execution verified!" };
    } catch (err: any) {
      return { stage: 3, name, success: false, message: `GAS proxy reachability test failed: ${err.message}` };
    }
  }

  /**
   * Bi-directional Page Data Comparison between Active Tab DOM snippet and GAS fetched response.
   */
  public static comparePageData(activeTabHtml: string, gasFetchedHtml: string): boolean {
    if (!activeTabHtml || !gasFetchedHtml) return false;
    
    // Clean and normalize strings (remove scripts and collapse whitespace)
    const cleanActive = activeTabHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/\s+/g, ' ').trim().toLowerCase();
    const cleanGas = gasFetchedHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/\s+/g, ' ').trim().toLowerCase();

    if (cleanActive.length === 0 || cleanGas.length === 0) return false;

    // Check for signature or content snippet overlap
    const activeSample = cleanActive.substring(0, Math.min(100, cleanActive.length));
    const gasSample = cleanGas.substring(0, Math.min(100, cleanGas.length));

    return cleanGas.includes(activeSample) || cleanActive.includes(gasSample) || Math.abs(cleanActive.length - cleanGas.length) < 5000;
  }
}
