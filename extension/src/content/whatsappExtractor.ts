/**
 * WhatsApp Web DOM Extractor
 * Injected into web.whatsapp.com to extract messages, teacher broadcasts,
 * and circular links from user-specified school chats/groups.
 */

export interface WhatsAppMessage {
  id: string;
  chatName: string;
  sender: string;
  timestamp: string;
  date?: string;
  time?: string;
  body: string;
  hasMedia: boolean;
  mediaCaption?: string;
  detectedLinks: string[];
  isPinned?: boolean;
  isStarred?: boolean;
}

export interface TrackedWhatsAppChat {
  id: string;
  title: string;
  isGroup: boolean;
  addedAt: string;
}

export interface WhatsAppChatSummary {
  id?: string;
  chatName: string;
  unreadCount: number;
  lastMessageSnippet: string;
  lastMessageTime: string;
  isGroup: boolean;
}

export class WhatsAppExtractor {
  private static URL_REGEX = /(https?:\/\/[^\s]+)/g;

  private static TITLE_BLACKLIST = ['profile details', 'contact info', 'group info', 'search...', 'chats', 'communities', 'channels', 'starred messages', 'settings'];

  /**
   * Extracts clean, reliable active conversation title (excluding drawer/profile sidebar titles).
   */
  public static getActiveChatTitle(): string {
    // 1. Primary: In main conversation header
    const mainTitleEl = document.querySelector('#main header div[role="button"] span[title], #main header span[data-testid="conversation-info-header-chat-title"], #main header span[title], #main header span[dir="auto"]');
    if (mainTitleEl) {
      const t = (mainTitleEl.getAttribute('title') || mainTitleEl.textContent || '').trim();
      if (t && !this.TITLE_BLACKLIST.includes(t.toLowerCase())) return t;
    }

    // 2. Active item in conversation sidebar
    const activeSidebarEl = document.querySelector('div[role="listitem"][aria-selected="true"] span[title], div[data-testid="cell-frame-container"][aria-selected="true"] span[title], div[role="listitem"][aria-selected="true"] span[dir="auto"]');
    if (activeSidebarEl) {
      const t = (activeSidebarEl.getAttribute('title') || activeSidebarEl.textContent || '').trim();
      if (t && !this.TITLE_BLACKLIST.includes(t.toLowerCase())) return t;
    }

    // 3. Fallback inside #main
    const fallbackEl = document.querySelector('#main header span');
    if (fallbackEl) {
      const t = (fallbackEl.getAttribute('title') || fallbackEl.textContent || '').trim();
      if (t && !this.TITLE_BLACKLIST.includes(t.toLowerCase())) return t;
    }

    return '';
  }

  /**
   * Extracts permanent metadata (unique JID/ID and Title) for the currently open chat/group.
   */
  public static getActiveChatMetadata(): TrackedWhatsAppChat | null {
    const title = this.getActiveChatTitle();
    if (!title) return null;

    let chatId = '';

    // Check active item in sidebar
    const activeItem = document.querySelector('div[role="listitem"][aria-selected="true"], div[data-testid="cell-frame-container"][aria-selected="true"]');
    if (activeItem) {
      const img = activeItem.querySelector('img') as HTMLImageElement | null;
      if (img && img.src) {
        const match = img.src.match(/u=([^&]+)/);
        if (match && match[1]) {
          chatId = decodeURIComponent(match[1]);
        }
      }
    }

    // Check header avatar
    if (!chatId) {
      const headerImg = document.querySelector('#main header img, header img') as HTMLImageElement | null;
      if (headerImg && headerImg.src) {
        const match = headerImg.src.match(/u=([^&]+)/);
        if (match && match[1]) {
          chatId = decodeURIComponent(match[1]);
        }
      }
    }

    // Fallback deterministic ID from slugified title
    if (!chatId) {
      chatId = 'wa_chat_' + title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }

    const subtitleEl = document.querySelector('#main header span[data-testid="conversation-info-header-chat-subtitle"], #main header span._ak8j');
    const isGroup = subtitleEl ? (subtitleEl.textContent || '').includes(',') || (subtitleEl.textContent || '').toLowerCase().includes('click here') || (subtitleEl.textContent || '').toLowerCase().includes('group') : true;

    return {
      id: chatId,
      title: title,
      isGroup: isGroup,
      addedAt: new Date().toISOString()
    };
  }

