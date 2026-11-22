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

/** `apps/api/src/e2e/fixtures-billing.ts` — joriy oy invoice'i bor o'quvchi. */
export interface E2eStudent {
  id: string;
  fullName: string;
  code: number;
  groupName: string;
  debt: string;
}

interface E2eFixtures {
  users: Record<E2eUser['role'], E2eUser[]>;
  students: E2eStudent[];
  teacher: { id: string; fullName: string };
  attendance: E2eAttendance;
  telegramBotToken: string;
}

/** `apps/api/src/e2e/fixtures-attendance.ts` — bugungi dars, ustoz Telegram'ga bog'langan. */
export interface E2eAttendance {
  teacherTelegramId: string;
  teacherFirstName: string;
  lessonId: string;
  students: string[];
}

let cache: E2eFixtures | undefined;

/** E2E API ishga tushganda yozilgan fayl (Playwright `webServer` tayyor bo'lgach). */
export function fixtures(): E2eFixtures {
  cache ??= JSON.parse(readFileSync(FIXTURES_FILE, 'utf8')) as E2eFixtures;
  return cache;
}

let nextStudent = 0;

/** O'quvchilar hovuzidan (worker'lar kesishmaydi) — har to'lov testi o'z o'quvchisi bilan. */
export function pickStudent(info: { parallelIndex: number; config: { workers: number } }) {
  const pool = fixtures().students;
  const workers = Math.max(1, info.config.workers);
  const s = pool[(info.parallelIndex + workers * nextStudent) % pool.length];
  nextStudent += 1;
  if (!s) throw new Error("e2e o'quvchilar hovuzi bo'sh");
  return s;
}
