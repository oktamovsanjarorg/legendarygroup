/**
 * Offline navbat (FR-ATT-6, 11-ux §7): internet yo'q paytda dars bo'yicha oxirgi holat qurilmada
 * turadi va aloqa tiklanganda yuboriladi. Har dars uchun bitta yozuv — eskisi yangisi bilan
 * almashadi. Saqlash — localStorage; ishlamasa — xotirada, ilova yopilguncha.
 */
export interface LessonQueue<T extends { lessonId: string }> {
  enqueue: (item: T) => void;
  queued: () => readonly T[];
  /** Muvaffaqiyatli yoki server rad etgani (4xx) — olib tashlanadi; tarmoq xatosi — qoladi. */
  flush: (send: (item: T) => Promise<'sent' | 'retry'>) => Promise<void>;
}

export function lessonQueue<T extends { lessonId: string }>(key: string): LessonQueue<T> {
  let memory: T[] = [];
  const read = (): T[] => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T[]) : memory;
    } catch {
      return memory;
    }
  };
  const write = (items: T[]): void => {
    memory = items;
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {
      /* xotirada qoladi */
    }
  };
  return {
    enqueue: (item) => write([...read().filter((q) => q.lessonId !== item.lessonId), item]),
    queued: () => read(),
    flush: async (send) => {
      const rest: T[] = [];
      for (const item of read()) if ((await send(item)) === 'retry') rest.push(item);
      write(rest);
    },
  };
}
