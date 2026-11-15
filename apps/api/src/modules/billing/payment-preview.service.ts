import { Inject, Injectable } from '@nestjs/common';
import type { PaymentPreview, PaymentPreviewQueryInput } from '@lg/contracts';
import type { Database } from '@lg/db';
import { allocateFifo } from '@lg/domain';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import type { RequestUser } from '../auth/index.js';
import { StudentScopeService } from '../students/index.js';
import { BillingBalanceRepository } from './billing-balance.repository.js';
import type { OpenLineInfo } from './billing.types.js';

interface PeriodPart {
  period: string;
  amount: bigint;
  outstanding: bigint;
}

/** Qatorlar taqsimotini oy bo'yicha yig'adi (tartib — FIFO, eng eski oy birinchi). */
export function groupByPeriod(
  lines: readonly OpenLineInfo[],
  parts: readonly { id: string; amount: bigint }[],
): PaymentPreview['parts'] {
  const byLine = new Map(parts.map((p) => [p.id, p.amount]));
  const periods = new Map<string, PeriodPart>();
  for (const l of lines) {
    const cur = periods.get(l.period) ?? { period: l.period, amount: 0n, outstanding: 0n };
    cur.amount += byLine.get(l.id) ?? 0n;
    cur.outstanding += l.outstanding;
    periods.set(l.period, cur);
  }
  return [...periods.values()]
    .filter((p) => p.amount > 0n)
    .map((p) => ({
      period: p.period,
      amount: p.amount.toString(),
      closes: p.amount === p.outstanding,
    }));
}

/**
 * W-13 preview (T-204, BR-12): `createPayment` bilan aynan bir xil `allocateFifo` — UI pul
 * hisoblamaydi, faqat ko'rsatadi. Yozuv yo'q (lock ham yo'q): natija saqlash paytida qayta hisoblanadi.
 */
@Injectable()
export class PaymentPreviewService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(BillingBalanceRepository) private readonly balance: BillingBalanceRepository,
    @Inject(StudentScopeService) private readonly studentScope: StudentScopeService,
  ) {}

  async preview(user: RequestUser, q: PaymentPreviewQueryInput): Promise<PaymentPreview> {
    await this.studentScope.assertVisible(user, q.studentId);
    const lines = await this.db.transaction((tx) => this.balance.openLines(tx, q.studentId));
    const res = allocateFifo(
      BigInt(q.amount),
      lines.map((l) => ({ id: l.id, dueDate: l.dueDate, outstanding: l.outstanding })),
    );
    const debt = lines.reduce((sum, l) => sum + l.outstanding, 0n);
    return {
      debt: debt.toString(),
      parts: groupByPeriod(lines, res.parts),
      advance: res.advance.toString(),
    };
  }
}
