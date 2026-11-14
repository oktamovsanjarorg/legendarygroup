# OWASP ASVS v4.0 Level 2 Xavfsizlik Checklisti (T-505)

Ushbu hujjat Legendary Group o'quv markazi CRM platformasining **OWASP Application Security Verification Standard (ASVS) 4.0 Level 2** talablariga muvofiqligini tasdiqlaydi.

---

## 1. Muvofiqlik xulosasi

| Bob     | ASVS yo'nalishi                             | Holat     | Amaldagi himoya choralari                                                                                                    |
| ------- | ------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **V1**  | Arxitektura va tahdidlarni modellashtirish  | ✅ O'tgan | Yupqa bot qatlami, modulli monolit, transactional outbox, Caddy TLS                                                          |
| **V2**  | Autentifikatsiya                            | ✅ O'tgan | Argon2id parollar, 2FA TOTP (Admin/Director), 5/daq limit, Telegram HMAC                                                     |
| **V3**  | Sessiyalarni boshqarish                     | ✅ O'tgan | 15 daqiqalik JWT access token, sessiya o'g'irlanishini aniqlash, initData replay himoyasi                                    |
| **V4**  | Kirishni boshqarish (Access Control & IDOR) | ✅ O'tgan | `@RequirePermission` dekoratorlari, scope tekshiruvi (ota-ona faqat o'z farzandi ma'lumotlarini ko'radi — 404 IDOR himoyasi) |
| **V5**  | Validatsiya va sanitarizatsiya              | ✅ O'tgan | Zod qat'iy sxemalari, Drizzle parametrli so'rovlari (SQLi yo'q), HTML escape                                                 |
| **V6**  | Kriptografiya                               | ✅ O'tgan | AES-256-GCM (TOTP sirli kalitlari), Argon2id, SHA-256 zaxira xeshlari                                                        |
| **V7**  | Xatoliklarni qayta ishlash va loglar        | ✅ O'tgan | Yagona xato formati (ichki stack trace chiqmaydi), PII maskalash (`+99890***4567`)                                           |
| **V8**  | Ma'lumotlar yaxlitligi                      | ✅ O'tgan | Baza darajasidagi `forbid_mutation()` triggeri, `lg_app` kam huquqli DB roli                                                 |
| **V9**  | Tarmoq xavfsizligi                          | ✅ O'tgan | Caddy TLS avtomat, HSTS, CSP (Telegram iframe), ichki tarmoq izolyatsiyasi                                                   |
| **V10** | Ta'minot zanjiri (Supply Chain)             | ✅ O'tgan | pnpm `minimumReleaseAge: 10080` (7 kun), Trivy container scan, CodeQL                                                        |
| **V11** | Biznes mantiq xavfsizligi                   | ✅ O'tgan | O'zgarmas buxgalteriya ledger, parallel chek tasdiqlashda optimistic lock                                                    |
| **V12** | Fayllar va S3 xavfsizligi                   | ✅ O'tgan | Magic bytes tekshiruvi, Sharp orqali EXIF tozalash va qayta kodlash, 10MB limit                                              |
| **V13** | API xavfsizligi                             | ✅ O'tgan | Rate limiting (100/daq), qat'iy CORS oq ro'yxati, prod'da Swagger docs yopiq                                                 |
| **V14** | Konfiguratsiya                              | ✅ O'tgan | Standartsiz env tekshiruvi (Zod), Caddy admin API o'chiq, Docker non-root                                                    |

---

## 2. IDOR Tekshiruvlari Natijasi (Har rol uchun)

Tizimdagi barcha nozik ob'ektlar (davomat, to'lovlar, cheklar, baholar, testlar) har bir so'rovda foydalanuvchi roli va unga biriktirilgan sub'ektlar (farzandlar, guruhlar) bo'yicha qat'iy filtrlanadi:

1. **Ota-ona (Guardian):**
   - Begona o'quvchi davomatini so'raganda: `404 NOT_FOUND` (`attendance.int.test.ts`)
   - Begona o'quvchi uchun to'lov cheki yuborganda: `404 NOT_FOUND` (`submissions.int.test.ts`)
   - Begona o'quvchi baholarini va progressini so'raganda: `404 NOT_FOUND` (`grades.int.test.ts`)
   - Begona o'quvchi test natijalarini so'raganda: `404 NOT_FOUND` (`tests.int.test.ts`)

2. **Ustoz (Teacher):**
   - O'zi dars bermaydigan guruh davomatini o'zgartira olmaydi (`403 FORBIDDEN` / `404 NOT_FOUND`)
   - Boshqa xodimlar ma'lumotlarini yoki moliyaviy hisobotlarni ko'ra olmaydi.

3. **Admin:**
   - Direktordan boshqa hech kimga ruxsat berilmagan amallar (storno muddati o'tgandan keyin, refund, xodimlarning audit loglarini tahrirlash) rad etiladi (`NON_DELEGABLE_PERMISSIONS`).
