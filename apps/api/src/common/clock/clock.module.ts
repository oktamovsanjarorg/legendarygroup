import { Global, Module, type DynamicModule } from '@nestjs/common';
import type { Clock } from '@lg/domain';
import { SystemClock } from '@lg/domain';
import { CLOCK_TOKEN } from './clock.tokens.js';

@Global()
@Module({
  providers: [
    {
      provide: CLOCK_TOKEN,
      useClass: SystemClock,
    },
  ],
  exports: [CLOCK_TOKEN],
})
export class ClockModule {
  static forRoot(customClock?: Clock): DynamicModule {
    return {
      module: ClockModule,
      providers: [
        {
          provide: CLOCK_TOKEN,
          useValue: customClock ?? new SystemClock(),
        },
      ],
      exports: [CLOCK_TOKEN],
    };
  }
}
