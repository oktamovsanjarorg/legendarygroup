#!/usr/bin/env bash
# ==============================================================================
# Reliz yozuvlari (T-016): yangi release-log.txt dan oldingi relizning HEAD commitigacha
# bo'lgan sarlavhalar (ko'pi bilan 15 ta, merge commitlarsiz).
#   release-notes.sh <yangi release-log.txt> [oldingi release-log.txt]
# ==============================================================================
set -euo pipefail

NEW="${1:?yangi log}"
OLD="${2:-}"
[[ -f "$NEW" ]] || exit 0
prev=""
[[ -n "$OLD" && -f "$OLD" ]] && prev="$(head -1 "$OLD" | cut -d' ' -f1)"
awk -v prev="$prev" '
  prev != "" && $1 == prev { exit }
  $2 == "Merge" { next }
  { n++; if (n <= 15) { $1 = ""; sub(/^ /, ""); print "• " $0 } }
  END { if (n > 15) print "… va yana " n - 15 " ta" }
' "$NEW"
