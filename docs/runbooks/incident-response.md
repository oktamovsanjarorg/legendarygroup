# Runbook: Insidentlarga Javob Berish (Incident Response) (T-506)

Ushbu runbook tizimda nosozliklar, buzilishlar yoki xavfsizlik hodisalari yuz berganda harakat qilish tartibini belgilaydi.

---

## 1. Insident darajalari (Severity Levels)

| Daraja             | Ta'rifi                                                                                                      | Reaksiya vaqti | Mas'ul                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------ | -------------- | ------------------------------ |
| **Sev-1 (Kritik)** | Barcha servislar yoki DB uzilgan; to'lovlar/cheklar qabul qilinmayapti; xavfsizlik buzilishi.                | < 15 daqiqa    | Barcha texnik guruh + Director |
| **Sev-2 (Yuqori)** | Asosiy funksiyalardan biri (masalan, davomat yoki Telegram bot) ishlamayapti, vaqtinchalik aylanma yo'l bor. | < 1 soat       | Backend / DevOps muhandis      |
| **Sev-3 (Past)**   | Vizual xatoliklar, noaniq matnlar, ikkinchi darajali funksiyalar sekinlashishi.                              | 1 ish kuni     | Navbatchi dasturchi            |

---

## 2. Harakatlar rejasi (Action Plan)

### 1-qadam: Triage va holatni baholash

1. Alert xabarini o'rganing (Telegram texnik guruhi yoki Sentry).
2. Servislar sog'lomligini tekshiring:
   ```bash
   curl -s http://localhost:3000/api/health/ready
   docker compose ps
   ```
3. Oxirgi xatolik loglarini ko'ring:
   ```bash
   docker compose logs --tail 100 api
   docker compose logs --tail 50 worker
   ```

### 2-qadam: Tezkor bartaraf etish (Mitigation)

- **Agar yangi relizdan keyin buzilgan bo'lsa:** darhol bitta buyruqli rollback bajaring:
  ```bash
  ./infra/scripts/rollback.sh production
  ```
- **Agar baza lock bo'lib qolgan bo'lsa:** qulflagan so'rovni bekor qiling (`pg_terminate_backend`).
- **Agar konteyner xotiradan to'lgan bo'lsa (OOM):** servisni qayta ishga tushiring:
  ```bash
  docker compose restart api worker
  ```

### 3-qadam: Postmortem

Insident bartaraf etilgach, 24 soat ichida quyidagi shablon bo'yicha postmortem yoziladi:

- **Hodisa vaqti va davomiyligi:**
- **Foydalanuvchilarga ta'siri:**
- **Asosiy sabab (Root Cause):**
- **Qanday bartaraf etildi:**
- **Kelajakda takrorlanmasligi uchun profilaktik choralar:**
