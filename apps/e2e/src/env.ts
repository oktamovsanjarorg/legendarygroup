import { resolve } from 'node:path';

/** `apps/web/vite.e2e.config.ts` bilan bir xil bo'lishi shart (port 5174 → API 3100). */
export const API_PORT = 3100;
export const WEB_URL = 'http://localhost:5174';
/** E2E API yozadi (`apps/api/src/e2e/server.ts`), testlar o'qiydi. */
export const FIXTURES_FILE = resolve(import.meta.dirname, '../.fixtures.json');
