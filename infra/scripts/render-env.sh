#!/usr/bin/env bash
# ==============================================================================
# Legendary Group — serverda env faylini yig'ish (T-014, 06 §4). Serverda ishlaydi (SSM orqali).
#
#   render-env.sh <muhit> <ssm-yo'l> <db-owner-secret-arn>
#   render-env.sh production /lg/prod/ arn:aws:secretsmanager:...
#
# Manbalar (yagona haqiqat — AWS, git'da sir yo'q):
#   - SSM Parameter Store `<ssm-yo'l>*` (SecureString, KMS) → KALIT=qiymat
#   - Secrets Manager (RDS boshqaradigan jadval egasi paroli) → MIGRATION_DATABASE_URL
# Natija: /etc/lg/<muhit>.env (0600, atomik almashtiriladi). Qiymatlar hech qachon chiqarilmaydi.
# ==============================================================================
set -euo pipefail

ENV_NAME="${1:?muhit (production)}"
SSM_PATH="${2:?SSM path (/lg/prod/)}"
SECRET_ARN="${3:?RDS egasi secret ARN}"
OUT="/etc/lg/${ENV_NAME}.env"

umask 077
install -d -m 0750 /etc/lg
TMP="$(mktemp /etc/lg/.env.XXXXXX)"
trap 'rm -f "$TMP"' EXIT

PARAMS_JSON="$(aws ssm get-parameters-by-path --path "$SSM_PATH" --recursive --with-decryption \
  --query 'Parameters[].[Name,Value]' --output json)"
SECRET_JSON="$(aws secretsmanager get-secret-value --secret-id "$SECRET_ARN" \
  --query SecretString --output text)"

PARAMS_JSON="$PARAMS_JSON" SECRET_JSON="$SECRET_JSON" python3 - "$TMP" <<'PY'
import json, os, re, sys
from urllib.parse import quote

params = {name.rsplit('/', 1)[-1]: value for name, value in json.loads(os.environ['PARAMS_JSON'])}
owner = json.loads(os.environ['SECRET_JSON'])

required = [
    'NODE_ENV', 'LOG_LEVEL', 'APP_DOMAIN', 'SITE_DOMAIN', 'LEGACY_DOMAIN', 'LG_REGISTRY', 'DB_HOST', 'DB_NAME', 'APP_DB_LOGIN',
    'APP_DB_PASSWORD', 'INTERNAL_API_TOKEN', 'JWT_ACCESS_SECRET', 'TOTP_ENCRYPTION_KEY',
    'BULL_BOARD_USER', 'BULL_BOARD_PASSWORD', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_BOT_USERNAME',
    'TELEGRAM_BOT_WEBHOOK_SECRET', 'S3_REGION', 'S3_BUCKET_FILES',
]
missing = [k for k in required if not params.get(k)]
if missing:
    sys.exit("XATO: SSM'da yo'q: " + ', '.join(missing))

def url(user, password):
    # RDS `force_ssl` — shifrlangan ulanish majburiy.
    return (f"postgres://{quote(user, safe='')}:{quote(password, safe='')}@"
            f"{params['DB_HOST']}:5432/{params['DB_NAME']}?sslmode=require")

env = {k: params[k] for k in required if k not in ('DB_HOST', 'DB_NAME')}
# Ixtiyoriy: texnik alertlar chati (T-016, monitor.sh). Yo'q bo'lsa — alert faqat jurnalga.
if params.get('ALERTS_TELEGRAM_CHAT_ID'):
    env['ALERTS_TELEGRAM_CHAT_ID'] = params['ALERTS_TELEGRAM_CHAT_ID']
env['DATABASE_URL'] = url(params['APP_DB_LOGIN'], params['APP_DB_PASSWORD'])
env['MIGRATION_DATABASE_URL'] = url(owner['username'], owner['password'])

with open(sys.argv[1], 'w') as f:
    for k in sorted(env):
        v = env[k]
        # Bitta tirnoq ichida — compose interpolyatsiya qilmaydi ($ xavfsiz).
        if not re.fullmatch(r'[A-Z][A-Z0-9_]*', k) or "'" in v or '\n' in v:
            sys.exit(f"XATO: {k} — ruxsat etilmagan belgi")
        f.write(f"{k}='{v}'\n")
print(f"env: {len(env)} ta kalit")
PY

chmod 0600 "$TMP"
mv -f "$TMP" "$OUT"
trap - EXIT
echo "✅ ${OUT} yangilandi"
