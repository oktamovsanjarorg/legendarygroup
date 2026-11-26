import { errorText } from '@lg/ui-core';
import { useAssistantChat, useAssistantStatus, useRunAction } from '../data/assistant.js';
import { QueryView } from '../data/query-view.js';
import { AssistantView } from '../screens/staff/assistant.js';

/** MS-35 AI yordamchi (Q-114). */
export function StaffAssistantPage() {
  const run = useRunAction();
  const status = useAssistantStatus();
  const chat = useAssistantChat();
  return (
    <QueryView query={status}>
      {(s) => (
        <AssistantView
          enabled={s.enabled}
          entries={chat.entries}
          pending={chat.pending}
          error={chat.error ? errorText(chat.error) : null}
          onAsk={chat.ask}
          onAction={run}
          onClear={chat.clear}
        />
      )}
    </QueryView>
  );
}
