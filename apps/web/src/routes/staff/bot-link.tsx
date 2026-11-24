import { webMessages as t } from '@lg/i18n';
import { Button } from '@lg/ui-web';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

const m = t.staff.botLink;

/** Xodim qanday kiradi (Q-98): bot → raqamni ulashish. `null` — Telegrami allaqachon ulangan. */
export function BotLink({ url }: { url: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!url) return <p className="text-sm text-text-muted">{m.linked}</p>;
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  };
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold text-text">{m.title}</h3>
      <ol className="list-decimal pl-5 text-sm text-text-muted">
        {m.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <code className="break-all rounded-md bg-bg p-3 text-xs text-text">{url}</code>
      <Button variant="secondary" size="sm" onClick={() => void copy()}>
        {copied ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
        {copied ? m.copied : m.copy}
      </Button>
      <p className="text-xs text-text-muted">{m.phone}</p>
    </section>
  );
}
