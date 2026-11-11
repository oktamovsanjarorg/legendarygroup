import type { INestApplicationContext } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { RequestMethod } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { AUDIT_KEY, NO_AUDIT_KEY } from '../common/audit/audit.decorator.js';
import { AUTHENTICATED_KEY, PERMISSIONS_KEY } from '../common/decorators/access.decorators.js';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator.js';

const MUTATING = new Set([
  RequestMethod.POST,
  RequestMethod.PUT,
  RequestMethod.PATCH,
  RequestMethod.DELETE,
]);

/**
 * CLAUDE.md "RBAC" va "Audit" qoidalarini metadata bo'yicha tekshiradi:
 * - har endpoint: `@Public` | `@Authenticated` | `@RequirePermission`;
 * - har yozish endpoint'i: `@Audit` | `@NoAudit(sabab)`.
 * Qaytaradi: buzilishlar ro'yxati (`Controller.method: sabab`).
 */
export function findAccessViolations(app: INestApplicationContext): string[] {
  const discovery = app.get(DiscoveryService);
  const scanner = app.get(MetadataScanner);
  const reflector = app.get(Reflector);
  const violations: string[] = [];

  for (const wrapper of discovery.getControllers()) {
    const instance = wrapper.instance as object | undefined;
    if (!instance || !wrapper.metatype) continue;
    const cls = wrapper.metatype as abstract new (...args: never[]) => unknown;
    const proto = Object.getPrototypeOf(instance) as Record<string, unknown>;
    for (const name of scanner.getAllMethodNames(proto)) {
      const handler = proto[name] as (...args: unknown[]) => unknown;
      if (reflector.get<unknown>(PATH_METADATA, handler) === undefined) continue;
      const targets: (typeof handler | typeof cls)[] = [handler, cls];
      const has = (key: string) =>
        reflector.getAllAndOverride<unknown>(key, targets as never[]) !== undefined;
      const where = `${cls.name}.${name}`;
      if (!has(IS_PUBLIC_KEY) && !has(AUTHENTICATED_KEY) && !has(PERMISSIONS_KEY)) {
        violations.push(
          `${where}: kirish dekoratori yo'q (@Public/@Authenticated/@RequirePermission)`,
        );
      }
      const method = reflector.get<RequestMethod>(METHOD_METADATA, handler);
      if (MUTATING.has(method) && !has(AUDIT_KEY) && !has(NO_AUDIT_KEY)) {
        violations.push(`${where}: yozish amali audit'siz (@Audit yoki @NoAudit(sabab))`);
      }
    }
  }
  return violations;
}
