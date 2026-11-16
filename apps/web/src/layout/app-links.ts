import { useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';

/**
 * `@lg/ui-web` router'ni bilmaydi: ichki havolalar (`<a href data-app-link>`, masalan PageHeader
 * «?») oddiy `<a>`. Bosilganda sahifa qayta yuklanmasin (token xotirada — qayta kirish, oq ekran):
 * oddiy chap bosish router orqali ochiladi; Ctrl/Cmd/Shift yoki oʻrta tugma — brauzerga qoladi.
 */
export function useAppLinks(): void {
  const router = useRouter();
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      const a = target?.closest<HTMLAnchorElement>('a[data-app-link]');
      const href = a?.getAttribute('href');
      if (!href?.startsWith('/')) return;
      e.preventDefault();
      router.history.push(href);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [router]);
}
