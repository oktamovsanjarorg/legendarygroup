# ADR 0003 — Bitta EC2 + Docker Compose, boshqariladigan RDS

- **Holat:** Qabul qilingan · 2026-11-10

## Kontekst

1 filial, past yuklama, cheklangan byudjet, lekin yuqori ishonchlilik va ma'lumot xavfsizligi talab qilinadi.

## Qaror

- Har muhit uchun bitta Graviton EC2, Docker Compose (caddy, api, worker, bot, redis).
- Prod DB — **RDS PostgreSQL** (PITR, shifrlash, avtomatik backup) + kunlik pg_dump S3 Object Lock'ga.
- IaC — OpenTofu/Terraform; deploy — GitHub Actions OIDC + SSM.

## Muqobillar

- _ECS Fargate / EKS_ — ortiqcha narx va murakkablik hozircha.
- _DB ham konteynerda (prod)_ — arzon, lekin backup/PITR mas'uliyati bizda; ma'lumot eng qimmatli aktiv.

## Oqibatlar

- (+) Oddiy, arzon (~$70–110/oy), tushunarli.
- (+) Server yo'qolsa Terraform + ECR image'lar bilan ~30 daqiqada qayta tiklanadi; ma'lumot RDS'da.
- (−) Ilova qatlami bitta nuqtada (SPOF) — 99.5% maqsad uchun yetarli; o'sganda ALB + ASG yoki ECS'ga o'tiladi.
- (+) Docker + Terraform tufayli boshqa hostingga ko'chirish oson (vendor lock-in minimal).
