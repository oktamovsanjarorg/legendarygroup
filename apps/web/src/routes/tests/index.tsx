import type { GroupListItem } from '@lg/contracts';
import { ForbiddenState } from '@lg/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { api } from '../../api/client.js';
import { errorText, errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { todayYmd } from '../../lib/today.js';
import { ImportPreview } from '../../screens/f3/w19-import.js';
import { TestFormDrawer } from '../../screens/f3/w19-test-form.js';
import { TestsView } from '../../screens/f3/w19-tests.js';
import { toImportRows, toResults, toTest } from './map.js';
import { useTestActions, useTestData } from './use-tests.js';

type Act = ReturnType<typeof useTestActions>;

function Panels({
  act,
  accepted,
  setAccepted,
  formOpen,
  setFormOpen,
  setPicked,
}: {
  act: Act;
  accepted: ReadonlySet<string>;
  setAccepted: (f: (s: ReadonlySet<string>) => ReadonlySet<string>) => void;
  formOpen: boolean;
  setFormOpen: (v: boolean) => void;
  setPicked: (id: string) => void;
}) {
  return (
    <>
      {act.preview && (
        <ImportPreview
          rows={toImportRows(act.preview)}
          accepted={accepted}
          onToggle={(k) =>
            setAccepted((s) => {
              const n = new Set(s);
              if (!n.delete(k)) n.add(k);
              return n;
            })
          }
          onConfirm={() => act.confirm.mutate(accepted)}
          onCancel={() => act.setPreview(null)}
          saving={act.confirm.isPending}
        />
      )}
      {formOpen && (
        <TestFormDrawer
          today={todayYmd()}
          onSubmit={(v) =>
            act.create.mutate(v, {
              onSuccess: (x) => {
                setFormOpen(false);
                setPicked(x.id);
              },
            })
          }
          onClose={() => setFormOpen(false)}
          saving={act.create.isPending}
          error={act.create.isError ? errorText(act.create.error) : undefined}
        />
      )}
    </>
  );
}

function Screen() {
  const [groupId, setGroupId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [accepted, setAccepted] = useState<ReadonlySet<string>>(new Set());
  const [msg, setMsg] = useState<{ text: string; error: boolean }>();
  const groups = useQuery({
    queryKey: ['groups', 'current'],
    queryFn: () => api.request<GroupListItem[]>('/groups?status=current'),
  });
  const { list, detail } = useTestData(groupId, picked);
  const act = useTestActions(groupId, picked, setMsg);
  const tests = (list.data ?? []).map(toTest);
  return (
    <TestsView
      groups={(groups.data ?? []).map((g) => ({ value: g.id, label: g.name }))}
      groupId={groupId}
      onGroup={(id) => {
        setGroupId(id);
        setPicked(null);
        act.setPreview(null);
      }}
      tests={tests}
      selectedId={picked}
      onSelect={(id) => {
        setPicked(id);
        setMsg(undefined);
        act.setPreview(null);
      }}
      results={detail.data ? toResults(detail.data) : undefined}
      onNew={() => setFormOpen(true)}
      onTemplate={act.template}
      onImportFile={(f) => {
        setAccepted(new Set());
        act.upload.mutate(f);
      }}
      onPublish={() => act.publish.mutate()}
      busy={act.publish.isPending || act.upload.isPending}
      message={msg}
      loading={list.isPending}
      loadError={list.isError ? errorView(list.error, () => void list.refetch()) : undefined}
    >
      <Panels
        act={act}
        accepted={accepted}
        setAccepted={setAccepted}
        formOpen={formOpen}
        setFormOpen={setFormOpen}
        setPicked={setPicked}
      />
    </TestsView>
  );
}

/** W-19 Testlar (T-302, FR-GRD-4/5): `test.manage`; ustoz — o'z guruhlari (API scope). */
export function TestsPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('test.manage'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <Screen />;
}
