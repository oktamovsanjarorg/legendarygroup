import { miniappMessages as t } from '@lg/i18n';
import {
  ActionSheet,
  ListItem,
  Section,
  TextArea,
  useClosingConfirmation,
  useMainButton,
} from '@lg/ui-tg';
import { Paperclip } from 'lucide-react';
import { useState } from 'react';

interface Props {
  groupName: string;
  recipients: number;
  sending?: boolean;
  /** Tanlangan fayl nomi (FilePicker — T-019 oqimi, T-305). */
  fileName?: string;
  /** Saqlanmagan qoralama (ilova qayta ochilganda). */
  draft?: string;
  onAttach: () => void;
  onSend: (text: string) => void;
}

/** Ota-ona botda qanday ko'radi (11-ux §6 uslubi). */
function MessagePreview({
  groupName,
  text,
  fileName,
}: {
  groupName: string;
  text: string;
  fileName?: string;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="px-4 text-sm uppercase tracking-wide text-text-muted">{t.announce.preview}</h2>
      <div className="max-w-[85%] self-start whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-bg px-4 py-3 text-base text-text shadow-sm">
        <p className="font-semibold">📢 {groupName}</p>
        {text}
        {fileName && <p className="pt-1 text-sm text-link">📎 {fileName}</p>}
      </div>
    </section>
  );
}

/** MT-10 E'lon (faqat asosiy ustoz): qaytarib bo'lmaydi — tasdiqlash oynasi (11-ux §4.5). */
export function AnnounceView({
  groupName,
  recipients,
  sending,
  fileName,
  draft,
  onAttach,
  onSend,
}: Props) {
  const [text, setText] = useState(draft ?? '');
  const [confirm, setConfirm] = useState(false);
  const ready = text.trim().length > 0;
  useClosingConfirmation(ready);
  useMainButton({
    text: t.announce.send,
    onClick: () => setConfirm(true),
    disabled: !ready,
    loading: sending,
  });
  return (
    <main className="flex flex-col gap-4 p-2 pt-3">
      <header className="px-2">
        <h1 className="text-xl font-semibold text-text">{t.announce.title}</h1>
        <p className="text-sm text-text-muted">
          {t.announce.to.replace('{group}', groupName).replace('{n}', String(recipients))}
        </p>
      </header>
      <TextArea
        label={t.announce.text}
        placeholder={t.announce.placeholder}
        value={text}
        maxLength={3500}
        onChange={(e) => setText(e.target.value)}
      />
      <Section>
        <ListItem
          before={<Paperclip className="size-5" aria-hidden />}
          title={fileName ?? <span className="text-link">{t.announce.attach}</span>}
          onClick={onAttach}
        />
      </Section>
      {ready && <MessagePreview groupName={groupName} text={text.trim()} fileName={fileName} />}
      <ActionSheet
        open={confirm}
        title={t.announce.confirmTitle.replace('{n}', String(recipients))}
        cancelLabel={t.attendance.cancel}
        onClose={() => setConfirm(false)}
        actions={[
          { label: t.announce.confirm, onSelect: () => (setConfirm(false), onSend(text.trim())) },
        ]}
      />
    </main>
  );
}
