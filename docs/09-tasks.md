# 09 — Vazifalar (Backlog)

> Format: `ID` · nomi · **Bog'liq** (avval bajarilishi kerak) · **Talablar** (FR/BR) · **Qabul mezonlari (AC)**.
> Har vazifa = 1 PR (katta bo'lsa — kichik qismlarga bo'linadi). Har vazifa [Definition of Done](07-quality-security.md#4-definition-of-done-har-vazifa-uchun)ga javob berishi shart.
> Holat: ⬜ boshlanmagan · 🟨 jarayonda · ✅ tayyor
> **Yashirin bog'liqlik:** ekran yaratadigan har vazifa (web/Mini App) T-009 va tegishli T-017c maketiga bog'liq, hatto "Bog'liq"da yozilmagan bo'lsa ham.
> **Ish tartibi:** har vazifa [12-ai-playbook.md](12-ai-playbook.md) bo'yicha bajariladi (`/task T-XXX`). "Aniqlik" qatorlari — hujjatlar auditida (2026-11-11) qabul qilingan qarorlar, savol bermasdan shularga amal qilinadi.
> T-108 ataylab yo'q (mavjud ma'lumot importi kerak emas — 10-open-questions.md).

---

## F0 — Poydevor

### ✅ T-001 · Monorepo skeleti

- **Bog'liq:** —
- **AC:**
  - pnpm workspaces + Turborepo; `apps/{api,worker,bot,miniapp,web}`, `packages/{contracts,domain,db,ui,i18n,config}`.
  - Umumiy `tsconfig` (strict), ESLint (typescript-eslint strict + boundaries), Prettier, Husky + lint-staged, commitlint.
  - `pnpm dev | build | test | lint | typecheck` ildizdan ishlaydi.
  - `.editorconfig`, `.nvmrc`, `.gitignore`, `README.md` (ishga tushirish yo'riqnomasi).
  - Barcha bog'liqliklar eng so'nggi stable, aniq versiyalar bilan.
- **Aniqlik:** "eng so'nggi" = `minimumReleaseAge` (7 kun) dan o'tgan eng yangi barqaror versiya. Node 26 (Active LTS), pnpm 12; paket chegaralari ESLint `no-restricted-imports` bilan (domain/contracts/bot/UI → DB yo'q); typescript-eslint `strict`; Renovate (`renovate.json`).

### ✅ T-002 · Lokal muhit (Docker Compose dev)

- **Bog'liq:** T-001
- **AC:** `compose.dev.yml`: Postgres, Redis, MinIO (S3 emulyatsiya), Mailpit shart emas. `pnpm dev` — barcha ilovalar hot-reload bilan. `.env.example` to'liq izohlangan. Toza kompyuterda 10 daqiqada ishga tushadi.
- **Aniqlik:** Postgres 18 (prod RDS bilan bir xil major), MinIO bucket — faqat private (presigned URL), image'lar aniq tegga qotirilgan (`latest` yo'q). MinIO community image'lari 2025-09 dan to'xtatilgan — oxirgi relizda qotirilgan; yangilash kerak bo'lsa muqobil (SeaweedFS/Garage) ADR bilan.

### ✅ T-003 · DB paketi va birinchi migratsiya

