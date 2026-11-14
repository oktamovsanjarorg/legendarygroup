#!/usr/bin/env bash
# ==============================================================================
# Legendary Group — OWASP ZAP Xavfsizlik Skaneri (T-505, F5)
#
# Ishlatish:
#   ./scripts/zap-scan.sh [TARGET_URL]
# ==============================================================================
set -euo pipefail

TARGET_URL="${1:-http://localhost:3000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT_DIR="$ROOT_DIR/docs/security/reports"
mkdir -p "$REPORT_DIR"

REPORT_HTML="$REPORT_DIR/zap-report-$(date +%Y%m%d).html"
REPORT_MD="$REPORT_DIR/zap-report-$(date +%Y%m%d).md"

echo "=================================================="
echo "🛡️ OWASP ZAP xavfsizlik skaneri boshlanmoqda..."
echo "Nishon: ${TARGET_URL}"
echo "Hisobot: ${REPORT_HTML}"
echo "=================================================="

if command -v docker >/dev/null 2>&1; then
  docker run --rm \
    --network="host" \
    -v "$REPORT_DIR:/zap/wrk/:rw" \
    ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
    -t "$TARGET_URL" \
    -r "$(basename "$REPORT_HTML")" \
    -w "$(basename "$REPORT_MD")" \
    -I || true
  echo "✅ OWASP ZAP skanerlash yakunlandi. Hisobot yaratildi."
else
  echo "⚠️ Docker topilmadi. ZAP skanerlash uchun Docker zarur." >&2
  exit 1
fi
