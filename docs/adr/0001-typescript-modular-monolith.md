# ADR 0001 — TypeScript monorepo, modulli monolit

- **Holat:** Qabul qilingan · 2026-11-10

## Kontekst

Tizim: API + Telegram bot + Mini App + web panel. Bitta filial, yuklama past–o'rta (yuzlab foydalanuvchi).
Kodni AI agentlar yozadi, 5+ yil qo'llab-quvvatlanadi. Ishonchlilik va xatolarni erta ushlash muhim.

## Qaror

- Hamma joyda **TypeScript (strict)**; umumiy Zod sxemalar.
- **Modulli monolit** (NestJS), `api`/`worker`/`bot` — bitta kod bazasidan alohida jarayonlar.
- **pnpm + Turborepo** monorepo.

## Muqobillar

- _Mikroservislar_ — 1 filial uchun ortiqcha murakkablik (tarmoq, deploy, kuzatuv).
- _Python (FastAPI) + alohida JS frontend_ — ikki til, tiplarni sinxron saqlash qiyin.
- _Go_ — tez, lekin frontend bilan tip ulashish yo'q, admin panel tezligi past.

## Oqibatlar

- (+) Bir PR'da end-to-end o'zgarish, kompilyator darajasida kontrakt.
- (+) Kerak bo'lsa modul alohida servisga ajratiladi (chegaralar ESLint bilan majburlangan).
- (−) Node.js CPU-og'ir vazifalar uchun sust — PDF/Excel worker'da, navbat orqali.
