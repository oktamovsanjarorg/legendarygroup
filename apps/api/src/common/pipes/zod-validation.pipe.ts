import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { Injectable, Optional } from '@nestjs/common';
import type { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(@Optional() private readonly schema?: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    if (!this.schema) {
      return value;
    }

    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw result.error;
    }

    return result.data;
  }
}
