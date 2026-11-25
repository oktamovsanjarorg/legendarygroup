import { miniappMessages as t } from '@lg/i18n';
import { ListItem, Section } from '@lg/ui-tg';
import type { StaffMenuItem, StaffMenuKey, StaffSection } from '../../data/staff-menu.js';
import { STAFF_ICONS as ICONS } from './menu-icons.js';

const m = t.staffMore;

export interface StaffMoreViewProps {
  groups: readonly { section: StaffSection; items: readonly StaffMenuItem[] }[];
  /** Band yonidagi son (navbat, soʻrovlar). */
  counts?: Partial<Record<StaffMenuKey, number>>;
  onOpen: (item: StaffMenuItem) => void;
}

/** MS-06 Koʻproq (T-130): ruxsatga qarab boʻlimlar; qolgani — boshqaruv panelida (MainButton). */
export function StaffMoreView({ groups, counts = {}, onOpen }: StaffMoreViewProps) {
  return (
    <main className="flex flex-col gap-4 p-2 pt-3">
      <h1 className="px-2 text-2xl font-bold text-text">{m.title}</h1>
      {groups.map((g) => (
        <Section key={g.section} title={m.sections[g.section]}>
          {g.items.map((i) => {
            const Icon = ICONS[i.key];
            const n = counts[i.key];
            return (
              <ListItem
                key={i.key}
                before={<Icon className="size-5" aria-hidden />}
                title={m.items[i.key]}
                after={
                  n ? (
                    <span className="rounded-full bg-primary px-2 text-primary-text">{n}</span>
                  ) : undefined
                }
                chevron
                onClick={() => onOpen(i)}
              />
            );
          })}
        </Section>
      ))}
    </main>
  );
}
