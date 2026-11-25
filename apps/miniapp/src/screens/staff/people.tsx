import { STAFF_ROLES, type StaffDetail, type StaffListItem, type StaffRole } from '@lg/contracts';
import { formatDateTime, formatPhone, miniappMessages as t } from '@lg/i18n';
import { CopyField, ListItem, Section, StatusChip, TextField, useMainButton } from '@lg/ui-tg';
import { useState } from 'react';
import { isStaffRole, type PersonForm, personValid } from '../../data/staff-people.js';
import { EmptyRow, Fields, InfoSection, Screen } from './form-kit.js';
import { CallLink, ChoiceSection, ConfirmSheet } from './kit.js';

const c = t.staffPeople;
const TONE = { active: 'success', invited: 'warning', blocked: 'danger' } as const;

const roleNames = (s: Pick<StaffListItem, 'roles'>) => s.roles.map((r) => t.roles[r]).join(', ');

/** MS-31 Xodimlar (T-160). */
export function PeopleView(p: {
  items: readonly StaffListItem[];
  meId: string;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  useMainButton({ text: c.add, onClick: p.onAdd });
  return (
    <Screen title={c.title}>
      <Section>
        {p.items.length === 0 && <EmptyRow text={c.empty} />}
        {p.items.map((s) => (
          <ListItem
            key={s.id}
            title={s.id === p.meId ? `${s.fullName} (${c.you})` : s.fullName}
            subtitle={[
              roleNames(s),
              s.overridesCount > 0 && c.overrides.replace('{n}', String(s.overridesCount)),
            ]
              .filter(Boolean)
              .join(' · ')}
            after={<StatusChip tone={TONE[s.status]}>{c.status[s.status]}</StatusChip>}
            onClick={() => p.onOpen(s.id)}
          />
        ))}
      </Section>
    </Screen>
  );
}

/** Qo'shish va tuzatish formasi. `role` — faqat yangi xodimda. */
export function PersonFormView(p: {
  form: PersonForm;
  role: StaffRole | null;
  /** O'z raqami — o'zgarmaydi. */
  own: boolean;
  saving: boolean;
  onForm: (f: PersonForm) => void;
  onRole: (r: StaffRole) => void;
  onSave: () => void;
}) {
  const isNew = p.role !== null;
  useMainButton({
    text: isNew ? c.add : c.save,
    disabled: !personValid(p.form),
    loading: p.saving,
    onClick: p.onSave,
  });
  const hint = p.own ? c.ownPhoneHint : isNew ? c.phoneHint : c.phoneChangeHint;
  return (
    <Screen title={isNew ? c.add : c.edit}>
      <Fields>
        <TextField
          label={c.fullName}
          autoComplete="off"
          maxLength={120}
          value={p.form.fullName}
          onChange={(e) => p.onForm({ ...p.form, fullName: e.target.value })}
        />
        <TextField
          label={c.phone}
          type="tel"
          inputMode="tel"
          hint={hint}
          disabled={p.own}
          value={p.form.phone}
          onChange={(e) => p.onForm({ ...p.form, phone: e.target.value })}
        />
      </Fields>
      {isNew && (
        <ChoiceSection<StaffRole>
          title={c.role}
          value={p.role}
          options={STAFF_ROLES.map((r) => ({ value: r, label: t.roles[r], hint: c.roleHints[r] }))}
          onChange={p.onRole}
        />
      )}
    </Screen>
  );
}

export type PersonAction =
  | { kind: 'block' | 'unblock' | 'unlink' }
  | { kind: 'addRole'; role: StaffRole }
  | { kind: 'removeRole'; role: 'director' | StaffRole };

export interface PersonProps {
  person: StaffDetail;
  own: boolean;
  canPermissions: boolean;
  /** Asosiy ustoz bo'lgan guruhlar — bloklash/rol olishda ogohlantirish. */
  groups: readonly string[];
  busy: boolean;
  onAction: (a: PersonAction) => void;
  onEdit: () => void;
  onPermissions: () => void;
}

const DANGER = new Set<PersonAction['kind']>(['block', 'unlink', 'removeRole']);

const label = (a: PersonAction): string => {
  if (a.kind === 'addRole') return c.addRole.replace('{role}', t.roles[a.role]);
  if (a.kind === 'removeRole') return c.removeRole.replace('{role}', t.roles[a.role]);
  return c[a.kind];
};

function confirmText(a: PersonAction, groups: readonly string[]): string {
  const text =
    a.kind === 'block'
      ? c.blockTitle
      : a.kind === 'removeRole'
        ? c.removeRoleTitle.replace('{role}', t.roles[a.role])
        : c.unlinkTitle;
  const teaches = a.kind === 'block' || (a.kind === 'removeRole' && a.role === 'teacher');
  return teaches && groups.length > 0
    ? `${text} ${c.teaching.replace('{list}', groups.join(', '))}`
    : text;
}

function actionsOf({ person: s, own }: PersonProps): {
  access: PersonAction[];
  roles: PersonAction[];
} {
  const blocked = s.status === 'blocked';
  const held = s.roles.filter(isStaffRole);
  return {
    access: [
      ...(s.telegramLinked ? [{ kind: 'unlink' } as const] : []),
      ...(own ? [] : [{ kind: blocked ? 'unblock' : 'block' } as const]),
    ],
    roles: [
      ...(blocked ? [] : STAFF_ROLES.filter((r) => !s.roles.includes(r))).map(
        (role) => ({ kind: 'addRole', role }) as const,
      ),
      ...held
        .filter((role) => !(own && role === 'director'))
        .map((role) => ({ kind: 'removeRole', role }) as const),
    ],
  };
}

function Actions(p: PersonProps & { title: string; items: PersonAction[] }) {
  const [ask, setAsk] = useState<PersonAction | null>(null);
  if (p.items.length === 0) return null;
  const tap = (a: PersonAction) => () => {
    if (p.busy) return;
    if (DANGER.has(a.kind)) setAsk(a);
    else p.onAction(a);
  };
  return (
    <>
      <Section title={p.title}>
        {p.items.map((a) => (
          <ListItem
            key={label(a)}
            title={
              <span className={DANGER.has(a.kind) ? 'text-danger' : 'text-link'}>{label(a)}</span>
            }
            onClick={tap(a)}
          />
        ))}
      </Section>
      {ask && (
        <ConfirmSheet
          open
          danger
          title={confirmText(ask, p.groups)}
          action={label(ask)}
          onClose={() => setAsk(null)}
          onConfirm={() => p.onAction(ask)}
        />
      )}
    </>
  );
}

/** MS-31a Xodim kartochkasi: holat, Telegram, rollar, bloklash. */
export function PersonView(p: PersonProps) {
  const s = p.person;
  const actions = actionsOf(p);
  return (
    <Screen title={s.fullName} subtitle={roleNames(s)}>
      <InfoSection
        items={[
          { label: c.phone, value: formatPhone(s.phone) },
          { label: c.telegram, value: s.telegramLinked ? c.linked : c.notLinked },
          {
            label: c.lastLogin,
            value: s.lastLoginAt ? formatDateTime(new Date(s.lastLoginAt)) : '—',
          },
        ]}
      />
      {!p.own && <CallLink phone={s.phone} />}
      {s.botUrl && s.status !== 'blocked' && (
        <>
          <p className="px-2 text-sm text-text-muted">
            {c.howTitle}: {c.how}
          </p>
          <CopyField
            value={s.botUrl}
            caption={c.botLink}
            copyLabel={c.copy}
            copiedLabel={c.copied}
          />
        </>
      )}
      <Section>
        <ListItem title={c.edit} chevron onClick={p.onEdit} />
        {p.canPermissions && !p.own && (
          <ListItem
            title={c.permissions}
            subtitle={
              s.overridesCount > 0
                ? c.overrides.replace('{n}', String(s.overridesCount))
                : undefined
            }
            chevron
            onClick={p.onPermissions}
          />
        )}
      </Section>
      <Actions {...p} title={c.roles} items={actions.roles} />
      <Actions {...p} title={c.access} items={actions.access} />
    </Screen>
  );
}
