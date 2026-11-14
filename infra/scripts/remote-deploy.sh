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

echo "== 1/5 env"
"$HERE/render-env.sh" production /lg/prod/ "$SECRET_ARN"

echo "== 2/5 ECR login"
REGISTRY="$(grep -E '^LG_REGISTRY=' /etc/lg/production.env | cut -d"'" -f2)"
aws ecr get-login-password | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null
echo "ECR: ${REGISTRY}"

echo "== 3/5 port 80/443"
for id in $(docker ps -q --filter publish=80 --filter publish=443); do
  project="$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$id")"
  if [[ "$project" != "lg-prod" ]]; then
    echo "To'xtatiladi: $(docker inspect -f '{{.Name}} ({{.Config.Image}})' "$id") project='${project}'"
    docker update --restart=no "$id" >/dev/null
    docker stop "$id" >/dev/null
  fi
done

echo "== 4/5 deploy ${TAG}"
"$HERE/deploy.sh" production "$TAG" --skip-snapshot

echo "== 5/5 tozalash"
ln -sfn "$RELEASE_DIR" /opt/lg/current
find /opt/lg/releases -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | tail -n +6 \
  | cut -d' ' -f2- | xargs -r rm -rf
docker image prune -af --filter "until=168h" >/dev/null || true
docker compose -p lg-prod ps --format '{{.Service}}: {{.Status}}'
