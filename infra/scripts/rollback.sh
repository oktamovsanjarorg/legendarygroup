#!/usr/bin/env bash
# ==============================================================================
# Legendary Group — Bitta buyruqli Rollback Skripti (T-014, 06 §4)
#
# Ishlatish:
#   ./infra/scripts/rollback.sh [staging|production] [TARGET_TAG]
#
# Vazifasi:
#   Ko'rsatilgan (yoki oldingi barqaror) teg bo'yicha konteynerlarni qaytarish
#   va sog'lomlik tekshiruvini (healthcheck) o'tkazish.
# ==============================================================================
set -euo pipefail

ENV="${1:-staging}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

STATE_DIR="${STATE_DIR:-/var/run/lg}"
[[ -d "$STATE_DIR" ]] || STATE_DIR="$ROOT_DIR/.deploy_state"

LAST_TAG_FILE="$STATE_DIR/${ENV}.last_tag"
CURRENT_TAG_FILE="$STATE_DIR/${ENV}.current_tag"

TARGET_TAG="${2:-}"
if [[ -z "$TARGET_TAG" ]]; then
  if [[ -f "$LAST_TAG_FILE" && -s "$LAST_TAG_FILE" ]]; then
    TARGET_TAG="$(cat "$LAST_TAG_FILE")"
  else
    echo "XATO: Rollback uchun nishon teg topilmadi ($LAST_TAG_FILE mavjud emas)!" >&2
    echo "Ishlatish: $0 [staging|production] <TARGET_TAG>" >&2
    exit 1
  fi
fi

if [[ -f "/etc/lg/${ENV}.env" ]]; then
  ENV_FILE="/etc/lg/${ENV}.env"
elif [[ -f "$ROOT_DIR/.env.${ENV}" ]]; then
  ENV_FILE="$ROOT_DIR/.env.${ENV}"
elif [[ -f "$ROOT_DIR/.env" ]]; then
  ENV_FILE="$ROOT_DIR/.env"
else
  echo "XATO: ${ENV} uchun env fayl topilmadi" >&2
  exit 1
fi

COMPOSE_ARGS=(--env-file "$ENV_FILE" -f compose.prod.yml)
if [[ "$ENV" == "staging" ]]; then
  COMPOSE_ARGS+=(-f compose.staging.yml)
fi

echo "=================================================="
echo "⏪ ROLLBACK boshlandi: Muhit=${ENV}, Nishon Teg=${TARGET_TAG}"
echo "=================================================="

export LG_TAG="$TARGET_TAG"
echo "♻️ Oldingi versiyadagi konteynerlar ishga tushirilmoqda..."
docker compose "${COMPOSE_ARGS[@]}" up -d --remove-orphans

echo "🩺 Rollback holati tekshirilmoqda..."
TIMEOUT=60
START_TIME=$(date +%s)
HEALTHY=false

while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))
  if [[ $ELAPSED -ge $TIMEOUT ]]; then
    break
  fi

  API_STATUS=$(docker compose "${COMPOSE_ARGS[@]}" ps --format json api 2>/dev/null | grep -o '"Health":"healthy"' || true)
  if [[ -n "$API_STATUS" ]]; then
    HEALTHY=true
    break
  fi
  sleep 3
done

if [[ "$HEALTHY" == "true" ]]; then
  echo "✅ Rollback muvaffaqiyatli yakunlandi! Tizim ${TARGET_TAG} versiyasida sog'lom."
  echo "$TARGET_TAG" > "$CURRENT_TAG_FILE"
  exit 0
else
  echo "❌ XATO: Rollback qilingan versiya ham 60s ichida sog'lom bo'lmadi!" >&2
  docker compose "${COMPOSE_ARGS[@]}" logs --tail 50 api
  exit 1
fi
