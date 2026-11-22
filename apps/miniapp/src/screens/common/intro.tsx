import type { RoleCode } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { useBackButton, useMainButton } from '@lg/ui-tg';
import {
  CalendarClock,
  ClipboardCheck,
  GraduationCap,
  Inbox,
  type LucideIcon,
  MessageCircle,
  Receipt,
  Search,
  Sun,
  TrendingUp,
} from 'lucide-react';

export type IntroKind = 'teacher' | 'guardian' | 'staff';

/** Rol → kartochkalar to'plami; o'quvchi paneli kichik — tanishtiruvsiz. */
export const introKindOf = (role: RoleCode): IntroKind | null => {
  if (role === 'teacher') return 'teacher';
  if (role === 'guardian') return 'guardian';
  if (role === 'director' || role === 'admin') return 'staff';
  return null;
};

const ICONS: Record<IntroKind, readonly LucideIcon[]> = {
  teacher: [ClipboardCheck, GraduationCap, CalendarClock],
  guardian: [TrendingUp, Receipt, MessageCircle],
  staff: [Sun, Inbox, Search],
};

export interface IntroViewProps {
  kind: IntroKind;
  index: number;
  onIndex: (i: number) => void;
  onDone: () => void;
}

/** C-06 Tanishtiruv (T-125): MainButton — «Keyingi» / «Boshlash», BackButton — oldingisi. */
export function IntroView({ kind, index, onIndex, onDone }: IntroViewProps) {
  const cards = t.intro[kind];
  const last = index >= cards.length - 1;
  const card = cards[Math.min(index, cards.length - 1)];
  const Icon = ICONS[kind][index] ?? Sun;
  useMainButton({
    text: last ? t.intro.start : t.intro.next,
    onClick: last ? onDone : () => onIndex(index + 1),
  });
  useBackButton(index > 0 ? () => onIndex(index - 1) : null);
  if (!card) return null;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 p-6 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-primary text-primary-text">
        <Icon className="size-10" aria-hidden />
      </span>
      <h1 className="text-2xl font-semibold text-text">{card.title}</h1>
      <p className="max-w-sm text-base text-text-muted">{card.text}</p>
      <div
        className="flex gap-2"
        role="img"
        aria-label={t.intro.step
          .replace('{n}', String(index + 1))
          .replace('{total}', String(cards.length))}
      >
        {cards.map((c, i) => (
          <span
            key={c.title}
            className={`size-2 rounded-full ${i === index ? 'bg-primary' : 'bg-border'}`}
          />
        ))}
      </div>
    </main>
  );
}
