import { miniappMessages as t } from '@lg/i18n';
import { useHaptic } from '@lg/ui-tg';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useClock } from '../data/deps.js';
import { QueryView } from '../data/query-view.js';
import { type StaffCall, useStaffCall } from '../data/staff-call.js';
import { shiftPeriod } from '../data/staff-finance.js';
import { useGroups } from '../data/staff-org.js';
import {
  advanceBody,
  type AdvanceForm,
  contractBody,
  defaultPeriod,
  emptyContract,
  runPhase,
  useAdvances,
  useContracts,
  usePayrollRun,
  usePayrollStaff,
} from '../data/staff-payroll.js';
import { AdvanceNewView, AdvancesView } from '../screens/staff/advances.js';
import { PayrollAdjustView, PayrollTeacherView, PayrollView } from '../screens/staff/payroll.js';
import { ContractNewView, ContractsView, ContractView } from '../screens/staff/payroll-terms.js';
import { useMe } from '../session/session.js';
import { ErrorNotice } from './notice.js';

/** Amal + muvaffaqiyatda qaytish. */
function useCallThen(to: () => void) {
  const call = useStaffCall();
  const haptic = useHaptic();
  return {
    call,
    run: (x: StaffCall) =>
      call.mutate(x, {
        onSuccess: () => {
          haptic.success();
          to();
        },
        onError: () => haptic.error(),
      }),
  };
}

function Run({ period }: { period: string }) {
  const navigate = useNavigate();
  const today = useClock().today();
  const { permissions } = useMe();
  const { call, run: send } = useCallThen(() => undefined);
  const query = usePayrollRun(period);
  return (
    <>
      <ErrorNotice error={call.error} />
      <QueryView query={query}>
        {(run) => (
          <PayrollView
            run={run}
            phase={runPhase(run, period, today)}
            period={period}
            current={today.slice(0, 7)}
            canApprove={permissions.includes('approval.decide')}
            busy={call.isPending}
            onStep={(s) =>
              void navigate({
                to: '/staff/payroll/run/$period',
                params: { period: shiftPeriod(period, s) },
                replace: true,
              })
            }
            onAction={(a) =>
              send(
                a === 'generate'
                  ? { path: '/payroll/runs/generate', body: { period } }
                  : { path: `/payroll/runs/${run?.id ?? ''}/${a}` },
              )
            }
            onTeacher={(teacherId) =>
              void navigate({
                to: '/staff/payroll/run/$period/$teacherId',
                params: { period, teacherId },
              })
            }
            onContracts={() => void navigate({ to: '/staff/payroll/contracts' })}
            onAdvances={() => void navigate({ to: '/staff/payroll/advances' })}
            onAdjust={() =>
              void navigate({ to: '/staff/payroll/run/$period/bonus', params: { period } })
            }
          />
        )}
      </QueryView>
    </>
  );
}

/** MS-28 Oyliklar (T-157). */
export function StaffPayrollPage() {
  return <Run period={defaultPeriod(useClock().today())} />;
}

export function StaffPayrollRunPage() {
  const { period } = useParams({ from: '/staff/payroll/run/$period' });
  return <Run key={period} period={period} />;
}

export function StaffPayrollTeacherPage() {
  const { period, teacherId } = useParams({ from: '/staff/payroll/run/$period/$teacherId' });
  const navigate = useNavigate();
  const { call, run: send } = useCallThen(() => undefined);
  return (
    <QueryView query={usePayrollRun(period)}>
      {(run) => {
        const summary = run?.teachers.find((s) => s.teacherId === teacherId);
        if (!run || !summary) return <p className="p-4 text-text-muted">{t.staffPayroll.notYet}</p>;
        return (
          <>
            <ErrorNotice error={call.error} />
            <PayrollTeacherView
              period={period}
              summary={summary}
              draft={run.status === 'draft'}
              busy={call.isPending}
              onAdjust={() =>
                void navigate({
                  to: '/staff/payroll/run/$period/$teacherId/bonus',
                  params: { period, teacherId },
                })
              }
              onRemove={(i) =>
                send({ path: `/payroll/runs/${run.id}/adjustments/${i.id}`, method: 'DELETE' })
              }
            />
          </>
        );
      }}
    </QueryView>
  );
}

