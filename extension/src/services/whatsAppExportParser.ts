/**
 * WhatsAppExportParser — Zero-Dependency In-Memory ZIP and Text Parser for WhatsApp Export Archives
 * Supports standard ZIP format with Deflate decompression via DecompressionStream,
 * and direct UTF-8 plain text exports.
 */

export interface ParsedWhatsAppExport {
  chatText: string;
  chatName?: string;
  attachments: Array<{
    name: string;
    mimeType: string;
    base64Content: string;
  }>;
}

export class WhatsAppExportParser {
  /**
   * Detects MIME type based on file extension
   */
  public static getMimeType(fileName: string): string {
    const lower = (fileName || '').toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
    if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (lower.endsWith('.doc')) return 'application/msword';
    if (lower.endsWith('.opus')) return 'audio/opus';
    if (lower.endsWith('.mp3')) return 'audio/mpeg';
    if (lower.endsWith('.mp4')) return 'video/mp4';
    if (lower.endsWith('.txt')) return 'text/plain';
    return 'application/octet-stream';
  }

  /**
   * Converts a Uint8Array to a Base64 string in memory
   */
  public static uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, chunk as any);
    }
    return btoa(binary);
  }

  /**
   * Decompresses raw Deflate bytes using standard browser/Node DecompressionStream
   */
  public static async decompressDeflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
    try {
      if (typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('deflate-raw');
        const stream = new Response(new Blob([compressed.buffer as ArrayBuffer])).body;
        if (stream) {
          const decompressedStream = stream.pipeThrough(ds);
          const decompressedBlob = await new Response(decompressedStream).blob();
          const arrayBuf = await decompressedBlob.arrayBuffer();
          return new Uint8Array(arrayBuf);
        }
      }
    } catch (e) {
      console.warn('[WhatsAppExportParser] DecompressionStream failed, trying standard fallback:', e);
    }
    return compressed;
  }

  /**
   * Parses an ArrayBuffer containing either a ZIP export archive or plain text file
   */
  public static async parseExportBuffer(buffer: ArrayBuffer, fileNameHint = ''): Promise<ParsedWhatsAppExport> {
    const bytes = new Uint8Array(buffer);
    
    // Check for ZIP magic number: 0x50, 0x4B, 0x03, 0x04 (PK\x03\x04)
    const isZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04;

    if (!isZip) {
      // Plain text export
      const textDecoder = new TextDecoder('utf-8');
      const chatText = textDecoder.decode(bytes);
      let detectedChatName = '';
      const nameMatch = fileNameHint.match(/WhatsApp Chat (?:with|-)\s*([^.]+)/i);
      if (nameMatch && nameMatch[1]) {
        detectedChatName = nameMatch[1].trim();
      }
      return {
        chatText,
        chatName: detectedChatName || undefined,
        attachments: []
      };
    }

    // ZIP Archive Parsing
    const view = new DataView(buffer);
    let offset = 0;
    let mainChatText = '';
    const attachments: Array<{ name: string; mimeType: string; base64Content: string }> = [];

    while (offset + 30 <= buffer.byteLength) {
      const signature = view.getUint32(offset, true);
      if (signature !== 0x04034b50) {
        break; // End of local file headers or reached central directory
      }

      const compressionMethod = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const uncompressedSize = view.getUint32(offset + 22, true);
      const fileNameLength = view.getUint16(offset + 26, true);
      const extraFieldLength = view.getUint16(offset + 28, true);

      const fileNameBytes = new Uint8Array(buffer, offset + 30, fileNameLength);
      const entryName = new TextDecoder('utf-8').decode(fileNameBytes);
      const fileDataStart = offset + 30 + fileNameLength + extraFieldLength;

      if (fileDataStart + compressedSize <= buffer.byteLength && compressedSize > 0) {
        const rawFileData = new Uint8Array(buffer, fileDataStart, compressedSize);
        let decompressedBytes: Uint8Array = rawFileData;

        if (compressionMethod === 8) {
          // Deflate
          decompressedBytes = await this.decompressDeflateRaw(rawFileData);
        }

        if (entryName.endsWith('.txt') || entryName.toLowerCase() === '_chat.txt' || entryName.toLowerCase().startsWith('whatsapp chat')) {
          const txtContent = new TextDecoder('utf-8').decode(decompressedBytes);
          if (!mainChatText || txtContent.length > mainChatText.length) {
            mainChatText = txtContent;
          }
        } else if (!entryName.endsWith('/') && decompressedBytes.length > 0) {
          attachments.push({
            name: entryName.split('/').pop() || entryName,
            mimeType: this.getMimeType(entryName),
            base64Content: this.uint8ArrayToBase64(decompressedBytes)
          });
        }
      }

      offset = fileDataStart + compressedSize;
    }

    let detectedChatName = '';
    const nameMatch = fileNameHint.match(/WhatsApp Chat (?:with|-)\s*([^.]+)/i);
    if (nameMatch && nameMatch[1]) {
      detectedChatName = nameMatch[1].trim();
    }

    return {
      chatText: mainChatText,
      chatName: detectedChatName || undefined,
      attachments
    };
  }
}
