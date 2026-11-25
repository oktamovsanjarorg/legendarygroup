import type { FirstMonthQueryInput, FirstMonthQuote } from '@lg/contracts';
import { type Database, groups } from '@lg/db';
import { calculateMidMonthEnrollmentPrice } from '@lg/domain';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { BillingRepository } from './billing.repository.js';

const monthEndOf = (period: string): string => {
  const [y, m] = period.split('-').map(Number) as [number, number];
  return `${period}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
};

/**
 * T-134: BR-3 — generator (`calculateEnrollmentLine`) bilan bir xil hisob: kelgan kundan oy
 * oxirigacha rejalashtirilgan darslar / oydagi jami; dars yo'q bo'lsa — to'liq narx.
 */
@Injectable()
export class FirstMonthQuoteService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(BillingRepository) private readonly repo: BillingRepository,
  ) {}

  async quote(q: FirstMonthQueryInput): Promise<FirstMonthQuote> {
    const [group] = await this.db
      .select({ price: groups.monthlyPrice })
      .from(groups)
      .where(eq(groups.id, q.groupId));
    if (!group) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    const period = q.startDate.slice(0, 7);
    const monthStart = `${period}-01`;
    const monthEnd = monthEndOf(period);
    const total = await this.repo.countPlannedLessons(q.groupId, monthStart, monthEnd);
    const left =
      q.startDate > monthStart
        ? await this.repo.countPlannedLessons(q.groupId, q.startDate, monthEnd)
        : total;
    const amount =
      q.startDate > monthStart && total > 0
        ? calculateMidMonthEnrollmentPrice(group.price, left, total)
        : group.price;
    return {
      period,
      monthlyPrice: group.price.toString(),
      amount: amount.toString(),
      lessonsLeft: left,
      lessonsTotal: total,
    };
  }
}
