import { type Course, CreateCourseRequest, GRADE_SCALES, type GradeScale } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Field, MoneyField, SelectField } from '@lg/ui-web';
import { type FormEvent, useState } from 'react';
import { errorText } from '../../api/errors.js';
import { fieldErrors, OrgDrawer } from './org-drawer.js';
import { useOrgMutation } from './use-courses.js';

const f = t.courses.form;
const FORM_ID = 'course-form';
const SCALES = GRADE_SCALES.map((s) => ({ value: s, label: f.scales[s] }));
const isScale = (v: string): v is GradeScale => (GRADE_SCALES as readonly string[]).includes(v);

interface Draft {
  name: string;
  description: string;
  levels: string;
  price: bigint | null;
  lessonDurationMin: string;
  durationMonths: string;
  gradeScale: GradeScale;
}

const EMPTY: Draft = {
  name: '',
  description: '',
  levels: '',
  price: null,
  lessonDurationMin: '90',
  durationMonths: '',
  gradeScale: '0_5',
};

const draftOf = (c: Course): Draft => ({
  name: c.name,
  description: c.description ?? '',
  levels: c.levels.join(', '),
  price: BigInt(c.defaultMonthlyPrice),
  lessonDurationMin: String(c.lessonDurationMin),
  durationMonths: c.durationMonths?.toString() ?? '',
  gradeScale: c.gradeScale,
});

/** Forma → so'rov (pul JSON'da string — playbook §5); tekshiruv — API bilan bitta Zod sxema. */
export function courseBody(d: Draft) {
  return CreateCourseRequest.safeParse({
    name: d.name,
    description: d.description.trim() || null,
    levels: d.levels
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
    defaultMonthlyPrice: d.price === null ? '-1' : d.price.toString(),
    lessonDurationMin: Number(d.lessonDurationMin),
    durationMonths: d.durationMonths.trim() === '' ? null : Number(d.durationMonths),
    gradeScale: d.gradeScale,
  });
}

interface FieldsProps {
  d: Draft;
  errors: Partial<Record<keyof typeof f.errors, string>>;
  disabled: boolean;
  set: (patch: Partial<Draft>) => void;
}

function Fields({ d, errors, disabled, set }: FieldsProps) {
  const text = (k: 'name' | 'description' | 'levels' | 'lessonDurationMin' | 'durationMonths') => ({
    value: d[k],
    disabled,
    onChange: (e: { target: { value: string } }) => set({ [k]: e.target.value }),
    error: errors[k],
  });
  return (
    <>
      <Field label={f.name} autoFocus autoComplete="off" {...text('name')} />
      <Field label={f.description} autoComplete="off" {...text('description')} />
      <Field label={f.levels} hint={f.levelsHint} autoComplete="off" {...text('levels')} />
      <fieldset disabled={disabled} className="contents">
        <MoneyField
          label={f.price}
          value={d.price}
          onChange={(price) => set({ price })}
          error={errors.defaultMonthlyPrice}
        />
      </fieldset>
      <Field label={f.lessonDuration} inputMode="numeric" {...text('lessonDurationMin')} />
      <Field
        label={f.durationMonths}
        hint={f.durationHint}
        inputMode="numeric"
        {...text('durationMonths')}
      />
      <SelectField
        label={f.gradeScale}
        options={SCALES}
        value={d.gradeScale}
        disabled={disabled}
        onChange={(e) => isScale(e.target.value) && set({ gradeScale: e.target.value })}
      />
    </>
  );
}

/** W-09: kurs yaratish/tahrirlash/arxivlash (FR-ORG-1). */
export function CourseDrawer({ course, onClose }: { course?: Course; onClose: () => void }) {
  const save = useOrgMutation();
  const [d, setD] = useState(() => (course ? draftOf(course) : EMPTY));
  const [errors, setErrors] = useState<FieldsProps['errors']>({});
  const archived = Boolean(course?.archivedAt);
  const done = { onSuccess: onClose };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = courseBody(d);
    setErrors(parsed.success ? {} : fieldErrors(parsed.error.issues, f.errors));
    if (!parsed.success) return;
    const body = {
      ...parsed.data,
      defaultMonthlyPrice: parsed.data.defaultMonthlyPrice.toString(),
    };
    save.mutate({ kind: 'courses', id: course?.id, body }, done);
  };
  return (
    <OrgDrawer
      title={course ? f.editCourse : f.newCourse}
      formId={FORM_ID}
      existing={course && { name: course.name, archived }}
      pending={save.isPending}
      error={save.isError ? errorText(save.error) : null}
      onArchive={(archive) =>
        course && save.mutate({ kind: 'courses', id: course.id, archive }, done)
      }
      onClose={onClose}
    >
      <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <Fields
          d={d}
          errors={errors}
          disabled={archived}
          set={(patch) => setD((prev) => ({ ...prev, ...patch }))}
        />
      </form>
    </OrgDrawer>
  );
}
