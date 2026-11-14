# Runbook: Deploy va Rollback (T-014, 06 §4)

Ushbu runbook Legendary Group tizimining **Staging** va **Production** muhitlariga deploy qilish, avtomatik smoke testlar va favqulodda vaziyatlarda rollback (orqaga qaytarish) tartibini belgilaydi.

---

## 1. Umumiy arxitektura va qoidalar

- **Staging:** `main` branchiga har bir merge bo'lganda avtomatik ravishda deploy qilinadi (`.github/workflows/cd-staging.yml`).
- **Production:** Faqat reliz teglari (`vX.Y.Z`) e'lon qilinganda, GitHub Environment orqali inson tasdig'i (Director / DevOps) olingandan so'ng deploy qilinadi.
- **Deploy vaqti:** Ish vaqtidan tashqari tavsiya etiladi (darslar 08:00–20:00 oralig'ida bo'ladi).
- **Idempotentlik:** Deploy skripti bir necha marta qayta ishlatilganda ham tizim holatini buzmaydi.

---

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
