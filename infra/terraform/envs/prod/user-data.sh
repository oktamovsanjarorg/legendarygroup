#!/bin/bash
# Birinchi ishga tushish: Docker + Compose, avtomatik xavfsizlik yangilanishlari (06 §6).
# Ilova fayllari va sirlar deploy bosqichida keladi (T-014: SSM → /etc/lg/prod.env).
set -euo pipefail

dnf -y upgrade --security
dnf -y install docker dnf-automatic
systemctl enable --now docker

# Compose plagini — qotirilgan versiya, arxitekturaga mos.
COMPOSE_VERSION=v2.40.3
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL -o /usr/local/lib/docker/cli-plugins/docker-compose \
  "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-$(uname -m)"
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Faqat xavfsizlik yangilanishlari, avtomatik qo'llanadi.
sed -i 's/^upgrade_type.*/upgrade_type = security/; s/^apply_updates.*/apply_updates = yes/' /etc/dnf/automatic.conf
systemctl enable --now dnf-automatic.timer

install -d -m 0750 /opt/lg /etc/lg
