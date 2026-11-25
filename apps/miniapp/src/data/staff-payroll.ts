import type {
  CreateTeacherAdvanceRequest,
  CreateTeacherContractRequest,
  PayrollBase,
  PayrollItem,
  PayrollRunDetail,
  PayrollStaffOption,
  TeacherAdvance,
  TeacherContract,
  TeacherContractType,
} from '@lg/contracts';
import { formatMoney, miniappMessages as t } from '@lg/i18n';
import { useQuery } from '@tanstack/react-query';
import { useApi } from './deps.js';
import { shiftPeriod } from './staff-finance.js';
import { atTashkent } from './time.js';

const KEY = ['staff', 'payroll'] as const;
const c = t.staffPayroll;

/** Oylik odatda o'tgan oy uchun oy boshida chiqariladi; ikkinchi yarmida joriy oy ko'rinadi. */
export function defaultPeriod(today: string): string {
  const month = today.slice(0, 7);
  return Number(today.slice(8)) <= 15 ? shiftPeriod(month, -1) : month;
}

/** Oy tugaganmi va hisob undan keyin chiqarilganmi (server ham tekshiradi). */
export type RunPhase = 'none' | 'open' | 'stale' | 'ready' | 'approved' | 'paid';

export function runPhase(run: PayrollRunDetail | null, period: string, today: string): RunPhase {
  if (!run) return 'none';
  if (run.status !== 'draft') return run.status;
  if (today.slice(0, 7) <= period) return 'open';
  const end = atTashkent(`${shiftPeriod(period, 1)}-01`, '00:00');
  return run.generatedAt && new Date(run.generatedAt) >= end ? 'ready' : 'stale';
}

/** Server xulosasidagi manfiylar (jarima, avans) faqat ko'rsatish uchun. */
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0));
const sum = (v: unknown) => formatMoney(BigInt(typeof v === 'string' ? v : '0'));

function fixedHint(d: Record<string, unknown>): string {
  return [
    num(d['totalDays']) > 0 &&
      c.days
        .replace('{days}', String(num(d['days'])))
        .replace('{total}', String(num(d['totalDays']))),
    num(d['substituteLessons']) > 0 &&
      c.lessons
        .replace('{n}', String(num(d['scheduledLessons'])))
        .replace('{m}', String(num(d['substituteLessons']))),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Qator izohi: qanday hisoblangani (FR-SAL-2). Qo'lda yozilganida — sabab. */
export function itemHint(i: PayrollItem): string {
  const d = i.details;
  if (i.kind === 'fixed') return fixedHint(d);
  if (i.kind === 'percent')
    return c.percentOf
      .replace('{sum}', sum(d['collectedBase']))
      .replace('{p}', String(num(d['percentBp']) / 100).replace('.', ','));
  if (i.kind === 'per_lesson')
    return c.subLessons
      .replace('{n}', String(num(d['substituteLessons'])))
      .replace('{sum}', sum(d['rate']));
  return i.note ?? '';
}

export const isManual = (i: PayrollItem): boolean => i.kind === 'bonus' || i.kind === 'penalty';

export function usePayrollRun(period: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'run', period],
    queryFn: () => api.request<PayrollRunDetail | null>(`/payroll/runs?period=${period}`),
  });
}

export function usePayrollStaff() {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'staff'],
    queryFn: () => api.request<PayrollStaffOption[]>('/payroll/staff'),
  });
}

export function useContracts() {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'contracts'],
    queryFn: () => api.request<TeacherContract[]>('/payroll/contracts'),
  });
}

export function useAdvances() {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'advances'],
    queryFn: () => api.request<TeacherAdvance[]>('/payroll/advances'),
  });
}

export interface ContractForm {
  teacherId: string | null;
  type: TeacherContractType;
  fixed: bigint | null;
  percent: string;
  perLesson: bigint | null;
  groupId: string | null;
  base: PayrollBase;
  from: string;
  to: string;
}

export const emptyContract = (today: string): ContractForm => ({
  teacherId: null,
  type: 'percent',
  fixed: null,
  percent: '',
  perLesson: null,
  groupId: null,
  base: 'collected',
  from: `${today.slice(0, 7)}-01`,
  to: '',
});

/** «40» yoki «37,5» → bazis punkt; noto'g'ri — `null`. */
export function percentBp(text: string): number | null {
  const m = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (!m) return null;
  const bp = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
  return bp > 0 && bp <= 10_000 ? bp : null;
}

/** `null` — forma to'liq emas. */
export function contractBody(f: ContractForm): CreateTeacherContractRequest | null {
  const bp = f.type === 'fixed' ? 0 : percentBp(f.percent);
  const fixed = f.type === 'percent' ? 0n : f.fixed;
  if (!f.teacherId || bp === null || fixed === null || f.from === '') return null;
  if (f.to !== '' && f.to < f.from) return null;
  return {
    teacherId: f.teacherId,
    groupId: f.groupId,
    type: f.type,
    fixedAmount: fixed.toString(),
    percentBp: bp,
    perLessonRate: (f.perLesson ?? 0n).toString(),
    base: f.base,
    validFrom: f.from,
    validTo: f.to || null,
  };
}

export interface AdvanceForm {
  teacherId: string | null;
  amount: bigint | null;
  date: string;
  note: string;
}

export function advanceBody(f: AdvanceForm, today: string): CreateTeacherAdvanceRequest | null {
  if (!f.teacherId || f.amount === null || f.date === '' || f.date > today) return null;
  const note = f.note.trim();
  return {
    teacherId: f.teacherId,
    amount: f.amount.toString(),
    givenAt: f.date,
    ...(note ? { note } : {}),
  };
}

export const staffOptions = (staff: readonly PayrollStaffOption[]) =>
  staff.map((s) => ({
    value: s.id,
    label: s.fullName,
    hint: s.roles.map((r) => t.roles[r]).join(', '),
  }));

/** Shartnoma holati bugungi kunga. */
export function contractState(
  k: Pick<TeacherContract, 'validFrom' | 'validTo'>,
  today: string,
): 'active' | 'upcoming' | 'ended' {
  if (k.validTo !== null && k.validTo < today) return 'ended';
  return k.validFrom > today ? 'upcoming' : 'active';
}

/** «2 000 000 soʻm + 40%». */
export const contractTerms = (k: TeacherContract): string =>
  [
    k.type !== 'percent' && formatMoney(BigInt(k.fixedAmount)),
    k.type !== 'fixed' && `${String(k.percentBp / 100).replace('.', ',')}%`,
  ]
    .filter(Boolean)
    .join(' + ');