function Adjust({ period, teacherId }: { period: string; teacherId: string | null }) {
  const navigate = useNavigate();
  const staff = usePayrollStaff();
  const { call, run: send } = useCallThen(() =>
    teacherId
      ? void navigate({
          to: '/staff/payroll/run/$period/$teacherId',
          params: { period, teacherId },
          replace: true,
        })
      : void navigate({ to: '/staff/payroll/run/$period', params: { period }, replace: true }),
  );
  return (
    <QueryView query={usePayrollRun(period)}>
      {(run) => (
        <>
          <ErrorNotice error={call.error ?? staff.error} />
          <PayrollAdjustView
            period={period}
            staff={staff.data ?? []}
            teacherId={teacherId}
            saving={call.isPending}
            onSave={(body) => run && send({ path: `/payroll/runs/${run.id}/adjustments`, body })}
          />
        </>
      )}
    </QueryView>
  );
}

export function StaffPayrollBonusPage() {
  const { period } = useParams({ from: '/staff/payroll/run/$period/bonus' });
  return <Adjust period={period} teacherId={null} />;
}

export function StaffPayrollTeacherBonusPage() {
  const { period, teacherId } = useParams({ from: '/staff/payroll/run/$period/$teacherId/bonus' });
  return <Adjust period={period} teacherId={teacherId} />;
}

export function StaffContractsPage() {
  const navigate = useNavigate();
  const today = useClock().today();
  return (
    <QueryView query={useContracts()}>
      {(items) => (
        <ContractsView
          items={items}
          today={today}
          onAdd={() => void navigate({ to: '/staff/payroll/contracts/new' })}
          onOpen={(id) => void navigate({ to: '/staff/payroll/contracts/$id', params: { id } })}
        />
      )}
    </QueryView>
  );
}

export function StaffContractPage() {
  const { id } = useParams({ from: '/staff/payroll/contracts/$id' });
  const navigate = useNavigate();
  const today = useClock().today();
  const { call, run: send } = useCallThen(
    () => void navigate({ to: '/staff/payroll/contracts', replace: true }),
  );
  return (
    <QueryView query={useContracts()}>
      {(items) => {
        const contract = items.find((x) => x.id === id);
        if (!contract) return <p className="p-4 text-text-muted">{t.staffContracts.empty}</p>;
        return (
          <>
            <ErrorNotice error={call.error} />
            <ContractView
              key={contract.id}
              contract={contract}
              today={today}
              busy={call.isPending}
              onEnd={(validTo) => send({ path: `/payroll/contracts/${id}/end`, body: { validTo } })}
              onRemove={() => send({ path: `/payroll/contracts/${id}`, method: 'DELETE' })}
            />
          </>
        );
      }}
    </QueryView>
  );
}

export function StaffContractNewPage() {
  const navigate = useNavigate();
  const today = useClock().today();
  const [form, setForm] = useState(() => emptyContract(today));
  const groups = useGroups();
  const { call, run: send } = useCallThen(
    () => void navigate({ to: '/staff/payroll/contracts', replace: true }),
  );
  return (
    <QueryView query={usePayrollStaff()}>
      {(staff) => (
        <>
          <ErrorNotice error={call.error ?? groups.error} />
          <ContractNewView
            form={form}
            staff={staff}
            groups={groups.data ?? []}
            saving={call.isPending}
            onForm={setForm}
            onSave={() => {
              const body = contractBody(form);
              if (body) send({ path: '/payroll/contracts', body });
            }}
          />
        </>
      )}
    </QueryView>
  );
}

export function StaffAdvancesPage() {
  const navigate = useNavigate();
  const { call, run: send } = useCallThen(() => undefined);
  return (
    <>
      <ErrorNotice error={call.error} />
      <QueryView query={useAdvances()}>
        {(items) => (
          <AdvancesView
            items={items}
            onAdd={() => void navigate({ to: '/staff/payroll/advances/new' })}
            onRemove={(id) => send({ path: `/payroll/advances/${id}`, method: 'DELETE' })}
          />
        )}
      </QueryView>
    </>
  );
}

export function StaffAdvanceNewPage() {
  const navigate = useNavigate();
  const today = useClock().today();
  const [form, setForm] = useState<AdvanceForm>({
    teacherId: null,
    amount: null,
    date: today,
    note: '',
  });
  const { call, run: send } = useCallThen(
    () => void navigate({ to: '/staff/payroll/advances', replace: true }),
  );
  return (
    <QueryView query={usePayrollStaff()}>
      {(staff) => (
        <>
          <ErrorNotice error={call.error} />
          <AdvanceNewView
            form={form}
            staff={staff}
            today={today}
            saving={call.isPending}
            onForm={setForm}
            onSave={() => {
              const body = advanceBody(form, today);
              if (body) send({ path: '/payroll/advances', body });
            }}
          />
        </>
      )}
    </QueryView>
  );
}
