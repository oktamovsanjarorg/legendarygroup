import { FixedClock } from '@lg/domain';
import { describe, expect, it } from 'vitest';
import { isSlot } from './time-slot.js';

const at = (iso: string) => new FixedClock(iso);

describe('Q-107: sozlanadigan vaqt — kuniga bitta qadam', () => {
  it('10 daqiqalik qadamlardan faqat bittasi tushadi', () => {
    const hits = (time: string) =>
      ['08:20', '08:30', '08:40', '08:50'].filter((x) =>
        isSlot(at(`2026-11-24T${x}:00.300+05:00`), time),
      );
    expect(hits('08:30')).toEqual(['08:30']);
    expect(hits('08:35')).toEqual(['08:40']);
    expect(hits('21:00')).toEqual([]);
  });
});
