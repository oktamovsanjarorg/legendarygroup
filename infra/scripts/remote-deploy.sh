#!/usr/bin/env bash
# ==============================================================================
# Legendary Group — serverdagi deploy kirish nuqtasi (T-014). GitHub Actions SSM Run Command
# orqali chaqiradi: reliz to'plami /opt/lg/releases/<TAG> ga ochilgan, shu skript uning ichida.
#
#   remote-deploy.sh <TAG> <REGION> <DB_OWNER_SECRET_ARN>
#
# 1. /etc/lg/production.env — SSM + Secrets Manager'dan (render-env.sh)
# 2. ECR login (server IAM roli — kalit yo'q)
# 3. 80/443 ni lg-prod'dan boshqa konteyner band qilgan bo'lsa — to'xtatiladi (o'chirilmaydi,
#    volume'lar qoladi; qo'lda ko'tarilgan eski stek uchun)
# 4. deploy.sh production (snapshot GitHub Actions'da olingan — --skip-snapshot)
# 5. /opt/lg/current → shu reliz; eski relizlar va image'lar tozalanadi (oxirgi 5 ta qoladi)
# 6. lg-monitor.timer (T-016) — har 5 daqiqada infra/scripts/monitor.sh (joriy reliz)
# ==============================================================================
set -euo pipefail

TAG="${1:?TAG}"
REGION="${2:?REGION}"
SECRET_ARN="${3:?DB owner secret ARN}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELEASE_DIR="$(cd "$HERE/../.." && pwd)"
export AWS_REGION="$REGION" AWS_DEFAULT_REGION="$REGION"
export STATE_DIR=/var/lib/lg
install -d -m 0750 "$STATE_DIR"

# Natija texnik chatga (T-016): yiqilsa — qaysi bosqichda; muvaffaqiyat — 5/6 dan keyin.
STAGE="boshlanish"
trap 'rc=$?; (( rc == 0 )) || "$HERE/notify-telegram.sh" "❌ LG prod: ${TAG} deploy yiqildi (bosqich: ${STAGE}). Tafsilot — GitHub Actions logida."' EXIT

echo "== 1/6 env"
STAGE="env"
"$HERE/render-env.sh" production /lg/prod/ "$SECRET_ARN"

echo "== 2/6 ECR login"
STAGE="ECR"
REGISTRY="$(grep -E '^LG_REGISTRY=' /etc/lg/production.env | cut -d"'" -f2)"
aws ecr get-login-password | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null
echo "ECR: ${REGISTRY}"

echo "== 3/6 port 80/443"
STAGE="port"
for id in $(docker ps -q --filter publish=80 --filter publish=443); do
  project="$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$id")"
  if [[ "$project" != "lg-prod" ]]; then
    echo "To'xtatiladi: $(docker inspect -f '{{.Name}} ({{.Config.Image}})' "$id") project='${project}'"
    docker update --restart=no "$id" >/dev/null
    docker stop "$id" >/dev/null
  fi
done

echo "== 4/6 deploy ${TAG}"
STAGE="deploy"
"$HERE/deploy.sh" production "$TAG" --skip-snapshot

echo "== 5/6 tozalash"
STAGE="tozalash"
NOTES="$("$HERE/release-notes.sh" "$RELEASE_DIR/release-log.txt" /opt/lg/current/release-log.txt || true)"
ln -sfn "$RELEASE_DIR" /opt/lg/current
"$HERE/notify-telegram.sh" "✅ LG prod: yangi versiya chiqdi (${TAG})${NOTES:+

${NOTES}}"

find /opt/lg/releases -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | tail -n +6 \
  | cut -d' ' -f2- | xargs -r rm -rf
docker image prune -af --filter "until=168h" >/dev/null || true
docker compose -p lg-prod ps --format '{{.Service}}: {{.Status}}'

echo "== 6/6 monitoring (lg-monitor.timer)"
STAGE="monitoring"
cat >/etc/systemd/system/lg-monitor.service <<'UNIT'
[Unit]
Description=Legendary Group prod monitoring (T-016)
After=docker.service

[Service]
Type=oneshot
ExecStart=/opt/lg/current/infra/scripts/monitor.sh
UNIT
cat >/etc/systemd/system/lg-monitor.timer <<'UNIT'
[Unit]
Description=Legendary Group monitoring har 5 daqiqada

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now lg-monitor.timer
