# A-9 · T-126 — Oʻquvchi roli: shaxsiy kod → bot → oʻquvchi paneli (Mini App)

> Bajaruvchi: **agy** (Antigravity). Review: Claude (`/review-ai`).
> Bu vazifa odatdagi agy doirasidan **kengroq** (migratsiya, RBAC, API, bot). Shuning uchun quyidagi
> qoidalar va bosqichlar **qatʼiy**. Har bosqich alohida commit, bosqich oxirida tekshiruvlar yashil
> boʻlmasa keyingisiga oʻtilmaydi.

## 0. Nima kerak (egasining soʻzi bilan)

Oʻquvchiga **shaxsiy kod** biriktiriladi. Oʻquvchi botda **Start** → **telefon raqamini ulashadi** →
**shaxsiy kodini kiritadi** → unga **oʻquvchi paneli** (Mini App) ochiladi.

## 1. Qabul qilingan qarorlar (egasi oʻzgartirmaguncha shular)

| #   | Qaror                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | **Telefon:** ulashilgan raqam shu oʻquvchining `students.phone` **yoki** uning ota-onalaridan birining (`student_guardians` → `guardians.phone`) raqami boʻlsa — qabul. Qaysi oʻquvchi ekanini **kod** aniqlaydi (bir ota-onada bir nechta farzand boʻlishi mumkin).                                                                                                                                         |
| D2  | **Kod:** alohida **maxfiy 6 xonali** kirish kodi (`LG-10001` raqami emas — u cheklar va roʻyxatlarda koʻrinadi, ketma-ket). Admin/Direktor oʻquvchi kartasida koʻradi, **«Kodni yangilash»** bilan almashtiradi (eskisi darhol yaroqsiz). DB'da faqat **SHA-256 xeshi**; ochiq kod faqat yaratish/yangilash javobida bir marta qaytadi va kartada «Koʻrsatish» bilan qayta olinmaydi — yoʻqolsa yangilanadi. |
| D3  | **Urinishlar:** kod kiritish — Telegram akkaunt boʻyicha **5 urinish / 15 daqiqa** (`RateLimiter`). Notoʻgʻri kodda qaysi qism xato ekani aytilmaydi.                                                                                                                                                                                                                                                        |
| D4  | **Oʻquvchi koʻradi:** dars jadvali, oʻz davomati, baholar va ustoz izohlari, test natijalari va guruhdagi oʻrni (reyting). **Koʻrmaydi:** toʻlovlar, qarz, ota-ona telefonlari, boshqa oʻquvchilarning maʼlumoti.                                                                                                                                                                                            |
| D5  | **Bir Telegram — bir nechta rol mumkin** (masalan ota-ona ham oʻquvchi) — mavjud rol tanlash ekrani (FR-AUTH-5) ishlaydi. Bitta Telegram akkauntga ko'pi bilan **bitta oʻquvchi** bogʻlanadi; boshqa oʻquvchini ulash — avval Admin uzadi.                                                                                                                                                                   |
| D6  | **Uzish:** Admin oʻquvchi kartasida **«Telegramdan uzish»** — `students.user_id = null`, oʻquvchi roli olinadi, `permissions_version + 1` (sessiya darhol yopiladi). Oʻquvchi arxivlansa — xuddi shunday.                                                                                                                                                                                                    |

Bu qarorlarni `docs/10-open-questions.md` ga **Q-90** qatori qilib yozing (taklif = yuqoridagi jadval).

## 2. Avval oʻqing (majburiy)

`CLAUDE.md`, `docs/12-ai-playbook.md` (§4, §5, §6, **§7 jadvali — oldingi xatolar**),
`docs/13-antigravity.md` ("Har vazifa uchun umumiy qoidalar" — hammasi amal qiladi),
`docs/02-roles-permissions.md`, `docs/05-data-model.md`, `docs/adr/0006-staff-auth.md`.

