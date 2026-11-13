import type { StaffListItem } from '@lg/contracts';
import { ForbiddenState } from '@lg/ui-web';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from '../../auth/auth.js';
import { type StaffRow, StaffView } from '../../screens/f1/staff.js';
import { DetailDrawer } from './detail-drawer.js';
import { InviteDrawer } from './invite-drawer.js';
import { errorView, useStaffList } from './use-staff.js';

const toRow = (s: StaffListItem): StaffRow => ({
  id: s.id,
  name: s.fullName,
  phone: s.phone,
  roles: s.roles,
  status: s.status,
  lastLogin: s.lastLoginAt ? new Date(s.lastLoginAt) : undefined,
  overrides: s.overridesCount,
});

type Panel = { kind: 'invite' } | { kind: 'detail'; id: string; name: string } | null;

function StaffList({ canPermissions }: { canPermissions: boolean }) {
  const list = useStaffList();
  const [panel, setPanel] = useState<Panel>(null);
  const close = () => setPanel(null);
  return (
    <>
      <StaffView
        rows={(list.data ?? []).map(toRow)}
        loading={list.isPending}
        error={list.isError ? errorView(list.error, () => void list.refetch()) : undefined}
        onInvite={() => setPanel({ kind: 'invite' })}
        onOpen={(s) => setPanel({ kind: 'detail', id: s.id, name: s.name })}
      />
      {panel?.kind === 'invite' && <InviteDrawer onClose={close} />}
      {panel?.kind === 'detail' && (
        <DetailDrawer
          key={panel.id}
          id={panel.id}
          name={panel.name}
          canPermissions={canPermissions}
          onClose={close}
        />
      )}
    </>
  );
}

/** W-28 Xodimlar (T-101): `staff.manage`; override — `staff.permissions` (02 §4). */
export function StaffPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('staff.manage'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <StaffList canPermissions={permissions.has('staff.permissions')} />;
}
