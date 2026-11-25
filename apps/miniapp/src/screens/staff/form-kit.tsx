import { ListItem, Section } from '@lg/ui-tg';
import type { ReactNode } from 'react';

/** Xodim shakllari va kartochkalarining umumiy bo'laklari (Q-99). */

export function Screen(p: { title: ReactNode; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <header className="flex flex-col gap-1 px-2">
        <h1 className="text-xl font-semibold text-text">{p.title}</h1>
        {p.subtitle && <p className="text-sm text-text-muted">{p.subtitle}</p>}
      </header>
      {p.children}
    </main>
  );
}

/** Kiritish maydonlari guruhi. */
export const Fields = (p: { title?: string; footer?: ReactNode; children: ReactNode }) => (
  <Section title={p.title} footer={p.footer}>
    <li className="flex flex-col gap-3 px-4 py-3">{p.children}</li>
  </Section>
);

export interface InfoItem {
  label: string;
  value: ReactNode;
}

/** Ma'lumot qatorlari: qiymati yo'qlar tushib qoladi. */
export function InfoSection(p: { title?: string; items: readonly (InfoItem | null)[] }) {
  const shown = p.items.filter((i): i is InfoItem => i !== null && Boolean(i.value));
  if (shown.length === 0) return null;
  return (
    <Section title={p.title}>
      {shown.map((i) => (
        <ListItem key={i.label} title={i.value} subtitle={i.label} />
      ))}
    </Section>
  );
}

/** Bo'sh qator (ro'yxat ichida). */
export const EmptyRow = ({ text }: { text: string }) => (
  <li className="px-4 py-3 text-sm text-text-muted">{text}</li>
);
