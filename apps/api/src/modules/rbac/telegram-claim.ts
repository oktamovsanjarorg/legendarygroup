import { guardians, roles, type Transaction, userRoles, users } from '@lg/db';
import type { RoleCode } from '@lg/contracts';
import { and, eq, inArray } from 'drizzle-orm';

/** Botda raqam ulashib kiradigan xodim rollari (Q-98). Ota-ona/o'quvchi — T-110, T-126. */
export const STAFF_CODES = ['director', 'admin', 'teacher'] as const satisfies RoleCode[];
export type StaffCode = (typeof STAFF_CODES)[number];

export async function hasStaffRole(tx: Transaction, userId: string): Promise<boolean> {
  const rows = await tx
    .select({ code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(userRoles.userId, userId), inArray(roles.code, STAFF_CODES)))
    .limit(1);
  return rows.length > 0;
}

/**
 * Shu Telegram shu foydalanuvchiga yozilishi mumkinmi (Q-98)? Telegram — xodim uchun yagona kalit:
 * - Telegram boshqa foydalanuvchida — yo'q;
 * - xodim — faqat hali ulanmagan va Telegram tasdiqlagan raqam aynan uning raqami bo'lsa;
 * - ota-ona/o'quvchi — ha (Telegram almashtirish avvalgidek).
 * `userId: null` — foydalanuvchi hali yaratilmagan. `verifiedPhone` — Telegram kontaktidan kelgan raqam (admin kiritgan emas).
 */
export async function canClaimTelegram(
  tx: Transaction,
  input: { userId: string | null; telegramId: bigint; verifiedPhone: string },
): Promise<boolean> {
  const [owner] = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.telegramId, input.telegramId));
  if (owner) return owner.id === input.userId;
  if (input.userId === null) return true;
  const [user] = await tx.select().from(users).where(eq(users.id, input.userId)).for('update');
  if (!user) return false;
  if (!(await hasStaffRole(tx, user.id))) return true;
  return user.telegramId === null && user.phone === input.verifiedPhone;
}

interface GuardianClaim {
  guardian: Pick<typeof guardians.$inferSelect, 'id' | 'userId' | 'fullName' | 'phone'>;
  telegramId: bigint;
  username: string | null;
  verifiedPhone: string;
}

/**
 * Ota-ona yozuvini Telegram'ga bog'lash (bot kontakti T-110 va admin tasdig'i W-07): foydalanuvchi
 * telefon bo'yicha topiladi yoki yaratiladi. `null` — mumkin emas, hech narsa yozilmagan.
 */
export async function claimGuardianTelegram(
  tx: Transaction,
  { guardian, telegramId, username, verifiedPhone }: GuardianClaim,
): Promise<string | null> {
  let userId = guardian.userId;
  if (!userId) {
    const [found] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phone, guardian.phone))
      .for('update');
    userId = found?.id ?? null;
  }
  if (!(await canClaimTelegram(tx, { userId, telegramId, verifiedPhone }))) return null;
  const link = { telegramId, telegramUsername: username };
  if (userId) await tx.update(users).set(link).where(eq(users.id, userId));
  else {
    const { fullName, phone } = guardian;
    const [created] = await tx
      .insert(users)
      .values({ fullName, phone, status: 'active', ...link })
      .returning({ id: users.id });
    if (!created) throw new Error('Foydalanuvchi yaratilmadi');
    userId = created.id;
  }
  if (guardian.userId) return userId;
  const [role] = await tx.select().from(roles).where(eq(roles.code, 'guardian'));
  if (role) await tx.insert(userRoles).values({ userId, roleId: role.id }).onConflictDoNothing();
  await tx.update(guardians).set({ userId }).where(eq(guardians.id, guardian.id));
  return userId;
}
