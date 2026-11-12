import type { AuthUser, RoleCode, TelegramAuthResult } from '@lg/contracts';
import { ApiError } from '@lg/ui-core';
import { describe, expect, it, vi } from 'vitest';
import type { RoleStore } from './role-store.js';
import { signIn } from './sign-in.js';

const user = (roles: RoleCode[], activeRole: RoleCode): AuthUser => ({
  id: 'u1',
  fullName: 'Ali Valiyev',
  phone: '+998901112233',
  roles,
  activeRole,
});

/** Server kabi: rolsiz — bitta rol bo'lsa done, ko'p bo'lsa choose_role. */
function server(roles: RoleCode[]) {
  return vi.fn(async (role: RoleCode | undefined): Promise<TelegramAuthResult> => {
    if (role && !roles.includes(role)) throw new ApiError(403, 'ROLE_NOT_ASSIGNED', '');
    const active = role ?? (roles.length === 1 ? roles[0] : undefined);
    if (!active) return { next: 'choose_role', roles };
    return { next: 'done', accessToken: `t-${active}`, user: user(roles, active) };
  });
}

function memoryStore(initial?: RoleCode): RoleStore & { value?: RoleCode } {
  const s: RoleStore & { value?: RoleCode } = {
    value: initial,
    get: async () => s.value,
    set: async (r) => void (s.value = r),
    clear: async () => void (s.value = undefined),
  };
  return s;
}

describe('signIn (C-01/C-02, FR-AUTH-5)', () => {
  it('bir nechta rol, eslanmagan — tanlov ekrani', async () => {
    const r = await signIn(server(['teacher', 'guardian']), memoryStore(), null);
    expect(r).toEqual({ next: 'choose_role', roles: ['teacher', 'guardian'] });
  });

  it('eslab qolingan rol bilan darhol kiradi', async () => {
    const ex = server(['teacher', 'guardian']);
    const r = await signIn(ex, memoryStore('guardian'), null);
    expect(r.next === 'done' && r.user.activeRole).toBe('guardian');
    expect(ex).toHaveBeenCalledTimes(1);
  });

  it('eslangan rol olib tashlangan — unutiladi, rolsiz qayta', async () => {
    const store = memoryStore('admin');
    const r = await signIn(server(['teacher']), store, null);
    expect(r.next === 'done' && r.user.activeRole).toBe('teacher');
    expect(store.value).toBe('teacher');
  });

  it("deep link Ustoz uchun, eslangan rol Ota-ona — Ustozga o'tadi va eslaydi", async () => {
    const store = memoryStore('guardian');
    const link = { screen: 'MT-02', roles: ['teacher'] as const };
    const r = await signIn(server(['teacher', 'guardian']), store, link);
    expect(r.next === 'done' && r.user.activeRole).toBe('teacher');
    expect(store.value).toBe('teacher');
  });

  it('deep link + tanlanmagan bir nechta rol — tanlov ekranisiz', async () => {
    const link = { screen: 'MG-01', roles: ['guardian'] as const };
    const r = await signIn(server(['teacher', 'guardian']), memoryStore(), link);
    expect(r.next === 'done' && r.user.activeRole).toBe('guardian');
  });

  it("bog'lanmagan akkaunt — xato chaqiruvchiga", async () => {
    const ex = vi.fn(async () => {
      throw new ApiError(401, 'TELEGRAM_NOT_LINKED', '');
    });
    await expect(signIn(ex, memoryStore('teacher'), null)).rejects.toMatchObject({
      code: 'TELEGRAM_NOT_LINKED',
    });
  });
});
