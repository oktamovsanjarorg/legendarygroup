import type { StaffDetail, StaffListItem } from '@lg/contracts';

const base = {
  phone: '+998901234567',
  status: 'active',
  telegramLinked: true,
  lastLoginAt: '2026-11-24T05:00:00.000Z',
  overridesCount: 0,
} as const;

const adminItem: StaffListItem = {
  ...base,
  id: 'u2',
  fullName: 'Admin A.',
  roles: ['admin'],
  overridesCount: 1,
};

const teacherItem: StaffListItem = {
  ...base,
  id: 'u3',
  fullName: 'Ustoz U.',
  roles: ['teacher', 'guardian'],
  status: 'invited',
  telegramLinked: false,
  lastLoginAt: null,
};

export const people: StaffListItem[] = [
  { ...base, id: 'u1', fullName: 'Direktor D.', roles: ['director'] },
  adminItem,
  teacherItem,
];

export const admin: StaffDetail = {
  ...adminItem,
  overrides: [{ permission: 'finance.view', granted: true }],
  botUrl: null,
};

export const teacher: StaffDetail = {
  ...teacherItem,
  overrides: [],
  botUrl: 'https://t.me/legendary_bot',
};
