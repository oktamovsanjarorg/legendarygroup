/**
 * T-017c: ekran maketlari skrinshotlari → docs/ux/screens/ (egasi shular bo'yicha qabul qiladi).
 *
 *   pnpm -F @lg/storybook screenshots
 *
 * Asosiy holat (story `tags: ['primary']`) — Mini App kengliklari 360/390/430 + desktop Telegram 600 px,
 * light; 390 px — dark va past kontrastli custom tema. Qolgan holatlar — 390 px light.
 * storybook-static'ni o'zi xizmat qiladi (qo'shimcha server kerak emas).
 */
import { createReadStream, existsSync, rmSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const STATIC = resolve(import.meta.dirname, '../storybook-static');
const OUT = resolve(import.meta.dirname, '../../../docs/ux/screens');
const PREFIX = 'miniapp/';
/** Kenglik → tipik telefon balandligi; 600 — desktop Telegram oynasi. */
const HEIGHT = { 360: 740, 390: 844, 430: 932, 600: 800 };
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

if (!existsSync(join(STATIC, 'index.json'))) {
  console.error('storybook-static yoʻq: avval `pnpm -F @lg/storybook build`');
  process.exit(1);
}

const server = createServer((req, res) => {
  const path = join(STATIC, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
  const file = existsSync(path) && statSync(path).isDirectory() ? join(path, 'index.html') : path;
  if (!file.startsWith(STATIC) || !existsSync(file)) return void res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
/** `tags: ['primary']` — ekranning asosiy holati (barcha kenglik va temalar). */
const shots = (entry) =>
  entry.tags?.includes('primary')
    ? [
        [360, 'light'],
        [390, 'light'],
        [430, 'light'],
        [600, 'light'],
        [390, 'dark'],
        [390, 'lowContrast'],
      ]
    : [[390, 'light']];

const index = JSON.parse(readFileSync(join(STATIC, 'index.json'), 'utf8'));
const stories = Object.values(index.entries).filter(
  (e) => e.type === 'story' && e.title.startsWith(PREFIX),
);

rmSync(join(OUT, 'miniapp'), { recursive: true, force: true });
const browser = await chromium.launch();
let count = 0;
for (const s of stories) {
  const dir = join(OUT, 'miniapp', slug(s.title.slice(PREFIX.length)));
  mkdirSync(dir, { recursive: true });
  for (const [width, theme] of shots(s)) {
    const page = await browser.newPage({
      viewport: { width, height: HEIGHT[width] },
      deviceScaleFactor: 1,
    });
    await page.goto(`${base}/iframe.html?id=${s.id}&viewMode=story&globals=theme:${theme}`);
    await page.waitForSelector('#storybook-root > *');
    await page.waitForTimeout(400); // effect'lar va fake MainButton holati
    // Telefon ekrani balandligida (fullPage emas): foydalanuvchi ko'radigani, MainButton/TabBar o'z joyida.
    await page.screenshot({ path: join(dir, `${slug(s.name)}__${width}-${theme}.png`) });
    await page.close();
    count += 1;
  }
}
await browser.close();
server.close();
console.log(`${stories.length} ta story, ${count} ta skrinshot → ${OUT}/miniapp`);
