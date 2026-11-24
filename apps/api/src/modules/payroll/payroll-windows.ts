import type { TeacherContractRow } from '@lg/db';
import { addDays } from '@lg/domain';
import { type DayRange, periodDays } from './payroll-metrics.repository.js';

export interface ContractWindow {
  contract: TeacherContractRow;
  segments: DayRange[];
  /** Shu doirada oydagi eng so'nggi shartnoma — hisoblangan (accrued) baza faqat unga. */
  latest: boolean;
}

interface Span {
  contract: TeacherContractRow;
  from: string;
  to: string;
  latest: boolean;
}

const min = (a: string, b: string) => (a < b ? a : b);
const max = (a: string, b: string) => (a > b ? a : b);

/** Bir doiradagi shartnomalar: eskisi yangisi boshlangan kuni tugaydi (kunlar qo'shilmaydi). */
function spans(contracts: TeacherContractRow[], first: string, next: string): Span[] {
  const newest = [...contracts].sort((a, b) => b.validFrom.localeCompare(a.validFrom));
  let limit = next;
  const out: Span[] = [];
  for (const contract of newest) {
    const from = max(contract.validFrom, first);
    const to = min(limit, contract.validTo ? addDays(contract.validTo, 1) : limit);
    if (from < to) {
      out.push({ contract, from, to, latest: out.length === 0 });
      limit = from;
    }
  }
  return out;
}

/** Umumiy shartnoma oynasi guruh shartnomalari chegaralarida bo'linadi. */
function generalSegments(span: Span, perGroup: (Span & { groupId: string })[]): DayRange[] {
  const inside = (d: string) => d > span.from && d < span.to;
  const cuts = new Set([span.from, ...perGroup.flatMap((g) => [g.from, g.to]).filter(inside)]);
  const starts = [...cuts].sort();
  return starts.map((from, i) => {
    const to = starts[i + 1] ?? span.to;
    const exclude = perGroup.filter((g) => g.from < to && g.to > from).map((g) => g.groupId);
    return { from, to, scope: { exclude: [...new Set(exclude)] } };
  });
}

/**
 * Q-104: oy ichida shartnomalar kun bo'yicha ajratiladi. Guruhga bog'langan shartnoma (`groupId`) —
 * faqat o'sha guruh va o'z kunlari; umumiy shartnoma — qolgani. Har kun-guruh bitta shartnomaga
 * tushadi, shuning uchun oy o'rtasida almashgan shartnomalar ikkala ham o'z kunlari uchun to'lanadi.
 */
export function contractWindows(contracts: TeacherContractRow[], period: string): ContractWindow[] {
  const { first, next } = periodDays(period);
  const groupIds = [...new Set(contracts.flatMap((c) => (c.groupId ? [c.groupId] : [])))];
  const perGroup = groupIds.flatMap((groupId) =>
    spans(
      contracts.filter((c) => c.groupId === groupId),
      first,
      next,
    ).map((s) => ({ ...s, groupId })),
  );
  const general = spans(
    contracts.filter((c) => c.groupId === null),
    first,
    next,
  );
  return [
    ...perGroup.map((s) => ({
      contract: s.contract,
      latest: s.latest,
      segments: [{ from: s.from, to: s.to, scope: { only: s.groupId, exclude: [] } }],
    })),
    ...general.map((s) => ({
      contract: s.contract,
      latest: s.latest,
      segments: generalSegments(s, perGroup),
    })),
  ];
}

const DAY_MS = 86_400_000;

/** Oynadagi kunlar va oydagi jami kunlar — fiks oylikni kunlarga bo'lish uchun. */
export function windowDays(segments: DayRange[], period: string): { days: number; total: number } {
  const span = (from: string, to: string) =>
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
  const { first, next } = periodDays(period);
  return { days: segments.reduce((s, x) => s + span(x.from, x.to), 0), total: span(first, next) };
}
