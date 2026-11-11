# 12 — AI agent ish tartibi (playbook)

> Bu hujjat — kod yozuvchi har qanday AI agent (Claude, Gemini, boshqalar) uchun **ish tartibi**.
> Qoidalar: [CLAUDE.md](../CLAUDE.md). Bu yerda — **qanday** ishlash: qadamlar, qaror qabul qilish, kod tuzilishi, prompt shablonlari.
> Maqsad: agent loyiha egasiga savol bermasdan, sifatli va kichik PR'lar bilan ishlashi.

## 1. Ish tsikli (har vazifa uchun)

1. **Tanlash.** `docs/09-tasks.md`dan ⬜ vazifa, barcha "Bog'liq"lari ✅ (yashirin bog'liqlik: UI → T-009 + T-017c). Holatni 🟨 qiling.
2. **O'qish.** Vazifa AC + "Aniqlik" qatorlari → tegishli `FR-*`, `BR-*` → 02 (ruxsatlar) → 05 (jadvallar) → 10 (ochiq savollar, standart takliflar) → 11 (UI bo'lsa).
3. **Reja (kod yozishdan oldin, PR tavsifiga ham kiradi).** Qaysi fayllar yaratiladi/o'zgaradi, qaysi jadval/endpoint/event, qaysi testlar. Har fayl ≤ 300 qator bo'lishi rejada ko'rinsin.
4. **Avval test.** Domen qoidasi → unit test (`BR-xx:` nomi bilan) → implementatsiya. Bug → avval qizil test.
5. **Implementatsiya** §4 tuzilishi bo'yicha.
6. **Tekshirish:** `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int` (UI bo'lsa `pnpm e2e`). Hammasi yashil bo'lmaguncha PR ochilmaydi.
7. **O'z-o'zini review** (§6 ro'yxati) — har bandni haqiqatan tekshiring.
8. **Hujjat.** Qoida/API/jadval o'zgargan bo'lsa — hujjat shu PR'da. `09-tasks.md`da ✅.
9. **PR** (≤ 400 qator, generatsiya qilingan fayllar va lockfile hisobga kirmaydi). Katta bo'lsa — ketma-ket PR'larga bo'ling (masalan: sxema+domen → service+API → UI).

## 2. Savol berish o'rniga — qaror zinapoyasi

Noaniqlikka duch kelsangiz, **yuqoridan pastga** qarang va birinchi javob topilgan joyda to'xtang:

1. Vazifaning AC va "Aniqlik" qatori.
2. `BR-*` / `FR-*` / 02 / 05 hujjatlari (hujjat > kod).
3. `10-open-questions.md` — standart taklif (javob kelmagan bo'lsa ham **shu** ishlatiladi, qiymat sozlamada o'zgartiriladigan bo'ladi).
4. Ushbu playbook §5 dagi standart qarorlar.
5. Mavjud koddagi namuna (o'xshash modul qanday qilingan).
6. **O'zingiz qaror qiling:** eng sodda, xavfsiz, keyin o'zgartirish oson variant. Qarorni:
   - kichik bo'lsa — PR tavsifida "Qabul qilingan taxminlar" bo'limiga;
   - arxitekturaviy bo'lsa (kutubxona, jadval tuzilishi, protokol) — `docs/adr/NNNN-*.md`ga;
   - biznes qoidasi bo'lsa — `10-open-questions.md`ga yangi `Q-xx` qatori (taklif = siz tanlagan variant) va ⚠️ bilan hujjatga.

**Faqat shu hollarda to'xtang va egasiga yozing:** (a) sir/akkaunt/token kerak va soxta qiymat bilan ham ishlab bo'lmaydi; (b) production'da qaytarib bo'lmaydigan amal; (c) ikki hujjat bir-biriga zid va har ikki variant pulga ta'sir qiladi. Shunda ham — muqobillar + tavsiyangiz bilan, bitta xabarda.

**Hech qachon so'ramang:** qaysi kutubxona/versiya (eng so'nggi barqaror, aniq versiya), fayl/papka nomi, test yozish kerakmi (ha), formatlash, stek tanlovi.

## 3. Prompt shablonlari

Istalgan AI'ga nusxa ko'chirib beriladi. Claude Code'da: `/task T-XXX` (`.claude/commands/task.md`).

### 3.1 Vazifani bajarish

```text
Sen Legendary Group monoreposida ishlaysan. Avval CLAUDE.md va docs/12-ai-playbook.md ni to'liq o'qi.
Vazifa: {T-XXX}. docs/09-tasks.md dagi AC va "Aniqlik" qatorlarini, unga bog'langan FR/BR,
docs/02, docs/05 va docs/10 ni o'qi.
1) Reja yoz: fayllar (har biri ≤ 300 qator), jadvallar, endpoint'lar, ruxsatlar, testlar.
2) Avval testlar (BR ID nomda), keyin kod. Playbook §4 tuzilishiga amal qil.
3) pnpm lint, typecheck, test, test:int — hammasi yashil bo'lsin; natijani ko'rsat.
4) Playbook §6 ro'yxati bo'yicha o'zingni tekshir.
5) Noaniqlikda savol berma — playbook §2 zinapoyasi bo'yicha qaror qil va PR tavsifiga yoz.
6) 09-tasks.md da holatni yangila. PR tavsifi .github/pull_request_template.md bo'yicha.
```

### 3.2 Boshqa AI yozgan kodni tekshirish

```text
CLAUDE.md va docs/12-ai-playbook.md ni o'qi. {fayllar yoki diff} ni tekshir:
- hujjatga moslik (FR/BR/02 matritsa/05 jadvallar) — har farqni hujjatdan iqtibos bilan ko'rsat;
- playbook §7 dagi xatolar ro'yxati bo'yicha;
- xavfsizlik (RBAC, scope, audit, idempotentlik, PII loglarda);
- hajm (fayl ≤ 300, funksiya ≤ 60), takrorlanish.
Har topilma: fayl:qator, nima noto'g'ri, qanday tuzatiladi. Keyin tuzat va testlar bilan isbotla.
```

### 3.3 Bug tuzatish

```text
CLAUDE.md ni o'qi. Bug: {tavsif / log}. Avval xatoni takrorlovchi qizil test yoz
(testni ishga tushirib qizilligini ko'rsat), keyin minimal tuzatish, keyin test yashil.
Ildiz sababni PR tavsifida bir jumlada yoz. Shu sabab boshqa joyda ham bormi — tekshir.
```

## 4. Kod tuzilishi va fayl hajmi

**Chegaralar (ESLint majburlaydi):** fayl ≤ 300 qator, funksiya ≤ 60, `complexity` ≤ 12, ichma-ichlik ≤ 3, parametr ≤ 4 (ko'p bo'lsa — obyekt). `eslint-disable` bilan chetlab o'tish taqiqlangan.

**Backend modul tuzilishi** (`apps/api/src/modules/<modul>/`):

```
<modul>.module.ts            NestJS modul (faqat ulash)
<modul>.controller.ts        HTTP: validatsiya (Zod), @RequirePermission, service chaqirish. Mantiq yo'q.
<modul>.service.ts           Use-case'lar: scope tekshiruvi, tranzaksiya, audit, outbox. Har use-case ≤ 60 qator.
<modul>.repository.ts        Faqat Drizzle so'rovlari. Boshqa modul jadvallari yo'q.
<modul>.events.ts            Chiqaradigan/tinglaydigan event tiplari
<modul>.serializer.ts        Field-level filtr (02 §3)
__tests__/*.int.test.ts      Integratsiya: happy + forbidden + validation (har endpoint)
```

Fayl 300 ga yaqinlashsa — **ma'no bo'yicha bo'ling**, raqam bo'yicha emas: `payments.service.ts` → `payment-create.service.ts`, `payment-reverse.service.ts`. Umumiy narsa — `<modul>/shared/`.

**Boshqa joylar:**

| Nima                  | Qayerda                                                                     |
| --------------------- | --------------------------------------------------------------------------- |
| Zod sxemalar, enumlar | `packages/contracts/src/<modul>/*.ts` — API va UI shu yerdan import qiladi  |
| Biznes qoida, pul     | `packages/domain/src/<modul>/*.ts` — sof funksiya, I/O yo'q, `Clock` orqali |
| Jadval                | `packages/db/src/schema/<modul>.ts` + `drizzle-kit generate --name <nom>`   |
| Matn                  | `packages/i18n` (kalit → matn), kodga qattiq yozilmaydi                     |
| UI komponent          | `packages/ui-tg` / `ui-web` + Storybook story                               |
| Ekran                 | `apps/<app>/src/routes/<ekran>/` — `index.tsx` + `use<Ekran>.ts` (ma'lumot) |

## 5. Standart qarorlar (savol bermasdan qo'llang)

- **Enum:** `as const` massiv `@lg/contracts`da → DB'da `text + CHECK` (`oneOf()` helper, `packages/db/src/schema/common.ts`). Qiymatlar kichik harf snake_case.
- **Vaqt:** DB `timestamptz`; `updated_at` — DB `now()`; biznes mantiqda `Clock`; sana (`date`) — `Asia/Tashkent` kalendar kuni.
- **Pul:** `bigint`, proporsiya — `prorate()` (BR-38). JSON'da pul **string** sifatida (`"1250000"`), Zod `z.coerce.bigint()`.
- **Xato formati:** `{ code, message, details, requestId }`; `code` — `SCREAMING_SNAKE` (`PAYMENT_ALREADY_REVERSED`), `message` — i18n kaliti orqali.
- **Ro'yxat endpoint'lari:** cursor pagination (`?cursor=&limit=`, limit ≤ 100, standart 50), saralash `created_at desc, id desc`.
- **Idempotentlik:** yozish endpoint'lari `Idempotency-Key` qabul qiladi; to'lov/davomatda majburiy.
- **Audit:** `action` = `<entity>.<verb>` (`payment.create`); `before/after` — faqat o'zgargan maydonlar, PII maskalangan.
- **Event nomlari:** `PascalCase` o'tgan zamon (`PaymentConfirmed`), payload'da faqat ID'lar + zarur qiymatlar.
- **Migratsiya:** faqat `drizzle-kit generate --name <tavsif>`; qo'lda SQL kerak bo'lsa — `--custom` alohida fayl. Generatsiya qilingan faylni tahrirlamang. Mavjud migratsiyani o'zgartirmang (deploy qilingan bo'lishi mumkin).
- **O'zgarmas jadval:** yangi o'zgarmas jadval → `forbid_mutation()` trigger + `REVOKE UPDATE, DELETE, TRUNCATE ... FROM lg_app`.
- **Kutubxona tanlovi:** mavjud paket yetmasa — eng so'nggi barqaror, aniq versiya, PR'da sabab; arxitekturaviy bo'lsa ADR.
- **NestJS DI:** har konstruktor parametri `@Inject(Token|Class)` bilan — decorator metadata ishlatilmaydi (`tsx` uni chiqarmaydi; `emitDecoratorMetadata: false`). Xatolar — `throw new AppException(status, 'CODE', details?)`, matn faqat `@lg/i18n` `errorMessages`da (yangi kod → shu katalogga).
- **Validatsiya:** `@ZodBody(schema)` / `@ZodQuery(schema)` (`apps/api/src/common/decorators`) — validatsiya + OpenAPI bitta joydan; global pipe yo'q. Auth talab qilmaydigan endpoint — `@Public()`.
- **Integratsiya testi:** `createModuleTestApp()` / `createRealTestApp()` (`apps/api/src/test`) — vaqtinchalik DB (`@lg/db/testing`), dev bazaga yozilmaydi; unit testlar `.env`ga bog'liq emas (`testEnv()`).
- **Env:** yangi o'zgaruvchi → `.env.example`ga izoh bilan + Zod env sxemasiga; standart qiymat yashirin bo'lmasin (yo'q bo'lsa ishga tushmaydi).

## 6. O'z-o'zini review (PR'dan oldin)

- [ ] Har endpoint'da `@RequirePermission` + service'da scope tekshiruvi + forbidden testi
- [ ] Har yozish amali audit'da; pul/davomat/webhook/cron idempotent (qayta ishga tushirish testi bor)
- [ ] Pul faqat `bigint` va `packages/domain` orqali; `number`/float yo'q; property test bor
- [ ] `new Date()` / `Date.now()` biznes mantiqda yo'q (`Clock`)
- [ ] Boshqa modul jadvaliga to'g'ridan-to'g'ri murojaat yo'q
- [ ] Foydalanuvchi matni `packages/i18n`da, `ʻ`/`ʼ` to'g'ri
- [ ] Log'da sir/PII yo'q (telefon maskalangan)
- [ ] Yashirin standart qiymat yo'q (masalan `process.env.X || 'localhost...'`)
- [ ] Yangi indeks kerakmi? (har `WHERE`/`JOIN` ustuni — FK'larda indeks)
- [ ] Fayl ≤ 300, funksiya ≤ 60; takroriy kod yo'q
- [ ] Hujjat yangilandi; `09-tasks.md` holati

## 7. Uchragan xatolar (shularni takrorlamang)

T-001–T-004 da boshqa AI yozgan kodni tekshirishda topilgan, keyin tuzatilgan xatolar:

| Xato                                                                                                                                       | To'g'risi                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Rol→ruxsat matritsasi seed ichida, hujjatga zid (ota-onada `billing.view` yo'q, Admin'da delegatsiya ruxsatlari bor)                       | Matritsa `@lg/contracts`da, hujjat jadvali bilan qatorma-qator test                                               |
| `process.env.DATABASE_URL \|\| 'postgres://...localhost'` 3 joyda                                                                          | `requireDatabaseUrl()` — yo'q bo'lsa xato                                                                         |
| `dotenv` paket papkasidan `.env` qidiradi (ildizdagini topmaydi)                                                                           | `loadRootEnv()` (Node `process.loadEnvFile`)                                                                      |
| Seed'da N+1 (har ruxsat alohida INSERT), tranzaksiyasiz                                                                                    | Bitta tranzaksiya, ommaviy `INSERT ... ON CONFLICT`                                                               |
| Seed productionda test foydalanuvchi yaratadi                                                                                              | `withTestDirector` faqat `NODE_ENV !== 'production'`                                                              |
| Audit himoyasi generatsiya qilingan migratsiyaga qo'lda qo'shilgan; `REVOKE FROM PUBLIC` hech narsa qilmaydi; TRUNCATE ochiq               | Alohida `--custom` migratsiya, `lg_app` roli, statement-trigger                                                   |
| `audit_logs.actor_id ON DELETE SET NULL` — o'zgarmas jadvalda UPDATE talab qiladi                                                          | `ON DELETE RESTRICT`                                                                                              |
| `$onUpdate(() => new Date())`                                                                                                              | `$onUpdate(() => sql\`now()\`)`                                                                                   |
| `relations()`ning bir tomoni yo'q (`settings`)                                                                                             | Har `many()` uchun qarshi `one()`                                                                                 |
| Global singleton `getDb()`, ulanishni yopib bo'lmaydi                                                                                      | `createDb()` + `closeDb()`, DI orqali                                                                             |
| FK ustunlarida indeks yo'q, outbox uchun indeks yo'q                                                                                       | Har FK/filtr ustuniga indeks; navbat — qisman indeks                                                              |
| `import.meta.url === \`file://${argv[1]}\``                                                                                                | `pathToFileURL(argv[1]).href` (`isMain()`)                                                                        |
| Bog'liqlik versiyalari 7 kunlik qoidani buzgan (`vite` — chiqqan kuni)                                                                     | `minimumReleaseAge` dan o'tgan eng yangi versiya; pnpm o'zi tekshiradi                                            |
| `eslint-plugin-boundaries` o'rnatilgan, lekin sozlanmagan; `recommended` (hujjat: `strict`)                                                | Qoida faqat sozlansa va sinalsa ishlaydi — stdin probe bilan tekshiring                                           |
| `minio:latest`, bucket'ga ommaviy o'qish huquqi                                                                                            | Aniq teg; bucket private, faqat presigned URL                                                                     |
| `.env.example` hujjatga zid (refresh 7 kun vs 30 kun), ishlatilmaydigan sirlar                                                             | Har env o'zgaruvchi — hujjatdagi qiymat va iste'molchi bilan                                                      |
| CLAUDE.md'da va'da qilingan tekshiruv (i18n apostrof lint) yo'q edi                                                                        | Qoida yozilsa — shu PR'da avtomatik tekshiruvi ham                                                                |
| Idempotency: avval tekshirish, keyin bajarish (band qilmasdan) — parallel so'rov ikki marta bajariladi; kalit foydalanuvchiga bog'lanmagan | Handler'dan oldin atomar `INSERT … ON CONFLICT DO NOTHING`, doira `(key, route, user_id)`; parallel test majburiy |
| `reply.statusCode` interceptor ichida o'qilgan — Nest statusni keyin qo'yadi (201 → 200 saqlangan)                                         | Status `HTTP_CODE_METADATA`dan / metod bo'yicha                                                                   |
| Testlar o'tdi, ilova esa ishga tushmadi (`.env` yo'li xato; tsx'da DI metadata yo'q)                                                       | PR'dan oldin ilovani haqiqatan ishga tushirib, endpoint'ni chaqiring                                              |
| Sxemasiz global `ZodValidationPipe()` — validatsiya amalda o'chiq                                                                          | Sxema majburiy, `@ZodBody`/`@ZodQuery`                                                                            |
| Nest'ning inglizcha xabarlari va kodga yozilgan o'zbekcha matnlar foydalanuvchiga chiqadi                                                  | `AppException(code)` + `@lg/i18n`                                                                                 |
| Integratsiya testlari dev bazaga yozadi; unit test `.env` fayliga bog'liq (CI'da yiqiladi)                                                 | Vaqtinchalik DB, `testEnv()`                                                                                      |
| Testlar `dist/`ga kompilyatsiya qilinadi va qayta ishga tushadi                                                                            | `tsconfig.build.json` testlarni chiqarib tashlaydi                                                                |
| Commit xabarida bajarilmagan narsa "bajarildi" deb yozilgan ("yashirin standartsiz")                                                       | Har da'vo — kod/test bilan tasdiqlangan bo'lsin                                                                   |
| Lint umuman ishlamagan (19 xato), test yo'q                                                                                                | PR'dan oldin `lint/typecheck/test/test:int` natijasi ko'rsatiladi                                                 |
