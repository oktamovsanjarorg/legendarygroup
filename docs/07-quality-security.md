# 07 — Sifat, testlar, xavfsizlik

## 1. Test strategiyasi (piramida)

| Daraja         | Vosita                                                                                                                                                                                 | Nima                                                                                                    | Qoplash talabi                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Unit           | **Vitest**                                                                                                                                                                             | `packages/domain` (invoice, jarima, oylik, taqsimlash, churn), util'lar, Zod sxemalar                   | domain ≥ 95%, umumiy ≥ 80%                               |
| Property-based | **fast-check**                                                                                                                                                                         | Pul hisobi: taqsimlash yig'indisi = to'lov; balans = ledger yig'indisi; proporsional narx ≤ to'liq narx | barcha pul funksiyalari                                  |
| Integratsiya   | Vitest + haqiqiy Postgres/Redis (lokal — `compose.dev.yml`, CI — service container); har test fayli o'z vaqtinchalik bazasini yaratadi va o'chiradi (`*.int.test.ts`, `pnpm test:int`) | Repository, service, tranzaksiyalar, RBAC scope, outbox                                                 | har endpoint kamida 1 happy + 1 forbidden + 1 validation |
| Kontrakt       | OpenAPI snapshot                                                                                                                                                                       | API buzilish o'zgarishlari (breaking change) aniqlash                                                   | CI'da                                                    |
| Bot            | grammY test (mock API)                                                                                                                                                                 | Suhbat oqimlari: ro'yxatdan o'tish, chek yuborish                                                       | asosiy oqimlar                                           |
| E2E            | **Playwright**                                                                                                                                                                         | Web: to'lov kiritish→chek; tasdiqlash navbati; guruh yaratish. Mini App: davomat (mock initData)        | kritik 10–15 ssenariy                                    |
| Yuklama        | **k6**                                                                                                                                                                                 | 200 bir vaqtdagi foydalanuvchi, oy boshi invoice generatsiyasi, ommaviy xabar                           | relizdan oldin (faza oxirida)                            |
| Vizual         | Playwright screenshot                                                                                                                                                                  | Mini App asosiy ekranlar (light/dark tema)                                                              | ixtiyoriy                                                |

**Qoidalar:**

- Har bir bug fix — avval uni takrorlovchi test, keyin tuzatish.
- Har bir `BR-*` qoidasi uchun test nomida ID: `it("BR-12: to'lov eng eski qarzga taqsimlanadi")`.
- Testlarda vaqt muzlatiladi (`vi.useFakeTimers`), `Asia/Tashkent` zonasi.
- Seed/fixture'lar — factory funksiyalar (`makeStudent()`), haqiqiy shaxsiy ma'lumot yo'q.

## 2. Kod standartlari

- TypeScript `strict: true`, `noUncheckedIndexedAccess`, `any` taqiqlangan (ESLint error).
- ESLint (typescript-eslint strict) + Prettier; `eslint-plugin-boundaries` — modullar chegarasini majburlaydi.
- **ESLint majburlaydi (CI yiqiladi):** fayl ≤ 300 qator, funksiya ≤ 60 qator, `complexity` ≤ 12, ichma-ichlik ≤ 3, parametrlar ≤ 4 (testlar: fayl ≤ 500). Chegara yetganda — faylni ma'no bo'yicha bo'lish ([12-ai-playbook.md](12-ai-playbook.md) §4), qoidani o'chirish (`eslint-disable`) taqiqlangan.
- Nomlash: kod — inglizcha; foydalanuvchiga ko'rinadigan matnlar — faqat `packages/i18n` orqali o'zbekcha.
- Xatolar: domen xatolari tiplangan (`PaymentAlreadyConfirmedError`), API — yagona xato formati `{ code, message, details, requestId }`.
- Commit: Conventional Commits; PR — kichik (≤ 400 qator o'zgarish tavsiya), shablon bilan (nima, nega, test, skrinshot).
- Husky + lint-staged: commit oldidan lint/format.

## 3. Xavfsizlik

### Ilova

- **OWASP ASVS L2** asosida tekshiruv ro'yxati.
- Telegram `initData` — HMAC-SHA256 tekshiruvi, `auth_date` muddati, replay himoyasi.
- Bot webhook — `secret_token` header tekshiruvi.
- Parollar — **Argon2id**; 2FA TOTP (Director/Admin majburiy).
- Rate limiting (Redis): login 5/daq, API 100/daq/foydalanuvchi, fayl yuklash 10/daq.
- Fayl yuklash: MIME + magic bytes tekshiruvi, maks. 10 MB, rasm qayta kodlanadi (EXIF olib tashlanadi), S3'ga to'g'ridan-to'g'ri presigned POST.
- SQL — faqat parametrlashtirilgan (Drizzle), raw SQL review'da alohida tekshiriladi.
- CORS — faqat o'z domenlari; CSP, HSTS, X-Frame-Options (Mini App uchun Telegram domenlariga `frame-ancestors`).
- Ota-ona ID'larini taxmin qilib bo'lmaydi (UUIDv7 + har so'rovda scope tekshiruvi — IDOR himoyasi).
- PII loglarga yozilmaydi (telefon maskalanadi `+99890***4567`).
- Audit jurnali — o'zgartirib bo'lmaydi (DB grant darajasida).

### Bog'liqliklar (supply chain)

- `pnpm` lockfile, `minimumReleaseAge: 10080` (yangi versiyalar 7 kun kutadi — `pnpm-workspace.yaml`), build skriptlari faqat `allowBuilds` ro'yxatiga, Renovate (`renovate.json`, haftalik, 7 kun), `pnpm audit`, CodeQL, Trivy.
- GitHub: branch protection, majburiy CI, secret scanning, Dependabot alerts.

### Shaxsiy ma'lumotlar

- Ma'lumotlar minimalizatsiyasi: faqat kerakli maydonlar.
- Ota-ona so'rovi bo'yicha ma'lumotni eksport/o'chirish (anonimlashtirish) — moliyaviy yozuvlar qonun bo'yicha saqlanadi.
- Maxfiylik siyosati va foydalanish shartlari — bot `/start`da rozilik.
- Staging'ga prod ma'lumot faqat anonimlashtirilgan holda.

## 4. Definition of Done (har vazifa uchun)

- [ ] Kod yozildi, lint + typecheck toza
- [ ] Testlar yozildi va o'tdi (talab qilingan darajalarda)
- [ ] RBAC va scope tekshirildi (forbidden testi bor)
- [ ] Audit yozuvi (yozish amallari uchun)
- [ ] Matnlar `i18n`da, o'zbekcha, imlo tekshirilgan
- [ ] Migratsiya orqaga mos
- [ ] Hujjat yangilandi (agar qoida/API o'zgargan bo'lsa)
- [ ] UI vazifalari — Playwright skrinshotlari (light/dark, 5 holat) PR'da; staging'da qo'lda tekshiruvni loyiha egasi qiladi
