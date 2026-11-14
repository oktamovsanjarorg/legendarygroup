import {
  DELEGABLE_PERMISSIONS,
  type Permission,
  ROLE_PERMISSIONS,
  type StaffDetail,
} from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Badge } from '@lg/ui-web';

const d = t.staff.detail;
/** Kalitlar to'liqligi shu yerda tekshiriladi: yangi ruxsat nomsiz qolsa — typecheck yiqiladi. */
export const PERMISSION_LABELS: Record<Permission, string> = t.permissions;

export interface PermissionRow {
  permission: Permission;
  /** Rol standartida bor (aks holda — delegatsiya qilinadigan, 02 §4 "D"). */
  inRole: boolean;
  /** Hozir amalda. */
  effective: boolean;
}

/** 02 §4 override qoidasi: rol ruxsatlari (cheklash mumkin) + Admin uchun delegatsiya qilinadiganlar. */
export function permissionRows(s: Pick<StaffDetail, 'roles' | 'overrides'>): PermissionRow[] {
  const override = new Map(s.overrides.map((o) => [o.permission, o.granted]));
  const inRole = new Set(s.roles.flatMap((r) => ROLE_PERMISSIONS[r]));
  const rows: PermissionRow[] = [...inRole].map((permission) => ({
    permission,
    inRole: true,
    effective: override.get(permission) !== false,
  }));
  if (!s.roles.includes('admin')) return rows;
  const extra = DELEGABLE_PERMISSIONS.filter((p) => !inRole.has(p));
  return [
    ...rows,
    ...extra.map((permission) => ({
      permission,
      inRole: false,
      effective: override.get(permission) === true,
    })),
  ];
}

/** Belgi o'zgarganda yuboriladigan qiymat: standartga qaytsa — `null` (override o'chadi). */
export const nextOverride = (row: PermissionRow, checked: boolean): boolean | null =>
  checked === row.inRole ? null : checked;

interface Props {
  staff: Pick<StaffDetail, 'roles' | 'overrides'>;
  /** `staff.permissions` yo'q — faqat ko'rish. */
  readOnly: boolean;
  busy: boolean;
  onChange: (permission: Permission, granted: boolean | null) => void;
}

function Row({ row, readOnly, busy, onChange }: Omit<Props, 'staff'> & { row: PermissionRow }) {
  const changed = row.effective !== row.inRole;
  return (
    <li>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 py-1 text-sm text-text">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={row.effective}
          disabled={readOnly || busy}
          onChange={(e) => onChange(row.permission, nextOverride(row, e.target.checked))}
        />
        <span className="flex-1">{PERMISSION_LABELS[row.permission]}</span>
        {changed && (
          <Badge tone={row.inRole ? 'warning' : 'info'}>
            {row.inRole ? d.restricted : d.granted}
          </Badge>
        )}
      </label>
    </li>
  );
}

/** W-28: ruxsat override (02 §4) — belgi = ruxsat amalda. */
export function PermissionsSection({ staff, ...rest }: Props) {
  const rows = permissionRows(staff);
  const base = rows.filter((r) => r.inRole);
  const extra = rows.filter((r) => !r.inRole);
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-text">{d.permissions}</h3>
      {!rest.readOnly && <p className="text-xs text-text-muted">{d.permissionsHint}</p>}
      <ul className="divide-y divide-border">
        {base.map((r) => (
          <Row key={r.permission} row={r} {...rest} />
        ))}
      </ul>
      {extra.length > 0 && (
        <>
          <h4 className="mt-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            {d.delegable}
          </h4>
          <ul className="divide-y divide-border">
            {extra.map((r) => (
              <Row key={r.permission} row={r} {...rest} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
