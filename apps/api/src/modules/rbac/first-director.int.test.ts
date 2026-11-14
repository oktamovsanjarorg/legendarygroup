import { auditLogs, closeDb, createDb, type Database, seed, staffInvites, users } from '@lg/db';
import { createTempDb, type TempDb } from '@lg/db/testing';
import { and, eq, isNull } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sha256 } from '../auth/index.js';
import {
  createFirstDirector,
  FirstDirectorError,
  reissueDirectorInvite,
} from './first-director.js';

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

  it('birinchi Director + 24 soatlik bir martalik taklif (faqat hash saqlanadi)', async () => {
    const { userId, token, expiresAt } = await createFirstDirector(
      db,
      { phone: '+998901112233', fullName: 'Bosh Direktor' },
      now,
    );
    expect(expiresAt.toISOString()).toBe('2026-11-12T10:00:00.000Z');
    const [invite] = await db.select().from(staffInvites).where(eq(staffInvites.userId, userId));
    expect(invite?.tokenHash).toBe(sha256(token));
    expect(JSON.stringify(invite)).not.toContain(token);
  });

  it("faol Director bo'lsa — qayta ishlatib bo'lmaydi (--force yo'q)", async () => {
    expect(
      await codeOf(createFirstDirector(db, { phone: '+998901112244', fullName: 'Ikkinchi' }, now)),
    ).toBe('DIRECTOR_EXISTS');
  });
});

describe('pnpm cli director:reinvite (T-008: faollashmagan Director)', () => {
  const later = new Date('2026-11-11T12:00:00.000Z');

  it('raqam/ism tuzatiladi, eski taklif bekor, yangisi 24 soat; audit yoziladi', async () => {
    const { userId, token } = await reissueDirectorInvite(
      db,
      { phone: '+998944758090', fullName: 'Sanjar Oʻktamov' },
      later,
    );
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    expect([u?.phone, u?.fullName]).toEqual(['+998944758090', 'Sanjar Oʻktamov']);
    const open = await db
      .select()
      .from(staffInvites)
      .where(and(eq(staffInvites.userId, userId), isNull(staffInvites.usedAt)));
    expect(open.map((i) => i.tokenHash)).toEqual([sha256(token)]);
    expect(open[0]?.expiresAt.toISOString()).toBe('2026-11-12T12:00:00.000Z');
    const audit = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'user.first_director_reinvited'));
    expect(audit).toHaveLength(1);
  });

  it('noto‘g‘ri raqam — rad; faollashgan Director — tegilmaydi', async () => {
    expect(
      await codeOf(reissueDirectorInvite(db, { phone: '944758090', fullName: 'A B' }, later)),
    ).toBe('INVALID_INPUT');
    await db.update(users).set({ passwordHash: 'x' }).where(eq(users.phone, '+998944758090'));
    expect(
      await codeOf(reissueDirectorInvite(db, { phone: '+998901234567', fullName: 'Yangi' }, later)),
    ).toBe('NO_PENDING_DIRECTOR');
  });
});
