import type { AssistantAction } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { StateShell } from '@lg/ui-tg';
import { ArrowUpRight, Send, Sparkles } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import type { ChatEntry } from '../../data/assistant.js';

const c = t.assistant;

export interface AssistantViewProps {
  enabled: boolean;
  entries: readonly ChatEntry[];
  pending: boolean;
  /** Oxirgi so'rov xatosi (matn). */
  error: string | null;
  onAsk: (text: string) => void;
  onAction: (a: AssistantAction) => void;
  onClear: () => void;
}

function Bubble({ e, onAction }: { e: ChatEntry; onAction: (a: AssistantAction) => void }) {
  const mine = e.role === 'user';
  return (
    <div className={`flex flex-col gap-2 ${mine ? 'items-end' : 'items-start'}`}>
      <p
        className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-base ${mine ? 'bg-primary text-primary-text' : 'bg-bg text-text'}`}
      >
        {e.text}
      </p>
      {e.actions?.map((a) => (
        <button
          key={`${a.screen}:${a.studentId ?? ''}`}
          type="button"
          onClick={() => onAction(a)}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-bg px-4 text-sm font-semibold text-link active:bg-surface"
        >
          <ArrowUpRight className="size-4" aria-hidden />
          {c.open[a.screen]}
          {a.label ? <span className="font-normal text-text-muted">· {a.label}</span> : null}
        </button>
      ))}
    </div>
  );
}

function Composer({ pending, onAsk }: { pending: boolean; onAsk: (text: string) => void }) {
  const [text, setText] = useState('');
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const q = text.trim();
    if (!q || pending) return;
    onAsk(q);
    setText('');
  };
  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <textarea
        aria-label={c.placeholder}
        placeholder={c.placeholder}
        rows={2}
        maxLength={2000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) submit(e);
        }}
        className="min-h-12 flex-1 resize-none rounded-xl bg-bg px-4 py-3 text-base text-text outline-none placeholder:text-text-muted"
      />
      <button
        type="submit"
        aria-label={c.send}
        disabled={pending || !text.trim()}
        className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-text disabled:opacity-40"
      >
        <Send className="size-5" aria-hidden />
      </button>
    </form>
  );
}

/**
 * MS-35 Yordamchi (Q-114): savol → qisqa javob va ekran tugmalari. Tab ildizi — MainButton yo'q.
 * Yordamchi o'zi hech narsani o'zgartirmaydi (pastdagi eslatma).
 */
export function AssistantView(p: AssistantViewProps) {
  if (!p.enabled)
    return (
      <StateShell
        icon={<Sparkles className="size-10" aria-hidden />}
        title={c.disabledTitle}
        hint={c.disabledHint}
      />
    );
  const empty = p.entries.length === 0;
  return (
    <main className="flex flex-col gap-3 p-3">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">{c.title}</h1>
        {!empty && (
          <button type="button" onClick={p.onClear} className="min-h-11 px-2 text-sm text-link">
            {c.clear}
          </button>
        )}
      </header>
      {empty && <p className="text-sm text-text-muted">{c.hint}</p>}
      {empty && (
        <section aria-label={c.suggestionsTitle} className="flex flex-wrap gap-2">
          {c.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => p.onAsk(s)}
              className="min-h-10 rounded-full bg-bg px-4 text-sm text-text active:bg-surface"
            >
              {s}
            </button>
          ))}
        </section>
      )}
      <div className="flex flex-col gap-3" aria-live="polite">
        {p.entries.map((e, i) => (
          <Bubble key={i} e={e} onAction={p.onAction} />
        ))}
        {p.pending && <p className="text-sm text-text-muted">{c.thinking}</p>}
      </div>
      {p.error && (
        <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger">
          {p.error}
        </p>
      )}
      <Composer pending={p.pending} onAsk={p.onAsk} />
      <p className="text-xs text-text-muted">{c.safety}</p>
    </main>
  );
}
