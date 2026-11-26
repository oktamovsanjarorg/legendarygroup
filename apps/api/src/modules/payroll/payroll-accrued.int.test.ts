import type { PayrollRunDetail, RoleCode } from '@lg/contracts';
import {
  closeDb,
  createDb,
  type Database,
  enrollments,
  groupTeachers,
  invoiceLines,
  invoices,
  seed,
  students,
} from '@lg/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

// T-401 review: hisoblangan (accrued) baza va oy o'rtasida almashgan shartnomalar (Q-104).
let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;

const call = (method: 'GET' | 'POST', url: string, token: string, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${token}` },
  });

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('BR-24 hisoblangan baza (Q-104)', () => {
  it('BR-24 accrued: shartnoma oy oʻrtasida almashsa — eski shartnoma oʻz kunlari uchun foiz oladi', async () => {
    const director = tokens.get('director')!;
    const teacher = await createUserWithRole(db, 'teacher');
    const cId = (
      await call('POST', 'courses', director, {
        name: 'Biologiya',
        defaultMonthlyPrice: '500000',
        lessonDurationMin: 90,
      })
    ).json<{ id: string }>().id;
    const gId = (
      await call('POST', 'groups', director, {
        courseId: cId,
        name: 'BIO-07',
        maxStudents: 10,
        startDate: '2026-07-01',
        monthlyPrice: '500000',
      })
    ).json<{ id: string }>().id;
    await db
      .insert(groupTeachers)
      .values({ groupId: gId, teacherId: teacher, role: 'main', fromDate: '2026-07-01' });
    const [stu] = await db
      .insert(students)
      .values({ fullName: 'Nodir Aliyev', searchName: 'nodir aliyev' })
      .returning();
    const [enr] = await db
      .insert(enrollments)
      .values({ studentId: stu!.id, groupId: gId, startDate: '2026-07-01' })
      .returning();
    const [inv] = await db
      .insert(invoices)
      .values({
        studentId: stu!.id,
        period: '2026-07',
        dueDate: '2026-07-10',
        total: 1000000n,
        status: 'open',
      })
      .returning();
    await db.insert(invoiceLines).values({
      invoiceId: inv!.id,
      enrollmentId: enr!.id,
      kind: 'tuition',
      amount: 1000000n,
      description: 'Biologiya',
    });
    const contract = (body: object) =>
      call('POST', 'payroll/contracts', director, {
        teacherId: teacher,
        perLessonRate: '0',
        ...body,
      });
    // 1–16 iyul: 10% (hisoblangan); 17-iyuldan: qatʼiy oylik (eski shartnoma avtomatik tugaydi).
    await contract({
      type: 'percent',
      fixedAmount: '0',
      percentBp: 1000,
      base: 'accrued',
      validFrom: '2026-07-01',
    });
    await contract({
      type: 'fixed',
      fixedAmount: '3100000',
      percentBp: 0,
      validFrom: '2026-07-17',
    });

    const detail = (
      await call('POST', 'payroll/runs/generate', director, { period: '2026-07' })
    ).json<PayrollRunDetail>();
    const items = detail.teachers.find((x) => x.teacherId === teacher)?.items ?? [];
    // Foiz: 1 000 000 × 10% × 16/31 = 51 612; qatʼiy: 3 100 000 × 15/31 = 1 500 000.
    expect(items.find((i) => i.kind === 'percent')?.amount).toBe('51612');
    expect(items.find((i) => i.kind === 'fixed')?.amount).toBe('1500000');
  });
});
