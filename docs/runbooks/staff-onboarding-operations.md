# Runbook: Yangi Xodim Qo'shish va Boshqarish (T-506, T-101)

Ushbu runbook o'quv markaziga yangi administratorlar va ustozlarni qo'shish, rollarni biriktirish hamda xodimlarni bloklash tartibini belgilaydi.

---

## 1. Kirish (Q-98, ADR 0006 §11)

Parol, 2FA va taklif havolasi yo'q. Hamma xodim bir xil ulanadi: Direktor raqamni kiritadi, xodim
botda **shu raqamni** ulashadi (Telegram raqamga egalikni tasdiqlaydi).

| Rol               | Kundalik ish | Web panel                                                            |
| ----------------- | ------------ | -------------------------------------------------------------------- |
| **Direktor**      | Mini App     | Mini App tugmasi yoki telefon + botda «Tasdiqlash»                   |
| **Administrator** | Mini App     | Vaqtincha bor (T-132…T-142 ekranlari Mini App'ga ko'chguncha, T-148) |
| **Ustoz**         | Mini App     | Yo'q                                                                 |

## 2. Xodim qo'shish

1. Web panel → **Xodimlar** → **«Xodim qoʻshish»** → F.I.Sh, telefon, rol → **«Qoʻshish»**.
2. Xodim botni ochadi → **Start** → **«Telefon raqamni ulashish»** → **«Ilovani ochish»**.

## 3. Kira olmasa

- **Bot raqamni tanimadi** — «Xodimlar»dagi raqam Telegramdagi raqamdan farq qiladi yoki xodim bloklangan.
- **«Boshqa profilga ulangan»** — eski Telegram ulangan: xodim kartasi → **«Telegramni uzish»**
  (sessiyalari ham yopiladi), so'ng raqamni qayta ulashadi.
- **Direktor Telegram/raqamini yo'qotdi** — serverda (bir martalik, audit bilan):
  `node dist/cli.js director:relink --current +998XXXXXXXXX --phone +998YYYYYYYYY`
  (raqam o'sha bo'lsa — ikkalasiga bir xil raqam). Keyin Direktor botda yangi raqamini ulashadi.

---

## 4. Xodimni bloklash va huquqini qaytarib olish

Agar xodim ishdan bo'shasa yoki xavfsizlik shubhasi tug'ilsa:

1. **Xodimlar** sahifasida kerakli xodim profiliga kiring.
2. **«Bloklash»** tugmasini bosing.
3. Tizim avtomatik ravishda:
   - Xodimning barcha faol JWT sessiyalarini bekor qiladi (`permissions_version + 1`).
   - Xodim ilovaga qayta kira olmaydi.
