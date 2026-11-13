import { GROUP_STATUS_FLOW } from '@lg/contracts';

/** Guruh holatlari oqimi — kanonik jadval `@lg/contracts` da (UI ham ishlatadi). */
export { GROUP_STATUS_FLOW };

export type GroupStatusCode = keyof typeof GROUP_STATUS_FLOW;

export function canChangeGroupStatus(from: GroupStatusCode, to: GroupStatusCode): boolean {
  return (GROUP_STATUS_FLOW[from] as readonly string[]).includes(to);
}

/** To'xtatilgan guruh ham xona/ustozni band qiladi (qaytishi mumkin); yakunlangan — yo'q (Q-69). */
export const occupiesResources = (status: GroupStatusCode): boolean => status !== 'finished';
