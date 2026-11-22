import { readFileSync } from 'node:fs';
import { FIXTURES_FILE } from './env.js';

/** `apps/api/src/e2e/fixtures.ts` dagi `E2eUser` bilan bir xil shakl (JSON orqali). */
export interface E2eUser {
  id: string;
  role: 'director' | 'admin';
  fullName: string;
  phone: string;
  password: string;
  totpSecret: string;
}

interface E2eFixtures {
  users: Record<E2eUser['role'], E2eUser[]>;
}

let cache: E2eFixtures | undefined;

/** E2E API ishga tushganda yozilgan fayl (Playwright `webServer` tayyor bo'lgach). */
export function fixtures(): E2eFixtures {
  cache ??= JSON.parse(readFileSync(FIXTURES_FILE, 'utf8')) as E2eFixtures;
  return cache;
}
