#!/bin/sh
# Staging Postgres: ilova login'ini yaratadi (faqat birinchi ishga tushishda, bo'sh volume).
# `lg_app` guruh rolini migratsiya (0001) yaratadi va `cli db:migrate` shu login'ga beradi —
# ilova jadval egasi sifatida EMAS, cheklangan huquq bilan ulanadi (audit/ledger himoyasi).
set -eu
: "${APP_DB_LOGIN:?}" "${APP_DB_PASSWORD:?}"
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v login="$APP_DB_LOGIN" -v pw="$APP_DB_PASSWORD" <<'SQL'
CREATE ROLE :"login" LOGIN PASSWORD :'pw';
SQL
