import { formatMoney } from '@lg/i18n';

/** Summa (`1 250 000 soʻm`, U+00A0): manfiy — qarz/jarima (danger), `tabular-nums`. */
export function MoneyText({ amount, className = '' }: { amount: bigint; className?: string }) {
  const tone = amount < 0n ? 'text-danger' : 'text-text';
  return <span className={`tabular-nums ${tone} ${className}`}>{formatMoney(amount)}</span>;
}
