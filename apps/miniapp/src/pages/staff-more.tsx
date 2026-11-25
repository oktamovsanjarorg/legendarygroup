import { useNavigate } from '@tanstack/react-router';
import { staffMenuFor } from '../data/staff-menu.js';
import { useStaffKpi } from '../data/staff.js';
import { StaffMoreView } from '../screens/staff/more.js';
import { useMe } from '../session/session.js';
import { tabsFor } from '../tabs.js';

/** MS-06 Koʻproq (T-130): tabda yoʻq xodim ekranlari . */
export function StaffMorePage() {
  const me = useMe();
  const navigate = useNavigate();
  const kpi = useStaffKpi(me.activeRole === 'director');
  const groups = staffMenuFor(
    me.permissions,
    tabsFor(me.activeRole, me.permissions).map((tab) => tab.to),
  );
  return (
    <StaffMoreView
      groups={groups}
      counts={{ queue: kpi.data?.queue, approvals: kpi.data?.approvals }}
      onOpen={(item) => void navigate({ to: item.to })}
    />
  );
}
