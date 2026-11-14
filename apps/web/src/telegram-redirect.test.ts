import { describe, expect, it } from 'vitest';
import { miniAppRedirect } from './telegram-redirect.js';

describe('miniAppRedirect (T-007: Telegram ichida web panel ochilsa)', () => {
  it('tgWebAppData bor — /app/ ga, parametrlar saqlanadi', () => {
    const hash = '#tgWebAppData=query_id%3D1&tgWebAppVersion=8.0';
    expect(miniAppRedirect({ pathname: '/', search: '?startapp=x', hash })).toBe(
      `/app/?startapp=x${hash}`,
    );
  });
  it('oddiy brauzer — yo‘naltirilmaydi', () => {
    expect(miniAppRedirect({ pathname: '/', search: '', hash: '' })).toBeNull();
    expect(miniAppRedirect({ pathname: '/login', search: '', hash: '#x=1' })).toBeNull();
  });
  it('allaqachon /app/ — sikl yo‘q', () => {
    expect(miniAppRedirect({ pathname: '/app/', search: '', hash: '#tgWebAppData=a' })).toBeNull();
  });
});
