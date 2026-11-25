import { CornerDownLeft, type LucideIcon, Search } from 'lucide-react';
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

export interface Command {
  key: string;
  label: string;
  /** Guruh sarlavhasi (masalan «Pul»). */
  group?: string;
  icon?: LucideIcon;
  run: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  commands: readonly Command[];
  /** Yozilgan matnga qarab: oldin (topilgan o'quvchilar) va oxirida (yordamchidan so'rash). */
  dynamic?: (query: string) => { before: Command[]; after: Command[] };
  /** Yozilgan matn (tashqarida qidiruv so'rovi uchun). */
  onQuery?: (query: string) => void;
  placeholder: string;
  empty: string;
  closeLabel: string;
}

/** Qidiruv: katta-kichik harf va tutuq belgisi (ʻ ʼ ' `) farqsiz. */
export const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ʻʼ'‘’`]/g, '')
    .trim();

export function filterCommands(commands: readonly Command[], query: string): Command[] {
  const q = normalize(query);
  if (!q) return [...commands];
  return commands.filter((c) => normalize(`${c.label} ${c.group ?? ''}`).includes(q));
}

function Row(p: { c: Command; on: boolean; onHover: () => void; onRun: () => void }) {
  const Icon = p.c.icon;
  return (
    <li role="option" aria-selected={p.on}>
      <button
        type="button"
        tabIndex={-1}
        onMouseMove={p.onHover}
        onClick={p.onRun}
        className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm ${p.on ? 'bg-primary/10 text-primary' : 'text-text'}`}
      >
        {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
        <span className="flex-1 truncate">{p.c.label}</span>
        {p.c.group && <span className="text-xs text-text-muted">{p.c.group}</span>}
        {p.on && <CornerDownLeft className="size-3.5 text-text-muted" aria-hidden />}
      </button>
    </li>
  );
}

/** Matn, tanlangan qator va klaviatura: ↑↓ — tanlash, Enter — bajarish, Esc — yopish. */
function usePalette(props: Props) {
  const { open, onClose, commands, dynamic } = props;
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useMemo(() => {
    const extra = query.trim() && dynamic ? dynamic(query.trim()) : { before: [], after: [] };
    return [...extra.before, ...filterCommands(commands, query), ...extra.after];
  }, [commands, dynamic, query]);
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setIndex(0);
    input.current?.focus();
  }, [open]);
  const run = (c: Command | undefined) => {
    if (!c) return;
    onClose();
    c.run();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') setIndex((i) => Math.min(i + 1, list.length - 1));
    else if (e.key === 'ArrowUp') setIndex((i) => Math.max(i - 1, 0));
    else if (e.key === 'Enter') run(list[index]);
    else return;
    e.preventDefault();
  };
  const type = (v: string) => {
    setQuery(v);
    setIndex(0);
    props.onQuery?.(v.trim());
  };
  return { query, type, index, setIndex, list, input, run, onKey };
}

/**
 * Buyruqlar oynasi (T-174): kompyuterda istalgan bo'limga klaviaturadan — Ctrl/⌘ K, ↑↓, Enter, Esc.
 * Bo'limlar 30 dan ortiq: yon panelni aylantirib qidirish o'rniga nomini yozish tezroq.
 */
export function CommandPalette(props: Props) {
  const p = usePalette(props);
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh]">
      <button
        type="button"
        aria-label={props.closeLabel}
        className="absolute inset-0"
        onClick={props.onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={props.placeholder}
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl"
      >
        <label className="flex h-14 items-center gap-3 border-b border-border px-4">
          <Search className="size-5 shrink-0 text-text-muted" aria-hidden />
          <input
            ref={p.input}
            value={p.query}
            onChange={(e) => p.type(e.target.value)}
            onKeyDown={p.onKey}
            placeholder={props.placeholder}
            role="combobox"
            aria-expanded="true"
            aria-controls="lg-command-list"
            className="h-full flex-1 bg-transparent text-base text-text outline-none placeholder:text-text-muted"
          />
          <kbd className="rounded border border-border px-1.5 font-sans text-[11px] leading-5 text-text-muted">
            Esc
          </kbd>
        </label>
        <ul id="lg-command-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {p.list.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-text-muted">{props.empty}</li>
          )}
          {p.list.map((c, i) => (
            <Row
              key={c.key}
              c={c}
              on={i === p.index}
              onHover={() => p.setIndex(i)}
              onRun={() => p.run(c)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
