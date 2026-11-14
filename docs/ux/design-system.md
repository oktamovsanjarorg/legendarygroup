# Dizayn tizimi: tokenlar va komponentlar katalogi (T-017b)

> Tokenlar — **kod**: `packages/ui-core/src/tokens/` (bu hujjat — tavsif). Komponentlar faqat
> semantik tokenlarni ishlatadi (`var(--lg-text)`), xom rang yozilmaydi. Har komponent avval
> Storybook'da barcha holatlari bilan (CLAUDE.md "UI"), ekranlar — [screens.md](screens.md).

## 1. Tokenlar

| Guruh       | Kod                              | Qoida                                                                                                         |
| ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Rang        | `PALETTE.light` / `PALETTE.dark` | 15 semantik token (`bg`, `surface`, `text`, `textMuted`, `primary`, holat ranglari...)                        |
| Telegram    | `resolveTelegramTheme(params)`   | `themeParams` → tokenlar; AA'dan past juft — xavfsiz palitraga (faqat o'sha juft)                             |
| Kontrast    | `contrastRatio()`                | matn ≥ 4.5; tugma yozuvi (katta matn), havola, belgi ≥ 3 — testlarda majburiy                                 |
| CSS         | `toCssVariables(tokens)`         | `--lg-<token>`; Tailwind `theme.extend.colors` shu o'zgaruvchilarga bog'lanadi (T-009)                        |
| Oraliq      | `SPACE`                          | 4 px qadam: 4, 8, 12, 16, 20, 24, 32, 40, 48                                                                  |
| Radius      | `RADIUS`                         | sm 6 · md 10 · lg 14 · full                                                                                   |
| Tipografiya | `TYPOGRAPHY`                     | Mini App — tizim shrifti, asosiy 16 px; web — Inter, asosiy 14 px; tugma 19 px qalin; raqamlar `tabular-nums` |
| Soya        | `SHADOW`                         | sm (karta), md (popover); dark temada soya o'rniga `surfaceAlt`                                               |
| Teginish    | `TOUCH_TARGET`                   | ≥ 44×44 px                                                                                                    |

