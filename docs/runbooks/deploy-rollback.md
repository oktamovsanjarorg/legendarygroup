# Runbook: Deploy va Rollback (T-014, 06 §4)

Ushbu runbook Legendary Group tizimining **Staging** va **Production** muhitlariga deploy qilish, avtomatik smoke testlar va favqulodda vaziyatlarda rollback (orqaga qaytarish) tartibini belgilaydi.

---

## 1. Umumiy arxitektura va qoidalar

- **Staging:** `main` branchiga har bir merge bo'lganda avtomatik ravishda deploy qilinadi (`.github/workflows/cd-staging.yml`).
- **Production:** Faqat reliz teglari (`vX.Y.Z`) e'lon qilinganda, GitHub Environment orqali inson tasdig'i (Director / DevOps) olingandan so'ng deploy qilinadi.
- **Deploy vaqti:** Ish vaqtidan tashqari tavsiya etiladi (darslar 08:00–20:00 oralig'ida bo'ladi).
- **Idempotentlik:** Deploy skripti bir necha marta qayta ishlatilganda ham tizim holatini buzmaydi.

---

## 1a. Production oqimi (GitHub Actions → SSM, 2026-11-14)

```
reliz (release-please, `v*`) yoki Actions → "CD — Production Deploy" → Run (faqat `main`/`v*`)
  → production environment: egasi tasdiqlaydi
  → OIDC rol `lg-prod-deploy` → arm64 image'lar (native runner) → ECR (teg bor bo'lsa — o'tkaziladi)
  → RDS snapshot `lg-prod-predeploy-<teg>-<vaqt>` (tayyor bo'lguncha kutiladi)
  → infra/scripts/ssm-deploy.sh: compose.prod.yml + infra/scripts → SSM Run Command
      serverda /opt/lg/releases/<teg>/infra/scripts/remote-deploy.sh:
        render-env.sh (SSM /lg/prod/* + RDS egasi secret → /etc/lg/production.env, 0600)
        → ECR login → 80/443 dagi begona konteyner to'xtatiladi → deploy.sh (migrate, up, healthy)
        → /opt/lg/current symlink, oxirgi 5 reliz qoladi
  → HTTPS smoke: /api/health/ready, /, /app/
```

**Sirlar** — faqat SSM `/lg/prod/*` (SecureString, `alias/lg-prod`), git va GitHub'da yo'q.
Birinchi marta yoki bot almashtirilsa: `AWS_PROFILE=root ./infra/scripts/bootstrap-prod-secrets.sh`
(mavjud sirlar almashtirilmaydi; bot — `TELEGRAM_ROTATE=1`). Oddiy sozlamalar (domen, bucket,
DB host) — `String` parametrlar. DB egasi paroli — RDS o'zi boshqaradi (Secrets Manager).
`lg_api` login'i va paroli har deploy'da `db:migrate` tomonidan SSM qiymatiga keltiriladi.

**GitHub** — `production` environment o'zgaruvchilari: `AWS_REGION`, `AWS_DEPLOY_ROLE_ARN`,
`LG_REGISTRY`, `LG_INSTANCE_ID`, `LG_RDS_ID`, `LG_DB_OWNER_SECRET_ARN`, `APP_DOMAIN`
(`tofu output` dan). Tasdiqlovchi — egasi.

**Rollback (prod):** Actions → "CD — Production Deploy" → `ref` = oldingi teg — image ECR'da bor,
qayta yig'ilmaydi, faqat deploy. Server ichida: `rollback.sh production <teg>` (SSM session).

**Bot webhook** — bot har ishga tushishda `setWebhook` (secret_token) qiladi, qo'lda sozlash yo'q.

## 2. Deploy oqimi (`deploy.sh`)

Deploy skripti quyidagi qat'iy ketma-ketlikda ishlaydi:

