#!/usr/bin/env bash
# ==============================================================================
# Legendary Group — Database & Redis Backup Script (T-015)
# RPO: <= 24 soat (har kuni 03:00 avtomatik ishga tushadi)
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/tmp/lg_backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DAY_OF_MONTH="$(date +%d)"
DB_NAME="${PGDATABASE:-legendary_dev}"
DB_USER="${PGUSER:-postgres}"
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5434}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6380}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

DUMP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump"
REDIS_DUMP_FILE="${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"

echo "[1/4] PostgreSQL zaxira nusxasi olinmoqda: ${DB_NAME} (${DB_HOST}:${DB_PORT})..."
PGPASSWORD="${PGPASSWORD:-postgres}" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -F c \
  -b \
  -v \
  -f "$DUMP_FILE" \
  "$DB_NAME"

echo "[2/4] Zaxira fayli SHA-256 nazorat summasi hisoblanmoqda..."
sha256sum "$DUMP_FILE" > "${DUMP_FILE}.sha256"

echo "[3/4] Redis BGSAVE chaqirilmoqda..."
if command -v redis-cli &> /dev/null; then
  redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE || true
fi

# Agar S3_BACKUP_BUCKET sozlangan bo'lsa — S3'ga yuklash (SSE-KMS bilan)
if [ -n "${S3_BACKUP_BUCKET:-}" ]; then
  echo "S3 ga yuklanmoqda: s3://${S3_BACKUP_BUCKET}/backups/daily/${TIMESTAMP}/..."
  AWS_EXTRA_ARGS=""
  if [ -n "${S3_ENDPOINT_URL:-}" ]; then
    AWS_EXTRA_ARGS="--endpoint-url ${S3_ENDPOINT_URL}"
  fi
  aws s3 cp "$DUMP_FILE" "s3://${S3_BACKUP_BUCKET}/backups/daily/${TIMESTAMP}/" \
    --sse aws:kms ${AWS_EXTRA_ARGS}
  aws s3 cp "${DUMP_FILE}.sha256" "s3://${S3_BACKUP_BUCKET}/backups/daily/${TIMESTAMP}/" \
    --sse aws:kms ${AWS_EXTRA_ARGS}

  # Har oyning 1-kuni oylik arxivga ham nusxalanadi (1 yillik saqlash)
  if [ "$DAY_OF_MONTH" = "01" ]; then
    echo "Oylik arxivga yuklanmoqda: s3://${S3_BACKUP_BUCKET}/backups/monthly/${TIMESTAMP}/..."
    aws s3 cp "$DUMP_FILE" "s3://${S3_BACKUP_BUCKET}/backups/monthly/${TIMESTAMP}/" \
      --sse aws:kms ${AWS_EXTRA_ARGS}
    aws s3 cp "${DUMP_FILE}.sha256" "s3://${S3_BACKUP_BUCKET}/backups/monthly/${TIMESTAMP}/" \
      --sse aws:kms ${AWS_EXTRA_ARGS}
  fi
fi

echo "[4/4] ${RETENTION_DAYS} kundan eski lokal zaxiralar tozalanmoqda..."
find "$BACKUP_DIR" -type f -name "*.dump" -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -type f -name "*.sha256" -mtime +"$RETENTION_DAYS" -delete

echo "Muvaffaqiyatli yakunlandi! Fayl: $DUMP_FILE (Hajm: $(du -h "$DUMP_FILE" | cut -f1))"
