/**
 * T-017c: ekran maketlari skrinshotlari → docs/ux/screens/ (egasi shular bo'yicha qabul qiladi).
 *
 *   pnpm -F @lg/storybook screenshots
 *
 * Kenglik va temalar — pastdagi CHANNELS'da (Mini App va web).
 * storybook-static'ni o'zi xizmat qiladi (qo'shimcha server kerak emas).
 */
import { createReadStream, existsSync, rmSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const STATIC = resolve(import.meta.dirname, '../storybook-static');
const OUT = resolve(import.meta.dirname, '../../../docs/ux/screens');
/** Kenglik → tipik telefon balandligi; 600 — desktop Telegram oynasi. */
const HEIGHT = { 360: 740, 390: 844, 430: 932, 600: 800, 1280: 800, 1440: 900 };
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
/**
 * Kanal → kengliklar: `tags: ['primary']` — asosiy holat (barcha kenglik va temalar), qolgani — bitta.
 * Mini App: telefon (360/390/430) + desktop Telegram 600; web: 1280 (asosiy) va 1440 (11-ux §1).
 */
const CHANNELS = {
  miniapp: {
    primary: [
      [360, 'light'],
      [390, 'light'],
      [430, 'light'],
      [600, 'light'],
      [390, 'dark'],
      [390, 'lowContrast'],
    ],
    other: [[390, 'light']],
  },
  web: {
    primary: [
      [1280, 'light'],
      [1440, 'light'],
      [1440, 'dark'],
    ],
    other: [[1280, 'light']],
  },
};

const index = JSON.parse(readFileSync(join(STATIC, 'index.json'), 'utf8'));
const browser = await chromium.launch();
let count = 0;
let total = 0;
for (const [channel, widths] of Object.entries(CHANNELS)) {
  const prefix = `${channel}/`;
  const stories = Object.values(index.entries).filter(
    (e) => e.type === 'story' && e.title.startsWith(prefix),
  );
  total += stories.length;
  rmSync(join(OUT, channel), { recursive: true, force: true });
  for (const s of stories) {
    const dir = join(OUT, channel, slug(s.title.slice(prefix.length)));
    mkdirSync(dir, { recursive: true });
    for (const [width, theme] of s.tags?.includes('primary') ? widths.primary : widths.other) {
      const page = await browser.newPage({
        viewport: { width, height: HEIGHT[width] },
        deviceScaleFactor: 1,
      });
      await page.goto(`${base}/iframe.html?id=${s.id}&viewMode=story&globals=theme:${theme}`);
      await page.waitForSelector('#storybook-root > *');
      // Deterministik: animatsiya (skeleton pulse) har safar boshqa kadrda — git'da shovqinli farq.
      await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
      await page.waitForTimeout(400); // effect'lar va fake MainButton holati
      // Ekran balandligida (fullPage emas): foydalanuvchi ko'radigani, MainButton/TabBar o'z joyida.
      await page.screenshot({ path: join(dir, `${slug(s.name)}__${width}-${theme}.png`) });
      await page.close();
      count += 1;
    }
  }
}
await browser.close();
server.close();
console.log(`${total} ta story, ${count} ta skrinshot → ${OUT}`);
