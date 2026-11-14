# 01 — Funksional talablar

Har bir talab ID'ga ega (`FR-<modul>-<raqam>`). Vazifalar ([09-tasks.md](09-tasks.md)) shu ID'larga havola qiladi.

---

## AUTH — Kirish va identifikatsiya

- **FR-AUTH-1** Ota-ona botga `/start` bosadi → "Telefon raqamni ulashish" tugmasi (Telegram contact) → raqam bazadagi ota-ona raqami bilan mos kelsa, akkaunt bog'lanadi. Mos kelmasa — "Markaz administratoriga murojaat qiling" + admin'ga so'rov tushadi.
- **FR-AUTH-2** Mini App har ochilishda `initData` server tomonda HMAC bilan tekshiriladi (bot token), `auth_date` 24 soatdan eski bo'lsa rad etiladi.
- **FR-AUTH-3** Web panel: login (telefon) + parol, Director/Admin uchun majburiy 2FA (TOTP). Muqobil: "Telegram orqali kirish" (bot bir martalik tasdiq yuboradi).
- **FR-AUTH-4** JWT access (15 daq) + refresh token (30 kun, rotatsiya, httpOnly cookie, qayta ishlatilsa — barcha sessiyalar bekor).
- **FR-AUTH-5** Bir foydalanuvchi bir nechta rolga ega bo'lishi mumkin (masalan Ustoz ham Ota-ona). Mini App rol tanlash ekrani.
- **FR-AUTH-6** Bitta ota-onada bir nechta farzand; bitta farzandda bir nechta ota-ona (ota, ona).
- **FR-AUTH-7** Sessiyalar ro'yxati va "barcha qurilmalardan chiqish".

## ORG — Tashkiliy tuzilma

