import { PhoneSchema } from '@lg/contracts';
import { auditLogs, type Database, roles, staffInvites, userRoles, users } from '@lg/db';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { randomToken, sha256 } from '../auth/index.js';

export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

export class FirstDirectorError extends Error {
  constructor(
    readonly code:
      'DIRECTOR_EXISTS' | 'PHONE_TAKEN' | 'INVALID_INPUT' | 'NOT_SEEDED' | 'NO_PENDING_DIRECTOR',
  ) {
    super(code);
  }
}

/**
 * Birinchi Director (02 §2, T-008): o'rnatishda bir marta. Faol Director bo'lsa — rad (`--force` yo'q).
 * Natija — 24 soatlik bir martalik taklif tokeni (parol + TOTP o'rnatish, ADR 0006).
 */
export async function createFirstDirector(
  db: Database,
  input: { phone: string; fullName: string },
  now: Date,
): Promise<{ userId: string; token: string; expiresAt: Date }> {
  const phone = PhoneSchema.safeParse(input.phone);
  const fullName = input.fullName.trim();
  if (!phone.success || fullName.length < 2) throw new FirstDirectorError('INVALID_INPUT');

  return db.transaction(async (tx) => {
    const [directorRole] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.code, 'director'))
      .for('update');
    if (!directorRole) throw new FirstDirectorError('NOT_SEEDED');
    const existing = await tx
      .select({ id: users.id })
      .from(userRoles)
      .innerJoin(users, eq(users.id, userRoles.userId))
      .where(and(eq(userRoles.roleId, directorRole.id), eq(users.status, 'active')))
      .limit(1);
    if (existing.length > 0) throw new FirstDirectorError('DIRECTOR_EXISTS');

    const [taken] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phone, phone.data));
    if (taken) throw new FirstDirectorError('PHONE_TAKEN');

    const [user] = await tx
      .insert(users)
      .values({ fullName, phone: phone.data })
      .returning({ id: users.id });
    if (!user) throw new Error('foydalanuvchi yaratilmadi');
    await tx.insert(userRoles).values({ userId: user.id, roleId: directorRole.id });

    const token = randomToken();
    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
    await tx.insert(staffInvites).values({ userId: user.id, tokenHash: sha256(token), expiresAt });
    await tx.insert(auditLogs).values({
      action: 'user.first_director_created',
      entity: 'user',
      entityId: user.id,
      after: { fullName },
      at: now,
    });
    return { userId: user.id, token, expiresAt };
  });
}

/**
 * Hali faollashmagan (paroli yo'q) Director uchun taklifni qayta berish (T-008): telefon/ism
 * tuzatiladi, eski ishlatilmagan takliflar bekor qilinadi (`used_at`), yangi 24 soatlik taklif.
 * Faollashgan Director'ga tegmaydi — u o'zi web panelda (Xodimlar) boshqaradi. Audit bilan.
 */
export async function reissueDirectorInvite(
  db: Database,
  input: { phone: string; fullName: string },
  now: Date,
): Promise<{ userId: string; token: string; expiresAt: Date }> {
  const phone = PhoneSchema.safeParse(input.phone);
  const fullName = input.fullName.trim();
  if (!phone.success || fullName.length < 2) throw new FirstDirectorError('INVALID_INPUT');
  return db.transaction(async (tx) => {
    const [pending] = await tx
      .select({ id: users.id, fullName: users.fullName })
      .from(userRoles)
      .innerJoin(users, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(
        and(eq(roles.code, 'director'), eq(users.status, 'active'), isNull(users.passwordHash)),
      )
      .limit(1)
      .for('update');
    if (!pending) throw new FirstDirectorError('NO_PENDING_DIRECTOR');
    const [taken] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.phone, phone.data), ne(users.id, pending.id)));
    if (taken) throw new FirstDirectorError('PHONE_TAKEN');

    await tx
      .update(users)
      .set({ phone: phone.data, fullName, updatedAt: now })
      .where(eq(users.id, pending.id));
    await tx
      .update(staffInvites)
      .set({ usedAt: now })
      .where(and(eq(staffInvites.userId, pending.id), isNull(staffInvites.usedAt)));
    const token = randomToken();
    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
    await tx
      .insert(staffInvites)
      .values({ userId: pending.id, tokenHash: sha256(token), expiresAt });
    await tx.insert(auditLogs).values({
      action: 'user.first_director_reinvited',
      entity: 'user',
      entityId: pending.id,
      before: { fullName: pending.fullName },
      after: { fullName, phoneChanged: true },
      at: now,
    });
    return { userId: pending.id, token, expiresAt };
  });
}
