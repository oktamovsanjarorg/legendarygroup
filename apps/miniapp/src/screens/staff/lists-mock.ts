import type { LeadDto, LessonDto } from '@lg/contracts';

/** Storybook va testlar uchun namuna (MS-09, MS-15, MS-26, MS-33). */
export const lead: LeadDto = {
  id: 'l1',
  fullName: 'Rahimova Malika',
  phone: '+998901234567',
  course: { id: 'c1', name: 'Ingliz tili' },
  source: 'website',
  status: 'new',
  assignedTo: null,
  notes: 'Kechki guruh kerak',
  lostReason: null,
  trial: null,
  studentId: null,
  statusChangedAt: '2026-11-24T08:00:00.000Z',
  createdAt: '2026-11-24T08:00:00.000Z',
};

export const lesson: LessonDto = {
  id: 'les1',
  group: { id: 'g1', name: 'IELTS A1' },
  date: '2026-11-26',
  startTime: '15:00',
  endTime: '16:20',
  room: { id: 'r1', name: '2-xona' },
  teacher: { id: 't1', name: 'Karimov Anvar' },
  isSubstitute: false,
  roomOverridden: false,
  status: 'scheduled',
  kind: 'regular',
  cancelReason: null,
  cancelSource: null,
  compensation: null,
  makeupLessonId: null,
  makeupForLessonId: null,
  topic: null,
};
