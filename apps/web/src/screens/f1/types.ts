/** F1 web ekranlari ko'rinish modellari (maket; API'ga ulanganda contracts'dagi sxemalardan). */
export type StudentStatus = 'active' | 'frozen' | 'archived';

export interface StudentRow {
  id: string;
  code: string;
  name: string;
  groups: readonly string[];
  /** Asosiy ota-ona; `null` — kiritilmagan. */
  guardian: string | null;
  /** `null` — yo'q yoki ko'rishga ruxsat yo'q (02 §3). */
  guardianPhone: string | null;
  /** Qarz (T-208); `undefined` — ustun ko'rsatilmaydi. */
  debt?: bigint;
  status: StudentStatus;
}

export interface LessonCell {
  id: string;
  /** Kalendar kuni `YYYY-MM-DD`. */
  date: string;
  start: string;
  end: string;
  group: string;
  teacher: string;
  room: string;
  kind?: LessonCellKind;
}

export type LessonCellKind = 'cancelled' | 'substitute' | 'extra' | 'makeup';

export interface CalendarDay {
  ymd: string;
  holiday?: string;
}
