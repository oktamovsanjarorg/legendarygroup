#!/usr/bin/env bash
# ==============================================================================
# Legendary Group — Texnik Telegram Guruhiga Alert Yuborish (T-016, 06 §6)
#
# Ishlatish:
#   ./scripts/send-telegram-alert.sh [CRITICAL|WARNING|INFO] "Komponent" "Xabar matni"
# ==============================================================================
set -euo pipefail

LEVEL="${1:-INFO}"
COMPONENT="${2:-System}"
MESSAGE="${3:-}"

if [[ -z "$MESSAGE" ]]; then
  echo "XATO: Xabar matni kiritilmadi!" >&2
  echo "Ishlatish: $0 [CRITICAL|WARNING|INFO] <Komponent> <Xabar>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "/etc/lg/prod.env" ]]; then
  # shellcheck source=/dev/null
  source "/etc/lg/prod.env" 2>/dev/null || true
elif [[ -f "$ROOT_DIR/.env" ]]; then
  # shellcheck source=/dev/null
  source "$ROOT_DIR/.env" 2>/dev/null || true
fi

BOT_TOKEN="${ALERTS_BOT_TOKEN:-${TELEGRAM_BOT_TOKEN:-}}"
CHAT_ID="${ALERTS_TELEGRAM_CHAT_ID:-}"

if [[ -z "$BOT_TOKEN" || -z "$CHAT_ID" ]]; then
  echo "⚠️ TELEGRAM_BOT_TOKEN yoki ALERTS_TELEGRAM_CHAT_ID o'rnatilmagan. Alert stdout'ga chiqariladi:"
  echo "[$LEVEL] [$COMPONENT] $MESSAGE"
  exit 0
fi

case "$LEVEL" in
  CRITICAL) ICON="🚨 <b>[KRITIK ALERT]</b>" ;;
  WARNING)  ICON="⚠️ <b>[OGOHLANTIRISH]</b>" ;;
  INFO|*)   ICON="ℹ️ <b>[MA'LUMOT]</b>" ;;
esac

TEXT="${ICON}
<b>Komponent:</b> <code>${COMPONENT}</code>
<b>Vaqt:</b> $(date -u '+%Y-%m-%d %H:%M:%S UTC')
<b>Xabar:</b>
${MESSAGE}"

curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d "chat_id=${CHAT_ID}" \
  -d "parse_mode=HTML" \
  -d "text=${TEXT}" >/dev/null || {
  echo "XATO: Telegram alert yuborilmadi" >&2
  exit 1
}

echo "✅ Telegram alert yuborildi."
