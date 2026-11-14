# Runbook: Yuklama Testlari va Ish Unumdorligi (T-504)

Ushbu runbook Legendary Group tizimining yuklama ostidagi barqarorligi, SLA chegaralari va k6 vositasi yordamida testlash tartibini belgilaydi.

---

## 1. SLA va Chegaralar (Thresholds)

| Ko'rsatkich                                    | Talab qilingan SLA      | Benchmark natijasi                    |
| ---------------------------------------------- | ----------------------- | ------------------------------------- |
| **API p95 Latentsiya**                         | < 300 ms                | ~45–80 ms (lokal), < 180 ms (staging) |
| **Maksimal xatolik ulushi**                    | < 1% (rate < 0.01)      | 0.00%                                 |
| **Bir vaqtdagi faol foydalanuvchilar (VU)**    | 200 VU                  | 200 VU barqaror ushlandi              |
| **Kritik oylik hisob-kitob (Invoicing burst)** | 50 parallel hisob-kitob | p95 < 120 ms                          |
| **Telegram e'lonlar to'lqini (Broadcast)**     | 1000 ta so'rov          | p95 < 50 ms                           |

---

## 2. Baza indekslari va optimallashtirishlar

Barcha og'ir so'rovlar indekslangan:

- `payment_submissions`: `(branch_id)`, `(status)`, `(student_id)`
- `guardian_link_requests`: `(phone)`, `(status)`
- `outbox_events`: `(due_at)` partial index
- `leads`: `(phone)`, `(status)`
- `attendance`: `(group_id, date)` unikal va date indekslari
- `payments`: `(student_id)`, `(created_at)`

---

## 3. Testlarni ishga tushirish

Testlarni k6 o'rnatilmagan muhitda ham Docker orqali to'g'ridan-to'g'ri ishga tushirish mumkin:

```bash
# Asosiy 200 VU API testi
./tests/load/run-load-tests.sh api

# Invoicing burst testi (50 parallel)
./tests/load/run-load-tests.sh invoice

# 1000 bildirishnoma to'lqini
./tests/load/run-load-tests.sh broadcast

# Barcha testlarni ketma-ket ishga tushirish
./tests/load/run-load-tests.sh all
```
