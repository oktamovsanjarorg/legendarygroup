import { type Clock, tashkentInstant } from '@lg/domain';

/** Sozlanadigan vaqtli vazifalar shu qadam bilan tekshiriladi (`SLOT_PATTERN`). */
const SLOT_MIN = 10;
export const SLOT_PATTERN = `*/${SLOT_MIN} * * * *`;

/** Sozlangan vaqt (`HH:MM`, Toshkent) shu qadamga tushdimi — kuniga bitta qadam `true`. */
export function isSlot(clock: Clock, time: string): boolean {
  const diff = clock.now().getTime() - tashkentInstant(clock.today(), time).getTime();
  return diff >= 0 && diff < SLOT_MIN * 60_000;
}
