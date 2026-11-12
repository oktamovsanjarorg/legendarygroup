import { type ColorScheme, PALETTE, toCssVariables } from '@lg/ui-core';

/** Web — o'z palitramiz (11-ux §3), tizim temasiga ergashadi (light/dark). */
export function applyTheme(win: Window = window): () => void {
  const media = win.matchMedia('(prefers-color-scheme: dark)');
  const style = win.document.createElement('style');
  style.id = 'lg-theme';
  win.document.head.append(style);
  const apply = () => {
    const scheme: ColorScheme = media.matches ? 'dark' : 'light';
    style.textContent = `:root{${toCssVariables(PALETTE[scheme])}color-scheme:${scheme};}`;
  };
  apply();
  media.addEventListener('change', apply);
  return () => media.removeEventListener('change', apply);
}
