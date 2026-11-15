#!/usr/bin/env bash
# ==============================================================================
# Legendary Group — prod monitoring (T-016, 06 §6). systemd timer har 5 daqiqada (lg-monitor).
#
# Tekshiruvlar: tashqi HTTPS health (Caddy + API + DB/Redis), disk > 80%, konteynerlar ishlayaptimi,
# API 5xx > 2% va p95 > 1 s (api-stats.py, API loglaridan).
# Alert → Telegram (TELEGRAM_BOT_TOKEN, ALERTS_TELEGRAM_CHAT_ID /etc/lg/production.env dan).
# Bir xil alert — ko'pi bilan soatiga bir marta; tiklanganda "tiklandi" xabari.
# Health — 2 marta ketma-ket yiqilsa (06 §6).
# ==============================================================================
set -uo pipefail

ENV_FILE="${ENV_FILE:-/etc/lg/production.env}"
STATE="${STATE_DIR:-/var/lib/lg}/monitor"
mkdir -p "$STATE"
# shellcheck source=/dev/null
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"
HEALTH_URL="${HEALTH_URL:-https://${APP_DOMAIN:-localhost}/api/health/ready}"

send() {
  local text="$1"
  echo "$(date -u +%FT%TZ) $text"
  [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${ALERTS_TELEGRAM_CHAT_ID:-}" ]] || return 0
  curl -fsS -m 10 "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${ALERTS_TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${text}" >/dev/null || echo "telegram: yuborilmadi"
}

# alert <kalit> <xabar>: soatiga bir marta; resolve <kalit> <xabar>: faqat avval alert bo'lsa.
alert() {
  local f="$STATE/$1.alert" now
  now="$(date +%s)"
  if [[ ! -f "$f" ]] || (( now - $(cat "$f") >= 3600 )); then
    echo "$now" >"$f"
    send "🚨 LG prod: $2"
  fi
}
resolve() {
  [[ -f "$STATE/$1.alert" ]] || return 0
  rm -f "$STATE/$1.alert"
  send "✅ LG prod: $2"
}

# 1. Health (2 marta ketma-ket).
code="$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$HEALTH_URL" || true)"
if [[ "$code" == "200" ]]; then
  rm -f "$STATE/health.fail"
  resolve health "health tiklandi"
else
  fails=$(( $(cat "$STATE/health.fail" 2>/dev/null || echo 0) + 1 ))
  echo "$fails" >"$STATE/health.fail"
  (( fails >= 2 )) && alert health "health ${fails} marta ketma-ket yiqildi (HTTP ${code:-000})"
fi

# 2. Disk > 80%.
disk="$(df --output=pcent / | tail -1 | tr -dc '0-9')"
if (( disk > 80 )); then alert disk "disk ${disk}% band"; else resolve disk "disk ${disk}%"; fi

# 3. Konteynerlar (docker compose -p lg-prod): ishlamayotgani bo'lsa.
down="$(docker ps -a --filter label=com.docker.compose.project=lg-prod \
  --format '{{.Names}} {{.State}}' | awk '$2 != "running" {print $1}' | paste -sd, -)"
if [[ -n "$down" ]]; then alert containers "ishlamayotgan konteyner: ${down}"
else resolve containers "barcha konteynerlar ishlayapti"; fi
# 4. API: 5xx > 2% va p95 > 1 s (oxirgi 5 daqiqa; kamida 20 so'rov bo'lsa).
read -r total errors p95 < <(docker logs --since 5m lg-prod-api-1 2>&1 \
  | python3 "$(dirname "$0")/api-stats.py" || echo "0 0 0")
if (( total >= 20 && errors * 100 > total * 2 )); then
  alert api5xx "API 5xx: ${errors}/${total} (5 daq)"
else resolve api5xx "API 5xx normal (${errors}/${total})"; fi
if (( total >= 20 && p95 > 1000 )); then alert apip95 "API p95 = ${p95} ms (5 daq)"
else resolve apip95 "API p95 normal (${p95} ms)"; fi
exit 0
