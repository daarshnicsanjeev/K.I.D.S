import { describe, it, expect } from 'vitest';
import { BridgeAdvisor } from '../src/services/bridgeAdvisor';

describe('BridgeAdvisor', () => {
  it('should recommend LIVE_CHROME_BRIDGE when user attempts PORTAL_FEATURE on web.whatsapp.com', () => {
    const res = BridgeAdvisor.evaluateUrl('https://web.whatsapp.com/', 'PORTAL_FEATURE');
    expect(res.recommendedMode).toBe('LIVE_CHROME_BRIDGE');
    expect(res.title).toContain('Recommended: Use Live Chrome Web Bridge');
    expect(res.canUseOtherMode).toBe(false);
  });

  it('should recommend BACKGROUND_PORTAL when user uses LIVE_BRIDGE on EduSprint portal', () => {
    const res = BridgeAdvisor.evaluateUrl('https://wittykids.edusprint.in/vjtf/Portal/Default/IndexLite', 'LIVE_BRIDGE');
    expect(res.recommendedMode).toBe('BACKGROUND_PORTAL');
    expect(res.title).toContain('24/7 Background Portal Sync Available');
    expect(res.canUseOtherMode).toBe(true);
  });

  it('should return universal live extraction ready for arbitrary websites', () => {
    const res = BridgeAdvisor.evaluateUrl('https://en.wikipedia.org/wiki/Science', 'LIVE_BRIDGE');
    expect(res.recommendedMode).toBe('LIVE_CHROME_BRIDGE');
    expect(res.title).toContain('Universal Web Extraction Ready');
    expect(res.canUseOtherMode).toBe(true);
  });
});
