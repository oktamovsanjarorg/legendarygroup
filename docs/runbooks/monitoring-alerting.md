# Runbook: Monitoring va Alertlar (T-016, 06 §6)

Ushbu runbook Legendary Group tizimining barcha qatlamlarida (API, Worker, Bot, Web, Mini App, DB, Redis) monitoring, metrikalar yig'ish va texnik Telegram guruhiga ogohlantirish (alert) yuborish tartibini belgilaydi.

---

## 1. Monitoring arxitekturasi va vositalari

| Qatlam         | Vosita                                                             | Maqsad                                            |
| -------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| **Metrikalar** | Prometheus OpenMetrics (`GET /api/health/metrics`) → Grafana Cloud | RPS, p95 latentsiya, DB/Redis holati, navbatlar   |
| **Xatolar**    | Sentry (release tegi va source map'lar bilan)                      | 5xx xatoliklar, brauzer va Telegram xatolari      |
| **Loglar**     | Pino JSON → Grafana Alloy → Grafana Cloud Loki                     | Strukturali qidiruv, audit va xatolik stack trace |
| **Alertlar**   | `infra/scripts/monitor.sh` (prod, systemd timer) → Telegram bot    | Texnik chatga kritik xabarlar                     |
| **Uptime**     | Grafana Synthetic / tashqi UptimeRobot (har 1 daq)                 | `/api/health/ready` va bot webhook tekshiruvi     |

---

## 2. Metrikalar endpointi (`/api/health/metrics`)

API har qanday Prometheus/OpenMetrics qabul qiluvchi vosita uchun quyidagi asosiy ko'rsatkichlarni taqdim etadi:

- `process_uptime_seconds` — API jarayoni ish vaqti (soniya)
- `process_heap_used_bytes`, `process_heap_total_bytes`, `process_rss_bytes` — Node.js xotira bandligi
- `service_database_up` — PostgreSQL bazasi holati (1 — sog'lom, 0 — uzilgan)
- `service_redis_up` — Redis ulanishi holati (1 — sog'lom, 0 — uzilgan)
- `business_pending_submissions` — Tekshiruv kutayotgan to'lov cheklari soni
- `business_pending_guardians` — Tasdiq kutayotgan ota-ona arizalari soni

---

## 3. Texnik Telegram guruhiga Alert qoidalari (06 §6)

Quyidagi hodisalar yuz berganda darhol Telegram guruhiga bildirishnoma yuboriladi:

1. **API Health-check ketma-ket 2 marta muvaffaqiyatsiz bo'lsa:** darhol CRITICAL alert.
2. **Server diski bandligi > 80%:** WARNING alert.
3. **Database yoki Redis ulanishi uzilsa:** CRITICAL alert.
4. **BullMQ navbatlarida xatoliklar (failed jobs > 10 / soat):** WARNING alert.
5. **Zaxira nusxa (backup) yoki oylik restore drill muvaffaqiyatsiz bo'lsa:** CRITICAL alert.
6. **Oylik hisob-kitob (invoice) cron ishlamay qolsa (oyning 1-sanasi 01:00 gacha):** CRITICAL alert.

### Qo'lda alert yuborishni sinash:

```bash
./scripts/send-telegram-alert.sh INFO "Test" "Monitoring tizimi muvaffaqiyatli ishga tushirildi"
```

---

## 4. Prod'da ishga tushirish (systemd timer)

Prod serverda cron yo'q (Amazon Linux 2023). `infra/scripts/remote-deploy.sh` har deploy'da
`lg-monitor.service` + `lg-monitor.timer` ni o'rnatadi: har 5 daqiqada
`/opt/lg/current/infra/scripts/monitor.sh`.

- Deploy xabari (2026-11-16): `remote-deploy.sh` shu chatga «✅ yangi versiya chiqdi (<teg>)» va
  oldingi relizdan beri commit sarlavhalari (`release-log.txt`, ko'pi bilan 15 ta) yuboradi;
  yiqilsa — «❌ … deploy yiqildi (bosqich: …)». Skriptlar: `notify-telegram.sh`, `release-notes.sh`.
- `migrate` — bir martalik servis: `Exited (0)` alert emas, faqat nol bo'lmagan kod.
- Tekshiruvlar: tashqi `https://<APP_DOMAIN>/api/health/ready` (2 marta ketma-ket yiqilsa), disk > 80%,
  `lg-prod` konteynerlari `running` emas.
- API: 5xx > 2% va p95 > 1 s — oxirgi 5 daqiqa (kamida 20 so'rov), `infra/scripts/api-stats.py`
  API pino loglaridan (`/api/health/*` hisobga olinmaydi).
- Bir xil alert ko'pi bilan soatiga bir marta; tiklanganda "✅ tiklandi".
- Chat: SSM `/lg/prod/ALERTS_TELEGRAM_CHAT_ID` (ixtiyoriy; yo'q bo'lsa faqat jurnal). Bot — asosiy bot tokeni.
- Jurnal: `journalctl -u lg-monitor --since -1h`; holat: `systemctl list-timers lg-monitor.timer`.
- Lokal/staging uchun eski `scripts/monitor-health-alerts.sh` qoladi.
