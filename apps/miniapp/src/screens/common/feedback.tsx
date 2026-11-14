import { miniappMessages as t } from '@lg/i18n';
import { ListItem, Section, StateShell, TextArea, useMainButton } from '@lg/ui-tg';
import { CheckCircle2, ImagePlus } from 'lucide-react';
import { useState } from 'react';

interface Props {
  sending?: boolean;
  sent?: boolean;
  /** Ekran rasmi (FilePicker — T-019) nomi. */
  screenshotName?: string;
  onAttach: () => void;
  onSend: (text: string) => void;
}

/** C-05 Fikr-mulohaza (T-118): matn + ixtiyoriy skrinshot; kontekst avtomatik. */
export function FeedbackView({ sending, sent, screenshotName, onAttach, onSend }: Props) {
  const [text, setText] = useState('');
  useMainButton({
    text: t.feedback.send,
    onClick: () => onSend(text.trim()),
    disabled: text.trim().length < 3,
    loading: sending,
    visible: !sent,
  });
  if (sent)
    return (
      <StateShell
        icon={<CheckCircle2 className="size-10 text-success" aria-hidden />}
        title={t.feedback.sent}
      />
    );
  return (
    <main className="flex flex-col gap-4 p-2 pt-3">
      <header className="px-2">
        <h1 className="text-xl font-semibold text-text">{t.feedback.title}</h1>
        <p className="text-sm text-text-muted">{t.feedback.hint}</p>
      </header>
      <TextArea
        label={t.feedback.title}
        placeholder={t.feedback.placeholder}
        value={text}
        maxLength={4000}
        onChange={(e) => setText(e.target.value)}
      />
      <Section footer={t.feedback.context}>
        <ListItem
          before={<ImagePlus className="size-5" aria-hidden />}
          title={screenshotName ?? <span className="text-link">{t.feedback.screenshot}</span>}
          onClick={onAttach}
        />
      </Section>
    </main>
  );
}
