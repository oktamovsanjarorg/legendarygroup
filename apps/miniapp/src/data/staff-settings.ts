import {
  type Course,
  DEFAULT_SYSTEM_SETTINGS,
  type GroupListItem,
  normalizePhone,
  type PaymentCard,
  type PublicSettings,
  type Room,
  type StaffListItem,
  type StudentListResult,
  type SystemSettings,
} from '@lg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './deps.js';

const KEY = ['staff', 'settings'] as const;

/** Javobda jarima — matn (JSON'da `bigint` yo'q). */
export type Settings = Omit<SystemSettings, 'penaltyConfig'> & {
  penaltyConfig: Omit<SystemSettings['penaltyConfig'], 'penaltyPerLesson'> & {
    penaltyPerLesson: string;
  };
};

export const SETTINGS_SECTIONS = ['center', 'billing', 'penalty', 'times'] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export interface SettingsForm {
  name: string;
  phone: string;
  address: string;
  dueDay: string;
  discount: string;
  penaltyOn: boolean;
  threshold: string;
  perLesson: bigint | null;
  late: string;
  morning: string;
  evening: string;
  attendance: string;
  absence: string;
}

export const toForm = (s: Settings): SettingsForm => ({
  name: s.centerInfo.name,
  phone: s.centerInfo.phone,
  address: s.centerInfo.address ?? '',
  dueDay: String(s.billingDueDay),
  discount: String(s.adminDiscountLimitPercent),
  penaltyOn: s.penaltyConfig.enabled,
  threshold: String(s.penaltyConfig.absenceThreshold),
  perLesson: BigInt(s.penaltyConfig.penaltyPerLesson),
  late: String(s.penaltyConfig.lateThresholdMin),
  morning: s.notificationTimes.morningReminderTime,
  evening: s.notificationTimes.eveningDigestTime,
  attendance: String(s.notificationTimes.attendanceReminderMinutes),
  absence: String(s.absenceNoticeWindowMinutes),
});

/** Butun son va chegarada bo'lsa — son, aks holda `null`. */
const int = (v: string, min: number, max: number): number | null => {
  const n = Number(v);
  return /^\d+$/.test(v.trim()) && n >= min && n <= max ? n : null;
};
const time = (v: string): string | null => (/^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null);

function center(f: SettingsForm, logoFileId: string | null): object | null {
  const phone = normalizePhone(f.phone);
  const name = f.name.trim();
  if (!name || !phone) return null;
  const logo = logoFileId ? { logoFileId } : {};
  return { centerInfo: { name, phone, address: f.address.trim() || null, ...logo } };
}

function billing(f: SettingsForm): object | null {
  const billingDueDay = int(f.dueDay, 1, 28);
  const adminDiscountLimitPercent = int(f.discount, 0, 100);
  return billingDueDay === null || adminDiscountLimitPercent === null
    ? null
    : { billingDueDay, adminDiscountLimitPercent };
}

function penalty(f: SettingsForm): object | null {
  const absenceThreshold = int(f.threshold, 1, 30);
  const lateThresholdMin = int(f.late, 5, 60);
  if (absenceThreshold === null || lateThresholdMin === null) return null;
  // Yoqilgan, lekin summasiz — hech narsa yozilmasdi.
  if (f.penaltyOn && !f.perLesson) return null;
  return {
    penaltyConfig: {
      enabled: f.penaltyOn,
      absenceThreshold,
      lateThresholdMin,
      penaltyPerLesson: (f.perLesson ?? 0n).toString(),
    },
  };
}

function times(f: SettingsForm): object | null {
  const morningReminderTime = time(f.morning);
  const eveningDigestTime = time(f.evening);
  const attendanceReminderMinutes = int(f.attendance, 10, 120);
  const absenceNoticeWindowMinutes = int(f.absence, 1, 30);
  if (!morningReminderTime || !eveningDigestTime) return null;
  if (attendanceReminderMinutes === null || absenceNoticeWindowMinutes === null) return null;
  return {
    notificationTimes: { morningReminderTime, eveningDigestTime, attendanceReminderMinutes },
    absenceNoticeWindowMinutes,
  };
}

