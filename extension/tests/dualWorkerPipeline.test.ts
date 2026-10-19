import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AsyncQueue } from '../src/utils/asyncQueue';
import { PersonalDriveService, OcrQueueItem } from '../src/services/personalDriveService';
import { WhatsAppDiagnosticLogger } from '../src/services/whatsappLogger';

describe('Dual-Worker Pipeline with Reactive Waiting', () => {
  const logs: any[] = [];

  beforeEach(() => {
    logs.length = 0;
    vi.restoreAllMocks();
    vi.spyOn(WhatsAppDiagnosticLogger, 'log').mockImplementation(async (level, tag, message) => {
      logs.push({ level, tag, message });
    });
  });

  it('OCR worker waits during digital text downloads and wakes up immediately for raster images', async () => {
    const queue = new AsyncQueue<OcrQueueItem>();
    const rpcSpy = vi.spyOn(PersonalDriveService, 'callGasWorkerRpc').mockResolvedValue({
      success: true,
      record: { fileId: 'img_1' },
      isOcr: true,
      wordCount: 45
    });

    // Start Worker 2: OCR Consumer
    const consumerPromise = PersonalDriveService.runOcrConsumer(
      queue,
      'https://gas.mock/exec',
      'Atharva',
      'folder_123',
      () => ({ downloaded: 3, skipped: 0, failed: 0 })
    );

    // Give consumer 20ms to enter idle wait
    await new Promise((r) => setTimeout(r, 20));
    expect(queue.isWaiting).toBe(true);

    // Producer enqueues a DIRECT_TEXT item (digital text document)
    queue.enqueue({
      fileId: 'doc_1',
      fileName: 'homework.docx',
      category: 'DIRECT_TEXT',
      source: 'classroom',
      childName: 'Atharva'
    });

    // Give consumer 20ms to process direct text
    await new Promise((r) => setTimeout(r, 20));

    // DIRECT_TEXT should NOT trigger expensive GAS OCR RPC!
    expect(rpcSpy).not.toHaveBeenCalled();

    // Verify consumer is back to waiting because no images are in queue
    expect(queue.isWaiting).toBe(true);

    // Producer enqueues a raster image (NEEDS_OCR)
    queue.enqueue({
      fileId: 'img_1',
      fileName: 'blackboard_scan.jpg',
      category: 'NEEDS_OCR',
      source: 'classroom',
      childName: 'Atharva'
    });

    // Wait for OCR RPC to execute
    await new Promise((r) => setTimeout(r, 50));
    expect(rpcSpy).toHaveBeenCalledTimes(1);
    expect(rpcSpy).toHaveBeenCalledWith(
      'https://gas.mock/exec',
      'ocr_single_file',
      expect.objectContaining({ fileId: 'img_1', source: 'classroom' }),
      1
    );

    // Producer signals all downloads are finished
    queue.close();
    const totalIndexed = await consumerPromise;

    // Both doc_1 (direct text) and img_1 (image) are indexed
    expect(totalIndexed).toBe(2);

    // Verify diagnostic logs captured the idle wait and completion
    const idleLog = logs.find((l) => l.message.includes('[OCR_WORKER_IDLE]'));
    const ocrDoneLog = logs.find((l) => l.message.includes('[OCR_INDEXED]'));
    const completeLog = logs.find((l) => l.message.includes('[DUAL_WORKER_OCR_COMPLETE]'));

    expect(idleLog).toBeDefined();
    expect(ocrDoneLog).toBeDefined();
    expect(completeLog).toBeDefined();
  });
});
