#!/usr/bin/env bash
# ==============================================================================
# Legendary Group — prod sirlarini SSM'ga bir marta yozish (T-014). Operator o'z terminalida:
#
#   AWS_PROFILE=root ./infra/scripts/bootstrap-prod-secrets.sh
#
# - Tasodifiy sirlar (openssl) — faqat YO'Q bo'lsa yoziladi (--no-overwrite): qayta ishga
#   tushirish xavfsiz, mavjud sir almashtirilmaydi (TOTP kaliti o'zgarsa 2FA buziladi).
# - Telegram tokeni va username — prod bot (BotFather), so'raladi (ekranda ko'rinmaydi).
#   Almashtirish: TELEGRAM_ROTATE=1 bilan ishga tushiring.
# - Qiymatlar hech qachon chiqarilmaydi. Hammasi SecureString, KMS `alias/lg-prod`.
# ==============================================================================
set -euo pipefail

REGION="${AWS_REGION:-eu-central-1}"
P=/lg/prod
KMS=alias/lg-prod

exists() { aws ssm get-parameter --region "$REGION" --name "$P/$1" >/dev/null 2>&1; }
put() { # name value [overwrite]
  local ow=--no-overwrite; [[ "${3:-}" == 1 ]] && ow=--overwrite
  aws ssm put-parameter --region "$REGION" --name "$P/$1" --value "$2" --type SecureString \
    --key-id "$KMS" "$ow" >/dev/null
  echo "+ $1"
}
gen() { # name bytes
  if exists "$1"; then echo "= $1 (bor)"; else put "$1" "$(openssl rand -hex "$2")"; fi
}

gen APP_DB_PASSWORD 32
gen INTERNAL_API_TOKEN 32
gen JWT_ACCESS_SECRET 32
gen BULL_BOARD_PASSWORD 24
gen TELEGRAM_BOT_WEBHOOK_SECRET 32

if exists TELEGRAM_BOT_TOKEN && [[ "${TELEGRAM_ROTATE:-}" != 1 ]]; then
  echo "= TELEGRAM_BOT_TOKEN (bor)"
else
  read -rsp "Prod bot tokeni (BotFather, 123456:ABC...): " token; echo
  [[ "$token" =~ ^[0-9]+:[A-Za-z0-9_-]{20,}$ ]] || { echo "XATO: token formati noto'g'ri" >&2; exit 1; }
  read -rp "Prod bot username (@siz, masalan legendary_group_bot): " username
  [[ "$username" =~ ^[A-Za-z][A-Za-z0-9_]{3,31}$ ]] || { echo "XATO: username noto'g'ri" >&2; exit 1; }
  put TELEGRAM_BOT_TOKEN "$token" 1
  aws ssm put-parameter --region "$REGION" --name "$P/TELEGRAM_BOT_USERNAME" --value "$username" \
    --type String --overwrite >/dev/null
  echo "+ TELEGRAM_BOT_USERNAME"
fi

echo "Jami: $(aws ssm get-parameters-by-path --region "$REGION" --path "$P/" --query 'length(Parameters)' --output text) ta parametr (kerak: 20)"
