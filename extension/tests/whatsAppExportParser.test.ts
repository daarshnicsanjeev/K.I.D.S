import { describe, it, expect } from 'vitest';
import { WhatsAppExportParser } from '../src/services/whatsAppExportParser';

describe('WhatsAppExportParser — In-Memory ZIP & Plain Text Export Suite', () => {

  describe('1. MIME Type Resolution', () => {
    it('should resolve correct MIME types for documents, images, and sheets', () => {
      expect(WhatsAppExportParser.getMimeType('Circular.pdf')).toBe('application/pdf');
      expect(WhatsAppExportParser.getMimeType('photo.jpg')).toBe('image/jpeg');
      expect(WhatsAppExportParser.getMimeType('image.png')).toBe('image/png');
      expect(WhatsAppExportParser.getMimeType('schedule.xlsx')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(WhatsAppExportParser.getMimeType('doc.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });
  });

  describe('2. Plain Text Export Parsing', () => {
    it('should parse UTF-8 plain text export and extract chat title hint', async () => {
      const rawText = `
[7/13/2026, 5:47 PM] Ms. Bhumika Parmar: Dear Parents, Declamation Competition is scheduled.
[7/13/2026, 7:49 PM] Ruchi: PARENT DAY CELEBRATION 2026.pdf (file attached)
[7/22/2026, 11:38 AM] Class Mentor: Field trip circular attached.
      `.trim();

      const encoder = new TextEncoder();
      const buffer = encoder.encode(rawText).buffer;

      const result = await WhatsAppExportParser.parseExportBuffer(buffer, 'WhatsApp Chat with 3B Cambridge 2026 - 27.txt');
      expect(result.chatText).toContain('Declamation Competition');
      expect(result.chatName).toBe('3B Cambridge 2026 - 27');
      expect(result.attachments).toHaveLength(0);
    });
  });

  describe('3. Base64 Binary Conversion', () => {
    it('should convert Uint8Array bytes to standard Base64 string', () => {
      const encoder = new TextEncoder();
      const bytes = encoder.encode('Hello School MCP');
      const b64 = WhatsAppExportParser.uint8ArrayToBase64(bytes);
      expect(b64).toBe(btoa('Hello School MCP'));
    });
  });
});
