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

interface RefreshResult {
  accessToken: string;
}

type Fetch = typeof fetch;

/**
 * API klient. Access token — faqat xotirada (XSS'da localStorage'dan o'g'irlanmasin);
 * refresh — httpOnly cookie. 401 → **bitta** refresh (single-flight, ADR 0006: parallel
 * ikki refresh server tomonida o'g'irlik deb baholanadi va barcha sessiyalar bekor bo'ladi).
 */
export class ApiClient {
  private accessToken: string | null = null;
  private refreshing: Promise<boolean> | null = null;
  onSessionEnd: () => void = () => undefined;

  constructor(
    private readonly base = '/api',
    private readonly fetchFn: Fetch = (...a) => fetch(...a),
  ) {}

  setToken(token: string | null): void {
    this.accessToken = token;
  }

  get hasToken(): boolean {
    return this.accessToken !== null;
  }

  async request<T>(
    path: string,
    init: { method?: string; body?: unknown; retry?: boolean } = {},
  ): Promise<T> {
    const res = await this.send(path, init);
    if (res.status === 401 && init.retry !== false && !path.startsWith('/auth/refresh')) {
      if (await this.refresh()) return this.request<T>(path, { ...init, retry: false });
      this.onSessionEnd();
    }
    return this.parse<T>(res);
  }

  /** Sahifa ochilganda: cookie bo'lsa — sessiyani tiklaydi. */
  restore(): Promise<boolean> {
    return this.refresh();
  }

  refresh(): Promise<boolean> {
    this.refreshing ??= this.send('/auth/refresh', { method: 'POST' })
      .then(async (res) => {
        if (!res.ok) {
          this.accessToken = null;
          return false;
        }
        this.accessToken = ((await res.json()) as RefreshResult).accessToken;
        return true;
      })
      .catch(() => false)
      .finally(() => {
        this.refreshing = null;
      });
    return this.refreshing;
  }

  private send(path: string, init: { method?: string; body?: unknown }): Promise<Response> {
    const headers: Record<string, string> = {};
    if (init.body !== undefined) headers['content-type'] = 'application/json';
    if (this.accessToken) headers['authorization'] = `Bearer ${this.accessToken}`;
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

export const api = new ApiClient();
