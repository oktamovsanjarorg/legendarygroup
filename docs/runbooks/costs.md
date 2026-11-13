# Narx hisobi — production (T-012)

> **Taxminiy** — AWS ochiq on-demand narxlari, eu-central-1 (Frankfurt), oyiga 730 soat.
> `mycli` IAM foydalanuvchisida `pricing:GetProducts` ruxsati yo'q, shuning uchun API'dan
> tekshirilmagan; `apply`dan keyin birinchi oy Cost Explorer'da solishtiriladi.
> Staging — AWS'da yo'q (egasi qarori, 2026-11-13): lokal `compose.staging.yml`.

| Resurs                           | Hajm                       | Narx (taxm.)          | Oyiga       |
| -------------------------------- | -------------------------- | --------------------- | ----------- |
| EC2 `t4g.medium` (ilova)         | 2 vCPU, 4 GB, arm64        | ~$0.038/soat          | ~$28        |
| EBS gp3 (server diski)           | 40 GB, shifrlangan         | ~$0.095/GB            | ~$4         |
| Ommaviy IPv4 (Elastic IP)        | 1 ta                       | $0.005/soat           | ~$3.7       |
| RDS PostgreSQL `db.t4g.small`    | Single-AZ                  | ~$0.037/soat          | ~$27        |
| RDS gp3                          | 20 GB (avto 100 GB gacha)  | ~$0.137/GB            | ~$2.7       |
| RDS backup (PITR 14 kun)         | baza hajmigacha bepul      | —                     | ~$0–1       |
| KMS kalit                        | 1 ta                       | $1                    | $1          |
| Secrets Manager (RDS master)     | 1 ta                       | $0.40                 | $0.4        |
| S3 (fayllar, backup, CloudTrail) | dastlab < 20 GB            | ~$0.024/GB + so'rov   | ~$1–2       |
| ECR (image'lar)                  | ≤ 30 × 4 repo, ~3 GB       | $0.10/GB              | ~$0.3       |
| CloudTrail                       | birinchi trail (boshqaruv) | bepul                 | $0          |
| Trafik (chiqish)                 | dastlab < 100 GB           | birinchi 100 GB bepul | ~$0         |
| **Jami**                         |                            |                       | **~$68–72** |

Arzonlashtirish (barqaror yuklamadan keyin): 1 yillik Savings Plan / RDS Reserved — ~30–40% tejash.
Byudjet ogohlantirishi: `budget_monthly_usd` va `budget_email` (`prod.tfvars`) berilsa yoqiladi.
