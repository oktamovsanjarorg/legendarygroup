import { normalizePhone, PhoneSchema } from '@lg/contracts';
import { auditLogs, type Database, roles, userRoles, users } from '@lg/db';
import { and, eq, ne } from 'drizzle-orm';
import { unlinkTelegram } from './telegram-unlink.js';

export class FirstDirectorError extends Error {
  constructor(
    readonly code:
      'DIRECTOR_EXISTS' | 'PHONE_TAKEN' | 'INVALID_INPUT' | 'NOT_SEEDED' | 'NO_DIRECTOR',
  ) {
    super(code);
  }
}

/**
 * Birinchi Director (02 §2, T-008): o'rnatishda bir marta. Faol Director bo'lsa — rad (`--force` yo'q).
 * Parol yo'q: Director botda shu raqamni ulashib kiradi (Q-98).
 */
export async function createFirstDirector(
  db: Database,
  input: { phone: string; fullName: string },
  now: Date,
): Promise<{ userId: string }> {
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

    await tx.insert(auditLogs).values({
      action: 'user.first_director_created',
      entity: 'user',
      entityId: user.id,
      after: { fullName },
      at: now,
    });
    return { userId: user.id };
  });
}

const toPhone = (raw: string): string => {
  const phone = PhoneSchema.safeParse(normalizePhone(raw) ?? raw);
  if (!phone.success) throw new FirstDirectorError('INVALID_INPUT');
  return phone.data;
};

/**
 * Favqulodda kirish (Q-98): Director Telegram akkauntini yo'qotsa yoki raqami o'zgarsa. Raqam
 * almashadi, eski Telegram uziladi, sessiyalar yopiladi; so'ng Director botda yangi raqamini
 * ulashadi. Faqat serverga kirishi bor odam (CLI). Audit bilan.
 */
export async function relinkDirector(
  db: Database,
  input: { current: string; phone: string },
  now: Date,
): Promise<{ userId: string }> {
  const [current, phone] = [toPhone(input.current), toPhone(input.phone)];
  return db.transaction(async (tx) => {
    const [director] = await tx
      .select({ id: users.id })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(roles.code, 'director'), eq(users.status, 'active'), eq(users.phone, current)))
      .for('update', { of: users });
    if (!director) throw new FirstDirectorError('NO_DIRECTOR');
    const [taken] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.phone, phone), ne(users.id, director.id)));
    if (taken) throw new FirstDirectorError('PHONE_TAKEN');

    await tx.update(users).set({ phone, updatedAt: now }).where(eq(users.id, director.id));
    await unlinkTelegram(tx, director.id, now);
    await tx.insert(auditLogs).values({
      action: 'user.director_relinked',
      entity: 'user',
      entityId: director.id,
      after: { phoneChanged: phone !== current, via: 'cli' },
      at: now,
    });
    return { userId: director.id };
  });
}
