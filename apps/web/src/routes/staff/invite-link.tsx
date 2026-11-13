import type { StaffInvite } from '@lg/contracts';
import { formatDateTime, webMessages as t } from '@lg/i18n';
import { Button } from '@lg/ui-web';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

const m = t.staff.inviteLink;

/**
 * Taklif havolasi: token serverda xeshlangan — havola faqat shu javobda ko'rinadi (T-101),
 * shuning uchun nusxalash asosiy amal. `null` — taklif kerak emas.
 */
export function InviteLink({ invite }: { invite: StaffInvite | null }) {
  const [copied, setCopied] = useState(false);
  if (!invite) return <p className="text-sm text-text-muted">{m.notNeeded}</p>;
  const copy = async () => {
    await navigator.clipboard.writeText(invite.url);
    setCopied(true);
  };
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold text-text">{m.title}</h3>
      <p className="text-sm text-text-muted">{m[invite.channel]}</p>
      <code className="break-all rounded-md bg-bg p-3 text-xs text-text">{invite.url}</code>
      <Button variant="secondary" size="sm" onClick={() => void copy()}>
        {copied ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
        {copied ? m.copied : m.copy}
      </Button>
      <p className="text-xs text-text-muted">
        {m.expires.replace('{date}', formatDateTime(new Date(invite.expiresAt)))} · {m.once}
      </p>
    </section>
  );
}
