# 13 — Antigravity uchun vazifalar

> Bu fayl Antigravity (`agy`, Gemini) bajaradigan ishlar ro'yxati. Claude Code bilan **parallel**
> ishlanadi, shuning uchun bu yerdagi vazifalar faqat past xavfli, andozaga tayangan ishlar:
> UI maketlari, Storybook, hujjatlar. Pul, ledger, RBAC, migratsiyalar, API modullari va infra —
> Claude'da (konflikt va xavf sababli).

## Qanday ishga tushiriladi (loyiha egasi uchun)

Antigravity alohida papkada (git worktree) va alohida branchda ishlaydi — Claude fayllariga tegmaydi.

```bash
cd ~/projects/legendarygroup-agy           # worktree (bor). Yo'q bo'lsa — pastdagi "Yangi worktree".
git fetch origin && git merge origin/feat/t-009-web-shell   # eng so'nggi kod
pnpm install
agy -i "docs/13-antigravity.md faylidagi A-1 vazifani bajar" --model gemini-3.8-flash-high
```

`-i` — interaktiv rejim: Antigravity har amal uchun ruxsat so'raydi (xavfsiz). Vazifa tugagach
Claude'ga ayting: **`/review-ai apps/web/src/screens/f3`** (yoki vazifadagi yo'l) — Claude tekshiradi,
tuzatadi va asosiy branchga qo'shadi.

**Yangi worktree** (keyingi vazifalar uchun):

```bash
cd ~/projects/legendarygroup
git worktree add ../legendarygroup-agy-<nom> -b feat/<vazifa-id>-<nom> feat/t-009-web-shell
cd ../legendarygroup-agy-<nom> && pnpm install
```

## Har vazifa uchun umumiy qoidalar (Antigravity o'qishi SHART)

1. Avval o'qing: `CLAUDE.md`, `docs/12-ai-playbook.md`, vazifada ko'rsatilgan hujjatlar va **andoza fayllar**.
2. **Komponent API'sini taxmin qilmang** — ishlatishdan oldin komponent faylini oching va props'ini
   o'qing (`packages/ui-web/src/*.tsx`, `packages/ui-tg/src/*.tsx`). Avvalgi urinishdagi 77 ta tip
   xatosining hammasi shundan edi: `PageHeader subtitle` (to'g'risi `description`), ustunda
   `numeric: true` (to'g'risi — `DataTable`ning `numeric={['id']}` propi), `DataTable`da majburiy
   `getRowId` va `empty` yo'q, `EmptyState`da `description`/`icon` (bunday props yo'q).
3. Fayl ≤ 300 qator, funksiya ≤ 60, complexity ≤ 12. `eslint-disable` — taqiqlangan.
4. TypeScript strict: `any` yo'q, `as` bilan tip majburlash yo'q (select qiymati uchun type guard:
   `const isX = (v: string): v is X => (LIST as readonly string[]).includes(v)`; mock massiv
   elementi uchun `must()`).
5. **Pul faqat `bigint`** va `formatMoney` / `MoneyText` / `MoneyField`. UI pulni **hisoblamaydi**:
   jami, foyda, qoldiq — props orqali tayyor keladi (server hisoblaydi, `packages/domain`). Foizni
   ko'rsatish uchun `Number((a * 100n) / b)` (faqat 0–100, `b > 0` tekshiruvi bilan) mumkin.
