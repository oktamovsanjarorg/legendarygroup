import { errorText } from '../../api/errors.js';
import { ConflictList } from '../../screens/f1/group-form.js';
import { conflictTexts } from './group-draft.js';

export { Section } from '../../components/panel-section.js';

/** Amal xatosi: to'qnashuv bo'lsa — tushunarli ro'yxat (FR-ORG-6), aks holda server matni. */
export function ActionError({
  error,
  nameOf,
}: {
  error: unknown;
  nameOf: (id: string) => string | undefined;
}) {
  if (!error) return null;
  const conflicts = conflictTexts(error, nameOf);
  if (conflicts.length > 0) return <ConflictList conflicts={conflicts} />;
  return (
    <p role="alert" className="text-sm text-danger">
      {errorText(error)}
    </p>
  );
}
