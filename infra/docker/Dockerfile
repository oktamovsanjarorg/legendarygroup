# syntax=docker/dockerfile:1.7
# Legendary Group — barcha image'lar bitta multi-stage fayldan (T-011, 06 §3).
# Targetlar: api, worker, bot (Node), web (Caddy + web/miniapp statik).
#   docker buildx build -f infra/docker/Dockerfile --target api --platform linux/arm64,linux/amd64 .
# Runtime: node:*-slim, root emas (`node`), faqat prod dependency'lar, HEALTHCHECK.

ARG NODE_IMAGE=node:26.11.1-slim
ARG CADDY_IMAGE=caddy:2.10.2-alpine

# ---------- deps: lockfile bo'yicha paketlarni yuklash (kod o'zgarsa ham kesh saqlanadi) ----------
# Cross-build: deps/build har doim build mashinasi arxitekturasida (BUILDPLATFORM) ishlaydi —
# QEMU emulyatsiyasi kerak emas. Native paketlar (sharp) TARGETARCH uchun tanlanadi; runtime
# bosqichlarida RUN yo'q (faqat COPY), shuning uchun ular ham emulyatsiyasiz quriladi.
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS deps
ARG TARGETARCH
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN npm install -g pnpm@12.17.0 && npm cache clean --force
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN case "$TARGETARCH" in amd64) cpu=x64 ;; arm64) cpu=arm64 ;; *) echo "TARGETARCH: $TARGETARCH" >&2; exit 1 ;; esac \
 && printf '\nsupportedArchitectures:\n  os: [linux]\n  cpu: [%s]\n  libc: [glibc]\n' "$cpu" >> pnpm-workspace.yaml \
 && cp pnpm-workspace.yaml /tmp/pnpm-workspace.target.yaml
RUN --mount=type=cache,id=lg-pnpm-$TARGETARCH,target=/pnpm/store pnpm fetch --frozen-lockfile

# ---------- build: o'rnatish (offline), qurish, har ilova uchun prod to'plam ----------
FROM deps AS build
COPY . .
# Kontekstdagi pnpm-workspace.yaml arxitekturasiz — deps bosqichidagi nusxa qaytariladi.
RUN cp /tmp/pnpm-workspace.target.yaml pnpm-workspace.yaml
RUN --mount=type=cache,id=lg-pnpm-$TARGETARCH,target=/pnpm/store pnpm install --frozen-lockfile --offline
RUN pnpm turbo build \
      --filter=@lg/api... --filter=@lg/worker... --filter=@lg/bot... \
      --filter=@lg/web... --filter=@lg/miniapp...
RUN --mount=type=cache,id=lg-pnpm-$TARGETARCH,target=/pnpm/store \
    pnpm --filter=@lg/api deploy --prod --legacy /out/api \
 && pnpm --filter=@lg/worker deploy --prod --legacy /out/worker \
 && pnpm --filter=@lg/bot deploy --prod --legacy /out/bot

# ---------- Node runtime asosi ----------
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Kod root'ga tegishli va faqat o'qiladi; jarayon — `node` (uid 1000).
USER node

FROM runtime AS api
COPY --from=build /out/api /app
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health/live').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "dist/main.js"]

FROM runtime AS worker
COPY --from=build /out/worker /app
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3001/health/live').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "dist/main.js"]

FROM runtime AS bot
COPY --from=build /out/bot /app
EXPOSE 3002
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3002/health/live').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "dist/main.js"]

# ---------- web: Caddy (TLS, marshrutlar) + web panel va Mini App statik fayllari ----------
# RUN yo'q (arm64 uchun ham emulyatsiyasiz). Root emas: Docker konteynerlarida 80/443 ni oddiy
# foydalanuvchi ham ochadi (`net.ipv4.ip_unprivileged_port_start=0`, Docker ≥ 20.10).
FROM --platform=$BUILDPLATFORM busybox:1.37 AS caddy-dirs
RUN mkdir -p /out/data /out/config

FROM ${CADDY_IMAGE} AS web
COPY infra/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/web/dist /srv/web
COPY --from=build /repo/apps/miniapp/dist /srv/miniapp
COPY --from=caddy-dirs --chown=1000:1000 /out/data /data
COPY --from=caddy-dirs --chown=1000:1000 /out/config /config
ENV XDG_DATA_HOME=/data XDG_CONFIG_HOME=/config
USER 1000:1000
EXPOSE 80 443 443/udp
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
