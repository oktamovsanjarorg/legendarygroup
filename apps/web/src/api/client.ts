import { ApiClient, type Renew } from '@lg/ui-core';

export { ApiError } from '@lg/ui-core';

/** Web: httpOnly refresh cookie (`Path=/api/auth`, ADR 0006) orqali yangilash. */
export const cookieRefresh: Renew = async (send) => {
  const res = await send('/auth/refresh', { method: 'POST' });
  if (!res.ok) return null;
  return ((await res.json()) as { accessToken: string }).accessToken;
};

export const api = new ApiClient(cookieRefresh);
