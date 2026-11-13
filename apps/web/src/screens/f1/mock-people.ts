import { must } from '../story-kit.js';
import type { Lead } from './leads.js';
import type { LinkRequest } from './link-requests.js';
import type { StaffRow } from './staff.js';
import type { StudentDetail } from './student-card.js';
import type { StudentRow } from './types.js';

/** T-017c 5a maket ma'lumotlari — odamlar (W-05…W-08, W-28). Narx: 650 000 soʻm/oy. */
const d = (iso: string) => new Date(`${iso}+05:00`);

export const NAMES = [
  'Abdullayev Jasur',
  'Aliyeva Madina',
  'Boboyev Sardor',
  'Ergasheva Nilufar',
  'Fayzullayev Bekzod',
  'Gʻaniyeva Shahzoda',
  'Hasanov Otabek',
  'Ibragimova Dildora',
  'Joʻrayev Sherzod',
  'Karimova Zarina',
  'Latipov Doniyor',
  'Mahmudova Sevara',
];
export const GROUPS = [
  'IELTS 7.0 — B2-guruh',
  'Matematika — A1',
  'IELTS 6.0 — B1',
  'Matematika — A3',
];

export const STUDENTS: StudentRow[] = NAMES.map((name, i) => ({
  id: `s${i + 1}`,
  code: `LG-${1040 + i}`,
  name,
  groups: [GROUPS[i % 4] ?? ''],
  guardian: `${name.split(' ')[0] ?? ''} ${['Bahodir', 'Dilnoza', 'Rustam', 'Malika'][i % 4] ?? ''}`,
  guardianPhone: `+99890${String(1234560 + i * 7919).slice(0, 7)}`,
  debt: i % 4 === 1 ? 650_000n : i === 6 ? 1_300_000n : 0n,
  status: i === 9 ? 'frozen' : 'active',
}));

export const STUDENT: StudentDetail = {
  ...must(STUDENTS[1]),
  birthDate: d('2011-04-17T00:00:00'),
  school: '64-maktab, 9-sinf',
  guardians: [
    { name: 'Aliyev Bahodir', relation: 'Otasi', phone: '+998901234567', linked: true },
    { name: 'Aliyeva Dilnoza', relation: 'Onasi', phone: '+998909876543', linked: false },
  ],
  history: [
    { group: 'IELTS 7.0 — B2-guruh', from: d('2026-09-01T00:00:00') },
    { group: 'IELTS 6.0 — B1', from: d('2026-02-01T00:00:00'), to: d('2026-08-31T00:00:00') },
  ],
  // BR-20: qoldiq = Σ(debet − kredit); > 0 — qarz.
  ledger: [
    {
      id: 'e1',
      date: d('2026-09-01T00:00:00'),
      what: 'Sentyabr — hisob',
      debit: 650_000n,
      credit: 0n,
      balance: 650_000n,
    },
    {
      id: 'e2',
      date: d('2026-09-05T10:30:00'),
      what: 'Toʻlov LG-2026-000233 (naqd)',
      debit: 0n,
      credit: 650_000n,
      balance: 0n,
    },
    {
      id: 'e3',
      date: d('2026-10-01T00:00:00'),
      what: 'Oktyabr — hisob',
      debit: 650_000n,
      credit: 0n,
      balance: 650_000n,
    },
    {
      id: 'e4',
      date: d('2026-10-08T12:10:00'),
      what: 'Toʻlov LG-2026-000418 (oʻtkazma)',
      debit: 0n,
      credit: 650_000n,
      balance: 0n,
    },
    {
      id: 'e5',
      date: d('2026-11-01T00:00:00'),
      what: 'Noyabr — hisob',
      debit: 650_000n,
      credit: 0n,
      balance: 650_000n,
    },
  ],
};

export const LINK_REQUESTS: LinkRequest[] = [
  {
    id: 'r1',
    phone: '+998935550011',
    tgName: 'Malika O.',
    at: d('2026-11-12T09:41:00'),
    match: 'Oʻrinboyeva Malika (ota-ona)',
  },
  { id: 'r2', phone: '+998977001199', tgName: 'Anvar', at: d('2026-11-11T21:05:00') },
];

export const LEADS: Lead[] = [
  {
    id: 'd1',
    name: 'Rustamov Anvar',
    phone: '+998901112233',
    course: 'Ingliz tili',
    source: 'Instagram',
    stage: 'new',
  },
  {
    id: 'd2',
    name: 'Qosimova Feruza',
    phone: '+998901112234',
    course: 'Matematika',
    source: 'Tanish',
    stage: 'new',
  },
  {
    id: 'd3',
    name: 'Yoqubov Islom',
    phone: '+998901112235',
    course: 'Ingliz tili',
    source: 'Telegram',
    stage: 'contacted',
  },
  {
    id: 'd4',
    name: 'Nurmatova Laylo',
    phone: '+998901112236',
    course: 'Ingliz tili',
    source: 'Instagram',
    stage: 'trial',
    trialAt: d('2026-11-14T15:00:00'),
  },
  {
    id: 'd5',
    name: 'Sobirov Javohir',
    phone: '+998901112237',
    course: 'Matematika',
    source: 'Banner',
    stage: 'won',
  },
  {
    id: 'd6',
    name: 'Tursunova Gulnora',
    phone: '+998901112238',
    course: 'Ingliz tili',
    source: 'Instagram',
    stage: 'lost',
  },
];

export const STAFF: StaffRow[] = [
  {
    id: 'u1',
    name: 'Bosh Direktor',
    phone: '+998901000001',
    roles: ['director'],
    status: 'active',
    lastLogin: d('2026-11-12T08:00:00'),
    overrides: 0,
  },
  {
    id: 'u2',
    name: 'Rahimova Gulnoza',
    phone: '+998901000002',
    roles: ['admin'],
    status: 'active',
    lastLogin: d('2026-11-12T08:40:00'),
    overrides: 1,
  },
  {
    id: 'u3',
    name: 'Karimov Rustam',
    phone: '+998901000003',
    roles: ['teacher'],
    status: 'active',
    lastLogin: d('2026-11-11T14:55:00'),
    overrides: 0,
  },
  {
    id: 'u4',
    name: 'Saidova Lola',
    phone: '+998901000004',
    roles: ['teacher'],
    status: 'invited',
    overrides: 0,
  },
  {
    id: 'u5',
    name: 'Qodirov Aziz',
    phone: '+998901000005',
    roles: ['teacher'],
    status: 'blocked',
    lastLogin: d('2026-09-30T18:20:00'),
    overrides: 0,
  },
];
