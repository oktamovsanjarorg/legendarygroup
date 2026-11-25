import type { Course, CreateCourseRequest, GradeScale } from '@lg/contracts';

/** MS-21 kurs formasi. */
export interface CourseForm {
  name: string;
  price: bigint | null;
  duration: string;
  months: string;
  scale: GradeScale;
  levels: string;
  description: string;
}

export const emptyCourse: CourseForm = {
  name: '',
  price: null,
  duration: '90',
  months: '',
  scale: '0_5',
  levels: '',
  description: '',
};

export const courseForm = (x: Course): CourseForm => ({
  name: x.name,
  price: BigInt(x.defaultMonthlyPrice),
  duration: String(x.lessonDurationMin),
  months: x.durationMonths ? String(x.durationMonths) : '',
  scale: x.gradeScale,
  levels: x.levels.join(', '),
  description: x.description ?? '',
});

const inRange = (v: string, min: number, max: number) => Number(v) >= min && Number(v) <= max;

export const courseReady = (f: CourseForm): boolean =>
  f.name.trim().length >= 2 &&
  f.price !== null &&
  inRange(f.duration, 15, 480) &&
  (f.months === '' || inRange(f.months, 1, 60));

/** Vergul bilan yozilgan darajalar; takrorlari tushib qoladi. */
export const parseLevels = (text: string): string[] => {
  const seen = new Set<string>();
  return text
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x !== '' && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase()));
};

export const courseBody = (f: CourseForm): CreateCourseRequest => ({
  name: f.name.trim(),
  defaultMonthlyPrice: String(f.price),
  lessonDurationMin: Number(f.duration),
  durationMonths: f.months === '' ? null : Number(f.months),
  gradeScale: f.scale,
  levels: parseLevels(f.levels),
  description: f.description.trim() || null,
});
