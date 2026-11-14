import { describe, expect, it } from 'vitest';
import { normalizePhone } from './phone.js';

describe('normalizePhone — +998 E.164', () => {
  it.each([
    ['90 123 45 67', '+998901234567'],
    ['(90) 123-45-67', '+998901234567'],
    ['901234567', '+998901234567'],
    ['998901234567', '+998901234567'],
    ['+998 90 123 45 67', '+998901234567'],
    ['+7 916 123 45 67', '+79161234567'],
  ])('%s → %s', (raw, e164) => expect(normalizePhone(raw)).toBe(e164));

  it.each(['', '12345', '+99890123456', '9012345678', 'abc901234567', '+0123456789'])(
    'yaroqsiz: %s',
    (raw) => expect(normalizePhone(raw)).toBeNull(),
  );
});
