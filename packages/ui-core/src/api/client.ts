import { errorMessages, isErrorCode } from '@lg/i18n';

/** API xatosi — server formati `{ code, message, details, requestId }` (07 §2). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export interface RequestInit {
  method?: string;
  body?: unknown;
  /** `false` — 401'da tokenni yangilamaydi (masalan, kirishning o'zi). */
  retry?: boolean;
}

/** Tokensiz xom so'rov (yangilash strategiyasi uchun). */
export type RawSend = (
  path: string,
  init: { method?: string; body?: unknown },
) => Promise<Response>;

/**
 * Yangi access token olish strategiyasi: web — httpOnly refresh cookie (ADR 0006),
 * Mini App — `initData`ni qayta almashtirish (T-007). Olinmasa — `null`.
 */
export type Renew = (send: RawSend) => Promise<string | null>;

type Fetch = typeof fetch;

/**
 * API klient. Access token — faqat xotirada (XSS'da localStorage'dan o'g'irlanmasin).
 * 401 → **bitta** yangilash (single-flight, ADR 0006: parallel ikki refresh server tomonida
 * o'g'irlik deb baholanadi va barcha sessiyalar bekor bo'ladi), so'ng so'rov bir marta qaytariladi.
 */
export class ApiClient {
  private accessToken: string | null = null;
  private renewing: Promise<boolean> | null = null;
  onSessionEnd: () => void = () => undefined;

  constructor(
    private readonly renew: Renew,
    private readonly base = '/api',
    private readonly fetchFn: Fetch = (...a) => fetch(...a),
  ) {}

  setToken(token: string | null): void {
    this.accessToken = token;
  }

  get hasToken(): boolean {
    return this.accessToken !== null;
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await this.send(path, init, true);
    if (res.status === 401 && init.retry !== false) {
      if (await this.refresh()) return this.request<T>(path, { ...init, retry: false });
      this.onSessionEnd();
    }
    return this.parse<T>(res);
  }

  /** Strategiya orqali yangi token (parallel chaqiruvlar — bitta so'rov). */
  refresh(): Promise<boolean> {
    this.renewing ??= this.renew((p, i) => this.send(p, i, false))
      .then((token) => {
        this.accessToken = token;
        return token !== null;
      })
      .catch(() => {
        this.accessToken = null;
        return false;
      })
      .finally(() => {
        this.renewing = null;
      });
    return this.renewing;
  }

  private send(
    path: string,
    init: { method?: string; body?: unknown },
    withToken: boolean,
  ): Promise<Response> {
    const headers: Record<string, string> = {};
    if (init.body !== undefined) headers['content-type'] = 'application/json';
    if (withToken && this.accessToken) headers['authorization'] = `Bearer ${this.accessToken}`;
    return this.fetchFn(`${this.base}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: 'same-origin',
    });
  }

  private async parse<T>(res: Response): Promise<T> {
    if (res.status === 204) return undefined as T;
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (res.ok) return body as T;
    const code = typeof body?.['code'] === 'string' ? body['code'] : 'HTTP_ERROR';
    const message =
      typeof body?.['message'] === 'string'
        ? body['message']
        : isErrorCode(code)
          ? errorMessages[code]
          : errorMessages.HTTP_ERROR;
    throw new ApiError(
      res.status,
      code,
      message,
      body?.['requestId'] as string | undefined,
      body?.['details'],
    );
  }
}

/** `ApiError` bo'lsa — server matni, aks holda umumiy matn. */
export const errorText = (e: unknown): string =>
  e instanceof ApiError ? e.message : errorMessages.HTTP_ERROR;
