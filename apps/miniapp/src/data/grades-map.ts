import {
  GRADED_KINDS,
  type GradedKind,
  type GradeItemInput,
  type LessonGradesResponse,
} from '@lg/contracts';

const isKind = (k: string): k is GradedKind => (GRADED_KINDS as readonly string[]).includes(k);

/** `studentId:kind` → baho. */
export type GradeValues = Readonly<Record<string, number>>;

export const gradeKey = (studentId: string, kind: GradedKind) => `${studentId}:${kind}`;

export interface LessonGrades {
  scale: LessonGradesResponse['scale'];
  kinds: readonly GradedKind[];
  saved: GradeValues;
  date: string;
}

export function lessonGrades(r: LessonGradesResponse): LessonGrades {
  return {
    scale: r.scale,
    kinds: r.allowedKinds.filter(isKind),
    saved: Object.fromEntries(r.grades.map((g) => [gradeKey(g.studentId, g.kind), g.value])),
    date: r.date,
  };
}

/** Faqat o'zgargan baholar yuboriladi (saqlanganlari qayta yozilmaydi). */
export function changedGrades(saved: GradeValues, next: GradeValues): GradeItemInput[] {
  return Object.entries(next)
    .filter(([k, v]) => saved[k] !== v)
    .map(([k, value]) => {
      const [studentId = '', kind] = k.split(':') as [string, GradedKind];
      return { studentId, kind, value };
    });
}
