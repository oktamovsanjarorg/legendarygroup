import type { GuardianLinkRequest } from '@lg/contracts';
import { GUARDIAN_RELATIONS, type GuardianRelation } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import {
  Button,
  Drawer,
  ErrorState,
  Field,
  ForbiddenState,
  LoadingState,
  SelectField,
} from '@lg/ui-web';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { api } from '../../api/client.js';
import { errorText, errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { useDebounced } from '../../lib/use-debounced.js';
import { type LinkRequest, LinkRequestsView } from '../../screens/f1/link-requests.js';
import { usePayStudentSearch } from '../billing/use-pay-entry.js';

const l = t.linkRequests;

export const toLinkRequest = (r: GuardianLinkRequest): LinkRequest => ({
  id: r.id,
  phone: r.phone,
  tgName: r.telegramUsername ? `${r.fullName} (@${r.telegramUsername})` : r.fullName,
  at: new Date(r.createdAt),
});

type Act =
  | { id: string; kind: 'approve'; studentId: string; relation: GuardianRelation }
  | { id: string; kind: 'reject'; reason: string };

function useAct(onDone: (m: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: Act) =>
      a.kind === 'approve'
        ? api.request(`/guardians/link-requests/${a.id}/approve`, {
            method: 'POST',
            body: { studentId: a.studentId, relation: a.relation },
          })
        : api.request(`/guardians/link-requests/${a.id}/reject`, {
            method: 'POST',
            body: { reason: a.reason },
          }),
    onSuccess: (_d, a) => {
      void qc.invalidateQueries({ queryKey: ['link-requests'] });
      void qc.invalidateQueries({ queryKey: ['students'] });
      onDone(a.kind === 'approve' ? l.linked : l.rejected);
    },
  });
}

interface Picked {
  student: { id: string; name: string } | null;
  relation: GuardianRelation;
}

/** Farzandni qidirib tanlash va qarindoshlik (approve uchun). */
function StudentPick({ v, onChange }: { v: Picked; onChange: (p: Picked) => void }) {
  const [q, setQ] = useState('');
  const found = usePayStudentSearch(useDebounced(q.trim()));
  if (v.student)
    return (
      <>
        <p className="text-sm font-medium text-text">{v.student.name}</p>
        <SelectField
          label={l.relation}
          value={v.relation}
          onChange={(e) => onChange({ ...v, relation: e.target.value as GuardianRelation })}
          options={GUARDIAN_RELATIONS.map((x) => ({ value: x, label: t.students.relations[x] }))}
        />
      </>
    );
  return (
    <>
      <Field label={l.student} value={q} onChange={(e) => setQ(e.target.value)} />
      {(found.data?.items ?? []).slice(0, 6).map((s) => (
        <Button
          key={s.id}
          variant="ghost"
          onClick={() => onChange({ ...v, student: { id: s.id, name: s.fullName } })}
        >
          {s.fullName} · LG-{s.code}
        </Button>
      ))}
    </>
  );
}

interface DrawerProps {
  r: LinkRequest;
  kind: 'approve' | 'reject';
  onDone: (m: string) => void;
  onClose: () => void;
}

function LinkDrawer({ r, kind, onDone, onClose }: DrawerProps) {
  const act = useAct(onDone);
  const [pick, setPick] = useState<Picked>({ student: null, relation: 'mother' });
  const [reason, setReason] = useState('');
  const ok = kind === 'approve' ? pick.student !== null : reason.trim().length >= 2;
  const submit = () => {
    if (kind === 'reject') act.mutate({ id: r.id, kind, reason: reason.trim() });
    else if (pick.student)
      act.mutate({ id: r.id, kind, studentId: pick.student.id, relation: pick.relation });
  };
  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button
        variant={kind === 'reject' ? 'danger' : 'primary'}
        disabled={!ok}
        loading={act.isPending}
        onClick={submit}
      >
        {kind === 'approve' ? l.link : l.reject}
      </Button>
    </>
  );
  return (
    <Drawer
      open
      title={kind === 'approve' ? l.linkTitle : l.rejectTitle}
      closeLabel={t.common.close}
      onClose={onClose}
      footer={footer}
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-muted">
          {r.tgName} · {r.phone}
        </p>
        {kind === 'reject' ? (
          <Field
            label={l.rejectReason}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        ) : (
          <StudentPick v={pick} onChange={setPick} />
        )}
        {act.isError && (
          <p role="alert" className="text-sm text-danger">
            {errorText(act.error)}
          </p>
        )}
      </div>
    </Drawer>
  );
}

function LinkRequestsScreen() {
  const q = useQuery({
    queryKey: ['link-requests', 'pending'],
    queryFn: () =>
      api.request<{ items: GuardianLinkRequest[] }>(
        '/guardians/link-requests?status=pending&limit=100',
      ),
  });
  const [open, setOpen] = useState<{ r: LinkRequest; kind: 'approve' | 'reject' } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  if (q.isPending) return <LoadingState rows={4} />;
  if (q.isError) return <ErrorState {...errorView(q.error, () => void q.refetch())} />;
  return (
    <>
      {notice && (
        <p role="status" className="mb-4 rounded-md bg-success-bg p-3 text-sm text-success">
          {notice}
        </p>
      )}
      <LinkRequestsView
        rows={q.data.items.map(toLinkRequest)}
        onLink={(r) => setOpen({ r, kind: 'approve' })}
        onReject={(r) => setOpen({ r, kind: 'reject' })}
      />
      {open && (
        <LinkDrawer
          r={open.r}
          kind={open.kind}
          onClose={() => setOpen(null)}
          onDone={(m) => {
            setOpen(null);
            setNotice(m);
          }}
        />
      )}
    </>
  );
}

/** W-33 Bog'lanish so'rovlari (T-110, FR-AUTH-1): `student.manage`. */
export function LinkRequestsPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('student.manage'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <LinkRequestsScreen />;
}
