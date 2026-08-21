/**
 * WhatsAppDiagnosticLogger
 * Dedicated, structured in-memory and storage diagnostic logger for WhatsApp synchronization,
 * tab lifecycle, DOM extraction, and Personal Google Drive operations.
 */

export interface WhatsAppLogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  category: 'CONN' | 'EXTRACT' | 'FILTER' | 'DRIVE' | 'SCAN' | 'OCR' | 'ATTACHMENT';
  message: string;
  metadata?: Record<string, any>;
}

export class WhatsAppDiagnosticLogger {
  private static STORAGE_KEY = 'whatsapp_diagnostic_logs';
  private static MAX_ENTRIES = 150;

  public static async log(
    level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS',
    category: 'CONN' | 'EXTRACT' | 'FILTER' | 'DRIVE' | 'SCAN' | 'OCR' | 'ATTACHMENT',
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const entry: WhatsAppLogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      category,
      message,
      metadata
    };

    try {
      const data = await chrome.storage.local.get([this.STORAGE_KEY]);
      const logs: WhatsAppLogEntry[] = data[this.STORAGE_KEY] || [];
      logs.unshift(entry);

      if (logs.length > this.MAX_ENTRIES) {
        logs.length = this.MAX_ENTRIES;
      }

      await chrome.storage.local.set({ [this.STORAGE_KEY]: logs });
    } catch (e) {
      console.warn('[WhatsAppLogger] Failed to write log:', e);
    }
  }

  public static async getLogs(): Promise<WhatsAppLogEntry[]> {
    try {
      const data = await chrome.storage.local.get([this.STORAGE_KEY]);
      return data[this.STORAGE_KEY] || [];
    } catch (e) {
      return [];
    }
  }

  public static async clearLogs(): Promise<void> {
    await chrome.storage.local.remove([this.STORAGE_KEY]);
  }

  public static formatLogsAsText(logs: WhatsAppLogEntry[]): string {
    if (!logs || logs.length === 0) return 'No WhatsApp diagnostic logs recorded yet.';
    return logs
      .map(l => {
        const metaStr = l.metadata ? ` | Meta: ${JSON.stringify(l.metadata)}` : '';
        return `[${l.timestamp}] [${l.level}] [WA_${l.category}] ${l.message}${metaStr}`;
      })
      .join('\n');
  }
}
