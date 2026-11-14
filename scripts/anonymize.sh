#!/usr/bin/env bash
# ==============================================================================
# Legendary Group — Staging Anonymization Wrapper (T-018)
# Foydalanish: ./scripts/anonymize.sh [DATABASE_URL]
# ==============================================================================
set -euo pipefail

TARGET_DB_URL="${1:-${DATABASE_URL:-}}"

if [ -z "$TARGET_DB_URL" ]; then
  echo "XATO: Ma'lumotlar bazasi URL manzili (DATABASE_URL) ko'rsatilmadi!"
  echo "Foydalanish: $0 [postgresql://user:pass@host:port/dbname]"
  exit 1
fi

echo "[T-018] Staging ma'lumotlarini anonimlashtirish boshlandi..."
DATABASE_URL="$TARGET_DB_URL" pnpm --filter @lg/db db:anonymize

echo "[T-018] Anonimlashtirish muvaffaqiyatli yakunlandi!"
