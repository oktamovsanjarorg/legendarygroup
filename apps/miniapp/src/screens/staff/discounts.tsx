import type { DiscountListItem } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { ListItem, Section, StatusChip, TextArea, TextField, useMainButton } from '@lg/ui-tg';
import { useState } from 'react';
import { parsePercent } from '../../data/staff-payments.js';
import { EmptyRow, Fields, Screen } from './form-kit.js';

const c = t.staffDiscounts;

/** MS-17 Chegirmalar (T-141, BR-18): amaldagilar — sabab va kim bergani. */
export function DiscountsView(p: {
  items: readonly DiscountListItem[];
  onOpen: (d: DiscountListItem) => void;
}) {
  return (
    <Screen title={c.title}>
      <Section>
        {p.items.length === 0 && <EmptyRow text={c.empty} />}
        {p.items.map((d) => (
          <ListItem
            key={d.enrollmentId}
            title={d.student}
            subtitle={[d.group, d.reason, d.by && c.by.replace('{name}', d.by)]
              .filter(Boolean)
              .join(' · ')}
            after={<StatusChip tone="info">{`${d.percent}%`}</StatusChip>}
            onClick={() => p.onOpen(d)}
          />
        ))}
      </Section>
    </Screen>
  );
}

/** Doimiy chegirma: limitdan yuqorisi — Directorga soʻrov. */
export function DiscountFormView(p: {
  student: string;
  group: string;
  initial: number;
  /** `null` — cheklov yoʻq (Director). */
  limit: number | null;
  saving: boolean;
  onSave: (v: { percent: number; reason: string; direct: boolean }) => void;
}) {
  const [text, setText] = useState(String(p.initial));
  const [reason, setReason] = useState('');
  const percent = parsePercent(text);
  const direct = p.limit === null || percent === null || percent <= p.limit;
  useMainButton({
    text: direct ? c.save : c.sendRequest,
    disabled: percent === null || percent === p.initial || reason.trim().length < 3,
    loading: p.saving,
    onClick: () => percent !== null && p.onSave({ percent, reason: reason.trim(), direct }),
  });
  const hints = [p.limit === null ? null : c.limit.replace('{n}', String(p.limit)), c.nextMonth];
  return (
    <Screen title={c.formTitle} subtitle={`${p.student} · ${p.group}`}>
      <Fields footer={hints.filter(Boolean).join(' ')}>
        <TextField
          label={c.percent}
          inputMode="numeric"
          maxLength={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <TextArea
          label={c.reason}
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Fields>
    </Screen>
  );
}
