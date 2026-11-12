# Ekran maketlari (T-017c)

Maket = Storybook ekran story'lari (`apps/*/src/**/*.screen.stories.tsx`, `ui-tg`/`ui-web` komponentlaridan,
mock ma'lumot bilan) + shu papkadagi skrinshotlar. Maket kodi haqiqiy ekranda qayta ishlatiladi
(ekran vazifasi faqat API'ga ulaydi).

- Jonli ko'rish: `pnpm -F @lg/storybook dev` → http://localhost:6006 (toolbar: Light / Dark / Custom).
- Skrinshotlarni yangilash: `pnpm -F @lg/storybook screenshots`.
- Fayl nomi: `<holat>__<kenglik>-<tema>.png`. Asosiy holat — 360/390/430 px va desktop Telegram 600 px
  (light), 390 px dark va past kontrastli custom tema (fallback). Qolgan holatlar — 390 px light.
- Har ekranda 5 holat: `loading`, `empty`, `error`, `offline`, `forbidden` (+ ekranga xos holatlar).

## Qabul holati

| Qism | Ekranlar                                                  | Papka                                 | Holat                   |
| ---- | --------------------------------------------------------- | ------------------------------------- | ----------------------- |
| 1    | MT-01 Bugun, MT-02 Davomat, MT-03 Offline, MT-04/05 Guruh | `miniapp/ustoz-*`                     | ⏳ egasi ko'rib chiqadi |
| 1    | C-01…C-04 (kirish, rol tanlash, bog'lanmagan, sozlamalar) | haqiqiy ekran — T-009, `apps/miniapp` | ✅ qurilgan             |
| 2    | MT-06…MT-11, C-05                                         | —                                     | ⬜                      |
| 3    | MG-01…MG-10 (Ota-ona)                                     | —                                     | ⬜                      |
| 4    | MS-01…MS-05 (xodim rejimi)                                | —                                     | ⬜                      |
| 5–6  | W-01…W-35 (web panel; 1280/1440 px)                       | —                                     | ⬜                      |

## O'lchanadigan mezonlar (11-ux §5)

| Ssenariy                                  | Teginishlar                                                                          | Mezon  |
| ----------------------------------------- | ------------------------------------------------------------------------------------ | ------ |
| Ustoz 20 kishilik davomat (2 ta kelmagan) | bot eslatmasi yoki MT-01'da darsni ochish (1) + 2 qator (2) + MainButton (1) = **4** | ≤ 4 ✅ |
| Kech qolgan o'quvchi                      | uzoq bosish (1) + daqiqa tanlash (1) = 2 (klaviaturasiz)                             | —      |

MT-02 dagi baho ustuni (BR-33) baholar bilan birga — T-301 (F3) maketida qo'shiladi.
