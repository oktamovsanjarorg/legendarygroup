#!/usr/bin/env bash
# ==============================================================================
# Legendary Group — Avtomatik Monitoring va Alertlar (T-016, 06 §6)
#
# Ishlatish:
#   ./scripts/monitor-health-alerts.sh
#
# Cron (har 5 daqiqada):
#   */5 * * * * /srv/lg/scripts/monitor-health-alerts.sh >> /var/log/lg/monitor.log 2>&1
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_FILE="/tmp/lg_health_fail_count"

# 1. API Health Check tekshiruvi
API_URL="${API_INTERNAL_URL:-http://localhost:3000}/api/health/ready"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" || echo "000")

if [[ "$HTTP_STATUS" != "200" ]]; then
  FAIL_COUNT=$(cat "$STATE_FILE" 2>/dev/null || echo "0")
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo "$FAIL_COUNT" > "$STATE_FILE"

  if [[ $FAIL_COUNT -ge 2 ]]; then
    "$SCRIPT_DIR/send-telegram-alert.sh" "CRITICAL" "API /health" \
      "API Health-check ketma-ket ${FAIL_COUNT} marta muvaffaqiyatsiz bo'ldi! (HTTP status: ${HTTP_STATUS})"
  fi
else
  # Muvaffaqiyatli bo'lsa hisoblagichni tozalash
  rm -f "$STATE_FILE" 2>/dev/null || true
fi

# 2. Disk bandligini tekshirish (Disk > 80%)
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [[ -n "$DISK_USAGE" && "$DISK_USAGE" -gt 80 ]]; then
  "$SCRIPT_DIR/send-telegram-alert.sh" "WARNING" "EC2 Storage" \
    "Server disk xotirasi bandligi 80% dan oshdi: ${DISK_USAGE}% band!"
fi

# 3. Metrikalar va DB/Redis ulanish tekshiruvi
METRICS_URL="${API_INTERNAL_URL:-http://localhost:3000}/api/health/metrics"
METRICS_DATA=$(curl -s "$METRICS_URL" || true)

if [[ -n "$METRICS_DATA" ]]; then
  DB_UP=$(echo "$METRICS_DATA" | grep "^service_database_up" | awk '{print $2}' || echo "1")
  REDIS_UP=$(echo "$METRICS_DATA" | grep "^service_redis_up" | awk '{print $2}' || echo "1")

  if [[ "$DB_UP" == "0" ]]; then
    "$SCRIPT_DIR/send-telegram-alert.sh" "CRITICAL" "Database" \
      "PostgreSQL bazasiga ulanish uzildi (service_database_up = 0)!"
  fi

  if [[ "$REDIS_UP" == "0" ]]; then
    "$SCRIPT_DIR/send-telegram-alert.sh" "CRITICAL" "Redis" \
      "Redis kesh/navbat serveriga ulanish uzildi (service_redis_up = 0)!"
  fi
fi

echo "Monitoring tekshiruvi muvaffaqiyatli yakunlandi ($(date '+%Y-%m-%d %H:%M:%S'))"
