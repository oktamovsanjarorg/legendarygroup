import { createHash, timingSafeEqual } from 'node:crypto';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import Fastify, { type FastifyInstance } from 'fastify';
import { QueueService } from '../common/queue/queue.service.js';
import { EnvService } from '../config/env.service.js';

export const BOARD_PATH = '/queues';
const digest = (s: string): Buffer => createHash('sha256').update(s).digest();

/** `Authorization: Basic …` ni vaqt/uzunlikni oshkor qilmasdan tekshiradi. */
export function basicAuthOk(header: string | undefined, user: string, password: string): boolean {
  if (!header?.startsWith('Basic ')) return false;
  const given = Buffer.from(header.slice(6), 'base64').toString('utf8');
  return timingSafeEqual(digest(given), digest(`${user}:${password}`));
}

/**
 * Worker ichki HTTP serveri (`WORKER_PORT`, faqat ichki tarmoq — Caddy proksilamaydi):
 * `/queues` — Bull Board (basic auth), `/health/live` — konteyner healthcheck.
 */
@Injectable()
export class BoardServer implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(BoardServer.name);
  private server: FastifyInstance | undefined;

  constructor(
    @Inject(EnvService) private readonly env: EnvService,
    @Inject(QueueService) private readonly queues: QueueService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const user = this.env.get('BULL_BOARD_USER');
    const password = this.env.get('BULL_BOARD_PASSWORD');
    if (!user || !password) {
      throw new Error('[worker] BULL_BOARD_USER va BULL_BOARD_PASSWORD majburiy');
    }

    const server = Fastify({ logger: false });
    server.get('/health/live', async () => ({ status: 'ok' }));

    const adapter = new FastifyAdapter().setBasePath(BOARD_PATH);
    createBullBoard({
      queues: this.queues.allQueues().map((q) => new BullMQAdapter(q)),
      serverAdapter: adapter,
    });
    await server.register(async (scope) => {
      scope.addHook('onRequest', async (req, reply) => {
        if (basicAuthOk(req.headers.authorization, user, password)) return;
        await reply.header('WWW-Authenticate', 'Basic realm="queues"').code(401).send();
      });
      await scope.register(adapter.registerPlugin(), { prefix: BOARD_PATH });
    });

    await server.listen({ port: this.env.get('WORKER_PORT'), host: '0.0.0.0' });
    this.server = server;
    this.logger.log(`Bull Board: port ${this.port()}${BOARD_PATH}`);
  }

  /** Haqiqiy port (testlarda `WORKER_PORT=0` — tasodifiy bo'sh port). */
  port(): number {
    const address = this.server?.server.address();
    return typeof address === 'object' && address ? address.port : 0;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.server?.close();
  }
}
