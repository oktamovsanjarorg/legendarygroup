import { miniappMessages as t } from '@lg/i18n';
import { useHaptic } from '@lg/ui-tg';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { QueryView } from '../data/query-view.js';
import {
  type LinkDecision,
  useDecideLink,
  useLinkRequests,
  useStudentPick,
} from '../data/staff-links.js';
import {
  LinkRequestsView,
  LinkStudentView,
  RejectLinkView,
} from '../screens/staff/link-requests.js';
import { ErrorNotice } from './notice.js';

/** MS-11 Bog'lanish so'rovlari (T-135, FR-AUTH-1). */
export function StaffLinkRequestsPage() {
  const navigate = useNavigate();
  const list = useLinkRequests();
  return (
    <QueryView query={list}>
      {(items) => (
        <LinkRequestsView
          items={items}
          onLink={(r) =>
            void navigate({ to: '/staff/link-requests/$id/link', params: { id: r.id } })
          }
          onReject={(r) =>
            void navigate({ to: '/staff/link-requests/$id/reject', params: { id: r.id } })
          }
        />
      )}
    </QueryView>
  );
}

/** Qaror berilgach — ro'yxatga (`replace`: orqaga bosilsa formaga qaytmaydi). */
function useDecision() {
  const haptic = useHaptic();
  const navigate = useNavigate();
  const decide = useDecideLink();
  const run = (d: LinkDecision) =>
    decide.mutate(d, {
      onSuccess: () => {
        haptic.success();
        void navigate({ to: '/staff/link-requests', replace: true });
      },
      onError: () => haptic.error(),
    });
  return { decide, run };
}

/** Ro'yxatda yo'q (boshqa xodim hal qilgan) — bo'sh holat. */
const gone = { title: t.linkReq.empty, hint: t.linkReq.emptyHint };

export function StaffLinkApprovePage() {
  const { id } = useParams({ from: '/staff/link-requests/$id/link' });
  const list = useLinkRequests();
  const { decide, run } = useDecision();
  const [q, setQ] = useState('');
  const found = useStudentPick(q);
  return (
    <QueryView query={list} empty={{ when: (d) => !d.some((r) => r.id === id), ...gone }}>
      {(items) =>
        items
          .filter((r) => r.id === id)
          .map((req) => (
            <div key={req.id}>
              <ErrorNotice error={decide.error} />
              <LinkStudentView
                req={req}
                query={q}
                found={q.trim().length < 2 ? [] : (found.data ?? [])}
                saving={decide.isPending}
                onQuery={setQ}
                onSave={(studentId, relation) => run({ kind: 'approve', req, studentId, relation })}
              />
            </div>
          ))
      }
    </QueryView>
  );
}

export function StaffLinkRejectPage() {
  const { id } = useParams({ from: '/staff/link-requests/$id/reject' });
  const list = useLinkRequests();
  const { decide, run } = useDecision();
  return (
    <QueryView query={list} empty={{ when: (d) => !d.some((r) => r.id === id), ...gone }}>
      {(items) =>
        items
          .filter((r) => r.id === id)
          .map((req) => (
            <div key={req.id}>
              <ErrorNotice error={decide.error} />
              <RejectLinkView
                req={req}
                saving={decide.isPending}
                onSave={(reason) => run({ kind: 'reject', req, reason })}
              />
            </div>
          ))
      }
    </QueryView>
  );
}
