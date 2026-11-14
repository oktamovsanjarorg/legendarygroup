#!/usr/bin/env bash
# ==============================================================================
# Legendary Group — Database Restore Script (T-015)
# RTO: <= 1 soat
# Ishlatish: ./scripts/restore.sh [dump_fayli] [target_db]
# ==============================================================================
set -euo pipefail

DUMP_FILE="${1:-}"
DB_NAME="${2:-${PGDATABASE_TARGET:-${PGDATABASE:-legendary_dev}}}"
DB_USER="${PGUSER:-postgres}"
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5434}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/lg_backups}"

if [ -z "$DUMP_FILE" ]; then
  # Eng oxirgi dump faylni avtomatik topish
  LATEST_DUMP="$(find "$BACKUP_DIR" -type f -name "*.dump" 2>/dev/null | sort -r | head -n 1 || true)"
  if [ -n "$LATEST_DUMP" ]; then
    DUMP_FILE="$LATEST_DUMP"
    echo "Dump fayl ko'rsatilmadi, eng oxirgisi tanlandi: $DUMP_FILE"
  else
    echo "XATO: Dump fayl topilmadi va ko'rsatilmadi!"
    echo "Foydalanish: $0 <path_to_dump_file> [target_db_name]"
    exit 1
  fi
fi

if [ ! -f "$DUMP_FILE" ]; then
  echo "XATO: Dump fayl mavjud emas: $DUMP_FILE"
  exit 1
fi

echo "[1/3] Fayl yaxlitligi (integrity) tekshirilmoqda..."
SHA_FILE="${DUMP_FILE}.sha256"
if [ -f "$SHA_FILE" ]; then
  sha256sum -c "$SHA_FILE"
  echo "SHA-256 nazorat summasi mos keldi."
else
  echo "OGOHLANTIRISH: ${SHA_FILE} topilmadi, tekshiruv o'tkazib yuborildi."
fi

echo "[2/3] Ma'lumotlar bazasiga tiklanmoqda: ${DB_NAME} (${DB_HOST}:${DB_PORT})..."
export PGPASSWORD="${PGPASSWORD:-postgres}"

# Agar baza mavjud bo'lmasa, yaratishga urinish
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" postgres | grep -q 1 || \
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE \"${DB_NAME}\"" postgres

# pg_restore orqali tiklash
# --clean --if-exists: mavjud obyektlarni tozalab yangitdan yaratadi
# --no-owner: egalik xatolarini oldini oladi
pg_restore \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -v \
  "$DUMP_FILE" || {
    RET=$?
    # pg_restore da ba'zi ogohlantirishlar (exit code 1) kritik bo'lmasligi mumkin
    if [ "$RET" -ne 1 ]; then
      echo "XATO: pg_restore muvaffaqiyatsiz tugadi (kod: $RET)"
      exit "$RET"
    fi
  }

echo "[3/3] Tiklangan ma'lumotlar butunligi (smoke test) tekshirilmoqda..."
CHECK_QUERY="
SELECT 'users' AS table_name, count(*) AS count FROM users
UNION ALL
SELECT 'roles' AS table_name, count(*) AS count FROM roles
UNION ALL
SELECT 'branches' AS table_name, count(*) AS count FROM branches;
"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$CHECK_QUERY"

echo "Muvaffaqiyatli tiklandi! Baza: $DB_NAME"
