import { webMessages as t } from '@lg/i18n';
import { Button, Card, cn, Field } from '@lg/ui-web';
import { Check } from 'lucide-react';

function Stepper({ step }: { step: number }) {
  const steps = t.wizard.steps;
  return (
    <ol className="flex items-center gap-2" aria-label={t.wizard.title}>
      {steps.map((name, i) => (
        <li
          key={name}
          className="flex flex-1 flex-col items-center gap-1 text-center"
          aria-current={i === step ? 'step' : undefined}
        >
          <span
            className={cn(
              'flex size-8 items-center justify-center rounded-full text-sm font-semibold',
              i < step
                ? 'bg-success text-primary-text'
                : i === step
                  ? 'bg-primary text-primary-text'
                  : 'bg-surface-alt text-text-muted',
            )}
          >
            {i < step ? <Check className="size-4" aria-hidden /> : i + 1}
          </span>
          <span
            className={cn('text-xs', i === step ? 'font-semibold text-text' : 'text-text-muted')}
          >
            {name}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** W-33 Birinchi ishga tushirish ustasi (T-117): markaz → … → taklif. */
export function WizardView({
  step,
  onNext,
  onBack,
}: {
  step: number;
  onNext: () => void;
  onBack: () => void;
}) {
  const steps = t.wizard.steps;
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 py-8">
      <h1 className="text-2xl font-semibold text-text">{t.wizard.title}</h1>
      <Stepper step={step} />
      <Card className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          {t.wizard.step.replace('{i}', String(step + 1)).replace('{n}', String(steps.length))}
        </p>
        <h2 className="text-xl font-semibold text-text">{steps[step]}</h2>
        <Field label={t.settings.centerName} defaultValue="Legendary Group" />
        <Field label={t.settings.phone} type="tel" defaultValue="+998 71 200 00 00" />
        <Field label={t.settings.address} defaultValue="Toshkent, Chilonzor tumani" />
        <div className="flex justify-between">
          <Button variant="ghost" onClick={onBack} disabled={step === 0}>
            {t.wizard.back}
          </Button>
          <span className="flex gap-2">
            <Button variant="secondary">{t.wizard.skip}</Button>
            <Button onClick={onNext}>{t.wizard.next}</Button>
          </span>
        </div>
      </Card>
    </div>
  );
}
