# 03 — Arxitektura va texnologiyalar steki

## 1. Asosiy qarorlar

| Qaror        | Tanlov                                           | Sabab                                                                                                                                         |
| ------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Til          | **TypeScript** (strict) — backend, bot, frontend | Bitta til → umumiy tiplar va Zod sxemalar; AI agentlar uchun eng yaxshi qo'llab-quvvatlangan ekotizim; tip xatolari kompilyatsiyada ushlanadi |
| Arxitektura  | **Modulli monolit** (modular monolith)           | 1 filial uchun mikroservis ortiqcha murakkablik. Modullar qat'iy chegaralangan — kerak bo'lsa keyin ajratiladi                                |
| Repo         | **Monorepo** (pnpm workspaces + Turborepo)       | Bitta PR'da API + UI o'zgarishi, umumiy paketlar                                                                                              |
| Runtime      | **Node.js** (joriy Active LTS)                   | Barqaror, uzoq qo'llab-quvvatlash                                                                                                             |
| Konteynerlar | **Docker** + Docker Compose (bitta server)       | Oddiy, ishonchli; Kubernetes 1 filial uchun ortiqcha                                                                                          |

> **Versiyalar qoidasi:** loyiha boshlanganda har kutubxonaning _eng so'nggi barqaror (stable/LTS)_ versiyasi olinadi va `package.json`da aniq (`exact`) qotiriladi. Yangilashlar Renovate bot orqali, testlardan o'tib, haftalik.

## 2. Stek

### Backend (`apps/api`)

