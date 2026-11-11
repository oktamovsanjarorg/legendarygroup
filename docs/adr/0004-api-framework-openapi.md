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
2. **OpenAPI / Swagger (`@nestjs/swagger` + `@fastify/swagger` + `@fastify/swagger-ui`)**:
   - `/docs` faqat lokal va staging muhitida ochiladi; productionda registratsiya qilinmaydi;
   - `/docs/json` va `/docs/yaml` orqali OpenAPI 3.0 spetsifikatsiyasi eksport qilinadi;
   - Frontend tip-xavfsiz klientlari uchun kontrakt manbasi boʻlib xizmat qiladi.
3. **Zod validatsiya (`ZodValidationPipe`)**:
   - Har bir kiruvchi payload Zod sxemalari orqali tekshiriladi;
   - Xatoliklar yagona standart formatda qaytadi: `{ code: 'VALIDATION_ERROR', message, details, requestId }`.
4. **Idempotency-Key interceptori**:
   - Yozish amallarida (POST, PUT, PATCH, DELETE) `Idempotency-Key` boshqariladi;
   - SHA-256 xesh taqqoslanadi; bir xil body → keshdan 200 + `Idempotent-Replay: true`; boshqa body → 422 `IDEMPOTENCY_CONFLICT`.
5. **Worker bootstrap (`bootstrapWorker()`)**:
   - `@lg/api` paketi HTTP tinglamaydigan sof DI kontekstini eksport qiladi; `apps/worker` shundan foydalanadi.

## Muqobillar

- _Express adapter_: Ekologiyasi keng, ammo resurs talabi yuqori va tezligi Fastify'dan 2-3 barobar past.
- _Standalone Fastify yoki Hono_: Yengil, lekin yirik 5 yillik loyiha uchun NestJS'ning DI, Guard, Interceptor va modullilik standartlari RBAC va audit uchun ancha qulay.
- _tRPC_: Faqat TypeScript web mijozlar uchun yaxshi; Telegram bot, Tashqi toʻlov tizimlari webhook'lari va Mini App uchun standart REST + OpenAPI universalroq.

## Oqibatlar

- (+) Minimal latency, tezkor JSON serializatsiya.
- (+) Yagona xato formati va avtomatik `requestId` orqali kuzatuvchanlik.
- (+) OpenAPI orqali frontend va Mini App uchun avtomatik klient generatsiyasi.
- (−) NestJS da Fastify ishlatilganda Express middleware'laridan toʻgʻridan-toʻgʻri foydalanib boʻlmaydi (Fastify plaginlari ishlatiladi).
