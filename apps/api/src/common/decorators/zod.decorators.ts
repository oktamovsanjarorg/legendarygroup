import { Body, Query } from '@nestjs/common';
import { ApiBody, ApiQuery } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe.js';

/** `@nestjs/swagger` SchemaObject tipi (paket uni ildizdan eksport qilmaydi). */
type SchemaObject = Exclude<
  Extract<Parameters<typeof ApiBody>[0], { schema: unknown }>['schema'],
  { $ref: string }
>;

/**
 * Zod sxemasidan OpenAPI (JSON Schema) — kirish ko'rinishida (coerce/default'dan oldin).
 * Pul (`bigint`) JSON'da butun son **string** sifatida o'tadi (12-ai-playbook.md §5).
 */
export const toOpenApi = (schema: z.ZodType): SchemaObject =>
  z.toJSONSchema(schema, {
    io: 'input',
    target: 'openapi-3.0',
    unrepresentable: 'any',
    override: (ctx) => {
      if (ctx.zodSchema._zod.def.type === 'bigint') {
        Object.assign(ctx.jsonSchema, { type: 'string', pattern: '^-?\\d+$', format: 'int64' });
      }
    },
  }) as SchemaObject;

function methodDescriptor(target: object, key: string | symbol | undefined): PropertyDescriptor {
  const descriptor = key === undefined ? undefined : Object.getOwnPropertyDescriptor(target, key);
  if (!descriptor || key === undefined) throw new Error('Zod dekoratori faqat metod parametrida');
  return descriptor;
}

/**
 * `@ZodBody(schema) body: z.output<typeof schema>` — validatsiya + OpenAPI bitta joydan
 * (sxema `@lg/contracts`da, UI ham shuni ishlatadi).
 */
export const ZodBody =
  (schema: z.ZodType): ParameterDecorator =>
  (target, key, index) => {
    Body(new ZodValidationPipe(schema))(target, key, index);
    ApiBody({ schema: toOpenApi(schema) })(target, key as string, methodDescriptor(target, key));
  };

/** `@ZodQuery(schema)` — query obyekt sxemasi; har maydon OpenAPI'da alohida parametr. */
export const ZodQuery =
  (schema: z.ZodObject): ParameterDecorator =>
  (target, key, index) => {
    Query(new ZodValidationPipe(schema))(target, key, index);
    const json = toOpenApi(schema);
    const required = new Set(json.required ?? []);
    for (const [name, prop] of Object.entries(json.properties ?? {})) {
      ApiQuery({ name, required: required.has(name), schema: prop as SchemaObject })(
        target,
        key as string,
        methodDescriptor(target, key),
      );
    }
  };