- **Bog'liq:** T-002
- **AC:** Drizzle sozlangan; `users, roles, permissions, role_permissions, user_roles, sessions, audit_logs, settings, outbox_events, files, feature_flags` jadvallari; UUIDv7; seed skripti (4 rol + permission ro'yxati + test Director). `audit_logs`ga UPDATE/DELETE DB grant bilan taqiqlangan.
- **Aniqlik:** rol→ruxsat matritsasi `@lg/contracts/roles.ts`da; seed idempotent va matritsani sinxronlaydi; `lg_app` roli + `forbid_mutation()` trigger (0001); integratsiya testlari `pnpm test:int`.

### ✅ T-004 · API skeleti (NestJS)

- **Bog'liq:** T-003
- **AC:** Fastify adapter; config modul (Zod bilan env validatsiyasi — noto'g'ri env'da ishga tushmaydi); pino logger + requestId; global xato filtri (yagona format); `/health/live`, `/health/ready` (DB, Redis); OpenAPI `/docs` (faqat staging/local); Zod validatsiya pipe; graceful shutdown.
- **Aniqlik:** `Clock` interfeysi `packages/domain/src/clock.ts` (`SystemClock`, testda `FixedClock`) DI orqali; `Idempotency-Key` interceptor (`idempotency_keys` jadvali); ichki API `/internal/*` (`INTERNAL_API_TOKEN`, faqat Docker tarmog'i) — bot uchun; `@lg/api` paketi `bootstrapWorker()` eksport qiladi (apps/worker shuni chaqiradi); DB ulanishi `createDb`/`closeDb` (`@lg/db`). **Bajarildi (2026-11-11, review'dan keyin):** marshrutlar `/api/*`, `/internal/*` prefiksiz; `@Public()`; `@ZodBody`/`@ZodQuery` (validatsiya + OpenAPI Zod'dan); xato matnlari `@lg/i18n`da; idempotency band qilish orqali (ADR 0004); integratsiya testlari vaqtinchalik DB'da (`@lg/db/testing`); DI `@Inject` bilan, metadata'siz. Modullar chegarasi: `eslint-plugin-boundaries` (`apps/api/src/modules/*` — boshqa modulning `*.repository`/ichki fayllarini import qilish taqiqlangan, faqat `index.ts` public API) + import resolver sozlanadi.

### ✅ T-005 · Worker skeleti + outbox

- **Bog'liq:** T-004
- **AC:** BullMQ ulanishi; repeatable job registratsiyasi; outbox poller (har 1 s, `FOR UPDATE SKIP LOCKED`); retry + exponential backoff + dead-letter; Bull Board (faqat ichki, auth bilan).
- **Aniqlik:** `outbox_events`ga yangi migratsiya: `next_attempt_at`, `last_error`, `failed_at` + qisman indeks; backoff 1s·2ⁿ, maks. 10 urinish → dead-letter + alert. Iste'molchilar idempotent (event `id` bo'yicha dedup). **Bajarildi (2026-11-11):** ADR 0005; `OutboxService`/`EventHandlers`/`CronJobs`; `outbox_consumptions` jadvali; Bull Board worker'ning ichki portida (`/queues`, basic auth); dev — `development` export sharti.

### ✅ T-006 · Auth: xodimlar (web)

- **Bog'liq:** T-004 · **Talablar:** FR-AUTH-3, 4, 7
- **AC:** telefon+parol login (Argon2id), TOTP 2FA (Director/Admin majburiy, QR bilan sozlash, zaxira kodlar), JWT access 15 daq + refresh rotatsiya (httpOnly, Secure, SameSite=Strict), refresh qayta ishlatilsa — oila bekor, sessiyalar ro'yxati/bekor qilish, rate limit. Testlar: muvaffaqiyatli, noto'g'ri parol, 2FA, token o'g'irlash ssenariysi.
- **Aniqlik:** zaxira kodlar — 10 ta, `user_backup_codes` (hash); "Telegram orqali kirish" — Redis'da 5 daqiqalik challenge, bot tasdiq tugmasi; TOTP sirri AES-256-GCM (`TOTP_ENCRYPTION_KEY` env) bilan shifrlanadi. **Bajarildi (2026-11-11):** ADR 0006; global `AccessTokenGuard` (`@Public()` istisno); o'g'irlik — faqat almashtirilgan token (`sessions.replaced_at`); Telegram kirish — API tomoni tayyor, bot tugmasi T-010/T-109 da (`StaffTelegramLoginRequested`).

### ✅ T-007 · Auth: Telegram (Mini App + bot)

- **Bog'liq:** T-006 · **Talablar:** FR-AUTH-1, 2, 5
- **AC:** `initData` HMAC tekshiruvi (server), `auth_date` ≤ 24 soat; telegram_id → user; bir nechta rol bo'lsa rol tanlash; "Telegram orqali web'ga kirish" (bot tasdiq tugmasi). Testlar: soxta initData rad etiladi, eskirgan rad etiladi.
- **Aniqlik:** Mini App `sessions` ishlatmaydi: `POST /api/auth/telegram` (initData) → access JWT 15 daq (xotirada saqlanadi, cookie yo'q); muddati o'tsa joriy initData bilan qayta almashtiriladi. Faol rol token ichida. **Bajarildi (2026-11-11):** `verifyInitData` (HMAC, ≤ 24 soat, kelajakdagi `auth_date` rad), `POST /api/auth/telegram` (`choose_role` → `role` bilan qayta), sessiyasiz token har so'rovda foydalanuvchi/rol/pv bo'yicha tekshiriladi; bog'lanmagan Telegram — `TELEGRAM_NOT_LINKED` (ro'yxatdan o'tish — T-110); bot tasdiq tugmasi — T-010 (`StaffTelegramLoginRequested`).

### ✅ T-008 · RBAC + scope + policy + audit

- **Bog'liq:** T-006 · **Talablar:** 02-roles-permissions.md (to'liq), FR-AUD-1
- **AC:**
  - Ruxsatlar katalogi `packages/contracts/src/permissions.ts` — yagona manba; 02-roles-permissions.md §4 jadvali shundan generatsiya qilinadi (CI hujjat va kod mosligini tekshiradi).
  - `@RequirePermission` guard; deny-by-default — dekoratorsiz endpoint CI'da yiqiladi.
  - Scope servisi: ustoz roli (`main`/`assistant`/`substitute`) va sana bo'yicha, ota-ona bog'lanishi bo'yicha (§3); arxivlangan farzand tarixi ota-onaga ochiq.
  - Field-level serializer filtri (§3 jadvali).
  - Faol rol (active role) — token'da, rol almashtirish endpoint'i; ruxsatlar birlashtirilmaydi.
  - `permissions_version` — ruxsat/rol o'zgarsa keyingi so'rovdan kuchga kiradi; bloklashda barcha sessiyalar bekor.
  - Delegatsiya qilinmaydigan ruxsatlar Admin'ga berilmaydi (API rad etadi); oxirgi Director himoyasi.
  - Policy funksiyalari `packages/domain/policies` (§6) + unit testlar.
  - **Avtomatik matritsa testi:** har rol × har ruxsat × scope (o'z/begona obyekt) — kutilgan natija bilan integratsiya testlari.
  - Audit interceptor (before/after, actor, faol rol, ip) har yozish amalida.
  - Birinchi Director CLI buyrug'i: `apps/api/src/cli.ts`, ildizda `pnpm cli director:create --phone --name` → `staff_invites` havolasi (24 soat) chiqaradi; Director allaqachon bo'lsa rad etadi (`--force` yo'q).
- **Bajarildi (2026-11-11):** ADR 0007; `@RequirePermission`/`@Authenticated`/`@Public` + `PermissionsGuard` (Redis kesh `pv` bo'yicha); CI: `access-rules.test.ts` (dekoratorsiz endpoint va audit'siz yozish amali yiqiladi), `roles.test.ts` hujjat jadvalini to'g'ridan-to'g'ri o'qiydi; 140 holatli rol×ruxsat matritsa testi; override (delegatsiya qoidalari), bloklash, oxirgi Director, rol almashtirish; `@Audit`/`@NoAudit` interceptor; `packages/domain/policies` (BR-13/16/18/27/30/37); `pnpm cli director:create`; dev seed test Direktor taklif havolasini chiqaradi.
- **Ko'chirildi (jadvallar yo'q):** scope qoidalari va field-level filtr — o'z jadvallari bilan: ustoz scope'i (`group_teachers`) → T-103, ota-ona scope'i (`student_guardians`) va field-level (§3) → T-105, o'rinbosar scope'i → T-104; har biri o'z/begona obyekt matritsa testi bilan.

### ✅ T-009 · i18n paketi va UI poydevori

- **Bog'liq:** T-001
- **AC:** `packages/i18n` (tiplangan kalitlar, pul/sana formatlash `1 250 000 so'm`, `10-noyabr, 2026`), `packages/ui-core|ui-tg|ui-web` (T-017b tokenlari asosida) + Storybook; `apps/web` — shadcn/ui, Tailwind, layout, login, ruxsatga qarab menyu (11-ux.md §2); `apps/miniapp` — Telegram SDK, tema (light/dark/custom + kontrast fallback), BackButton/MainButton/SecondaryButton, haptic, closing confirmation, safe-area, rolga qarab pastki tablar, rol almashtirish, deep link (`startapp`) router.
- **Aniqlik:** i18n'da: pul formatlash (U+00A0 ajratuvchi), summani so'z bilan yozish (chek uchun, `toWordsUz(bigint)` + testlar), qidiruv normalizatsiyasi `normalizeUz()` — `' ‘ ’ ʻ ʼ \`` → bitta kanonik belgi, kichik harf.
- **1-qism bajarildi (2026-11-11):** `@lg/i18n`: `formatMoney`/`parseMoney` (U+00A0, `soʻm`, property test), `formatDate` (`10-noyabr, 2026`, Toshkent), `formatDateShort`, `formatTime`, `formatPhone`, `toWordsUz`/`amountInWords`, `normalizeUz`. Qolgan: web va Mini App poydevori.
- **2-qism bajarildi (2026-11-12):** `@lg/ui-web` (Button, Card, Field, 5 holat komponentlari — shadcn uslubi, cva + tailwind-merge), `apps/web` — Vite + React 19, Tailwind 4 (T-017b tokenlari), TanStack Router/Query, login (W-01), TOTP sozlash/tasdiqlash (W-02), Telegram orqali kirish, taklif (invite), sessiyalar (W-32), ruxsatga qarab menyu (`GET /auth/me` endi `permissions` qaytaradi).
- **3-qism bajarildi (2026-11-12):** `ApiClient` → `@lg/ui-core` (yangilash strategiyasi tashqaridan: web — cookie, Mini App — initData). `@lg/ui-tg`: WebApp tiplari + `supports()` (Bot API versiyasi), `applyTelegramTheme` (AA fallback, sarlavha/fon/pastki panel rangi, `--lg-safe-*`), `useMainButton`/`useSecondaryButton`/`useBackButton`/`useSettingsButton`/`useClosingConfirmation`, haptic, 5 holat, `TabBar`, `@lg/ui-tg/testing` fake. `apps/miniapp`: C-01…C-04, `startapp` router (13 prefiks, boshqa rol uchun link — mos rolga o'tish), rolga qarab tablar. `apps/storybook` (Storybook 10, a11y addon, light/dark/past kontrast toolbar, fake Telegram ramkasi). Umumiy `@lg/ui-core/theme.css`.
- **Qarorlar:** "Telegram SDK" — rasmiy `telegram-web-app.js` + o'z tiplangan qatlamimiz (`@telegram-apps/sdk` emas): bog'liqlik yo'q, fake bilan to'liq testlanadi, imkoniyatlar versiya bo'yicha. Mini App tarixi xotirada (URL hash'da `tgWebAppData`). Pastki tablar va deep link yo'llari — faqat qurilgan ekranlar (har ekran vazifasi `tabs.ts`/`SCREEN_PATHS`ga qo'shadi); tab < 2 — menyu yashirin.
- **Bog'liq (qo'shimcha):** T-017b

### ✅ T-010 · Bot skeleti

- **Bog'liq:** T-004
- **AC:** grammY, webhook (`secret_token`), lokal — long polling; `/start`, `/help`, menyu tugmasi → Mini App; xatolarni Sentry'ga; xabar yuborish faqat worker navbati orqali (25 msg/s limiter, 429 `retry_after`, bloklangan foydalanuvchini belgilash).
- **Aniqlik:** webhook `update_id` Redis'da 24 soat saqlanadi — takroriy update e'tiborsiz qoldiriladi. **Bajarildi (2026-11-11):** `apps/bot` (grammY, `BOT_MODE` polling/webhook, `secret_token`, `/start` `/help`, menyu tugmasi — faqat HTTPS URL'da, lokal http'da oddiy havola); chiquvchi xabarlar — `TelegramOutbox.enqueue()` → worker `TelegramSender` (25/s, chatga 1/s, 429 `retry_after`, 403 → `TelegramChatBlocked` event, 4xx → dead-letter). Sentry — T-016 (hozircha strukturali log). Haqiqiy ishga tushirish uchun BotFather tokeni kerak (10-open-questions: egasidan).

### ⬜ T-011 · Dockerfile'lar va compose (staging/prod)

- **Bog'liq:** T-004, T-005, T-009, T-010
- **AC:** multi-stage, non-root, healthcheck, arm64+amd64; `compose.staging.yml`, `compose.prod.yml`; Caddy (TLS avtomatik, marshrutlar `/api`, `/bot/webhook`, `/`, `/app`, xavfsizlik headerlari); image hajmi api ≤ 250 MB.

### ⬜ T-012 · AWS infratuzilma (Terraform/OpenTofu)

- **Bog'liq:** — (parallel)
- **AC:** state bucket + lock; VPC, SG, EC2 (staging, prod) + Elastic IP + IAM instance profile; RDS (prod) — encrypted, PITR, deletion protection; S3 (files, backups — Object Lock, versioning, lifecycle, CRR); ECR; SSM Parameter Store; GitHub OIDC rol; CloudTrail; Budgets alert; Route 53 yozuvlari. `tofu plan` toza. Narx hisobi `docs/runbooks/costs.md`da.

### ⬜ T-013 · CI pipeline

- **Bog'liq:** T-001, T-011
- **AC:** 06-infrastructure.md §4 dagi PR pipeline'ning barcha bosqichlari; turbo remote cache; PR'da coverage hisoboti; branch protection qoidalari hujjatlangan; o'rtacha CI vaqti ≤ 10 daq.

### ⬜ T-014 · CD: staging va production

- **Bog'liq:** T-012, T-013
- **AC:** main → staging avto-deploy; release-please; teg → prod (qo'lda tasdiqlash), deploydan oldin RDS snapshot, migratsiya, health-check bilan restart, smoke test, avtomatik rollback; `infra/scripts/deploy.sh` idempotent. Rollback qo'lda ham bitta buyruq.

### ⬜ T-015 · Backup va restore drill

- **Bog'liq:** T-012, T-005
- **AC:** kunlik pg_dump (shifrlangan) → S3; oylik arxiv; oylik avtomatik restore drill job + Telegram hisobot; `docs/runbooks/restore.md` (PITR va dump'dan tiklash qadamlari) — staging'da amalda sinab ko'rilgan.

### ⬜ T-016 · Monitoring va alertlar

- **Bog'liq:** T-011
- **AC:** Sentry (api, worker, bot, web, miniapp — source map'lar bilan); OTel → Grafana Cloud; asosiy dashboard (RPS, p95, xatolar, navbatlar, DB); uptime tekshiruvlari; 06-infrastructure.md §6 dagi barcha alertlar texnik Telegram guruhiga.

### ✅ T-017a · UX: ekranlar xaritasi va oqimlar

- **Bog'liq:** — (F0 bilan parallel)
- **AC:** [11-ux.md](11-ux.md) §2 asosida har rol × kanal uchun to'liq ekranlar ro'yxati (`docs/ux/screens.md`); har ekran: maqsad, ma'lumotlar, amallar, kerakli ruxsat kodi (02-roles-permissions.md §4), 5 holat; har FR uchun qaysi ekranda bajarilishi (bog'lanmagan FR qolmasligi kerak); asosiy oqimlar diagrammasi (davomat, chek yuborish → tasdiqlash, to'lov kiritish, ota-ona onboarding, tasdiqlash so'rovi, Excel import); barcha deep link'lar ro'yxati.
- **Bajarildi (2026-11-11):** [docs/ux/screens.md](ux/screens.md) — 73 ekran (C/MT/MG/MS/W/B ID'lari), 69 FR qamrovi, 6 oqim (mermaid), 13 deep link prefiksi; CI: `packages/contracts/src/ux-coverage.test.ts` (bog'lanmagan FR, noma'lum ekran ID yoki ruxsat kodi — yiqiladi).

### ✅ T-017b · UX: dizayn tokenlari va komponentlar katalogi

- **Bog'liq:** T-017a
- **AC:** tokenlar (rang, tipografiya, oraliq, radius, soya) light/dark + Telegram `themeParams` xaritasi va kontrast fallback; `ui-tg` va `ui-web` komponentlar ro'yxati (har biri holatlari bilan); ikon to'plami; bot xabar shablonlari katalogi (11-ux.md §6).
- **Bajarildi (2026-11-11):** tokenlar kodda — `packages/ui-core/src/tokens` (palitra light/dark, `resolveTelegramTheme` + WCAG kontrast fallback, CSS o'zgaruvchilar; palitraning har matn jufti AA testda); katalog — [docs/ux/design-system.md](ux/design-system.md) (ikonlar — Lucide, ui-tg/ui-web komponentlari holatlari bilan, 19 bot shabloni). Qaror: tugma yozuvi — WCAG katta matn (19 px qalin, 3:1) — Telegram standart temasi native qoladi.

### 🟨 T-017c · UX: barcha ekranlar maketi (hi-fi)

- **Bog'liq:** T-017b
- **AC:** T-017a dagi har bir ekran light/dark, 5 holat bilan; Mini App 360/390/430 px va desktop Telegram kengliklari; web 1280/1440 px; o'lchanadigan mezonlar (11-ux.md §5) bo'yicha teginish sonlari hisoblangan; loyiha egasi qabul qilgan. Har UI vazifasi boshlanishidan oldin tegishli maket tayyor bo'lishi shart.
- **Aniqlik:** maket formati — Figma emas: `ui-tg`/`ui-web` komponentlaridan mock ma'lumot bilan yig'ilgan **Storybook ekran story'lari** (`*.screen.stories.tsx`) + Playwright skrinshotlari `docs/ux/screens/`ga; egasi skrinshotlar bo'yicha qabul qiladi. Maket kodi keyin haqiqiy ekranda qayta ishlatiladi.
- **Qismlarga bo'lindi** (har UI vazifasidan oldin tegishli qism tayyor bo'lishi kifoya): 1 — Ustoz asosiy (MT-01…05), 2 — Ustoz qolgan + C-05, 3 — Ota-ona, 4 — xodim rejimi, 5–6 — web. Holat: [docs/ux/screens/README.md](ux/screens/README.md).
- **1-qism bajarildi (2026-11-12), egasi qabulini kutmoqda:** `ui-tg`: `Section`/`ListItem`, `StatusChip`, `AttendanceRow` (teginish/uzoq bosish), `ActionSheet`; `apps/miniapp/src/screens/teacher` — MT-01…05 ko'rinishlari (props bilan, API'siz) + davomat mantiqi (`attendance-marks.ts`, testlar); `pnpm -F @lg/storybook screenshots` — Playwright, 57 skrinshot.
- **2-qism bajarildi (2026-11-12), egasi qabulini kutmoqda:** MT-06 (davomat kalendari, baholar, izoh — ota-onaga/ichki), MT-07/08 (testlar, BR-35 import ko'rib chiqish), MT-09 (hafta qatori, o'rinbosar), MT-10 (qoralama, oldindan ko'rish, tasdiqlash), MT-11 (oylar, tafsilot — Q-33), C-05. `ui-tg`: `MoneyText`, `TextArea`, `Segmented`, `DayStrip`, `AttendanceCalendar`. Jami 72 story, 137 skrinshot.
- **3-qism bajarildi (2026-11-12), egasi qabulini kutmoqda:** MG-01…MG-10 + MG-11 "Ko'proq" (screens.md'ga qo'shildi; MG-01 havolasi MG-07 → MG-06 tuzatildi). `ui-tg`: `ChildSwitcher`, `MoneyInput` (bigint, U+00A0), `CopyField`, `FilePicker` (4 holat), `ProgressChart` (vergulli o'nlik). Storybook ramkasi: MainButton webview tashqarisida (haqiqiy Telegram kabi). Jami 113 story, 228 skrinshot.
- **4-qism bajarildi (2026-11-12), egasi qabulini kutmoqda:** MS-01 (KPI; "So'rovlar" — faqat Director), MS-02 (chek navbati: summa tahriri, dublikat BR-15, bank eslatmasi BR-14, yumshoq lock, rad etish sababi — shablon yoki o'z matni; har chek uchun holat `key` bilan yangilanadi), MS-03 (ro'yxat + qaror, 48 soat muddat), MS-04 (`normalizeUz` qidiruv), MS-05 (qo'ng'iroq `tel:`). `ui-tg`: `KpiTile`, `SearchField`, `ImageViewer`, `TabBar` badge. Jami 130 story, 275 skrinshot. **Mini App maketlari to'liq**; keyingi — web (5–6-qism).
- **5a-qism bajarildi (2026-11-12), egasi qabulini kutmoqda:** web F1 — W-04, W-05/06, W-07…W-12, W-28, W-29, W-33. `ui-web`: `DataTable` (TanStack Table: saralash `aria-sort`, skeleton, bo'sh/xato, cursor "Yana yuklash"; raqamli ustunlar o'ngga), `Badge`, `KpiCard`, `PageHeader`, `Tabs`, `SelectField`, `Drawer`. `AppLayout` → presentatsion `AppShell` (ilova va maket bir xil). Pul saralash — bigint taqqoslash. Web 5b (to'lovlar) va 6 qoldi. Jami 162 story, 333 skrinshot.
- **5b-qism bajarildi (2026-11-12), egasi qabulini kutmoqda:** W-13 (sichqonchasiz: Enter/Esc/1–4, FIFO preview — serverdan), W-14, W-15 (aging, BR-22 kritik), W-16 (farq — izoh majburiy), W-17 (storno — teskari yozuv, refund — faqat Direktor), W-18 (BR-18 limit), W-31, W-34 (PII'siz). `ui-web`: `MoneyField` (bigint). `packages/domain`: `allocateFifo` (BR-12) + property-based testlar — T-202/T-204 serverda ishlatadi (UI domenni import qilmaydi, 03 §2). Jami 185 story, 372 skrinshot.

### ⬜ T-018 · Staging uchun anonimlashtirish

- **Bog'liq:** T-015
- **AC:** prod dump → ism, telefon, telegram_id, rasm, izohlar soxtalashtiriladi (deterministik, bog'lanishlar saqlanadi) → staging'ga; haftalik avtomatik; anonimlashtirilmagan ma'lumot staging'ga tushishi CI testida tekshiriladi (namunaviy qatorlar).

### ✅ T-019 · Fayllar moduli (S3)

- **Bog'liq:** T-004 · **Talablar:** FR-SYS-2, 07-quality-security.md §3 (fayl yuklash)
- **AC:** `files` moduli: presigned POST (maks. 10 MB, ruxsat etilgan MIME ro'yxati `purpose` bo'yicha), yuklangandan keyin tasdiqlash endpoint'i — magic bytes tekshiruvi, SHA-256, rasm qayta kodlanadi (EXIF olib tashlanadi, `sharp`); presigned GET (5 daq); lokal — MinIO; `files` yozuvi + audit; bot orqali kelgan fayl uchun ichki endpoint (bot Telegram'dan yuklab, shu oqimga beradi). Testlar: noto'g'ri MIME, katta fayl, soxta kengaytma.
- **Bajarildi (2026-11-11):** maqsadlar `@lg/contracts` `FILE_PURPOSES` (tur, hajm, `upload`/`view` ruxsati); `POST /api/files/uploads` → S3 `tmp/` (presigned POST, hajm/Content-Type S3 shartida) → `…/complete` (`file-type` magic bytes, `sharp` qayta kodlash, EXIF yo'q, SHA-256) → `files/YYYY/MM/<id>.<ext>`; `GET /api/files/:id/url` (5 daq; yuklagan yoki `view` ruxsati, aks holda 404); bot — `POST /internal/files` (octet-stream). Modul scope'i (masalan, ota-ona faqat o'z farzandi cheki) — o'z modulida (T-206).

---

## F1 — Asosiy jarayon

### 🟨 T-101 · Xodimlarni boshqarish

- **Bog'liq:** T-008 · **Talablar:** FR-AUTH-5
- **AC:** Director Admin/Ustoz qo'shadi (telefon, ism, rol), taklif havolasi botga; bloklash; ruxsat override UI.
- **Aniqlik:** taklif = `staff_invites` (24 soat, bir martalik). Admin/Director havola orqali parol + TOTP o'rnatadi; Ustoz paroli yo'q — havola botni ochadi, telefon ulashganda `telegram_id` bog'lanadi. Override qoidasi — 02 §4. Bloklash → barcha sessiyalar bekor, `permissions_version + 1`.
- **Backend va bot bajarildi (2026-11-12):** `GET/POST /api/staff`, `GET /api/staff/:id`, `POST /api/staff/:id/{invite,unblock,roles}` (`staff.manage`; bloklash/rolni olish/override — T-008 `RbacController`); mavjud foydalanuvchiga rol qo'shish (FR-AUTH-5: ota-ona ham ustoz); taklif kanali `staff_invites.channel` (migratsiya 0007, expand): Admin — `PUBLIC_APP_URL/invite/<token>`, Ustoz — `t.me/<bot>?start=inv_<token>`; qayta taklif eskisini darhol yaroqsiz qiladi. Bot: `/start inv_` → telefon ulashish (faqat o'z kontakti) → `POST /internal/staff/contact`. **Xavfsizlik tuzatishi:** `acceptInvite` taklifni yondirib parol yozgandan KEYIN rolni tekshirardi — bot tokeni bilan Ustozga parol o'rnatish va taklifni yondirish mumkin edi; endi faqat `web` kanal, rol tekshiruvi tranzaksiya ichida (avval qizil regressiya testi). Yangi env: `TELEGRAM_BOT_USERNAME`, `PUBLIC_APP_URL` (API), `API_INTERNAL_URL` (bot). **Qolgan:** W-28 UI (maket qabul qilingach).

### 🟨 T-102 · Kurslar va xonalar

- **Bog'liq:** T-008 · **Talablar:** FR-ORG-1, 2
- **AC:** CRUD (web), arxivlash, validatsiya, audit.
- **Aniqlik:** shu vazifa `branches` jadvalini (id, name) bitta seed qatori bilan yaratadi; keyingi biznes jadvallar `branch_id` FK oladi (standart — yagona filial).
- **Backend bajarildi (2026-11-12):** `branches` (0008) + yagona filial qatori (0009, `DEFAULT_BRANCH_ID`, `branch_id` standarti); `courses` (darajalar `text[]`, narx `bigint`, dars 15–480 daq, `duration_months`, `grade_scale` BR-33), `rooms` (sig'im 1–500); faol nom filial ichida unique (`lower(name)`, partial — arxivdagi nom qayta ishlatiladi; parallel so'rovda ham DB tekshiradi). `GET/POST /api/{courses,rooms}`, `GET/PATCH /api/{…}/:id`, `POST /api/{…}/:id/{archive,restore}` — `course.manage`; arxivdagi yozuv tahrirlanmaydi; audit `course.*`/`room.*` (before/after — faqat farq). Q-66 standart varianti. **Qolgan:** W-09 UI (maket qabul qilingach).

### 🟨 T-103 · Guruhlar va jadval

- **Bog'liq:** T-102, T-101 · **Talablar:** FR-ORG-3, 4, 6
- **AC:** (T-008 dan) ustoz scope servisi: `group_teachers` bo'yicha hozirgi sanada faol guruhlar (02 §3, Q-64) + o'z/begona guruh matritsa testi; guruh CRUD, ustoz biriktirish (asosiy/yordamchi, sanalar bilan), faol guruhli kursni arxivlash taqig'i (Q-66), haftalik jadval sloti; xona va ustoz to'qnashuvi DB darajasida rad etiladi (exclusion constraint) va UI'da tushunarli xabar; guruh holatlari.
- **Backend bajarildi (2026-11-12):** `groups`, `group_teachers`, `schedule_slots`, `schedule_occupancy` (0012) + EXCLUDE USING gist (0013, `btree_gist`): xona/ustoz to'qnashuvi, bir davrda bitta asosiy ustoz, ustoz takrori — DB darajasida; 409 `SCHEDULE_CONFLICT` tafsiloti (qaysi xona/ustoz, qaysi guruh, qaysi vaqt). Domen: `occupancyFor`, `findSlotOverlap`, `planScheduleChange`, holat o'tishlari (`forming → active ⇄ paused → finished`). `GroupScopeService` (Ustoz — bugun amaldagi biriktirishlari, Q-64) + matritsa testi. API: `GET /api/groups` (`status`, `courseId`, `roomId`, `teacherId`), `GET /:id`, `POST` (slotlar/ustozlar bilan, narx/baho kursdan), `PATCH`, `POST /:id/status`, `PUT /:id/schedule` (sanadan), `POST /:id/teachers` (yangi asosiy — almashtirish, FR-ORG-6), `POST /:id/teachers/:assignmentId/end`. Q-66 (faol guruhli kurs/xona arxivlanmaydi), Q-69. `StaffDirectoryService` (rbac public). **Qolgan:** W-10 UI (maket qabul qilingach); o'rinbosar va dars darajasidagi to'qnashuv — T-104; enrollment soni ≤ `max_students` — T-106.

### ⬜ T-104 · Darslar generatsiyasi va kalendar

- **Bog'liq:** T-103, T-005 · **Talablar:** FR-ORG-5, BR-5
- **AC:** worker har kuni darslarni gorizontgacha generatsiya qiladi — kamida 4 hafta va keyingi kalendar oyining oxirigacha (FR-ORG-5; idempotent: unique(group_id, date, start_time)); bayramlar jadvali; dars bekor qilish (sabab), ko'chirish, qo'shimcha dars; ustoz uchun kalendar ko'rinishi (web + miniapp); jadval o'zgarsa kelajakdagi darslar qayta hisoblanadi (o'tganlari o'zgarmaydi).

### 🟨 T-105 · O'quvchilar va ota-onalar

- **Bog'liq:** T-008 · **Talablar:** FR-STU-1, 2, 5, 6, FR-AUTH-6
- **AC:** (T-008 dan) ota-ona scope'i (`student_guardians`; arxivlangan farzand tarixi ochiq) va field-level serializer (02 §3 jadvali) + matritsa testi; kartochka, o'quvchi `code` (inson o'qiy oladigan raqam) avtomatik beriladi, ota-ona(lar) bog'lash (telefon bo'yicha mavjud ota-onani topish), qidiruv/filtrlar (kod, ism — `normalizeUz()` bilan, T-009; DB'da `pg_trgm` indeks normalizatsiyalangan ustun ustida), arxiv; telefon normalizatsiyasi (+998); dublikat o'quvchi ogohlantirishi (ism + tug'ilgan sana).
- **Backend bajarildi (2026-11-12):** `students` (kod — identity 10001 dan; `search_name` + `pg_trgm` GIN, migratsiya 0010/0011), `guardians` (telefon — bog'lash kaliti), `student_guardians` (bitta asosiy — partial unique). `StudentScopeService` (Director/Admin — hammasi; Ota-ona — `guardians.user_id` orqali, arxivdagisi ham; Ustoz — T-106 gacha hech kim) + field-level serializer (ota-ona telefoni, ichki maydonlar — Q-67) + matritsa testi. API: `GET /api/students` (qidiruv: kod `LG-10001`/`10001`, telefon — o'quvchi yoki ota-ona, ism — `normalizeUz`; cursor), `GET /:id`, `GET /:id/photo` (scope bilan), `POST` (ota-onalar bilan; dublikat — 409 `POSSIBLE_DUPLICATE`, `allowDuplicate`, Q-68), `PATCH`, `archive/restore`; `POST/PATCH/DELETE /api/students/:id/guardians[/:guardianId]`, `GET /api/guardians/lookup?phone=`, `PATCH /api/guardians/:id` (ism). Telefon normalizatsiyasi — `@lg/contracts` `normalizePhone` (API va UI bitta). `student_photo` umumiy `/files/:id/url` — endi faqat xodim (scope chetlab o'tilmasin). Audit — PII maskalangan (`common/audit/audit-diff.ts`). **Qolgan:** W-07/W-08 UI (maket qabul qilingach); Ustoz scope'i — T-106; qarzdor filtri — T-208; guruh bo'yicha qidiruv — T-106.

### ⬜ T-106 · Enrollment (guruhga yozish)

- **Bog'liq:** T-103, T-105 · **Talablar:** FR-STU-3, BR-32
- **AC:** (T-105 dan) `StudentScopeService`ga Ustoz qismi (hozir yozilgan o'quvchilari) + matritsa testi kengaytiriladi; qidiruvga guruh filtri; qo'shish/chiqarish/ko'chirish (sana, sabab), guruh sig'imi tekshiruvi, tarix, chegirma maydoni (F2 da ishlatiladi), muzlatish (freeze) yozuvi.

### ⬜ T-107 · Lidlar

- **Bog'liq:** T-105 · **Talablar:** FR-STU-4
- **AC:** lid kanbani (holatlar), sinov darsiga yozish, lid → o'quvchiga aylantirish (ma'lumotlar ko'chadi), manba statistikasi.

### ⬜ T-109 · Bildirishnomalar moduli

- **Bog'liq:** T-010, T-005 · **Talablar:** FR-RPT-4, 6
- **AC:** shablonlar (i18n), `notify(userId, template, payload)` API → outbox → navbat; holatlar (queued/sent/failed/blocked); qayta urinish; foydalanuvchi sozlamalari (majburiy turlarni o'chirib bo'lmaydi); Admin uchun "yetib bormagan xabarlar" ro'yxati.

### ⬜ T-110 · Ota-ona onboarding (bot)

- **Bog'liq:** T-007, T-105, T-109 · **Talablar:** FR-AUTH-1
- **AC:** `/start` → maxfiylik roziligi → "Raqamni ulashish" (faqat o'z kontakti qabul qilinadi — `contact.user_id == from.id`) → mos ota-ona topilsa bog'lanadi va farzand(lar) ko'rsatiladi; topilmasa — Admin'ga so'rov; bir nechta farzand; qayta `/start` xavfsiz.
- **Aniqlik:** so'rovlar web'da "Bog'lanish so'rovlari" ro'yxatida (O'quvchilar bo'limi); Admin ota-onani tanlab bog'laydi yoki rad etadi → botga natija.

### ⬜ T-111 · Davomat (Mini App, Ustoz)

- **Bog'liq:** T-104, T-106, T-009 · **Talablar:** FR-ATT-1, 2, 4, 6, BR-29, 30
- **AC:** "Bugungi darslarim" → guruh → ro'yxat (standart "keldi"), bir teginishda holat o'zgartirish + haptic, kech qolish daqiqasi, MainButton "Saqlash"; offline: lokal navbat + `client_mutation_id`, qayta ulanganda sinxronizatsiya, UI'da "sinxronlanmagan" belgisi; tahrirlash muddati qoidasi; 20 o'quvchi ≤ 20 s (qo'lda sinov).

### ⬜ T-112 · Davomat (Web, Admin) va eslatmalar

- **Bog'liq:** T-111 · **Talablar:** FR-ATT-4, 5
- **AC:** guruh × sana jadval ko'rinishi, o'tgan davomatni sabab bilan o'zgartirish (audit), belgilanmagan darslar ro'yxati; worker: 30 daq → ustozga, 2 soat → Admin'ga eslatma.

### ⬜ T-113 · "Kelmadi/kech qoldi" xabari ota-onaga

- **Bog'liq:** T-111, T-109, T-110 · **Talablar:** FR-ATT-3, BR-31
- **AC:** `AttendanceMarked` event → BR-31 tuzatish oynasi (3 daq, sozlanadi) tugagach ≤ 1 daq ichida xabar (jami ≤ 5 daq); kech qolish — faqat ≥ 15 daq (BR-10); ko'p marta saqlash — bitta xabar (dedup); xato tuzatilsa tuzatish xabari (BR-31 tasdiqlangan varianti); integratsiya testi event → xabar.

### ⬜ T-114 · Ustoz Mini App (to'liq)

- **Bog'liq:** T-111, T-017c
- **AC:** 11-ux.md §2 bo'yicha 4 tab: Bugun, Guruhlarim (o'quvchi profili — field-level qoidalar bilan), Jadval (o'rinbosar darslari belgili), Profil (rol almashtirish, sozlamalar; F4 da oylik). O'rinbosar ustoz faqat tayinlangan darsni ko'radi.

### ⬜ T-119 · Tasdiqlash so'rovlari (approval requests)

- **Bog'liq:** T-008, T-109 · **Talablar:** 02-roles-permissions.md §5
- **AC:** `approval_requests` jadvali va umumiy mexanizm (type → bajariladigan amal handler'i); Admin so'rov yaratadi (sabab majburiy); Director'ga bot xabari inline "Tasdiqlash / Rad etish" + Mini App "So'rovlar" tabi; 48 soatda avtomatik bekor; qaror → amal bir tranzaksiyada bajariladi; so'rovchiga natija; audit. F2 dagi chegirma/storno/refund shu mexanizmdan foydalanadi.

### ⬜ T-120 · Director/Admin Mini App xodim rejimi

- **Bog'liq:** T-007, T-008, T-009, T-017c
- **AC:** 11-ux.md §2: Bugun, Navbat (F2 da to'ldiriladi), So'rovlar (T-119), Qidiruv (o'quvchi kartochkasi, qo'ng'iroq tugmasi); ruxsatga qarab tablar.

### ⬜ T-115 · Tizim sozlamalari

- **Bog'liq:** T-008 · **Talablar:** FR-SYS-1
- **AC:** Director uchun sozlamalar sahifasi: markaz ma'lumotlari, logo, karta rekvizitlari (bir nechta), to'lov muddati kuni (1–28, standart 10), jarima va kech qolish qoidalari, bildirishnoma vaqtlari, bayramlar, Admin chegirma limiti; har o'zgarish audit'da; sozlama tiplangan (Zod) va standart qiymatlar `10-open-questions.md` takliflariga mos.

### ⬜ T-116 · Ota-ona Mini App bosh sahifasi

- **Bog'liq:** T-110, T-111
- **AC:** farzandlar ro'yxati (bir nechta bo'lsa almashtirish), har farzand: bugungi/oxirgi davomat, guruh(lar), jadval, ustoz ismi; F2 da — balans va "To'lov qilish"; F3 da — baholar/progress. Bo'sh holatlar (empty state) va xatolik ekranlari.

### ⬜ T-117 · Birinchi ishga tushirish ustasi (Director)

- **Bog'liq:** T-115, T-102, T-103, T-101
- **AC:** bo'sh tizimda Director birinchi kirganda qadamma-qadam usta: markaz ma'lumotlari → karta rekvizitlari → kurs → xona → ustoz taklifi → guruh va jadval → o'quvchilar va ota-onalar → ota-onalarga taklif havolasi/QR. Har qadamni o'tkazib yuborish va keyin qaytish mumkin; progress saqlanadi.

### ⬜ T-118 · Ichki fikr-mulohaza tugmasi

- **Bog'liq:** T-009, T-109
- **AC:** Mini App va web'da "Taklif / xato haqida xabar" — matn + ixtiyoriy skrinshot + avtomatik kontekst (ekran, rol, versiya, requestId) → loyiha egasining Telegram chatiga va DB'ga; foydalanuvchiga "qabul qilindi" javobi.

---

## F2 — To'lovlar

### ⬜ T-201 · Billing domen paketi (sof mantiq)

- **Bog'liq:** T-001 · **Talablar:** BR-1…BR-20
- **AC:** `packages/domain/billing`: proporsional narx, invoice qatorlari, chegirma qo'llash, jarima hisobi, FIFO taqsimlash, balans ledger'dan; barcha funksiyalar sof, `bigint`; unit + property-based testlar, har BR uchun test; coverage ≥ 95%.

### ⬜ T-202 · Ledger, invoice jadvallari va avto-generatsiya

- **Bog'liq:** T-201, T-106, T-005, T-115 · **Talablar:** FR-PAY-1, BR-2, 3, 5, 6
- **AC:** migratsiyalar (invoices, invoice_lines, ledger_entries, payments, allocations, receipts, receipt_cancellations, receipt_counters — 05-data-model.md; o'zgarmaslar `forbid_mutation()` trigger + `lg_app` grant bilan); oyning 1-sanasi 00:05 job — idempotent (qayta ishga tushsa dublikat yo'q), bekor qilingan darslar krediti, yangi enrollment uchun proporsional invoice darhol; job ishlamasa alert.

### ⬜ T-203 · Chegirma, muzlatish, jarima

- **Bog'liq:** T-202, T-119 · **Talablar:** FR-PAY-6, BR-8, 9, 10, 18
- **AC:** chegirma (Admin limiti; undan yuqori — T-119 so'rovi orqali), freeze → kredit, oy yakunida jarima qatorlari (sozlamaga ko'ra), Admin bekor qilishi (sabab, audit); sozlamalar UI.

### ⬜ T-204 · To'lov kiritish (Admin, web)

- **Bog'liq:** T-202 · **Talablar:** FR-PAY-2, 6, BR-11, 12
- **AC:** tez forma (o'quvchi qidiruv → qarz ko'rinadi → summa → usul → Enter), FIFO taqsimlash yoki qo'lda, avans balansga, `Idempotency-Key` (ikki marta bosish = bitta to'lov), ≤ 30 s ssenariy E2E testida.

### ⬜ T-205 · PDF chek va tekshirish sahifasi

- **Bog'liq:** T-204 · **Talablar:** FR-PAY-8, BR-19
- **AC:** chek shabloni (logo, raqam, o'quvchi, guruh, oy, summa raqam+so'z bilan, usul, kassir, QR); worker'da PDF (Chromium), S3; ota-onaga botda PDF; QR → ommaviy `/verify/{token}` sahifa (faqat raqam, sana, summa, holat — PII yo'q); bekor qilingan chek "BEKOR QILINGAN".

### ⬜ T-206 · Ota-ona: o'tkazma cheki yuborish (bot + Mini App)

- **Bog'liq:** T-110, T-202, T-019 · **Talablar:** FR-PAY-3, BR-13
- **AC:** "To'lov qilish" → farzand tanlash → qarz summasi + karta rekvizitlari (nusxalash) → rasm/PDF yuklash + summa + izoh → "Tekshirilmoqda" xabari; fayl tekshiruvi (tur, hajm), S3; perceptual hash; holatni kuzatish.

### ⬜ T-207 · Tasdiqlash navbati (Admin)

- **Bog'liq:** T-206, T-204, T-205, T-120 · **Talablar:** FR-PAY-4, 5, BR-13, 14, 15
- **AC:** web + Mini App'da navbat (rasm katta ko'rinishda, zoom), tasdiqlash (summa tahriri) / rad etish (sabab shablonlari); dublikat ogohlantirishi; parallel tasdiqlashdan himoya (optimistic lock — ikki Admin bir vaqtda bosa olmaydi); natija ota-onaga; yangi chek kelganda Admin'ga bot xabari; 24 soat → Director eslatmasi.

### ⬜ T-208 · Qarzdorlik va eslatmalar

- **Bog'liq:** T-202, T-109 · **Talablar:** FR-PAY-7, BR-20, 21, 22
- **AC:** qarzdorlar ro'yxati (filtr, saralash, eksport), aging, kritik belgisi; eslatma jadvali (BR-21) worker'da; ota-ona Mini App'da balans va to'lovlar tarixi.

### ⬜ T-209 · Storno, refund, kassa yopish

- **Bog'liq:** T-204 · **Talablar:** FR-PAY-9, 10, BR-16, 17
- **AC:** storno (teskari ledger, chek bekor; kiritilgan kundan keyin — T-119 so'rovi), refund (Director yoki T-119 so'rovi), kunlik kassa yopish (kutilgan vs sanalgan, farq izohi); hammasi audit'da.

---

## F3 — Natijalar va hisobotlar

### ⬜ T-301 · Baholar va izohlar

- **Bog'liq:** T-111 · **Talablar:** FR-GRD-1, 2, BR-33
- **AC:** guruh baholash sozlamasi; davomat ekranida baho qo'yish (bir oqimda); izoh (ko'rinish turi bilan); ota-onaga baho xabari (sozlamaga ko'ra).

### ⬜ T-302 · Testlar va Excel import

- **Bog'liq:** T-301, T-019 · **Talablar:** FR-GRD-3, 4, 6, BR-34, 35
- **AC:** test yaratish (bo'limlar), shablon yuklab olish (botdan ham), `.xlsx` — ustoz faylni **botga yuboradi** yoki Mini App'da yuklaydi → Mini App ko'rib chiqish ekrani ochiladi → ustun moslashtirish (eslab qolinadi) → moslashtirish (ID → aniq ism → fuzzy taklif) → oldindan ko'rish va xatolar → atomar import → versiya; e'lon qilish → ota-onaga xabar. 500 qatorli fayl ≤ 10 s.

### ⬜ T-303 · O'quvchi progressi va reyting

- **Bog'liq:** T-302 · **Talablar:** FR-GRD-5
- **AC:** o'quvchi profilida grafiklar (davomat, baho, test), guruh reytingi (Ustoz/Admin), ota-ona Mini App'da farzand progressi.

### ⬜ T-304 · Haftalik va oylik ota-ona hisobotlari

- **Bog'liq:** T-303, T-208 · **Talablar:** FR-RPT-2, 3
- **AC:** yakshanba 19:00 haftalik, oy oxiri oylik (PDF + Mini App havolasi); har farzand alohida; navbat orqali (yuzlab ota-ona — rate limit); oldindan ko'rish (Admin uchun namunaviy hisobot).

### ⬜ T-305 · Ommaviy e'lonlar

- **Bog'liq:** T-109 · **Talablar:** FR-RPT-5
- **AC:** auditoriya tanlash (hamma / kurs / guruh / qarzdorlar), matn + rasm/fayl, oldindan ko'rish, yetkazilish statistikasi.

### ⬜ T-306 · Murojaatlar va "sababli" oldindan xabar

- **Bog'liq:** T-110, T-111 · **Talablar:** FR-RPT-7, FR-ATT-7
- **AC:** ota-ona botda savol → ticket → Admin web'da javob → botga; "Farzandim kela olmaydi" (sana, sabab) → ustoz ro'yxatida "sababli" oldindan belgilangan.

---

## F4 — Oylik va moliya

### ⬜ T-401 · Payroll domen mantiqi

- **Bog'liq:** T-201 · **Talablar:** BR-23…BR-28
- **AC:** `packages/domain/payroll`: fixed/percent/mixed/per-lesson, foiz bazasi (collected/accrued), o'rinbosar, avans ushlash; unit + property testlar.

### ⬜ T-402 · Ustoz shartnomalari va oylik hisob

- **Bog'liq:** T-401, T-202 · **Talablar:** FR-SAL-1…5
- **AC:** shartnoma UI (Director), oylik hisob qoralamasi (tafsilot: qaysi o'quvchidan qancha), bonus/jarima, tasdiqlash, "to'landi", avans; Ustoz Mini App'da o'zining hisobini ko'radi; tasdiqlangandan keyin o'zgartirish faqat tuzatish yozuvi bilan.

### ⬜ T-403 · Xarajatlar va P&L

- **Bog'liq:** T-202 · **Talablar:** FR-FIN-1…3
- **AC:** xarajat CRUD (chek rasmi), kategoriyalar, oylik P&L (tushum − xarajat − oylik), `finance.view` ruxsati.

### ⬜ T-404 · Audit UI va shubhali harakatlar

- **Bog'liq:** T-008, T-009 · **Talablar:** FR-AUD-2, 3
- **AC:** filtrlanadigan audit jurnali (kim/nima/qachon, diff ko'rinishi), shubhali harakatlar qoidalari va Director'ga bot ogohlantirishi, xodim faolligi hisoboti.

### ⬜ T-405 · Director dashboard

- **Bog'liq:** T-208, T-112, T-207 · **Talablar:** FR-DASH-1, 5
- **AC:** web bosh sahifa KPI'lar + Mini App ixcham versiya; ma'lumotlar ≤ 5 daq kesh; kunlik xulosa botga (21:00).

---

## F5 — Analitika, sayt, mustahkamlash

### ⬜ T-501 · Hisobotlar to'plami va eksport

- **Bog'liq:** T-405 · **Talablar:** FR-DASH-2, 4
- **AC:** daromad (oy/kurs/guruh/ustoz), qarz aging, davomat, cohort (o'quvchi saqlanishi), lid konversiyasi, ustoz samaradorligi; Excel/PDF eksport; og'ir so'rovlar uchun materialized view'lar (tungi yangilanish).

### ⬜ T-502 · Prognozlar va churn risk

- **Bog'liq:** T-501 · **Talablar:** FR-DASH-3, BR-36
- **AC:** tushum prognozi (1–3 oy, ishonch oralig'i bilan), churn ball (komponentlar tushuntirilgan — "nega xavfli"), xavfli o'quvchilar ro'yxati, guruh to'lishi; haftalik Director xulosasi; tarixiy ma'lumotda backtest hisoboti.

### ⬜ T-503 · Landing sayt

- **Bog'liq:** T-107 · **Talablar:** FR-SYS-4
- **AC:** Astro, kurslar (API'dan build vaqtida), lid formasi (spam himoyasi — Turnstile), SEO, Lighthouse ≥ 95.

### ⬜ T-504 · Yuklama testi va optimallashtirish

- **Bog'liq:** F1–F4
- **AC:** k6 ssenariylar (200 VU, invoice generatsiyasi, 1000 ota-onaga e'lon); p95 < 300 ms; sekin so'rovlar indekslandi.

### ⬜ T-505 · Xavfsizlik auditi

- **Bog'liq:** F1–F4
- **AC:** ASVS L2 checklist to'ldirilgan; IDOR testlari har rol uchun; zaif nuqtalar tuzatilgan; tashqi skaner (OWASP ZAP) hisoboti.

### ⬜ T-506 · Foydalanuvchi qo'llanmalari va runbook'lar

- **Bog'liq:** F1–F4
- **AC:** har rol uchun qo'llanma (skrinshotlar bilan); runbook'lar: deploy, rollback, restore, bot token almashtirish, insident javobi, yangi xodim qo'shish.

### ⬜ T-507 · v1.0 reliz

- **Bog'liq:** T-501…T-506
- **AC:** barcha F0–F5 vazifalar ✅, restore drill oxirgi oy muvaffaqiyatli, alertlar sinab ko'rilgan, loyiha egasi qabul qildi.

### ⬜ T-508 · Real ishga tushirish: birinchi ustoz

- **Bog'liq:** T-507
- **AC:** prod'da Director birinchi ishga tushirish ustasi (T-117) orqali markaz, kurs, ustoz, guruh(lar) va o'quvchilarni kiritadi; ustoz va ota-onalar botga ulanadi; real davomat, baho, to'lov va chek oqimlari ishlaydi; fikr-mulohaza tugmasi (T-118) orqali kelgan kamchiliklar backlog'ga vazifa bo'lib tushadi va tuzatiladi; keyingi ustozlarni qo'shishga tayyorlik loyiha egasi tomonidan tasdiqlanadi.
