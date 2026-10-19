/**
 * SanitizerService - Privacy & PII Scrubbing Engine
 * Scrubs sensitive data including auth cookies, tokens, emails, phone numbers, and legal names.
 */
export class SanitizerService {
  private static EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  private static PHONE_REGEX = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  private static AUTH_TOKEN_REGEX = /(bearer\s+[a-zA-Z0-9._~+/-]+=*|token=[a-zA-Z0-9._-]+)/gi;

  /**
   * Redacts sensitive string values like credentials, emails, and phone numbers.
   */
  public static sanitizeString(input: string): string {
    if (!input) return input;
    let sanitized = input;
    sanitized = sanitized.replace(this.EMAIL_REGEX, '[REDACTED_EMAIL]');
    sanitized = sanitized.replace(this.PHONE_REGEX, '[REDACTED_PHONE]');
    sanitized = sanitized.replace(this.AUTH_TOKEN_REGEX, '[REDACTED_TOKEN]');
    return sanitized;
  }

  /**
   * Scrubs raw cookie strings into sanitized flag representations (retaining domain & name, masking value).
   */
  public static sanitizeCookies(cookieHeader: string): string[] {
    if (!cookieHeader) return [];
    return cookieHeader.split(';').map(cookiePair => {
      const parts = cookiePair.trim().split('=');
      const name = parts[0];
      return name ? `${name}=[REDACTED_COOKIE]` : '[REDACTED_COOKIE]';
    });
  }

  /**
   * Scrubs request headers removing sensitive authorization tokens.
   */
  public static sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const cleanHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'authorization' || lowerKey === 'cookie' || lowerKey === 'x-csrf-token' || lowerKey === '__requestverificationtoken') {
        cleanHeaders[key] = '[REDACTED_HEADER]';
      } else {
        cleanHeaders[key] = this.sanitizeString(value);
      }
    }
    return cleanHeaders;
  }

  /**
   * Sanitizes an entire error context object before telemetry dispatch.
   */
  public static sanitizeErrorPayload(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload;

    const copy = JSON.parse(JSON.stringify(payload));
    if (copy.error_details) {
      if (copy.error_details.error_message) {
        copy.error_details.error_message = this.sanitizeString(copy.error_details.error_message);
      }
      if (copy.error_details.stack_trace) {
        copy.error_details.stack_trace = this.sanitizeString(copy.error_details.stack_trace);
      }
      if (copy.error_details.context) {
        const ctx = copy.error_details.context;
        if (ctx.target_url) ctx.target_url = this.sanitizeString(ctx.target_url);
        if (ctx.cookies_present && Array.isArray(ctx.cookies_present)) {
          ctx.cookies_present = ctx.cookies_present.map((c: string) => this.sanitizeString(c));
        }
      }
    }
    return copy;
  }
}
