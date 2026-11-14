# 04 — Biznes qoidalari

> Bu fayldagi har bir qoida `BR-<raqam>` ID bilan. Kodda `packages/domain`da implementatsiya qilinadi
> va har bir qoida uchun alohida unit test bo'lishi shart (test nomida BR ID).
> ⚠️ belgisi — [10-open-questions.md](10-open-questions.md)da tasdiqlanishi kerak bo'lgan taxmin. Javob kelmaguncha ⚠️ qiymat **standart** sifatida ishlatiladi va sozlamada o'zgartiriladigan qilib yoziladi — agent to'xtamaydi.
>
> **Holat nomlari:** matndagi `PENDING_REVIEW`, `DRAFT` kabi katta harfli nomlar — faqat o'qish uchun. Kodda va DB'da barcha enum qiymatlari **kichik harf, snake_case** (`pending_review`, `draft`, `present`) va `packages/contracts`dagi `as const` massivlardan olinadi.
>
> **Yaxlitlash (umumiy, BR-38):** proporsional summa hamisha bitta domen funksiyasi orqali: `prorate(amount, part, total) = floor(amount × part / total)` (`bigint`, avval ko'paytirish, keyin bo'lish). `total = 0` bo'lsa natija 0. Natija hech qachon `amount`dan katta emas.

## A. Hisob (invoice) va oylik abonement

- **BR-1** To'lov modeli: **oylik abonement**. Har guruhning oylik narxi bor (`group.monthly_price`).
- **BR-2** Hisob davri — kalendar oyi (1-sanadan oxirigacha). **Oy yopish tartibi (qat'iy ketma-ketlik, bitta zanjir job):** 1) o'tgan oy yopiladi — jarimalar (BR-8), bekor qilingan darslar krediti (BR-5), muzlatish krediti (BR-9) hisoblanadi; 2) shundan keyingina yangi oy invoice'lari yaratiladi (**1-sana 00:05**). 1-qadam muvaffaqiyatsiz bo'lsa 2-qadam boshlanmaydi va alert yuboriladi. To'lov muddati — **⚠️ oyning 10-sanasi** (sozlanadi).
- **BR-3** Oy o'rtasida qo'shilgan o'quvchi: birinchi oy narxi **qolgan darslar soniga proporsional**:
  `prorate(narx, qo'shilgan sanadan oy oxirigacha rejalashtirilgan darslar, oydagi jami rejalashtirilgan darslar)`, so'ng **1 000 so'mga karrali qilib pastga** yaxlitlanadi ⚠️ (o'quvchi foydasiga). "Rejalashtirilgan" = `status <> 'cancelled'` darslar (bayramlar generatsiya qilinmaydi).
- **BR-4** Oy o'rtasida chiqib ketgan o'quvchi: shu oy uchun **to'liq** narx olinadi (qaytarish yo'q) ⚠️.
- **BR-5** Markaz tomonidan bekor qilingan dars (ustoz kasal, bayram, texnik sabab) **o'quvchidan undirilmaydi**: keyingi oy invoice'ida kredit (`prorate(narx, bekor qilingan darslar, oydagi jami rejalashtirilgan darslar)`) yoki qo'shimcha dars bilan qoplanadi (Admin tanlaydi; tanlanmasa oy yopilishida — kredit).
- **BR-6** Bir nechta guruhdagi o'quvchiga har guruh uchun alohida invoice qatori.

## B. Qatnashmaslik va jarima

