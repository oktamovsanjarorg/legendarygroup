# Ekran maketlari (T-017c)

Maket = Storybook ekran story'lari (`apps/*/src/**/*.screen.stories.tsx`, `ui-tg`/`ui-web` komponentlaridan,
mock ma'lumot bilan) + shu papkadagi skrinshotlar. Maket kodi haqiqiy ekranda qayta ishlatiladi
(ekran vazifasi faqat API'ga ulaydi).

- Jonli ko'rish: `pnpm -F @lg/storybook dev` → http://localhost:6006 (toolbar: Light / Dark / Custom).
- Skrinshotlarni yangilash: `pnpm -F @lg/storybook screenshots`.
- Asosiy holat story'da `tags: ['primary']` bilan belgilanadi.
- Web: asosiy holat 1280 va 1440 px (light) + 1440 dark; qolgani 1280 px. Ramka — haqiqiy `AppShell`, menyu — yakuniy (to'liq) ko'rinishda.
- Fayl nomi: `<holat>__<kenglik>-<tema>.png`. Asosiy holat — 360/390/430 px va desktop Telegram 600 px
  (light), 390 px dark va past kontrastli custom tema (fallback). Qolgan holatlar — 390 px light.
- Har ekranda 5 holat: `loading`, `empty`, `error`, `offline`, `forbidden` (+ ekranga xos holatlar).

## Qabul holati

| Qism | Ekranlar                                                                                                                                                               | Papka                                 | Holat                   |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------- |
| 1    | MT-01 Bugun, MT-02 Davomat, MT-03 Offline, MT-04/05 Guruh                                                                                                              | `miniapp/ustoz-*`                     | ⏳ egasi ko'rib chiqadi |
| 1    | C-01…C-04 (kirish, rol tanlash, bog'lanmagan, sozlamalar)                                                                                                              | haqiqiy ekran — T-009, `apps/miniapp` | ✅ qurilgan             |
| 2    | MT-06…MT-11, C-05                                                                                                                                                      | —                                     | ⬜                      |
| 3    | MG-01 Asosiy, MG-02…04 Natijalar/test/hisobot, MG-05…07 Toʻlovlar/chek, MG-08…11 Koʻproq                                                                               | `miniapp/ota-ona-*`                   | ⏳ egasi ko'rib chiqadi |
| 4    | MS-01 Bugun (KPI), MS-02 Chek navbati, MS-03 Soʻrovlar, MS-04 Qidiruv, MS-05 Kartochka                                                                                 | `miniapp/xodim-ms-01-05`              | ⏳ egasi ko'rib chiqadi |
| 5a   | W-04 Bosh sahifa, W-05/06 Oʻquvchilar, W-07 Bogʻlanish, W-08 Lidlar, W-09 Kurslar, W-10 Guruhlar, W-11 Jadval, W-12 Davomat, W-28 Xodimlar, W-29 Sozlamalar, W-33 Usta | `web/f1-*`                            | ⏳ egasi ko'rib chiqadi |
| —    | W-01…W-03, W-32 (kirish, TOTP, taklif, sessiyalar)                                                                                                                     | haqiqiy ekran — T-009, `apps/web`     | ✅ qurilgan             |
| 5b   | W-13…W-18, W-31, W-34 (toʻlovlar)                                                                                                                                      | —                                     | ⬜                      |
| 6    | W-19…W-27, W-30, W-35 (natijalar, moliya, hisobotlar, audit, landing)                                                                                                  | —                                     | ⬜                      |

## O'lchanadigan mezonlar (11-ux §5)

| Ssenariy                                  | Teginishlar                                                                          | Mezon  |
| ----------------------------------------- | ------------------------------------------------------------------------------------ | ------ |
| Ustoz 20 kishilik davomat (2 ta kelmagan) | bot eslatmasi yoki MT-01'da darsni ochish (1) + 2 qator (2) + MainButton (1) = **4** | ≤ 4 ✅ |
| Kech qolgan o'quvchi                      | uzoq bosish (1) + daqiqa tanlash (1) = 2 (klaviaturasiz)                             | —      |

MT-02 dagi baho ustuni (BR-33) baholar bilan birga — T-301 (F3) maketida qo'shiladi.
