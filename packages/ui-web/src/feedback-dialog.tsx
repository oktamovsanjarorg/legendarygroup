import { CheckCircle2, MessageSquarePlus, X } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Button } from './button.js';

export interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { type: 'bug' | 'suggestion' | 'general'; text: string }) => Promise<void>;
  currentScreen?: string;
}

interface FormProps {
  type: 'bug' | 'suggestion' | 'general';
  setType: (t: 'bug' | 'suggestion' | 'general') => void;
  text: string;
  setText: (t: string) => void;
  loading: boolean;
  currentScreen?: string;
  onClose: () => void;
  handleSubmit: (e: FormEvent) => Promise<void>;
}

function FeedbackSuccessView({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <CheckCircle2 className="mb-2 size-12 text-success" />
      <h3 className="text-base font-semibold text-text">Qabul qilindi!</h3>
      <p className="mt-1 text-sm text-text-muted">
        Fikr-mulohazangiz va yordamingiz uchun rahmat. Tez orada koʻrib chiqamiz.
      </p>
      <Button className="mt-6" onClick={onClose}>
        Yopish
      </Button>
    </div>
  );
}

const TYPE_OPTIONS = [
  { id: 'suggestion', label: 'Taklif' },
  { id: 'bug', label: 'Xatolik' },
  { id: 'general', label: 'Umumiy' },
] as const;

function FeedbackForm(props: FormProps) {
  const { type, setType, text, setText, loading, currentScreen, onClose, handleSubmit } = props;
  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
      <div>
        <label className="text-xs font-medium text-text-muted">Xabar turi</label>
        <div className="mt-1.5 flex gap-2">
          {TYPE_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setType(item.id)}
              className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                type === item.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-text hover:bg-surface'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="feedback-text" className="text-xs font-medium text-text-muted">
          Xabar matni (kamida 5 ta belgi)
        </label>
        <textarea
          id="feedback-text"
          rows={4}
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nima yaxshilanishi kerak yoki qanday xatolik yuz berdi?"
          className="mt-1 w-full rounded-lg border border-border bg-surface p-2.5 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
        />
      </div>
      {currentScreen && (
        <p className="text-[11px] text-text-muted">
          Kontekst: <span className="font-mono text-text">{currentScreen}</span> sahifasi
          biriktiriladi.
        </p>
      )}
      <footer className="mt-2 flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
          Bekor qilish
        </Button>
        <Button type="submit" disabled={loading || text.trim().length < 5}>
          {loading ? 'Yuborilmoqda...' : 'Yuborish'}
        </Button>
      </footer>
    </form>
  );
}

function DialogHeader({ onClose }: { onClose: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-border pb-3">
      <div className="flex items-center gap-2">
        <MessageSquarePlus className="size-5 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold text-text">Fikr yoki xatolik haqida xabar</h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded p-1 text-text-muted hover:bg-surface"
        aria-label="Yopish"
      >
        <X className="size-5" />
      </button>
    </header>
  );
}

export function FeedbackDialog({ open, onClose, onSubmit, currentScreen }: FeedbackDialogProps) {
  const [type, setType] = useState<'bug' | 'suggestion' | 'general'>('suggestion');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setSuccess(false);
      setText('');
      setType('suggestion');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 5) return;
    setLoading(true);
    try {
      await onSubmit({ type, text: text.trim() });
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-border bg-bg p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader onClose={onClose} />
        {success ? (
          <FeedbackSuccessView onClose={onClose} />
        ) : (
          <FeedbackForm
            type={type}
            setType={setType}
            text={text}
            setText={setText}
            loading={loading}
            currentScreen={currentScreen}
            onClose={onClose}
            handleSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
