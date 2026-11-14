import { defineConfig } from 'vitest/config';

// NestJS DI decorator metadata'ga tayanmaydi (tsx/esbuild uni chiqarmaydi) — testlar ham
// metadata'siz ishlaydi, shunda `@Inject()` unutilsa test yiqiladi (12-ai-playbook.md §5).
export default defineConfig({
  oxc: { decorator: { legacy: true, emitDecoratorMetadata: false } },
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.int.test.ts'],
    setupFiles: ['src/test/unit-setup.ts'],
  },
});
