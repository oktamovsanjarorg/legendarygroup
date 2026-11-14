import { Inject, Injectable } from '@nestjs/common';
import type { Permission, RoleCode } from '@lg/contracts';
import { type Database, userPermissionOverrides } from '@lg/db';
import { effectivePermissions } from '@lg/domain';
import { eq } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { REDIS_TOKEN } from '../../common/redis/redis.tokens.js';

const CACHE_TTL_S = 600;
/** Kalitda `pv` bor: ruxsat o'zgarsa versiya oshadi va eski kesh avtomatik ishlatilmaydi (02 §1). */
const cacheKey = (userId: string, role: RoleCode, pv: number) => `perm:${userId}:${role}:${pv}`;

/** Faol rol + override'lar → samarali ruxsatlar (Redis kesh, `permissions_version` bo'yicha). */
@Injectable()
export class PermissionsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
  ) {}

  async forUser(userId: string, role: RoleCode, pv: number): Promise<Set<Permission>> {
    const key = cacheKey(userId, role, pv);
    const cached = await this.redis.get(key);
    if (cached) return new Set(JSON.parse(cached) as Permission[]);
    const overrides = await this.db
      .select({
        permission: userPermissionOverrides.permissionCode,
        granted: userPermissionOverrides.granted,
      })
      .from(userPermissionOverrides)
      .where(eq(userPermissionOverrides.userId, userId));
    const perms = effectivePermissions(
      role,
      overrides.map((o) => ({ permission: o.permission as Permission, granted: o.granted })),
    );
    await this.redis.set(key, JSON.stringify([...perms]), 'EX', CACHE_TTL_S);
    return perms;
  }
}
