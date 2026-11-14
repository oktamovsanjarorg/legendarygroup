import type { StudentListRow } from '@lg/contracts';
import { type Database, enrollmentFreezes, enrollments, guardians, studentGuardians } from '@lg/db';
import { and, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm';
import { guardianPhone, type Viewer } from './students.serializer.js';

type Extras = Pick<StudentListRow, 'groups' | 'frozen' | 'guardian'>;

interface Params {
  ids: readonly string[];
  today: string;
  viewer: Viewer;
  /** Guruh nomlari — org public servisi (`GroupsQueryService.namesOf`). */
  groupNames: (ids: readonly string[]) => Promise<Map<string, string>>;
}

/**
 * Ro'yxat sahifasi uchun qo'shimcha ma'lumot (W-05) — sahifadagi o'quvchilar soniga bog'liq
 * bo'lmagan 3–4 so'rov (N+1 emas): asosiy ota-ona, bugungi guruhlar, muzlatish holati.
 */
export async function studentListExtras(db: Database, p: Params): Promise<Map<string, Extras>> {
  const out = new Map<string, Extras>(
    p.ids.map((id) => [id, { groups: [], frozen: false, guardian: null }]),
  );
  if (p.ids.length === 0) return out;
  const ids = [...p.ids];
  const primary = await db
    .select({
      studentId: studentGuardians.studentId,
      guardian: { id: guardians.id, fullName: guardians.fullName, phone: guardians.phone },
    })
    .from(studentGuardians)
    .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .where(and(inArray(studentGuardians.studentId, ids), eq(studentGuardians.isPrimary, true)));
  for (const r of primary) {
    const e = out.get(r.studentId);
    if (e) e.guardian = { fullName: r.guardian.fullName, phone: guardianPhone(r, p.viewer) };
  }
  const current = await db
    .select({ id: enrollments.id, studentId: enrollments.studentId, groupId: enrollments.groupId })
    .from(enrollments)
    .where(
      and(
        inArray(enrollments.studentId, ids),
        lte(enrollments.startDate, p.today),
        or(isNull(enrollments.endDate), gte(enrollments.endDate, p.today)),
      ),
    );
  if (current.length === 0) return out;
  const names = await p.groupNames(current.map((c) => c.groupId));
  const frozen = await db
    .select({ enrollmentId: enrollmentFreezes.enrollmentId })
    .from(enrollmentFreezes)
    .where(
      and(
        inArray(
          enrollmentFreezes.enrollmentId,
          current.map((c) => c.id),
        ),
        lte(enrollmentFreezes.fromDate, p.today),
        gte(enrollmentFreezes.toDate, p.today),
      ),
    );
  const frozenIds = new Set(frozen.map((f) => f.enrollmentId));
  for (const id of ids) {
    const mine = current.filter((c) => c.studentId === id);
    const e = out.get(id);
    if (!e || mine.length === 0) continue;
    e.groups = mine
      .map((c) => ({ id: c.groupId, name: names.get(c.groupId) ?? '—' }))
      .sort((a, b) => a.name.localeCompare(b.name));
    e.frozen = mine.every((c) => frozenIds.has(c.id));
  }
  return out;
}
