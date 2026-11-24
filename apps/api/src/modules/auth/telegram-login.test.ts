import type { Redis } from 'ioredis';
import { describe, expect, it, vi } from 'vitest';
import type { AuditContext } from '../../common/audit/audit.service.js';
import type { RateLimiter } from '../../common/rate-limit/rate-limiter.js';
import type { AuthService } from './auth.service.js';
import type { StaffUsers } from './staff-users.js';
import type { TelegramChallenges } from './telegram-challenges.js';
import { TelegramLoginService } from './telegram-login.service.js';

const CTX: AuditContext = {
  actorId: null,
  actorRole: null,
  ip: null,
  userAgent: null,
  requestId: null,
};
const META = { ip: null, device: 'test' };

/** `getdel` javoblari ketma-ket; `pending` kaliti allaqachon o'chgan. */
function service(getdel: (string | null)[]) {
  const redis = {
    getdel: vi.fn(async () => getdel.shift() ?? null),
    exists: vi.fn(async () => 0),
  };
  const issue = vi.fn(async () => ({ accessToken: 'acc' }));
  const s = new TelegramLoginService(
    redis as unknown as Redis,
    { byId: async (id: string) => ({ id, status: 'active' }) } as unknown as StaffUsers,
    {} as TelegramChallenges,
    { issue } as unknown as AuthService,
    {} as RateLimiter,
  );
  return { s, issue };
}

describe('Telegram kirish: poll (Q-98)', () => {
  it('REGRESSIYA: tasdiq getdel va exists orasida kelsa — sessiya beriladi, 401 emas', async () => {
    const { s, issue } = service([null, 'u1']);
    await expect(s.poll('c1', META, CTX)).resolves.toEqual({ accessToken: 'acc' });
    expect(issue).toHaveBeenCalledTimes(1);
  });

  it('haqiqatan muddati oʻtgan — INVALID_MFA_TOKEN', async () => {
    const { s } = service([null, null]);
    await expect(s.poll('c1', META, CTX)).rejects.toMatchObject({ status: 401 });
  });
});
