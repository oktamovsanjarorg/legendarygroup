import { Inject, Injectable } from '@nestjs/common';
import { BillingService, DebtorsService } from '../billing/index.js';
import { DashboardService } from '../dashboard/index.js';
import { EnrollmentsQueryService, StudentsQueryService } from '../students/index.js';

/** Yordamchi foydalanadigan public servislar (modul chegarasi — faqat index orqali). */
export interface AssistantDeps {
  students: Pick<StudentsQueryService, 'list' | 'detail'>;
  enrollments: Pick<EnrollmentsQueryService, 'forStudent'>;
  billing: Pick<BillingService, 'getStudentLedgerSummary'>;
  dashboard: Pick<DashboardService, 'getDirectorDashboardKpi'>;
  debtors: Pick<DebtorsService, 'getDebtors'>;
}

@Injectable()
export class AssistantDepsProvider implements AssistantDeps {
  constructor(
    @Inject(StudentsQueryService) readonly students: StudentsQueryService,
    @Inject(EnrollmentsQueryService) readonly enrollments: EnrollmentsQueryService,
    @Inject(BillingService) readonly billing: BillingService,
    @Inject(DashboardService) readonly dashboard: DashboardService,
  ) {}

  /** Beshinchi servis — konstruktor parametrlari chegarasi (≤ 4) uchun alohida. */
  @Inject(DebtorsService) readonly debtors!: DebtorsService;
}
