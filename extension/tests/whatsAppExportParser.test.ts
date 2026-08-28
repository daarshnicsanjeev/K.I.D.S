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

  describe('4. Central Directory ZIP Parsing', () => {
    it('should parse an uncompressed ZIP containing _chat.txt via Central Directory', async () => {
      const chatContent = '[7/13/2026, 5:47 PM] Teacher: Field trip to Science Center next week.';
      const chatBytes = new TextEncoder().encode(chatContent);
      const fileName = '_chat.txt';
      const fileNameBytes = new TextEncoder().encode(fileName);

      // Construct Local File Header (30 + fileNameLen + dataLen)
      const localHeaderSize = 30 + fileNameBytes.length + chatBytes.length;
      const cdEntrySize = 46 + fileNameBytes.length;
      const eocdSize = 22;
      const totalSize = localHeaderSize + cdEntrySize + eocdSize;

      const buffer = new ArrayBuffer(totalSize);
      const view = new DataView(buffer);
      const u8 = new Uint8Array(buffer);

      // 1. Local File Header
      view.setUint32(0, 0x04034b50, true); // signature
      view.setUint16(4, 20, true); // version needed
      view.setUint16(6, 0, true); // bit flag
      view.setUint16(8, 0, true); // compression 0 (store)
      view.setUint16(10, 0, true); // mod time
      view.setUint16(12, 0, true); // mod date
      view.setUint32(14, 0, true); // crc32
      view.setUint32(18, chatBytes.length, true); // compressed size
      view.setUint32(22, chatBytes.length, true); // uncompressed size
      view.setUint16(26, fileNameBytes.length, true); // filename len
      view.setUint16(28, 0, true); // extra len
      u8.set(fileNameBytes, 30);
      u8.set(chatBytes, 30 + fileNameBytes.length);

      // 2. Central Directory Header
      const cdOffset = localHeaderSize;
      view.setUint32(cdOffset, 0x02014b50, true); // signature
      view.setUint16(cdOffset + 4, 20, true); // version made by
      view.setUint16(cdOffset + 6, 20, true); // version needed
      view.setUint16(cdOffset + 8, 0, true); // bit flag
      view.setUint16(cdOffset + 10, 0, true); // compression 0 (store)
      view.setUint16(cdOffset + 12, 0, true); // mod time
      view.setUint16(cdOffset + 14, 0, true); // mod date
      view.setUint32(cdOffset + 16, 0, true); // crc32
      view.setUint32(cdOffset + 20, chatBytes.length, true); // comp size
      view.setUint32(cdOffset + 24, chatBytes.length, true); // uncomp size
      view.setUint16(cdOffset + 28, fileNameBytes.length, true); // name len
      view.setUint16(cdOffset + 30, 0, true); // extra len
      view.setUint16(cdOffset + 32, 0, true); // comment len
      view.setUint16(cdOffset + 34, 0, true); // disk num
      view.setUint16(cdOffset + 36, 0, true); // int attr
      view.setUint32(cdOffset + 38, 0, true); // ext attr
      view.setUint32(cdOffset + 42, 0, true); // local header offset
      u8.set(fileNameBytes, cdOffset + 46);

      // 3. EOCD
      const eocdOffset = cdOffset + cdEntrySize;
      view.setUint32(eocdOffset, 0x06054b50, true); // EOCD signature
      view.setUint16(eocdOffset + 4, 0, true); // disk num
      view.setUint16(eocdOffset + 6, 0, true); // cd disk num
      view.setUint16(eocdOffset + 8, 1, true); // disk entries
      view.setUint16(eocdOffset + 10, 1, true); // total entries
      view.setUint32(eocdOffset + 12, cdEntrySize, true); // cd size
      view.setUint32(eocdOffset + 16, cdOffset, true); // cd offset
      view.setUint16(eocdOffset + 20, 0, true); // comment len

      const parsed = await WhatsAppExportParser.parseExportBuffer(buffer, 'WhatsApp Chat with 3B Cambridge 2026 - 27.zip');
      expect(parsed.chatText).toContain('Science Center');
      expect(parsed.chatName).toBe('3B Cambridge 2026 - 27');
    });
  });
});
