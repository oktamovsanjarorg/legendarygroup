/**
 * Guruh holatlari (FR-ORG-3): yig'ilmoqda → faol ⇄ to'xtatilgan → yakunlangan.
 * Yakunlangan — oxirgi holat (tarix sifatida qoladi).
 */
export const GROUP_STATUS_FLOW = {
  forming: ['active', 'finished'],
  active: ['paused', 'finished'],
  paused: ['active', 'finished'],
  finished: [],
} as const satisfies Record<string, readonly string[]>;

export type GroupStatusCode = keyof typeof GROUP_STATUS_FLOW;

export function canChangeGroupStatus(from: GroupStatusCode, to: GroupStatusCode): boolean {
  return (GROUP_STATUS_FLOW[from] as readonly string[]).includes(to);
}

/** To'xtatilgan guruh ham xona/ustozni band qiladi (qaytishi mumkin); yakunlangan — yo'q (Q-69). */
export const occupiesResources = (status: GroupStatusCode): boolean => status !== 'finished';
