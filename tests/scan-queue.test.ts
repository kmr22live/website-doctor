import { afterEach, describe, expect, it } from "vitest";
import { _resetScanQueue, enqueueScan, scanQueueDepth } from "@/lib/services/scan-queue";

// Let all queued microtasks + finally() re-pumps settle.
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

afterEach(() => _resetScanQueue());

describe("scan queue (global heavy-pipeline gate)", () => {
  it("runs one scan at a time and drains the rest in FIFO order", async () => {
    const started: string[] = [];
    let active = 0;
    let peak = 0;
    const release: Record<string, () => void> = {};
    const run = (k: string) => () =>
      new Promise<void>((resolve) => {
        started.push(k);
        active += 1;
        peak = Math.max(peak, active);
        release[k] = () => {
          active -= 1;
          resolve();
        };
      });

    const a = enqueueScan("a", run("a"));
    const b = enqueueScan("b", run("b"));
    const c = enqueueScan("c", run("c"));

    // Only the first acquires the single slot; the rest are queued.
    expect(a.started).toBe(true);
    expect(b.started).toBe(false);
    expect(c.started).toBe(false);

    await flush();
    expect(started).toEqual(["a"]);
    expect(scanQueueDepth()).toEqual({ running: 1, waiting: 2 });

    release["a"]!();
    await flush();
    expect(started).toEqual(["a", "b"]); // FIFO: b before c

    release["b"]!();
    await flush();
    expect(started).toEqual(["a", "b", "c"]);

    release["c"]!();
    await flush();

    expect(peak).toBe(1); // never two heavy pipelines at once
    expect(scanQueueDepth()).toEqual({ running: 0, waiting: 0 });
  });

  it("ignores a re-enqueue of an already active or queued key", async () => {
    let calls = 0;
    const release: Array<() => void> = [];
    const run = () => () =>
      new Promise<void>((resolve) => {
        calls += 1;
        release.push(resolve);
      });

    enqueueScan("dup", run()); // starts
    enqueueScan("dup", run()); // no-op: already active
    await flush();
    expect(calls).toBe(1);

    release.forEach((r) => r());
    await flush();
    expect(scanQueueDepth()).toEqual({ running: 0, waiting: 0 });
  });

  it("reports how many scans are ahead of a queued one", async () => {
    const release: Array<() => void> = [];
    const run = () => () => new Promise<void>((resolve) => release.push(resolve));

    const first = enqueueScan("x", run());
    const second = enqueueScan("y", run());
    const third = enqueueScan("z", run());

    expect(first.ahead).toBe(0); // ran immediately, nothing ahead
    expect(second.ahead).toBe(1); // waits behind x
    expect(third.ahead).toBe(2); // waits behind x, y

    release.forEach((r) => r());
    await flush();
  });
});
