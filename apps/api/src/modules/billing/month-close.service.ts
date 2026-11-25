import { Inject, Injectable } from '@nestjs/common';
import { PenaltyConfigSchema } from '@lg/contracts';
import { calculateFreezeCredit, calculateLessonCredit, calculatePenalty } from '@lg/domain';
import { SettingsService } from '../settings/index.js';
import { MonthCloseRepository, type PrevTuition } from './month-close.repository.js';

/** Yangi oy invoice'iga o'tgan oy yopilishidan tushadigan tuzatishlar (BR-2). */
export interface MonthAdjustment {
  enrollmentId: string;
  /** BR-5 + BR-9: shu yozilishning yangi oy o'qish qatoridan ayiriladi (manfiy qator yo'q). */
  credit: bigint;
  creditNote: string | null;
  /** BR-8: alohida `penalty` qatori (0 — yo'q). */
  penalty: bigint;
  penaltyNote: string | null;
}

export const prevPeriodOf = (period: string): string => {
  const y = Number(period.slice(0, 4));
  const m = Number(period.slice(5, 7));
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

const monthRange = (period: string) => {
  const [y, m] = [Number(period.slice(0, 4)), Number(period.slice(5, 7))];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${period}-01`, to: `${period}-${String(last).padStart(2, '0')}` };
};

/**
 * BR-2 1-qadam — o'tgan oyni yopish: bekor qilingan darslar krediti (BR-5), muzlatish krediti
 * (BR-9), jarima (BR-8, BR-10). Asos — o'tgan oy invoice'ida haqiqatan undirilgan o'qish summasi.
 * Faqat o'qiydi; natija generatorga (2-qadam) beriladi — xato bo'lsa invoice yaratilmaydi.
 */
@Injectable()
export class MonthCloseService {
  constructor(
    @Inject(MonthCloseRepository) private readonly repo: MonthCloseRepository,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  /**
   * `active` — yangi qator yoziladigan a'zoliklar: o'tgan oyda hisobi bo'lmagani (guruh
   * to'xtatilgan edi, Q-102) — oxirgi hisobli oyi bo'yicha, kredit yo'qolmaydi.
   */
  async adjustments(
    studentId: string,
    period: string,
    active: readonly string[] = [],
  ): Promise<MonthAdjustment[]> {
    const prev = prevPeriodOf(period);
    const recent = await this.repo.prevTuition(studentId, prev);
    const gap = active.filter((id) => !recent.some((r) => r.enrollmentId === id));
    const rows = [...recent, ...(await this.repo.lastTuition(studentId, prev, gap))];
    if (rows.length === 0) return [];
    const base = (await this.settings.getSettings()).penaltyConfig;
    return Promise.all(
      rows.map((r) => this.forEnrollment(studentId, r, monthRange(r.period), base)),
    );
  }

  private async forEnrollment(
    studentId: string,
    r: PrevTuition,
    range: { from: string; to: string },
    base: unknown,
  ): Promise<MonthAdjustment> {
    const { total, cancelled } = await this.repo.lessonCounts(r.groupId, range.from, range.to);
    const frozen = await this.repo.frozenLessons(r.enrollmentId, r.groupId, range.from, range.to);
    const lessonCredit = calculateLessonCredit(r.amount, cancelled, total);
    const freezeCredit = calculateFreezeCredit(r.amount, frozen, total);
    const credit = lessonCredit + freezeCredit;
    const notes = [
      cancelled > 0 ? `bekor qilingan ${cancelled} dars` : null,
      frozen > 0 ? `muzlatish ${frozen} dars` : null,
    ].filter(Boolean);
    const penalty = await this.penaltyFor(studentId, r, range, base);
    return {
      enrollmentId: r.enrollmentId,
      credit,
      creditNote: credit > 0n ? notes.join(', ') : null,
      penalty: penalty.amount,
      penaltyNote: penalty.note,
    };
  }

  private async penaltyFor(
    studentId: string,
    r: PrevTuition,
    range: { from: string; to: string },
    base: unknown,
  ): Promise<{ amount: bigint; note: string | null }> {
    // Guruh sozlamasi bo'lsa — u ustun (BR-8 "sozlanadi"), aks holda markaz sozlamasi.
    const cfg = PenaltyConfigSchema.safeParse({ ...(base as object), ...(r.penaltyConfig ?? {}) });
    if (!cfg.success || !cfg.data.enabled || cfg.data.penaltyPerLesson <= 0n)
      return { amount: 0n, note: null };
    const c = cfg.data;
    const a = await this.repo.absences({
      studentId,
      groupId: r.groupId,
      ...range,
      lateMin: c.lateThresholdMin,
    });
    const amount = calculatePenalty({
      unexcusedAbsences: a.absent,
      lateCount: a.late,
      threshold: c.absenceThreshold,
      penaltyPerLesson: c.penaltyPerLesson,
    });
    return { amount, note: amount > 0n ? `${a.absent} sababsiz, ${a.late} kech` : null };
  }
}
