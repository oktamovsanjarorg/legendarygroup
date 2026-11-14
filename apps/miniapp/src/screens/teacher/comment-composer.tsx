import { miniappMessages as t } from '@lg/i18n';
import { Segmented, TextArea, useClosingConfirmation, useMainButton } from '@lg/ui-tg';
import { useState } from 'react';
import type { StudentComment } from './student.js';

interface Props {
  studentName: string;
  saving?: boolean;
  onSave: (text: string, visibility: StudentComment['visibility']) => void;
}

/** MT-06 → izoh yozish (FR-GRD-2): ota-onaga ko'rinadigan yoki ichki. */
export function CommentComposer({ studentName, saving, onSave }: Props) {
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<StudentComment['visibility']>('parent');
  const ready = text.trim().length >= 3;
  useClosingConfirmation(text.trim().length > 0);
  useMainButton({
    text: t.student.saveComment,
    onClick: () => onSave(text.trim(), visibility),
    disabled: !ready,
    loading: saving,
  });
  return (
    <main className="flex flex-col gap-4 p-2 pt-3">
      <h1 className="px-2 text-xl font-semibold text-text">{studentName}</h1>
      <TextArea
        label={t.student.comments}
        placeholder={t.student.commentPlaceholder}
        value={text}
        maxLength={2000}
        onChange={(e) => setText(e.target.value)}
      />
      <Segmented
        label={t.student.comments}
        value={visibility}
        onChange={setVisibility}
        options={[
          { value: 'parent', label: t.student.visibleToParent },
          { value: 'internal', label: t.student.internal },
        ]}
      />
    </main>
  );
}
