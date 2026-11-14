# Ma'lumotlar bazasini tiklash (Restore Runbook) — T-015

> **RPO (Recovery Point Objective):** $\le$ 24 soat (kunlik shifrlangan zaxira, RDS PITR 14 kunlik tranzaksiyalar jurnali bilan).  
> **RTO (Recovery Time Objective):** $\le$ 1 soat (dump'dan to'liq tiklash va tekshirish ~5–15 daqiqa).

Ushbu qo'llanma favqulodda holatlarda (apparat nosozligi, xodim xatosi yoki ma'lumotlar buzilishi) Legendary Group tizimi ma'lumotlar bazasini qayta tiklash bo'yicha qadamma-qadam ko'rsatmalarni o'z ichiga oladi.

---

## 1. Zaxira strategiyasi va turlari

| Zaxira turi               | Davriyligi                | Saqlash joyi          | Saqlash muddati | Shifrlash         |
| :------------------------ | :------------------------ | :-------------------- | :-------------- | :---------------- |
| **RDS PITR (Continuous)** | Uzluksiz (WAL jurnallari) | AWS RDS ichki         | 14 kun          | AES-256 (AWS KMS) |
| **Kunlik dump (.dump)**   | Har kuni 03:00 UTC        | S3 `backups/daily/`   | 30 kun          | SSE-KMS           |
| **Oylik arxiv**           | Har oyning 1-kuni         | S3 `backups/monthly/` | 365 kun (1 yil) | SSE-KMS           |
| **Redis Snapshot**        | Har kuni 03:00 UTC        | Mahalliy / S3         | 7 kun           | Standard          |

---

## 2. 1-ssenariy: Point-in-Time-Recovery (PITR — AWS RDS)

RDS'da oxirgi 14 kun ichidagi istalgan daqiqaga qaytish mumkin. Bu eng tezkor va ishonchli usul.

### 2.1. AWS CLI orqali tiklash

```bash
# Aniq vaqt nuqtasiga (masalan: 2026-11-13 14:30:00 UTC) yangi RDS instansiyasiga tiklash:
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier lg-prod-db \
  --target-db-instance-identifier lg-prod-db-restored \
  --restore-time "2026-11-13T14:30:00Z" \
  --db-instance-class db.t4g.small \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name lg-prod-db-subnet

# Tiklanish holatini kuzatish:
aws rds describe-db-instances \
  --db-instance-identifier lg-prod-db-restored \
  --query "DBInstances[0].DBInstanceStatus"
```

### 2.2. Ulanishni yo'naltirish (Cutover)

1. Yangi instansiya `available` holatiga o'tgach, uning endpoint manzilini oling.
2. Production ilovasidagi `DATABASE_URL` (Secrets Manager yoki `.env.production`) parametrini yangi endpointga yo'naltiring.
3. Yangi bazada so'nggi ma'lumotlar butunligini tekshiring:
   ```bash
   psql -h <yangi_endpoint> -U postgres -d legendary_prod -c "SELECT count(*) FROM users;"
   ```
4. Ilova servislarini qayta ishga tushiring: `docker compose restart api worker`.

---

## 3. 2-ssenariy: S3 zaxira nusxasidan (Custom Dump) tiklash

Agar AWS RDS instansiyasi butunlay yo'qolgan bo'lsa yoki lokal/staging serverga tiklash kerak bo'lsa:

### 3.1. S3'dan zaxira faylini yuklab olish

```bash
# S3 dagi zaxiralarni ko'rish
aws s3 ls s3://${S3_BACKUP_BUCKET}/backups/daily/

# Kerakli vaqtdagi dump va nazorat summasini yuklab olish
TIMESTAMP="20261114_030000"
aws s3 cp s3://${S3_BACKUP_BUCKET}/backups/daily/${TIMESTAMP}/legendary_prod_${TIMESTAMP}.dump .
aws s3 cp s3://${S3_BACKUP_BUCKET}/backups/daily/${TIMESTAMP}/legendary_prod_${TIMESTAMP}.dump.sha256 .
```

### 3.2. Tiklash skriptini ishga tushirish

Avtomatlashtirilgan `scripts/restore.sh` skripti SHA-256 nazorat summasini tekshiradi, bazani yaratadi va ma'lumotlarni tiklaydi:

```bash
# Format: ./scripts/restore.sh <dump_fayli> [target_db_nomi]
./scripts/restore.sh legendary_prod_${TIMESTAMP}.dump legendary_prod
```

### 3.3. Qo'lda tiklash (skriptsiz bajarish kerak bo'lganda)

```bash
# 1. SHA-256 tekshirish
sha256sum -c legendary_prod_${TIMESTAMP}.dump.sha256

# 2. Bazani yaratish
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE legendary_prod;" postgres

# 3. pg_restore bajarish
PGPASSWORD=$PGPASSWORD pg_restore \
  -h $DB_HOST \
  -p $DB_PORT \
  -U $DB_USER \
  -d legendary_prod \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -v \
  legendary_prod_${TIMESTAMP}.dump
```

---

## 4. 3-ssenariy: Oylik avtomatlashtirilgan Drill (Sinov)

Zaxiralar ishlayotganiga ishonch hosil qilish uchun har oyda zaxiradan tiklash drill o'tkaziladi.

### 4.1. Lokal yoki CI muhitida sinash

```bash
./scripts/backup-restore-drill.sh
```

Ushbu skript quyidagilarni avtomatik bajaradi:

1. Joriy bazaning to'liq shifrlangan zaxirasini oladi.
2. SHA-256 xesh summasini hisoblaydi va tekshiradi.
3. Vaqtinchalik izolyatsiyalangan test bazasini yaratadi (`lg_drill_<timestamp>`).
4. Zaxirani test bazasiga tiklaydi.
5. Asosiy jadvallardagi yozuvlar sonini va yaxlitligini tekshiradi (`users`, `branches`, `roles`).
6. Vaqtinchalik bazani tozalaydi.
7. Telegram kanaliga yoki adminga `@LGAlertBot` orqali muvaffaqiyat hisobotini jo'natadi.

### 4.2. GitHub Actions orqali oylik ishga tushirish

`.github/workflows/backup-restore-drill.yml` har oyning 1-sanasida avtomatik ishga tushadi yoki GitHub UI orqali qo'lda `Run workflow` tugmasi bilan ishga tushiriladi.
