# 10 — Ochiq savollar

> Faqat **dastur xatti-harakatiga** ta'sir qiladigan savollar. Har biriga standart taklif bor —
> javob kelmaguncha agentlar shu standart bilan ishlaydi (qiymatlar sozlamalarda o'zgartiriladigan qilib yoziladi).
> Javob berilgach: shu yerga yoziladi, tegishli hujjat yangilanadi, ⚠️ olib tashlanadi.

## Hal qilingan

| ID   | Savol                                                  | Javob                                                                                                                                            |
| ---- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q-06 | Texnik mas'ul (review, prod deploy tasdig'i, alertlar) | **Loyiha egasi (Sanjar)**                                                                                                                        |
| —    | Markaz holati                                          | Hali ochilmagan. Mavjud ma'lumot yo'q (import kerak emas). Dastur to'liq quriladi, keyin **birinchi real ustoz** bilan ishga tushiriladi (T-508) |

## Hujjatlar auditida hal qilingan (2026-11-11)

Ziddiyat yoki noaniqlik topilgan, standart qaror qabul qilinib tegishli hujjatga yozilgan. Egasi boshqacha xohlasa — shu qatorni o'zgartiradi, agent hujjat + kodni moslaydi.

| ID   | Muammo                                                                 | Qaror (qayerda yozilgan)                                                                  |
| ---- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Q-70 | Director'da `absence.notify` yo'q, Admin'da bor — "to'liq huquq"ga zid | Director ⊇ Admin; Director'ga berildi (02 §2, §4; `roles.ts`)                             |
| Q-71 | `payments`/`receipts` o'zgarmas, lekin `status` ustuni bor edi         | Holat ustuni yo'q; storno — yangi qator, chek bekor — `receipt_cancellations` (05, BR-19) |
| Q-72 | "Guruh hisob kuni" (FR-PAY-1) vs kalendar oyi (BR-2)                   | Kalendar oyi; sozlamada faqat to'lov muddati kuni (01, T-115)                             |
| Q-73 | Darslar 4 hafta oldinga — oy boshidagi invoice uchun yetmaydi          | Gorizont: ≥ 4 hafta va keyingi oy oxirigacha (FR-ORG-5, T-104)                            |
| Q-74 | Yaxlitlash va proporsiya formulalari aniq emas                         | Yagona `prorate()` (BR-38), BR-3/5/9/25 shu orqali                                        |
| Q-75 | Ustoz foizi `numeric(5,2)` — pul hisobida kasr                         | `percent_bp int` (bazis punkt) (05)                                                       |
| Q-76 | Bot domen modullarini import qiladimi yoki HTTP?                       | Ichki HTTP `/internal/*`; modullar faqat `apps/api` (03)                                  |
| Q-77 | `app.` va `api.` subdomenlar vs yo'l bo'yicha marshrut                 | Bitta host, yo'llar bilan (06 §1)                                                         |
| Q-78 | Maket (T-017c) formati                                                 | Storybook ekran story'lari + skrinshotlar (09 T-017c)                                     |
| Q-79 | Fayl yuklash moduli uchun vazifa yo'q edi                              | T-019 qo'shildi                                                                           |
| Q-80 | Coverage: 90% / 95% / 100% — uch xil                                   | domain ≥ 95%, umumiy ≥ 80% (00, 03, 07)                                                   |
| Q-81 | Fayl/funksiya hajmi "tavsiya"                                          | ESLint majburlaydi: fayl ≤ 300, funksiya ≤ 60 (07 §2)                                     |
| Q-82 | Integratsiya testlari: Testcontainers vs compose                       | Haqiqiy Postgres (lokal compose, CI service), har fayl o'z vaqtinchalik bazasi (07 §1)    |
| Q-83 | Roadmap F1 da "mavjud ma'lumot importi" — 10 ga zid                    | Olib tashlandi (08)                                                                       |
| Q-84 | Mini App sessiyasi (refresh token WebView'da)                          | initData → 15 daq access token, refresh yo'q (05, T-007)                                  |

## Egasidan kerak bo'ladigan ma'lumotlar (qaror emas — kirish ma'lumotlari)

Agent bular uchun **to'xtamaydi**: env o'zgaruvchi yoki sozlama sifatida yozadi, lokalda soxta qiymat bilan ishlaydi, PR tavsifida "egasidan kerak: X" deb belgilaydi. Kerak bo'ladigan vazifa yonida.

| Nima                                          | Qayerga               | Qachon kerak             |
| --------------------------------------------- | --------------------- | ------------------------ |
| Bot tokenlari (dev/staging/prod) — @BotFather | `.env` / SSM          | T-010 (dev), T-014       |
| AWS akkaunt, domen (Q-02), texnik chat (Q-04) | Terraform var / SSM   | T-012, T-016             |
| Karta rekvizitlari, markaz nomi, logotip      | Sozlamalar UI (T-115) | Real ishga tushirish     |
| Sentry/Grafana Cloud akkauntlari              | SSM                   | T-016                    |
| Chek shabloni uchun rasmiy ma'lumotlar        | Sozlamalar            | T-205 (standart shablon) |

## A. Infratuzilma

| ID   | Savol                                 | Taklif (standart)                       | Bloklaydi |
| ---- | ------------------------------------- | --------------------------------------- | --------- |
| Q-02 | Domen nomi                            | `legendarygroup.uz` (yoki egasi beradi) | T-012     |
| Q-04 | Texnik alertlar qaysi Telegram chatga | Egasining shaxsiy/texnik guruhi         | T-016     |

## B. Biznes qoidalari (04-business-rules.md'dagi ⚠️)

| ID   | Savol                                                                  | Taklif (standart)                                        | Bloklaydi |
| ---- | ---------------------------------------------------------------------- | -------------------------------------------------------- | --------- |
| Q-10 | To'lov muddati — oyning nechanchi sanasi?                              | 10-sana                                                  | T-202     |
| Q-11 | Oy o'rtasida qo'shilganda narx                                         | Proporsional, 1 000 so'mgacha pastga                     | T-201     |
| Q-12 | Oy o'rtasida ketganda qaytarish                                        | Yo'q, oy to'liq                                          | T-201     |
| Q-13 | Sababsiz qatnashmagan dars — narx kamaymaydi. Qo'shimcha pul jarimasi? | Narx kamaymaydi; pul jarimasi sozlamada, standart o'chiq | T-203     |
| Q-14 | Sababli qatnashmaganda narx                                            | Kamaymaydi; ≥ 2 hafta — muzlatish                        | T-203     |
| Q-15 | Kech qolish chegarasi; 3 kech = 1 qatnashmaslik?                       | 15 daq; qoida o'chiq                                     | T-111     |
| Q-16 | Markaz bekor qilgan dars                                               | Admin tanlaydi: kredit yoki qo'shimcha dars              | T-104     |
| Q-17 | Chegirmalar qo'shiladimi                                               | Yo'q, eng kattasi                                        | T-203     |
| Q-18 | Admin chegirma limiti                                                  | 10%, undan yuqori — Director tasdig'i so'rovi            | T-203     |
| Q-19 | "Kelmadi" xabari tuzatish oynasi                                       | 3 daqiqa                                                 | T-113     |
| Q-20 | Bir o'quvchi bir nechta guruhda                                        | Ha                                                       | T-202     |

## C. Ustoz oyligi

| ID   | Savol                                                | Taklif                                                             | Bloklaydi |
| ---- | ---------------------------------------------------- | ------------------------------------------------------------------ | --------- |
| Q-30 | Foiz bazasi: yig'ilgan yoki hisoblangan              | Yig'ilgan                                                          | T-401     |
| Q-31 | O'rinbosar darsi uchun kim qancha oladi              | Asosiy ustoz fiksi proporsional kamayadi, o'rinbosar dars stavkasi | T-401     |
| Q-32 | Oylik to'lash sanasi                                 | Keyingi oyning 5-sanasi                                            | T-402     |
| Q-33 | Ustoz oylik tafsilotida o'quvchi ismlarini ko'radimi | Ha, ism + summa (to'lov usulisiz)                                  | T-402     |

## D. Natijalar

| ID   | Savol                                    | Taklif                                 | Bloklaydi |
| ---- | ---------------------------------------- | -------------------------------------- | --------- |
| Q-40 | Baho shkalasi                            | Guruh bo'yicha sozlanadi, standart 5   | T-301     |
| Q-41 | Test Excel faylidan namuna               | Namuna asosida shablon yoziladi        | T-302     |
| Q-42 | Guruhdagi o'rin ota-onaga ko'rsatilsinmi | Yo'q (o'z natijasi + guruh o'rtachasi) | T-304     |

## E. Rollar va UI (yangi — [02](02-roles-permissions.md), [11](11-ux.md))

| ID   | Savol                                                                                    | Taklif                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Bloklaydi |
| ---- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Q-60 | Ustoz web panelga kiradimi yoki faqat Mini App?                                          | **Faqat Mini App** (Excel — botga fayl yuborib); web keyin kerak bo'lsa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | T-017a    |
| Q-61 | Bir nechta Director bo'lishi mumkinmi?                                                   | Ha, lekin oxirgi Director'ni o'chirib/bloklab bo'lmaydi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | T-008     |
| Q-62 | Yordamchi ustoz (assistant) nima qila oladi?                                             | Davomat + baho; test import, izoh, e'lon — faqat asosiy ustoz                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | T-008     |
| Q-63 | Ustoz o'quvchi ota-onasi telefonini ko'radimi?                                           | Yo'q (standart), Director yoqishi mumkin                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | T-114     |
| Q-64 | Ustoz guruhdan ketgandan keyin eski ma'lumotlarni ko'radimi?                             | Yo'q, faqat joriy guruhlar                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | T-008     |
| Q-65 | Admin Mini App'da ham ishlaydimi (tasdiqlash navbati telefonda)?                         | Ha — Mini App'da "xodim rejimi": navbat + bugungi holat                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | T-207     |
| Q-66 | Kurs/xonani arxivlash cheklovlari?                                                       | Arxivlash va qayta tiklash mumkin; faol nom takrorlanmaydi; faol guruhli kurs / kelajakdagi darsli xona arxivlanmaydi (T-103/T-104 — bajarildi)                                                                                                                                                                                                                                                                                                                                                                                                                                           | T-102     |
| Q-67 | O'quvchi kartochkasida ota-onaga qaysi maydonlar ko'rinadi?                              | Ichki maydonlar (manba, izoh) — yo'q; ikkinchi ota-ona telefoni — yo'q (faqat o'ziniki); qolgani — ha                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | T-105     |
| Q-68 | Dublikat o'quvchi qanday aniqlanadi?                                                     | Faol o'quvchilar ichida bir xil ism (normalizatsiya — registr/apostrof/bo'shliq farqsiz) + tug'ilgan sana → ogohlantirish (409), Admin tasdiqlasa — qo'shiladi; sanasiz — tekshirilmaydi                                                                                                                                                                                                                                                                                                                                                                                                  | T-105     |
| Q-69 | Guruh sig'imi xona sig'imidan oshsa? To'xtatilgan guruh xonani band qiladimi?            | Oshsa — rad (409, kattaroq xona yoki kamroq son); to'xtatilgan — band qiladi (qaytadi), yakunlangan — bo'shatadi                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | T-103     |
| Q-85 | Guruh sig'imi qanday hisoblanadi, kamaytirilsa nima bo'ladi?                             | Davrdagi bir vaqtdagi eng ko'p o'quvchi (rejalashtirilgan chiqish/kelish hisobga olinadi); sig'imni mavjud sondan kam qilish mumkin — hech kim chiqarilmaydi, yangi yozilish to'xtaydi                                                                                                                                                                                                                                                                                                                                                                                                    | T-106     |
| Q-86 | Darslar: qaysi guruhlarga generatsiya, bayram/pauza/o'tmish qanday?                      | `forming`/`active` guruhlarga, bugundan gorizontgacha (o'tmish va `done` o'zgarmaydi); to'xtatilgan/yakunlangan — kelajakdagi jadval darslari o'chiriladi. Bayram qo'shilsa: joriy oy darslari bekor (`holiday`, BR-5 kredit), keyingi oylar — o'chiriladi; olib tashlansa — qayta generatsiya. Jadval o'zgarishi oy o'rtasida — darslar o'chiriladi/qo'shiladi, invoice farqi oy yopilishida (T-203). O'tgan sanaga qo'shimcha/qoplovchi dars va bayram qo'yilmaydi; o'tgan darsni bekor qilish va o'rinbosar qo'yish mumkin. Qoplovchi dars — asl dars ustozi bilan                     | T-104     |
| Q-87 | Lidlar: holat oqimi, takror, aylantirishda telefon kimniki, saytdan ariza?               | Oqim: new → contacted/trial/lost, contacted → trial/lost, trial → contacted/lost, lost → new; `won` — faqat aylantirish. Bir telefonda bitta ochiq lid (409, mavjud lidga havola). Aylantirishda: ota-ona kiritilmasa lid telefoni — o'quvchiniki, kiritilsa — o'quvchi telefoni bo'sh. Saytdan ariza: IP 5/soat, telefon 3/kun, bot tuzog'i; ochiq lid bo'lsa yangisi yaratilmaydi, javob doim 202 (mavjudlik oshkor qilinmaydi). Lidga mas'ul — faqat Admin/Director                                                                                                                    | T-107     |
| Q-88 | Oylik hisobi: bir ustozda bir nechta shartnoma, avans oylikdan oshsa, qayta generatsiya? | Oyning kamida bir kunida amalda bo'lgan shartnomalar; guruhga bog'langan shartnoma — faqat o'sha guruh, umumiy — qolgan guruhlar (bir nechta umumiy bo'lsa — eng so'nggi `validFrom`). Ustoz guruhi — `role = 'main'` va tayinlov muddati dars/to'lov sanasini qamraydi. Net manfiy (avans > oylik) — ko'rsatiladi, tasdiqlash rad (`PAYROLL_NEGATIVE_NET`; Director avansni qisman qilib yoki bonus bilan tuzatadi). Qayta generatsiya faqat avtomatik qatorlarni almashtiradi — bonus/jarima saqlanadi. Storno: shu oy ichida — bazada yo'q; keyingi oyda — o'sha oy bazasidan ayriladi | T-401     |
