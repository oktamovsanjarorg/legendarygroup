# 06 — Infratuzilma, muhitlar, CI/CD, backup, monitoring

## 1. Muhitlar

| Muhit        | Maqsad                                                                | Domen (misol)                | Bot                                 | Ma'lumot                                            |
| ------------ | --------------------------------------------------------------------- | ---------------------------- | ----------------------------------- | --------------------------------------------------- |
| `local`      | Dasturchi kompyuteri                                                  | localhost                    | `@legendary_dev_bot` (long polling) | Test ma'lumotlari (seed)                            |
| `staging`    | Relizdan oldingi to'liq tekshiruv (prod bilan bir xil konfiguratsiya) | `staging.<domen>`            | `@legendary_staging_bot`            | Test ma'lumotlari + anonimlashtirilgan prod nusxasi |
| `production` | Haqiqiy ishlash                                                       | `app.<domen>`, `api.<domen>` | `@legendary_bot` (asosiy)           | Haqiqiy                                             |

- Har muhit uchun **alohida bot token, alohida AWS resurslari, alohida S3 bucket, alohida sirlar**.
- Staging'dan prod'ga hech qachon haqiqiy xabar yuborilmaydi (staging bot faqat test foydalanuvchilari allowlist'iga yozadi).

## 2. AWS arxitekturasi

**Region:** `eu-central-1` (Frankfurt) — Toshkentga eng yaqin, barcha xizmatlar mavjud.

```
                         Route 53 (DNS)  ─── ACM yo'q (TLS — Caddy, Let's Encrypt)
                               │
                ┌──────────── VPC 10.0.0.0/16 ────────────────────────────┐
                │  Public subnet                    Private subnet          │
                │  ┌─────────────────────────┐      ┌──────────────────┐   │
                │  │ EC2 (Graviton, ARM64)   │      │ RDS PostgreSQL   │   │
                │  │  Docker Compose:        │─────►│ Multi-AZ: yo'q(1)│   │
                │  │  caddy, api, worker,    │      │ PITR 14 kun      │   │
                │  │  bot, redis, alloy      │      │ encrypted        │   │
                │  │  Elastic IP             │      └──────────────────┘   │
                │  └──────────┬──────────────┘                              │
                └─────────────┼─────────────────────────────────────────────┘
                              ▼  (VPC endpoint)
              S3: lg-prod-files (versioning, SSE-KMS, private)
              S3: lg-prod-backups (versioning, Object Lock, lifecycle → Glacier)
              S3: lg-backups-replica (boshqa region, CRR) — falokatga qarshi
              ECR (konteyner image'lar), SSM Parameter Store (sirlar), CloudWatch (alarm)
```

| Resurs  | Production                                                                                               | Staging                        |
| ------- | -------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Server  | EC2 `t4g.medium` (2 vCPU, 4 GB) — kerak bo'lsa `t4g.large`                                               | EC2 `t4g.small`                |
| DB      | **RDS PostgreSQL** `db.t4g.small`, gp3 20 GB auto-scaling, automated backups 14 kun, deletion protection | Postgres konteynerda (shu EC2) |
| Redis   | Konteyner (AOF yoqilgan) — faqat navbat/kesh, yo'qolsa tiklanadi                                         | Konteyner                      |
| Fayllar | S3 `lg-prod-files`                                                                                       | S3 `lg-staging-files`          |
| Kirish  | **SSM Session Manager** (SSH port yopiq)                                                                 | SSM                            |

(1) Multi-AZ RDS — boshlang'ich bosqichda kerak emas (narx ×2); RTO 1 soat talabi PITR bilan bajariladi. Biznes o'sgach yoqiladi.

**Taxminiy oylik narx (prod + staging):** ~ $70–110 (EC2 ×2, RDS, S3, ECR, trafik). Aniq hisob — T-INF vazifasida.

## 3. Konteynerlar

- Har ilova uchun **multi-stage Dockerfile**: `deps → build → runtime` (distroless yoki `node:*-slim`), non-root user, `HEALTHCHECK`, faqat prod dependencies.
- Image'lar `linux/arm64` (Graviton) va `linux/amd64` (lokal) uchun build qilinadi.
- Tag: `git sha` + semver reliz tegi. `latest` ishlatilmaydi.
- Compose fayllar: `compose.dev.yml`, `compose.staging.yml`, `compose.prod.yml`.
- Har servisda `restart: unless-stopped`, resurs limitlari, log rotatsiyasi.
- Konteyner image skaneri (Trivy) CI'da — `HIGH/CRITICAL` bo'lsa build to'xtaydi.

## 4. CI/CD (GitHub Actions)

### Branch strategiyasi

- `main` — har doim deploy qilinadigan holatda. To'g'ridan-to'g'ri push taqiqlangan.
- `feat/*`, `fix/*` → Pull Request → `main`.
- Conventional Commits (`feat:`, `fix:`, `chore:` ...) → avtomatik CHANGELOG va semver (release-please).

### Pipeline

```
PR ochildi:
  1. install (pnpm, kesh)  2. lint + format check  3. typecheck
  4. unit testlar (vitest) + coverage gate
  5. integratsiya testlari (Testcontainers: Postgres + Redis)
  6. migratsiya tekshiruvi (toza DB'ga qo'llash + drift tekshiruv)
  7. build (turbo, faqat o'zgargan paketlar)
  8. e2e (Playwright, web + miniapp, mock Telegram)
  9. Docker build + Trivy scan
  10. CodeQL / dependency audit
  → hammasi yashil + 1 review (AI review + inson) → merge

main'ga merge:
  → image'lar ECR'ga push → STAGING'ga avtomatik deploy
  → migratsiyalar → smoke testlar (health, login, asosiy API)
  → muvaffaqiyatli bo'lsa — reliz PR (release-please)

Reliz tegi (vX.Y.Z):
  → PRODUCTION deploy — GitHub Environment "production" (qo'lda tasdiqlash: Director/texnik mas'ul)
  → deploydan oldin RDS snapshot
  → migratsiya → rolling restart (compose, health-check bilan) → smoke test
  → xato bo'lsa avtomatik rollback (oldingi image tegi)
```

- Deploy mexanizmi: GitHub Actions → **OIDC** orqali AWS (uzoq muddatli kalitlar yo'q) → SSM Run Command → serverda `deploy.sh` (image pull, migrate, `docker compose up -d`).
- Prod deploy vaqti: ish vaqtidan tashqari tavsiya etiladi (darslar 8:00–20:00).

## 5. Backup va tiklash

| Nima                   | Qanday                                               | Qayerga                            | Saqlash muddati                |
| ---------------------- | ---------------------------------------------------- | ---------------------------------- | ------------------------------ |
| PostgreSQL (uzluksiz)  | RDS automated backups + PITR                         | AWS ichki                          | 14 kun                         |
| PostgreSQL (mantiqiy)  | Har kuni 02:00 `pg_dump -Fc` → shifrlangan (age/KMS) | `s3://lg-prod-backups/db/daily/`   | 35 kun → keyin Glacier         |
| PostgreSQL (oylik)     | Har oy 1-sanasi                                      | `s3://lg-prod-backups/db/monthly/` | 1–3 yil (Glacier Deep Archive) |
| Fayllar (cheklar, PDF) | S3 versioning + Cross-Region Replication             | boshqa region bucket               | 1 yil eski versiyalar          |
| Konfiguratsiya         | Terraform kodi git'da; sirlar SSM'da                 | —                                  | —                              |

- Backup bucket: **Object Lock (compliance mode)** — hatto admin ham o'chira olmaydi (ransomware'dan himoya), versioning, faqat yozish huquqi bilan alohida IAM rol.
- **Tiklash sinovi (restore drill):** har oy avtomatik job — oxirgi dump'ni vaqtinchalik Postgres'ga tiklaydi, qatorlar sonini tekshiradi, natijani Telegram'ga (texnik kanal) yuboradi. Muvaffaqiyatsiz bo'lsa — alarm.
- Runbook: `docs/runbooks/restore.md` (T-INF vazifasida yoziladi).

## 6. Monitoring va kuzatuv (observability)

| Qatlam                       | Vosita                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| Xatolar (backend + frontend) | **Sentry** (yoki self-hosted GlitchTip) — release tegi bilan                                 |
| Loglar                       | pino JSON → Grafana Alloy → **Grafana Cloud Loki** (bepul tarif yetadi)                      |
| Metrikalar                   | OpenTelemetry → Grafana Cloud (Prometheus): RPS, p95, xato %, navbat uzunligi, DB ulanishlar |
| Tracing                      | OpenTelemetry → Grafana Tempo                                                                |
| Uptime                       | Tashqi tekshiruv (Grafana Synthetic / UptimeRobot) har 1 daq: `/health`, bot webhook         |
| Infra                        | CloudWatch: EC2 CPU/disk, RDS CPU/storage/connections                                        |
| Biznes metrikalar            | Navbatda turgan cheklar soni, yuborilmagan xabarlar, bajarilmagan cron job                   |

**Alertlar** → texnik Telegram guruhi (+ kritik bo'lsa telefon):

- API 5xx > 2% (5 daq), p95 > 1 s
- Health-check 2 marta ketma-ket muvaffaqiyatsiz
- Disk > 80%, RDS storage < 20%
- BullMQ failed jobs > 10 / soat; notification navbati > 1000
- Backup yoki restore drill muvaffaqiyatsiz
- Invoice cron ishlamadi (oyning 1-sanasi 01:00 gacha)

## 7. Xavfsizlik (infra)

- Security group: faqat 80/443 ochiq; RDS faqat EC2 SG'dan.
- IMDSv2 majburiy, EBS shifrlangan, avtomatik OS yangilanishlari (unattended-upgrades) + SSM Patch Manager.
- Sirlar: SSM Parameter Store (SecureString, KMS). `.env` fayllar git'ga tushmaydi.
- AWS root akkaunt — MFA, ishlatilmaydi; IAM Identity Center orqali kirish; CloudTrail yoqilgan.
- AWS Budgets alert ($150/oy).
- Cloudflare (ixtiyoriy) — DNS + DDoS himoya + WAF.

## 8. Infrastructure as Code

- **OpenTofu/Terraform**: `infra/terraform/{modules,envs/staging,envs/prod}`, state — S3 + DynamoDB lock.
- Hech qanday resurs AWS konsolda qo'lda yaratilmaydi (bootstrap state bucket'dan tashqari).
