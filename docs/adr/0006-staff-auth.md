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
7. **Taklif havolasi** (`staff_invites`, 24 soat, bir marta): parol o'rnatish → TOTP sozlash.
   Havolani T-008 (`pnpm cli director:create`) va T-101 (xodim qo'shish) yaratadi.
8. **Rate limit** (Redis): login — telefon 5/daq + IP 30/daq; TOTP — 5/daq; Telegram start — 5/daq.

## Oqibatlar

- (+) Parol/2FA/sessiya bitta joyda, barcha amallar audit'da (`auth.*`).
- (−) Har so'rovda bitta DB so'rovi (sessiya + foydalanuvchi) — T-008 da kesh.
- Lokal kirish: test Direktorda parol yo'q — T-008 CLI taklif havolasi bilan o'rnatiladi.