- **BR-7** O'quvchi **sababsiz qatnashmagan** darslar uchun narx **kamaytirilmaydi** — abonement to'liq to'lanadi (qatnashmaslik o'quvchi zimmasida).
- **BR-8** **Jarima (ixtiyoriy, sozlanadi):** oy davomida sababsiz qatnashmagan darslar soni `N`dan oshsa (standart ⚠️ `N = 3`), har bir ortiqcha qoldirilgan dars uchun `X` so'm (standart ⚠️ `X = 0`, ya'ni o'chirilgan) yoki ota-onaga ogohlantirish. Jarima keyingi oy invoice'iga alohida qator sifatida qo'shiladi, Admin bekor qila oladi (sabab bilan, audit).
- **BR-9** **Sababli** qatnashmaslik (oldindan xabar berilgan yoki Admin tasdiqlagan — kasallik, ma'lumotnoma): jarimaga sanalmaydi, lekin abonement baribir kamaymaydi ⚠️. Uzoq muddatli sababli (≥ 2 hafta, masalan kasalxona) — Admin "muzlatish" (freeze) qiladi: kredit = `prorate(narx, muzlatilgan davrga tushgan rejalashtirilgan darslar, oydagi jami rejalashtirilgan darslar)`, har oy uchun alohida hisoblanadi.
- **BR-10** **Kech qolish:** `≥ 15 daqiqa` ⚠️ kech qolish ota-onaga xabar qilinadi; 3 ta kech qolish = 1 sababsiz qatnashmaslik (jarima hisobi uchun) ⚠️.

## C. To'lovlar

- **BR-11** To'lov usullari: `cash` (naqd), `card_terminal` (markazdagi terminal), `transfer` (ota-ona kartaga o'tkazdi — chek bilan), `other`.
- **BR-12** To'lov **avval eng eski ochiq qarzga** taqsimlanadi (FIFO), Admin qo'lda boshqa taqsimlashni tanlashi mumkin. Ortiqcha summa — o'quvchi balansiga (avans).
- **BR-13** **O'tkazma chekini tasdiqlash oqimi:**
  ```
  ota-ona yubordi → pending_review ──(Admin tasdiqladi)──► confirmed → ledger'ga kredit → PDF chek → ota-onaga
                                   └─(Admin rad etdi + sabab)──► rejected → ota-onaga sabab
  pending_review 24 soat ichida ko'rilmasa → Director'ga eslatma
  ```
  Admin tasdiqlashda summani o'zgartirishi mumkin (chekdagi haqiqiy summa bo'yicha); o'zgarish audit'ga yoziladi.
- **BR-14** Tasdiqlashdan oldin Admin bank ilovasida tushumni tekshirishi kerak (UI'da eslatma). Tasdiqlagan Admin ismi chekda va audit'da.
- **BR-15** Dublikat: bir xil rasm hash'i yoki (bir xil summa + 10 daqiqa ichida + bir o'quvchi) — ogohlantirish, bloklamaydi.
- **BR-16** Storno: to'lov o'chirilmaydi, teskari ledger yozuvi yaratiladi. Admin — faqat shu kuni kiritilgan to'lovni; undan keyin — faqat Director.
- **BR-17** Refund (pulni qaytarish) — faqat Director, sabab majburiy, ledger'da debet.
- **BR-18** Chegirma turlari: foiz (doimiy, enrollment'ga bog'liq), summa (bir martalik). Bir nechta chegirma qo'shilmaydi — invoice qatori uchun **so'mdagi qiymati eng katta** bo'lgani qo'llanadi ⚠️. Admin limiti — 10% (sozlanadi), undan katta — Director (T-119 so'rovi). Summa chegirmasi uchun limit: `summa ≤ prorate(qator narxi, limit%, 100)`. Foiz — butun son 0–100.
- **BR-19** Chek raqami: `LG-{YYYY}-{6 xonali ketma-ket}`, `receipt_counters(year)` qatorini tranzaksiya ichida `UPDATE ... SET last = last + 1 RETURNING last` bilan oladi (har yil 000001 dan, takrorlanmaydi). `receipts` qatori o'zgarmaydi (UPDATE yo'q); storno bo'lsa `receipt_cancellations` yozuvi qo'shiladi va chek "BEKOR QILINGAN" ko'rinadi (holat hisoblanadi).

## D. Qarzdorlik

- **BR-20** Qarz = ledger yig'indisi musbat bo'lsa (ishora qoidasi — [05-data-model.md](05-data-model.md) `ledger_entries`). "Muddati o'tgan qarz" — to'lov muddati o'tgan invoice qatorlarining to'lanmagan qismi.
- **BR-21** Eslatmalar: muddatdan 3 kun oldin, muddat kuni, +3 kun, +7 kun. Keyin — haftada 1 marta. Ota-ona bildirishnomani o'chira olmaydi.
- **BR-22** Qarz `≥ 1 oylik narx` va muddatdan `≥ 14 kun` o'tsa ⚠️ — Admin dashboard'ida "kritik" belgisi (avtomatik guruhdan chiqarilmaydi — qaror inson tomonidan).

