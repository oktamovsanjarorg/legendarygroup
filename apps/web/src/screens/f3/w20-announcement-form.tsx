import { ANNOUNCEMENT_TARGET_TYPES, type AnnouncementTargetType } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, Drawer, Field, SelectField } from '@lg/ui-web';
import { Eye, Send } from 'lucide-react';
import { useState } from 'react';

const f = t.announcements.form;
type Option = { value: string; label: string };

export interface AnnouncementDraft {
  title: string;
  body: string;
  target: AnnouncementTargetType;
  targetId: string | null;
}

export interface FormProps {
  courses: readonly Option[];
  groups: readonly Option[];
  /** Tanlangan auditoriyadagi qabul qiluvchilar soni (server preview); `null` — yuklanmoqda. */
  recipients: number | null;
  onAudience: (target: AnnouncementTargetType, targetId: string | null) => void;
  onSend: (d: AnnouncementDraft) => void;
  onClose: () => void;
  sending?: boolean;
  error?: string;
}

const isTarget = (v: string): v is AnnouncementTargetType =>
  (ANNOUNCEMENT_TARGET_TYPES as readonly string[]).includes(v);
const needsId = (x: AnnouncementTargetType) => x === 'course' || x === 'group';

function Preview({
  title,
  body,
  recipients,
}: {
  title: string;
  body: string;
  recipients: number | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-alt/50 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-muted">
        <Eye className="size-3.5" aria-hidden />
        {f.previewTelegram}
      </div>
      <div className="rounded-lg border border-border/40 bg-surface p-3 shadow-sm">
        <p className="font-semibold text-text">{title || f.previewTitle}</p>
        <p className="mt-1 whitespace-pre-wrap text-xs text-text-muted">{body || f.previewBody}</p>
      </div>
      {recipients !== null && (
        <p className="mt-2 text-xs text-text-muted">
          {recipients > 0 ? f.recipients.replace('{n}', String(recipients)) : f.noRecipients}
        </p>
      )}
    </div>
  );
}

function useDraft(onAudience: FormProps['onAudience']) {
  const [d, setD] = useState<AnnouncementDraft>({
    title: '',
    body: '',
    target: 'all',
    targetId: null,
  });
  const [errors, setErrors] = useState<{ title?: string; body?: string; targetId?: string }>({});
  const audience = (target: AnnouncementTargetType, targetId: string | null) => {
    setD((x) => ({ ...x, target, targetId }));
    onAudience(target, targetId);
  };
  const validate = () => {
    const e = {
      title: d.title.trim().length < 3 ? f.titleShort : undefined,
      body: d.body.trim().length < 5 ? f.bodyShort : undefined,
      targetId: needsId(d.target) && !d.targetId ? f.targetRequired : undefined,
    };
    setErrors(e);
    return !e.title && !e.body && !e.targetId;
  };
  return { d, setD, errors, audience, validate };
}

/** W-20 yangi e'lon: auditoriya → matn → Telegram ko'rinishi va qabul qiluvchilar soni. */
export function AnnouncementFormDrawer(p: FormProps) {
  const { d, setD, errors, audience, validate } = useDraft(p.onAudience);
  const options = d.target === 'course' ? p.courses : p.groups;
  const send = () => validate() && p.onSend({ ...d, title: d.title.trim(), body: d.body.trim() });
  return (
    <Drawer open title={f.title} closeLabel={t.common.cancel} onClose={p.onClose}>
      <div className="flex flex-col gap-4 text-sm">
        <SelectField
          label={t.announcements.audience}
          options={ANNOUNCEMENT_TARGET_TYPES.map((x) => ({
            value: x,
            label: t.announcements.audiences[x],
          }))}
          value={d.target}
          onChange={(e) => isTarget(e.target.value) && audience(e.target.value, null)}
        />
        {needsId(d.target) && (
          <SelectField
            label={d.target === 'course' ? f.courseLabel : f.groupLabel}
            options={[{ value: '', label: '—' }, ...options]}
            value={d.targetId ?? ''}
            error={errors.targetId}
            onChange={(e) => audience(d.target, e.target.value || null)}
          />
        )}
        <Field
          label={f.titleLabel}
          value={d.title}
          error={errors.title}
          onChange={(e) => setD((x) => ({ ...x, title: e.target.value }))}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ann-body" className="text-sm font-medium text-text">
            {f.bodyLabel}
          </label>
          <textarea
            id="ann-body"
            rows={5}
            value={d.body}
            onChange={(e) => setD((x) => ({ ...x, body: e.target.value }))}
            placeholder={f.bodyPlaceholder}
            className="rounded-md border border-border bg-bg p-2.5 text-sm outline-none focus:border-primary"
          />
          {errors.body && <span className="text-xs text-danger">{errors.body}</span>}
        </div>
        <Preview title={d.title} body={d.body} recipients={p.recipients} />
        {p.error && (
          <p role="alert" className="text-danger">
            {p.error}
          </p>
        )}
        <Button onClick={send} loading={p.sending} disabled={p.recipients === 0}>
          <Send className="size-4" aria-hidden />
          {f.send}
        </Button>
      </div>
    </Drawer>
  );
}
