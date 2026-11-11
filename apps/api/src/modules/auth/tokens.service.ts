import { Inject, Injectable } from '@nestjs/common';
import type { RoleCode } from '@lg/contracts';
import type { Clock } from '@lg/domain';
import { errors, jwtVerify, SignJWT } from 'jose';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { EnvService } from '../../config/env.service.js';

export const ACCESS_TTL_S = 15 * 60; // FR-AUTH-4
export const MFA_TTL_S = 5 * 60;
const ISSUER = 'lg-api';

/** Access token: foydalanuvchi, faol rol, sessiya va ruxsatlar versiyasi. */
export interface AccessClaims {
  sub: string;
  role: RoleCode;
  /** Web sessiyasi; Mini App tokenida `null` (sessiyasiz, initData bilan qayta olinadi). */
  sid: string | null;
  /** `users.permissions_version` — o'zgarsa token darhol yaroqsiz (02 §1). */
  pv: number;
}

export interface MfaClaims {
  sub: string;
  step: 'totp' | 'totp_setup';
}

/** HS256 JWT (`jose`). Vaqt — `Clock`dan (testda muzlatiladi). */
@Injectable()
export class TokensService {
  private readonly key: Uint8Array;

  constructor(
    @Inject(EnvService) env: EnvService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {
    this.key = new TextEncoder().encode(env.get('JWT_ACCESS_SECRET'));
  }

  signAccess(claims: AccessClaims & { sid: string }): Promise<string> {
    return this.sign(
      { role: claims.role, sid: claims.sid, pv: claims.pv, typ: 'access' },
      claims.sub,
      ACCESS_TTL_S,
    );
  }

  /** Mini App (T-007): sessiyasiz access token, 15 daq. */
  signMiniApp(claims: { sub: string; role: RoleCode; pv: number }): Promise<string> {
    return this.sign({ role: claims.role, pv: claims.pv, typ: 'tg' }, claims.sub, ACCESS_TTL_S);
  }

  async verifyAccess(token: string): Promise<AccessClaims | null> {
    const p = (await this.verify(token, 'access')) ?? (await this.verify(token, 'tg'));
    if (!p || typeof p['pv'] !== 'number' || typeof p['role'] !== 'string') return null;
    const sid = p['typ'] === 'access' && typeof p['sid'] === 'string' ? p['sid'] : null;
    if (p['typ'] === 'access' && !sid) return null;
    return { sub: String(p.sub), role: p['role'] as RoleCode, sid, pv: p['pv'] };
  }

  signMfa(claims: MfaClaims): Promise<string> {
    return this.sign({ step: claims.step, typ: 'mfa' }, claims.sub, MFA_TTL_S);
  }

  async verifyMfa(token: string): Promise<MfaClaims | null> {
    const p = await this.verify(token, 'mfa');
    const step = p?.['step'];
    return p && (step === 'totp' || step === 'totp_setup') ? { sub: String(p.sub), step } : null;
  }

  private sign(payload: Record<string, unknown>, sub: string, ttl: number): Promise<string> {
    const now = Math.floor(this.clock.now().getTime() / 1000);
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(sub)
      .setIssuer(ISSUER)
      .setIssuedAt(now)
      .setExpirationTime(now + ttl)
      .sign(this.key);
  }

  private async verify(token: string, typ: string) {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        issuer: ISSUER,
        algorithms: ['HS256'],
        currentDate: this.clock.now(),
      });
      return payload['typ'] === typ ? payload : null;
    } catch (err) {
      if (err instanceof errors.JOSEError) return null;
      throw err;
    }
  }
}
