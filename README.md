# Legendary Group — Monorepo

Oʻquv markaz boshqaruv tizimi (ERP/CRM). Barcha ilovalar, umumiy paketlar, infratuzilma va hujjatlar yagona monorepoda jamlangan.

## Talablar

- **Node.js** `26` (Active LTS, `.nvmrc`)
- **pnpm** `12` (aniq versiya `package.json` → `packageManager`; `corepack enable` yoki global pnpm 12)
- **Docker & Docker Compose** — lokal xizmatlar (Postgres 18, Redis, MinIO)

## Tezkor ishga tushirish (toza kompyuter)

```bash
cp .env.example .env          # lokal qiymatlar tayyor
pnpm install
pnpm docker:dev               # Postgres, Redis, MinIO (+ bucket yaratish)
pnpm --filter @lg/db db:migrate
pnpm --filter @lg/db db:seed  # 4 rol, ruxsatlar, test Direktor (+998900000001)
pnpm dev                      # barcha ilovalar hot-reload bilan
```

## Asosiy buyruqlar

- `pnpm lint` — ESLint (typescript-eslint strict, paket chegaralari, fayl ≤ 300 / funksiya ≤ 60 qator)
- `pnpm typecheck` — TypeScript strict tekshiruvi
- `pnpm test` — unit testlar (Vitest)
- `pnpm test:int` — integratsiya testlari (ishlab turgan Postgres kerak: `pnpm docker:dev`)
- `pnpm build` — barcha paket va ilovalar (Turborepo)
- `pnpm format` — Prettier
- `pnpm --filter @lg/db db:generate --name <nom>` — sxemadan yangi migratsiya

**Bogʻliqliklar xavfsizligi:** pnpm 7 kundan yangi versiyani oʻrnatmaydi (`minimumReleaseAge`), build skriptlari faqat `allowBuilds` roʻyxatidagi paketlarga ruxsat etilgan. Yangilashlar — Renovate orqali, haftalik.

## AI agentlar bilan ishlash

Vazifa: `/task T-XXX` (Claude Code) yoki [docs/12-ai-playbook.md](docs/12-ai-playbook.md) §3 shablonlari (istalgan AI). Boshqa AI yozgan kodni tekshirish: `/review-ai`.

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
