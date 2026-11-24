import { normalizePhone, PhoneSchema } from '@lg/contracts';
import { auditLogs, type Database, roles, type Transaction, userRoles, users } from '@lg/db';
import { and, eq, inArray } from 'drizzle-orm';
import { hasStaffRole } from './telegram-claim.js';
import { unlinkTelegram } from './telegram-unlink.js';
import { bumpPermissionsVersion } from './user-version.js';

export class DirectorTransferError extends Error {
  constructor(readonly code: 'INVALID_INPUT' | 'NO_DIRECTOR' | 'SAME_PERSON' | 'NOT_SEEDED') {
    super(code);
  }
}

async function roleIds(tx: Transaction): Promise<{ director: string; admin: string }> {
  const rows = await tx
    .select({ id: roles.id, code: roles.code })
    .from(roles)
    .where(inArray(roles.code, ['director', 'admin']))
    .for('update');
  const director = rows.find((r) => r.code === 'director')?.id;
  const admin = rows.find((r) => r.code === 'admin')?.id;
  if (!director || !admin) throw new DirectorTransferError('NOT_SEEDED');
  return { director, admin };
}

/** Telefon bo'yicha foydalanuvchi; yo'q bo'lsa — yangi (botda raqam ulashib kiradi). */
async function userByPhone(tx: Transaction, phone: string, fullName: string): Promise<string> {
  const [found] = await tx.select({ id: users.id }).from(users).where(eq(users.phone, phone));
  if (found) return found.id;
  const [created] = await tx.insert(users).values({ fullName, phone }).returning({ id: users.id });
  if (!created) throw new Error('foydalanuvchi yaratilmadi');
  return created.id;
}

/**
 * Direktorlikni o'tkazish (02 §2: tizimda bitta Director). Joriy Director Admin bo'lib qoladi
 * (panelni boshqarishda davom etadi), yangi Director — telefon bo'yicha (yangi yoki mavjud
 * foydalanuvchi). Ikkalasining ruxsat versiyasi oshadi — eski tokenlar yangi rolni oladi.
 * `telegramLinked: false` — yangi Director botda raqamini ulashishi kerak (Q-98). Audit bilan.
 */
export async function transferDirector(
  db: Database,
  input: { phone: string; fullName: string },
  now: Date,
): Promise<{ telegramLinked: boolean; previousId: string; directorId: string }> {
  const phone = PhoneSchema.safeParse(normalizePhone(input.phone) ?? input.phone);
  const fullName = input.fullName.trim();
  if (!phone.success || fullName.length < 2) throw new DirectorTransferError('INVALID_INPUT');
  return db.transaction(async (tx) => {
    const ids = await roleIds(tx);
    const [current] = await tx
      .select({ id: userRoles.userId })
      .from(userRoles)
      .where(eq(userRoles.roleId, ids.director));
    if (!current) throw new DirectorTransferError('NO_DIRECTOR');
    const next = await userByPhone(tx, phone.data, fullName);
    if (next === current.id) throw new DirectorTransferError('SAME_PERSON');

    const wasStaff = await hasStaffRole(tx, next);
    await tx
      .delete(userRoles)
      .where(and(eq(userRoles.userId, current.id), eq(userRoles.roleId, ids.director)));
    await tx
      .insert(userRoles)
      .values({ userId: current.id, roleId: ids.admin })
      .onConflictDoNothing();
    await tx.insert(userRoles).values({ userId: next, roleId: ids.director }).onConflictDoNothing();
    await bumpPermissionsVersion(tx, current.id);
    await bumpPermissionsVersion(tx, next);

    // Birinchi xodim roli — tasdiqlanmagan Telegram uziladi (StaffService.grantStaffRole kabi)
    if (!wasStaff) await unlinkTelegram(tx, next, now);
    const [target] = await tx.select().from(users).where(eq(users.id, next));
    await tx.insert(auditLogs).values({
      action: 'user.director_transferred',
      entity: 'user',
      entityId: next,
      before: { directorId: current.id },
      after: { directorId: next, previousBecame: 'admin' },
      at: now,
    });
    const telegramLinked = target?.telegramId != null;
    return { telegramLinked, previousId: current.id, directorId: next };
  });
}