6. Foydalanuvchi ko'radigan **har** matn (tugma, sarlavha, `aria-label`, `placeholder`, badge) —
   `packages/i18n`da. O'zbek lotin: `oʻ`/`gʻ` — U+02BB (ʻ), tutuq — U+02BC (ʼ); oddiy `'` matnda taqiq.
   O'nlik son — vergul bilan (`new Intl.NumberFormat('uz', { maximumFractionDigits: 1 })`), `toFixed` emas.
7. Faqat mavjud tokenlar: `bg-bg`, `bg-surface`, `bg-surface-alt`, `text-text`, `text-text-muted`,
   `text-primary-text`, `bg-primary`, `text-link`, `text-success|warning|danger`, `bg-*-bg`.
   (`text-primary-fg` kabi o'ylab topilgan nomlar ishlamaydi.)
8. Interaktiv element ichida interaktiv element yo'q (`<a><Button/></a>` — xato).
9. Mock ma'lumotlar loyihaning qolgan ekranlari bilan **mos** bo'lsin: markaz — **Legendary Group**;
   kurslar — Ingliz tili (IELTS) 650 000 soʻm/oy, Matematika 550 000 soʻm/oy; ~186 faol o'quvchi;
   oy tushumi ~78–80 mln soʻm (W-04 bilan bir xil). Raqamlar o'zaro to'g'ri hisoblansin
   (masalan: qismlar yig'indisi = jami).
10. Tekshirish — hammasi yashil bo'lmaguncha vazifa tugamagan:
    ```bash
    pnpm exec prettier --write <o'zgargan papkalar>
    pnpm turbo build --filter=@lg/i18n --filter=@lg/ui-web --filter=@lg/ui-tg
    pnpm -F @lg/web typecheck && pnpm -F @lg/web lint && pnpm -F @lg/web test
    pnpm -F @lg/i18n test        # imlo testi
    ```
    (`pnpm turbo ... lint` birinchi xatoda to'xtaydi va typecheck'ni yashiradi — har birini alohida ishga tushiring.)
11. Skrinshot: `pnpm -F @lg/storybook screenshots` — bir nechtasini ochib ko'ring (matn sig'adimi,
    grafik ko'rinadimi, raqamlar mosmi).
12. **Tegmang:** `docs/09-tasks.md`, `docs/ux/screens/README.md` (Claude yangilaydi), `apps/api/**`,
    `packages/db/**`, `packages/domain/**`, `apps/bot/**`, `apps/worker/**`, boshqa vazifaning papkalari.
    `git push` va `main`ga merge — yo'q.
13. Yakun: bitta commit, sarlavha `feat(...): <ID> ...`, body qatorlari ≤ 100 belgi, oxirida
    `Co-Authored-By: Antigravity (Gemini 3.8 Flash) <noreply@google.com>`. Oxirida qisqa hisobot.

---

## A-1 · T-017c 6-qism — web F3–F5 maketlarini tugatish ✅

**Worktree:** `~/projects/legendarygroup-agy`, branch `feat/t-017c-web-f3`.
**Holat:** ekranlar yozilgan (`apps/web/src/screens/f3/`, `packages/i18n/src/web-f3*.ts`), commit qilinmagan.
`w35-landing.tsx` Claude tomonidan qayta yozilgan (andoza sifatida qarang). Qolgan tuzatishlar:

1. **Tip xatolari (77 ta)** — `pnpm -F @lg/web typecheck`:
   - `PageHeader`: `subtitle=` → `description=`.
   - Ustunlardagi `numeric: true` ni olib tashlang; o'sha ustunlar `id`/`accessorKey`larini
     `<DataTable numeric={[...]}>` ga bering.
   - Har `DataTable`ga `getRowId={(r) => r.id}` va `empty={{ title: ... }}` qo'shing (bo'sh holat
     DataTable ichida — tashqaridagi `EmptyState` tarmoqlarini olib tashlang).
   - `EmptyState`: `packages/ui-web/src/states.tsx`dagi `EmptyState`ga ixtiyoriy `hint?: string`
     qo'shing (ui-tg'dagidek: sarlavha ostida `text-sm text-text-muted`). So'ng `description=` → `hint=`,
     `icon=` ni olib tashlang. `states.test.tsx` yashil qolsin.
2. **Lint** — funksiya > 60 qator: `AnnouncementFormDrawer`, `ExpenseFormDrawer`, `getPayrollColumns`,
   `PayrollView`, `ReportsView`, `AuditView` — ma'no bo'yicha kichik komponentlarga bo'ling
   (andoza: `w35-landing.tsx`, `apps/web/src/screens/f2/*.tsx`).
3. `as` tip majburlash (`w23-expenses.tsx` 2 ta, `w20-announcements.tsx` 1 ta) → type guard.
4. Pul maydoni: `w23-expenses.tsx`dagi `Field` + `parseMoney` → `MoneyField` (`@lg/ui-web`).
5. **UI pul hisoblamaydi:** `ExpensesView`dagi `expenses.reduce(... e.amount ...)` va shunga
   o'xshash yig'indilar → `total: bigint` propi (mock'da tayyor qiymat). Boshqa ekranlarni ham tekshiring.
6. `toFixed(1)` (`w19-tests.tsx`, `w26-reports.tsx`) → `Intl.NumberFormat('uz', …)`.
7. `w20-announcements.tsx`: `deliveredCount / sentCount` — `sentCount = 0` bo'lsa `NaN`; tekshiruv qo'shing.
8. `w24-pnl.tsx` grafigi: `netProfit` manfiy bo'lsa balandlik manfiy bo'lmasin (0 dan kichik — 0).
9. **Mock ma'lumotlar** (qoida 9):
   - `mock-finance.ts` P&L: oy tushumi 145–178 mln emas — ~72–80 mln (W-04 bilan mos), xarajat/oylik
     shunga mos kichraytirilsin; `revenue − totalExpenses = netProfit`, `totalExpenses = payroll + operational`
     saqlansin; `marginPercent` = `netProfit / revenue` (bir xonali yaxlitlash).
   - `MOCK_PAYROLL_LIST`: "Jamshid Qodirov" — `groupBreakdowns` yig'indisi (7 000 000) `baseAmount`
     (12 000 000) ga teng emas — tuzating (yig'indi = asosiy qism).
   - `mock-analytics.ts`: kurslar — faqat markaz kurslari (Ingliz tili, Matematika); "Olimpiada
     fizikasi", "Python" yo'q; `revenue = studentsCount × narx` (650 000 / 550 000).
   - Landing'dagi kurslar (`MOCK_LANDING_COURSES`) ham shu narxlarda.
10. Har ekran: 5 holat story'lari (`Loading`, `Error`, `Forbidden` — alohida eksport, destrukturlash emas),
    asosiy holat `tags: ['primary']`.
11. Qoida 10–11 bo'yicha tekshiring, qoida 13 bo'yicha commit qiling.

**Qabul mezoni:** typecheck/lint/test yashil; skrinshotlarda matnlar sig'adi, raqamlar o'zaro mos.

---

## A-2 · `ui-tg` komponentlari uchun Storybook story'lari (design-system §3) ✅

**Yangi worktree**, branch `feat/storybook-ui-tg`. Har komponent **barcha holatlari** bilan story'da
bo'lishi shart (11-ux §7) — hozir faqat `States`, `TabBar` bor.

- Fayllar: `packages/ui-tg/src/<komponent>.stories.tsx`, sarlavha `ui-tg/<Komponent>`.
- Komponentlar va holatlar (`docs/ux/design-system.md` §3 jadvali):
  `Section`/`ListItem` (oddiy, ikonli, o'ng qiymat, chevron, disabled, uzun matn),
  `StatusChip` (5 ton), `AttendanceRow` (keldi/kelmadi/kech N daq/sababli/oldindan sababli, disabled),
  `ActionSheet` (amallar, xavfli amal, ichida kontent), `MoneyText` (musbat, manfiy), `MoneyInput`
  (bo'sh, qiymat, hint, xato), `TextArea`, `Segmented`, `DayStrip`, `AttendanceCalendar` (bo'sh, to'la),
  `ChildSwitcher` (1 ta — ko'rinmaydi, 2–3 ta), `CopyField`, `FilePicker` (4 holat), `ProgressChart`
  (bo'sh, 1 nuqta, ko'p), `KpiTile` (ton'lar), `SearchField`, `ImageViewer` (tayyor, xato),
  `TabBar` (badge bilan).
- Andoza: `packages/ui-tg/src/states.stories.tsx`, `tab-bar.stories.tsx`. Matnlar — mavjud i18n
  kalitlaridan (yangi matn kerak bo'lsa `packages/i18n/src/miniapp*.ts`ga).
- Story'lar ilova bundle'iga kirmaydi (`tsconfig.build.json`da chiqarilgan) — shunday qolsin.
- Tekshirish: `pnpm -F @lg/ui-tg typecheck && pnpm -F @lg/ui-tg lint`, `pnpm -F @lg/storybook build`.

## A-3 · `ui-web` komponentlari uchun Storybook story'lari (design-system §4) ✅

**Yangi worktree**, branch `feat/storybook-ui-web`. A-2 bilan bir xil tartib, `packages/ui-web/src/`:
`Badge` (5 ton), `KpiCard` (delta ↑↓ yaxshi/yomon, tonlar), `PageHeader` (amallar bilan),
`Tabs` (son bilan), `SelectField` (xato), `Drawer` (ochiq, footer bilan), `DataTable` (ma'lumot,
saralash, yuklanmoqda, bo'sh, xato, "Yana yuklash", raqamli ustunlar), `MoneyField` (bo'sh, qiymat, xato),
`Card`. Mavjud: `button`, `field`, `states` story'lari — andoza.

## A-4 · Komponent testlari (ui-tg / ui-web) — qamrovni oshirish ✅

**Yangi worktree**, branch `test/ui-components`. Testi yo'q komponentlar uchun `*.test.tsx`
(andoza: `packages/ui-tg/src/attendance-row.test.tsx`, `packages/ui-web/src/data-table.test.tsx`):
`ActionSheet` (fon bosilsa yopiladi, amal chaqiriladi), `Segmented` (`aria-checked`), `CopyField`
(`copy` propi bilan nusxa, "Nusxalandi"), `FilePicker` (holatlar, progressbar `aria-valuenow`),
`ChildSwitcher` (1 ta — `null`), `SearchField` (tozalash), `ImageViewer` (xato holati),
`Tabs`, `Drawer` (Esc yopadi), `KpiCard`. Faqat test fayllari qo'shiladi — komponent kodi o'zgarmaydi
(xato topilsa — hisobotda yozing, Claude tuzatadi).

---

## A-5 · Plan A4 — Ustoz Mini App: testlar, Excel import, e'lon (T-302, T-305, T-114) ✅

**Worktree:** yangi, `origin/main`dan, branch `feat/a4-teacher-tests`:

```bash
cd ~/projects/legendarygroup && git fetch origin
git worktree add ../legendarygroup-agy-a4 -b feat/a4-teacher-tests origin/main
cd ../legendarygroup-agy-a4 && pnpm install
```

**Hozirgi holat:** backend tayyor (API o'zgarmaydi). Ekranlar bor, lekin route yo'q va mock'ga ulangan:
`apps/miniapp/src/screens/teacher/{tests,test-import,announce}.tsx`. `pages/teacher.tsx`dagi
`GroupPage`da `onTests={() => undefined}`, `onAnnounce` umuman berilmagan — ustoz testlar va e'lonni ocha olmaydi.

**Maketlar (majburiy, avval ko'ring):** `docs/ux/screens/miniapp/ustoz-mt-07-08-testlar-va-import/*.png`,
`docs/ux/screens/miniapp/ustoz-mt-10-e-lon-yuborish/*.png`. Talablar: FR-GRD-4/5, FR-RPT-5, BR-35.

**Andozalar (props/naqshni shulardan oling):**

- Ma'lumot qatlami: `apps/miniapp/src/data/teacher.ts` + `teacher-map.ts` + `teacher-map.test.ts`
  (TanStack Query hook → map funksiya → screen props). `QueryView` (`data/query-view.tsx`) — 5 holat.
- Web'dagi xuddi shu oqim (API chaqiruvlari tayyor): `apps/web/src/routes/tests/{use-tests,map}.ts`
  (`fileBase64`, `confirmBody`), `apps/web/src/routes/announcements/index.tsx`.
- Route qo'shish: `apps/miniapp/src/router.tsx` (`/group/$id` naqshi), BackButton — mavjud sahifalardagidek.

**API (faqat shular, yangi endpoint yo'q):**

| Ekran          | Chaqiruv                                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MT-07 ro'yxat  | `GET /tests?groupId=…` → `TestItem[]`                                                                                                                                         |
| MT-07 yaratish | `POST /tests` (`CreateTestRequest`: `groupId`, `title`, `date` `YYYY-MM-DD` — Toshkent bo'yicha bugun `Clock`dan, `maxScore`, `sections`)                                     |
| MT-08 import   | `GET /tests/:id/template` (xlsx), `POST /tests/:id/import-preview` `{ fileBase64 }` → `ImportPreviewResponse`; `POST /tests/:id/import-confirm` (`ExcelImportConfirmRequest`) |
| MT-08 e'lon    | `POST /tests/:id/publish` (natijalar ota-onaga ketadi — BR-35)                                                                                                                |
| MT-10 e'lon    | `GET /announcements/preview?targetType=group&targetId=…` (qabul qiluvchilar soni), `POST /announcements` (`targetType: 'group'`, `targetId`, `body`, `sendNow: true`)         |

**Qilinadi:**

1. Route'lar: `/group/$id/tests` (MT-07), `/group/$id/tests/$testId/import` (MT-08), `/group/$id/announce` (MT-10).
   `GroupPage`da `onTests` va `onAnnounce` (faqat `group.role === 'main'`) shu route'larga navigatsiya qiladi.
2. `data/tests.ts` + `data/tests-map.ts` (+ `tests-map.test.ts`): API javobi → `GroupTest[]`, `ImportRow[]`,
   `ColumnMap`. Map — sof funksiya, testda har `ImportRow` turi (aniq, noaniq/fuzzy, topilmadi) bor.
3. **Yordamchi ustoz** (`group.role !== 'main'`): faqat ko'radi — `canManage = false`, yaratish/import/e'lon
   tugmalari yo'q (Q-62). API 403 qaytarsa — "ruxsat yo'q" holati, xom xato emas.
4. **Excel fayl:** Telegram WebView'da `<input type="file" accept=".xlsx">` (`data/upload.ts`dagi naqsh), fayl ≤ 5 MB —
   aks holda i18n xato matni. Fuzzy qatorlar bo'yicha `accept`/`reject` qarori `import-confirm` body'siga kiradi;
   hal qilinmagan fuzzy qator qolsa MainButton nofaol.
5. **E'lon (MT-10):** `CreateAnnouncementSchema`da `title` majburiy (3–200), ekranda esa faqat matn bor —
   `title` = i18n `t.announce.groupTitle` (`"{group} guruhi eʼloni"`), foydalanuvchi kiritmaydi.
   Yuborishdan oldin tasdiq ActionSheet'ida qabul qiluvchilar soni (`preview`dan). Ikki marta bosish = bitta e'lon
   (yuborilayotganda MainButton `showProgress` + nofaol).
6. Mutatsiyadan keyin tegishli query `invalidate` (ro'yxat yangilanadi). Offline bo'lsa — yuborish tugmasi
   nofaol va offline holati (`use-online.ts`); davomatdagi offline navbat bu yerga **kerak emas**.
7. Screen fayllardagi `mock.ts`/`mock-more.ts` importlari faqat story'larda qoladi; route sahifa mock import qilmaydi.
8. Testlar: `apps/miniapp/src/app.test.tsx` naqshida 3 ta oqim testi (MSW yoki mavjud `deps.tsx` fake API bilan):
   ro'yxat → test yaratish; import preview → fuzzy qaror → confirm; e'lon → tasdiq → `POST /announcements` 1 marta.
   Yordamchi ustozda tugmalar yo'qligi testi.

**Tegmang:** `apps/api/**`, `packages/{db,domain,contracts}/**`, `apps/web/**`, `infra/**`, `docs/09-tasks.md`.
`packages/i18n` — faqat `miniapp*.ts`ga yangi kalitlar.

**Tekshirish:** `pnpm -F @lg/miniapp typecheck && pnpm -F @lg/miniapp lint && pnpm -F @lg/miniapp test`,
`pnpm -F @lg/i18n test`, ildizda `pnpm test:int` (o'zgarmasligi kerak). Skrinshotlarni maket bilan solishtiring.

**Yakun:** ≤ 400 qatorlik bir nechta commit (masalan: 1 — data qatlami + map testlari, 2 — MT-07, 3 — MT-08, 4 — MT-10),
`git push -u origin feat/a4-teacher-tests`, PR ochiladi (`main`ga merge — yo'q). Sarlavha:
`feat(miniapp): T-302/T-305 ustoz testlari, Excel import va eʼlon (A4)`. Keyin Claude `/review-ai apps/miniapp` qiladi.

**Qabul mezoni:** ustoz guruhdan testlar ro'yxatini ochadi, test yaratadi, Excel'ni yuklab natijani tasdiqlaydi va
e'lon qiladi; asosiy ustoz guruhga e'lon yuboradi; yordamchi faqat ko'radi; CI yashil.

---

## A-6 · T-123 — panel ichida «Yordam» boʻlimi va har sahifada «?»

**Worktree:** `git worktree add ../legendarygroup-agy-help -b feat/t-123-help origin/main`.
**Manba matn:** `docs/manuals/director.md` (Claude yozgan, ekrandagi tugma nomlari bilan) — mazmuni
oʻzgarmaydi, faqat panelga koʻchiriladi.

1. **Matnlar:** `packages/i18n/src/web-help.ts` (yangi fayl, `webMessages`ga ulanadi). Tuzilma:
   `sections: { id, title, items: { id, q, steps: string[], note?: string }[] }[]` — 11 boʻlim
   (`kirish`, `xodimlar`, `kurslar`, `guruhlar`, `oquvchilar`, `tolovlar`, `sorovlar`, `oylik`,
   `hisobotlar`, `xabarlar`, `sozlamalar`). Tugma nomlari `«…»` ichida, `ʻ`/`ʼ` toʻgʻri.
   Jadvallar (kirish muammolari, hisobotlar) — `items` sifatida (savol → javob).
2. **Ekran W-36 «Yordam»** — `apps/web/src/routes/help/index.tsx` (+ `help.test.tsx`), marshrut
   `/help` (ilova ichida, ruxsatsiz — har kirgan xodim). Andoza: `routes/settings/index.tsx`
   (PageHeader + boʻlimlar). Yuqorida qidiruv (`SearchField`, `@lg/ui-web`) — `normalize` bilan
   (`@lg/i18n` — `oʻ`/`o'`/`o‘` bir xil); boʻlim chiplari; savol kartalari. Hash `#<item id>` —
   oʻsha savolga scroll (`location.hash`). Admin'ga faqat Admin ruxsatlariga mos boʻlimlar:
   har boʻlimga `permission?: Permission` (nav.ts dagi bilan bir xil) — `useAuth().permissions` bilan
   filtr.
3. **Menyu:** `layout/nav.ts` oxiriga (`sessions` dan oldin) `{ screen: 'W-36', to: '/help',
label: t.menu.help, icon: LifeBuoy }`. `nav.test.ts` yangilanadi.
4. **«?» har sahifada:** `PageHeader`ga yangi ixtiyoriy prop `help?: string` (`@lg/ui-web`,
   `page-header.tsx` + story + test) — sarlavha yonida kichik ikonka-havola `aria-label={t.help.open}`,
   `/help#<id>` ga. Ulash: Toʻlov kiritish, Chek navbati, Qarzdorlar, Chegirmalar, Kassa, Xodimlar,
   Guruhlar, Oʻquvchilar, Oyliklar hisobi, Sozlamalar, Tasdiqlash soʻrovlari.
5. **5 holat:** qidiruvda topilmadi — `EmptyState` (i18n). Yuklash/xato yoʻq (statik).
6. **Testlar:** qidiruv `o'qituvchi`/`oʻqituvchi` bir xil topadi; Admin'da `oylik` boʻlimi yoʻq;
   `/help#kassa-yopish` — oʻsha karta; `PageHeader help` havolasi.

**Qabul mezoni:** menyudan «Yordam» ochiladi, qidiruv ishlaydi, Kassa sahifasidagi «?» toʻgʻridan-toʻgʻri
«Kassani qanday yopaman?» ga olib boradi; CI yashil. Bitta commit ≤ 400 qator boʻlmasa — 2 ta
(matnlar; ekran + PageHeader).

---

## A-7 · T-124 — web: birinchi kirishda panel bilan tanishtiruv (tur) — ✅ Claude bajardi (berilmaydi)

**Bogʻliq:** A-6 (matnlar va `/help`). **Worktree:** `feat/t-124-tour` (A-6 branchidan).

1. **Komponent `Tour`** — `packages/ui-web/src/tour.tsx` (+ story, test). Props:
   `steps: { target: string /* CSS selector */; title: string; body: string }[]`, `open`, `onClose`.
   Maqsad elementni yoritadi (ustida qolgan qism xiralashadi), yonida kartochka: sarlavha, 1–2 gap,
   `«Orqaga»`, `«Keyingisi»` / oxirida `«Tushunarli»`, `«Oʻtkazib yuborish»`, `{i} / {n}`.
   Klaviatura: `Esc` — yopish, `→`/`←`. Fokus kartochkada (`role="dialog"`, `aria-modal`).
   Target topilmasa — oʻsha qadam oʻtkazib yuboriladi. `prefers-reduced-motion` — animatsiyasiz.
   Telefon kengligida — kartochka pastda, toʻliq kenglikda. Kutubxona qoʻshilmaydi.
2. **Qadamlar** (`packages/i18n/src/web-help.ts` → `tour`): Bosh sahifa → Oʻquvchilar → Guruhlar →
   Toʻlov kiritish (`Alt+P`) → Chek navbati → Tasdiqlash soʻrovlari (faqat Direktor) → Xodimlar →
   «Yordam» (oxirgi: «Savol boʻlsa — shu yerda»). Har qadam menyudagi `nav` elementiga
   (`AppShell` nav havolalariga `data-tour="<to>"` atributi qoʻshiladi). Ruxsatsiz boʻlim — qadam yoʻq.
3. **Qachon ochiladi:** birinchi marta panelga kirganda (Bosh sahifa). Koʻrilgani —
   `localStorage['lg_tour_v1:<userId>']` (try/catch; bloklangan boʻlsa — har safar ochilmaydi,
   faqat shu sessiyada bir marta). Yangi qurilmada qayta chiqishi — qabul qilingan (server holati yoʻq).
   Qayta ochish — «Yordam» sahifasida `«Tanishtiruvni qayta koʻrish»` tugmasi.
4. **Testlar:** birinchi kirishda ochiladi, «Oʻtkazib yuborish»dan keyin qayta ochilmaydi; Admin'da
   «Tasdiqlash soʻrovlari» qadami yoʻq; `Esc` yopadi; target yoʻq qadam oʻtkaziladi.

**Qabul mezoni:** yangi Direktor panelga kirganda tur oʻzi boshlanadi, 7–8 qadamda menyuni tanishtiradi,
qayta kirganda chiqmaydi, «Yordam»dan qayta ochiladi; CI yashil.

---

## A-8 · T-125 — Mini App: birinchi ochilishda 3 ta kartochka (rolga qarab)

**Worktree:** `feat/t-125-miniapp-intro` (`origin/main`dan).

1. **Ekran C-05 «Tanishuv»** — `apps/miniapp/src/screens/common/intro.tsx` (+ story, test). 3 ta
   kartochka (rasm oʻrniga `lucide` ikonka, sarlavha, 1–2 gap), pastda nuqtalar; tugma — **faqat
   `MainButton`** (`useMainButton`, CLAUDE.md: Mini App'da native boshqaruv): «Keyingisi» →
   oxirida «Boshlash». `BackButton` — oldingi kartochka. Andoza: `screens/common/feedback.tsx`.
2. **Matnlar** (`packages/i18n/src/miniapp.ts` → `intro`):
   - **Ustoz:** «Bugun» — darslaringiz; davomat bir tegishda (kelmagan/kech — ota-onaga xabar ketadi);
     baho va izoh — oʻquvchi kartasida; jadval va oylik — pastki menyuda.
   - **Ota-ona:** farzandingiz davomati va baholari — «Asosiy»; toʻlov: karta raqamiga oʻtkazing,
     chek rasmini «Toʻlovlar»dan yuboring; savol — «Koʻproq» → «Murojaat».
   - **Direktor/Admin:** «Bugun» — tushum va davomat; «Navbat» — ota-onalar cheklari; (Direktor)
     «Soʻrovlar»; katta ishlar — «Boshqaruv panelini ochish».
3. **Qachon:** rol tanlangandan keyin, shu rolda birinchi marta. Koʻrilgani — Telegram
   `CloudStorage` (`lg_intro_v1_<role>`; `useWebApp().CloudStorage`, andoza: `session/role-store.ts`)
   — boshqa telefonda ham chiqmaydi. CloudStorage xato bersa — koʻrsatiladi, lekin ilova ishlaydi.
4. **Testlar** (`createFakeWebApp`): birinchi ochilishda chiqadi, «Boshlash»dan keyin bosh sahifa va
   storage'ga yoziladi; ikkinchi ochilishda chiqmaydi; rol almashtirilsa — yangi rol uchun bir marta.

**Qabul mezoni:** yangi ustoz/ota-ona Mini App'ni birinchi ochganda 3 kartochka koʻradi, keyin chiqmaydi;
CI yashil.

---

## Keyinroq (hozir BERILMAYDI — bog'liqliklari tayyor emas)

| Vazifa                            | Nima uchun hozir emas                                          |
| --------------------------------- | -------------------------------------------------------------- |
| T-503 Landing sayt (Astro)        | T-107 (lidlar API) kerak; W-35 maketi qabul qilingach beriladi |
| T-506 Qo'llanmalar va runbook'lar | F1–F4 ekranlari haqiqiy bo'lishi kerak (skrinshotlar bilan)    |
| T-118 Fikr-mulohaza tugmasi       | T-109 (bildirishnomalar moduli) kerak; API qismi — Claude      |

## Jurnal

| Sana       | Vazifa                                  | Natija                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-12 | A-1 (1-urinish)                         | Ekranlar yozildi, sessiya uzildi; review: 77 tip xatosi (API taxmin qilingan), 7 lint, `as`, UI'da pul yig'indisi, mock nomuvofiqligi. Landing — Claude qayta yozdi.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-11-12 | A-1 (2-urinish)                         | Qabul qilindi. Review: 7 ta kodga yozilgan matn → i18n; sanalar `string` va xom chiqardi → `Date` + formatlash; summa matn sifatida (`"+1 100 000 soʻm"`); manfiy foyda yashil edi. Mock'lar mos (test qo'shildi).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-11-12 | A-2                                     | Qabul qilindi. Review: story'larda pul oddiy bo'shliq bilan yozilgan (`"4 850 000"`) → `formatMoney`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-11-12 | A-3                                     | Qabul qilindi. Review: `DataTable` balansi `string` → `bigint`; Drawer'da summa `Field` → `MoneyField`; `94.2%` → `94,2%`; o'quvchi kodi `ST-…` → `LG-…`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-11-12 | A-4                                     | Qabul qilindi. Review: testlarda `as HTMLElement` (qoida 4) → null tekshiruvi / `toHaveProperty`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-11-13 | (T-011, topshirilmagan)                 | Rad etildi. Vazifa ro'yxatida yo'q infra ishi; yashirin standartlar (`${APP_DOMAIN:-…}`), Caddy admin API tarmoqqa ochiq (`admin 0.0.0.0:2019`), `.dockerignore` ichki `dist`'ni chiqarmagan (test fayllari image'ga kirgan). Claude qaytadan yozdi. Egasi Antigravity'ni to'xtatdi — yangi vazifa berilmaydi.                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-11-14 | T-013…T-507 (42 commit, topshirilmagan) | To'xtatilgandan keyin qayta ishga tushirilgan agy `feat/t-011-docker-compose`da 6 soatda ~46 ming qator yozgan (vazifa berilmagan, backend — doirasidan tashqari). Birlashtirildi (3ef9c78), chunki lint/typecheck/unit yashil va int 41/43. Review: 2 int test qattiq sana bilan ertasi kuni yiqildi; kun/oy chegaralari UTC bo'yicha (kassa yopish, P&L, audit, dashboard, davomat "bugun") → Toshkent (ea538fd); BR-30 rol bo'yicha → ruxsat; murojaatlarda `@Authenticated` → ustoz hammasini ko'rardi (7323af0). Soxta "bajarildi": `cd-production.yml` deploy qatori izohda, "T-507 v1.0.0" production'siz — holatlar 🟨/⬜ ga, manifest 0.1.0 ga qaytarildi. Har vazifa — bitta commit (≤ 400 qator qoidasi buzilgan). |
| 2026-11-16 | A-5 (plan A4)                           | Qabul qilindi (#46, 4 commit, lint/typecheck/test yashil). Review: test formasiz yaratilardi ("Testlar N", 100 ball — maketga zid) → MT-07a forma; import confirm'dan keyin preview tozalanmasdi — e'lon tugmasi chiqmasdi; MainButton fayl tahlilisiz ko'rinib, bosilsa hech narsa qilmasdi; yordamchi ustozga Forbidden (Q-62 — ko'radi); e'lon tugmasida holat yorlig'i va tasdiqsiz; "Natijalar kiritilgan" holati hech qachon chiqmasdi (API'ga `resultsCount`); kodga yozilgan matn; testlarda `as`.                                                                                                                                                                                                                    |
| 2026-11-16 | A-6 (T-123)                             | Qabul qilindi (2 commit, lint/typecheck/test yashil). Review: hash bilan ochilgach boʻlim chiplari ishlamasdi (effekt `selectedSection`ga bogʻliq); PageHeader «?» oddiy `<a>` — sahifa qayta yuklanardi; `role=tablist` panelsiz → `aria-pressed`; ruxsat faqat boʻlimga — `cash.close`li xodim Kassa savolini koʻrmasdi; Admin oʻqiydigan matnda «sizga soʻrov keladi»; yoʻriqnomadagi «shartnoma web'da yoʻq» ogohlantirishi tushib qolgan; testda `window.location.hash` keyingi testlarga oqardi.                                                                                                                                                                                                                        |
