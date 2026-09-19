/**
 * AsyncQueue<T>
 * A non-blocking, zero-polling asynchronous FIFO queue for Producer-Consumer pipelines.
 *
 * Designed for background workers (e.g. concurrent Download Producer + sequential OCR Consumer):
 * - If the queue is empty, dequeue() suspends the consumer reactively without CPU consumption.
 * - When an item is enqueued, the waiting consumer wakes up immediately.
 * - When close() is called by the producer, any pending consumer is resolved with null to finish cleanly.
 */
export class AsyncQueue<T> {
  private buffer: T[] = [];
  private waiters: Array<(item: T | null) => void> = [];
  private closed = false;

  public enqueue(item: T): void {
    if (this.closed) {
      throw new Error('[AsyncQueue] Cannot enqueue item into a closed queue.');
    }
    if (this.waiters.length > 0) {
      const resolver = this.waiters.shift()!;
      resolver(item);
    } else {
      this.buffer.push(item);
    }
  }

  public async dequeue(): Promise<T | null> {
    if (this.buffer.length > 0) {
      return this.buffer.shift()!;
    }
    if (this.closed) {
      return null;
    }
    return new Promise<T | null>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  public close(): void {
    this.closed = true;
    while (this.waiters.length > 0) {
      const resolver = this.waiters.shift()!;
      resolver(null);
    }
  }

  public get size(): number {
    return this.buffer.length;
  }

  public get isWaiting(): boolean {
    return this.waiters.length > 0;
  }

  public get isClosed(): boolean {
    return this.closed;
  }
}
