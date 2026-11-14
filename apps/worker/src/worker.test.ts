import { describe, expect, it } from 'vitest';
import { bootstrapWorker } from './index.js';

// To'liq worker (relay, iste'molchilar, cron, Bull Board) — apps/api/src/worker/worker.int.test.ts.
describe('apps/worker (T-005)', () => {
  it("yupqa entrypoint: bootstrapWorker @lg/api'dan", () => {
    expect(typeof bootstrapWorker).toBe('function');
  });
});
