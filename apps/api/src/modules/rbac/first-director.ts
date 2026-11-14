import { PhoneSchema } from '@lg/contracts';
import { auditLogs, type Database, roles, staffInvites, userRoles, users } from '@lg/db';
import { and, eq } from 'drizzle-orm';
import { randomToken, sha256 } from '../auth/index.js';

export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

export class FirstDirectorError extends Error {
  constructor(readonly code: 'DIRECTOR_EXISTS' | 'PHONE_TAKEN' | 'INVALID_INPUT' | 'NOT_SEEDED') {
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
