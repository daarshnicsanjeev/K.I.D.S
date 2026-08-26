/**
 * Universal Platform Extractor
 * Generic multi-platform chat scraper that captures raw message blocks
 * from WhatsApp Web, Telegram Web (K & A versions), and generic school notice boards.
 */

import { AiNormalizerService, NormalizedNoticeMessage } from '../services/aiNormalizer';

export interface RawChatDump {
  platform: 'whatsapp' | 'telegram' | 'generic';
  chatTitle: string;
  rawText: string;
  capturedAt: string;
}

export class UniversalPlatformExtractor {
  /**
   * Detects the active messaging platform from URL and DOM signatures.
   */
  public static detectPlatform(): 'whatsapp' | 'telegram' | 'generic' {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('whatsapp.com')) return 'whatsapp';
    if (host.includes('telegram.org')) return 'telegram';
    return 'generic';
  }

  /**
   * Scrapes raw unformatted chat text from the active conversation view.
   */
  public static extractRawChat(): RawChatDump {
    const platform = this.detectPlatform();
    let chatTitle = 'School Chat';
    let rawText = '';

    if (platform === 'whatsapp') {
      const headerTitleEl = document.querySelector('header span[data-testid="conversation-info-header-chat-title"], header span[dir="auto"], #main header span._ak8q');
      if (headerTitleEl && headerTitleEl.textContent) {
        chatTitle = headerTitleEl.textContent.trim();
      }

      // Grab chat container text
      const chatContainer = document.querySelector('div[data-testid="conversation-panel-messages"], div.copyable-area');
      if (chatContainer) {
        rawText = (chatContainer as HTMLElement).innerText || chatContainer.textContent || '';
      }
    } else if (platform === 'telegram') {
      // Telegram Web A / K chat title
      const tgTitleEl = document.querySelector('.chat-info .peer-title, .top .user-title, .chat-title, h3.chat-title');
      if (tgTitleEl && tgTitleEl.textContent) {
        chatTitle = tgTitleEl.textContent.trim();
      }

      // Telegram Web message history container
      const tgHistory = document.querySelector('.messages-container, .bubbles, .history, .chat-messages');
      if (tgHistory) {
        rawText = (tgHistory as HTMLElement).innerText || tgHistory.textContent || '';
      }
    }

    // Fallback: If platform specific container was not found, grab main content text
    if (!rawText) {
      const mainContent = document.querySelector('main, #main, .main-container, [role="main"]') || document.body;
      rawText = (mainContent as HTMLElement).innerText || mainContent.textContent || '';
    }

    return {
      platform,
      chatTitle,
      rawText: rawText.trim(),
      capturedAt: new Date().toISOString()
    };
  }

  /**
   * Universal one-shot extraction: grabs raw text and normalizes via Chrome Gemini Nano AI.
   */
  public static async extractAndNormalize(
    childName = 'Atharva',
    onDownloadProgress?: (progressPercent: number) => void
  ): Promise<NormalizedNoticeMessage[]> {
    const dump = this.extractRawChat();
    if (!dump.rawText) return [];

    return await AiNormalizerService.normalizeRawChatText(
      dump.rawText,
      dump.chatTitle,
      childName,
      onDownloadProgress
    );
  }
}
