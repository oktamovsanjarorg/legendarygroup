import { Global, Module } from '@nestjs/common';
import { TelegramOutbox } from './telegram-outbox.service.js';

@Global()
@Module({ providers: [TelegramOutbox], exports: [TelegramOutbox] })
export class TelegramModule {}
