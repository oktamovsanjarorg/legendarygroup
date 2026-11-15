import type { AttendanceStatus } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, Drawer, Field } from '@lg/ui-web';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, ApiError } from '../../api/client.js';
import { errorText } from '../../api/errors.js';

const g = t.attendanceGrid;
const STATUSES = [
  'present',
  'absent',
  'late',
  'excused',
] as const satisfies readonly AttendanceStatus[];

export interface CellTarget {
  lessonId: string;
  lessonDate: string;
  studentId: string;
  name: string;
  label: string;
}

type Save = { status: AttendanceStatus; reason: string; request: boolean };

function useMark(c: CellTarget) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ status, reason, request }: Save) =>
      request
        ? api.request('/approvals', {
            method: 'POST',
            body: {
              type: 'attendance_edit',
              payload: { lessonId: c.lessonId, studentId: c.studentId, status, reason },
              reason,
            },
          })
        : api.request(`/attendance/lessons/${c.lessonId}`, {
            method: 'POST',
            body: {
              items: [{ studentId: c.studentId, status }],
              ...(reason ? { changeReason: reason } : {}),
            },
          }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['attendance'] }),
  });
}

/** W-12 katak: holat tanlash; o'tgan kun — sabab; yopilgan oy (BR-30) — Director'ga so'rov. */
export function MarkDrawer({
  c,
  today,
  onDone,
  onClose,
}: {
  c: CellTarget;
  today: string;
  onDone: (message?: string) => void;
  onClose: () => void;
}) {
  const mark = useMark(c);
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [reason, setReason] = useState('');
  const past = c.lessonDate < today;
  const locked = mark.error instanceof ApiError && mark.error.code === 'ATTENDANCE_LOCKED_PAST';
  const save = (request: boolean) =>
    mark.mutate(
      { status, reason: reason.trim(), request },
      { onSuccess: () => onDone(request ? g.requestSent : undefined) },
    );
  const blocked = past && reason.trim().length < 3;
  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        {t.common.cancel}
      </Button>
      {locked ? (
        <Button disabled={blocked} loading={mark.isPending} onClick={() => save(true)}>
          {g.sendRequest}
        </Button>
      ) : (
        <Button disabled={blocked} loading={mark.isPending} onClick={() => save(false)}>
          {g.save}
        </Button>
      )}
    </>
  );
  return (
    <Drawer
      open
      title={g.cellTitle.replace('{name}', c.name).replace('{date}', c.label)}
      closeLabel={t.common.close}
      onClose={onClose}
      footer={footer}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {STATUSES.map((s) => (
            <Button
              key={s}
              role="radio"
              aria-checked={s === status}
              variant={s === status ? 'primary' : 'secondary'}
              onClick={() => setStatus(s)}
            >
              {g.marks[s]}
            </Button>
          ))}
        </div>
        {past && (
          <Field
            label={g.reason}
            hint={g.reasonHint}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
        {mark.isError && (
          <p role="alert" className="text-sm text-danger">
            {locked ? g.lockedPast : errorText(mark.error)}
          </p>
        )}
      </div>
    </Drawer>
  );
}
