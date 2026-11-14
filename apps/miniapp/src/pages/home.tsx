import { miniappMessages as t } from '@lg/i18n';
import { useMe } from '../session/session.js';
import { GuardianHomePage, StaffDashboardPage, TeacherTodayPage } from './tab-pages.js';

/** Bosh sahifa: rolga mos boshlang'ich ekran va salomlashish (T-114, T-116, T-120). */
export function HomePage() {
  const me = useMe();
  return (
    <div className="flex flex-col">
      <div className="sr-only">
        <h1>{t.home.greeting.replace('{name}', me.fullName)}</h1>
        <p>{t.home.intro}</p>
      </div>
      {me.activeRole === 'teacher' && <TeacherTodayPage />}
      {me.activeRole === 'guardian' && <GuardianHomePage />}
      {(me.activeRole === 'admin' || me.activeRole === 'director') && <StaffDashboardPage />}
    </div>
  );
}
