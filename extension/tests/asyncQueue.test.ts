import { describe, it, expect } from 'vitest';
import { AsyncQueue } from '../src/utils/asyncQueue';

describe('AsyncQueue', () => {
  it('enqueues and dequeues items in FIFO order when items already exist', async () => {
    const queue = new AsyncQueue<string>();
    queue.enqueue('item1');
    queue.enqueue('item2');
    expect(queue.size).toBe(2);

    const first = await queue.dequeue();
    const second = await queue.dequeue();
    expect(first).toBe('item1');
    expect(second).toBe('item2');
    expect(queue.size).toBe(0);
  });

  it('reactively suspends consumer when empty and wakes up immediately on enqueue', async () => {
    const queue = new AsyncQueue<{ fileId: string; fileName: string }>();
    expect(queue.isWaiting).toBe(false);

    // Consumer starts waiting
    const dequeuePromise = queue.dequeue();
    expect(queue.isWaiting).toBe(true);

    // Producer enqueues an item after a brief delay
    setTimeout(() => {
      queue.enqueue({ fileId: 'f123', fileName: 'scan.jpg' });
    }, 10);

    const item = await dequeuePromise;
    expect(item).toEqual({ fileId: 'f123', fileName: 'scan.jpg' });
    expect(queue.isWaiting).toBe(false);
  });

  it('resolves pending consumers with null when close() is called', async () => {
    const queue = new AsyncQueue<number>();
    const pendingConsumer = queue.dequeue();
    expect(queue.isWaiting).toBe(true);

    queue.close();
    const result = await pendingConsumer;
    expect(result).toBeNull();
    expect(queue.isClosed).toBe(true);
  });

  it('drains remaining items first before returning null on close()', async () => {
    const queue = new AsyncQueue<string>();
    queue.enqueue('remaining1');
    queue.close();

    expect(queue.isClosed).toBe(true);
    expect(await queue.dequeue()).toBe('remaining1');
    expect(await queue.dequeue()).toBeNull();
  });
});
