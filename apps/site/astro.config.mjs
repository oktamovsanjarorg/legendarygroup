// T-503 markaz sayti: statik HTML (SEO), apex domen. robots.txt va sitemap.xml — Caddy (domen bilan).
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  compressHTML: true,
  vite: { plugins: [tailwindcss()] },
});
