import {
  closeDb,
  createDb,
  type Database,
  roles,
  seed,
  staffInvites,
  userRoles,
  users,
} from '@lg/db';
import { createTempDb, type TempDb } from '@lg/db/testing';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DirectorTransferError, transferDirector } from './director-transfer.js';

let tmp: TempDb;
let db: Database;
const links = { appUrl: 'https://lg.test', botUsername: 'lg_bot' };
const now = new Date('2026-11-14T12:00:00Z');

const rolesOf = async (userId: string) =>
  (
    await db
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, userId))
  )
    .map((r) => r.code)
    .sort();
const pvOf = async (id: string) =>
  (await db.select({ pv: users.permissionsVersion }).from(users).where(eq(users.id, id)))[0]?.pv;

beforeAll(async () => {
  tmp = await createTempDb();
  await seed(tmp.url, { withTestDirector: false });
  db = createDb(tmp.url, { max: 2 });
});
afterAll(async () => {
  await closeDb(db);
  await tmp.drop();
});

describe('director:transfer (02 §2: bitta Director)', () => {
  it('direktor yo‘q — xato; noto‘g‘ri raqam — xato', async () => {
    await expect(
      transferDirector(db, links, { phone: '+998901234567', fullName: 'Yangi' }, now),
    ).rejects.toMatchObject({ code: 'NO_DIRECTOR' });
    await expect(
      transferDirector(db, links, { phone: '123', fullName: 'Yangi' }, now),
    ).rejects.toBeInstanceOf(DirectorTransferError);
  });

  it('yangi Director + web taklif; avvalgisi Admin, ikkalasining pv oshadi; o‘ziga — xato', async () => {
    const [cur] = await db
      .insert(users)
      .values({ fullName: 'Sanjar', phone: '+998944758090', passwordHash: 'x' })
      .returning();
    const [dir] = await db.select().from(roles).where(eq(roles.code, 'director'));
    await db.insert(userRoles).values({ userId: cur!.id, roleId: dir!.id });
    const pvBefore = await pvOf(cur!.id);

    const r = await transferDirector(
      db,
      links,
      { phone: '90 123 45 67', fullName: 'Haqiqiy Direktor' },
      now,
    );
    expect(r.previousId).toBe(cur!.id);
    expect(await rolesOf(cur!.id)).toEqual(['admin']);
    expect(await rolesOf(r.directorId)).toEqual(['director']);
    expect(await pvOf(cur!.id)).toBe((pvBefore ?? 0) + 1);
    expect(r.invite?.url).toMatch(/^https:\/\/lg\.test\/invite\//);
    const inv = await db.select().from(staffInvites).where(eq(staffInvites.userId, r.directorId));
    expect(inv.map((i) => i.channel)).toEqual(['web']);

    await expect(
      transferDirector(db, links, { phone: '+998901234567', fullName: 'Yana' }, now),
    ).rejects.toMatchObject({ code: 'SAME_PERSON' });
  });
});
