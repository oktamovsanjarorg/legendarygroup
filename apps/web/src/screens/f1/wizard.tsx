import { webMessages as t } from '@lg/i18n';
import { Button, Card, cn, Field } from '@lg/ui-web';
import { Check, QrCode, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

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
              'flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
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
            className={cn(
              'text-xs hidden sm:inline',
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

function EarlyStepContent({ step }: { step: number }): ReactNode {
  switch (step) {
    case 0:
      return (
        <div className="flex flex-col gap-3">
          <Field label={t.settings.centerName} defaultValue="Legendary Group" />
          <Field label={t.settings.phone} type="tel" defaultValue="+998 71 200 00 00" />
          <Field label={t.settings.address} defaultValue="Toshkent, Chilonzor tumani" />
        </div>
      );
    case 1:
      return (
        <div className="flex flex-col gap-3">
          <Field
            label={t.settings.card}
            placeholder="8600 0000 0000 0000"
            defaultValue="8600 1234 5678 9012"
          />
          <Field label={t.settings.cardHolder} defaultValue="ANVAR QODIROV" />
          <Field label={t.settings.dueDay} type="number" defaultValue="10" />
        </div>
      );
    case 2:
      return (
        <div className="flex flex-col gap-3">
          <Field label="Kurs nomi" defaultValue="General English" />
          <Field label="Oylik narx (soʻm)" defaultValue="650 000" />
          <Field label="Dars davomiyligi (daqiqa)" defaultValue="80" />
        </div>
      );
    case 3:
    default:
      return (
        <div className="flex flex-col gap-3">
          <Field label="Xona raqami yoki nomi" defaultValue="101-xona" />
          <Field label="Oʻrinlar sigʻimi" type="number" defaultValue="16" />
        </div>
      );
  }
}

function FinalStepContent(): ReactNode {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="rounded-full bg-primary/10 p-3 text-primary">
        <Sparkles className="size-8" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-text">Barcha asosiy sozlamalar kiritildi!</h3>
        <p className="mt-1 text-sm text-text-muted">
          Endi ota-onalarni botga ulash uchun ushbu taklif QR kodini yoki havolasini ulashing.
        </p>
      </div>
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4">
        <QrCode className="size-32 text-text" />
        <span className="font-mono text-xs text-text-muted">
          https://t.me/legendary_group_bot?start=inv_demo
        </span>
      </div>
    </div>
  );
}

function LateStepContent({ step }: { step: number }): ReactNode {
  switch (step) {
    case 4:
      return (
        <div className="flex flex-col gap-3">
          <Field label="Ustoz toʻliq ismi" defaultValue="Sardor Aliyev" />
          <Field label="Telefon raqami" type="tel" defaultValue="+998 90 123 45 67" />
        </div>
      );
    case 5:
      return (
        <div className="flex flex-col gap-3">
          <Field label="Guruh nomi" defaultValue="ENG-101" />
          <Field label="Dars kunlari" defaultValue="Dushanba, Chorshanba, Juma" />
          <Field label="Boshlanish vaqti" defaultValue="15:00" />
        </div>
      );
    case 6:
      return (
        <div className="flex flex-col gap-3">
          <Field label="Oʻquvchi ismi" defaultValue="Jasur Karim" />
          <Field label="Ota-ona telefon raqami" type="tel" defaultValue="+998 93 987 65 43" />
        </div>
      );
    case 7:
    default:
      return <FinalStepContent />;
  }
}

export interface WizardViewProps {
  step: number;
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
  onFinish?: () => void;
}

/** W-33 Birinchi ishga tushirish ustasi (T-117): markaz → … → taklif. */
export function WizardView({ step, onNext, onBack, onSkip, onFinish }: WizardViewProps) {
  const steps = t.wizard.steps;
  const isLast = step >= steps.length - 1;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 py-8 px-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-text">{t.wizard.title}</h1>
        <p className="text-sm text-text-muted">
          {t.wizard.step.replace('{i}', String(step + 1)).replace('{n}', String(steps.length))}
        </p>
      </div>
      <Stepper step={step} />
      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-text">{steps[step]}</h2>
        {step < 4 ? <EarlyStepContent step={step} /> : <LateStepContent step={step} />}
        <footer className="mt-4 flex justify-between border-t border-border pt-4">
          <Button variant="ghost" onClick={onBack} disabled={step === 0}>
            {t.wizard.back}
          </Button>
          <div className="flex gap-2">
            {!isLast && onSkip && (
              <Button variant="secondary" onClick={onSkip}>
                {t.wizard.skip}
              </Button>
            )}
            <Button onClick={isLast ? onFinish : onNext}>
              {isLast ? 'Tizimga oʻtish' : t.wizard.next}
            </Button>
          </div>
        </footer>
      </Card>
    </div>
  );
}
