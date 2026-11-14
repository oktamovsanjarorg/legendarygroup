# ADR 0004 — API freymvorki, Fastify adapter va OpenAPI integratsiyasi

- **Holat:** Qabul qilingan · 2026-11-11

## Kontekst

03-architecture.md §2 va T-004 AC talablariga koʻra:

- Backend: NestJS modulli monolit, yuqori unumdorlik va xotira tejamkorligi uchun **Fastify** adapteri bilan;
- Barcha kirish va chiqish maʼlumotlari Zod orqali tekshirilishi, OpenAPI spetsifikatsiyasi avtomatik taqdim etilishi kerak;
- Har soʻrovda `requestId` va structured JSON logger (pino);
- Idempotentlik interceptori (`Idempotency-Key` orqali takroriy soʻrovlarni xavfsiz qilish).

## Qaror

1. **NestJS + `@nestjs/platform-fastify` + `fastify`**: Express oʻrniga Fastify adapteri tanlandi (kamroq kechikish, 2-3 barobar yuqori throughput, tabiiy Pino integratsiyasi).
2. **OpenAPI — `@nestjs/swagger` + `@fastify/static`** (UI fayllari uchun; `@fastify/swagger*` ishlatilmaydi — ikkinchi generator keraksiz):
   - `/api/docs` va `/api/docs/json` faqat production'dan tashqari;
   - sxema **Zod'dan**: `@ZodBody(schema)` / `@ZodQuery(schema)` bir vaqtda validatsiya qiladi va `z.toJSONSchema()` orqali OpenAPI'ga yozadi (qo'shimcha kutubxonasiz). `bigint` (pul) — `type: string, pattern: ^-?\d+$`.
3. **Zod 4** (`zod@4`), sxemalar `@lg/contracts`da. Global "sxemasiz" pipe yo'q — har endpoint o'z sxemasini beradi (deny by default).
   - Xato formati `{ code, message, details, requestId }`; `message` faqat `@lg/i18n`dan kod bo'yicha (Nest/Zod inglizcha matni foydalanuvchiga chiqmaydi); validatsiya `details` — `[{ path, code }]`.
4. **Idempotency-Key interceptori** (faqat POST/PUT/PATCH/DELETE, kalit ≤ 128 belgi):
   - kalit handler'dan **oldin** atomar band qilinadi (`INSERT … ON CONFLICT DO NOTHING`), doirasi `(key, route, user_id)` `NULLS NOT DISTINCT`;
   - parallel ikkinchi so'rov → 409 `IDEMPOTENCY_IN_PROGRESS` (`Retry-After`); tugagach javob va status saqlanadi → takror so'rovga o'sha javob + `Idempotent-Replay: true` (24 soat);
   - boshqa body → 422 `IDEMPOTENCY_CONFLICT`; handler xatosi → band bekor (qayta urinish mumkin); 5 daqiqadan eski tugallanmagan band qayta egallanadi;
   - pul amallari bundan tashqari DB'dagi o'z unique kaliti bilan himoyalanadi (`payments.idempotency_key`).
5. **Worker bootstrap (`bootstrapWorker()`)**:
   - `@lg/api` paketi HTTP tinglamaydigan sof DI kontekstini eksport qiladi; `apps/worker` shundan foydalanadi.

6. **DI decorator metadata'siz.** `tsx` (esbuild) `emitDecoratorMetadata`ni qo'llamaydi, shuning uchun har konstruktor parametri `@Inject(Token|Class)` bilan; `emitDecoratorMetadata: false` (tsc, Vitest ham) — `@Inject` unutilsa test darhol yiqiladi. `abortOnError: false` — DI xatosi jarayonni o'ldirmaydi, log qilinadi.
7. **Marshrutlar:** tashqi — `/api/*` (06 §1); `/internal/*` prefiksiz (Caddy uni proksilamaydi, faqat Docker tarmog'i), `X-Internal-Token` bilan.

## Muqobillar

- _Express adapter_: Ekologiyasi keng, ammo resurs talabi yuqori va tezligi Fastify'dan 2-3 barobar past.
- _Standalone Fastify yoki Hono_: Yengil, lekin yirik 5 yillik loyiha uchun NestJS'ning DI, Guard, Interceptor va modullilik standartlari RBAC va audit uchun ancha qulay.
- _tRPC_: Faqat TypeScript web mijozlar uchun yaxshi; Telegram bot, Tashqi toʻlov tizimlari webhook'lari va Mini App uchun standart REST + OpenAPI universalroq.

## Oqibatlar

- (+) Minimal latency, tezkor JSON serializatsiya.
- (+) Yagona xato formati va avtomatik `requestId` orqali kuzatuvchanlik.
- (+) OpenAPI orqali frontend va Mini App uchun avtomatik klient generatsiyasi.
- (−) NestJS da Fastify ishlatilganda Express middleware'laridan toʻgʻridan-toʻgʻri foydalanib boʻlmaydi (Fastify plaginlari ishlatiladi).
