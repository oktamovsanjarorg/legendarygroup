import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Telegram Mini App (MT/MG/MS/C-*). Dev'da `/api` — API'ga proksi (bitta host, 06 §1).
 * Telegram ichida sinash uchun HTTPS tunnel kerak (BotFather'da Web App URL).
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { conditions: ['development'] },
  server: {
    port: 5174,
    host: true,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: false } },
  },
});
