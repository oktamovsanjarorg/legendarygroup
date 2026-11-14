import type { ReceiptVerifyResponse } from '@lg/contracts';
import { useEffect, useState } from 'react';
import { VerifyView, type VerifyResult } from '../screens/f2/verify.js';

export function VerifyPage({ token }: { token: string }) {
  const [result, setResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/billing/receipts/verify/${encodeURIComponent(token)}`);
        if (!res.ok) {
          if (!cancelled) setResult({ kind: 'not_found' });
          return;
        }
        const data = (await res.json()) as ReceiptVerifyResponse;
        if (!cancelled) {
          setResult({
            kind: data.kind,
            number: data.number,
            date: new Date(data.date),
            amount: BigInt(data.amount),
            center: data.center,
          });
        }
      } catch {
        if (!cancelled) setResult({ kind: 'not_found' });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface p-6">
        <p className="text-sm text-text-muted">Tekshirilmoqda…</p>
      </main>
    );
  }

  return <VerifyView r={result} />;
}
