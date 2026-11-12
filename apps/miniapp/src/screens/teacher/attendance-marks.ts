import type { AttendanceMark } from '@lg/ui-tg';

export interface RosterStudent {
  id: string;
  name: string;
  /** Ota-ona oldindan "sababli" xabar bergan (FR-ATT-7). */
  preExcused?: boolean;
}

export type Marks = Readonly<Record<string, AttendanceMark>>;

/** Boshlang'ich: oldindan sababli — "sababli", qolgan hamma — "keldi" (FR-ATT-2). */
export function initialMarks(students: readonly RosterStudent[], saved?: Marks): Marks {
  return Object.fromEntries(
    students.map((s) => [
      s.id,
      saved?.[s.id] ?? (s.preExcused ? { kind: 'excused' } : { kind: 'present' }),
    ]),
  );
}

/** Teginish: keldi → kelmadi; boshqa har qanday holat → keldi. */
export const toggled = (m: AttendanceMark): AttendanceMark =>
  m.kind === 'present' ? { kind: 'absent' } : { kind: 'present' };

/** "Keldi" soni: kech qolgan ham kelgan (MainButton "Saqlash (18/20 keldi)"). */
export const cameCount = (marks: Marks): number =>
  Object.values(marks).filter((m) => m.kind === 'present' || m.kind === 'late').length;

const same = (a: AttendanceMark | undefined, b: AttendanceMark | undefined): boolean =>
  a?.kind === b?.kind && (a?.kind !== 'late' || b?.kind !== 'late' || a.minutes === b.minutes);

/** Saqlanmagan o'zgarish bormi (closing confirmation, 11-ux §4.3). */
export const isDirty = (base: Marks, current: Marks): boolean =>
  Object.keys(current).some((id) => !same(base[id], current[id]));

/** Kech qolish uchun tez tanlov (klaviaturasiz) — daqiqa. */
export const LATE_CHOICES = [5, 10, 15, 20, 30, 45] as const;
