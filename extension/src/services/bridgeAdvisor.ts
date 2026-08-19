/**
 * BridgeAdvisor - Smart Mode Validation & Integration Advisory Engine
 * Advises users whether a site is best suited for 24/7 background API sync (Step 2 Portal Tool)
 * or Live Chrome MCP Web Bridge (active authenticated session).
 */
export interface AdvisoryResult {
  recommendedMode: 'BACKGROUND_PORTAL' | 'LIVE_CHROME_BRIDGE';
  title: string;
  message: string;
  reason: string;
  canUseOtherMode: boolean;
}

export class BridgeAdvisor {
  private static LIVE_SESSION_DOMAINS = [
    'web.whatsapp.com',
    'discord.com',
    'web.telegram.org',
    'teams.microsoft.com',
    'slack.com',
    'web.skype.com'
  ];

  private static BACKGROUND_PORTAL_DOMAINS = [
    'edusprint.in',
    'wittykids.edusprint.in',
    'classroom.google.com',
    'powerschool.com',
    'blackboard.com',
    'canvas.instructure.com',
    'schoology.com',
    'fedena.com',
    'entab.in',
    'nexteducation.com'
  ];

  /**
   * Evaluates a URL and returns a smart architectural recommendation.
   */
  public static evaluateUrl(url: string, currentToolMode: 'PORTAL_FEATURE' | 'LIVE_BRIDGE'): AdvisoryResult {
    if (!url) {
      return {
        recommendedMode: 'LIVE_CHROME_BRIDGE',
        title: '🌐 Universal Web Bridge',
        message: 'You can extract content from any active tab using the Chrome Web Bridge.',
        reason: 'No specific portal signature detected.',
        canUseOtherMode: true
      };
    }

    const lower = url.toLowerCase();
    const isLiveSessionDomain = this.LIVE_SESSION_DOMAINS.some(d => lower.includes(d));
    const isBackgroundPortalDomain = this.BACKGROUND_PORTAL_DOMAINS.some(d => lower.includes(d));

    // Case 1: User is trying to capture WhatsApp / Live Chat as a Background Portal Tool
    if (isLiveSessionDomain && currentToolMode === 'PORTAL_FEATURE') {
      return {
        recommendedMode: 'LIVE_CHROME_BRIDGE',
        title: '⚠️ Recommended: Use Live Chrome Web Bridge',
        message: 'This platform (e.g. WhatsApp Web / Live Chat) requires an active, authenticated browser tab and WebSocket session.',
        reason: 'Background server-side proxies cannot decrypt end-to-end encrypted or interactive WebSocket sessions without an active browser tab.',
        canUseOtherMode: false
      };
    }

    // Case 2: User is using Live Web Bridge for a site that supports 24/7 Background Sync
    if (isBackgroundPortalDomain && currentToolMode === 'LIVE_BRIDGE') {
      return {
        recommendedMode: 'BACKGROUND_PORTAL',
        title: '💡 Tip: 24/7 Background Portal Sync Available',
        message: 'This school portal (e.g. EduSprint / Classroom) can be captured in Step 2 as an automated 24/7 background tool.',
        reason: 'Step 2 tools run directly on your personal Google Apps Script server even when your computer is closed or offline.',
        canUseOtherMode: true
      };
    }

    // Default recommendations based on domain type
    if (isLiveSessionDomain) {
      return {
        recommendedMode: 'LIVE_CHROME_BRIDGE',
        title: '💬 Live Session Bridge Active',
        message: 'Optimal for live messaging, broadcasts, and active browser sessions.',
        reason: 'Uses active Chrome tab DOM and WebSocket session securely.',
        canUseOtherMode: false
      };
    }

    if (isBackgroundPortalDomain) {
      return {
        recommendedMode: 'BACKGROUND_PORTAL',
        title: '🏫 School Portal Detected',
        message: 'Can be configured for automated 24/7 sync in Step 2 or queried live via the Chrome Bridge.',
        reason: 'Supports both background proxy extraction and live DOM inspection.',
        canUseOtherMode: true
      };
    }

    return {
      recommendedMode: 'LIVE_CHROME_BRIDGE',
      title: '🌐 Universal Web Extraction Ready',
      message: 'Ready to extract live table data, articles, and notices from this page.',
      reason: 'Universal DOM extraction works for any active website.',
      canUseOtherMode: true
    };
  }
}
