import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

describe('ZodValidationPipe (T-004 AC)', () => {
  const schema = z.object({
    name: z.string().min(2),
    age: z.number().int().positive(),
  });

  const metadata = { type: 'body' as const, metatype: Object, data: '' };

  it('sxemasiz boʻlsa qiymatni oʻzgartirmay oʻtkazadi', () => {
    const pipe = new ZodValidationPipe();
    const input = { foo: 'bar' };
    expect(pipe.transform(input, metadata)).toEqual(input);
  });

  it('toʻgʻri maʼlumotni muvaffaqiyatli qabul qiladi', () => {
    const pipe = new ZodValidationPipe(schema);
    const input = { name: 'Ali', age: 25 };
    expect(pipe.transform(input, metadata)).toEqual(input);
  });

  it('notoʻgʻri maʼlumotda ZodError tashlaydi', () => {
    const pipe = new ZodValidationPipe(schema);
    const input = { name: 'A', age: -5 };
    expect(() => pipe.transform(input, metadata)).toThrow();
  });
});
