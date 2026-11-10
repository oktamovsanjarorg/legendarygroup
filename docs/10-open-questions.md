# 10 — Ochiq savollar

> Faqat **dastur xatti-harakatiga** ta'sir qiladigan savollar. Har biriga standart taklif bor —
> javob kelmaguncha agentlar shu standart bilan ishlaydi (qiymatlar sozlamalarda o'zgartiriladigan qilib yoziladi).
> Javob berilgach: shu yerga yoziladi, tegishli hujjat yangilanadi, ⚠️ olib tashlanadi.

## Hal qilingan

| ID   | Savol                                                  | Javob                                                                                                                                            |
| ---- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q-06 | Texnik mas'ul (review, prod deploy tasdig'i, alertlar) | **Loyiha egasi (Sanjar)**                                                                                                                        |
| —    | Markaz holati                                          | Hali ochilmagan. Mavjud ma'lumot yo'q (import kerak emas). Dastur to'liq quriladi, keyin **birinchi real ustoz** bilan ishga tushiriladi (T-508) |

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

| ID   | Savol                                                            | Taklif                                                                  | Bloklaydi |
| ---- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- | --------- |
| Q-60 | Ustoz web panelga kiradimi yoki faqat Mini App?                  | **Faqat Mini App** (Excel — botga fayl yuborib); web keyin kerak bo'lsa | T-017a    |
| Q-61 | Bir nechta Director bo'lishi mumkinmi?                           | Ha, lekin oxirgi Director'ni o'chirib/bloklab bo'lmaydi                 | T-008     |
| Q-62 | Yordamchi ustoz (assistant) nima qila oladi?                     | Davomat + baho; test import, izoh, e'lon — faqat asosiy ustoz           | T-008     |
| Q-63 | Ustoz o'quvchi ota-onasi telefonini ko'radimi?                   | Yo'q (standart), Director yoqishi mumkin                                | T-114     |
| Q-64 | Ustoz guruhdan ketgandan keyin eski ma'lumotlarni ko'radimi?     | Yo'q, faqat joriy guruhlar                                              | T-008     |
| Q-65 | Admin Mini App'da ham ishlaydimi (tasdiqlash navbati telefonda)? | Ha — Mini App'da "xodim rejimi": navbat + bugungi holat                 | T-207     |