**Andoza (namunaga qarab yozing, API'ni taxmin qilmang):**

| Nima                                                     | Andoza fayl                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Ota-onaning bot orqali bogʻlanishi (telefon → bogʻlash)  | `apps/api/src/modules/rbac/guardian-link.service.ts`, `internal-guardian.controller.ts`          |
| Bot oqimi (Start → kontakt → javob)                      | `apps/bot/src/staff-onboarding.ts`, `apps/bot/src/internal-api.ts`                               |
| Rollar va ruxsatlar matritsasi                           | `packages/contracts/src/roles.ts`, `permissions.ts` (+ `roles.test.ts` hujjat jadvalini oʻqiydi) |
| Oʻquvchi scope (kim qaysi oʻquvchini koʻradi)            | `apps/api/src/modules/students/` — `StudentScopeService`                                         |
| Mini App ota-ona ekranlari (farzand davomati, natijalar) | `apps/miniapp/src/pages/guardian.tsx`, `screens/guardian/*`                                      |
| Rolga qarab pastki menyu                                 | `apps/miniapp/src/tabs.ts`                                                                       |
| Mini App kirish (initData → token, rol tanlash)          | `apps/api/src/modules/auth/telegram-auth.service.ts`                                             |

## 3. Bosqichlar

### Bosqich 1 — maʼlumot va rol (commit 1)

1. `packages/contracts/src/roles.ts`: `ROLES` ga `'student'`; `ROLE_PERMISSIONS.student` — faqat
   oʻqish ruxsatlari: jadval, oʻz davomati, baholar, testlar (mavjud ruxsat kodlaridan; yangi kod
   kerak boʻlsa `permissions.ts` ga, nomi `<obyekt>.<feʼl>`).
2. `docs/02-roles-permissions.md`: rollar jadvaliga **Oʻquvchi**, matritsaga ustun (D4 boʻyicha).
   `roles.test.ts` hujjat jadvali bilan solishtiradi — ikkalasi mos boʻlsin.
3. Jadval: `students` ga `user_id` (uuid, FK `users.id`, **unique**, nullable, indeks) va
   `access_code_hash` (text, nullable), `access_code_updated_at` (timestamptz). Migratsiya **faqat**
   `pnpm --filter @lg/db db:generate --name student_access` (qoʻlda SQL yoʻq; generatsiya qilingan
   faylni tahrirlamang). Rol seed'i — mavjud seed tartibida (`packages/db/src/seed-data.ts`).
4. `docs/05-data-model.md` — yangi ustunlar.

### Bosqich 2 — API (commit 2)

1. **Kod (xodim):** `POST /api/students/:id/access-code` — `@RequirePermission('student.manage')`,
   scope tekshiruvi, yangi 6 xonali kod (`crypto.randomInt`, `000000`–`999999`, oldingi nol saqlanadi),
   xesh saqlanadi, javob `{ code, updatedAt }` (bir marta), audit `student.access_code_reset`
   (**kodning oʻzi auditga yozilmaydi**). Kartada kod boʻlgan-boʻlmagani: `GET /:id` javobida
   `accessCodeSet: boolean`, `telegramLinked: boolean`.
2. **Uzish:** `POST /api/students/:id/telegram-unlink` — `student.manage`, D6, audit.
3. **Bot (ichki):** `POST /internal/student/link` `{ telegramId, phone, code }` (`InternalTokenGuard`,
   andoza — `internal-guardian.controller.ts`). Tartib (bitta tranzaksiya):
   rate limit (D3) → kod xeshi boʻyicha oʻquvchi → arxivlanmagan → telefon D1 boʻyicha mos →
   `users` (telefon/telegram_id boʻyicha mavjudini oling yoki yarating) → `students.user_id` →
   `student` roli → audit `student.telegram_linked`. Javob: `{ result: 'linked', fullName }` |
   `{ result: 'invalid' }` | `{ result: 'already_linked' }` | `{ result: 'rate_limited' }`.
   Natija sxemasi — `packages/contracts` (Zod), bot va API bitta sxemadan.
4. **Oʻquvchi maʼlumoti:** oʻquvchi roli bilan mavjud endpoint'lar ishlasin (jadval, davomat, baholar,
   testlar) — scope: **faqat `students.user_id = joriy foydalanuvchi`**. `StudentScopeService` ga
   `student` tarmogʻi. Toʻlov/qarz endpoint'lari oʻquvchiga **403**.
5. **Testlar (integratsiya, `createRealTestApp`):** toʻgʻri telefon+kod → bogʻlanadi; ota-ona telefoni
   - farzand kodi → bogʻlanadi (D1); begona telefon / notoʻgʻri kod → `invalid`; 6-urinish →
     `rate_limited`; kod yangilangach eski kod ishlamaydi; arxivdagi oʻquvchi → `invalid`; uzishdan keyin
     token darhol yaroqsiz; **forbidden**: oʻquvchi boshqa oʻquvchini, toʻlovlarni, xodim endpoint'larini
     ololmaydi (har endpoint uchun). Auditda kodning ochiq qiymati yoʻqligi tekshirilsin.

