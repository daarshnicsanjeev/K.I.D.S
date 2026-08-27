/**
 * PlatformStoreConnector — In-Memory Store & Direct Storage API Extraction
 * Provides Layer 1 fast extraction for WhatsApp Web (window.Store),
 * Telegram Web (IndexedDB), and standard REST/Store platforms.
 */

export interface RawStoreMessage {
  id: string;
  sender: string;
  body: string;
  timestamp?: string;
  date?: string;
  time?: string;
  isMedia?: boolean;
  mimetype?: string;
  filename?: string;
  base64Attachment?: string;
}

export interface StoreExtractionResult {
  success: boolean;
  engineUsed: 'IN_MEMORY_STORE' | 'INDEXED_DB' | 'FALLBACK_DOM';
  chatName: string;
  messages: RawStoreMessage[];
  attachments: Array<{ name: string; mimeType: string; base64Content: string }>;
  error?: string;
}

export class PlatformStoreConnector {
  /**
   * Generates the in-page JavaScript string to execute in MAIN world context
   * for WhatsApp Web window.Store hook and extraction.
   */
  public static getWhatsAppStoreHookScript(): string {
    return `
      (async function() {
        try {
          // 1. Hook Webpack module loader if window.Store is not already populated
          if (!window.Store || !window.Store.Chat) {
            window.Store = window.Store || {};
            
            // Search webpack chunks for WhatsApp modules
            if (window.webpackChunkwhatsapp_web_client) {
              window.webpackChunkwhatsapp_web_client.push([[Math.random()], {}, (require) => {
                const modules = require.m || {};
                for (const id of Object.keys(modules)) {
                  try {
                    const mod = require(id);
                    if (!mod) continue;
                    
                    // Match Chat Collection
                    if (mod.Chat || (mod.default && mod.default.Chat)) {
                      window.Store.Chat = mod.Chat || mod.default.Chat;
                    }
                    if (mod.Msg || (mod.default && mod.default.Msg)) {
                      window.Store.Msg = mod.Msg || mod.default.Msg;
                    }
                    if (mod.downloadMedia || (mod.default && mod.default.downloadMedia)) {
                      window.Store.downloadMedia = mod.downloadMedia || mod.default.downloadMedia;
                    }
                  } catch (e) {}
                }
              }]);
            }
          }

          // 2. Fallback: Check global require
          if (!window.Store.Chat && typeof window.require === 'function') {
            try {
              window.Store.Chat = window.require('WAWebChatCollection')?.ChatCollection || window.require('WAWebChatCollection')?.default;
              window.Store.Msg = window.require('WAWebMsgCollection')?.MsgCollection || window.require('WAWebMsgCollection')?.default;
            } catch (e) {}
          }

          return { isHooked: Boolean(window.Store && (window.Store.Chat || window.Store.Msg)) };
        } catch (err) {
          return { isHooked: false, error: err.message };
        }
      })();
    `;
  }

  /**
   * Normalizes raw message objects retrieved from internal Store or IndexedDB
   */
  public static normalizeStoreMessages(rawMsgs: any[]): RawStoreMessage[] {
    if (!Array.isArray(rawMsgs)) return [];

    return rawMsgs.map((m, idx) => {
      const senderName = m.author || m.sender || m.from || m.pushname || m._data?.notifyName || '+91 Parent/Teacher';
      const body = m.body || m.caption || m.text || m._data?.body || '';
      
      let dateStr = '';
      let timeStr = '';
      if (m.t || m.timestamp) {
        const tsMs = typeof m.t === 'number' ? (m.t > 1e11 ? m.t : m.t * 1000) : (m.timestamp || Date.now());
        const d = new Date(tsMs);
        dateStr = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
        const hours = d.getHours();
        const mins = d.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        timeStr = `${formattedHours}:${mins} ${ampm}`;
      }

      return {
        id: m.id?._serialized || m.id || `store_msg_${idx}`,
        sender: senderName,
        body,
        date: dateStr || undefined,
        time: timeStr || undefined,
        timestamp: (timeStr && dateStr) ? `${timeStr}, ${dateStr}` : (dateStr || timeStr || ''),
        isMedia: Boolean(m.isMedia || m.mimetype || m.type === 'document' || m.type === 'image'),
        mimetype: m.mimetype || m._data?.mimetype,
        filename: m.filename || m._data?.filename || (m.type === 'document' ? 'school_document.pdf' : undefined)
      };
    });
  }

  /**
   * Transforms Store messages to unified rawChatText format
   */
  public static formatStoreChatText(messages: RawStoreMessage[]): string {
    return messages.map(m => {
      const timePart = m.time || '';
      const datePart = m.date || '';
      const header = (timePart && datePart) ? `[${timePart}, ${datePart}]` : (timePart ? `[${timePart}]` : (datePart ? `[${datePart}]` : ''));
      return `${header ? header + ' ' : ''}${m.sender}:\n${m.body}`;
    }).join('\n\n');
  }
}
