import { STAFF_ROLES, type StaffDetail, type StaffInvite } from '@lg/contracts';
import { formatDateShort, formatDateTime, formatPhone, webMessages as t } from '@lg/i18n';
import { Badge, Button, Drawer, ErrorState, LoadingState } from '@lg/ui-web';
import { useState } from 'react';
import { InviteLink } from './invite-link.js';
import { PermissionsSection } from './permissions.js';
import { errorText, errorView } from '../../api/errors.js';
import { type StaffAction, useStaffAction, useStaffDetail } from './use-staff.js';

const d = t.staff.detail;
const TONE = { active: 'success', invited: 'info', blocked: 'danger' } as const;

interface BodyProps {
  s: StaffDetail;
  busy: boolean;
  canPermissions: boolean;
  run: (a: StaffAction) => void;
}

function Summary({ s }: { s: StaffDetail }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-text-muted">{t.staff.cols.phone}</dt>
      <dd className="text-text">{formatPhone(s.phone)}</dd>
      <dt className="text-text-muted">{t.staff.cols.status}</dt>
      <dd>
        <Badge tone={TONE[s.status]}>{t.staff.status[s.status]}</Badge>
        {s.inviteExpiresAt && (
          <span className="ml-2 text-xs text-text-muted">
            {d.inviteUntil.replace('{date}', formatDateTime(new Date(s.inviteExpiresAt)))}
          </span>
        )}
      </dd>
      <dt className="text-text-muted">{d.telegram}</dt>
      <dd className="text-text">{s.telegramLinked ? d.linked : d.notLinked}</dd>
      <dt className="text-text-muted">{t.staff.cols.lastLogin}</dt>
      <dd className="text-text">
        {s.lastLoginAt ? formatDateShort(new Date(s.lastLoginAt)) : '—'}
      </dd>
    </dl>
  );
}

function Roles({ s, busy, run }: Omit<BodyProps, 'canPermissions'>) {
  const missing = STAFF_ROLES.filter((r) => !s.roles.includes(r));
  const remove = (role: StaffDetail['roles'][number]) => {
    const text = d.confirmRemoveRole.replace('{name}', s.fullName).replace('{role}', t.roles[role]);
    if (window.confirm(text)) run({ kind: 'removeRole', role });
  };
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-text">{d.roles}</h3>
      <ul className="flex flex-col gap-1">
        {s.roles.map((r) => (
          <li key={r} className="flex items-center justify-between text-sm text-text">
            {t.roles[r]}
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => remove(r)}>
              {d.removeRole.replace('{role}', t.roles[r])}
            </Button>
          </li>
        ))}
      </ul>
      {s.status !== 'blocked' && (
        <div className="flex flex-wrap gap-2">
          {missing.map((role) => (
            <Button
              key={role}
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => run({ kind: 'addRole', role })}
            >
              {d.addRole.replace('{role}', t.roles[role])}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}

function Access({ s, busy, run }: Omit<BodyProps, 'canPermissions'>) {
  const block = () =>
    window.confirm(d.confirmBlock.replace('{name}', s.fullName)) && run({ kind: 'block' });
  return (
    <div className="flex flex-wrap gap-2">
      {s.status === 'invited' && (
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => run({ kind: 'reinvite' })}
        >
          {d.reinvite}
        </Button>
      )}
      {s.status === 'blocked' ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => run({ kind: 'unblock' })}
        >
          {d.unblock}
        </Button>
      ) : (
        <Button variant="danger" size="sm" disabled={busy} onClick={block}>
          {d.block}
        </Button>
      )}
    </div>
  );
}

interface Props {
  id: string;
  /** Sarlavha — ro'yxatdagi ism (tafsilot yuklanguncha ham ko'rinadi). */
  name: string;
  canPermissions: boolean;
  onClose: () => void;
}

/** W-28 tafsilot: holat, taklif, bloklash, rollar, ruxsat override (02 §4). */
export function DetailDrawer({ id, name, canPermissions, onClose }: Props) {
  const detail = useStaffDetail(id);
  const action = useStaffAction(id);
  const [invite, setInvite] = useState<StaffInvite | null>(null);
  const run = (a: StaffAction) =>
    action.mutate(a, { onSuccess: (issued) => issued && setInvite(issued) });
  const part = { busy: action.isPending, run };
  return (
    <Drawer open title={name} closeLabel={t.common.close} onClose={onClose}>
      {detail.isPending ? (
        <LoadingState rows={5} />
      ) : detail.isError ? (
        <ErrorState {...errorView(detail.error, () => void detail.refetch())} />
      ) : (
        <div className="flex flex-col gap-6">
          <Summary s={detail.data} />
          {action.isError && (
            <p role="alert" className="text-sm text-danger">
              {errorText(action.error)}
            </p>
          )}
          {invite && <InviteLink invite={invite} />}
          <Access s={detail.data} {...part} />
          <Roles s={detail.data} {...part} />
          <PermissionsSection
            staff={detail.data}
            readOnly={!canPermissions}
            busy={action.isPending}
            onChange={(permission, granted) => run({ kind: 'override', permission, granted })}
          />
        </div>
      )}
    </Drawer>
  );
}
