import type { Permission, StaffDetail } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { ListItem, Section, StatusChip } from '@lg/ui-tg';
import { type PermissionRow, permissionRows } from '../../data/staff-people.js';
import { Screen } from './form-kit.js';

const c = t.staffPeople;
/** Kalitlar to'liqligi shu yerda tekshiriladi: yangi ruxsat nomsiz qolsa — typecheck yiqiladi. */
const LABELS: Record<Permission, string> = t.permissions;

const chip = (r: PermissionRow) => {
  if (r.effective === r.inRole)
    return (
      <StatusChip tone={r.effective ? 'success' : 'muted'}>{r.effective ? c.on : c.off}</StatusChip>
    );
  return (
    <StatusChip tone={r.effective ? 'info' : 'warning'}>
      {r.effective ? c.granted : c.restricted}
    </StatusChip>
  );
};

/** MS-31b Ruxsatlar (02 §4): bosilsa — cheklanadi/beriladi, yana bosilsa — standartga qaytadi. */
export function PermissionsView(p: {
  person: StaffDetail;
  busy: boolean;
  onToggle: (r: PermissionRow) => void;
}) {
  const rows = permissionRows(p.person);
  const section = (title: string, list: PermissionRow[]) =>
    list.length > 0 && (
      <Section title={title}>
        {list.map((r) => (
          <ListItem
            key={r.permission}
            title={LABELS[r.permission]}
            after={chip(r)}
            disabled={p.busy}
            onClick={() => p.onToggle(r)}
          />
        ))}
      </Section>
    );
  return (
    <Screen title={c.permissions} subtitle={`${p.person.fullName} · ${c.permissionsHint}`}>
      {section(
        c.extra,
        rows.filter((r) => !r.inRole),
      )}
      {section(
        c.byRole,
        rows.filter((r) => r.inRole),
      )}
    </Screen>
  );
}
