import { defineConfig, mergeConfig } from 'vite';
import base from './vite.config.js';

/** E2E (Playwright, `apps/e2e`): alohida port va e2e API'ga (`src/e2e/server.ts`) proksi. */
export default mergeConfig(
  base,
  defineConfig({
    server: {
      port: 5174,
      strictPort: true,
      proxy: { '/api': { target: 'http://127.0.0.1:3100', changeOrigin: false } },
    },
  }),
);
