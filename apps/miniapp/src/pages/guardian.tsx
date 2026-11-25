import { miniappMessages as t } from '@lg/i18n';
import { ErrorNotice, OkNotice } from './notice.js';
import { useNavigate } from '@tanstack/react-router';
import {
  useChildPayments,
  useReceipt,
  useReceiptPdf,
  useChildResults,
  useChildren,
  useChildSummaries,
} from '../data/guardian.js';
import { QueryView } from '../data/query-view.js';
import { useSelectedChild } from '../data/selected-child.js';
import { GuardianHomeView } from '../screens/guardian/home.js';
import { type MoreTarget, MoreView } from '../screens/guardian/more.js';
import { PaymentsView } from '../screens/guardian/payments.js';
import { ReceiptView } from '../screens/guardian/receipt.js';
import { ResultsView } from '../screens/guardian/results.js';

/** "Ko'proq" menyusi → ekran (jadval va bildirishnomalar — sozlamalarda). */
const MORE_ROUTES: Partial<Record<MoreTarget, '/absence' | '/tickets' | '/settings'>> = {
  absence: '/absence',
  tickets: '/tickets',
  notifications: '/settings',
  settings: '/settings',
};

/** Ota-ona tablari (T-116) — haqiqiy API, faqat o'z farzandlari (server scope). */
export function GuardianHomePage() {
  const navigate = useNavigate();
  const children = useChildren();
  const summaries = useChildSummaries(children.data);
  const [childId, setChildId] = useSelectedChild(children.data?.map((c) => c.id) ?? []);
  return (
    <QueryView
      query={children}
      empty={{ when: (c) => c.length === 0, title: t.childHome.empty, hint: t.childHome.emptyHint }}
    >
      {() => (
        <QueryView query={summaries}>
          {(items) => (
            <GuardianHomeView
              items={items}
              selected={childId ?? ''}
              onSelect={setChildId}
              onPay={() => void navigate({ to: '/pay' })}
            />
          )}
        </QueryView>
      )}
    </QueryView>
  );
}

export function GuardianPaymentsPage() {
  const navigate = useNavigate();
  const children = useChildren();
  const [childId] = useSelectedChild(children.data?.map((c) => c.id) ?? []);
  const payments = useChildPayments(childId);
  const child = children.data?.find((c) => c.id === childId);
  return (
    <QueryView
      query={children}
      empty={{ when: (c) => c.length === 0, title: t.childHome.empty, hint: t.childHome.emptyHint }}
    >
      {() => (
        <QueryView query={payments}>
          {(d) => (
            <PaymentsView
              childName={child?.fullName ?? ''}
              debt={d.debt}
              invoices={d.invoices}
              payments={d.payments}
              onPay={() => void navigate({ to: '/pay' })}
              onReceipt={(p) =>
                void navigate({ to: '/receipt/$number', params: { number: p.receiptNo } })
              }
            />
          )}
        </QueryView>
      )}
    </QueryView>
  );
}

export function GuardianResultsPage() {
  const children = useChildren();
  const [childId, setChildId] = useSelectedChild(children.data?.map((c) => c.id) ?? []);
  const results = useChildResults(childId);
  return (
    <QueryView
      query={children}
      empty={{ when: (c) => c.length === 0, title: t.childHome.empty, hint: t.childHome.emptyHint }}
    >
      {(list) => (
        <QueryView query={results}>
          {(data) => (
            <ResultsView
              childTabs={list.map((c) => ({ id: c.id, name: c.fullName }))}
              selected={childId ?? ''}
              onSelect={setChildId}
              data={data}
              onTest={() => undefined}
            />
          )}
        </QueryView>
      )}
    </QueryView>
  );
}

export function GuardianMorePage() {
  const navigate = useNavigate();
  return (
    <MoreView
      onOpen={(target) => {
        const to = MORE_ROUTES[target];
        if (to) void navigate({ to });
      }}
    />
  );
}

/** MG-05a Chek: to'lovlar tarixidan (FR-PAY-8). */
export function GuardianReceiptPage({ number }: { number: string }) {
  const receipt = useReceipt(number);
  const pdf = useReceiptPdf();
  return (
    <QueryView query={receipt}>
      {(r) => (
        <>
          <ErrorNotice error={pdf.error} />
          <OkNotice text={pdf.isSuccess ? t.receiptSent : null} />
          <ReceiptView r={r} onPdf={() => pdf.mutate(number)} pdfLoading={pdf.isPending} />
        </>
      )}
    </QueryView>
  );
}
