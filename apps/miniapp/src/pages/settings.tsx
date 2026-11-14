import type { RoleCode } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { errorText } from '@lg/ui-core';
import { useHaptic } from '@lg/ui-tg';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useMe, useSession } from '../session/session.js';
import { RoleList } from './role-list.js';

/** C-04: sozlamalar — rol almashtirish (FR-AUTH-5). Bildirishnomalar bo'limi — T-109. */
export function SettingsPage() {
  const me = useMe();
  const { selectRole } = useSession();
  const h = useHaptic();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<RoleCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const change = async (role: RoleCode) => {
    h.selection();
    setBusy(role);
    setError(null);
    try {
      await selectRole(role);
      h.success();
      await navigate({ to: '/' });
    } catch (e) {
      h.error();
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <main className="flex flex-col gap-2 p-4">
      <h1 className="px-1 pb-2 text-xl font-semibold text-text">{t.settings.title}</h1>
      <h2 className="px-1 text-sm uppercase text-text-muted">{t.settings.role}</h2>
      <RoleList
        roles={me.roles}
        current={me.activeRole}
        busy={busy}
        onSelect={(r) => void change(r)}
      />
      {error && <p className="px-1 text-sm text-danger">{error}</p>}
    </main>
  );
}
