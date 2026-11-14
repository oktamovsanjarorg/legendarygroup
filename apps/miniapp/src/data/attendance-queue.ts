import type { MarkAttendanceInput } from '@lg/contracts';

/**
 * Offline davomat navbati (FR-ATT-6): internet yo'q paytda saqlangan belgilar qurilmada
 * turadi va aloqa tiklanganda yuboriladi. `clientMutationId` — server tomonda idempotent,
 * qayta yuborish ikki marta yozmaydi. Saqlash — localStorage (Telegram WebView'da bor);
 * ishlamasa (taqiqlangan) — xotirada, ilova yopilguncha.
 */
export interface QueuedMark {
  lessonId: string;
  body: MarkAttendanceInput & { clientMutationId: string };
}

const KEY = 'lg.attendance.queue';
let memory: QueuedMark[] = [];

function read(): QueuedMark[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedMark[]) : memory;
  } catch {
    return memory;
  }
}

function write(items: QueuedMark[]): void {
  memory = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* xotirada qoladi */
  }
}

/** Shu dars uchun eski yozuv o'rniga yangisi (oxirgi holat yuboriladi). */
export function enqueue(item: QueuedMark): void {
  write([...read().filter((q) => q.lessonId !== item.lessonId), item]);
}

export const queued = (): readonly QueuedMark[] => read();

/** Navbatni yuborish: muvaffaqiyatli yoki server rad etgani (4xx) — olib tashlanadi. */
export async function flush(send: (q: QueuedMark) => Promise<'sent' | 'retry'>): Promise<void> {
  const rest: QueuedMark[] = [];
  for (const item of read()) if ((await send(item)) === 'retry') rest.push(item);
  write(rest);
}
