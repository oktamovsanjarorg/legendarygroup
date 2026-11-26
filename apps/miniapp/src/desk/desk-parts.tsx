import type { RoleCode } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { Search, Settings, Sparkles, X } from 'lucide-react';
import type { ReactNode } from 'react';

const d = t.desk;

/** Logo va nom (yon panel tepasi). */
export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-text">
        LG
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-[15px] font-bold text-text">{d.brand}</span>
        <span className="truncate text-xs text-text-muted">{d.brandNote}</span>
      </span>
    </div>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

/** Foydalanuvchi (yon panel pasti): ism, rol; bosilsa — sozlamalar. */
export function UserCard(p: { name: string; role: RoleCode; onSettings: () => void }) {
  return (
    <button
      type="button"
      onClick={p.onSettings}
      aria-label={d.settings}
      className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-surface"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {initials(p.name)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-[13px] font-semibold text-text">{p.name}</span>
        <span className="truncate text-xs text-text-muted">{t.roles[p.role]}</span>
      </span>
      <Settings className="size-4 shrink-0 text-text-muted" aria-hidden />
    </button>
  );
}

/** Yuqori panel: qidiruv (Ctrl/⌘ K) va AI yordamchi tugmasi. */
export function TopBar(p: {
  /** «Ctrl» yoki «⌘». */
  mod: string;
  onSearch: () => void;
  assistant: boolean;
  onAssistant: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg/90 px-6 backdrop-blur">
      <button
        type="button"
        onClick={p.onSearch}
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-text-muted transition-colors hover:border-primary/40 hover:text-text"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate text-left">{d.search}</span>
        <kbd className="rounded border border-border bg-bg px-1.5 font-sans text-[11px] leading-5">
          {p.mod} K
        </kbd>
      </button>
      <span className="flex-1" />
      <button
        type="button"
        onClick={p.onAssistant}
        aria-pressed={p.assistant}
        className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${
          p.assistant
            ? 'bg-primary/15 text-primary ring-1 ring-primary/40'
            : 'bg-primary/10 text-primary hover:bg-primary/15'
        }`}
      >
        <Sparkles className="size-4" aria-hidden />
        {d.assistant}
        <kbd className="rounded bg-black/10 px-1.5 font-sans text-[11px] leading-5">{p.mod} J</kbd>
      </button>
    </header>
  );
}

/** O'ng panel: AI yordamchi istalgan sahifa ustida (sahifa o'zgarmaydi). */
export function AssistantPanel({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <aside
      aria-label={d.assistant}
      className="sticky top-0 flex h-screen w-[400px] shrink-0 flex-col border-l border-border bg-bg"
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-sm font-semibold text-text">{d.assistant}</span>
          <span className="truncate text-xs text-text-muted">{d.assistantHint}</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={d.close}
          className="flex size-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface hover:text-text"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </aside>
  );
}
