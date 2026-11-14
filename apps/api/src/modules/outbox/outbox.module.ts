import { Global, Module } from '@nestjs/common';
import { EventHandlers } from './event-handlers.js';
import { OutboxRelay } from './outbox.relay.js';
import { OutboxService } from './outbox.service.js';

/** Global: har modul `OutboxService` (nashr) va `EventHandlers` (iste'mol) dan foydalanadi. */
@Global()
@Module({
  providers: [OutboxService, OutboxRelay, EventHandlers],
  exports: [OutboxService, OutboxRelay, EventHandlers],
})
export class OutboxModule {}
