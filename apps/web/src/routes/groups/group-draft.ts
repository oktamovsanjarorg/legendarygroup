import {
  CreateGroupRequest,
  type GroupSlot,
  ScheduleConflictDetails,
  type SlotInput,
} from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { ApiError } from '../../api/client.js';
import type { GroupDraft, GroupFormErrors } from '../../screens/f1/group-form.js';
import { EMPTY_BLOCK, type SlotBlock } from '../../screens/f1/slots-editor.js';

export const emptyDraft = (today: string): GroupDraft => ({
  name: '',
  courseId: '',
  teacherId: '',
  assistantId: '',
  roomId: '',
  blocks: [EMPTY_BLOCK],
  maxStudents: '16',
  startDate: today,
  price: null,
});

/** Bloklar → API slotlari (kunsiz blok — slot bermaydi). */
export const slotsOf = (blocks: readonly SlotBlock[]): SlotInput[] =>
  blocks.flatMap((b) => b.days.map((weekday) => ({ weekday, startTime: b.start, endTime: b.end })));

type Slot = Pick<GroupSlot, 'weekday' | 'startTime' | 'endTime'>;

/** Slotlar → bir xil vaqtdagi kunlar bloklari (tahrirlash va ko'rsatish uchun). */
export function blocksOf(slots: readonly Slot[]): SlotBlock[] {
  const byTime = new Map<string, SlotBlock>();
  for (const s of [...slots].sort((a, b) => a.weekday - b.weekday)) {
    const key = `${s.startTime}-${s.endTime}`;
    const block = byTime.get(key) ?? { days: [], start: s.startTime, end: s.endTime };
    byTime.set(key, { ...block, days: [...block.days, s.weekday] });
  }
  return [...byTime.values()];
}

const dayNames = (days: readonly number[]) =>
  days.map((d) => t.calendar.daysShort[d - 1]).join('/');

/** `Du/Ch/Ju 15:00, Sh 10:00` — ro'yxat ustuni. */
export const scheduleText = (slots: readonly Slot[]): string =>
  blocksOf(slots)
    .map((b) => `${dayNames(b.days)} ${b.start}`)
    .join(', ');

/** Zod xatolari → maydon matnlari (`slots.0.endTime` → `slots`). */
export function groupErrors(issues: readonly { path: PropertyKey[] }[]): GroupFormErrors {
  const texts: Record<string, string> = t.groups.form.errors;
  const out: Record<string, string> = {};
  for (const i of issues) {
    const field = String(i.path[0]);
    if (texts[field]) out[field] = texts[field];
  }
  return out;
}

/** Forma → `POST /groups` (API bilan bitta Zod sxema; pul JSON'da string). */
export function createBody(d: GroupDraft) {
  const teachers = [
    ...(d.teacherId ? [{ teacherId: d.teacherId, role: 'main' as const }] : []),
    ...(d.assistantId ? [{ teacherId: d.assistantId, role: 'assistant' as const }] : []),
  ];
  const parsed = CreateGroupRequest.safeParse({
    name: d.name,
    courseId: d.courseId,
    roomId: d.roomId || null,
    maxStudents: Number(d.maxStudents),
    startDate: d.startDate,
    slots: slotsOf(d.blocks),
    teachers,
    ...(d.price === null ? {} : { monthlyPrice: d.price.toString() }),
  });
  const errors = parsed.success ? {} : groupErrors(parsed.error.issues);
  if (d.assistantId && d.assistantId === d.teacherId)
    errors.teachers = t.groups.form.errors.teachers;
  if (!parsed.success || Object.keys(errors).length > 0) return { ok: false as const, errors };
  const { monthlyPrice, ...rest } = parsed.data;
  const body = {
    ...rest,
    ...(monthlyPrice === undefined ? {} : { monthlyPrice: `${monthlyPrice}` }),
  };
  return { ok: true as const, body };
}

/**
 * 409 `SCHEDULE_CONFLICT` → tushunarli xabarlar (FR-ORG-6): qaysi xona/ustoz, qachon, qaysi guruh.
 * `nameOf` — xona yoki ustoz nomi (id bo'yicha).
 */
export function conflictTexts(e: unknown, nameOf: (id: string) => string | undefined): string[] {
  if (!(e instanceof ApiError) || e.code !== 'SCHEDULE_CONFLICT') return [];
  const details = ScheduleConflictDetails.safeParse(e.details);
  if (!details.success) return [];
  return details.data.conflicts.map((c) =>
    t.groups.conflict
      .replace(
        '{room}',
        nameOf(c.resourceId) ?? (c.kind === 'room' ? t.groups.form.room : t.groups.cols.teacher),
      )
      .replace('{time}', `${t.calendar.daysShort[c.weekday - 1]} ${c.startTime}–${c.endTime}`)
      .replace('{group}', c.groupName),
  );
}
