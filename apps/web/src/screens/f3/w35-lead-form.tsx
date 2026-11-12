import { webMessages as t } from '@lg/i18n';
import { Button, Card, Field, SelectField } from '@lg/ui-web';
import { CheckCircle, Send } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import type { LandingCourseItem } from './types.js';

const L = t.landing;

export interface LeadInput {
  name: string;
  phone: string;
  courseId: string;
  comment?: string;
}

function LeadFields({
  courses,
  onSubmit,
}: {
  courses: readonly LandingCourseItem[];
  onSubmit: (v: LeadInput) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [comment, setComment] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim() && phone.replace(/\D/g, '').length >= 12) {
      onSubmit({ name: name.trim(), phone, courseId, comment });
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field
        label={L.form.nameLabel}
        placeholder={L.form.namePlaceholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Field
        label={L.form.phoneLabel}
        type="tel"
        placeholder={L.form.phonePlaceholder}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
      />
      {courses.length > 0 && (
        <SelectField
          label={L.form.courseLabel}
          options={courses.map((c) => ({ value: c.id, label: c.title }))}
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
        />
      )}
      <Field
        label={L.form.commentLabel}
        placeholder={L.form.commentPlaceholder}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button type="submit" size="full" className="mt-2">
        <Send className="size-4" aria-hidden />
        {L.form.submit}
      </Button>
    </form>
  );
}

export function LeadForm({
  courses,
  onSubmitLead,
}: {
  courses: readonly LandingCourseItem[];
  onSubmitLead?: (v: LeadInput) => void;
}) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section id="enroll" className="border-t border-border bg-surface-alt/40 px-6 py-16">
      <Card className="mx-auto max-w-xl p-8 shadow-md">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-text">{L.form.title}</h2>
          <p className="mt-1 text-sm text-text-muted">{L.form.subtitle}</p>
        </div>
        {submitted ? (
          <div role="status" className="rounded-lg bg-success-bg p-6 text-center text-success">
            <CheckCircle className="mx-auto size-12" aria-hidden />
            <p className="mt-2 text-base font-bold">{L.form.successTitle}</p>
            <p className="mt-1 text-sm">{L.form.successDesc}</p>
          </div>
        ) : (
          <LeadFields
            courses={courses}
            onSubmit={(v) => {
              onSubmitLead?.(v);
              setSubmitted(true);
            }}
          />
        )}
      </Card>
    </section>
  );
}
