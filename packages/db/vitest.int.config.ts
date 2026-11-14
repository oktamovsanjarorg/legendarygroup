import { defineConfig } from 'vitest/config';

// Haqiqiy Postgres talab qiladi (compose.dev.yml yoki CI service).
export default defineConfig({
  test: { include: ['src/**/*.int.test.ts'], testTimeout: 30_000, hookTimeout: 60_000 },
});
