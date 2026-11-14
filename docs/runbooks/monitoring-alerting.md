# Runbook: Monitoring va Alertlar (T-016, 06 §6)

Ushbu runbook Legendary Group tizimining barcha qatlamlarida (API, Worker, Bot, Web, Mini App, DB, Redis) monitoring, metrikalar yig'ish va texnik Telegram guruhiga ogohlantirish (alert) yuborish tartibini belgilaydi.

---

## 1. Monitoring arxitekturasi va vositalari

| Qatlam         | Vosita                                                             | Maqsad                                            |
| -------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| **Metrikalar** | Prometheus OpenMetrics (`GET /api/health/metrics`) → Grafana Cloud | RPS, p95 latentsiya, DB/Redis holati, navbatlar   |
| **Xatolar**    | Sentry (release tegi va source map'lar bilan)                      | 5xx xatoliklar, brauzer va Telegram xatolari      |
| **Loglar**     | Pino JSON → Grafana Alloy → Grafana Cloud Loki                     | Strukturali qidiruv, audit va xatolik stack trace |
| **Alertlar**   | `scripts/monitor-health-alerts.sh` → Telegram bot                  | Texnik guruhga kritik xabarlar                    |
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

## 4. Cron monitoring konfiguratsiyasi

Serverda har 5 daqiqada avtomatik tekshiruv:

```crontab
*/5 * * * * /srv/lg/scripts/monitor-health-alerts.sh >> /var/log/lg/monitor.log 2>&1
```
