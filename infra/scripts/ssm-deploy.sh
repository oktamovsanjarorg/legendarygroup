#!/usr/bin/env bash
# ==============================================================================
# Legendary Group — GitHub Actions'dan serverga deploy (T-014). Runner'da ishlaydi.
#
#   ssm-deploy.sh <INSTANCE_ID> <TAG> <REGION> <DB_OWNER_SECRET_ARN>
#
# Reliz to'plami (compose.prod.yml + infra/scripts) tar.gz → base64 holida SSM Run Command'ga
# qo'shiladi — serverga git/kalit kerak emas. Serverda /opt/lg/releases/<TAG> ga ochiladi va
# remote-deploy.sh ishga tushadi. Natija (stdout/stderr) shu yerda chiqadi; xato — exit 1.
# ==============================================================================
set -euo pipefail

INSTANCE="${1:?INSTANCE_ID}"
TAG="${2:?TAG}"
REGION="${3:?REGION}"
SECRET_ARN="${4:?DB owner secret ARN}"
[[ "$TAG" =~ ^[A-Za-z0-9._-]{1,100}$ ]] || { echo "Yaroqsiz teg: $TAG" >&2; exit 1; }

# Reliz yozuvlari: "<sha> <sarlavha>" (eng yangisi birinchi) — server oldingi relizdan beri
# qo'shilganlarini Telegram'ga yuboradi (remote-deploy.sh, notify-telegram.sh).
git log --format='%H %s' -n 100 > release-log.txt
BUNDLE="$(tar -czf - compose.prod.yml infra/scripts release-log.txt | base64 -w0)"
rm -f release-log.txt
if (( ${#BUNDLE} > 40000 )); then
  echo "XATO: reliz to'plami juda katta (${#BUNDLE} bayt, SSM chegarasi)" >&2
  exit 1
fi

DIR="/opt/lg/releases/${TAG}"
PARAMS="$(jq -n --arg b "$BUNDLE" --arg d "$DIR" --arg t "$TAG" --arg r "$REGION" --arg s "$SECRET_ARN" '{
  commands: [
    "set -euo pipefail",
    "rm -rf \($d) && mkdir -p \($d)",
    "echo \($b) | base64 -d | tar -xz -C \($d)",
    "\($d)/infra/scripts/remote-deploy.sh \($t) \($r) \($s)"
  ],
  executionTimeout: ["1500"]
}')"

CMD_ID="$(aws ssm send-command --region "$REGION" --instance-ids "$INSTANCE" \
  --document-name AWS-RunShellScript --comment "lg deploy ${TAG}" \
  --parameters "$PARAMS" --timeout-seconds 600 --query Command.CommandId --output text)"
echo "SSM buyruq: ${CMD_ID}"

status=Pending
for _ in $(seq 1 300); do
  status="$(aws ssm get-command-invocation --region "$REGION" --command-id "$CMD_ID" \
    --instance-id "$INSTANCE" --query Status --output text 2>/dev/null || echo Pending)"
  case "$status" in Success|Failed|Cancelled|TimedOut|Undeliverable|Terminated) break ;; esac
  sleep 5
done

out() {
  aws ssm get-command-invocation --region "$REGION" --command-id "$CMD_ID" \
    --instance-id "$INSTANCE" --query "$1" --output text
}
echo "::group::Server stdout"; out StandardOutputContent; echo "::endgroup::"
echo "::group::Server stderr"; out StandardErrorContent; echo "::endgroup::"
echo "Holat: ${status}"
[[ "$status" == "Success" ]]
