import { closeDb, createDb, type Database, seed, staffInvites } from '@lg/db';
import { createTempDb, type TempDb } from '@lg/db/testing';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sha256 } from '../auth/index.js';
import { createFirstDirector, FirstDirectorError } from './first-director.js';

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
