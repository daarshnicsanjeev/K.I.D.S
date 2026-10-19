/**
 * PlatformStoreConnector — In-Memory Store & Direct Storage API Extraction
 * Provides Layer 1 fast extraction for WhatsApp Web (window.Store),
 * Telegram Web (IndexedDB), and direct browser IndexedDB / CacheStorage.
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
   * for direct browser IndexedDB and CacheStorage extraction.
   */
  public static getDirectIndexedDbExtractionScript(targetChatName: string): string {
    return `
      (async function() {
        try {
          const targetName = ${JSON.stringify(targetChatName || '')};
          const messages = [];
          const attachments = [];

          // 1. Discover all databases in browser profile
          let dbList = [];
          if (typeof indexedDB.databases === 'function') {
            try { dbList = await indexedDB.databases(); } catch (e) {}
          }
          if (!dbList || dbList.length === 0) {
            dbList = [{ name: 'model-storage' }, { name: 'wawc' }, { name: 'wawc_db' }];
          }

          const targetDbNames = dbList
            .map(d => d.name)
            .filter(n => n && (n.includes('model') || n.includes('wawc') || n.includes('storage') || n.includes('telegram')));

          if (targetDbNames.length === 0) {
            targetDbNames.push('model-storage');
          }

          const openDb = (name) => new Promise((resolve) => {
            try {
              const req = indexedDB.open(name);
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => resolve(null);
              req.onblocked = () => resolve(null);
            } catch (e) { resolve(null); }
          });

          const readAllFromStore = (db, storeName) => new Promise((resolve) => {
            try {
              if (!db.objectStoreNames.contains(storeName)) { resolve([]); return; }
              const tx = db.transaction(storeName, 'readonly');
              const store = tx.objectStore(storeName);
              const req = store.getAll();
              req.onsuccess = () => resolve(req.result || []);
              req.onerror = () => resolve([]);
            } catch (e) { resolve([]); }
          });

          for (const dbName of targetDbNames) {
            const db = await openDb(dbName);
            if (!db) continue;

            try {
              // Read chats to locate target chat JID
              let targetJid = '';
              const chats = await readAllFromStore(db, 'chat');
              if (Array.isArray(chats)) {
                for (const c of chats) {
                  const title = c.name || c.formattedTitle || c.title || '';
                  if (title && (title.toLowerCase().includes(targetName.toLowerCase()) || targetName.toLowerCase().includes(title.toLowerCase()))) {
                    targetJid = c.id?._serialized || c.id || '';
                    break;
                  }
                }
              }

              // Read messages from message store
              const rawMsgs = await readAllFromStore(db, 'message');
              if (Array.isArray(rawMsgs) && rawMsgs.length > 0) {
                for (const m of rawMsgs) {
                  const chatId = m.id?.remote || m.remote || m.chatId || m.to || '';
                  if (targetJid && chatId && !chatId.includes(targetJid) && !targetJid.includes(chatId)) {
                    continue; // Skip messages from unrelated chats
                  }

                  const body = m.body || m.caption || m.text || '';
                  if (!body && !m.isMedia && !m.mimetype) continue;

                  const sender = m.author || m.sender || m.from || m.pushname || '+91 School Notice';
                  let dateStr = '';
                  let timeStr = '';
                  if (m.t || m.timestamp) {
                    const ts = typeof m.t === 'number' ? (m.t > 1e11 ? m.t : m.t * 1000) : (m.timestamp || Date.now());
                    const d = new Date(ts);
                    dateStr = (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
                    const hours = d.getHours();
                    const mins = d.getMinutes().toString().padStart(2, '0');
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    timeStr = (hours % 12 || 12) + ':' + mins + ' ' + ampm;
                  }

                  messages.push({
                    id: m.id?._serialized || m.id || ('idb_' + messages.length),
                    sender,
                    body,
                    date: dateStr || undefined,
                    time: timeStr || undefined,
                    timestamp: (timeStr && dateStr) ? (timeStr + ', ' + dateStr) : (dateStr || timeStr || ''),
                    isMedia: Boolean(m.isMedia || m.mimetype || m.type === 'document' || m.type === 'image'),
                    mimetype: m.mimetype || (m.type === 'document' ? 'application/pdf' : undefined),
                    filename: m.filename || (m.type === 'document' ? 'school_document.pdf' : undefined)
                  });
                }
              }

              // Read attachments from media store
              const rawMedia = await readAllFromStore(db, 'media');
              if (Array.isArray(rawMedia) && rawMedia.length > 0) {
                for (const med of rawMedia) {
                  if (med && med.data && (med.mimetype || med.filename)) {
                    const b64 = typeof med.data === 'string' ? med.data : '';
                    if (b64 && b64.length > 50) {
                      attachments.push({
                        name: med.filename || 'school_document.pdf',
                        mimeType: med.mimetype || 'application/pdf',
                        base64Content: b64.includes(',') ? b64.split(',')[1] : b64
                      });
                    }
                  }
                }
              }
            } finally {
              try { db.close(); } catch (e) {}
            }

            if (messages.length > 0) break;
          }

          return {
            success: true,
            engineUsed: 'INDEXED_DB',
            chatName: targetName,
            messages,
            attachments
          };
        } catch (err) {
          return {
            success: false,
            engineUsed: 'FALLBACK_DOM',
            chatName: targetChatName,
            messages: [],
            attachments: [],
            error: err.message
          };
        }
      })();
    `;
  }

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
