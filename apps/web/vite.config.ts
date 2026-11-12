import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Web panel (W-*). Dev'da `/api` — API'ga proksi: bitta host (06 §1), refresh cookie
 * (`Path=/api/auth`, SameSite=Strict) xuddi prod'dagidek ishlaydi.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { conditions: ['development'] },
  server: {
    port: 5173,
    host: true,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: false } },
  },
});
