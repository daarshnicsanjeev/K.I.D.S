import { describe, it, expect } from 'vitest';
import { PlatformStoreConnector } from '../src/services/platformStoreConnector';

describe('PlatformStoreConnector — In-Memory Store & Direct Storage API Unit Suite', () => {

  describe('1. Store Hook Script Generation', () => {
    it('should generate valid Webpack chunk injection script for WhatsApp Web', () => {
      const script = PlatformStoreConnector.getWhatsAppStoreHookScript();
      expect(script).toContain('webpackChunkwhatsapp_web_client');
      expect(script).toContain('window.Store');
      expect(script).toContain('Chat');
      expect(script).toContain('Msg');
    });
  });

  describe('2. Message Normalization from In-Memory Store Objects', () => {
    it('should correctly normalize raw WhatsApp Store message objects with unix timestamps', () => {
      const rawStoreMsgs = [
        {
          id: { _serialized: 'true_917710973630@g.us_3EB01' },
          author: '+91 77109 73630',
          body: 'Invitation to Participate in Design Championship 2026',
          t: 1723618560, // 8/14/2024 approx
          type: 'document',
          mimetype: 'application/pdf',
          filename: 'Design Championship 2026 Circular.pdf'
        },
        {
          id: 'msg_2',
          pushname: 'Teji Sayal Bindra',
          body: 'SST Homework – Community Helpers submission date 25th August',
          t: 1723985520,
          type: 'chat'
        }
      ];

      const normalized = PlatformStoreConnector.normalizeStoreMessages(rawStoreMsgs);
      expect(normalized).toHaveLength(2);
      
      expect(normalized[0].id).toBe('true_917710973630@g.us_3EB01');
      expect(normalized[0].sender).toBe('+91 77109 73630');
      expect(normalized[0].body).toBe('Invitation to Participate in Design Championship 2026');
      expect(normalized[0].isMedia).toBe(true);
      expect(normalized[0].filename).toBe('Design Championship 2026 Circular.pdf');

      expect(normalized[1].id).toBe('msg_2');
      expect(normalized[1].sender).toBe('Teji Sayal Bindra');
      expect(normalized[1].isMedia).toBe(false);
    });

    it('should handle empty or malformed message arrays gracefully', () => {
      expect(PlatformStoreConnector.normalizeStoreMessages(null as any)).toEqual([]);
      expect(PlatformStoreConnector.normalizeStoreMessages(undefined as any)).toEqual([]);
      expect(PlatformStoreConnector.normalizeStoreMessages([])).toEqual([]);
    });
  });

  describe('3. Unified Chat Text Formatting for AI Pipeline', () => {
    it('should format normalized store messages into canonical AI input text', () => {
      const msgs = [
        {
          id: '1',
          sender: 'Teji Sayal Bindra',
          body: 'Please submit Hindi poem recitation video by Friday.',
          date: '8/25/2026',
          time: '6:30 PM'
        },
        {
          id: '2',
          sender: 'Ruchi',
          body: 'Circular for Annual Sports Day attached.',
          date: '8/26/2026',
          time: '7:15 PM'
        }
      ];

      const formatted = PlatformStoreConnector.formatStoreChatText(msgs);
      expect(formatted).toContain('[6:30 PM, 8/25/2026] Teji Sayal Bindra:\nPlease submit Hindi poem recitation video by Friday.');
      expect(formatted).toContain('[7:15 PM, 8/26/2026] Ruchi:\nCircular for Annual Sports Day attached.');
    });
  });

  describe('4. Direct IndexedDB Script Generation', () => {
    it('should generate valid direct IndexedDB query script targeting message and media stores', () => {
      const script = PlatformStoreConnector.getDirectIndexedDbExtractionScript('3B Cambridge 2026 - 27');
      expect(script).toContain('indexedDB.open');
      expect(script).toContain('model-storage');
      expect(script).toContain('message');
      expect(script).toContain('media');
      expect(script).toContain('3B Cambridge 2026 - 27');
    });
  });
});
