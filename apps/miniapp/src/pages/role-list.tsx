import type { RoleCode } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { Check, ChevronRight } from 'lucide-react';

interface Props {
  roles: readonly RoleCode[];
  current?: RoleCode;
  busy?: RoleCode | null;
  onSelect: (role: RoleCode) => void;
}

/** Rollar ro'yxati (C-02, C-04) — Telegram uslubidagi bo'lim, qator ≥ 44 px. */
export function RoleList({ roles, current, busy, onSelect }: Props) {
  return (
    <ul className="overflow-hidden rounded-xl bg-bg">
      {roles.map((role) => (
        <li key={role} className="border-b border-border last:border-0">
          <button
            type="button"
            disabled={busy !== null && busy !== undefined}
            aria-current={role === current ? 'true' : undefined}
            onClick={() => role !== current && onSelect(role)}
            className="flex min-h-12 w-full items-center justify-between px-4 text-left text-base text-text active:bg-surface disabled:opacity-60"
          >
            {t.roles[role]}
            {role === current ? (
              <Check className="size-5 text-primary" aria-label={t.settings.current} />
            ) : (
              <ChevronRight className="size-5 text-text-muted" aria-hidden />
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