  /**
   * Lists visible chats and groups from the WhatsApp Web sidebar.
   */
  public static getVisibleChats(): WhatsAppChatSummary[] {
    const results: WhatsAppChatSummary[] = [];
    const chatElements = document.querySelectorAll('div[role="listitem"], div[data-testid="cell-frame-container"]');

    chatElements.forEach((el, index) => {
      try {
        const titleEl = el.querySelector('span[title], div[title], span[dir="auto"]');
        const title = titleEl ? (titleEl.getAttribute('title') || titleEl.textContent || '').trim() : '';
        if (!title) return;

        if (results.some(c => c.chatName.toLowerCase() === title.toLowerCase())) return;

        let chatId = '';
        const img = el.querySelector('img') as HTMLImageElement | null;
        if (img && img.src) {
          const match = img.src.match(/u=([^&]+)/);
          if (match && match[1]) chatId = decodeURIComponent(match[1]);
        }

        const unreadEl = el.querySelector('span[aria-label*="unread"], span[data-testid="unread-count"]');
        const unreadCount = unreadEl ? parseInt(unreadEl.textContent || '0', 10) || 0 : 0;

        const snippetEl = el.querySelector('span[data-testid="last-msg-status"], div._ak8k, div._ak8l');
        const snippet = snippetEl ? snippetEl.textContent || '' : '';

        results.push({
          id: chatId,
          chatName: title,
          unreadCount,
          lastMessageSnippet: snippet,
          lastMessageTime: new Date().toISOString(),
          isGroup: true
        });
      } catch (e) {
        // Continue
      }
    });

    return results;
  }

