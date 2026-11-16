#!/usr/bin/env bash
# ==============================================================================
# Texnik chatga Telegram xabari (T-016): monitor alertlari bilan bir xil chat.
#   notify-telegram.sh "<matn>"
# TELEGRAM_BOT_TOKEN, ALERTS_TELEGRAM_CHAT_ID — /etc/lg/production.env (render-env.sh).
# Chat sozlanmagan bo'lsa — faqat stdout'ga; xabar yetmasa deploy yiqilmaydi.
# ==============================================================================
set -uo pipefail

TEXT="${1:?matn}"
ENV_FILE="${ENV_FILE:-/etc/lg/production.env}"
# shellcheck source=/dev/null
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"
echo "$TEXT"
[[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${ALERTS_TELEGRAM_CHAT_ID:-}" ]] || exit 0
curl -fsS -m 10 "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${ALERTS_TELEGRAM_CHAT_ID}" \
  --data-urlencode "text=${TEXT}" \
  --data-urlencode "disable_web_page_preview=true" >/dev/null || echo "telegram: yuborilmadi"
exit 0
