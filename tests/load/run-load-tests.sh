#!/usr/bin/env bash
# ==============================================================================
# Legendary Group — k6 Yuklama Testlarini Ishga Tushirish (T-504, F5)
#
# Ishlatish:
#   ./tests/load/run-load-tests.sh [smoke|api|invoice|broadcast|all]
# ==============================================================================
set -euo pipefail

TARGET="${1:-api}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

API_URL="${API_URL:-http://localhost:3000}"

run_k6() {
  local script_file="$1"
  echo "🚀 k6 yuklama testi boshlanmoqda: ${script_file}..."

  if command -v k6 >/dev/null 2>&1; then
    k6 run -e API_URL="$API_URL" "$script_file"
  else
    echo "ℹ️ k6 mahalliy topilmadi, Docker orqali ishga tushirilmoqda..."
    docker run --rm -i \
      --network="host" \
      -e API_URL="$API_URL" \
      -v "$SCRIPT_DIR:/scripts" \
      grafana/k6:latest run "/scripts/$(basename "$script_file")"
  fi
}

case "$TARGET" in
  api)
    run_k6 "$SCRIPT_DIR/api-load.js"
    ;;
  invoice)
    run_k6 "$SCRIPT_DIR/invoice-burst.js"
    ;;
  broadcast)
    run_k6 "$SCRIPT_DIR/broadcast-burst.js"
    ;;
  all)
    run_k6 "$SCRIPT_DIR/api-load.js"
    run_k6 "$SCRIPT_DIR/invoice-burst.js"
    run_k6 "$SCRIPT_DIR/broadcast-burst.js"
    ;;
  *)
    echo "XATO: Noto'g'ri test turi: $TARGET" >&2
    echo "Variantlar: api, invoice, broadcast, all" >&2
    exit 1
    ;;
esac

echo "✅ Yuklama testlari muvaffaqiyatli yakunlandi."