1. **Konfiguratsiya tekshiruvi:** `/etc/lg/<muhit>.env` (yoki `.env.<muhit>`) va `LG_TAG` mavjudligi tekshiriladi.
2. **Oldingi tegni saqlash:** Favqulodda rollback uchun joriy ishlayotgan versiya tegi saqlanadi.
3. **Pre-deploy RDS snapshot (Prod):** Production deploydan oldin avtomatik `pre-deploy-<tag>-<timestamp>` zaxira nusxasi olinadi.
4. **Image pull:** Yangi konteynerlar yuklab olinadi (`docker compose pull`).
5. **DB migratsiyasi:** `migrate` bir martalik servisi orqali yangi DDL migratsiyalari va rollar tekshiriladi. Agar migratsiya yiqilsa, yangilanish to'xtatiladi.
6. **Rolling update:** Servislar sog'lomlik tekshiruvi (healthcheck) bilan yangilanadi (`docker compose up -d`).
7. **Smoke test:** 60 soniya ichida API `healthy` statusiga o'tishi tekshiriladi.
8. **Avtomatik Rollback:** Agar smoke test o'tmasa, skript avtomatik tarzda `rollback.sh` ni ishga tushirib, avvalgi barqaror versiyani tiklaydi.

### Qo'lda deploy qilish:

```bash
# Staging muhitiga deploy
./infra/scripts/deploy.sh staging <GIT_SHA>

# Production muhitiga deploy
./infra/scripts/deploy.sh production v1.0.0
```

---

## 3. Bitta buyruqli Rollback (`rollback.sh`)

Agar yangi versiya chiqqandan so'ng kutilmagan biznes xatolari yoki nosozliklar yuzaga kelsa, bitta buyruq bilan oldingi barqaror versiyaga qaytiladi:

```bash
# Avvalgi barqaror versiyaga qaytish (avtomatik ravishda oxirgi saqlangan tegga)
./infra/scripts/rollback.sh production

# Yoki aniq bir versiya tegiga qaytarish
./infra/scripts/rollback.sh production v0.9.8
```

---

## 4. Xatolar va bartaraf etish (Troubleshooting)

1. **DB migratsiyasi qotib qolsa (lock):**
   - Agar biror tranzaksiya jadvallarni qulflab qo'ygan bo'lsa:
     ```sql
     SELECT pid, query, state, age(clock_timestamp(), query_start)
     FROM pg_stat_activity
     WHERE state != 'idle' AND query NOT ILIKE '%pg_stat_activity%';
     ```
   - Qulflagan jarayonni to'xtatish: `SELECT pg_terminate_backend(<pid>);`

2. **Konteynerlar `unhealthy` bo'lib qolsa:**
   - Loglarni ko'rish:
     ```bash
     docker compose --env-file /etc/lg/prod.env -f compose.prod.yml logs --tail 100 api
     ```

## 5. Domenni almashtirish

Tartib muhim: S3 CORS va SSM yangilanmasdan deploy qilinsa, Mini App'dan chek yuklash (presigned POST) ishlamaydi.

1. DNS: `app`, apex va `www` → server IP (`tofu output server_ip`). Tekshiruv: `dig +short app.<domen>`.
2. S3 CORS: `prod.tfvars`da `app_domain = "app.<domen>"` → `tofu plan` (faqat `aws_s3_bucket_cors_configuration.files` o'zgaradi) → `tofu apply`.
3. SSM (operator, `AWS_PROFILE=root`, `eu-central-1`):
   ```bash
   for kv in APP_DOMAIN=app.<domen> SITE_DOMAIN=<domen> LEGACY_DOMAIN=<eski-host>; do
     aws ssm put-parameter --region eu-central-1 --name "/lg/prod/${kv%%=*}" --value "${kv#*=}" \
       --type SecureString --key-id alias/lg-prod --overwrite >/dev/null && echo "+ ${kv%%=*}"
   done
   ```
4. GitHub: `gh variable set APP_DOMAIN --env production --body app.<domen>` (smoke-test manzili).
5. Prod deploy (`CD — Production Deploy`, workflow_dispatch). Bot ishga tushganda webhook va menyu tugmasini
   yangi `APP_DOMAIN` bilan o'zi qayta ro'yxatdan o'tkazadi; Caddy yangi hostlar uchun sertifikat oladi.
6. BotFather → `/myapps` → Mini App URL'ini `https://app.<domen>/app/` ga o'zgartiring (`t.me/<bot>/app?startapp=…` havolalari uchun).
7. Tekshiruv: `curl -sI https://app.<domen>/api/health/ready` → 200; `curl -sI https://<eski-host>/x` → 308 `app.<domen>/x`;
   `curl -sI https://<domen>` → 302 `/landing`.
