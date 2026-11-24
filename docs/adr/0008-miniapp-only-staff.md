# ADR 0008 — Barcha xodim ishi Mini App'da

- **Holat:** Qabul qilingan · 2026-11-24 (Q-99, egasining qarori)
- **O'rnini bosadi:** 11-ux §2 dagi «Faqat web'da qoladi» ro'yxati (2026-11-22)

## Kontekst

Kundalik ish Mini App'da, sozlash va tahlil web'da edi. Direktor ikki joy orasida yuradi, bitta
amal ikki xil ekranda ikki marta yoziladi va mantiq farqlanadi. Kirish ham allaqachon faqat Telegram (ADR 0006 §11).

## Qaror

1. **Director va Admin'ning hamma ishi Mini App'da** — sozlash, oylik, hisobot, xodimlar, audit ham.
   Yangi web ekran qurilmaydi, mavjudiga faqat xato tuzatiladi.
2. **Web panel tenglik (parity) bo'yicha yopiladi, birdan emas:** ekran Mini App'da tayyor bo'lguncha web'dagisi
   ishlaydi. Hamma qator ✅ bo'lgach — T-148. Ommaviy sahifalar (`/verify/<token>`, sayt) qoladi.
3. **Ekranni ko'chirish = mantiqni qayta tekshirish.** Har vazifa tartibi:
   1. endpoint va servis BR/FR bilan solishtiriladi; 2) topilgan har xato — avval qizil test;
   2. tuzatish; 4) ekran. Mantiq ekranda emas, API/`packages/domain`da.
4. **Katta jadval telefonga siqilmaydi:** ro'yxat + filtr + tafsilot ekrani. Telegram Desktop'da
   shu ekran kengroq ko'rinadi (bitta kod, T-164).
5. **Fayl (Excel/PDF) — bot chatiga yuboriladi** (`notifications` navbati orqali, T-158): WebView
   yuklab olishi qurilmaga bog'liq, chatdagi fayl esa doim qoladi va ulashish oson.
6. **Xavfli amal** (storno, refund, oylik tasdiq, bloklash, ruxsat) — tasdiqlash oynasi; summa, kim va oqibat
   ko'rinadi. Server ruxsati o'zgarmaydi: ekran yashirish himoya emas.

## Oqibatlar

- (+) Bitta interfeys, bitta kirish, bitta qoida; telefon va kompyuterda bir xil.
- (−) Telegram ishlamasa xodim ishlay olmaydi. Favqulodda — CLI va ma'lumotlar zaxirasi (T-015).
- (−) Ko'p ustunli taqqoslash noqulayroq — shu ish uchun Excel eksport (§5).
