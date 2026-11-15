import type { Course } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, Card, CardTitle } from '@lg/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { api } from '../api/client.js';
import { useAuth } from '../auth/auth.js';

/** T-117: bo'sh tizimda (kurs yo'q) Director'ga — birinchi ishga tushirish ustasi. */
export function SetupBanner() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  const director = permissions.has('settings.manage');
  const courses = useQuery({
    queryKey: ['org', 'courses', 'active'],
    queryFn: () => api.request<Course[]>('/courses?status=active'),
    enabled: director,
  });
  if (!director || courses.data?.length !== 0) return null;
  return (
    <Card className="max-w-3xl">
      <CardTitle>{t.wizard.banner}</CardTitle>
      <p className="mt-2 text-sm text-text-muted">{t.wizard.bannerHint}</p>
      <Button className="mt-3" onClick={() => void navigate({ to: '/wizard' })}>
        {t.wizard.bannerAction}
      </Button>
    </Card>
  );
}
