import type { RoleCode } from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import type { AuditContext } from './audit.service.js';

export interface ClientMeta {
  ip: string | null;
  device: string | null;
}

type WithUser = FastifyRequest & { user?: { id: string; role: RoleCode } };

export const clientMeta = (req: FastifyRequest): ClientMeta => ({
  ip: req.ip ?? null,
  device: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
});

/** So'rovdan audit konteksti: actor (guard to'ldirgan), faol rol, IP, qurilma, requestId. */
export const auditContext = (req: FastifyRequest): AuditContext => {
  const user = (req as WithUser).user;
  return {
    actorId: user?.id ?? null,
    actorRole: user?.role ?? null,
    ip: req.ip ?? null,
    userAgent: clientMeta(req).device,
    requestId: req.id,
  };
};
