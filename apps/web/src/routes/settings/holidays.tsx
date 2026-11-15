import type { HolidayDto } from '@lg/contracts';
import { formatYmd, webMessages as t } from '@lg/i18n';
import { Button, Field } from '@lg/ui-web';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api/client.js';
import { errorText } from '../../api/errors.js';

const s = t.settings;

function HolidayList({
  items,
  onRemove,
}: {
  items: readonly HolidayDto[];
  onRemove: (date: string) => void;
}) {
  return (
    <ul className="flex flex-col divide-y divide-border text-sm">
      {items.length === 0 && <li className="py-2 text-text-muted">{s.holidaysEmpty}</li>}
      {items.map((h) => (
        <li key={h.date} className="flex items-center justify-between py-2">
          <span>
            <span className="tabular-nums text-text-muted">{formatYmd(h.date)}</span> · {h.name}
          </span>
          <Button size="sm" variant="ghost" onClick={() => onRemove(h.date)}>
            {s.holidayRemove}
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** W-29 "Bayramlar" (BR-5): yil bo'yicha ro'yxat, qo'shish va olib tashlash. */
export function HolidaysSection({ year }: { year: number }) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['holidays', year],
    queryFn: () => api.request<HolidayDto[]>(`/holidays?year=${year}`),
  });
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const done = () => void qc.invalidateQueries({ queryKey: ['holidays'] });
  const add = useMutation({
    mutationFn: () =>
      api.request('/holidays', { method: 'POST', body: { date, name: name.trim() } }),
    onSuccess: () => {
      setDate('');
      setName('');
      done();
    },
  });
  const remove = useMutation({
    mutationFn: (d: string) => api.request(`/holidays/${d}`, { method: 'DELETE' }),
    onSuccess: done,
  });
  const err = add.error ?? remove.error;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-muted">{s.holidaysHint}</p>
      <HolidayList items={list.data ?? []} onRemove={(d) => remove.mutate(d)} />
      <div className="grid grid-cols-[10rem_1fr_auto] items-end gap-2">
        <Field
          label={s.holidayDate}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Field label={s.holidayName} value={name} onChange={(e) => setName(e.target.value)} />
        <Button
          disabled={!date || name.trim().length < 2}
          loading={add.isPending}
          onClick={() => add.mutate()}
        >
          {s.holidayAdd}
        </Button>
      </div>
      {err && (
        <p role="alert" className="text-sm text-danger">
          {errorText(err)}
        </p>
      )}
    </div>
  );
}
