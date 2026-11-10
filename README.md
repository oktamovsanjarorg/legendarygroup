# Legendary Group — Monorepo

Oʻquv markaz boshqaruv tizimi (ERP/CRM). Barcha ilovalar, umumiy paketlar, infratuzilma va hujjatlar yagona monorepoda jamlangan.

## Talablar

- **Node.js**: `>= 22.0.0` (Active LTS tavsiya etiladi)
- **pnpm**: `>= 9.15.0`
- **Docker & Docker Compose**: lokal xizmatlar (Postgres, Redis, MinIO) uchun

## Tezkor ishga tushirish

1. **Bogʻliqliklarni oʻrnatish:**

   ```bash
   pnpm install
   ```

2. **Lokal infratuzilmani ishga tushirish (Docker):**

   ```bash
   docker compose -f infra/docker/compose.dev.yml up -d
   ```

3. **Barcha ilovalarni ishlab chiqish rejimida ishga tushirish:**
   ```bash
   pnpm dev
   ```

## Asosiy buyruqlar

- `pnpm build` — barcha paket va ilovalarni kompilyatsiya qilish (Turborepo)
- `pnpm test` — barcha unit va integratsiya testlarini ishga tushirish (Vitest)
- `pnpm typecheck` — TypeScript qatʼiy tip tekshiruvi (`tsc -b --noEmit`)
- `pnpm lint` — kod sifatini tekshirish (ESLint)
- `pnpm format` — kod formatini tekshirish va toʻgʻrilash (Prettier)

## Monorepo tuzilishi

```
legendarygroup/
├── apps/
│   ├── api/          # NestJS (Fastify) HTTP API
│   ├── worker/       # NestJS standalone fon vazifalari (BullMQ)
│   ├── bot/          # Telegram bot (grammY)
│   ├── miniapp/      # Telegram Mini App (React + Vite)
│   └── web/          # Boshqaruv paneli (React + Vite + shadcn/ui)
├── packages/
│   ├── contracts/    # Zod sxemalar, tiplar, enumlar
│   ├── domain/       # Sof biznes mantiq (BigInt pul hisobi, qoidalar)
│   ├── db/           # Drizzle ORM sxemalari va migratsiyalar
│   ├── ui-core/      # Dizayn tokenlari, ikonlar, formatlash
│   ├── ui-tg/        # Telegram Mini App komponentlari
│   ├── ui-web/       # Web panel komponentlari
│   ├── i18n/         # Rasmiy oʻzbek lotin imlosidagi matnlar
│   └── config/       # Umumiy TypeScript, ESLint konfiguratsiyalari
├── infra/
│   ├── docker/       # Dockerfile va compose konfiguratsiyalari
│   ├── terraform/    # AWS infratuzilma kodi (OpenTofu)
│   └── caddy/        # Caddyfile (reverse proxy)
└── docs/             # Yagona haqiqat manbai (loyiha hujjatlari)
```

## Dasturchilar uchun qoidalar

Barcha oʻzgarishlar `docs/` dagi talablarga qatʼiy mos kelishi va [CLAUDE.md](./CLAUDE.md) qoidalariga rioya qilishi shart.
