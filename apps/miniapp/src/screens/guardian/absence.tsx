import { miniappMessages as t } from '@lg/i18n';
import {
  ChildSwitcher,
  type ChildTab,
  Segmented,
  StateShell,
  TextArea,
  useMainButton,
} from '@lg/ui-tg';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export type AbsenceDay = 'today' | 'tomorrow';

interface Props {
  childTabs: readonly ChildTab[];
  initialChild: string;
  sending?: boolean;
  sent?: boolean;
  onSend: (v: { childId: string; day: AbsenceDay; reason: string }) => void;
}

/** MG-08 Kela olmaydi (FR-ATT-7): ustoz ro'yxatida "sababli" ko'rinadi (MT-02). */
export function AbsenceView({ childTabs, initialChild, sending, sent, onSend }: Props) {
  const [childId, setChild] = useState(initialChild);
  const [day, setDay] = useState<AbsenceDay>('tomorrow');
  const [reason, setReason] = useState('');
  useMainButton({
    text: t.absence.send,
    onClick: () => onSend({ childId, day, reason: reason.trim() }),
    disabled: reason.trim().length < 3,
    loading: sending,
    visible: !sent,
  });
  if (sent)
    return (
      <StateShell
        icon={<CheckCircle2 className="size-10 text-success" aria-hidden />}
        title={t.absence.sent}
      />
    );
  return (
    <main className="flex flex-col gap-4 p-2 pt-3">
      <header className="px-2">
        <h1 className="text-xl font-semibold text-text">{t.absence.title}</h1>
        <p className="text-sm text-text-muted">{t.absence.hint}</p>
      </header>
      <ChildSwitcher
        items={childTabs}
        selected={childId}
        onSelect={setChild}
        label={t.absence.title}
      />
      <Segmented
        label={t.absence.day}
        value={day}
        onChange={setDay}
        options={[
          { value: 'today', label: t.absence.today },
          { value: 'tomorrow', label: t.absence.tomorrow },
        ]}
      />
      <TextArea
        label={t.absence.reason}
        placeholder={t.absence.reasonPlaceholder}
        value={reason}
        maxLength={500}
        onChange={(e) => setReason(e.target.value)}
      />
    </main>
  );
}
