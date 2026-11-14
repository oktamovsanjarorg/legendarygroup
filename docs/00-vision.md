# 00 — Vision (Maqsad va doira)

## 1. Muammo

O'quv markazda guruhlar, davomat, baholar, to'lovlar va ustoz oyliklari odatda Excel, daftar va
Telegram chatlarda yuritiladi. Natijada:

- to'lov qarzdorligi kech aniqlanadi, cheklar yo'qoladi;
- ota-ona farzandining davomati/natijasidan bexabar qoladi;
- direktor real vaqtdagi raqamlarni (daromad, qarz, o'quvchi oqimi) ko'ra olmaydi;
- ustoz oyligi qo'lda hisoblanadi va nizolarga sabab bo'ladi.

## 2. Maqsad

"Legendary Group" uchun **yagona, ishonchli, uzoq muddat (5+ yil) barqaror ishlaydigan** tizim:

1. Guruhlar, kurslar, xonalar va dars jadvalini boshqarish.
2. Davomat (keldi / kelmadi / kech qoldi / sababli) — ota-onaga darhol xabar.
3. Natijalar: har dars bahosi, ustoz izohi, test natijalari (Excel import).
4. Ota-onaga avtomatik haftalik/oylik hisobot.
5. To'lovlar: naqd/karta (admin kiritadi) + kartaga o'tkazma (ota-ona chek yuboradi → admin tasdiqlaydi) → PDF chek.
6. Ustoz oyligi: fiks / foiz / aralash — avtomatik hisob.
7. Administrator nazorati: audit jurnali, kim nima qildi.
8. Statistika, prognoz (daromad, qarz, o'quvchi ketishi xavfi), monitoring.

## 3. Rollar

| Rol          | Kim                     | Asosiy kanal                                            |
| ------------ | ----------------------- | ------------------------------------------------------- |
| **Director** | Markaz egasi/rahbari    | Web panel + Mini App (dashboard, tasdiqlash so'rovlari) |
| **Admin**    | Ma'mur, kassir, menejer | Web panel + Mini App (chek navbati)                     |
| **Ustoz**    | O'qituvchi              | Mini App (yagona ish joyi) + bot                        |
| **Ota-ona**  | O'quvchining vakili     | Telegram bot + Mini App                                 |

> O'quvchining o'zi alohida rol emas (v1). Kelajakda "O'quvchi" roli qo'shilishi mumkin — model bunga tayyor.

## 4. Doira (Scope)

### Kiradi (v1)

Guruh/kurs/xona/jadval, o'quvchi va ota-ona kartochkasi, davomat, baholar, test importi,
to'lovlar va cheklar, qarzdorlik, ustoz oyligi, xarajatlar, hisobotlar, bildirishnomalar,
statistika, audit, backup, monitoring.

### Kirmaydi (v1)

- Online to'lov API (Click/Payme/Uzum merchant) — v2 (model tayyorlanadi).
- Ko'p filial UI — v2 (DB'da `branch_id` bor).
- SMS — kerak emas (faqat Telegram).
- Online dars (video), LMS kontent.
- Mobil native ilova — Mini App yetarli.

## 5. Sifat talablari (Non-functional)

| Talab              | Maqsad                                                                       |
| ------------------ | ---------------------------------------------------------------------------- |
| Mavjudlik (uptime) | ≥ 99.5% oylik                                                                |
| Javob vaqti        | API p95 < 300 ms; Mini App birinchi ochilish < 2 s (4G)                      |
| Ma'lumot yo'qotish | RPO ≤ 5 daqiqa (PITR), RTO ≤ 1 soat                                          |
| Backup             | Har kuni S3 ga, 35 kun + oylik 1 yil saqlash; har oy tiklash sinovi (06 §5)  |
| Xavfsizlik         | RBAC, audit jurnali, shifrlash (transit + at rest), 2FA Director/Admin uchun |
| Qo'llab-quvvatlash | Kod 80%+ test bilan qoplangan (`packages/domain` 95%+) — 07 §1               |
| UX                 | "Native" his: Telegram temasi, haptic, tez, offline'ga chidamli davomat      |

## 6. Muvaffaqiyat mezonlari

- Admin to'lov kiritish + chek yuborish ≤ 30 soniya.
- Ustoz 20 kishilik guruh davomatini ≤ 20 soniyada belgilaydi.
- Ota-ona "kelmadi" xabarini ≤ 5 daqiqada oladi (3 daqiqa — ustoz uchun tuzatish oynasi, BR-31).
- Oy oxirida ustoz oyliklari 1 tugma bilan hisoblanadi.
- Director bosh sahifada bugungi daromad, qarz, davomat %ni ko'radi.
