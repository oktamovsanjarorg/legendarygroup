# CLAUDE.md — AI agentlar uchun qoidalar (Legendary Group)

Bu loyihada kodni asosan AI agentlar yozadi. Quyidagi qoidalar **majburiy**.

## Avval o'qing

1. `docs/README.md` — hujjatlar xaritasi. **`docs/12-ai-playbook.md` — ish tartibi, kod tuzilishi, prompt shablonlari (majburiy).**
2. Vazifa: `docs/09-tasks.md` dan ID (masalan `T-204`). Vazifasiz kod yozilmaydi.
3. Tegishli talablar (`FR-*` — `docs/01-requirements.md`) va qoidalar (`BR-*` — `docs/04-business-rules.md`).
4. `docs/10-open-questions.md` — vazifani bloklovchi savol ochiq bo'lsa, **standart taklifni** qo'llang va PR'da aniq yozing ("Q-13 standart varianti bilan").
5. Claude Code'da: `/task T-XXX` (bajarish), `/review-ai [yo'l]` (boshqa AI kodini tekshirish).

## Oltin qoidalar

- **Hujjat > kod.** Qoida noaniq yoki hujjatga zid bo'lsa — egasiga savol bermang: playbook §2 qaror zinapoyasi bo'yicha qaror qiling, hujjatni shu PR'da yangilang va qarorni PR tavsifida/ADR'da/`10-open-questions.md`da qayd eting. To'xtash — faqat §2 dagi 3 holatda.
- **Pul:** faqat `bigint` so'm, faqat `packages/domain` funksiyalari orqali. `number`/float bilan pul hisoblash taqiqlangan.
- **Ledger o'zgarmaydi:** `ledger_entries`, `audit_logs`, `payments`, `receipts`, `receipt_cancellations` — UPDATE/DELETE yo'q (holat ustuni ham yo'q); tuzatish = yangi teskari yozuv. DB'da `forbid_mutation()` trigger + `lg_app` grant.
- **RBAC:** har endpoint'da `@RequirePermission`; obyekt scope service'da tekshiriladi. Har endpoint uchun "forbidden" testi.
- **Audit:** har yozish amali audit'ga tushadi.
- **Idempotentlik:** to'lov, davomat, webhook, cron job — qayta ishga tushirish xavfsiz bo'lishi shart.
- **Modul chegaralari:** modul boshqa modul jadvallariga to'g'ridan-to'g'ri murojaat qilmaydi — public service yoki outbox event.
- **Xabar yuborish** faqat `notifications` moduli orqali (navbat). Bot kodida to'g'ridan-to'g'ri `sendMessage` taqiqlangan (bot javob kontekstidan tashqari).
- **Matnlar:** foydalanuvchiga ko'rinadigan har bir matn `packages/i18n`da, o'zbek lotin, rasmiy imlo bo'yicha: `oʻ`, `gʻ` — U+02BB (ʻ), tutuq belgisi — U+02BC (ʼ). Oddiy `'` faqat kod, izoh va hujjatlarda ruxsat. i18n'da CI lint qoidasi `'` ni foydalanuvchi matnlarida rad etadi. Qidiruv har ikki yozuvni bir xil deb hisoblaydi (normalizatsiya).
- **Vaqt:** `Asia/Tashkent`; DB'da `timestamptz`. `new Date()` biznes mantiqda emas — `Clock` servisi orqali (testda muzlatiladi).
- **Sirlar** kodda yoki logda yo'q. PII loglarda maskalanadi.
- **Migratsiyalar** faqat oldinga va orqaga mos (expand/contract).

## UI

- UI vazifasi `docs/11-ux.md` va tegishli maketsiz (T-017c) boshlanmaydi.
- Mini App'da faqat Telegram native boshqaruvlari (BackButton/MainButton); har ekranda 5 holat (yuklanmoqda, bo'sh, xato, offline, ruxsat yo'q).
- Komponent avval Storybook'da, keyin ekranda.

## Texnik

- TypeScript strict, `any` yo'q. Zod sxemalar `packages/contracts`da — API va UI bir xil sxemadan foydalanadi.
- **Hajm (ESLint majburlaydi):** fayl ≤ 300 qator, funksiya ≤ 60, complexity ≤ 12. Katta fayl — ma'no bo'yicha bo'linadi (playbook §4); `eslint-disable` bilan chetlab o'tish taqiqlangan.
- Yashirin standart qiymat yo'q (`process.env.X || 'localhost'` taqiqlangan) — env Zod bilan tekshiriladi, yo'q bo'lsa ishga tushmaydi.
- Bog'liqlik qo'shishdan oldin: mavjud paket yetmaydimi? Yangi paket — aniq versiya, PR'da sababi.
- Buyruqlar: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:int`, `pnpm e2e` — PR'dan oldin hammasi yashil.

## Testlar

- `BR-*` qoidasiga tegadigan har o'zgarish — test nomida BR ID.
- Pul funksiyalari — property-based test (fast-check).
- Bug fix — avval qizil test.

## PR

- Kichik (≤ 400 qator), bitta vazifa. Sarlavha: `feat(billing): T-204 to'lov kiritish formasi`.
- Tavsifda: vazifa ID, qaysi FR/BR, qanday sinaldi, UI bo'lsa skrinshot, ochiq savollar bo'yicha qabul qilingan taxminlar.
- `docs/09-tasks.md`da vazifa holatini yangilang.
- Definition of Done: `docs/07-quality-security.md` §4.
