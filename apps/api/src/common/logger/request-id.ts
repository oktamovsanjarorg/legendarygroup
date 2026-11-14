import type { IncomingHttpHeaders } from 'node:http';
import { uuidv7 } from 'uuidv7';

export const REQUEST_ID_HEADER = 'x-request-id';

/** Mijoz bergan ID faqat xavfsiz formatda qabul qilinadi (log injection'dan himoya). */
const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * Fastify `genReqId` — `request.id`ning yagona manbai (logger, xato filtri, audit).
 */
export function genRequestId(req: { headers: IncomingHttpHeaders }): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  return typeof incoming === 'string' && SAFE_ID.test(incoming) ? incoming : uuidv7();
}
