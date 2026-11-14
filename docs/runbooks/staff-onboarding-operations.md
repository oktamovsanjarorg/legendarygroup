# Runbook: Yangi Xodim Qo'shish va Boshqarish (T-506, T-101)

Ushbu runbook o'quv markaziga yangi administratorlar va ustozlarni qo'shish, rollarni biriktirish hamda xodimlarni bloklash tartibini belgilaydi.

---

## 1. Xodim turlari va taklif mexanizmi

| Rol                 | Kirish kanali        | Taklif mexanizmi                                    | Autentifikatsiya                  |
| ------------------- | -------------------- | --------------------------------------------------- | --------------------------------- |
| **Administrator**   | Web boshqaruv paneli | Bir martalik maxfiy havola (`/invite/<token>`)      | Login + Parol + 2FA TOTP          |
| **Ustoz (Teacher)** | Telegram Mini App    | Telegram bot taklif havolasi (`/start inv_<token>`) | Faqat Telegram akkaunt (parolsiz) |

---

## 2. Yangi Administrator qo'shish (Director tomonidan)

1. Web boshqaruv panelida **Xodimlar** (`/staff`) sahifasiga kiring.
2. **«Xodim qoʻshish»** tugmasini bosing.
3. Ism-sharif, telefon raqami (`+998XXXXXXXXX`) va **Admin** rolini tanlang.
4. Generatsiya qilingan taklif havolasidan nusxa oling (xavfsizlik sababli u faqat bir marta ko'rsatiladi).
5. Havolani yangi administratorga shaxsan yetkazing.
6. Administrator havola orqali kirib, o'z parolini o'rnatadi va Google Authenticator (TOTP) orqali 2FA ni ulaydi.

---

## 3. Yangi Ustoz qo'shish

1. **Xodimlar** sahifasida **«Xodim qoʻshish»** tugmasini bosing.
2. Ism-sharif, telefon raqami va **Ustoz** rolini tanlang.
3. Bot taklif havolasi paydo bo'ladi: `https://t.me/legendary_group_bot?start=inv_<token>`.
4. Havola ustozga yuboriladi. Ustoz Telegramda ushbu havolani bosganda, bot uning ismini aytib kutib oladi va **«Telefon raqamni ulashish»** tugmasini chiqaradi.
5. Ustoz tugmani bosgach, uning `telegram_id` raqami bazaga bog'lanadi va u Mini App'da o'z darslari hamda guruhlarini ko'ra boshlaydi.

---

## 4. Xodimni bloklash va huquqini qaytarib olish

Agar xodim ishdan bo'shasa yoki xavfsizlik shubhasi tug'ilsa:

1. **Xodimlar** sahifasida kerakli xodim profiliga kiring.
2. **«Bloklash»** tugmasini bosing.
3. Tizim avtomatik ravishda:
   - Xodimning barcha faol JWT sessiyalarini bekor qiladi (`permissions_version + 1`).
   - Xodim ilovaga qayta kira olmaydi.
