import { createHmac } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { closeDb, createDb, type Database, type Transaction } from './client.js';
import { isMain, loadRootEnv, maskUrl, requireDatabaseUrl } from './env.js';
import {
  guardianLinkRequests,
  guardians,
  leads,
  paymentSubmissions,
  students,
  users,
} from './schema/index.js';

const FIRST_NAMES = [
  'Ali',
  'Vali',
  'Sardor',
  'Dilshod',
  'Nodir',
  'Jasur',
  'Sanjar',
  'Bobur',
  'Farrux',
  'Aziz',
  'Malika',
  'Zarina',
  'Lola',
  'Shahnoza',
  'Nilufar',
  'Umida',
  'Madina',
  'Dildora',
  'Zilola',
  'Feruza',
];

const LAST_NAMES = [
  'Karimov',
  'Umarov',
  'Rahimov',
  'Aliyev',
  'Toshmatov',
  'Qodirov',
  'Nazarov',
  'Yusupov',
  'Rasulov',
  'Solihov',
  'Bekmurodov',
  'Mamatov',
  'Nurmatov',
  'Ergashev',
  'Rustamov',
];

const MIN_SALT_LENGTH = 16;
const ANONYMIZABLE_ENVS = ['development', 'test', 'staging'] as const;

/** Anonimlashtirish faqat aniq ruxsat etilgan muhitda — production yoki noma'lum muhitda to'xtaydi. */
export function assertAnonymizableEnv(nodeEnv: string | undefined): void {
  if (nodeEnv === undefined)
    throw new Error("NODE_ENV o'rnatilmagan — anonimlashtirish to'xtatildi");
  if (!(ANONYMIZABLE_ENVS as readonly string[]).includes(nodeEnv)) {
    throw new Error(`NODE_ENV=${nodeEnv}: production'da anonimlashtirish taqiqlangan`);
  }
}

export class Anonymizer {
  private readonly salt: string;

  constructor(salt: string) {
    if (salt.length < MIN_SALT_LENGTH) {
      throw new Error(`ANONYMIZE_SALT kamida ${MIN_SALT_LENGTH} belgi bo'lishi shart`);
    }
    this.salt = salt;
  }

  private hash(value: string): bigint {
    const hex = createHmac('sha256', this.salt).update(value).digest('hex');
    return BigInt(`0x${hex.slice(0, 15)}`);
  }

  fakePhone(phone: string): string {
    const num = this.hash(phone);
    const sub = (num % 900000000n) + 100000000n;
    return `+998${sub.toString()}`;
  }

  fakeTelegramId(seed: string): bigint {
    const num = this.hash(seed);
    return (num % 800000000n) + 100000000n;
  }

  fakeName(seed: string): { firstName: string; lastName: string; fullName: string } {
    const num = this.hash(seed);
    const fIdx = Number(num % BigInt(FIRST_NAMES.length));
    const lIdx = Number((num / BigInt(FIRST_NAMES.length)) % BigInt(LAST_NAMES.length));
    const firstName = FIRST_NAMES[fIdx] ?? 'Ali';
    const lastName = LAST_NAMES[lIdx] ?? 'Karimov';
    return { firstName, lastName, fullName: `${firstName} ${lastName}` };
  }
}

async function anonymizeUsers(tx: Transaction, anon: Anonymizer): Promise<number> {
  const rows = await tx.select({ id: users.id, phone: users.phone }).from(users);
  for (const u of rows) {
    const fakePhone = anon.fakePhone(u.phone);
    const { fullName } = anon.fakeName(u.id);
    const fakeTgId = anon.fakeTelegramId(u.id);
    const fakeTgUser = `user_${fakeTgId.toString().slice(0, 6)}`;
    await tx
      .update(users)
      .set({
        phone: fakePhone,
        fullName,
        telegramId: fakeTgId,
        telegramUsername: fakeTgUser,
      })
      .where(eq(users.id, u.id));
  }
  return rows.length;
}

