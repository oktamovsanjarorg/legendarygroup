import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { API_PORT, FIXTURES_FILE, WEB_URL } from './src/env.js';

const CI = Boolean(process.env['CI']);
const root = import.meta.dirname;

/**
 * E2E (07 §1): haqiqiy API (vaqtinchalik DB) + web panel (vite). Postgres/Redis —
 * compose.dev.yml (lokal) yoki CI service'lari; manzillar ildiz `.env`/CI env'dan.
 */
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : 4,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  use: {
    baseURL: WEB_URL,
    locale: 'uz-UZ',
    timezoneId: 'Asia/Tashkent',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // `pnpm exec` emas — SIGTERM to'g'ridan-to'g'ri jarayonga (vaqtinchalik DB o'chiriladi).
      command: 'node --conditions=development --import tsx src/e2e/server.ts',
      cwd: resolve(root, '../api'),
      url: `http://127.0.0.1:${API_PORT}/api/health/ready`,
      env: { E2E_API_PORT: String(API_PORT), E2E_FIXTURES_FILE: FIXTURES_FILE },
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
      timeout: 120_000,
      stdout: 'pipe',
    },
    {
      command: 'node_modules/.bin/vite --config vite.e2e.config.ts',
      cwd: resolve(root, '../web'),
      url: WEB_URL,
      timeout: 120_000,
    },
  ],
});