- **FR-ORG-1** Kurslar (fan/yo'nalish): nomi, darajalar, standart oylik narxi, dars davomiyligi.
- **FR-ORG-2** Xonalar: nomi, sig'imi.
- **FR-ORG-3** Guruhlar: kurs, ustoz(lar), xona, hafta kunlari + vaqt, boshlanish/tugash sanasi, narx (kursdan meros, o'zgartirish mumkin), maks. o'quvchi soni, holat (yig'ilmoqda / faol / to'xtatilgan / yakunlangan).
- **FR-ORG-4** Jadval to'qnashuvini tekshirish: bir xona yoki bir ustoz bir vaqtda ikki guruhda bo'la olmaydi.
- **FR-ORG-5** Dars (lesson) yozuvlari jadval asosida avtomatik generatsiya qilinadi (gorizont: kamida 4 hafta **va** keyingi kalendar oyining oxirigacha — oy boshidagi invoice butun oy darslarini bilishi shart, BR-3/BR-5), bekor qilish / ko'chirish / qo'shimcha dars qo'shish mumkin. Bayram kunlari kalendari.
- **FR-ORG-6** Ustoz almashtirish (vaqtincha — bitta dars uchun; doimiy — sanadan boshlab).

## STU — O'quvchilar

- **FR-STU-1** O'quvchi kartochkasi: F.I.Sh, tug'ilgan sana, jinsi, telefon (ixtiyoriy), maktab/sinf, manba (qayerdan eshitgan), izoh, rasm.
- **FR-STU-2** Ota-ona(lar) bog'lash: F.I.Sh, telefon (asosiy), qarindoshlik.
- **FR-STU-3** Guruhga qo'shish (enrollment) sanasi bilan; guruhdan chiqarish sababi bilan (ketdi / ko'chirildi / tugatdi). Tarix saqlanadi.
- **FR-STU-4** Lid (potensial o'quvchi) ro'yxati: sinov darsi, holat (yangi / qo'ng'iroq qilindi / sinovga keldi / yozildi / rad etdi). Konversiya statistikasi.
- **FR-STU-5** Qidiruv: ism, telefon, guruh bo'yicha; filtrlar (qarzdor, faol, arxiv).
- **FR-STU-6** O'quvchi o'chirilmaydi — faqat arxivlanadi (soft delete).

## ATT — Davomat

- **FR-ATT-1** Ustoz Mini App'da bugungi darslarini ko'radi → guruh → ro'yxat; har o'quvchi uchun: ✅ keldi / ❌ kelmadi / ⏰ kech qoldi (daqiqa) / 📝 sababli.
- **FR-ATT-2** Standart holat "keldi" — ustoz faqat istisnolarni bosadi (tezlik uchun).
- **FR-ATT-3** Davomat saqlangach, "kelmadi" va "kech qoldi" (≥ 15 daq, sozlanadi — BR-10) bo'yicha ota-onaga bot xabari — 3 daqiqalik tuzatish oynasidan keyin, jami ≤ 5 daqiqa (BR-31).
- **FR-ATT-4** Davomatni tahrirlash: ustoz — dars kuni oxirigacha; keyin faqat Admin (sabab bilan, audit'ga yoziladi).
- **FR-ATT-5** Dars boshlanganidan 30 daqiqa o'tib davomat belgilanmasa — ustozga eslatma, 2 soatdan keyin — Admin'ga.
- **FR-ATT-6** Offline chidamlilik: internet uzilsa, Mini App davomatni lokal saqlaydi va tarmoq qaytganda yuboradi (idempotent kalit bilan).
- **FR-ATT-7** Ota-ona "sababli" deb oldindan xabar berishi mumkin (bot: "Farzandim ertaga kela olmaydi" + sabab) → ustoz ro'yxatida ko'rinadi.

## GRD — Natijalar (baholash)

- **FR-GRD-1** Har dars uchun baho (sozlanadigan shkala; standart 0–5 yoki 0–100) — turlari: uy vazifasi, darsdagi faollik (guruh sozlamasida qaysilari yoqilgani).
- **FR-GRD-2** Ustoz izohi — o'quvchi bo'yicha matnli fikr (dars yoki oy bo'yicha). Ota-onaga ko'rinadigan / ichki (faqat xodimlar) belgisi.
- **FR-GRD-3** Testlar: test yaratish (nomi, sana, guruh, maks. ball, bo'limlar).
- **FR-GRD-4** **Excel import**: `.xlsx` yuklash → ustunlarni moslashtirish (o'quvchi ismi/ID, ball, bo'limlar) → oldindan ko'rish → xatolar (topilmagan o'quvchi, noto'g'ri ball) ko'rsatiladi → tasdiqlash. Namuna shablon yuklab olish. Moslashtirish sozlamasi keyingi importlar uchun eslab qolinadi.
- **FR-GRD-5** Guruh reytingi, o'quvchi progress grafigi.
- **FR-GRD-6** Test natijasi e'lon qilinganda ota-onaga xabar.

## PAY — To'lovlar

- **FR-PAY-1** Har kalendar oyining 1-sanasida har faol o'quvchiga **hisob (invoice)** avtomatik yaratiladi (alohida "guruh hisob kuni" yo'q — BR-2) — qoidalar [04-business-rules.md](04-business-rules.md).
- **FR-PAY-2** Admin to'lov kiritadi: o'quvchi, summa, usul (naqd / terminal karta / o'tkazma), qaysi oy(lar) uchun, izoh. Saqlangach PDF chek generatsiya qilinadi va ota-onaga botda yuboriladi.
- **FR-PAY-3** **O'tkazma orqali to'lov (ota-ona tomondan):** bot/Mini App'da "To'lov qilish" → markaz karta rekvizitlari ko'rsatiladi (nusxalash tugmasi bilan) → ota-ona Click/Uzum/Payme ilovasidan o'tkazadi → chek skrinshoti/PDF + summa + izoh yuboradi → holat "Tekshirilmoqda" → Admin navbatida paydo bo'ladi.
- **FR-PAY-4** Admin tasdiqlash navbati: rasm, summa, o'quvchi, izoh; tugmalar **Tasdiqlash** (summani tahrirlash mumkin) / **Rad etish** (sabab majburiy). Natija ota-onaga xabar qilinadi; tasdiqlansa — rasmiy PDF chek.
- **FR-PAY-5** Dublikat chekdan himoya: rasm hash'i (perceptual hash) + summa + vaqt bo'yicha o'xshash yuborilgan chek ogohlantiradi.
- **FR-PAY-6** Qisman to'lov, oldindan to'lov (balansga), qaytarish (refund — faqat Director ruxsati bilan), chegirma (doimiy % yoki bir martalik, sabab bilan; masalan aka-uka chegirmasi).
- **FR-PAY-7** Qarzdorlar ro'yxati, avtomatik eslatmalar: to'lov muddatidan 3 kun oldin, muddat kuni, 3/7 kun o'tganda.
- **FR-PAY-8** Chek raqami ketma-ket va o'zgarmas (`LG-2026-000123`), chekda QR kod — tekshirish sahifasiga (haqiqiyligini tasdiqlash).
- **FR-PAY-9** To'lov yozuvi o'chirilmaydi — faqat "bekor qilish" (storno) yozuvi bilan, sabab va audit.
- **FR-PAY-10** Kassa: kunlik yopish (naqd summa sanaladi va tizimdagi bilan solishtiriladi).

## SAL — Ustoz oyligi

- **FR-SAL-1** Ustoz shartnomasi (har ustoz yoki ustoz×guruh darajasida): **fiks** (oyiga X so'm), **foiz** (guruh to'lovlaridan Y%), **aralash** (X + Y%), qo'shimcha: dars uchun stavka (o'rinbosar darslar uchun).
- **FR-SAL-2** Foiz bazasi sozlanadi: _yig'ilgan_ to'lovlar (standart) yoki _hisoblangan_ summa.
- **FR-SAL-3** Oy yakunida hisob-kitob: qoralama → Director ko'rib chiqadi → bonus/jarima qo'shadi → tasdiqlaydi → "to'landi" belgisi. Har qatorning tafsiloti (qaysi o'quvchidan qancha).
- **FR-SAL-4** Ustoz o'z hisob-kitobini Mini App'da ko'radi (faqat o'zinikini).
- **FR-SAL-5** Avans berish va keyingi hisobda ushlab qolish.

## FIN — Moliya

- **FR-FIN-1** Xarajatlar: kategoriya (ijara, kommunal, reklama, oylik, boshqa), summa, sana, izoh, chek rasmi.
- **FR-FIN-2** Foyda-zarar (P&L) oy bo'yicha.
- **FR-FIN-3** Moliyaviy ma'lumotlar faqat Director (va ruxsat berilgan Admin) uchun.

## RPT — Ota-onaga hisobotlar va bildirishnomalar

- **FR-RPT-1** Darhol: kelmadi, kech qoldi, baho (ixtiyoriy, sozlanadi), to'lov tasdiqlandi/rad etildi, chek, test natijasi.
- **FR-RPT-2** Haftalik (yakshanba 19:00): har farzand bo'yicha — davomat (x/y), o'rtacha baho, ustoz izohlari, to'lov holati.
- **FR-RPT-3** Oylik (oy oxiri): yuqoridagilar + test natijalari, guruhdagi o'rni (ixtiyoriy), dinamika grafigi (rasm yoki Mini App havolasi), PDF versiya.
- **FR-RPT-4** Ota-ona bildirishnoma sozlamalari (qaysi xabarlar kelsin); "kelmadi" va to'lov xabarlarini o'chirib bo'lmaydi.
- **FR-RPT-5** Ommaviy e'lon: Admin/Director tanlangan guruh(lar) ota-onalariga xabar yuboradi (rasm/fayl bilan), yetkazilish statistikasi.
- **FR-RPT-6** Telegram cheklovlariga rioya: navbat orqali yuborish (umumiy ≤ 25 xabar/s, bitta chatga ≤ 1 xabar/s), bot bloklangan bo'lsa — belgilanadi va Admin'ga ko'rsatiladi.
- **FR-RPT-7** Ota-onadan murojaat (bot orqali savol) → Admin'ga ticket; javob botga qaytadi.

## DASH — Statistika, prognoz, monitoring

- **FR-DASH-1** Director bosh sahifasi: bugungi/oylik tushum, qarz jami, faol o'quvchilar, davomat %, yangi/ketgan o'quvchilar, to'lov tasdiqlash navbati soni.
- **FR-DASH-2** Hisobotlar: daromad (oy, kurs, guruh, ustoz bo'yicha), qarzdorlik yoshi (aging), davomat (guruh/ustoz), o'quvchi oqimi (cohort), lid konversiyasi, ustoz samaradorligi (davomat, o'quvchi saqlash, natija o'sishi).
- **FR-DASH-3** **Prognozlar:**
  - keyingi 1–3 oy tushum prognozi (faol enrollment × narx × tarixiy yig'ilish koeffitsienti);
  - **ketish xavfi (churn risk)** — davomat pasayishi, kech to'lov, baho pasayishi asosida ball (0–100), "xavfli o'quvchilar" ro'yxati;
  - qarzni undirish ehtimoli;
  - guruh to'lishi prognozi.
  - v1 — qoidaviy/statistik model (izohlanadigan); v2 — ML (yetarli tarix to'plangach).
- **FR-DASH-4** Excel/PDF eksport har bir hisobotdan.
- **FR-DASH-5** Mini App'da Director uchun ixcham dashboard.

## AUD — Administrator nazorati

- **FR-AUD-1** Audit jurnali: har bir o'zgarish (kim, qachon, qaysi obyekt, oldingi/yangi qiymat, IP/qurilma). O'zgartirib/o'chirib bo'lmaydi.
- **FR-AUD-2** Director audit'ni filtrlab ko'radi; "shubhali harakatlar": to'lovni bekor qilish, chegirma, davomatni kechiktirib o'zgartirish, tunda kirish.
- **FR-AUD-3** Xodim faolligi: kim nechta to'lov kiritdi, tasdiqlash o'rtacha vaqti.

## SYS — Tizim

- **FR-SYS-1** Sozlamalar: markaz nomi, logotip, karta rekvizitlari, chek shabloni, to'lov muddati kuni (standart 10), jarima qoidalari, bildirishnoma vaqtlari, bayramlar.
- **FR-SYS-2** Fayllar (chek rasmlari, PDF, Excel) S3'da, havolalar vaqtinchalik (presigned URL).
- **FR-SYS-3** Barcha vaqtlar `Asia/Tashkent`; pul — butun so'm (`bigint`, tiyinsiz), formatlash `1 250 000 soʻm` (ming ajratuvchi — U+00A0, so'z — `soʻm` U+02BB bilan).
- **FR-SYS-4** Ommaviy veb-sayt (landing): markaz haqida, kurslar, "yozilish" formasi → lid. (Faza 4)
