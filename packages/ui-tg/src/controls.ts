import { useEffect, useRef } from 'react';
import { useWebApp } from './provider.js';
import { type BottomButton, type SimpleButton, supports, type WebApp } from './telegram.js';

/** Eng so'nggi callback'ga havola: obuna har renderda qayta qilinmaydi. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export interface BottomButtonOptions {
  text: string;
  onClick: () => void;
  /** Bosib bo'lmaydi (masalan, forma to'liq emas). */
  disabled?: boolean;
  /** So'rov ketmoqda: aylana + takroriy bosishdan himoya. */
  loading?: boolean;
  /** `false` — yashirin (hook chaqirilaveradi, React qoidasi). */
  visible?: boolean;
}

function useBottomButton(button: BottomButton | null, opts: BottomButtonOptions) {
  const { text, disabled = false, loading = false, visible = true } = opts;
  const onClick = useLatest(opts.onClick);
  useEffect(() => {
    if (!button) return;
    const handler = () => {
      if (!loading && !disabled) onClick.current();
    };
    button.setParams({ text, is_active: !disabled && !loading, is_visible: visible });
    if (loading) button.showProgress(false);
    else button.hideProgress();
    button.onClick(handler);
    return () => {
      button.offClick(handler);
    };
  }, [button, text, disabled, loading, visible, onClick]);
  // Ekrandan chiqilganda tugma yashirinadi (keyingi ekran o'zinikini ko'rsatadi).
  useEffect(() => {
    if (!button) return;
    return () => {
      button.hideProgress();
      button.setParams({ is_visible: false });
    };
  }, [button]);
}

/** Ekranning asosiy amali — pastdagi bitta `MainButton` (11-ux §4.1). */
export function useMainButton(opts: BottomButtonOptions): void {
  useBottomButton(useWebApp().MainButton, opts);
}

/** Ikkinchi amal — `SecondaryButton` (Bot API 7.10+; eski klientda ko'rinmaydi). */
export function useSecondaryButton(opts: BottomButtonOptions): void {
  const wa = useWebApp();
  useBottomButton(supports(wa, 'secondaryButton') ? wa.SecondaryButton : null, opts);
}

function useSimpleButton(button: SimpleButton | null, onClick: (() => void) | null) {
  const latest = useLatest(onClick);
  const active = onClick !== null;
  useEffect(() => {
    if (!button || !active) return;
    const handler = () => latest.current?.();
    button.onClick(handler).show();
    return () => {
      button.offClick(handler).hide();
    };
  }, [button, active, latest]);
}

/** Orqaga — faqat Telegram `BackButton` (ichki "Orqaga" chizilmaydi). `null` — yashirin. */
export function useBackButton(onBack: (() => void) | null): void {
  const wa = useWebApp();
  useSimpleButton(supports(wa, 'backButton') ? wa.BackButton : null, onBack);
}

/** Telegram menyusidagi "Sozlamalar" bandi (Bot API 7.0+). */
export function useSettingsButton(onOpen: (() => void) | null): void {
  const wa = useWebApp();
  useSimpleButton(supports(wa, 'settingsButton') ? wa.SettingsButton : null, onOpen);
}

/** Saqlanmagan o'zgarish bo'lsa yopishdan oldin so'raladi (11-ux §4.3). */
export function useClosingConfirmation(enabled: boolean): void {
  const wa = useWebApp();
  useEffect(() => {
    if (!enabled || !supports(wa, 'closingConfirmation')) return;
    wa.enableClosingConfirmation();
    return () => wa.disableClosingConfirmation();
  }, [wa, enabled]);
}

export interface Haptic {
  success(): void;
  error(): void;
  warning(): void;
  selection(): void;
}

/** Haptic (11-ux §4.2): muvaffaqiyat/xato/holat almashtirish. Qo'llanmasa — jim. */
export function haptic(wa: WebApp): Haptic {
  const on = supports(wa, 'haptic');
  const h = wa.HapticFeedback;
  return {
    success: () => on && h.notificationOccurred('success'),
    error: () => on && h.notificationOccurred('error'),
    warning: () => on && h.notificationOccurred('warning'),
    selection: () => on && h.selectionChanged(),
  };
}

export const useHaptic = (): Haptic => haptic(useWebApp());
