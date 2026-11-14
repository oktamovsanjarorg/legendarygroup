import { defineConfig } from 'vitest/config';

// Haqiqiy Postgres/Redis talab qiladi (compose.dev.yml yoki CI service).
// NestJS DI decorator metadata'ga tayanmaydi (tsx/esbuild uni chiqarmaydi) — testlar ham
// metadata'siz ishlaydi, shunda `@Inject()` unutilsa test yiqiladi (12-ai-playbook.md §5).
export default defineConfig({
  oxc: { decorator: { legacy: true, emitDecoratorMetadata: false } },
  test: {
    include: ['src/**/*.int.test.ts'],
    setupFiles: ['src/test/int-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
