import { useNavigate } from '@tanstack/react-router';
import { staffMenuFor } from '../data/staff-menu.js';
import { useStaffKpi } from '../data/staff.js';
import { StaffMoreView } from '../screens/staff/more.js';
import { useMe } from '../session/session.js';
import { tabsFor } from '../tabs.js';
import { useOpenPanel } from './staff.js';

/** MS-06 Koʻproq (T-130): tabda yoʻq xodim ekranlari + boshqaruv paneli (T-121, MainButton). */
export function StaffMorePage() {
  const me = useMe();
  const navigate = useNavigate();
  const kpi = useStaffKpi(me.activeRole === 'director');
  useOpenPanel();
  const groups = staffMenuFor(
    me.permissions,
    tabsFor(me.activeRole).map((tab) => tab.to),
  );
  return (
    <StaffMoreView
      groups={groups}
      counts={{ queue: kpi.data?.queue, approvals: kpi.data?.approvals }}
      onOpen={(item) => void navigate({ to: item.to })}
    />
  );
}
