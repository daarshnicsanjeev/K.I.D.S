/**
 * ErrorHasher - SHA-256 Fingerprinting Engine
 * Generates a deterministic 12-character SHA-256 hash from (Domain || Component || CleanStack).
 */
export class ErrorHasher {
  /**
   * Generates a 12-character hex fingerprint.
   */
  public static async generateFingerprint(domain: string, component: string, stackTrace: string): Promise<string> {
    const cleanStack = this.cleanStackTrace(stackTrace);
    const rawString = `${domain.toLowerCase().trim()}|${component.toLowerCase().trim()}|${cleanStack}`;
    
    // Web Crypto API in browser / extension worker context
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(rawString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex.substring(0, 12);
    }

    // Simple deterministic fallback for non-crypto test environments
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
      const char = rawString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    const positiveHash = Math.abs(hash).toString(16).padStart(12, '0');
    return positiveHash.substring(0, 12);
  }

  /**
   * Cleans stack trace by stripping variable line numbers and paths for consistent deduplication.
   */
  private static cleanStackTrace(stackTrace: string): string {
    if (!stackTrace) return '';
    return stackTrace
      .replace(/:\d+:\d+/g, '') // remove line/column numbers
      .replace(/https?:\/\/[^\s]+/g, '') // remove full URL paths
      .replace(/\s+/g, ' ')
      .trim();
  }
}
