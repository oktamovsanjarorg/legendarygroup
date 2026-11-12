import { describe, expect, it } from 'vitest';
import { cookieRefresh } from './client.js';

describe('cookieRefresh (ADR 0006)', () => {
  it('POST /auth/refresh: 200 — token, aks holda null', async () => {
    const calls: string[] = [];
    const ok = await cookieRefresh(async (path, init) => {
      calls.push(`${init.method} ${path}`);
      return new Response(JSON.stringify({ accessToken: 't1' }), { status: 200 });
    });
    const fail = await cookieRefresh(async () => new Response('{}', { status: 401 }));
    expect(calls).toEqual(['POST /auth/refresh']);
    expect(ok).toBe('t1');
    expect(fail).toBeNull();
  });
});
