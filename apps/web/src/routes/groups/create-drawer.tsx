import { webMessages as t } from '@lg/i18n';
import { Button, Drawer } from '@lg/ui-web';
import { type FormEvent, useState } from 'react';
import { errorText } from '../../api/errors.js';
import { todayYmd } from '../../lib/today.js';
import {
  type GroupDraft,
  type GroupFormErrors,
  GroupFormFields,
} from '../../screens/f1/group-form.js';
import { conflictTexts, createBody, emptyDraft } from './group-draft.js';
import { type FormOptions, useGroupCall } from './use-groups.js';

const FORM_ID = 'group-create-form';

/** W-10: yangi guruh (FR-ORG-3/4/6) — kurs, ustozlar, xona, haftalik jadval bitta formada. */
export function CreateDrawer({ form, onClose }: { form: FormOptions; onClose: () => void }) {
  const create = useGroupCall();
  const [d, setD] = useState<GroupDraft>(() => emptyDraft(todayYmd()));
  const [errors, setErrors] = useState<GroupFormErrors>({});
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = createBody(d);
    setErrors(r.ok ? {} : r.errors);
    if (r.ok)
      create.mutate({ path: '/groups', method: 'POST', body: r.body }, { onSuccess: onClose });
  };
  const conflicts = conflictTexts(create.error, form.nameOf);
  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button type="submit" form={FORM_ID} loading={create.isPending}>
        {t.groups.form.create}
      </Button>
    </>
  );
  return (
    <Drawer open title={t.groups.new} closeLabel={t.common.close} onClose={onClose} footer={footer}>
      <form id={FORM_ID} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <GroupFormFields
          d={d}
          options={form.options}
          errors={errors}
          conflicts={conflicts}
          set={(patch) => setD((prev) => ({ ...prev, ...patch }))}
        />
        {create.isError && conflicts.length === 0 && (
          <p role="alert" className="text-sm text-danger">
            {errorText(create.error)}
          </p>
        )}
      </form>
    </Drawer>
  );
}
