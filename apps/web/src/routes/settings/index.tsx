import type { SystemSettings } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { ErrorState, ForbiddenState, LoadingState } from '@lg/ui-web';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { api } from '../../api/client.js';
import { errorText, errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { todayYmd } from '../../lib/today.js';
import {
  type CenterSettings,
  type SettingsSection,
  SettingsView,
} from '../../screens/f1/settings.js';
import { HolidaysSection } from './holidays.js';
import { toForm, toPatch } from './settings-map.js';

function SettingsForm({ cur }: { cur: SystemSettings }) {
  const qc = useQueryClient();
  const [section, setSection] = useState<SettingsSection>('center');
  const [form, setForm] = useState<CenterSettings>(() => toForm(cur));
  const save = useMutation({
    mutationFn: (body: unknown) =>
      api.request<SystemSettings>('/settings', { method: 'PATCH', body }),
    onSuccess: (next) => qc.setQueryData(['settings'], next),
  });
  const message = save.isError
    ? { text: errorText(save.error), error: true }
    : save.isSuccess
      ? { text: t.settings.saved, error: false }
      : undefined;
  return (
    <SettingsView
      section={section}
      s={form}
      onSection={(x) => {
        setSection(x);
        save.reset();
      }}
      onChange={(p) => setForm((f) => ({ ...f, ...p }))}
      onSave={() => {
        const body = toPatch(section, form, cur, () => crypto.randomUUID());
        if (body) save.mutate(body);
      }}
      saving={save.isPending}
      message={message}
      holidays={<HolidaysSection year={Number(todayYmd().slice(0, 4))} />}
    />
  );
}

function SettingsScreen() {
  const q = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.request<SystemSettings>('/settings'),
  });
  if (q.isPending) return <LoadingState rows={5} />;
  if (q.isError) return <ErrorState {...errorView(q.error, () => void q.refetch())} />;
  return <SettingsForm cur={q.data} />;
}

/** W-29 Sozlamalar (T-115, FR-SYS-1): `settings.manage`. */
export function SettingsPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('settings.manage'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <SettingsScreen />;
}
