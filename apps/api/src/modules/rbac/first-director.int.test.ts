import {
  auditLogs,
  closeDb,
  createDb,
  type Database,
  seed,
  sessions,
  staffInvites,
  users,
} from '@lg/db';
import { createTempDb, type TempDb } from '@lg/db/testing';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createFirstDirector, FirstDirectorError, relinkDirector } from './first-director.js';

let tmp: TempDb;
let db: Database;
const now = new Date('2026-11-11T10:00:00.000Z');

beforeAll(async () => {
  tmp = await createTempDb();
  await seed(tmp.url, { withTestDirector: false });
  db = createDb(tmp.url, { max: 2 });
});
afterAll(async () => {
  await closeDb(db);
  await tmp.drop();
});

const codeOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'OK';
  } catch (e) {
    return e instanceof FirstDirectorError ? e.code : 'OTHER';
  }
};

describe('pnpm cli director:create (T-008)', () => {
  it("noto'g'ri kiritma rad etiladi", async () => {
    expect(
      await codeOf(createFirstDirector(db, { phone: '901234567', fullName: 'A B' }, now)),
    ).toBe('INVALID_INPUT');
  });

  it('Q-98: birinchi Director — parolsiz va taklifsiz (botda raqam ulashadi)', async () => {
    const { userId } = await createFirstDirector(
      db,
      { phone: '+998901112233', fullName: 'Bosh Direktor' },
      now,
    );
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    expect([u?.phone, u?.passwordHash, u?.telegramId]).toEqual(['+998901112233', null, null]);
    expect(await db.select().from(staffInvites)).toHaveLength(0);
  });

  it("faol Director bo'lsa — qayta ishlatib bo'lmaydi (--force yo'q)", async () => {
    expect(
      await codeOf(createFirstDirector(db, { phone: '+998901112244', fullName: 'Ikkinchi' }, now)),
    ).toBe('DIRECTOR_EXISTS');
  });
});

describe('pnpm cli director:relink (Q-98: Telegram yoki raqam yoʻqolgan)', () => {
  const later = new Date('2026-11-11T12:00:00.000Z');

  it('raqam almashadi, Telegram uziladi, sessiyalar yopiladi, pv oshadi; audit', async () => {
    const [before] = await db
      .update(users)
      .set({ telegramId: 5001n, telegramUsername: 'eski' })
      .where(eq(users.phone, '+998901112233'))
      .returning();
    await db.insert(sessions).values({
      userId: before!.id,
      familyId: before!.id,
      refreshTokenHash: 'h',
      activeRole: 'director',
      expiresAt: new Date('2026-12-11T00:00:00.000Z'),
    });
    const { userId } = await relinkDirector(
      db,
      { current: '90 111 22 33', phone: '+998944758090' },
      later,
    );
    expect(userId).toBe(before!.id);
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    expect([u?.phone, u?.telegramId, u?.telegramUsername]).toEqual(['+998944758090', null, null]);
    expect(u?.permissionsVersion).toBe(before!.permissionsVersion + 1);
    const [s] = await db.select().from(sessions).where(eq(sessions.userId, userId));
    expect(s?.revokedAt).toEqual(later);
    const audit = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'user.director_relinked'));
    expect(audit).toHaveLength(1);
  });

  it('notoʻgʻri raqam, direktor emas, band raqam — rad', async () => {
    const relink = (current: string, phone: string) =>
      codeOf(relinkDirector(db, { current, phone }, later));
    expect(await relink('123', '+998944758090')).toBe('INVALID_INPUT');
    expect(await relink('+998900000000', '+998944758091')).toBe('NO_DIRECTOR');
    await db.insert(users).values({ fullName: 'Boshqa', phone: '+998944758099' });
    expect(await relink('+998944758090', '+998944758099')).toBe('PHONE_TAKEN');
  });
});