### Bosqich 3 — bot (commit 3)

Mavjud `/start` oqimiga (`staff-onboarding.ts`) qoʻshing: kontakt ulashilgandan keyin raqam ota-ona
yoki xodim sifatida topilmasa **va** foydalanuvchi «Men oʻquvchiman» tugmasini bossa (yoki `/start`
dan keyingi menyuda «🎓 Oʻquvchi sifatida kirish») → bot **«Shaxsiy kodingizni yuboring (6 raqam)»**
→ keyingi matnli xabar = kod → `POST /internal/student/link` → natijaga qarab javob:
`linked` → «✅ Xush kelibsiz, {ism}!» + Mini App tugmasi; `invalid` → «Kod yoki raqam mos kelmadi.
Kodni Admindan soʻrang.»; `rate_limited` → «Juda koʻp urinish. 15 daqiqadan keyin qayta urining.»
Holat (kod kutilmoqda) — Redis'da, 10 daqiqa (botda DB yoʻq). Bot DB'ga ulanmaydi, xabar faqat
`ctx.reply` (update javobi). Matnlar — `packages/i18n/src/bot.ts` (`studentLogin`). Testlar —
`apps/bot/src/student-login.test.ts` (andoza: `staff-login.test.ts`): toʻgʻri, notoʻgʻri, limit,
kodsiz matn.

### Bosqich 4 — Mini App oʻquvchi paneli va web (commit 4, kerak boʻlsa 5)

1. `tabs.ts`: `student` — **Bugun** (bugungi darslar), **Jadval**, **Natijalar** (baho, izoh, testlar,
   reyting), **Profil**. Ota-ona ekranlaridagi komponentlardan qayta foydalaning
   (`screens/guardian/*`) — farzand tanlagich oʻrniga oʻzi; toʻlov ekranlari **yoʻq**.
2. Har ekranda 5 holat (yuklanmoqda, boʻsh, xato, offline, ruxsat yoʻq), faqat MainButton/BackButton.
3. Web: oʻquvchi kartasida (W-06) blok **«Mini App'ga kirish»**: holat (Telegram ulangan/yoʻq,
   kod berilgan/yoʻq), **«Kod yaratish» / «Kodni yangilash»** (tasdiq bilan — eski kod ishlamay qoladi),
   yaratilganda kod **bir marta** katta qilib koʻrsatiladi + «Nusxalash», **«Telegramdan uzish»**.
4. Matnlar — `packages/i18n` (miniapp va web). Storybook story'lar, testlar.
5. `docs/manuals/` ga qisqa `student.md` (oʻquvchi uchun: botga qanday kiraman) va `director.md` ga
   «Oʻquvchiga Mini App kodi berish» savoli; `docs/ux/screens.md` ga yangi ekranlar.

## 4. Tegmang / qilmang

- `docs/09-tasks.md` — Claude yangilaydi. `main` ga merge va `git push --force` — yoʻq.
- Mavjud migratsiyalarni oʻzgartirmang. `eslint-disable`, `any`, `as` bilan tip majburlash — yoʻq.
- Toʻlov, ledger, billing kodiga tegmang (faqat oʻquvchiga 403 testi).
- Kod, token, telefon — loglarga ochiq yozilmaydi (`maskPhone`).

## 5. Tekshiruv (har bosqich oxirida — hammasi yashil)

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm test:int        # bosqich 2 dan boshlab majburiy (vaqtinchalik DB)
pnpm -F @lg/i18n test
```

## 6. Yakun

Branch `feat/t-126-student-panel`, 4–5 commit (har biri ≤ 400 qator, sarlavha
`feat(<modul>): T-126 ...`, oxirida `Co-Authored-By: Antigravity (Gemini 3.8 Flash) <noreply@google.com>`),
`git push -u origin feat/t-126-student-panel`, PR (`main` ga merge — yoʻq). Oxirida qisqa hisobot:
nima qilindi, qaysi qaror (D1–D6) qanday amalga oshdi, testlar natijasi.

**Qabul mezoni:** Admin oʻquvchi kartasida kod yaratadi → oʻquvchi botda Start → telefon → kod →
Mini App'da oʻz jadvali, davomati, baholari va testlarini koʻradi, toʻlovlarni koʻrmaydi; notoʻgʻri
kod va limit ishlaydi; uzilsa kirishi darhol yopiladi; CI yashil.
