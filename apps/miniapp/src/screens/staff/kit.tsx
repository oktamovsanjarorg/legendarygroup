import { formatPeriod, formatPhone, miniappMessages as t } from '@lg/i18n';
import { ActionSheet, ListItem, Section } from '@lg/ui-tg';
import { Check, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import type { ReactNode } from 'react';

/** Xodim ekranlarining umumiy bo'laklari (Q-99). */

/** Telefon — havola (`tel:`), ilovadan chiqmasdan qo'ng'iroq. */
export const CallLink = ({ phone, name }: { phone: string; name?: string }) => (
  <a
    href={`tel:${phone}`}
    className="flex min-h-12 items-center justify-center gap-2 text-base text-link"
  >
    <Phone className="size-5" aria-hidden />
    {t.staffKit.call}: {name ?? formatPhone(phone)}
  </a>
);

/** Xavfli/qaytmas amal tasdig'i (11-ux §4.5): amal nomi tugmada. */
export function ConfirmSheet(p: {
  open: boolean;
  title: string;
  action: string;
  danger?: boolean;
  children?: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ActionSheet
      open={p.open}
      title={p.title}
      cancelLabel={t.staffKit.cancel}
      onClose={p.onClose}
      actions={[
        {
          label: p.action,
          tone: p.danger ? 'danger' : 'default',
          onSelect: () => {
            p.onClose();
            p.onConfirm();
          },
        },
      ]}
    >
      {p.children}
    </ActionSheet>
  );
}

/** Ko'p variantdan bittasi (Segmented sig'magan joyda). */
export function ChoiceSection<T extends string>(p: {
  title: string;
  value: T | null;
  options: readonly { value: T; label: string; hint?: string }[];
  footer?: ReactNode;
  onChange: (v: T) => void;
}) {
  return (
    <Section title={p.title} footer={p.footer}>
      {p.options.map((o) => (
        <ListItem
          key={o.value}
          title={o.label}
          subtitle={o.hint}
          after={
            o.value === p.value ? <Check className="size-5 text-link" aria-hidden /> : undefined
          }
          onClick={() => p.onChange(o.value)}
        />
      ))}
    </Section>
  );
}

const STEP =
  'flex size-11 items-center justify-center rounded-xl bg-bg text-link disabled:opacity-40';

/** Oy almashtirgich (`YYYY-MM`); joriy oydan keyingisi yo'q. */
export function PeriodBar(p: { period: string; current: string; onStep: (step: -1 | 1) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        aria-label={t.staffKit.prevMonth}
        className={STEP}
        onClick={() => p.onStep(-1)}
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <span className="text-base font-semibold text-text">{formatPeriod(p.period)}</span>
      <button
        type="button"
        aria-label={t.staffKit.nextMonth}
        className={STEP}
        disabled={p.period >= p.current}
        onClick={() => p.onStep(1)}
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </div>
  );
}
