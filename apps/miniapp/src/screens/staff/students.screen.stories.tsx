import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { emptyGuardian, studentForm } from '../../data/staff-profile.js';
import { DiscountFormView, DiscountsView } from './discounts.js';
import { PaymentDetailView, PaymentsView, ReverseView } from './payments.js';
import { StudentAccessView, StudentAttendanceView } from './student-access.js';
import { StudentEditView } from './student-edit.js';
import { EnrollmentView, EnrollView, FreezeView, TransferView } from './student-enroll.js';
import { InvoiceView, RefundView, StudentFinanceView } from './student-finance.js';
import { GuardianEditView, GuardianNewView } from './student-guardian.js';
import {
  attendanceItems,
  enrollment,
  finance,
  groupOptions,
  historyItems,
  invoice,
  paymentView,
  studentDetail,
  TODAY,
} from './student-mock.js';

const noop = () => undefined;
const A = { student: studentDetail.fullName, saving: false, onSave: noop };
const meta: Meta = { title: 'miniapp/Xodim/MS-17, MS-23, MS-24 Oʻquvchi va toʻlovlar' };
export default meta;
type Story = StoryObj<typeof meta>;

function Edit() {
  const [f, setF] = useState(() => studentForm(studentDetail));
  return <StudentEditView form={f} today={TODAY} saving={false} onForm={setF} onSave={noop} />;
}
export const MS23_Edit: Story = { render: () => <Edit /> };

function Guardian({ edit }: { edit: boolean }) {
  const [f, setF] = useState({
    ...emptyGuardian,
    phone: '+998901234567',
    fullName: edit ? 'Karimova Zuhra' : '',
  });
  const props = { form: f, saving: false, onForm: setF, onSave: noop };
  if (edit) return <GuardianEditView {...props} onUnlink={noop} />;
  const found = { id: 'g1', fullName: 'Karimova Zuhra', phone: f.phone, children: [] };
  return <GuardianNewView {...props} found={found} />;
}
export const MS23_GuardianNew: Story = { render: () => <Guardian edit={false} /> };
export const MS23_GuardianEdit: Story = { render: () => <Guardian edit /> };

export const MS23_Access: Story = {
  render: () => (
    <StudentAccessView
      student={A.student}
      telegramLinked
      codeSet
      newCode="481920"
      busy={false}
      onGenerate={noop}
      onUnlink={noop}
    />
  ),
};
export const MS23_Attendance: Story = {
  render: () => (
    <StudentAttendanceView
      period="2026-11"
      current="2026-11"
      items={attendanceItems}
      onStep={noop}
    />
  ),
};
export const MS23a_Enrollment: Story = {
  tags: ['primary'],
  render: () => (
    <EnrollmentView
      student={A.student}
      e={enrollment}
      today={TODAY}
      canManage
      busy={false}
      onTransfer={noop}
      onFreeze={noop}
      onLeave={noop}
      onDiscount={noop}
      onFreezeEnd={noop}
      onFreezeCancel={noop}
    />
  ),
};
export const MS23a_Enroll: Story = {
  render: () => <EnrollView {...A} today={TODAY} groups={groupOptions} />,
};
export const MS23a_NoGroups: Story = {
  render: () => <EnrollView {...A} today={TODAY} groups={[]} />,
};
export const MS23a_Transfer: Story = {
  render: () => (
    <TransferView
      {...A}
      fromGroup="IELTS-1"
      minDate="2026-09-01"
      today={TODAY}
      groups={groupOptions}
    />
  ),
};
export const MS23a_Freeze: Story = {
  render: () => <FreezeView {...A} group="IELTS-1" minDate="2026-09-01" today={TODAY} />,
};

const list = {
  period: '2026-11',
  current: '2026-11',
  method: null,
  hasMore: false,
  loadingMore: false,
  onStep: noop,
  onMethod: noop,
  onOpen: noop,
  onMore: noop,
};
export const MS24_Payments: Story = {
  render: () => <PaymentsView {...list} total={600_000n} items={historyItems} />,
};
export const MS24_Empty: Story = {
  render: () => <PaymentsView {...list} total={0n} items={[]} />,
};
export const MS24a_Payment: Story = {
  render: () => (
    <PaymentDetailView v={paymentView} onStudent={noop} onReceipt={noop} onReverse={noop} />
  ),
};
export const MS24a_Reverse: Story = {
  render: () => <ReverseView v={paymentView} saving={false} onSave={noop} />,
};
export const MS24b_Finance: Story = {
  render: () => (
    <StudentFinanceView
      student={A.student}
      f={finance}
      onInvoice={noop}
      onPayment={noop}
      onRefund={noop}
    />
  ),
};
export const MS24b_Invoice: Story = {
  render: () => <InvoiceView invoice={invoice} onWaive={noop} />,
};
export const MS24b_Refund: Story = {
  render: () => <RefundView {...A} advance={120_000n} direct />,
};
export const MS17_Discounts: Story = {
  render: () => (
    <DiscountsView
      items={[
        {
          enrollmentId: 'e1',
          studentId: 's1',
          student: A.student,
          group: 'IELTS-1',
          percent: 10,
          reason: 'Aka-uka oʻqiydi',
          by: 'Aliyeva Nodira',
        },
      ]}
      onOpen={noop}
    />
  ),
};
export const MS17_Form: Story = {
  render: () => <DiscountFormView {...A} group="IELTS-1" initial={10} limit={10} />,
};