async function anonymizeStudents(tx: Transaction, anon: Anonymizer): Promise<number> {
  const rows = await tx.select({ id: students.id, phone: students.phone }).from(students);
  for (const st of rows) {
    const fakePhone = st.phone ? anon.fakePhone(st.phone) : null;
    const { fullName } = anon.fakeName(st.id);
    await tx
      .update(students)
      .set({
        fullName,
        searchName: fullName.toLowerCase(),
        phone: fakePhone,
        notes: null,
        photoFileId: null,
      })
      .where(eq(students.id, st.id));
  }
  return rows.length;
}

async function anonymizeGuardians(tx: Transaction, anon: Anonymizer): Promise<number> {
  const rows = await tx.select({ id: guardians.id, phone: guardians.phone }).from(guardians);
  for (const g of rows) {
    const fakePhone = anon.fakePhone(g.phone);
    const { fullName } = anon.fakeName(g.id);
    await tx
      .update(guardians)
      .set({
        fullName,
        phone: fakePhone,
      })
      .where(eq(guardians.id, g.id));
  }
  return rows.length;
}

async function anonymizeLeads(tx: Transaction, anon: Anonymizer): Promise<number> {
  const leadRows = await tx.select({ id: leads.id, phone: leads.phone }).from(leads);
  for (const l of leadRows) {
    const fakePhone = anon.fakePhone(l.phone);
    const { fullName } = anon.fakeName(l.id);
    await tx
      .update(leads)
      .set({
        fullName,
        searchName: fullName.toLowerCase(),
        phone: fakePhone,
        notes: null,
      })
      .where(eq(leads.id, l.id));
  }
  return leadRows.length;
}

async function anonymizeRequestsAndSubmissions(tx: Transaction, anon: Anonymizer): Promise<void> {
  const reqRows = await tx
    .select({ id: guardianLinkRequests.id, phone: guardianLinkRequests.phone })
    .from(guardianLinkRequests);
  for (const req of reqRows) {
    const fakePhone = anon.fakePhone(req.phone);
    const { fullName } = anon.fakeName(req.id);
    const fakeTgId = anon.fakeTelegramId(req.id);
    await tx
      .update(guardianLinkRequests)
      .set({
        fullName,
        phone: fakePhone,
        telegramId: fakeTgId,
        telegramUsername: null,
        rejectReason: null,
      })
      .where(eq(guardianLinkRequests.id, req.id));
  }

  await tx
    .update(paymentSubmissions)
    .set({ comment: null, rejectReason: null })
    .where(
      sql`${paymentSubmissions.comment} IS NOT NULL OR ${paymentSubmissions.rejectReason} IS NOT NULL`,
    );
}

export async function anonymizeDatabase(
  db: Database,
  salt: string,
): Promise<{ users: number; students: number; guardians: number; leads: number }> {
  const anon = new Anonymizer(salt);
  return db.transaction(async (tx: Transaction) => {
    const uCount = await anonymizeUsers(tx, anon);
    const sCount = await anonymizeStudents(tx, anon);
    const gCount = await anonymizeGuardians(tx, anon);
    const lCount = await anonymizeLeads(tx, anon);
    await anonymizeRequestsAndSubmissions(tx, anon);
    return { users: uCount, students: sCount, guardians: gCount, leads: lCount };
  });
}

async function main(): Promise<void> {
  loadRootEnv();
  assertAnonymizableEnv(process.env['NODE_ENV']);
  const salt = process.env['ANONYMIZE_SALT'];
  if (!salt) throw new Error("ANONYMIZE_SALT o'rnatilmagan (.env.example ga qarang)");
  const url = requireDatabaseUrl();
  console.info(`[T-018] Staging ma'lumotlarini anonimlashtirish boshlandi: ${maskUrl(url)}`);
  const db = createDb(url);
  try {
    const stats = await anonymizeDatabase(db, salt);
    console.info(
      `[T-018] Anonimlashtirish muvaffaqiyatli: Users=${stats.users}, Students=${stats.students}, Guardians=${stats.guardians}, Leads=${stats.leads}`,
    );
  } finally {
    await closeDb(db);
  }
}

if (isMain(import.meta.url)) {
  main().catch((err: unknown) => {
    console.error('Xatolik yuz berdi:', err);
    process.exit(1);
  });
}
