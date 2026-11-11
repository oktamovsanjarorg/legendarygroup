import { Controller, Get, Module, Post } from '@nestjs/common';
import { DiscoveryModule, NestFactory } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { AppModule } from './app.module.js';
import { RequirePermission } from './common/decorators/access.decorators.js';
import { findAccessViolations } from './test/access-rules.js';
import { testEnv } from './test/env.js';

/** CI: dekoratorsiz endpoint yoki audit'siz yozish amali — build yiqiladi (T-008 AC). */
describe('Endpoint qoidalari (deny by default, audit)', () => {
  it("ilovadagi barcha endpoint'lar qoidalarga mos", async () => {
    @Module({ imports: [AppModule.forRoot(testEnv()), DiscoveryModule] })
    class Root {}
    const ctx = await NestFactory.createApplicationContext(Root, {
      logger: false,
      abortOnError: false,
    });
    try {
      expect(findAccessViolations(ctx)).toEqual([]);
    } finally {
      await ctx.close();
    }
  });

  it("tekshiruvning o'zi ishlaydi: qoidabuzar controller ushlanadi", async () => {
    @Controller('bad')
    class BadController {
      @Get()
      open() {
        return 1;
      }

      @Post()
      @RequirePermission('course.manage')
      write() {
        return 2;
      }
    }
    @Module({ imports: [DiscoveryModule], controllers: [BadController] })
    class BadModule {}

    const ctx = await NestFactory.createApplicationContext(BadModule, { logger: false });
    expect(findAccessViolations(ctx)).toEqual([
      expect.stringContaining('BadController.open: kirish dekoratori'),
      expect.stringContaining('BadController.write: yozish amali audit'),
    ]);
    await ctx.close();
  });
});