**Holat ranglari (davomat va boshqalar):** keldi — `success`/`successBg` ✅ · kelmadi — `danger`/`dangerBg` ❌ ·
kech — `warning`/`warningBg` ⏰ · sababli — `textMuted`/`surfaceAlt` 📝. Rang **yagona** belgi emas —
har holatda ikon va matn ham bor (rang ko'rmaydiganlar uchun).

## 2. Ikonlar

**Lucide** (`lucide-react`, MIT, tree-shakable), o'lcham 20/24 px, `stroke-width` 2, rang — `currentColor`.

| Ma'no         | Ikon               | Ma'no                | Ikon             |
| ------------- | ------------------ | -------------------- | ---------------- |
| Bugun         | `calendar-check`   | To'lov               | `wallet`         |
| Guruhlar      | `users`            | Chek                 | `receipt`        |
| Jadval        | `calendar-days`    | Qarz / ogohlantirish | `alert-triangle` |
| Profil        | `user-round`       | Tasdiqlash           | `check-circle-2` |
| Natijalar     | `bar-chart-3`      | Rad etish            | `x-circle`       |
| Davomat       | `clipboard-check`  | Kech qoldi           | `clock-4`        |
| Test / import | `file-spreadsheet` | Sababli              | `file-text`      |
| E'lon         | `megaphone`        | Offline              | `wifi-off`       |
| Qidiruv       | `search`           | Sozlamalar           | `settings`       |
| Murojaat      | `message-circle`   | Audit                | `shield-check`   |

Bot xabarlarida emoji faqat holat belgisi (11-ux §6): ✅ ❌ ⏰ 📝 💳 📄 📊 ⏳ 👋 ℹ️.

## 3. Komponentlar — `packages/ui-tg` (Mini App)

Har komponent Storybook'da: light, dark, custom (past kontrast → fallback), uzun matn, RTL yo'q (uz-Latn).

Ishga tushirish: `pnpm -F @lg/storybook dev` (http://localhost:6006). Hikoyalar komponent yonida —
`packages/ui-{web,tg}/src/*.stories.tsx`. Toolbar'dagi "Tema": Light / Dark / Custom (past kontrast).
`ui-tg/*` hikoyalari fake Telegram ramkasida — MainButton/SecondaryButton/BackButton holati pastda/yuqorida
ko'rinadi va bosiladi.

| Komponent          | Vazifa / ekranlar                | Holatlar                                                                        |
| ------------------ | -------------------------------- | ------------------------------------------------------------------------------- |
| `AppShell`         | pastki tablar, safe-area         | rolga qarab tablar; offline chizig'i                                            |
| `TabBar`           | 4 tab (MT/MG/MS)                 | faol, badge (son), disabled                                                     |
| `MainButton`       | Telegram MainButton o'rami       | ko'rinadi/yashirin, loading, disabled, matn o'zgarishi                          |
| `BackButton`       | Telegram BackButton o'rami       | — (ichki "Orqaga" chizilmaydi)                                                  |
| `SecondaryButton`  | Telegram SecondaryButton         | ko'rinadi/yashirin                                                              |
| `List`, `ListItem` | ro'yxatlar                       | oddiy, ikonli, o'ng qiymat, chevron, bosilgan, disabled                         |
| `Section`          | guruhlangan bloklar              | sarlavha, izoh (footer)                                                         |
| `AttendanceRow`    | MT-02                            | keldi / kelmadi / kech (daq) / sababli / oldindan sababli belgisi; baho maydoni |
| `GradeInput`       | MT-02, MT-06                     | shkala 0–5 / 0–100, bo'sh, xato                                                 |
| `StudentCard`      | MG-01, MS-05                     | farzand almashtirgich, qarz bor/yo'q                                            |
| `MoneyText`        | summalar                         | musbat, qarz (danger), avans; `1 250 000 soʻm`                                  |
| `StatusChip`       | chek/to'lov/dars holati          | tekshirilmoqda, tasdiqlandi, rad, bekor                                         |
| `FilePicker`       | MG-06 (T-019 oqimi)              | tanlanmagan, yuklanmoqda (progress), tayyor (preview), xato                     |
| `ImageViewer`      | MS-02                            | zoom, pan, yuklanmoqda, xato                                                    |
| `Skeleton`         | yuklanmoqda holati               | ro'yxat, karta, matn qatorlari                                                  |
| `EmptyState`       | bo'sh holat                      | ikon + matn + amal                                                              |
| `ErrorState`       | xato holati                      | matn (i18n) + "Qayta urinish" + requestId                                       |
| `OfflineBanner`    | offline                          | ko'rinadi, "Sinxronlanmadi (n)"                                                 |
| `ForbiddenState`   | ruxsat yo'q                      | matn + bosh sahifaga                                                            |
| `Snackbar`         | "Bekor qilish" (5 s, 11-ux §4.5) | info, muvaffaqiyat, xato, amal tugmasi                                          |
| `ConfirmSheet`     | qaytarib bo'lmaydigan amal       | amal nomi tugmada ("Rad etish")                                                 |
| `Calendar`         | MT-09, MG-02                     | hafta/oy, belgilangan kunlar, o'rinbosar belgisi                                |
| `Chart`            | MG-02 progress                   | bo'sh, bitta nuqta, ko'p                                                        |

## 4. Komponentlar — `packages/ui-web` (shadcn/ui asosida)

| Komponent                                  | Vazifa                       | Holatlar                                                                         |
| ------------------------------------------ | ---------------------------- | -------------------------------------------------------------------------------- |
| `AppLayout`, `SideNav`                     | chap menyu (ruxsatga qarab)  | to'liq/yig'ilgan, faol bo'lim, badge                                             |
| `CommandPalette`                           | `Ctrl+K`                     | qidiruv natijasi, amallar, bo'sh                                                 |
| `DataTable`                                | barcha ro'yxatlar (TanStack) | yuklanmoqda, bo'sh, xato, saralash, filtr, sahifalash (cursor), tanlash, eksport |
| `Form`, `Field`                            | RHF + Zod (`@lg/contracts`)  | xato (maydondan chiqqanda), disabled, yuborilmoqda                               |
| `MoneyInput`                               | W-13                         | avtomatik bo'shliq, raqamli, manfiy taqiqlangan                                  |
| `PhoneInput`                               | +998 maska                   | to'liq, xato                                                                     |
| `StudentPicker`                            | W-13 tez qidiruv             | natija, qarz ko'rinishi, topilmadi                                               |
| `Drawer` / `Dialog`                        | tafsilot / tasdiqlash        | ochiq, yuklanmoqda, xavfli amal                                                  |
| `KpiCard`                                  | W-04                         | qiymat, o'zgarish (↑↓), yuklanmoqda, xato                                        |
| `Chart` (ECharts)                          | W-26/27                      | bo'sh, ko'p seriya, eksport                                                      |
| `DiffView`                                 | W-30 audit                   | qo'shilgan/o'chgan/o'zgargan                                                     |
| `Toast`                                    | natija xabarlari             | muvaffaqiyat, xato, amal                                                         |
| `EmptyState`/`ErrorState`/`ForbiddenState` | 5 holat                      | ui-tg bilan bir xil matnlar (i18n)                                               |

## 5. Bot xabar shablonlari katalogi

Uslub — 11-ux §6: **sarlavha (emoji + qalin)** → 1–3 qator → tugma(lar). Matnlar `@lg/i18n`
(`botMessages` + T-109 dagi `notificationTemplates`), shablon kaliti = bildirishnoma turi.

| Kalit                   | Sarlavha                       | Mazmun                                     | Tugma (deep link)                  | Majburiy (o'chirib bo'lmaydi) |
| ----------------------- | ------------------------------ | ------------------------------------------ | ---------------------------------- | ----------------------------- |
| `start`                 | 👋 Xush kelibsiz               | qisqa tavsif                               | Ilovani ochish                     | —                             |
| `attendance.absent`     | ❌ {ism} darsga kelmadi        | kurs · guruh · vaqt                        | Batafsil (`les_`), Sababini yozish | ha (FR-RPT-4)                 |
| `attendance.late`       | ⏰ {ism} {n} daqiqa kech qoldi | kurs · guruh · vaqt                        | Batafsil (`les_`)                  | ha                            |
| `attendance.correction` | ✅ Tuzatish: {ism} darsda      | "Uzr, xatolik" (BR-31)                     | —                                  | ha                            |
| `grade.new`             | 📊 Yangi baho                  | fan · baho (kunlik yig'ma bo'lishi mumkin) | Natijalar (`res_`)                 | yo'q                          |
| `test.published`        | 📄 Test natijasi               | test · ball/maks                           | Ko'rish (`tst_`)                   | yo'q                          |
| `payment.receipt`       | 💳 To'lov qabul qilindi        | summa · oy · chek №                        | PDF chek                           | ha                            |
| `submission.pending`    | ⏳ Chek tekshirilmoqda         | summa (keyin shu xabar tahrirlanadi)       | Holat (`sub_`)                     | ha                            |
| `submission.confirmed`  | ✅ Chek tasdiqlandi            | summa + PDF                                | PDF chek                           | ha                            |
| `submission.rejected`   | ❌ Chek rad etildi             | sabab                                      | Qayta yuborish (`pay_`)            | ha                            |
| `billing.reminder`      | 💳 To'lov eslatmasi            | qarz · muddat (BR-21)                      | To'lash (`bil_`)                   | ha                            |
| `report.weekly`         | 📊 Haftalik hisobot            | davomat x/y · o'rtacha baho                | Ochish (`rep_`)                    | yo'q                          |
| `report.monthly`        | 📊 Oylik hisobot               | + PDF                                      | Ochish (`rep_`)                    | yo'q                          |
| `ticket.reply`          | 💬 Murojaatingizga javob       | javob matni                                | Ochish (`tik_`)                    | ha                            |
| `staff.submission_new`  | 💳 Yangi chek navbatda         | o'quvchi · summa                           | Navbat (`pay_q`)                   | —                             |
| `staff.approval`        | ⚖️ Tasdiqlash so'rovi          | tur · so'rovchi · sabab                    | inline Tasdiqlash / Rad etish      | —                             |
| `staff.login_confirm`   | 🔐 Web panelga kirish          | qurilma · vaqt                             | inline Tasdiqlash                  | —                             |
| `staff.session_reuse`   | ⚠️ Xavfsizlik ogohlantirishi   | "Barcha qurilmalardan chiqarildingiz"      | —                                  | —                             |
| `attendance.reminder`   | ⏰ Davomat belgilanmagan       | guruh · dars vaqti (FR-ATT-5)              | Belgilash (`att_`)                 | —                             |
