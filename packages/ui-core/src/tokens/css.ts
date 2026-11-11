import type { ColorTokens } from './palette.js';

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Tokenlar → CSS o'zgaruvchilar (`--lg-text-muted: #...`). Tailwind ham shularga bog'lanadi. */
export function toCssVariables(tokens: ColorTokens, prefix = 'lg'): string {
  return Object.entries(tokens)
    .map(([k, v]) => `--${prefix}-${kebab(k)}: ${v};`)
    .join('\n');
}
