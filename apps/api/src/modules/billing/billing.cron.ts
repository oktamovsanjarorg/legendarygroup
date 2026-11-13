import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { type Clock } from '@lg/domain';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { CronJobs } from '../../common/scheduler/cron-jobs.js';
import { BillingGeneratorService } from './billing-generator.service.js';

@Injectable()
export class BillingCron implements OnModuleInit {
  private readonly logger = new Logger(BillingCron.name);

  constructor(
    @Inject(CronJobs) private readonly cron: CronJobs,
    @Inject(BillingGeneratorService) private readonly generator: BillingGeneratorService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  onModuleInit(): void {
    this.cron.register({
      id: 'billing.invoices-generate',
      pattern: '5 0 1 * *', // Har oyning 1-sanasi 00:05 (BR-2)
      run: async () => {
        const today = this.clock.today(); // 'YYYY-MM-DD'
        const period = today.slice(0, 7); // 'YYYY-MM'
        this.logger.log(`Oylik invoice avto-generatsiyasi boshlandi: ${period}`);
        await this.generator.generateMonthlyInvoices(period);
        this.logger.log(`Oylik invoice avto-generatsiyasi yakunlandi: ${period}`);
      },
    });
  }
}
