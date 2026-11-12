import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';

/**
 * Komponentlar katalogi (11-ux §7): `ui-web` va `ui-tg`, har biri barcha holatlari bilan.
 * Hikoyalar komponent yonida (`*.stories.tsx`) — paketlar dist'iga kirmaydi.
 */
const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: [
    '../../../packages/ui-web/src/**/*.stories.tsx',
    '../../../packages/ui-tg/src/**/*.stories.tsx',
    // T-017c ekran maketlari — ilova ichida, keyin haqiqiy ekranda qayta ishlatiladi.
    '../../miniapp/src/**/*.screen.stories.tsx',
    '../../web/src/**/*.screen.stories.tsx',
  ],
  addons: ['@storybook/addon-a11y'],
  core: { disableTelemetry: true },
  viteFinal: (cfg) => ({
    ...cfg,
    plugins: [...(cfg.plugins ?? []), tailwindcss()],
    resolve: { ...cfg.resolve, conditions: ['development'] },
  }),
};

export default config;
