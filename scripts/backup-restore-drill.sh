#!/usr/bin/env bash
# ==============================================================================
# Legendary Group — Automated Backup & Restore Drill (T-015)
# Har oyda avtomatik yoki qo'lda zaxirani tiklash mashqi (drill) o'tkazish
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRILL_ID="drill_$(date +%Y%m%d_%H%M%S)"
DRILL_DB="lg_${DRILL_ID}"
DB_USER="${PGUSER:-postgres}"
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5434}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/lg_backups}"
export PGPASSWORD="${PGPASSWORD:-postgres}"

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_ADMIN_CHAT_ID:-${TELEGRAM_ALERT_CHAT_ID:-}}"

send_telegram_report() {
  local status="$1"
  local message="$2"
  if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    local icon="✅"
    if [ "$status" != "SUCCESS" ]; then
      icon="🚨"
    fi
    local text="${icon} *Zaxira va Tiklash Drill (T-015)*%0A*Holat:* ${status}%0A*Vaqt:* $(date '+%Y-%m-%d %H:%M:%S')%0A*Tafsilot:* ${message}"
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=${text}" \
      -d "parse_mode=Markdown" > /dev/null || true
  fi
}

cleanup() {
  echo "[Clean-up] Vaqtinchalik drill bazasi o'chirilmoqda: ${DRILL_DB}..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "DROP DATABASE IF EXISTS \"${DRILL_DB}\" WITH (FORCE);" postgres || true
}
trap cleanup EXIT

echo "=== DRILL BOSHLANDI: ${DRILL_ID} ==="
START_TIME=$(date +%s)

# 1. Backup olish
echo "--> 1. Yangi zaxira nusxasi olinmoqda..."
BACKUP_DIR="$BACKUP_DIR" bash "${SCRIPT_DIR}/backup.sh"

# Eng oxirgi dump faylni aniqlash
LATEST_DUMP="$(find "$BACKUP_DIR" -type f -name "*.dump" | sort -r | head -n 1)"
if [ -z "$LATEST_DUMP" ]; then
  echo "XATO: Zaxira fayli topilmadi!"
  send_telegram_report "FAILED" "Zaxira fayli topilmadi"
  exit 1
fi
echo "Zaxira fayli: $LATEST_DUMP"

# 2. Vaqtinchalik baza yaratish
echo "--> 2. Vaqtinchalik drill bazasi yaratilmoqda: ${DRILL_DB}..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE \"${DRILL_DB}\";" postgres

# 3. Tiklash
echo "--> 3. Dump fayli drill bazasiga tiklanmoqda..."
bash "${SCRIPT_DIR}/restore.sh" "$LATEST_DUMP" "$DRILL_DB"

# 4. Yaxlitlikni chuqur tekshirish (Verification)
echo "--> 4. Ma'lumotlar yaxlitligi tekshirilmoqda..."
USER_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DRILL_DB" -t -A -c "SELECT count(*) FROM users;")
BRANCH_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DRILL_DB" -t -A -c "SELECT count(*) FROM branches;")
ROLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DRILL_DB" -t -A -c "SELECT count(*) FROM roles;")

echo "Natijalar: Users=${USER_COUNT}, Branches=${BRANCH_COUNT}, Roles=${ROLE_COUNT}"

if [ "$ROLE_COUNT" -lt 1 ]; then
  echo "XATO: Rollar jadvali bo'sh yoki noto'g'ri tiklangan!"
  send_telegram_report "FAILED" "Rollar jadvali bo'sh (Count: ${ROLE_COUNT})"
  exit 1
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

SUCCESS_MSG="Muvaffaqiyatli yakunlandi (%20duration: ${DURATION}s). Users: ${USER_COUNT}, Branches: ${BRANCH_COUNT}, Roles: ${ROLE_COUNT}"
echo "=== DRILL MUVAFFAQIYATLI YAKUNLANDI (${DURATION} soniya) ==="
send_telegram_report "SUCCESS" "$SUCCESS_MSG"