- **NestJS** (Fastify adapter) — modullar, DI, guard'lar (RBAC uchun ideal), uzoq muddatli barqarorlik.
- **PostgreSQL** (joriy major) — asosiy DB. Pul `bigint`, vaqt `timestamptz`.
- **Drizzle ORM** + drizzle-kit migratsiyalar — SQL'ga yaqin, tez, tip-xavfsiz; murakkab hisobot so'rovlari uchun qulay.
- **Zod** — barcha kirish/chiqish validatsiyasi; sxemalar `packages/contracts`da.
- **API**: REST + OpenAPI (Zod'dan generatsiya) → frontend uchun tip-xavfsiz klient avtomatik generatsiya. Aniq kutubxonani (Zod→OpenAPI, klient generator) T-004 agenti o'sha paytdagi eng faol barqaror variantdan tanlaydi va ADR yozadi — egasidan so'ralmaydi.
- **Redis (Valkey)** — kesh, rate limit, sessiya bloklari, navbatlar.
- **BullMQ** — fon vazifalari: bildirishnomalar, hisobotlar, PDF, Excel import, oylik hisob, invoice generatsiya, backup tekshiruvi.
- **PDF**: HTML shablon → Chromium (Playwright) worker'da (chek, oylik hisobot). Ko'p chek bo'lsa ham navbat orqali.
- **Excel**: `exceljs` (o'qish/yozish, streaming).
- **Logger**: `pino` (JSON), har so'rovda `requestId`.
- **Telemetriya**: OpenTelemetry (traces + metrics).

### Telegram bot (`apps/bot`)

- **grammY** — zamonaviy, TypeScript-first, conversations/menu plaginlari.
- **Webhook** rejimi (prod/staging), long polling — faqat lokal.
- Bot "yupqa" qatlam: biznes mantiq yo'q, DB'ga ulanmaydi. API'ni **ichki HTTP** orqali chaqiradi (`/internal/*`, Docker tarmog'ida, `INTERNAL_API_TOKEN` header) — RBAC, audit va idempotentlik bitta joyda (api) qoladi.
- Xabar yuborish faqat navbat orqali (rate limit 25 msg/s, 429 da `retry_after`ga rioya).

### Mini App (`apps/miniapp`)

- **React** + **Vite** + **TypeScript**.
- **@telegram-apps/sdk-react** — tema, BackButton, MainButton, haptic, safe-area, fullscreen.
- **TanStack Router** (tip-xavfsiz marshrutlar) + **TanStack Query** (kesh, optimistik yangilash, offline mutatsiyalar navbati — davomat uchun).
- UI: `packages/ui-tg` — **Telegram tema o'zgaruvchilariga** bog'langan o'z komponentlar to'plami ("native" his). Batafsil: [11-ux.md](11-ux.md).
- Rollar: Ustoz (asosiy va yagona ish joyi), Ota-ona, Director/Admin xodim rejimi.
- Bundle byudjeti: dastlabki JS ≤ 150 KB gzip.

### Web panel (`apps/web`)

- **React** + **Vite** + TanStack Router/Query/Table.
- **shadcn/ui** + **Tailwind CSS** — admin panel komponentlari.
- Grafiklar: **Apache ECharts** (katta ma'lumot, eksport).
- Formalar: React Hook Form + Zod (umumiy sxemalar).
- Klaviatura bilan tez ishlash (Admin uchun: `Ctrl+K` buyruqlar paneli, to'lov kiritish shortcut'lari).

### Landing (`apps/site`) — Faza 4

- **Astro** — statik, tez, SEO. Lid formasi API'ga yuboradi.

### Umumiy paketlar (`packages/*`)

- `contracts` — Zod sxemalar, DTO tiplar, enumlar, xato kodlari.
- `domain` — sof biznes qoidalari (invoice, jarima, oylik hisob, policy'lar, `Clock` interfeysi) — framework'siz, I/O'siz, coverage ≥ 95%.
- `db` — Drizzle sxema, migratsiyalar, seed.
- `ui-core` — dizayn tokenlari, ikonlar, formatlash, umumiy hooklar.
- `ui-tg` — Mini App komponentlari (Telegram native).
- `ui-web` — web panel komponentlari (shadcn/ui asosida).
- Har uchala UI paketi Storybook bilan.
- `config` — ESLint, TS, Tailwind sozlamalari.
- `i18n` — barcha o'zbekcha matnlar bitta joyda (kalit → matn). Hozir 1 til, lekin matnlar kodga qattiq yozilmaydi.

## 3. Komponentlar diagrammasi

```
                    ┌──────────────────────── Telegram ────────────────────────┐
                    │  Ota-ona / Ustoz / Admin chat      Mini App (WebView)     │
                    └───────┬───────────────────────────────────┬──────────────┘
                            │ webhook                            │ HTTPS (initData)
                            ▼                                    ▼
Browser (Web panel) ──► ┌────────────────────── Caddy (TLS, reverse proxy) ─────────────────┐
                        │  /api → api   /bot/webhook → bot   / → web (static)  /app → miniapp│
                        └───────┬───────────────────┬────────────────────────────────────────┘
                                ▼                   ▼
                          ┌──────────┐        ┌──────────┐
                          │   api    │◄──────►│   bot    │
                          │ (NestJS) │        │ (grammY) │
                          └────┬─────┘        └────┬─────┘
                               │   jobs (BullMQ)   │
                               ▼                   ▼
                          ┌─────────────────────────────┐
                          │  worker (NestJS standalone) │  PDF, Excel, xabarlar, cron
                          └──┬───────────┬──────────┬───┘
                             ▼           ▼          ▼
                       PostgreSQL     Redis      S3 (fayllar + backup)
```

- Biznes modullari **faqat** `apps/api/src/modules/*`da. `apps/worker` — yupqa entrypoint: `@lg/api` paketidan `bootstrapWorker()`ni chaqiradi (o'sha modullar, HTTP serversiz). `apps/bot` — grammY, api'ga ichki HTTP. Uchalasi alohida konteyner: mustaqil masshtablanadi va qayta ishga tushiriladi.
- Cron vazifalari (invoice, eslatma, hisobot) — BullMQ repeatable jobs (bitta joyda, takrorlanmasdan).

## 4. Backend modullari (bounded contexts)

```
apps/api/src/modules/
  auth/          identity, sessions, telegram initData, 2FA
  users/         xodimlar, rollar, ruxsatlar
  org/           kurslar, xonalar, guruhlar, jadval, darslar, bayramlar
  students/      o'quvchilar, ota-onalar, enrollment, lidlar
  attendance/    davomat
  grading/       baholar, izohlar, testlar, excel import
  billing/       invoice, to'lov, chek, tasdiqlash, chegirma, balans, kassa
  payroll/       ustoz shartnomalari, oylik hisob
  finance/       xarajatlar, P&L
  notifications/ shablonlar, yuborish navbati, sozlamalar, e'lonlar
  reports/       haftalik/oylik hisobotlar, eksport
  analytics/     dashboard, prognoz, churn risk
  audit/         audit jurnali
  files/         S3, presigned URL, virus/format tekshiruvi
  settings/      tizim sozlamalari
```

**Qoida:** modul boshqa modulning jadvaliga to'g'ridan-to'g'ri yozmaydi — faqat uning public service'i yoki domen event'i (`PaymentConfirmed`, `AttendanceMarked`) orqali. Event'lar **transactional outbox** orqali (DB tranzaksiyasi bilan birga yoziladi, worker yuboradi) — xabar yo'qolmaydi, ikki marta yuborilmaydi.

## 5. Muhim texnik printsiplar

1. **Pul hisobi** faqat `packages/domain`dagi funksiyalarda, butun sonlarda (so'm, `bigint`). Float taqiqlangan.
2. **Idempotentlik:** to'lov kiritish, davomat yuborish, webhook'lar `Idempotency-Key` bilan.
3. **Ledger (buxgalteriya jurnali):** balans saqlanmaydi, `ledger_entries`dan hisoblanadi (debet: invoice, jarima; kredit: to'lov, chegirma). Tezlik uchun materialized balans — trigger/jobs bilan, lekin haqiqat manbai — ledger.
4. **Soft delete + audit**: biznes yozuvlar hech qachon fizik o'chirilmaydi.
5. **Vaqt:** DB'da UTC `timestamptz`, biznes mantiq `Asia/Tashkent`da (dars sanasi `date` + `time`).
6. **Konfiguratsiya:** 12-factor, barcha sirlar env orqali (AWS SSM Parameter Store / Secrets Manager'dan).
7. **Feature flag'lar:** DB'dagi oddiy jadval — yangi funksiyani prod'da bosqichma-bosqich yoqish uchun.

## 6. Monorepo tuzilishi

Repo: `github.com/oktamovsanjarorg/legendarygroup` — bitta repo, alohida repolar ochilmaydi.
Har ilova/paket mustaqil build va deploy qilinadi (Turborepo `--filter`, CI faqat o'zgarganlarni tekshiradi).

```
legendarygroup/
├── apps/
│   ├── api/          NestJS (HTTP API)
│   ├── worker/       NestJS standalone (BullMQ consumer, cron)
│   ├── bot/          grammY
│   ├── miniapp/      React + Vite (Telegram Mini App)
│   ├── web/          React + Vite (admin panel)
│   └── site/         Astro landing (Faza 4)
├── packages/
│   ├── contracts/    Zod sxemalar, tiplar
│   ├── domain/       sof biznes mantiq
│   ├── db/           Drizzle sxema + migratsiyalar
│   ├── ui-core/      tokenlar, ikonlar, formatlash
│   ├── ui-tg/        Mini App komponentlari
│   ├── ui-web/       web panel komponentlari
│   ├── i18n/         o'zbekcha matnlar
│   └── config/       eslint/tsconfig/tailwind
├── infra/
│   ├── terraform/    AWS (OpenTofu/Terraform)
│   ├── docker/       Dockerfile'lar, compose (dev/staging/prod)
│   └── caddy/        Caddyfile
├── docs/             shu hujjatlar
├── .github/workflows/
└── CLAUDE.md
```

## 7. ADR (Architecture Decision Records)

Har bir muhim qaror `docs/adr/NNNN-nom.md` faylida: kontekst → qaror → oqibatlar. Mavjud:

- [0001 — TypeScript monorepo, modulli monolit](adr/0001-typescript-modular-monolith.md)
- [0002 — Ledger asosidagi billing](adr/0002-ledger-billing.md)
- [0003 — Bitta EC2 + Docker Compose, RDS](adr/0003-single-host-compose.md)
- [0004 — API freymvorki, OpenAPI, idempotency](adr/0004-api-framework-openapi.md)
- [0005 — Transactional outbox → BullMQ, worker](adr/0005-outbox-bullmq-worker.md)
- [0006 — Xodimlar autentifikatsiyasi (web)](adr/0006-staff-auth.md)
- [0007 — RBAC, deny by default, audit](adr/0007-rbac.md)
