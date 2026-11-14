import { formatDateShort, miniappMessages as t } from '@lg/i18n';
import { EmptyState, ListItem, Section, StatusChip, useMainButton } from '@lg/ui-tg';
import { FileSpreadsheet } from 'lucide-react';

export interface GroupTest {
  id: string;
  name: string;
  date: Date;
  maxScore: number;
  state: 'draft' | 'imported' | 'published';
}

const CHIP = {
  draft: { tone: 'muted', label: t.tests.draft },
  imported: { tone: 'warning', label: t.tests.imported },
  published: { tone: 'success', label: t.tests.published },
} as const;

interface Props {
  groupName: string;
  tests: readonly GroupTest[];
  /** Test yaratish — faqat asosiy ustoz (test.manage, Q-62). */
  canManage: boolean;
  onCreate: () => void;
  onOpen: (test: GroupTest) => void;
}

/** MT-07 Testlar (FR-GRD-3). */
export function TestsView({ groupName, tests, canManage, onCreate, onOpen }: Props) {
  useMainButton({ text: t.tests.create, onClick: onCreate, visible: canManage });
  if (tests.length === 0)
    return (
      <EmptyState
        title={t.tests.empty}
        hint={canManage ? t.tests.emptyHint : t.tests.emptyHintAssistant}
      />
    );
  return (
    <main className="flex flex-col gap-3 p-2 pt-3">
      <header className="px-2">
        <h1 className="text-xl font-semibold text-text">{t.tests.title}</h1>
        <p className="text-sm text-text-muted">{groupName}</p>
      </header>
      <Section>
        {tests.map((x) => (
          <ListItem
            key={x.id}
            before={<FileSpreadsheet className="size-5" aria-hidden />}
            title={x.name}
            subtitle={
              <span className="flex flex-col items-start gap-1">
                {formatDateShort(x.date)} · {t.tests.maxScore.replace('{n}', String(x.maxScore))}
                <StatusChip tone={CHIP[x.state].tone}>{CHIP[x.state].label}</StatusChip>
              </span>
            }
            chevron
            onClick={() => onOpen(x)}
          />
        ))}
      </Section>
    </main>
  );
}
