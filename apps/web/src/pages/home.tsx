import { webMessages as t } from '@lg/i18n';
import { Card, CardTitle } from '@lg/ui-web';
import { useAuth } from '../auth/auth.js';

/** W-04 poydevori: KPI'lar T-405 (Director dashboard) da qo'shiladi. */
export function HomePage() {
  const { me } = useAuth();
  return (
    <Card className="max-w-2xl">
      <CardTitle>{t.home.greeting.replace('{name}', me?.fullName ?? '')}</CardTitle>
      <p className="mt-2 text-sm text-text-muted">{t.home.intro}</p>
    </Card>
  );
}
