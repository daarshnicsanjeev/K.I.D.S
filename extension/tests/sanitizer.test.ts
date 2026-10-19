import { describe, it, expect } from 'vitest';
import { SanitizerService } from '../src/services/sanitizer';

describe('SanitizerService', () => {
  it('should redact email addresses and phone numbers from strings', () => {
    const input = "User john.doe@school.edu called 555-123-4567 regarding homework.";
    const clean = SanitizerService.sanitizeString(input);
    expect(clean).not.toContain('john.doe@school.edu');
    expect(clean).not.toContain('555-123-4567');
    expect(clean).toContain('[REDACTED_EMAIL]');
    expect(clean).toContain('[REDACTED_PHONE]');
  });

  it('should sanitize raw cookie headers into key-only flag format', () => {
    const rawCookies = "ASP.NET_SessionId=xyz123; MCampusTokenID=39a0c679";
    const sanitized = SanitizerService.sanitizeCookies(rawCookies);
    expect(sanitized).toEqual([
      "ASP.NET_SessionId=[REDACTED_COOKIE]",
      "MCampusTokenID=[REDACTED_COOKIE]"
    ]);
  });

  it('should scrub authorization headers', () => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer secret-jwt-token',
      'X-CSRF-TOKEN': 'csrf-token-123'
    };
    const cleanHeaders = SanitizerService.sanitizeHeaders(headers);
    expect(cleanHeaders['Authorization']).toBe('[REDACTED_HEADER]');
    expect(cleanHeaders['X-CSRF-TOKEN']).toBe('[REDACTED_HEADER]');
    expect(cleanHeaders['Content-Type']).toBe('application/json');
  });
});
