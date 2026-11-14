import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

interface Props {
  value: string;
  caption?: string;
  copyLabel: string;
  copiedLabel: string;
  /** Test/Storybook uchun almashtiriladi. */
  copy?: (text: string) => Promise<void>;
  onCopied?: () => void;
}

/** Nusxalanadigan qiymat (karta raqami, MG-06): butun qator bosiladi, natija ko'rinadi. */
export function CopyField({ value, caption, copyLabel, copiedLabel, copy, onCopied }: Props) {
  const [done, setDone] = useState(false);
  const run = async () => {
    await (copy ?? ((s: string) => navigator.clipboard.writeText(s)))(value.replace(/\s/g, ''));
    setDone(true);
    onCopied?.();
    setTimeout(() => setDone(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={() => void run()}
      className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-bg px-4 py-2 text-left active:bg-surface"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-mono text-lg tabular-nums tracking-wide text-text">{value}</span>
        {caption && <span className="text-sm text-text-muted">{caption}</span>}
      </span>
      <span className="flex items-center gap-1 text-sm font-medium text-link">
        {done ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {done ? copiedLabel : copyLabel}
      </span>
    </button>
  );
}
