import { type RoleCode } from '@lg/contracts';
import { type Database, roles, userRoles, users } from '@lg/db';
import { eq } from 'drizzle-orm';

/** E2E foydalanuvchisi: Playwright shu ma'lumot bilan haqiqiy kirish (Telegram tasdig'i) qiladi. */
export interface E2eUser {
  id: string;
  role: RoleCode;
  fullName: string;
  phone: string;
  /** Bot o'rnida test shu akkaunt nomidan tasdiqlaydi (Q-98). */
  telegramId: string;
}

export interface E2eFixtures {
  users: Record<string, E2eUser[]>;
  /** Guruh formasidagi ustoz tanlovi uchun (web'ga kirmaydi). */
  teacher: { id: string; fullName: string };
}

/** Web'ga kira oladigan rollar (WEB_ROLES) — har biri uchun bir nechta foydalanuvchi. */
const WEB_ROLES = ['director', 'admin'] as const satisfies readonly RoleCode[];
/** Parallel worker'lar bir-birining hisobini ishlatmasin — hovuz. */
const POOL_SIZE = 8;
const TELEGRAM_ID_BASE = 880_000_000;

/** Rollar seed qilingan bazaga Telegram'i ulangan xodimlar hovuzini yozadi. */
export async function createE2eFixtures(db: Database): Promise<E2eFixtures> {
  const out: Record<string, E2eUser[]> = {};
  let n = 0;
  for (const role of WEB_ROLES) {
    const [r] = await db.select().from(roles).where(eq(roles.code, role));
    if (!r) throw new Error(`rol topilmadi: ${role} (seed chaqirilmagan)`);
    out[role] = [];
    for (let i = 0; i < POOL_SIZE; i += 1) {
      const phone = `+99890${String((n += 1)).padStart(7, '0')}`;
      const telegramId = String(TELEGRAM_ID_BASE + n);
      const fullName = `E2E ${role} ${i + 1}`;
      const [u] = await db
        .insert(users)
        .values({
          fullName,
          phone,
          telegramId: BigInt(telegramId),
        })
        .returning({ id: users.id });
      if (!u) throw new Error('e2e foydalanuvchisi yaratilmadi');
      await db.insert(userRoles).values({ userId: u.id, roleId: r.id });
      out[role].push({ id: u.id, role, fullName, phone, telegramId });
    }
  }
  return { users: out, teacher: await createTeacher(db) };
}

async function createTeacher(db: Database): Promise<E2eFixtures['teacher']> {
  const fullName = 'E2E Ustoz';
  const [r] = await db.select().from(roles).where(eq(roles.code, 'teacher'));
  const [u] = await db
    .insert(users)
    .values({ fullName, phone: '+998919999999' })
    .returning({ id: users.id });
  if (!u || !r) throw new Error('e2e ustozi yaratilmadi');
  await db.insert(userRoles).values({ userId: u.id, roleId: r.id });
  return { id: u.id, fullName };
}
