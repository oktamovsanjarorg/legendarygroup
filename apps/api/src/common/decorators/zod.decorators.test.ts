import { Controller, Get, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { GlobalExceptionFilter } from '../filters/http-exception.filter.js';
import { ZodBody, ZodQuery } from './zod.decorators.js';

const CreateThing = z.object({ name: z.string().min(2), amount: z.coerce.bigint().positive() });
const ListQuery = z.object({
  limit: z.coerce.number().int().max(100).default(50),
  q: z.string().optional(),
});

@Controller('things')
class ThingsController {
  @Post()
  create(@ZodBody(CreateThing) body: z.output<typeof CreateThing>) {
    return { name: body.name, amount: body.amount.toString(), extra: 'extra' in body };
  }

  @Get()
  list(@ZodQuery(ListQuery) query: z.output<typeof ListQuery>) {
    return query;
  }
}

@Module({ controllers: [ThingsController] })
class ThingsModule {}

describe("@ZodBody / @ZodQuery (T-004: validatsiya + OpenAPI Zod'dan)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(ThingsModule, new FastifyAdapter(), {
      logger: false,
    });
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(() => app.close());

  it("to'g'ri body: coerce ishlaydi, ortiqcha maydon tashlanadi", async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/things',
      payload: { name: 'Ali', amount: '1250000', extra: 'x' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ name: 'Ali', amount: '1250000', extra: false });
  });

  it("noto'g'ri body → 400 VALIDATION_ERROR maydonlar bilan", async () => {
    const res = await app.inject({ method: 'POST', url: '/things', payload: { name: 'A' } });
    expect(res.statusCode).toBe(400);
    const body = res.json<{ code: string; details: { path: string }[] }>();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details.map((d) => d.path).sort()).toEqual(['amount', 'name']);
  });

  it('query: standart qiymat va chegara', async () => {
    expect((await app.inject({ url: '/things' })).json()).toEqual({ limit: 50 });
    expect((await app.inject({ url: '/things?limit=500' })).statusCode).toBe(400);
  });

  it('OpenAPI hujjati Zod sxemasidan generatsiya qilinadi', () => {
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    const body = doc.paths['/things']?.post?.requestBody as {
      content: Record<string, { schema: { required?: string[]; properties: object } }>;
    };
    const schema = body.content['application/json']?.schema;
    expect(schema?.required).toEqual(['name', 'amount']);
    expect(Object.keys(schema?.properties ?? {})).toEqual(['name', 'amount']);
    const params = doc.paths['/things']?.get?.parameters?.map((p) => ('name' in p ? p.name : ''));
    expect(params).toEqual(['limit', 'q']);
  });
});

describe('toOpenApi', () => {
  it('bigint (pul) — raqamli string sifatida', async () => {
    const { toOpenApi } = await import('./zod.decorators.js');
    const json = toOpenApi(z.object({ amount: z.coerce.bigint() })) as {
      properties: Record<string, unknown>;
    };
    expect(json.properties['amount']).toMatchObject({ type: 'string', pattern: '^-?\\d+$' });
  });
});
