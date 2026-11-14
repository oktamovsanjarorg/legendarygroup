import type { ReactNode } from 'react';

export interface SheetAction {
  label: string;
  icon?: ReactNode;
  tone?: 'default' | 'danger';
  onSelect: () => void;
}

interface Props {
  open: boolean;
  title?: string;
  actions: readonly SheetAction[];
  cancelLabel: string;
  onClose: () => void;
  children?: ReactNode;
}

/**
 * Pastdan chiquvchi menyu (uzoq bosish amallari, 11-ux §4.5 tasdiqlash oynasi asosi).
 * Amal nomi tugmada ("Rad etish", "OK" emas). Fon bosilsa — yopiladi.
 */
export function ActionSheet({ open, title, actions, cancelLabel, onClose, children }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex flex-col gap-2 p-3"
        style={{ paddingBottom: 'calc(var(--lg-safe-bottom, 0px) + 12px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-xl bg-bg">
          {title && <p className="px-4 py-3 text-center text-sm text-text-muted">{title}</p>}
          {children}
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onSelect}
              className={`flex min-h-12 w-full items-center justify-center gap-2 border-t border-border text-base active:bg-surface ${a.tone === 'danger' ? 'text-danger' : 'text-link'}`}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 rounded-xl bg-bg text-base font-semibold text-link active:bg-surface"
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
