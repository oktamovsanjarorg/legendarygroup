import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { WizardView } from '../../screens/f1/wizard.js';

const STORAGE_KEY = 'lg_wizard_step';

export function WizardPage() {
  const [step, setStep] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? parseInt(saved, 10) : 0;
    return isNaN(parsed) || parsed < 0 || parsed > 7 ? 0 : parsed;
  });

  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(step));
  }, [step]);

  const handleNext = () => setStep((s) => Math.min(7, s + 1));
  const handleBack = () => setStep((s) => Math.max(0, s - 1));
  const handleSkip = () => setStep((s) => Math.min(7, s + 1));

  const handleFinish = () => {
    localStorage.removeItem(STORAGE_KEY);
    void navigate({ to: '/' });
  };

  return (
    <WizardView
      step={step}
      onNext={handleNext}
      onBack={handleBack}
      onSkip={handleSkip}
      onFinish={handleFinish}
    />
  );
}
