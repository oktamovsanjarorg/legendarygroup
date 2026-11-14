import { Injectable, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/**
 * Zod sxemasi bo'yicha tekshiradi va **tozalangan** qiymatni qaytaradi (ortiqcha maydonlar tushadi).
 * Sxema majburiy: sxemasiz "o'tkazib yuboruvchi" pipe yo'q (deny by default).
 * Odatda to'g'ridan-to'g'ri emas, `@ZodBody()` / `@ZodQuery()` orqali ishlatiladi.
 */
@Injectable()
export class ZodValidationPipe<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    // ZodError → GlobalExceptionFilter → 400 VALIDATION_ERROR
    return this.schema.parse(value);
  }
}
