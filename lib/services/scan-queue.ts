import { config } from "@/lib/config";

type Task = { key: string; run: () => Promise<void> };
type QueueState = {
  running: number;
  queue: Task[];
  active: Set<string>;
  queued: Set<string>;
};

// Global-scoped so Next's dev HMR / route module reloads don't fork the gate.
const globalForQueue = globalThis as unknown as { __wdScanQueue?: QueueState };

function state(): QueueState {
  if (!globalForQueue.__wdScanQueue) {
    globalForQueue.__wdScanQueue = { running: 0, queue: [], active: new Set(), queued: new Set() };
  }
  return globalForQueue.__wdScanQueue;
}

function maxConcurrent(): number {
  return Math.max(1, config.limits.maxConcurrentScans);
}

export type EnqueueResult = { started: boolean; ahead: number };

/**
 * Run a heavy scan behind a process-wide concurrency gate. At most
 * `config.limits.maxConcurrentScans` pipelines run at once (1 on the 512MB
 * free tier — two Playwright/axe pipelines together OOM the box); the rest
 * wait in FIFO order. Re-enqueuing an already active or queued key is a no-op,
 * so a job can never run twice. `run` owns its own error handling; a thrown
 * task never wedges the gate.
 */
export function enqueueScan(key: string, run: () => Promise<void>): EnqueueResult {
  const s = state();
  if (s.active.has(key) || s.queued.has(key)) {
    return { started: s.active.has(key), ahead: s.running + s.queue.length };
  }
  const ahead = s.running + s.queue.length;
  s.queued.add(key);
  s.queue.push({ key, run });
  pump();
  return { started: s.active.has(key), ahead };
}

function pump(): void {
  const s = state();
  const max = maxConcurrent();
  while (s.running < max && s.queue.length > 0) {
    const task = s.queue.shift()!;
    s.queued.delete(task.key);
    s.active.add(task.key);
    s.running += 1;
    void Promise.resolve()
      .then(task.run)
      .catch(() => undefined) // run handles its own errors; never wedge the gate
      .finally(() => {
        s.active.delete(task.key);
        s.running -= 1;
        pump();
      });
  }
}

/** Snapshot of the gate — how many scans run now and how many wait. */
export function scanQueueDepth(): { running: number; waiting: number } {
  const s = state();
  return { running: s.running, waiting: s.queue.length };
}

/** Test-only: clear the global gate between cases. */
export function _resetScanQueue(): void {
  globalForQueue.__wdScanQueue = undefined;
}
