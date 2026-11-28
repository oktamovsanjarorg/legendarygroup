import { defineConfig } from 'vitest/config';

// Haqiqiy Postgres talab qiladi (compose.dev.yml yoki CI service).
export default defineConfig({
  test: {
    include: ['src/**/*.int.test.ts'],
    // Har fayl o'z bazasini migratsiya qiladi; migratsiyadagi `CREATE ROLE lg_app` klaster
    // darajasida — toza serverda (CI) parallel fayllar poygaga tushadi. Fayllar ketma-ket.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
