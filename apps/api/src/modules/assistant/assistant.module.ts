import { Module } from '@nestjs/common';
import { EnvService } from '../../config/env.service.js';
import { BillingModule } from '../billing/index.js';
import { DashboardModule } from '../dashboard/index.js';
import { RbacModule } from '../rbac/index.js';
import { StudentsModule } from '../students/index.js';
import { AssistantController } from './assistant.controller.js';
import { AssistantDepsProvider } from './assistant.deps.js';
import { ASSISTANT_LLM } from './assistant.llm.js';
import { ASSISTANT_DEPS, AssistantService } from './assistant.service.js';
import { deepseekLlm } from './deepseek.llm.js';

/** AI yordamchi (Q-114). `DEEPSEEK_API_KEY` bo'lmasa (Q-119) — o'chiq (503 ASSISTANT_DISABLED). */
@Module({
  imports: [StudentsModule, BillingModule, DashboardModule, RbacModule],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    {
      provide: ASSISTANT_LLM,
      inject: [EnvService],
      useFactory: (env: EnvService) => {
        const key = env.get('DEEPSEEK_API_KEY');
        return key ? deepseekLlm(key) : null;
      },
    },
    { provide: ASSISTANT_DEPS, useClass: AssistantDepsProvider },
  ],
})
export class AssistantModule {}
