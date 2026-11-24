import { EXPENSE_CATEGORIES } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import {
  type FilePickState,
  FilePicker,
  InlineButton,
  ListItem,
  MoneyInput,
  Section,
  TextArea,
  TextField,
  useMainButton,
} from '@lg/ui-tg';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { type ExpenseForm, expenseReady } from '../../data/staff-finance.js';
import { ChoiceSection, ConfirmSheet } from './kit.js';

const c = t.fin;

export interface ExpenseViewProps {
  title: string;
  today: string;
  form: ExpenseForm;
  saving: boolean;
  onForm: (f: ExpenseForm) => void;
  onSave: () => void;
  file: FilePickState;
  onPickFile: () => void;
  /** Saqlangan chek bor. */
  onOpenFile?: () => void;
  /** Tahrirlashda. */
  onDelete?: () => void;
}

function Receipt({ p }: { p: ExpenseViewProps }) {
  return (
    <>
      <FilePicker
        label={c.receipt}
        state={p.file}
        pickLabel={c.pickReceipt}
        replaceLabel={c.replaceReceipt}
        uploadingLabel={t.staffKit.uploading}
        onPick={p.onPickFile}
      />
      {p.onOpenFile && <InlineButton onClick={p.onOpenFile}>{c.openReceipt}</InlineButton>}
    </>
  );
}

/** MS-18 Xarajat (T-142, FR-FIN-1): summa → turi → sana → MainButton. */
export function ExpenseView(p: ExpenseViewProps) {
  const { form, onForm } = p;
  const [confirm, setConfirm] = useState(false);
  useMainButton({
    text: c.save,
    // Chek yuklanayotganda saqlansa — cheksiz qolardi.
    disabled: !expenseReady(form, p.today) || p.file.kind === 'uploading',
    loading: p.saving,
    onClick: p.onSave,
  });
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <h1 className="px-2 text-xl font-semibold text-text">{p.title}</h1>
      <MoneyInput
        label={c.amount}
        value={form.amount}
        onChange={(amount) => onForm({ ...form, amount })}
      />
      <ChoiceSection
        title={c.category}
        footer={c.salaryHint}
        value={form.category}
        options={EXPENSE_CATEGORIES.map((k) => ({ value: k, label: c.categories[k] }))}
        onChange={(category) => onForm({ ...form, category })}
      />
      <TextField
        label={c.date}
        type="date"
        max={p.today}
        value={form.date}
        onChange={(e) => onForm({ ...form, date: e.target.value })}
      />
      <TextArea
        label={c.note}
        rows={2}
        maxLength={1000}
        value={form.note}
        onChange={(e) => onForm({ ...form, note: e.target.value })}
      />
      <Receipt p={p} />
      {p.onDelete && (
        <Section>
          <ListItem
            before={<Trash2 className="size-5 text-danger" aria-hidden />}
            title={<span className="text-danger">{c.remove}</span>}
            onClick={() => setConfirm(true)}
          />
        </Section>
      )}
      <ConfirmSheet
        open={confirm}
        title={c.removeTitle}
        action={c.remove}
        danger
        onClose={() => setConfirm(false)}
        onConfirm={() => p.onDelete?.()}
      />
    </main>
  );
}
