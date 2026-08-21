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

        // Document / PDF file detection
        const docTitleEl = row.querySelector('span[title*="."], div[data-testid="document-thumb"] + div span, span[data-testid="document-name"]');
        const documentTitle = docTitleEl ? (docTitleEl.getAttribute('title') || docTitleEl.textContent || '').trim() : undefined;

        // Image / Media caption
        const captionEl = row.querySelector('span[data-testid="media-caption"], div.image-caption');
        const mediaCaption = captionEl ? (captionEl.textContent || '').trim() : undefined;
        const hasMedia = !!row.querySelector('img, video, div[data-testid="audio-player"], span[data-testid="document"]') || !!documentTitle;

        let fullBody = text;
        if (documentTitle && !fullBody.includes(documentTitle)) {
          fullBody = `[Document Attachment: ${documentTitle}] ${fullBody}`.trim();
        }
        if (mediaCaption && !fullBody.includes(mediaCaption)) {
          fullBody = `${fullBody} [Media Caption: ${mediaCaption}]`.trim();
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
          mediaCaption: mediaCaption || documentTitle,
          detectedLinks: links
        });
      } catch (err) {
        // Skip malformed row
      }
    });

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

