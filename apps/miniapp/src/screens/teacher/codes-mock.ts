import type { TeacherCodeRow } from '@lg/contracts';

/** MT-05a story/test maʼlumoti: 2 tasi kodli, 2 tasiga tizim taklifi. */
export const CODE_ROWS: readonly TeacherCodeRow[] = [
  { studentId: 'c1', fullName: 'Aliyev Bekzod', code: 1, suggested: null },
  { studentId: 'c2', fullName: 'Boboyeva Malika', code: 7, suggested: null },
  { studentId: 'c3', fullName: 'Karimov Jasur', code: null, suggested: 2 },
  { studentId: 'c4', fullName: 'Toshmatova Zarina', code: null, suggested: 3 },
];
