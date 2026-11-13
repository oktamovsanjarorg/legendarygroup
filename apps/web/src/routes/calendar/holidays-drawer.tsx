import { CreateHolidayRequest, type HolidayDto } from '@lg/contracts';
import { formatYmd, webMessages as t } from '@lg/i18n';
import { Button, Drawer, ErrorState, Field, LoadingState } from '@lg/ui-web';
import { type FormEvent, useState } from 'react';
import { errorView } from '../../api/errors.js';
import { FormError } from '../../components/panel-section.js';
import { useLessonCall, useYearHolidays } from './use-calendar.js';

const h = t.calendar.holidayForm;

function AddForm({ year }: { year: string }) {
  const save = useLessonCall();
  const [date, setDate] = useState(`${year}-01-01`);
  const [name, setName] = useState('');
  const [invalid, setInvalid] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = CreateHolidayRequest.safeParse({ date, name });
    setInvalid(!body.success);
    if (body.success)
      save.mutate(
        { path: '/holidays', method: 'POST', body: body.data },
        { onSuccess: () => setName('') },
      );
  };
  return (
    <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <Field label={h.date} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Field label={h.name} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {invalid && (
        <p role="alert" className="text-sm text-danger">
          {h.invalid}
        </p>
      )}
      <FormError error={save.error} />
      <Button type="submit" size="sm" className="self-end" loading={save.isPending}>
        {h.add}
      </Button>
    </form>
  );
}

function Row({ item, canManage }: { item: HolidayDto; canManage: boolean }) {
  const remove = useLessonCall();
  const date = formatYmd(item.date);
  const confirm = () =>
    window.confirm(h.confirmRemove.replace('{name}', item.name).replace('{date}', date)) &&
    remove.mutate({ path: `/holidays/${item.date}`, method: 'DELETE' });
  return (
    <li className="flex items-center gap-3 py-2 text-sm text-text">
      <span className="tabular-nums text-text-muted">{date}</span>
      <span className="flex-1">{item.name}</span>
      {canManage && (
        <Button variant="ghost" size="sm" loading={remove.isPending} onClick={confirm}>
          {h.remove}
        </Button>
      )}
    </li>
  );
}

interface Props {
  year: string;
  canManage: boolean;
  onClose: () => void;
}

/** W-11: yil bayramlari (FR-ORG-5) — bayram kunidagi darslar avtomatik bekor qilinadi. */
export function HolidaysDrawer({ year, canManage, onClose }: Props) {
  const list = useYearHolidays(year);
  return (
    <Drawer open title={`${h.title} — ${year}`} closeLabel={t.common.close} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">{h.hint}</p>
        {canManage && <AddForm year={year} />}
        {list.isPending ? (
          <LoadingState rows={3} />
        ) : list.isError ? (
          <ErrorState {...errorView(list.error, () => void list.refetch())} />
        ) : list.data.length === 0 ? (
          <p className="text-sm text-text-muted">{h.empty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {list.data.map((item) => (
              <Row key={item.date} item={item} canManage={canManage} />
            ))}
          </ul>
        )}
      </div>
    </Drawer>
  );
}
