import type { Clock } from '@lg/domain';
import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { BillingService, DebtorsService } from '../billing/index.js';
import { DashboardService } from '../dashboard/index.js';
import { GroupsQueryService, LessonsQueryService } from '../org/index.js';
import { EnrollmentsQueryService, StudentsQueryService } from '../students/index.js';

/** Yordamchi foydalanadigan public servislar (modul chegarasi — faqat index orqali). */
export interface AssistantDeps {
  students: Pick<StudentsQueryService, 'list' | 'detail'>;
  enrollments: Pick<EnrollmentsQueryService, 'forStudent'>;
  billing: Pick<BillingService, 'getStudentLedgerSummary'>;
  dashboard: Pick<DashboardService, 'getDirectorDashboardKpi'>;
  debtors: Pick<DebtorsService, 'getDebtors'>;
  groups: Pick<GroupsQueryService, 'list'>;
  lessons: Pick<LessonsQueryService, 'calendar'>;
  clock: Pick<Clock, 'today'>;
}

@Injectable()
export class AssistantDepsProvider implements AssistantDeps {
  constructor(
    @Inject(StudentsQueryService) readonly students: StudentsQueryService,
    @Inject(EnrollmentsQueryService) readonly enrollments: EnrollmentsQueryService,
    @Inject(BillingService) readonly billing: BillingService,
    @Inject(DashboardService) readonly dashboard: DashboardService,
  ) {}

  // Qolganlari — konstruktor parametrlari chegarasi (≤ 4) uchun xususiyat orqali.
  @Inject(DebtorsService) readonly debtors!: DebtorsService;
  @Inject(GroupsQueryService) readonly groups!: GroupsQueryService;
  @Inject(LessonsQueryService) readonly lessons!: LessonsQueryService;
  @Inject(CLOCK_TOKEN) readonly clock!: Clock;
}
