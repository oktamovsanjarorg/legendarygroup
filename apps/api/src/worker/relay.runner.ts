import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { OutboxRelay, RELAY_BATCH } from '../modules/outbox/index.js';

export const RELAY_INTERVAL_MS = 1000;

/**
 * Outbox relay sikli (har 1 s, T-005). Partiyalar ketma-ket — bir jarayonda ustma-ust
 * ishlamaydi; to'liq partiya bo'lsa kutmasdan davom etadi. Yopilishda joriy partiya tugashi kutiladi.
 */
@Injectable()
export class RelayRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(RelayRunner.name);
  private running = false;
  private timer: NodeJS.Timeout | undefined;
  private current: Promise<void> = Promise.resolve();

  constructor(@Inject(OutboxRelay) private readonly relay: OutboxRelay) {}

  onApplicationBootstrap(): void {
    this.running = true;
    this.schedule(0);
  }

  async onApplicationShutdown(): Promise<void> {
    this.running = false;
    clearTimeout(this.timer);
    await this.current;
  }

  private schedule(delay: number): void {
    if (!this.running) return;
    this.timer = setTimeout(() => {
      this.current = this.tick();
    }, delay);
  }

  private async tick(): Promise<void> {
    let relayed = 0;
    try {
      relayed = await this.relay.relayOnce();
    } catch (err) {
      this.logger.error({ err }, 'Outbox relay partiyasi muvaffaqiyatsiz');
    }
    this.schedule(relayed >= RELAY_BATCH ? 0 : RELAY_INTERVAL_MS);
  }
}
