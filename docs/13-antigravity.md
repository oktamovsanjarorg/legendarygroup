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

## Keyinroq (hozir BERILMAYDI — bog'liqliklari tayyor emas)

| Vazifa                            | Nima uchun hozir emas                                          |
| --------------------------------- | -------------------------------------------------------------- |
| T-503 Landing sayt (Astro)        | T-107 (lidlar API) kerak; W-35 maketi qabul qilingach beriladi |
| T-506 Qo'llanmalar va runbook'lar | F1–F4 ekranlari haqiqiy bo'lishi kerak (skrinshotlar bilan)    |
| T-118 Fikr-mulohaza tugmasi       | T-109 (bildirishnomalar moduli) kerak; API qismi — Claude      |

## Jurnal

| Sana       | Vazifa                  | Natija                                                                                                                                                                                                                                                                                                         |
| ---------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-12 | A-1 (1-urinish)         | Ekranlar yozildi, sessiya uzildi; review: 77 tip xatosi (API taxmin qilingan), 7 lint, `as`, UI'da pul yig'indisi, mock nomuvofiqligi. Landing — Claude qayta yozdi.                                                                                                                                           |
| 2026-11-12 | A-1 (2-urinish)         | Qabul qilindi. Review: 7 ta kodga yozilgan matn → i18n; sanalar `string` va xom chiqardi → `Date` + formatlash; summa matn sifatida (`"+1 100 000 soʻm"`); manfiy foyda yashil edi. Mock'lar mos (test qo'shildi).                                                                                             |
| 2026-11-12 | A-2                     | Qabul qilindi. Review: story'larda pul oddiy bo'shliq bilan yozilgan (`"4 850 000"`) → `formatMoney`.                                                                                                                                                                                                          |
| 2026-11-12 | A-3                     | Qabul qilindi. Review: `DataTable` balansi `string` → `bigint`; Drawer'da summa `Field` → `MoneyField`; `94.2%` → `94,2%`; o'quvchi kodi `ST-…` → `LG-…`.                                                                                                                                                      |
| 2026-11-12 | A-4                     | Qabul qilindi. Review: testlarda `as HTMLElement` (qoida 4) → null tekshiruvi / `toHaveProperty`.                                                                                                                                                                                                              |
| 2026-11-13 | (T-011, topshirilmagan) | Rad etildi. Vazifa ro'yxatida yo'q infra ishi; yashirin standartlar (`${APP_DOMAIN:-…}`), Caddy admin API tarmoqqa ochiq (`admin 0.0.0.0:2019`), `.dockerignore` ichki `dist`'ni chiqarmagan (test fayllari image'ga kirgan). Claude qaytadan yozdi. Egasi Antigravity'ni to'xtatdi — yangi vazifa berilmaydi. |
