import { type RoleCode } from '@lg/contracts';
import { type Database, roles, userRoles, users } from '@lg/db';
import { eq } from 'drizzle-orm';
import { Secret } from 'otpauth';
import { hashPassword, SecretBox } from '../modules/auth/crypto.js';

/** E2E foydalanuvchisi: Playwright shu ma'lumot bilan haqiqiy login (parol + TOTP) qiladi. */
export interface E2eUser {
  id: string;
  role: RoleCode;
  fullName: string;
  phone: string;
  password: string;
  /** Base32 TOTP siri — test kodni o'zi hisoblaydi (`otpauth`). */
  totpSecret: string;
}

export interface E2eFixtures {
  users: Record<string, E2eUser[]>;
}

/** Web'ga kira oladigan rollar (WEB_ROLES) — har biri uchun bir nechta foydalanuvchi. */
const WEB_ROLES = ['director', 'admin'] as const satisfies readonly RoleCode[];
/** Bitta foydalanuvchi 30 s oynada bir marta kiradi (TOTP qayta ishlatilmaydi) — hovuz. */
const POOL_SIZE = 8;
const PASSWORD = 'E2e-parol-12345';

/** Rollar seed qilingan bazaga TOTP yoqilgan xodimlar hovuzini yozadi. */
export async function createE2eFixtures(db: Database, totpKey: string): Promise<E2eFixtures> {
  const box = new SecretBox(totpKey);
  const passwordHash = await hashPassword(PASSWORD);
  const out: Record<string, E2eUser[]> = {};
  let n = 0;
  for (const role of WEB_ROLES) {
    const [r] = await db.select().from(roles).where(eq(roles.code, role));
    if (!r) throw new Error(`rol topilmadi: ${role} (seed chaqirilmagan)`);
    out[role] = [];
    for (let i = 0; i < POOL_SIZE; i += 1) {
      const phone = `+99890${String((n += 1)).padStart(7, '0')}`;
      const totpSecret = new Secret({ size: 20 }).base32;
      const fullName = `E2E ${role} ${i + 1}`;
      const [u] = await db
        .insert(users)
        .values({
          fullName,
          phone,
          passwordHash,
          totpSecret: box.seal(totpSecret),
        })
        .returning({ id: users.id });
      if (!u) throw new Error('e2e foydalanuvchisi yaratilmadi');
      await db.insert(userRoles).values({ userId: u.id, roleId: r.id });
      out[role].push({ id: u.id, role, fullName, phone, password: PASSWORD, totpSecret });
    }
  }
  return { users: out };
}
