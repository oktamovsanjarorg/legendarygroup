import { formatMoney, miniappMessages as t } from '@lg/i18n';
import {
  ChildSwitcher,
  type ChildTab,
  CopyField,
  FilePicker,
  type FilePickState,
  MoneyInput,
  TextArea,
  useClosingConfirmation,
  useHaptic,
  useMainButton,
} from '@lg/ui-tg';
import { useState } from 'react';

export interface PayForm {
  childId: string;
  amount: bigint;
  comment: string;
}

interface Props {
  childTabs: readonly ChildTab[];
  initialChild: string;
  debt: bigint;
  card: { number: string; holder: string };
  file: FilePickState;
  sending?: boolean;
  onPickFile: () => void;
  onSubmit: (form: PayForm) => void;
}

/**
 * MG-06 To'lov qilish (FR-PAY-3): bitta ekranda ≤ 5 qadam — farzand → summa (qarz bilan
 * to'ldirilgan) → kartani nusxalash → chek → izoh → **Yuborish**. Bot orqali yuborilgan chek
 * ham shu ekranga keladi (11-ux §1 — bitta oqim).
 */
export function PayView(p: Props) {
  const [childId, setChild] = useState(p.initialChild);
  const [amount, setAmount] = useState<bigint | null>(p.debt > 0n ? p.debt : null);
  const [comment, setComment] = useState('');
  const h = useHaptic();
  const ready = amount !== null && p.file.kind === 'ready';
  useClosingConfirmation(p.file.kind !== 'empty' || comment.length > 0);
  useMainButton({
    text: t.pay.send,
    disabled: !ready,
    loading: p.sending,
    onClick: () => amount !== null && p.onSubmit({ childId, amount, comment: comment.trim() }),
  });
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <h1 className="px-2 text-xl font-semibold text-text">{t.pay.title}</h1>
      <ChildSwitcher
        items={p.childTabs}
        selected={childId}
        onSelect={setChild}
        label={t.pay.child}
      />
      <MoneyInput
        label={t.pay.amount}
        value={amount}
        onChange={setAmount}
        hint={p.debt > 0n ? t.pay.amountHint.replace('{debt}', formatMoney(p.debt)) : undefined}
      />
      <section className="flex flex-col gap-1.5">
        <h2 className="px-4 text-sm uppercase tracking-wide text-text-muted">{t.pay.card}</h2>
        <CopyField
          value={p.card.number}
          caption={p.card.holder}
          copyLabel={t.pay.copy}
          copiedLabel={t.pay.copied}
          onCopied={() => h.success()}
        />
        <p className="px-4 text-sm text-text-muted">{t.pay.cardHint}</p>
      </section>
      <FilePicker
        label={t.pay.receipt}
        state={p.file}
        pickLabel={t.pay.pick}
        replaceLabel={t.pay.replace}
        uploadingLabel={t.pay.uploading}
        onPick={p.onPickFile}
      />
      <TextArea
        label={t.pay.comment}
        placeholder={t.pay.commentPlaceholder}
        rows={2}
        className="min-h-16"
        value={comment}
        maxLength={500}
        onChange={(e) => setComment(e.target.value)}
      />
    </main>
  );
}