/** Bo'lim PATCH'i — faqat shu bo'lim maydonlari; noto'g'ri qiymat — `null`. */
export function sectionPatch(
  section: SettingsSection,
  f: SettingsForm,
  logoFileId: string | null = null,
): object | null {
  if (section === 'center') return center(f, logoFileId);
  return { billing, penalty, times }[section](f);
}

export type CardForm = Pick<PaymentCard, 'cardNumber' | 'holderName' | 'bankName'>;
export const emptyCard: CardForm = { cardNumber: '', holderName: '', bankName: '' };

export const cardValid = (f: CardForm): boolean =>
  /^\d{16,20}$/.test(f.cardNumber.replace(/\s/g, '')) &&
  f.holderName.trim().length >= 2 &&
  f.bankName.trim().length >= 2;

/** `8600123412341234` → `8600 1234 1234 1234`. */
export const cardText = (n: string): string => n.replace(/(\d{4})(?=\d)/g, '$1 ');

/** Birinchi karta — asosiy; asosiysi o'chsa — keyingisi asosiy bo'ladi. */
const onePrimary = (list: PaymentCard[]): PaymentCard[] =>
  list.some((c) => c.isPrimary) ? list : list.map((c, i) => ({ ...c, isPrimary: i === 0 }));

export const withCard = (list: readonly PaymentCard[], id: string, f: CardForm): PaymentCard[] => {
  const card = {
    id,
    cardNumber: f.cardNumber.replace(/\s/g, ''),
    holderName: f.holderName.trim(),
    bankName: f.bankName.trim(),
    isPrimary: list.find((c) => c.id === id)?.isPrimary ?? false,
  };
  const exists = list.some((c) => c.id === id);
  return onePrimary(exists ? list.map((c) => (c.id === id ? card : c)) : [...list, card]);
};
export const withoutCard = (list: readonly PaymentCard[], id: string) =>
  onePrimary(list.filter((c) => c.id !== id));
export const withPrimary = (list: readonly PaymentCard[], id: string) =>
  list.map((c) => ({ ...c, isPrimary: c.id === id }));

export function useSettings() {
  const api = useApi();
  return useQuery({ queryKey: KEY, queryFn: () => api.request<Settings>('/settings') });
}

export function useSaveSettings() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: object) => api.request<Settings>('/settings', { method: 'PATCH', body }),
    onSuccess: (next) => qc.setQueryData(KEY, next),
    onSettled: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}

export const START_STEPS = [
  'center',
  'cards',
  'courses',
  'rooms',
  'teachers',
  'groups',
  'students',
] as const;
export type StartStep = (typeof START_STEPS)[number];

export interface StartState {
  done: Record<StartStep, boolean>;
  botUrl: string;
}

const def = DEFAULT_SYSTEM_SETTINGS.centerInfo;

/** Markaz ma'lumoti standart (seed) qiymatdan o'zgartirilgan bo'lsa — kiritilgan. */
export const centerFilled = ({ centerInfo: c }: Pick<Settings, 'centerInfo'>): boolean =>
  c.name !== def.name || c.phone !== def.phone || c.address !== def.address;

/** Qadamlar holati — haqiqiy ma'lumotdan (T-117), alohida saqlanmaydi. */
export function useStart() {
  const api = useApi();
  return useQuery({
    queryKey: ['staff', 'start'],
    queryFn: async (): Promise<StartState> => {
      const [settings, pub, courses, rooms, staff, groups, students] = await Promise.all([
        api.request<Settings>('/settings'),
        api.request<PublicSettings>('/settings/public'),
        api.request<Course[]>('/courses?status=active'),
        api.request<Room[]>('/rooms?status=active'),
        api.request<StaffListItem[]>('/staff'),
        api.request<GroupListItem[]>('/groups?status=current'),
        api.request<StudentListResult>('/students?status=active'),
      ]);
      return {
        botUrl: pub.botUrl,
        done: {
          center: centerFilled(settings),
          cards: settings.paymentCards.length > 0,
          courses: courses.length > 0,
          rooms: rooms.length > 0,
          teachers: staff.some((x) => x.roles.includes('teacher')),
          groups: groups.length > 0,
          students: students.items.length > 0,
        },
      };
    },
  });
}
