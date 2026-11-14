import { useSyncExternalStore } from 'react';

/**
 * Tanlangan farzand (ota-onada bir nechta bo'lsa): bosh sahifa, natijalar va to'lovlar bir xil
 * bolani ko'rsatadi. Sessiya davomida xotirada (Telegram ilovasi yopilsa — birinchisi).
 */
let selected: string | null = null;
const listeners = new Set<() => void>();

export function selectChild(id: string): void {
  selected = id;
  for (const l of listeners) l();
}

export function useSelectedChild(
  ids: readonly string[],
): [string | undefined, (id: string) => void] {
  const value = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => selected,
  );
  const current = value && ids.includes(value) ? value : ids[0];
  return [current, selectChild];
}
