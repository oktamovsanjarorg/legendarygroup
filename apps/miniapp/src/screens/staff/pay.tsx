import type { PaymentMethod } from '@lg/contracts';
import { formatMoney, formatPeriod, miniappMessages as t } from '@lg/i18n';
import {
  InlineButton,
  ListItem,
  MoneyInput,
  MoneyText,
  Section,
  Segmented,
  StateShell,
  useMainButton,
} from '@lg/ui-tg';
import { CheckCircle2 } from 'lucide-react';

const p = t.staffPay;
const METHODS = ['cash', 'card', 'bank', 'other'] as const satisfies readonly PaymentMethod[];

export interface PayPreview {
  debt: bigint;
  parts: readonly { period: string; amount: bigint; closes: boolean }[];
  advance: bigint;
}

export interface PayViewProps {
  student: { name: string; code: string };
  /** Server taqsimoti (BR-12); summa kiritilmagan bo'lsa ham qarz ko'rinadi. */
  preview: PayPreview | null;
  amount: bigint | null;
  method: PaymentMethod;
  saving: boolean;
  onAmount: (v: bigint | null) => void;
  onMethod: (m: PaymentMethod) => void;
  onSave: () => void;
}

function Allocation({ preview }: { preview: PayPreview }) {
  if (preview.parts.length === 0 && preview.advance === 0n) return null;
  return (
    <Section title={p.allocation}>
      {preview.parts.map((x) => (
        <ListItem
          key={x.period}
          title={formatPeriod(x.period)}
          subtitle={x.closes ? p.closes : undefined}
          after={<MoneyText amount={x.amount} />}
        />
      ))}
      {preview.advance > 0n && (
        <ListItem title={p.advance.replace('{amount}', formatMoney(preview.advance))} />
      )}
    </Section>
  );
}

/** MS-07 To'lov kiritish (T-131): summa → usul → MainButton; taqsimot — serverdan. */
export function PayView(props: PayViewProps) {
  const { student, preview, amount, method, saving } = props;
  useMainButton({
    text: p.save.replace('{amount}', amount ? formatMoney(amount) : ''),
    onClick: props.onSave,
    loading: saving,
    visible: amount !== null && amount > 0n,
  });
  const debt = preview?.debt ?? 0n;
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <header className="px-2">
        <h1 className="text-xl font-semibold text-text">{student.name}</h1>
        <p className="text-sm text-text-muted">{student.code}</p>
      </header>
      <div className={`flex flex-col gap-1 rounded-xl p-4 ${debt > 0n ? 'bg-danger-bg' : 'bg-bg'}`}>
        <span className="text-sm text-text-muted">{p.debt}</span>
        {debt > 0n ? (
          <MoneyText amount={-debt} className="text-2xl font-bold" />
        ) : (
          <span className="text-sm text-text">{p.noDebt}</span>
        )}
      </div>
      <MoneyInput label={p.amount} value={amount} onChange={props.onAmount} />
      {debt > 0n && amount !== debt && (
        <div className="px-2">
          <InlineButton onClick={() => props.onAmount(debt)}>
            {p.payDebt.replace('{amount}', formatMoney(debt))}
          </InlineButton>
        </div>
      )}
      <Segmented
        label={p.method}
        value={method}
        options={METHODS.map((m) => ({ value: m, label: p.methods[m] }))}
        onChange={props.onMethod}
      />
      {amount !== null && preview && <Allocation preview={preview} />}
    </main>
  );
}

/** Saqlangandan keyin: chek raqami, PDF, MainButton «Tayyor» (kartochkaga qaytadi). */
export function PayDoneView({
  receipt,
  onReceipt,
  onFinish,
}: {
  receipt: string;
  onReceipt: () => void;
  onFinish: () => void;
}) {
  useMainButton({ text: p.finish, onClick: onFinish });
  return (
    <StateShell
      icon={<CheckCircle2 className="size-10 text-success" aria-hidden />}
      title={p.done}
      hint={p.receipt.replace('{no}', receipt)}
    >
      <InlineButton onClick={onReceipt}>{p.openReceipt}</InlineButton>
    </StateShell>
  );
}
