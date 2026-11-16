import { webMessages as t } from '@lg/i18n';
import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from './button.js';

export interface TourStep {
  /** Yoritiladigan element (CSS selector). Topilmasa yoki koʻrinmasa — qadam oʻtkaziladi. */
  target: string;
  title: string;
  body: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 6;
const CARD_W = 380;
const GAP = 16;

/** Koʻrinadigan maqsadlari bor qadamlar (ruxsatsiz menyu bandi DOM'da yoʻq — qadam ham yoʻq). */
const presentSteps = (steps: readonly TourStep[]): TourStep[] =>
  steps.filter((s) => {
    const el = document.querySelector(s.target);
    return el !== null && el.getClientRects().length > 0;
  });

function rectOf(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  el.scrollIntoView({ block: 'nearest' });
  const r = el.getBoundingClientRect();
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  };
}

/** Kartochka joyi: maqsadning oʻngida (menyu chapda); sigʻmasa yoki tor ekranda — pastda. */
function cardPosition(rect: Rect | null): CSSProperties {
  const vw = window.innerWidth;
  if (!rect || vw < CARD_W * 2) return { left: GAP, right: GAP, bottom: GAP };
  const left = Math.min(rect.left + rect.width + GAP, vw - CARD_W - GAP);
  const top = Math.max(GAP, Math.min(rect.top, window.innerHeight - 240));
  return { left, top, width: CARD_W };
}

function useStepRect(step: TourStep | undefined): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);
  useLayoutEffect(() => {
    if (!step) return;
    const update = () => setRect(rectOf(step.target));
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step]);
  return rect;
}

function useTourKeys(onClose: () => void, go: (delta: number) => void) {
  const close = useRef(onClose);
  close.current = onClose;
  const move = useRef(go);
  move.current = go;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
      else if (e.key === 'ArrowRight') move.current(1);
      else if (e.key === 'ArrowLeft') move.current(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}

interface CardProps {
  step: TourStep;
  index: number;
  count: number;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
}

function TourCard({ step, index, count, onBack, onNext, onClose }: CardProps) {
  const last = index === count - 1;
  return (
    <>
      <p className="text-xs font-medium text-text-muted tabular-nums">
        {t.tour.counter.replace('{i}', String(index + 1)).replace('{n}', String(count))}
      </p>
      <h2 id="tour-title" className="text-base font-semibold text-text">
        {step.title}
      </h2>
      <p id="tour-body" className="text-sm text-text-muted">
        {step.body}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button variant="ghost" onClick={onClose}>
          {t.tour.skip}
        </Button>
        <div className="flex gap-2">
          {index > 0 && (
            <Button variant="secondary" onClick={onBack}>
              {t.tour.back}
            </Button>
          )}
          <Button onClick={last ? onClose : onNext}>{last ? t.tour.done : t.tour.next}</Button>
        </div>
      </div>
    </>
  );
}

/**
 * Tanishtiruv (T-124): menyu bandlarini birma-bir yoritib, qisqa izoh beradi. Kutubxonasiz:
 * yoritish — maqsad ustidagi shaffof quti + katta `box-shadow` (qolgan ekran xiralashadi).
 * `onClose` — «Tushunarli», «Oʻtkazib yuborish» va `Esc` uchun bitta (koʻrildi deb belgilanadi).
 */
export function Tour({ steps, onClose }: { steps: readonly TourStep[]; onClose: () => void }) {
  // Qadamlar DOM tayyor boʻlgach hisoblanadi (birinchi renderda menyu hali chizilmagan).
  const [list, setList] = useState<TourStep[] | null>(null);
  useLayoutEffect(() => setList(presentSteps(steps)), [steps]);
  const [i, setI] = useState(0);
  const step = list?.[i];
  const rect = useStepRect(step);
  const card = useRef<HTMLDivElement>(null);
  const count = list?.length ?? 0;
  const go = (delta: number) => setI((n) => Math.min(Math.max(n + delta, 0), count - 1));
  useTourKeys(onClose, go);
  useEffect(() => card.current?.focus(), [i]);
  useEffect(() => {
    if (list?.length === 0) onClose();
  }, [list, onClose]);
  if (!step) return null;

  return (
    <div className="fixed inset-0 z-50" data-testid="tour">
      <div
        aria-hidden
        className="pointer-events-none fixed rounded-lg ring-2 ring-primary motion-safe:transition-all"
        style={
          rect
            ? { ...rect, boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.55)' }
            : { inset: 0, background: 'rgb(0 0 0 / 0.55)' }
        }
      />
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
        className="fixed flex flex-col gap-3 rounded-lg border border-border bg-bg p-4 shadow-lg outline-none"
        style={cardPosition(rect)}
      >
        <TourCard
          step={step}
          index={i}
          count={count}
          onBack={() => go(-1)}
          onNext={() => go(1)}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
