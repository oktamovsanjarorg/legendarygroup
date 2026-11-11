# ADR 0005 — Transactional outbox → BullMQ, worker tuzilishi

- **Holat:** Qabul qilingan · 2026-11-11 (T-005)

## Kontekst

03 §4: modullar bir-biri bilan domen event'lari orqali bog'lanadi; event "yo'qolmaydi, ikki marta
yuborilmaydi". Fon vazifalari (xabarlar, PDF, invoice, cron) — BullMQ. Ikki muammo: DB commit va
navbatga qo'yish atomar emas; BullMQ "kamida bir marta" yetkazadi.

## Qaror

1. **Nashr:** `OutboxService.publish(type, payload, tx)` — event biznes tranzaksiyasi ichida
   `outbox_events`ga yoziladi. Turlar va payload'lar — `@lg/contracts` `events.ts` (yagona manba).
2. **Relay (worker, har 1 s):** bitta tranzaksiyada `FOR UPDATE SKIP LOCKED` (100 tadan) →
   `events` navbatiga `jobId = event id` (Redis'da 7 kun saqlanadi — takror qo'shilmaydi) →
   `processed_at`. Redis xatosida qator bo'yicha backoff 1s·2ⁿ⁻¹, 10 urinishdan keyin
   `failed_at` va alert (`alert: true` log yozuvi, T-016 texnik chatga yuboradi).
3. **Iste'mol:** `EventHandlers.on(type, consumer, handler)`; har iste'molchi uchun
   `outbox_consumptions (consumer, event_id)` belgisi va handler **bitta tranzaksiyada** —
   qayta yetkazilgan event takror ishlanmaydi. Xato → BullMQ retry (10 urinish, exponential 1 s),
   tugasa → `dead-letter` navbati + alert.
4. **Cron:** `CronJobs.register({ id, pattern, run })` (`Asia/Tashkent`); worker ishga tushganda
   `upsertJobScheduler` (idempotent), reyestrda yo'q eski scheduler'lar o'chiriladi. Cron
   vazifasi qayta ishga tushirish xavfsiz bo'lishi shart.
5. **Worker:** `bootstrapWorker()` = API modullari + `WorkerModule` (relay, iste'molchilar,
   cron, Bull Board). API jarayoni faqat nashr qiladi/job qo'shadi, iste'mol qilmaydi.
6. **Bull Board:** worker'ning ichki HTTP serveri (`WORKER_PORT`, Caddy proksilamaydi),
   `/queues` — basic auth (`BULL_BOARD_USER/PASSWORD`, worker ularsiz ishga tushmaydi),
   `/health/live` — konteyner healthcheck.
7. **Dev:** workspace paketlarida `development` export sharti (`src/*.ts`); `pnpm dev`
   `tsx --conditions=development` bilan — paketlardagi o'zgarish build'siz ko'rinadi.
   Production/`tsc` — `dist`.

## Muqobillar

- _Faqat BullMQ (outbox'siz)_ — commit va navbat orasida event yo'qolishi mumkin.
- _Postgres LISTEN/NOTIFY_ — ulanish uzilsa xabar yo'qoladi, retry/dead-letter yo'q.
- _Debezium/CDC_ — 1 filial uchun ortiqcha infratuzilma.

## Oqibatlar

- (+) Event yo'qolmaydi; takroriy yetkazish handler darajasida zararsiz.
- (+) Bitta joyda cron, retry, dead-letter va monitoring (Bull Board).
- (−) Tashqi yon ta'sirlar (Telegram xabari) tranzaksiyaga kirmaydi — `notifications` moduli
  o'z dedup'iga ega bo'lishi kerak (T-109).
