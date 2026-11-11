import { randomInt } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { type Database, type Transaction, userBackupCodes } from '@lg/db';
import type { Clock } from '@lg/domain';
import { and, eq, isNull } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import { Secret, TOTP } from 'otpauth';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { REDIS_TOKEN } from '../../common/redis/redis.tokens.js';
import { EnvService } from '../../config/env.service.js';
import { SecretBox, sha256 } from './crypto.js';

const ISSUER = 'Legendary Group';
const PERIOD = 30;
const BACKUP_CODES = 10;
const BACKUP_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // o'xshash belgilarsiz (0/o, 1/l/i)
/** Sozlash paytida tasdiqlanmagan sir (10 daq). */
const PENDING_TTL_S = 600;

const lastCounterKey = (userId: string) => `auth:totp:last:${userId}`;
const pendingKey = (userId: string) => `auth:totp:pending:${userId}`;

/** RFC 6238 TOTP (SHA1, 6 raqam, 30 s, ±1 oyna) + qayta ishlatishdan himoya + zaxira kodlar. */
@Injectable()
export class TotpService {
  private readonly box: SecretBox;

  constructor(
    @Inject(EnvService) env: EnvService,
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {
    this.box = new SecretBox(env.get('TOTP_ENCRYPTION_KEY'));
  }

  /** Yangi sir (Redis'da kutilmoqda) — QR uchun `otpauth://` URL. */
  async beginSetup(userId: string, label: string): Promise<{ otpauthUrl: string; secret: string }> {
    const secret = new Secret({ size: 20 }).base32;
    await this.redis.set(pendingKey(userId), this.box.seal(secret), 'EX', PENDING_TTL_S);
    const totp = new TOTP({ issuer: ISSUER, label, secret, period: PERIOD });
    return { otpauthUrl: totp.toString(), secret };
  }

  /** Kutilayotgan sirni kod bilan tasdiqlaydi; muvaffaqiyatli bo'lsa — shifrlangan sir (DB uchun). */
  async confirmSetup(userId: string, code: string): Promise<string | null> {
    const sealed = await this.redis.get(pendingKey(userId));
    if (!sealed) return null;
    if (!(await this.check(userId, this.box.open(sealed), code))) return null;
    await this.redis.del(pendingKey(userId));
    return sealed;
  }

  /** Saqlangan (shifrlangan) sir bo'yicha kodni tekshiradi. */
  verify(userId: string, sealedSecret: string, code: string): Promise<boolean> {
    return this.check(userId, this.box.open(sealedSecret), code);
  }

  private async check(userId: string, secret: string, token: string): Promise<boolean> {
    const last = Number((await this.redis.get(lastCounterKey(userId))) ?? '-1');
    const delta = TOTP.validate({
      token,
      secret: Secret.fromBase32(secret),
      period: PERIOD,
      window: 1,
      timestamp: this.clock.now().getTime(),
      afterCounter: last >= 0 ? last : undefined,
    });
    if (delta === null) return false;
    const counter = TOTP.counter({ period: PERIOD, timestamp: this.clock.now().getTime() }) + delta;
    // Bitta kod ikki marta ishlamaydi (o'g'irlangan kodni qayta yuborish).
    await this.redis.set(lastCounterKey(userId), String(counter), 'EX', PERIOD * 4);
    return true;
  }

  /** 10 ta yangi zaxira kod (eskilari o'chadi). Ochiq ko'rinishi faqat shu javobda. */
  async regenerateBackupCodes(
    userId: string,
    tx: Database | Transaction = this.db,
  ): Promise<string[]> {
    const codes = Array.from({ length: BACKUP_CODES }, () => {
      const pick = () => BACKUP_ALPHABET[randomInt(BACKUP_ALPHABET.length)];
      const part = () => Array.from({ length: 4 }, pick).join('');
      return `${part()}-${part()}`;
    });
    await tx.delete(userBackupCodes).where(eq(userBackupCodes.userId, userId));
    await tx.insert(userBackupCodes).values(codes.map((c) => ({ userId, codeHash: sha256(c) })));
    return codes;
  }

  /** Zaxira kod — bir marta. Atomar: parallel ikki so'rovdan faqat bittasi o'tadi. */
  async consumeBackupCode(userId: string, code: string): Promise<boolean> {
    const used = await this.db
      .update(userBackupCodes)
      .set({ usedAt: this.clock.now() })
      .where(
        and(
          eq(userBackupCodes.userId, userId),
          eq(userBackupCodes.codeHash, sha256(code.toLowerCase())),
          isNull(userBackupCodes.usedAt),
        ),
      )
      .returning({ userId: userBackupCodes.userId });
    return used.length > 0;
  }
}
