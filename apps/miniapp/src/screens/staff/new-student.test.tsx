import { miniappMessages as t } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp } from '@lg/ui-tg/testing';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  emptyNewStudent,
  type NewStudentForm,
  newStudentRequest,
  newStudentValid,
} from '../../data/staff-new.js';
import { NewStudentView } from './new-student.js';

afterEach(cleanup);
const c = t.staffNew;
const TODAY = '2026-11-23';
const G = [
  { id: 'g1', name: '1-guruh', course: { id: 'c', name: 'Matematika' } },
  { id: 'g2', name: '2-guruh', course: { id: 'c', name: 'Matematika' } },
];

function Harness(p: { onSave: (f: NewStudentForm) => void }) {
  const [form, setForm] = useState(() => emptyNewStudent(TODAY));
  return (
    <NewStudentView
      today={TODAY}
      groups={G}
      form={form}
      saving={false}
      onForm={setForm}
      onSave={() => p.onSave(form)}
    />
  );
}

describe('MS-04a Yangi oʻquvchi (Q-97)', () => {
  it('ism + guruh tanlanmaguncha MainButton yoʻq; keyin — bitta bosish bilan saqlash', () => {
    const wa = createFakeWebApp();
    const onSave = vi.fn();
    render(
      <TelegramProvider webApp={wa}>
        <Harness onSave={onSave} />
      </TelegramProvider>,
    );
    expect(wa.MainButton.params).not.toMatchObject({ is_visible: true });
    fireEvent.change(screen.getByLabelText(c.fullName), { target: { value: 'Karimov Aziz' } });
    fireEvent.change(screen.getByLabelText(c.guardianPhone), { target: { value: '901234567' } });
    fireEvent.click(screen.getByRole('button', { name: /2-guruh/ }));
    expect(screen.getByLabelText(c.selected)).toBeTruthy();
    expect(wa.MainButton.params).toMatchObject({ is_visible: true, text: c.save });
    wa.MainButton.click();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Karimov Aziz', groupId: 'g2', startDate: TODAY }),
    );
  });

  it('soʻrov: guruh + kelgan sana; ota-ona ismi boʻsh — nomi avtomatik; kelajak sana — yaroqsiz', () => {
    const f = {
      ...emptyNewStudent(TODAY),
      fullName: ' Ali Valiyev ',
      guardianPhone: '901234567',
      groupId: 'g1',
    };
    expect(newStudentRequest(f, false)).toEqual({
      fullName: 'Ali Valiyev',
      phone: null,
      guardians: [
        {
          fullName: 'Ali Valiyev ota-onasi',
          phone: '901234567',
          relation: 'guardian',
          isPrimary: true,
        },
      ],
      enrollment: { groupId: 'g1', startDate: TODAY },
      allowDuplicate: false,
    });
    expect(newStudentValid({ ...f, startDate: '2026-12-01' }, TODAY)).toBe(false);
    expect(newStudentValid({ ...f, guardianName: 'Onasi', guardianPhone: '' }, TODAY)).toBe(false);
    expect(newStudentRequest({ ...f, guardianPhone: '' }, true).guardians).toEqual([]);
  });

  it('ochiq guruh yoʻq — izoh', () => {
    render(
      <TelegramProvider webApp={createFakeWebApp()}>
        <NewStudentView
          today={TODAY}
          groups={[]}
          form={emptyNewStudent(TODAY)}
          saving={false}
          onForm={vi.fn()}
          onSave={vi.fn()}
        />
      </TelegramProvider>,
    );
    expect(screen.getByText(c.noGroups)).toBeTruthy();
  });
});
