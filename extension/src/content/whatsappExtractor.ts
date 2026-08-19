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
  body: string;
  hasMedia: boolean;
  mediaCaption?: string;
  detectedLinks: string[];
  isPinned?: boolean;
  isStarred?: boolean;
}

export interface WhatsAppChatSummary {
  chatName: string;
  unreadCount: number;
  lastMessageSnippet: string;
  lastMessageTime: string;
  isGroup: boolean;
}

export class WhatsAppExtractor {
  private static URL_REGEX = /(https?:\/\/[^\s]+)/g;

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

        // Skip duplicates
        if (results.some(c => c.chatName.toLowerCase() === title.toLowerCase())) return;

        // Unread badge
        const unreadEl = el.querySelector('span[aria-label*="unread"], span[data-testid="unread-count"]');
        const unreadCount = unreadEl ? parseInt(unreadEl.textContent || '0', 10) || 0 : 0;

        // Last snippet & time
        const snippetEl = el.querySelector('span[data-testid="last-msg-status"], div._ak8k, div._ak8l');
        const snippet = snippetEl ? snippetEl.textContent || '' : '';

        results.push({
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
  public static extractActiveChatMessages(targetChatFilter?: string[]): WhatsAppMessage[] {
    const messages: WhatsAppMessage[] = [];

    // Detect currently open chat header
    const headerTitleEl = document.querySelector('header span[title], header div[title], header span[dir="auto"]');
    const currentChatName = headerTitleEl ? (headerTitleEl.getAttribute('title') || headerTitleEl.textContent || '').trim() : 'Unknown Chat';

    // If target filter is specified, ensure current chat matches
    if (targetChatFilter && targetChatFilter.length > 0) {
      const lowerChat = currentChatName.toLowerCase();
      const matches = targetChatFilter.some(t => lowerChat.includes(t.toLowerCase().trim()));
      if (!matches) {
        return [];
      }
    }

    // Query message bubble rows
    const messageRows = document.querySelectorAll('div[data-testid="msg-container"], div.message-in, div.message-out');

    messageRows.forEach((row, idx) => {
      try {
        // Sender name
        const senderEl = row.querySelector('span[aria-label*=":"], span._ak8q, div[data-pre-plain-text]');
        let sender = 'Teacher/Parent';
        if (senderEl) {
          const prePlain = senderEl.getAttribute('data-pre-plain-text');
          if (prePlain) {
            // e.g. "[10:15 am, 18/08/2026] Teacher Anita:"
            const match = prePlain.match(/\]\s*([^:]+):/);
            if (match && match[1]) sender = match[1].trim();
          } else {
            sender = (senderEl.textContent || 'Teacher/Parent').replace(':', '').trim();
          }
        }

        // Message text
        const textEl = row.querySelector('span.selectable-text, div.copyable-text, span[dir="ltr"], span[dir="auto"]');
        const text = textEl ? (textEl.textContent || '').trim() : '';

        // Media / Image caption
        const captionEl = row.querySelector('span[data-testid="media-caption"], div.image-caption');
        const mediaCaption = captionEl ? (captionEl.textContent || '').trim() : undefined;
        const hasMedia = !!row.querySelector('img, video, div[data-testid="audio-player"], span[data-testid="document"]');

        const fullBody = (text + (mediaCaption ? ` [Media: ${mediaCaption}]` : '')).trim();
        if (!fullBody && !hasMedia) return;

        // Links scanner (Drive links, PDFs, circulars, meetings)
        const links: string[] = [];
        const linkMatches = fullBody.match(this.URL_REGEX);
        if (linkMatches) {
          linkMatches.forEach(l => {
            if (!links.includes(l)) links.push(l);
          });
        }

        // Time
        const timeEl = row.querySelector('span[data-testid="msg-meta"], div[data-testid="msg-meta"], span.bubble-meta');
        const timeStr = timeEl ? (timeEl.textContent || '').trim() : '';

        messages.push({
          id: `wa_${Date.now()}_${idx}`,
          chatName: currentChatName,
          sender: sender || 'Sender',
          timestamp: timeStr || new Date().toLocaleTimeString(),
          body: fullBody,
          hasMedia,
          mediaCaption,
          detectedLinks: links
        });
      } catch (err) {
        // Skip malformed row
      }
    });

    return messages;
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
}
