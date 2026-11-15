import { webMessages as t } from '@lg/i18n';
import { LoadingState } from '@lg/ui-web';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** Ota-onalar uchun bot havolasi va QR (T-117) — `GET /settings/public` dagi `botUrl`. */
export function BotInvite({ url }: { url: string | null }) {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    let live = true;
    void QRCode.toDataURL(url, { margin: 1, width: 220 }).then((d) => live && setQr(d));
    return () => {
      live = false;
    };
  }, [url]);
  if (!url) return <LoadingState rows={2} />;
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-4">
      {qr && <img src={qr} alt={t.wizard.qrAlt} width={220} height={220} />}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-sm text-primary underline"
      >
        {url}
      </a>
    </div>
  );
}
