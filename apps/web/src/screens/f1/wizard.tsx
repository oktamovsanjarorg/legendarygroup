import { webMessages as t } from '@lg/i18n';
import { Badge, Button, Card, cn } from '@lg/ui-web';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

const w = t.wizard;
export const WIZARD_STEPS = w.steps.length;

function Stepper({ step, done }: { step: number; done: readonly boolean[] }) {
  return (
    <ol className="flex items-center gap-2" aria-label={w.title}>
      {w.steps.map((name, i) => (
        <li
          key={name}
          className="flex flex-1 flex-col items-center gap-1 text-center"
          aria-current={i === step ? 'step' : undefined}
        >
          <span
            className={cn(
              'flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
              done[i]
                ? 'bg-success text-primary-text'
                : i === step
                  ? 'bg-primary text-primary-text'
                  : 'bg-surface-alt text-text-muted',
            )}
          >
            {done[i] ? <Check className="size-4" aria-hidden /> : i + 1}
          </span>
          <span
            className={cn(
              'hidden text-xs sm:inline',
              i === step ? 'font-semibold text-text' : 'text-text-muted',
            )}
          >
            {name}
          </span>
        </li>
      ))}
    </ol>
  );
}

export interface WizardViewProps {
  step: number;
  /** Har qadam bajarilganmi — server ma'lumotidan. */
  done: readonly boolean[];
  /** Joriy qadamda kiritilganlar soni (`null` — ko'rsatilmaydi). */
  count?: number | null;
  /** Joriy qadam tarkibi: amal tugmasi, QR va h.k. (route beradi). */
  children?: ReactNode;
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
  onFinish?: () => void;
}

function Status({ done, count }: { done: boolean; count?: number | null }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge tone={done ? 'success' : 'muted'}>{done ? w.done : w.pending}</Badge>
      {count !== null && count !== undefined && count > 0 && (
        <span className="text-text-muted">{w.count.replace('{n}', String(count))}</span>
      )}
    </div>
  );
}

/** W-33 Birinchi ishga tushirish ustasi (T-117): har qadam — haqiqiy forma, holat — serverdan. */
export function WizardView(p: WizardViewProps) {
  const isLast = p.step >= WIZARD_STEPS - 1;
  const done = p.done[p.step] ?? false;
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-text">{w.title}</h1>
        <p className="text-sm text-text-muted">
          {w.step.replace('{i}', String(p.step + 1)).replace('{n}', String(WIZARD_STEPS))}
        </p>
      </div>
      <Stepper step={p.step} done={p.done} />
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-text">{w.steps[p.step]}</h2>
          {!isLast && <Status done={done} count={p.count} />}
        </div>
        <p className="text-sm text-text-muted">{w.hints[p.step]}</p>
        {p.children}
        <footer className="mt-4 flex justify-between border-t border-border pt-4">
          <Button variant="ghost" onClick={p.onBack} disabled={p.step === 0}>
            {w.back}
          </Button>
          <div className="flex gap-2">
            {!isLast && !done && p.onSkip && (
              <Button variant="secondary" onClick={p.onSkip}>
                {w.skip}
              </Button>
            )}
            <Button onClick={isLast ? p.onFinish : p.onNext}>{isLast ? w.finish : w.next}</Button>
          </div>
        </footer>
      </Card>
    </div>
  );
}
