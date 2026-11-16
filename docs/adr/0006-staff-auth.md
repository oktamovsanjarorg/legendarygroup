# ADR 0006 — Xodimlar autentifikatsiyasi (web)

- **Holat:** Qabul qilingan · 2026-11-11 (T-006)

## Qaror

1. **Kirish:** telefon + parol (Argon2id, 19 MiB / t=2 / p=1). Noma'lum telefon uchun ham
   parol tekshiruvi bajariladi va javob bir xil (`INVALID_CREDENTIALS`) — foydalanuvchi
   mavjudligi oshkor bo'lmaydi. Web'ga faqat `director`/`admin` (Q-60).
2. **2FA majburiy** (Director/Admin): parol to'g'ri bo'lsa — 5 daqiqalik `mfaToken` (JWT,
   `step`). Birinchi kirishda `totp_setup` (QR uchun `otpauth://`, sir Redis'da 10 daq kutadi),
   keyin `totp`. TOTP: SHA1/6/30 s, ±1 oyna, bitta kod ikki marta ishlamaydi (`afterCounter`).
   Sir DB'da AES-256-GCM (`TOTP_ENCRYPTION_KEY`). 10 ta zaxira kod — hash, bir martalik.
3. **Tokenlar:** access — JWT HS256, 15 daq, `{sub, role, sid, pv}`; refresh — 256 bit opaque,
   DB'da SHA-256, 30 kun, cookie `lg_rt` (httpOnly, Secure, SameSite=Strict, Path=/api/auth).
4. **Rotatsiya va o'g'irlik:** har refresh — eski qator `revoked_at` + `replaced_at`, yangi qator
   shu `family_id`da. **Almashtirilgan** token oila faolligida qayta kelsa — butun oila bekor,
   `StaffSessionReuseDetected` event (xodimga ogohlantirish), audit. Logout qilingan/bekor
   oila tokeni — oddiy "sessiya tugagan" (yolg'on alarm yo'q).
   ⇒ **Web klient (T-009) refresh'ni bitta oqimda bajaradi** (single-flight): parallel ikki
   refresh — o'g'irlik deb baholanadi.
5. **Har so'rovda tekshiruv** (global `AccessTokenGuard`, deny by default, `@Public()` istisno):
   sessiya faol, foydalanuvchi `active`, `permissions_version` mos — bloklash va ruxsat
   o'zgarishi darhol kuchga kiradi (02 §1). T-008: Redis kesh.
6. **Telegram orqali kirish** (FR-AUTH-3 muqobili): `telegram/start` (telefon) → event
   `StaffTelegramLoginRequested` → bot tugmasi (T-010/T-109) → `POST /internal/auth/telegram/confirm`
   (Telegram ID xodimniki bo'lishi shart) → `telegram/poll` (bir martalik, 5 daq). Telegram
   akkauntiga egalik — ikkinchi omil, parol so'ralmaydi.
   Xabar: `TelegramLoginNotifier` (worker) → navbat → «Tasdiqlash» (`callback_data: tgl:<id>`);
   bot `staff-login.ts` → `/internal/auth/telegram/confirm` (2026-11-16 gacha xabar umuman
   yuborilmasdi — iste'molchi yo'q edi).
   **Parol → MFA (T-122):** parol to'g'ri va Telegram ulangan bo'lsa, MFA javobida
   `telegramChallengeId` ham qaytadi va botga shu so'rov darhol ketadi. Web kod sahifasi fonda
   `telegram/poll` qiladi: kod kiritiladi **yoki** botda «Tasdiqlash» bosiladi — qaysi biri oldin.
   Ikkinchi omil Telegram'ga egalik bo'lgani uchun TOTP sozlanmagan xodim ham shu yo'l bilan
   kira oladi (TOTP sozlash majburiy emas, lekin ekranda taklif qilinadi).
7. **Taklif havolasi** (`staff_invites`, 24 soat, bir marta): parol o'rnatish → TOTP sozlash.
   Havolani T-008 (`pnpm cli director:create`) va T-101 (xodim qo'shish) yaratadi.
8. **Rate limit** (Redis): login — telefon 5/daq + IP 30/daq; TOTP — 5/daq; Telegram start — 5/daq.

9. **Mini App (T-007):** `initData` HMAC (`WebAppData` → bot token), `auth_date` ≤ 24 soat →
   sessiyasiz access token (`typ: tg`, 15 daq), har so'rovda foydalanuvchi faol, rol tayinlangan,
   `pv` mos. Rol tanlash/almashtirish — shu endpoint `role` bilan.
10. **Mini App → web panel (T-121, 2026-11-16):** Director/Admin Mini App'da (MS-01 MainButton)
    `POST auth/panel-handoff` → 256 bit kalit, Redis'da faqat SHA-256 xeshi, 60 s;
    havola `<PUBLIC_APP_URL>/handoff#t=<kalit>` (fragment — server/proksi loglariga tushmaydi,
    sahifa uni darhol manzildan oladi) `WebApp.openLink` bilan tizim brauzerida ochiladi →
    `POST auth/panel-handoff/redeem` (GETDEL — bir marta; IP 10/daq) → oddiy web sessiya
    (`auth.login`, `method: miniapp_handoff`). Ikkinchi omil — 6-banddagi kabi Telegram
    akkauntiga egalik (`initData` HMAC); kalit berilgach bloklangan/rol olingan xodimga sessiya
    berilmaydi. Teacher/Guardian — 403 (web paneli yo'q).

## Oqibatlar

- (+) Parol/2FA/sessiya bitta joyda, barcha amallar audit'da (`auth.*`).
- (−) Har so'rovda bitta DB so'rovi (sessiya + foydalanuvchi) — T-008 da kesh.
- Lokal kirish: test Direktorda parol yo'q — T-008 CLI taklif havolasi bilan o'rnatiladi.