## E. Ustoz oyligi

- **BR-23** Shartnoma turlari:
  - `FIXED`: oyiga `F` so'm;
  - `PERCENT`: guruh(lar)dan tushgan summadan `P%`;
  - `MIXED`: `F + P%`;
  - qo'shimcha: `PER_LESSON` stavka — o'rinbosar sifatida o'tilgan darslar uchun.
- **BR-24** Foiz bazasi (standart): ustoz guruhlari invoice'lariga **taqsimlangan** to'lovlar ⚠️. Hisob oyi yopilgandan (`APPROVED`) keyin o'tgan oy qarzi to'lansa — u o'sha yopilgan hisobni o'zgartirmaydi, balki **joriy ochiq hisobga** "o'tgan davr tuzatishi (YYYY-MM)" qatori sifatida qo'shiladi (BR-27 bilan mos). Muqobil (sozlama): hisoblangan summa.
- **BR-25** Ustoz o'tmagan dars (o'rinbosar o'tgan): fiks qism `F − prorate(F, o'rinbosar o'tgan darslar, rejalashtirilgan darslar)` bo'ladi, o'rinbosar `PER_LESSON` oladi ⚠️.
- **BR-26** Jarima/bonus — Director qo'lda, sabab bilan.
- **BR-27** Oylik hisob holatlari: `DRAFT → APPROVED → PAID`. `APPROVED`dan keyin o'zgartirish — faqat tuzatish yozuvi (keyingi oyga).
- **BR-28** Avans — keyingi hisobdan avtomatik ushlanadi.

## F. Davomat

- **BR-29** Davomat holatlari: `PRESENT`, `ABSENT`, `LATE(daqiqa)`, `EXCUSED`.
- **BR-30** Ustoz o'zgartirishi mumkin — dars kuni 23:59 gacha. Keyin — Admin, sabab bilan.
- **BR-31** "Kelmadi/kech qoldi" xabari davomat saqlangandan keyin **3 daqiqalik tuzatish oynasi** o'tgach yuboriladi (ustoz xatoni tuzatishga ulguradi; oyna ichida "keldi"ga o'zgarsa — xabar bekor). Oynadan keyingi tuzatishda — tuzatish xabari ("Uzr, xatolik: farzandingiz darsda"). Jami kechikish ≤ 5 daqiqa ⚠️ (Q-19).
- **BR-32** Enrollment sanasidan oldingi va chiqib ketgandan keyingi darslarda o'quvchi ro'yxatda ko'rinmaydi.

## G. Baholar va testlar

- **BR-33** Guruh sozlamasi: baho shkalasi (`0–5` standart, yoki `0–100`), baholanadigan turlar (uy vazifasi, faollik).
- **BR-34** Test bali `0..max_score`; foiz = ball / max × 100.
- **BR-35** Excel import: o'quvchi moslashtirish tartibi — 1) o'quvchi ID ustuni bo'lsa, 2) F.I.Sh aniq mosligi guruh ichida, 3) noaniq moslik (fuzzy) — faqat taklif, inson tasdiqlaydi. Topilmagan qator import qilinmaydi va hisobotda ko'rsatiladi. Import atomar (hammasi yoki hech biri), qayta import — mavjud natijalarni yangilaydi (versiya saqlanadi).

- **BR-37** Ustoz baho va izohni dars kuni + 3 kun ichida (oxirgi kun 23:59 gacha) yozadi/tahrirlaydi; keyin — faqat Admin, sabab bilan (audit).

## H. Churn risk (v1 qoidaviy model)

- **BR-36** Ball 0–100, komponentlari (og'irliklar sozlanadi):
  - oxirgi 4 hafta davomat % pasayishi (40%)
  - to'lov kechikishi kunlari (30%)
  - baho tendensiyasi pasayishi (20%)
  - ota-ona botni bloklagan / javob bermaydi (10%)
  - ≥ 60 — "xavfli", haftalik Director xulosasida.
