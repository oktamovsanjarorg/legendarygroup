import { CreateRoomRequest, type Room } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Field } from '@lg/ui-web';
import { type FormEvent, useState } from 'react';
import { errorText } from '../../api/errors.js';
import { fieldErrors, OrgDrawer } from './org-drawer.js';
import { useOrgMutation } from './use-courses.js';

const f = t.courses.form;
const FORM_ID = 'room-form';
const TEXTS = { name: f.errors.name, capacity: f.errors.capacity };

/** W-09: xona yaratish/tahrirlash/arxivlash (FR-ORG-2). */
export function RoomDrawer({ room, onClose }: { room?: Room; onClose: () => void }) {
  const save = useOrgMutation();
  const [name, setName] = useState(room?.name ?? '');
  const [capacity, setCapacity] = useState(room?.capacity.toString() ?? '');
  const [errors, setErrors] = useState<Partial<Record<keyof typeof TEXTS, string>>>({});
  const archived = Boolean(room?.archivedAt);
  const done = { onSuccess: onClose };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = CreateRoomRequest.safeParse({ name, capacity: Number(capacity) });
    setErrors(parsed.success ? {} : fieldErrors(parsed.error.issues, TEXTS));
    if (parsed.success) save.mutate({ kind: 'rooms', id: room?.id, body: parsed.data }, done);
  };
  return (
    <OrgDrawer
      title={room ? f.editRoom : f.newRoom}
      formId={FORM_ID}
      existing={room && { name: room.name, archived }}
      pending={save.isPending}
      error={save.isError ? errorText(save.error) : null}
      onArchive={(archive) => room && save.mutate({ kind: 'rooms', id: room.id, archive }, done)}
      onClose={onClose}
    >
      <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <Field
          label={f.name}
          autoFocus
          autoComplete="off"
          disabled={archived}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <Field
          label={f.capacity}
          inputMode="numeric"
          disabled={archived}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          error={errors.capacity}
        />
      </form>
    </OrgDrawer>
  );
}
