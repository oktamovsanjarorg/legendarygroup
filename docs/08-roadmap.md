# 08 — Yo'l xaritasi (Roadmap)

> Muddatlar — AI agentlar kod yozishi va 1 inson (texnik mas'ul) review qilishi hisobidan taxminiy.
> **Cheklovchi omil — kod yozish emas, review va sinov.** Har fazaga +30% zaxira qo'shing.
> F0 bilan parallel ravishda T-017a–c (UX) bajariladi — UI vazifalari undan oldin boshlanmaydi.
>
> **Strategiya:** dastur **to'liq va real ishlaydigan** holatda quriladi (F0–F5, hech qanday demo, soxta yoki
> "keyin qilamiz" qismlarsiz). Har bir funksiya prod sifatida: real to'lovlar, real xabarlar, real backup.
> v1.0 tayyor bo'lgach — **birinchi real ustoz va uning guruhlari bilan ishga tushiriladi** (T-508), keyin ustozlar soni oshiriladi.
> Har faza oxirida: staging'da real ssenariylar bo'yicha to'liq tekshiruv → loyiha egasi qabul qiladi → keyingi faza.

```
F0 Poydevor ──► F1 Asosiy jarayon ──► F2 To'lovlar ──► F3 Natijalar+hisobot ──► F4 Oylik+moliya ──► F5 Analitika+sayt ──► v1.0 ──► 🚀 Birinchi ustoz (real)
  ~1.5 hafta       ~2 hafta              ~2 hafta                              ~1.5 hafta               ~1.5 hafta           ~2 hafta
```

## F0 — Poydevor (Foundation)

**Maqsad:** bo'sh, lekin to'liq ishlaydigan "skelet": kod → test → staging'ga avtomatik deploy.

- Monorepo, linting, testlar, Docker, compose.
- AWS (Terraform): staging + prod, S3, RDS, ECR, SSM.
- CI/CD to'liq zanjiri, backup + restore drill.
- Auth (web login + 2FA, Telegram initData), RBAC skeleti, audit skeleti.
- Bot "salom" + Mini App "salom" Telegram ichida ochiladi.
- Monitoring (Sentry, loglar, uptime, alertlar).

**Natija:** `main`ga merge → 10 daqiqada staging'da. Prod muhit tayyor (bo'sh).

## F1 — Asosiy jarayon (Core operations)

- Kurs, xona, guruh, jadval, darslar generatsiyasi, bayramlar.
- O'quvchi, ota-ona, enrollment, lidlar.
- Ota-ona botda ro'yxatdan o'tishi (telefon orqali bog'lanish).
- Davomat (Mini App, offline), ota-onaga darhol xabar.
- Bildirishnomalar infratuzilmasi (navbat, shablon, rate limit, outbox).
- Mavjud ma'lumotlarni import (o'quvchilar ro'yxati Excel'dan).

**Natija:** Markaz guruhlarni va davomatni tizimda yurita oladi.

## F2 — To'lovlar (Billing)

- Ledger, invoice avto-generatsiya, chegirmalar, muzlatish, jarima qoidalari.
- Admin to'lov kiritishi, PDF chek, botga yuborish, QR tekshiruv sahifasi.
- Ota-ona o'tkazma cheki yuborishi → tasdiqlash navbati.
- Qarzdorlik, eslatmalar, kassa yopish, storno/refund.

**Natija:** to'lovlar to'liq ishlaydi (staging'da real ssenariylar bilan tekshirilgan).

## F3 — Natijalar va hisobotlar

- Baholar, ustoz izohlari, testlar, Excel import.
- Haftalik/oylik ota-ona hisobotlari (matn + PDF).
- Ommaviy e'lonlar, ota-ona murojaatlari (ticket), "sababli" oldindan xabar.

## F4 — Oylik va moliya

- Ustoz shartnomalari, oylik hisob (draft→approved→paid), avans.
- Xarajatlar, P&L.
- Audit UI, shubhali harakatlar, xodim faolligi.
- Director dashboard (asosiy KPI'lar).

## F5 — Analitika, prognoz, sayt va mustahkamlash

- Hisobotlar to'plami (daromad, aging, cohort, konversiya, ustoz samaradorligi), eksport.
- Prognozlar: tushum, churn risk, guruh to'lishi.
- Landing sayt (Astro) + lid formasi.
- Yuklama testi, xavfsizlik auditi (ASVS checklist), penetratsion test (asosiy).
- Hujjatlar: foydalanuvchi qo'llanmalari (har rol uchun), runbook'lar.

**Natija → v1.0** (barcha funksiyalar to'liq).

## 🚀 Real ishga tushirish (T-508)

- Prod'da birinchi real ustoz, uning guruh(lar)i, o'quvchilari va ota-onalari bilan to'liq ishlash.
- Real foydalanishdan chiqqan kamchiliklar darhol tuzatiladi; keyin ustozlar bosqichma-bosqich qo'shiladi.

## v2 (keyinroq)

- Click/Payme/Uzum merchant API — avtomatik to'lov.
- Ko'p filial UI.
- O'quvchi roli (o'z natijalari, uy vazifasi).
- ML asosidagi prognoz (≥ 12 oy tarix bo'lgach).
- Multi-AZ RDS, yuqori mavjudlik.
