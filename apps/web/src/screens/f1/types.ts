/** F1 web ekranlari ko'rinish modellari (maket; API'ga ulanganda contracts'dagi sxemalardan). */
export type StudentStatus = 'active' | 'frozen' | 'archived';

export interface StudentRow {
  id: string;
  code: string;
  name: string;
  groups: readonly string[];
  guardian: string;
  guardianPhone: string;
  debt: bigint;
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
