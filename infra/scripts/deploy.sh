#!/usr/bin/env bash
# ==============================================================================
# Legendary Group — Idempotent Deploy Skripti (T-014, 06 §4)
#
# Ishlatish:
#   ./infra/scripts/deploy.sh [staging|production] [TAG] [--skip-snapshot]
#
# Vazifasi:
#   1. Konfiguratsiya va argumentlarni tekshirish
#   2. Prod muhitida avval RDS snapshot olish
#   3. Joriy tagni zaxiralash (rollback uchun)
#   4. Yangi image'larni yuklab olish (docker compose pull)
#   5. DB migratsiyalarini bajarish (migrate servisi)
#   6. Konteynerlarni rolling usulda qayta ishga tushirish (compose up -d)
#   7. Smoke test (healthcheck tekshiruvi)
#   8. Agar smoke test yiqilsa — avtomatik rollback qilish
# ==============================================================================
set -euo pipefail

ENV="${1:-staging}"
TAG="${2:-${LG_TAG:-}}"
SKIP_SNAPSHOT="${3:-}"

if [[ -z "$TAG" ]]; then
  echo "XATO: Image tegi (TAG) ko'rsatilmadi!" >&2
  echo "Ishlatish: $0 [staging|production] <TAG>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

STATE_DIR="${STATE_DIR:-/var/run/lg}"
mkdir -p "$STATE_DIR" 2>/dev/null || STATE_DIR="$ROOT_DIR/.deploy_state"
mkdir -p "$STATE_DIR"

LAST_TAG_FILE="$STATE_DIR/${ENV}.last_tag"
CURRENT_TAG_FILE="$STATE_DIR/${ENV}.current_tag"

# Env faylini aniqlash
if [[ -f "/etc/lg/${ENV}.env" ]]; then
  ENV_FILE="/etc/lg/${ENV}.env"
elif [[ -f "$ROOT_DIR/.env.${ENV}" ]]; then
  ENV_FILE="$ROOT_DIR/.env.${ENV}"
elif [[ -f "$ROOT_DIR/.env" ]]; then
  ENV_FILE="$ROOT_DIR/.env"
else
  echo "XATO: ${ENV} uchun env fayl topilmadi (/etc/lg/${ENV}.env yoki .env.${ENV})" >&2
  exit 1
fi

COMPOSE_ARGS=(--env-file "$ENV_FILE" -f compose.prod.yml)
if [[ "$ENV" == "staging" ]]; then
  COMPOSE_ARGS+=(-f compose.staging.yml)
fi

echo "=================================================="
echo "🚀 Deploy boshlandi: Muhit=${ENV}, Teg=${TAG}"
echo "Env fayl: ${ENV_FILE}"
echo "=================================================="

# 1. Joriy ishlayotgan tegni saqlab qo'yish
if [[ -f "$CURRENT_TAG_FILE" ]]; then
  CURRENT_TAG="$(cat "$CURRENT_TAG_FILE")"
  echo "$CURRENT_TAG" > "$LAST_TAG_FILE"
  echo "Oldingi teg zaxiraga olindi: ${CURRENT_TAG}"
fi

# 2. Production'da deploydan oldin snapshot olish
if [[ "$ENV" == "production" && "$SKIP_SNAPSHOT" != "--skip-snapshot" ]]; then
  echo "📸 Production: RDS snapshot tekshirilmoqda..."
  if command -v aws >/dev/null 2>&1 && [[ -n "${RDS_INSTANCE_ID:-}" ]]; then
    SNAPSHOT_ID="pre-deploy-${TAG}-$(date +%s)"
    echo "RDS snapshot yaratilmoqda: ${SNAPSHOT_ID}..."
    aws rds create-db-snapshot \
      --db-instance-identifier "$RDS_INSTANCE_ID" \
      --db-snapshot-identifier "$SNAPSHOT_ID" >/dev/null
    echo "✅ RDS snapshot muvaffaqiyatli so'raldi."
  else
    echo "⚠️ AWS CLI yoki RDS_INSTANCE_ID yo'q — snapshot tashlab ketildi."
  fi
fi

# 3. Yangi image'larni yuklab olish
export LG_TAG="$TAG"
echo "📥 Image'lar tortib olinmoqda (pull)..."
docker compose "${COMPOSE_ARGS[@]}" pull --ignore-buildable || {
  echo "XATO: Docker pull muvaffaqiyatsiz tugadi!" >&2
  exit 1
}

# 4. Migratsiyalarni qo'llash
echo "🔄 DB migratsiyalari tekshirilmoqda va bajarilmoqda..."
docker compose "${COMPOSE_ARGS[@]}" run --rm migrate || {
  echo "❌ XATO: DB migratsiyasi bajarilmadi! Konteynerlar yangilanmadi." >&2
  exit 1
}

# 5. Konteynerlarni yangilash (rolling update)
echo "♻️ Konteynerlar ishga tushirilmoqda..."
docker compose "${COMPOSE_ARGS[@]}" up -d --remove-orphans

# 6. Smoke test (Healthcheck tekshiruvi)
echo "🩺 Smoke test o'tkazilmoqda..."
HEALTHY=false
TIMEOUT=60
START_TIME=$(date +%s)

while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))

  if [[ $ELAPSED -ge $TIMEOUT ]]; then
    break
  fi

  # API status tekshiruvi
  API_STATUS=$(docker compose "${COMPOSE_ARGS[@]}" ps --format json api 2>/dev/null | grep -o '"Health":"healthy"' || true)
  if [[ -n "$API_STATUS" ]]; then
    HEALTHY=true
    break
  fi

  sleep 3
done

if [[ "$HEALTHY" == "true" ]]; then
  echo "✅ Smoke test muvaffaqiyatli o'tdi! API konteyneri 'healthy' holatda."
  echo "$TAG" > "$CURRENT_TAG_FILE"
  echo "=================================================="
  echo "🎉 Deploy muvaffaqiyatli yakunlandi: ${ENV} (${TAG})"
  echo "=================================================="
  exit 0
else
  echo "❌ XATO: Smoke test muvaffaqiyatsiz bo'ldi (${TIMEOUT}s ichida healthy bo'lmadi)!" >&2
  echo "🔄 Avtomatik rollback boshlanmoqda..." >&2

  if [[ -f "$LAST_TAG_FILE" && -s "$LAST_TAG_FILE" ]]; then
    ROLLBACK_TAG="$(cat "$LAST_TAG_FILE")"
    echo "Oldingi barqaror teg: ${ROLLBACK_TAG}"
    "$SCRIPT_DIR/rollback.sh" "$ENV" "$ROLLBACK_TAG"
  else
    echo "⚠️ Oldingi teg topilmadi, rollback to'xtatildi. Loglarni tekshiring:" >&2
    docker compose "${COMPOSE_ARGS[@]}" logs --tail 50 api
  fi
  exit 1
fi
