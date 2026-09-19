import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GasProvisionerService } from '../src/services/gasProvisioner';
import { ChildManager } from '../src/services/childManager';

describe('Account Uniqueness Validation and API Enablement Detection', () => {
  let mockStorage: Record<string, any> = {};
  let originalFetch: any;

  beforeEach(() => {
    mockStorage = {};
    originalFetch = globalThis.fetch;

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
      }
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('GasProvisionerService.validateAccountUniqueness', () => {
    it('rejects empty or whitespace-only email', async () => {
      const result = await GasProvisionerService.validateAccountUniqueness('');
      expect(result.valid).toBe(false);
      expect(result.conflictType).toBe('PARENT_ACCOUNT');

      const resultWhitespace = await GasProvisionerService.validateAccountUniqueness('   ');
      expect(resultWhitespace.valid).toBe(false);
    });

    it('rejects candidate email colliding with parent personal drive account', async () => {
      mockStorage['personal_drive_account_email'] = 'parent.vault@gmail.com';
      vi.spyOn(ChildManager, 'getProfiles').mockResolvedValue([]);

      const result = await GasProvisionerService.validateAccountUniqueness('parent.vault@gmail.com');
      expect(result.valid).toBe(false);
      expect(result.conflictType).toBe('PARENT_ACCOUNT');
      expect(result.conflictingEmail).toBe('parent.vault@gmail.com');
    });

    it('handles parent email comparison case-insensitively and with whitespace', async () => {
      mockStorage['personal_drive_account_email'] = 'Parent.Vault@Gmail.COM ';
      vi.spyOn(ChildManager, 'getProfiles').mockResolvedValue([]);

      const result = await GasProvisionerService.validateAccountUniqueness('  PARENT.VAULT@GMAIL.COM  ');
      expect(result.valid).toBe(false);
      expect(result.conflictType).toBe('PARENT_ACCOUNT');
    });

    it('rejects candidate email colliding with a sibling child profile', async () => {
      mockStorage['personal_drive_account_email'] = 'parent@gmail.com';
      vi.spyOn(ChildManager, 'getProfiles').mockResolvedValue([
        {
          id: 'child_1',
          name: 'Atharva',
          studentAccountEmail: 'atharva@school.edu'
        } as any,
        {
          id: 'child_2',
          name: 'Ananya',
          studentAccountEmail: 'ananya@school.edu'
        } as any
      ]);

      const result = await GasProvisionerService.validateAccountUniqueness('ananya@school.edu', 'child_3');
      expect(result.valid).toBe(false);
      expect(result.conflictType).toBe('SIBLING_ACCOUNT');
      expect(result.conflictingName).toBe('Ananya');
      expect(result.conflictingEmail).toBe('ananya@school.edu');
    });

    it('permits reconnection for the same child (self-reconnect)', async () => {
      mockStorage['personal_drive_account_email'] = 'parent@gmail.com';
      vi.spyOn(ChildManager, 'getProfiles').mockResolvedValue([
        {
          id: 'child_1',
          name: 'Atharva',
          studentAccountEmail: 'atharva@school.edu'
        } as any
      ]);

      const result = await GasProvisionerService.validateAccountUniqueness('atharva@school.edu', 'child_1');
      expect(result.valid).toBe(true);
      expect(result.conflictType).toBeUndefined();
    });

    it('permits a completely unique student account', async () => {
      mockStorage['personal_drive_account_email'] = 'parent@gmail.com';
      vi.spyOn(ChildManager, 'getProfiles').mockResolvedValue([
        {
          id: 'child_1',
          name: 'Atharva',
          studentAccountEmail: 'atharva@school.edu'
        } as any
      ]);

      const result = await GasProvisionerService.validateAccountUniqueness('newstudent@school.edu', 'child_2');
      expect(result.valid).toBe(true);
      expect(result.conflictType).toBeUndefined();
    });
  });

  describe('GasProvisionerService.checkAccountAndApiStatus', () => {
    it('detects when Apps Script API is enabled (gaaEnabled: true)', async () => {
      globalThis.fetch = vi.fn(async (url: string) => {
        if (url.includes('userinfo')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ email: 'student@myschool.org' })
          } as any;
        }
        if (url.includes('usersettings') || url.includes('projects')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ userSettings: { gaaEnabled: true } })
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      const res = await GasProvisionerService.checkAccountAndApiStatus('mock_token_123');
      expect(res.email).toBe('student@myschool.org');
      expect(res.domain).toBe('myschool.org');
      expect(res.isGmail).toBe(false);
      expect(res.apiEnabled).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('detects personal gmail account correctly', async () => {
      globalThis.fetch = vi.fn(async (url: string) => {
        if (url.includes('userinfo')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ email: 'personal.user@gmail.com' })
          } as any;
        }
        if (url.includes('usersettings') || url.includes('projects')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ userSettings: { gaaEnabled: true } })
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      const res = await GasProvisionerService.checkAccountAndApiStatus('mock_token_gmail');
      expect(res.email).toBe('personal.user@gmail.com');
      expect(res.domain).toBe('gmail.com');
      expect(res.isGmail).toBe(true);
      expect(res.apiEnabled).toBe(true);
    });

    it('detects when Apps Script API is disabled (gaaEnabled: false)', async () => {
      globalThis.fetch = vi.fn(async (url: string) => {
        if (url.includes('userinfo')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ email: 'student@school.org' })
          } as any;
        }
        if (url.includes('usersettings') || url.includes('projects')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ userSettings: { gaaEnabled: false } })
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      const res = await GasProvisionerService.checkAccountAndApiStatus('mock_token_disabled');
      expect(res.email).toBe('student@school.org');
      expect(res.apiEnabled).toBe(false);
    });

    it('handles 401/403 or network errors gracefully', async () => {
      globalThis.fetch = vi.fn(async (url: string) => {
        if (url.includes('userinfo')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ email: 'student@school.org' })
          } as any;
        }
        if (url.includes('usersettings') || url.includes('projects')) {
          return {
            ok: false,
            status: 403,
            json: async () => ({ error: 'Permission denied' })
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      const res = await GasProvisionerService.checkAccountAndApiStatus('mock_token_forbidden');
      expect(res.email).toBe('student@school.org');
      expect(res.apiEnabled).toBe(false);
    });

    it('correctly detects API enabled from Google Apps Script non-mutating probe (HTTP 404 or 200) without creating projects', async () => {
      let cleanedUp = false;
      vi.spyOn(GasProvisionerService, 'cleanupLegacyProbeProjects').mockImplementation(async () => {
        cleanedUp = true;
        return 1;
      });

      globalThis.fetch = vi.fn(async (url: string, opts?: any) => {
        if (url.includes('userinfo')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ email: 'student@school.edu' })
          } as any;
        }
        if (url.includes('projects')) {
          expect(opts?.method).toBe('GET');
          expect(url).toContain('kids_api_readiness_probe');
          return {
            ok: false,
            status: 404,
            text: async () => 'Requested entity was not found'
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      const res = await GasProvisionerService.checkAccountAndApiStatus('mock_token_real_enabled');
      expect(res.email).toBe('student@school.edu');
      expect(res.apiEnabled).toBe(true);
      expect(res.scopeInsufficient).toBe(false);
      expect(cleanedUp).toBe(true);
    });

    it('correctly detects API disabled when Google returns HTTP 400 or generic failure', async () => {
      globalThis.fetch = vi.fn(async (url: string, opts?: any) => {
        if (url.includes('userinfo')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ email: 'student@school.edu' })
          } as any;
        }
        if (url.includes('projects')) {
          return {
            ok: false,
            status: 400,
            text: async () => 'Bad Request'
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      const res = await GasProvisionerService.checkAccountAndApiStatus('mock_token_bad_request');
      expect(res.email).toBe('student@school.edu');
      expect(res.apiEnabled).toBe(false);
    });

    it('correctly detects API disabled from Google Apps Script HTTP 403 (User has not enabled Apps Script API)', async () => {
      globalThis.fetch = vi.fn(async (url: string, opts?: any) => {
        if (url.includes('userinfo')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ email: 'student@school.edu' })
          } as any;
        }
        if (url.includes('projects')) {
          expect(opts?.method).toBe('GET');
          return {
            ok: false,
            status: 403,
            text: async () => 'User has not enabled the Apps Script API. Enable it by visiting https://script.google.com/home/usersettings then retry.'
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      const res = await GasProvisionerService.checkAccountAndApiStatus('mock_token_real_disabled');
      expect(res.email).toBe('student@school.edu');
      expect(res.apiEnabled).toBe(false);
      expect(res.scopeInsufficient).toBe(false);
    });

    it('correctly identifies insufficient OAuth scopes on HTTP 403', async () => {
      globalThis.fetch = vi.fn(async (url: string) => {
        if (url.includes('userinfo')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ email: 'student@school.edu' })
          } as any;
        }
        if (url.includes('projects')) {
          return {
            ok: false,
            status: 403,
            text: async () => 'Request had insufficient authentication scopes. ACCESS_TOKEN_SCOPE_INSUFFICIENT'
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      const res = await GasProvisionerService.checkAccountAndApiStatus('mock_token_scope_missing');
      expect(res.email).toBe('student@school.edu');
      expect(res.apiEnabled).toBe(false);
      expect(res.scopeInsufficient).toBe(true);
    });

    it('does not falsely treat HTTP 404 as API enabled', async () => {
      globalThis.fetch = vi.fn(async (url: string) => {
        if (url.includes('userinfo')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ email: 'student@school.edu' })
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      const res = await GasProvisionerService.checkAccountAndApiStatus('mock_token_404');
      expect(res.apiEnabled).toBe(false);
    });

    it('correctly treats HTTP 429 (Resource Exhausted / Rate Limit) as API enabled', async () => {
      globalThis.fetch = vi.fn(async (url: string) => {
        if (url.includes('userinfo')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ email: 'atharva.chaudhari@myglobal.school' })
          } as any;
        }
        if (url.includes('projects')) {
          return {
            ok: false,
            status: 429,
            text: async () => 'Resource has been exhausted (e.g. check quota).'
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      const res = await GasProvisionerService.checkAccountAndApiStatus('mock_token_429');
      expect(res.email).toBe('atharva.chaudhari@myglobal.school');
      expect(res.apiEnabled).toBe(true);
      expect(res.statusCode).toBe(429);
    });
  });
});