  /**
   * Extracts messages from the currently active conversation in WhatsApp Web.
   */
  public static extractActiveChatMessages(targetChatFilter?: Array<string | TrackedWhatsAppChat>): WhatsAppMessage[] {
    const messages: WhatsAppMessage[] = [];

    const activeMeta = this.getActiveChatMetadata();
    const currentChatName = activeMeta?.title || 'Active School Chat';
    const currentChatId = activeMeta?.id || '';

    // If target filter is specified, check against either ID or Title
    if (targetChatFilter && targetChatFilter.length > 0) {
      const matches = targetChatFilter.some(target => {
        if (typeof target === 'string') {
          return currentChatName.toLowerCase().includes(target.toLowerCase().trim()) || (currentChatId && currentChatId.toLowerCase() === target.toLowerCase().trim());
        } else if (target && typeof target === 'object') {
          return (target.id && currentChatId && target.id.toLowerCase() === currentChatId.toLowerCase()) ||
                 (target.title && currentChatName.toLowerCase().includes(target.title.toLowerCase().trim()));
        }
        return false;
      });

      if (!matches) {
        return [];
      }
    }

    const parseDateHeaderString = (rawText: string): string | null => {
      if (!rawText) return null;
      const text = rawText.trim().replace(/[\u200E\u200F\u202A-\u202E]/g, '').trim();
      const upper = text.toUpperCase();
      if (upper === 'TODAY') {
        const now = new Date();
        return `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
      }
      if (upper === 'YESTERDAY') {
        const now = new Date();
        now.setDate(now.getDate() - 1);
        return `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
      }
      const months: Record<string, number> = {
        'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3, 'APRIL': 4, 'MAY': 5, 'JUNE': 6,
        'JULY': 7, 'AUGUST': 8, 'SEPTEMBER': 9, 'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12,
        'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'JUN': 6, 'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
      };
      const m1 = upper.match(/^(\d{1,2})\s+([A-Z]+)\s+(\d{4})$/);
      if (m1 && months[m1[2]]) {
        return `${months[m1[2]]}/${parseInt(m1[1], 10)}/${m1[3]}`;
      }
      const m2 = upper.match(/^([A-Z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
      if (m2 && months[m2[1]]) {
        return `${months[m2[1]]}/${parseInt(m2[2], 10)}/${m2[3]}`;
      }
      const m3 = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
      if (m3) {
        const p1 = parseInt(m3[1], 10);
        const p2 = parseInt(m3[2], 10);
        if (p1 > 12) {
          return `${p2}/${p1}/${m3[3]}`;
        }
        return `${p1}/${p2}/${m3[3]}`;
      }
      return null;
    };

    // 0. Auto-expand any truncated long messages ("Read more" buttons) in the active chat
    try {
      const readMoreButtons = document.querySelectorAll(
        'span[role="button"], div[role="button"], strong[role="button"], [class*="read-more"]'
      );
      readMoreButtons.forEach(btn => {
        const t = (btn.textContent || '').trim().toLowerCase();
        if (t === 'read more' || t === '... read more' || t === '… read more' || t.endsWith('read more')) {
          try {
            (btn as HTMLElement).click();
          } catch (btnErr) {}
        }
      });
    } catch (expandErr) {}

    // Query all chat elements in chronological document order
    const allChatElements = document.querySelectorAll(
      'div[data-testid="date-container"], span._ak72, span._ak73, [data-testid="chat-header-date"], .chat-date, ' +
      'div[data-testid="msg-container"], div.message-in, div.message-out, ' +
      'div.message, div.bubble, div.Message, .message-content, .bubble-content, ' +
      'li[id^="chat-messages-"], div[data-qa="message_container"], [class*="message-bubble"]'
    );

    let currentClusterDate = '';

    allChatElements.forEach((el, idx) => {
      try {
        const htmlEl = el as HTMLElement;
        const isDateHeader = htmlEl.matches && (
          htmlEl.matches('[data-testid="date-container"], span._ak72, span._ak73, [data-testid="chat-header-date"], .chat-date')
          || (htmlEl.textContent && /^(TODAY|YESTERDAY|\d{1,2}\s+[A-Za-z]+\s+\d{4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})$/i.test(htmlEl.textContent.trim()))
        );

        if (isDateHeader) {
          const parsed = parseDateHeaderString(htmlEl.textContent || '');
          if (parsed) {
            currentClusterDate = parsed;
          }
          return;
        }

        const isMsgRow = htmlEl.matches && htmlEl.matches(
          'div[data-testid="msg-container"], div.message-in, div.message-out, div.message, div.bubble, div.Message, [class*="message-bubble"], li[id^="chat-messages-"]'
        );
        if (!isMsgRow) return;

        const row = htmlEl;
        // 1. Primary: WhatsApp canonical data-pre-plain-text attribute
        const prePlainEl = (row.hasAttribute && row.hasAttribute('data-pre-plain-text'))
          ? row
          : row.querySelector('div[data-pre-plain-text], [data-pre-plain-text]');
        const prePlain = prePlainEl ? prePlainEl.getAttribute('data-pre-plain-text') : null;

        let sender = 'Teacher/Parent';
        let timeStr = '';
        let dateStr = '';

        if (prePlain) {
          const sMatch = prePlain.match(/\]\s*([^:]+):/);
          if (sMatch && sMatch[1]) {
            sender = sMatch[1].trim();
          }
          const bracketMatch = prePlain.match(/\[([^\]]+)\]/);
          if (bracketMatch && bracketMatch[1]) {
            const rawInside = bracketMatch[1].trim();
            const parts = rawInside.split(',').map(p => p.trim());
            if (parts.length >= 2) {
              if (parts[0].includes(':')) {
                timeStr = parts[0];
                dateStr = parts[1];
              } else {
                dateStr = parts[0];
                timeStr = parts[1];
              }
            } else if (parts.length === 1) {
              if (parts[0].includes(':')) {
                timeStr = parts[0];
              } else {
                dateStr = parts[0];
              }
            }
          }
          if (dateStr) {
            currentClusterDate = dateStr;
          }
        }

        // 2. Sender Fallback
        if (sender === 'Teacher/Parent') {
          const authorEl = row.querySelector('span._ak8q, span[data-testid="author"], .message-title, .sender-name');
          if (authorEl && authorEl.textContent) {
            const candidate = authorEl.textContent.replace(':', '').trim();
            if (candidate.length > 0 && candidate.length <= 40 && !candidate.includes('\n')) {
              sender = candidate;
            }
          }
        }

        // 3. Time Fallback
        if (!timeStr) {
          const timeEl = row.querySelector('span[data-testid="msg-meta"], div[data-testid="msg-meta"], span.bubble-meta, .time, time, [class*="timestamp"]');
          timeStr = timeEl ? (timeEl.textContent || '').trim() : '';
        }
        timeStr = (timeStr || '').replace(/^Edited\s*/i, '').replace(/[\u200E\u200F\u202A-\u202E]/g, '').trim();

        // 4. Inherit active date divider for this cluster
        if (!dateStr && currentClusterDate) {
          dateStr = currentClusterDate;
        }

        // 5. Filename date extraction fallback
        if (!dateStr) {
          const fnMatch = (row.textContent || '').match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
          if (fnMatch) {
            dateStr = `${parseInt(fnMatch[2], 10)}/${parseInt(fnMatch[1], 10)}/${fnMatch[3]}`;
          }
        }

        const cleanTimestamp = (timeStr && dateStr)
          ? `${timeStr}, ${dateStr}`
          : (dateStr || timeStr || new Date().toLocaleTimeString());

        // 4. Message text extraction
        // If this specific row still contains an unclicked "Read more", expand it
        const rowReadMore = row.querySelector('span[role="button"], div[role="button"], strong[role="button"], [class*="read-more"]');
        if (rowReadMore) {
          const t = (rowReadMore.textContent || '').trim().toLowerCase();
          if (t === 'read more' || t === '... read more' || t === '… read more' || t.endsWith('read more')) {
            try {
              (rowReadMore as HTMLElement).click();
            } catch (e) {}
          }
        }

        const textEl = row.querySelector('span.selectable-text, span._ao3e, div.copyable-text span');
        let text = textEl ? (textEl.textContent || '').trim() : '';

        // Strip trailing "... Read more" or "... read more" artifacts if lingering
        text = text.replace(/(?:\.\.\.|…)?\s*read\s+more\s*$/i, '').trim();

        // Clean up: If body text was erroneously identical to sender label only, clear it
        if (text === sender) {
          text = '';
        }

        // Document / PDF / Office file detection
        let documentTitle: string | undefined = undefined;
        const docCandidates = row.querySelectorAll(
          'span[data-testid="document-name"], div[data-testid="document-thumb"] + div span, div[data-testid="document-thumb"] ~ div span, .document-name, a.document-container span, span[title*="."], div[title*="."]'
        );
        for (let dIdx = 0; dIdx < docCandidates.length; dIdx++) {
          const el = docCandidates[dIdx];
          const cand = (el.getAttribute('title') || el.textContent || '').trim();
          if (cand && !cand.toLowerCase().includes('-icon') && !cand.toLowerCase().startsWith('icon-') && cand.length > 2 && cand.length < 150) {
            documentTitle = cand;
            break;
          }
        }
        if (!documentTitle && text) {
          const fnMatch = text.match(/([a-zA-Z0-9_\-.\s]+\.(?:pdf|docx?|xlsx?|pptx?|jpe?g|png))/i);
          if (fnMatch && fnMatch[1]) {
            documentTitle = fnMatch[1].trim();
          }
        }

        // Image / Media caption
        const captionEl = row.querySelector('span[data-testid="media-caption"], div.image-caption');
        const mediaCaption = captionEl ? (captionEl.textContent || '').trim() : undefined;
        const hasMedia = !!row.querySelector('img, video, div[data-testid="audio-player"], span[data-testid="document"]') || !!documentTitle;

        // Multi-image / Album detection
        const imgEls = row.querySelectorAll('img');
        const isAlbum = !!row.querySelector('div[data-testid="album"], [data-testid="album-grid"], div[class*="album"]') || imgEls.length > 1;

        let fullBody = text;
        if (documentTitle && !fullBody.includes(documentTitle)) {
          fullBody = `[Document Attachment: ${documentTitle}] ${fullBody}`.trim();
        }
        if (mediaCaption && !fullBody.includes(mediaCaption)) {
          fullBody = `${fullBody} [Media Caption: ${mediaCaption}]`.trim();
        }

        if (!fullBody && hasMedia) {
          if (isAlbum && imgEls.length > 1) {
            fullBody = `[Photo Album: ${imgEls.length} photos]`;
          } else if (documentTitle) {
            fullBody = `[Document Attachment: ${documentTitle}]`;
          } else {
            fullBody = `[Media Attachment]`;
          }
        } else if (isAlbum && imgEls.length > 1 && !fullBody.includes('[Photo Album:')) {
          fullBody = `[Photo Album: ${imgEls.length} photos] ${fullBody}`.trim();
        }

        if (!fullBody && !hasMedia) return;

        // Links scanner (Drive links, PDFs, circulars, meetings)
        const links: string[] = [];
        const linkMatches = fullBody.match(this.URL_REGEX);
        if (linkMatches) {
          linkMatches.forEach(l => {
            if (!links.includes(l)) links.push(l);
          });
        }

        messages.push({
          id: `wa_${Date.now()}_${idx}`,
          chatName: currentChatName,
          sender: sender || 'Sender',
          timestamp: cleanTimestamp,
          date: dateStr || undefined,
          time: timeStr || undefined,
          body: fullBody,
          hasMedia,
          mediaCaption: mediaCaption || documentTitle,
          detectedLinks: links
        });
      } catch (err) {
        // Skip malformed row
      }
    });

    // Local Date Propagation: safely fill in missing dates from immediate adjacent neighbors
    for (let fIdx = 0; fIdx < messages.length; fIdx++) {
      const m = messages[fIdx];
      if (!m.date) {
        const prev = fIdx > 0 ? messages[fIdx - 1] : null;
        const next = fIdx < messages.length - 1 ? messages[fIdx + 1] : null;
        const inherited = (prev && prev.date) || (next && next.date);
        if (inherited) {
          m.date = inherited;
          m.timestamp = (m.time && inherited) ? `${m.time}, ${inherited}` : (inherited || m.timestamp);
        }
      } else if (m.time && m.date && (!m.timestamp || !m.timestamp.includes(','))) {
        m.timestamp = `${m.time}, ${m.date}`;
      }
    }

    return messages;
  }

  /**
   * Starts passive real-time DOM observer for background indexing.
   */
  public static startPassiveObserver(onNewMessages: (messages: WhatsAppMessage[]) => void): void {
    const mainContainer = document.querySelector('#main, div[data-testid="conversation-panel-wrapper"]');
    if (!mainContainer) return;

    let debounceTimer: any = null;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const msgs = this.extractActiveChatMessages();
        if (msgs.length > 0) {
          onNewMessages(msgs);
        }
      }, 3000);
    });

    observer.observe(mainContainer, { childList: true, subtree: true });
  }
}

// Listen for messages from extension background
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;
    if (event.data.type === 'EXTRACT_WHATSAPP_REQUEST') {
      const targetFilter = event.data.targetFilter || [];
      const messages = WhatsAppExtractor.extractActiveChatMessages(targetFilter);
      const visibleChats = WhatsAppExtractor.getVisibleChats();

      window.postMessage({
        type: 'EXTRACT_WHATSAPP_RESPONSE',
        messages,
        visibleChats
      }, '*');
    }
  });

  // Start passive real-time scanner on page load
  try {
    WhatsAppExtractor.startPassiveObserver((newMsgs) => {
      try {
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'PASSIVE_WHATSAPP_MESSAGES_DETECTED',
            payload: { messages: newMsgs }
          });
        }
      } catch (e) {}
    });
  } catch (e) {}
}

