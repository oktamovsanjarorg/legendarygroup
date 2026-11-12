import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from './client.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('ApiClient (ADR 0006: single-flight refresh)', () => {
  it("parallel 401'lar — BITTA refresh, keyin so'rovlar yangi token bilan qaytariladi", async () => {
    let refreshes = 0;
    const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/auth/refresh')) {
        refreshes += 1;
        await new Promise((r) => setTimeout(r, 20));
        return json(200, { accessToken: 'new' });
      }
      const auth = (init?.headers as Record<string, string>)['authorization'];
      return auth === 'Bearer new' ? json(200, { ok: u }) : json(401, { code: 'UNAUTHORIZED' });
    });
    const client = new ApiClient('/api', fetchFn as typeof fetch);
    client.setToken('old');
    const results = await Promise.all([
      client.request('/a'),
      client.request('/b'),
      client.request('/c'),
    ]);
    expect(refreshes).toBe(1);
    expect(results).toHaveLength(3);
  });

  it('refresh muvaffaqiyatsiz — sessiya tugadi, xato i18n matni bilan', async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request) =>
      String(url).endsWith('/auth/refresh')
        ? json(401, { code: 'SESSION_EXPIRED', message: 'Sessiya tugadi.' })
        : json(401, { code: 'UNAUTHORIZED', message: 'Tizimga qayta kiring.', requestId: 'r1' }),
    );
    const client = new ApiClient('/api', fetchFn as typeof fetch);
    const ended = vi.fn();
    client.onSessionEnd = ended;
    await expect(client.request('/x')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      requestId: 'r1',
    });
    expect(ended).toHaveBeenCalledOnce();
  });

  it('server xatosi ApiError: kod, matn, tafsilot', async () => {
    const client = new ApiClient('/api', (async () =>
      json(422, {
        code: 'FILE_TOO_LARGE',
        message: 'Fayl juda katta.',
        details: { max: 1 },
      })) as typeof fetch);
    const err = await client.request('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 422, code: 'FILE_TOO_LARGE', details: { max: 1 } });
  });
});
