import { formatTime } from '@lg/i18n';
import { Clock4, MapPin } from 'lucide-react';

export interface LessonInfo {
  id: string;
  groupName: string;
  courseName: string;
  startsAt: Date;
  endsAt: Date;
  room: string;
  /** Asosiy ustoz o'rniga dars (o'rinbosar). */
  substitute?: boolean;
}

/** Dars sarlavhasi (MT-02, MT-01 kartasi). */
export function LessonHeader({ lesson }: { lesson: LessonInfo }) {
  return (
    <header className="flex flex-col gap-1 px-4 pt-3">
      <h1 className="text-xl font-semibold text-text">{lesson.groupName}</h1>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
        <span>{lesson.courseName}</span>
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Clock4 className="size-4" aria-hidden />
          {formatTime(lesson.startsAt)}–{formatTime(lesson.endsAt)}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-4" aria-hidden />
          {lesson.room}
        </span>
      </p>
    </header>
  );
}
