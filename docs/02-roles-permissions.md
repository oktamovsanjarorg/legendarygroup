# 02 — Rollar va ruxsatlar (RBAC + siyosatlar)

## 1. Model

Ruxsat tekshiruvi **uch qatlamli**, har so'rovda uchalasi ham o'tishi shart:

```
1. RBAC (permission)   — "bu rol umuman shu amalni qila oladimi?"        → guard: @RequirePermission('payment.confirm')
2. Scope (obyekt)      — "aynan shu obyektga (guruh, o'quvchi) tegishlimi?" → service: scope.assertGroup(user, groupId)
3. Policy (qoida)      — "hozir, shu holatda ruxsat etiladimi?"            → domain: canEditAttendance(lesson, user, now)
                          (vaqt chegarasi, summa limiti, holat)
```

- **Deny by default.** Ruxsat katalogida yo'q amal — taqiqlangan. Har endpoint'da `@RequirePermission` bo'lmasa CI testi yiqiladi.
- **Faol rol (active role).** Bir nechta rolga ega foydalanuvchi (masalan Ustoz + Ota-ona) bir vaqtda **bitta rolda** ishlaydi; ruxsatlar birlashtirilmaydi. Rol almashtirish — Mini App/web'da bir tegish. Sabab: huquqlar aralashib ketmasligi va interfeys chalkashmasligi.
- **Ruxsat o'zgarsa darhol kuchga kiradi:** foydalanuvchining `permissions_version` raqami oshiriladi, keyingi so'rovda kesh yangilanadi (token muddatini kutmaydi). Bloklangan xodimning barcha sessiyalari darhol bekor qilinadi.
- **Ruxsat yetmasa — "so'rov" oqimi.** Admin limitdan oshadigan amalni (katta chegirma, eski to'lov stornosi) shunchaki qila olmaydi — **tasdiqlash so'rovi** yaratadi → Director botda/Mini App'da "Tasdiqlash / Rad etish" → amal avtomatik bajariladi (§5).

## 2. Rollar

| Rol      | Kod        | Izoh                                                                                                                                                                                                      |
| -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Director | `director` | To'liq huquq. Bir nechta bo'lishi mumkin; **oxirgi faol Director'ni o'chirib/bloklab/rolini olib bo'lmaydi**. Birinchi Director — o'rnatishda CLI buyrug'i bilan yaratiladi (`pnpm cli director:create`). |
| Admin    | `admin`    | Kundalik operatsiyalar. Director qo'shimcha ruxsat bera oladi (faqat §4 dagi "delegatsiya qilinadigan" ro'yxatdan).                                                                                       |
| Ustoz    | `teacher`  | Guruhdagi o'rni bo'yicha: **asosiy** (`main`) yoki **yordamchi** (`assistant`). Vaqtincha **o'rinbosar** (`substitute`) — faqat o'sha dars uchun.                                                         |
| Ota-ona  | `guardian` | Faqat o'z farzand(lar)i.                                                                                                                                                                                  |

## 3. Scope (obyekt darajasidagi chegaralar)

| Rol                      | Ko'ra oladigan obyektlar                                                                                                                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Director, Admin          | Hammasi (filial: hozircha bitta)                                                                                                                                                                                                 |
| Ustoz — asosiy/yordamchi | `group_teachers`da **hozirgi sanada faol** bo'lgan guruhlari, ularning darslari va o'sha guruhga **hozir yozilgan** o'quvchilari. Guruhdan ketgan ustoz eski ma'lumotni ko'rmaydi (Q-64).                                        |
| Ustoz — o'rinbosar       | Faqat o'zi o'rinbosar qilib qo'yilgan **dars(lar)** va shu darsdagi o'quvchilar ro'yxati; dars kuni tugagach kirish yopiladi.                                                                                                    |
| Ota-ona                  | `student_guardians` orqali bog'langan farzandlari. Farzand guruhdan chiqsa yoki arxivlansa ham — **uning tarixi, balansi va qarzi ko'rinadi** (qarzni to'lash uchun kerak). Ota-ona bog'lanishi uzilsa — kirish darhol yopiladi. |

**Ma'lumot maydonlari darajasidagi ko'rinish (field-level):**

| Maydon                      | Director | Admin |                Ustoz                |   Ota-ona    |
| --------------------------- | :------: | :---: | :---------------------------------: | :----------: |
| Ota-ona telefoni            |    ✅    |  ✅   | ❌ (Director yoqishi mumkin — Q-63) |   o'ziniki   |
| Ustoz izohi `internal`      |    ✅    |  ✅   |           ✅ (o'z guruhi)           |      ❌      |
| O'quvchi to'lov/qarz holati |    ✅    |  ✅   |                 ❌                  | o'z farzandi |
| Ustoz oyligi                |    ✅    |  ❌   |              o'ziniki               |      ❌      |
| Chegirma sababi             |    ✅    |  ✅   |                 ❌                  |      ❌      |
| Audit jurnali               |    ✅    |  ❌   |                 ❌                  |      ❌      |

Field-level filtr API javobini shakllantirishda (serializer) qo'llanadi — UI'da yashirish yetarli emas.

## 4. Ruxsatlar katalogi

Kanonik ro'yxat — `packages/contracts/src/permissions.ts` (bitta joy). Quyidagi jadval undan generatsiya qilinadi va **CI testi shu matritsani avtomatik tekshiradi** (har rol × har ruxsat: kutilgan natija).

Belgilar: ✅ ruxsat · 🔸 scope bilan · 🟡 policy bilan (shart §6) · ⬆️ so'rov orqali (Director tasdig'i) · ❌ yo'q · **D** — Admin'ga delegatsiya qilinadi

| Ruxsat kodi              | Tavsif                                             | Director |            Admin             |               Ustoz                |                Ota-ona                 |
| ------------------------ | -------------------------------------------------- | :------: | :--------------------------: | :--------------------------------: | :------------------------------------: |
| **Xodimlar va tizim**    |                                                    |          |                              |                                    |
| `staff.manage`           | Admin/Ustoz qo'shish, bloklash                     |    ✅    |              ❌              |                 ❌                 |                   ❌                   |
| `staff.permissions`      | Ruxsat berish/olish                                |    ✅    |              ❌              |                 ❌                 |                   ❌                   |
| `settings.manage`        | Tizim sozlamalari, karta rekvizitlari, shablonlar  |    ✅    |              ❌              |                 ❌                 |                   ❌                   |
| `audit.view`             | Audit jurnali                                      |    ✅    |              ❌              |                 ❌                 |                   ❌                   |
| **Tashkiliy**            |                                                    |          |                              |                                    |
| `course.manage`          | Kurs, xona                                         |    ✅    |              ✅              |                 ❌                 |                   ❌                   |
| `group.manage`           | Guruh, jadval, ustoz biriktirish                   |    ✅    |              ✅              |                 ❌                 |                   ❌                   |
| `group.view`             | Guruhlarni ko'rish                                 |    ✅    |              ✅              |                 🔸                 |                   ❌                   |
| `lesson.manage`          | Dars bekor qilish/ko'chirish, o'rinbosar tayinlash |    ✅    |              ✅              |                 ❌                 |                   ❌                   |
| **O'quvchilar**          |                                                    |          |                              |                                    |
| `student.manage`         | O'quvchi, ota-ona, enrollment, muzlatish           |    ✅    |              ✅              |                 ❌                 |                   ❌                   |
| `student.view`           | O'quvchi kartochkasi                               |    ✅    |              ✅              |                 🔸                 |                   🔸                   |
| `lead.manage`            | Lidlar                                             |    ✅    |              ✅              |                 ❌                 |                   ❌                   |
| **Davomat va natijalar** |                                                    |          |                              |                                    |
| `attendance.mark`        | Davomat belgilash                                  |    ✅    |              ✅              |                🔸🟡                |                   ❌                   |
| `attendance.edit_past`   | O'tgan davomatni o'zgartirish (sabab bilan)        |    ✅    |              ✅              |                 ❌                 |                   ❌                   |
| `absence.notify`         | "Kela olmaydi" oldindan xabar                      |    —     |              ✅              |                 ❌                 |                   🔸                   |
| `grade.write`            | Baho, izoh                                         |    ✅    |              ✅              |                🔸🟡                |                   ❌                   |
| `test.manage`            | Test yaratish, Excel import, e'lon qilish          |    ✅    |              ✅              |         🔸 (faqat `main`)          |                   ❌                   |
| `results.view`           | Baho, test natijalari                              |    ✅    |              ✅              |                 🔸                 | 🔸 (faqat `guardian` ko'rinishdagilar) |
| **To'lovlar**            |                                                    |          |                              |                                    |
| `payment.create`         | To'lov kiritish (naqd/terminal)                    |    ✅    |              ✅              |                 ❌                 |                   ❌                   |
| `payment.submit`         | O'tkazma chekini yuborish                          |    —     |              —               |                 ❌                 |                   🔸                   |
| `payment.review`         | Chekni tasdiqlash/rad etish                        |    ✅    |              ✅              |                 ❌                 |                   ❌                   |
| `payment.reverse`        | Storno                                             |    ✅    |    🟡 shu kun / ⬆️ keyin     |                 ❌                 |                   ❌                   |
| `payment.refund`         | Pulni qaytarish                                    |    ✅    |              ⬆️              |                 ❌                 |                   ❌                   |
| `discount.grant`         | Chegirma                                           |    ✅    | 🟡 ≤ limit / ⬆️ undan yuqori |                 ❌                 |                   ❌                   |
| `penalty.waive`          | Jarimani bekor qilish                              |    ✅    |          ✅ (sabab)          |                 ❌                 |                   ❌                   |
| `billing.view`           | Qarz, balans, to'lovlar tarixi                     |    ✅    |              ✅              |                 ❌                 |                   🔸                   |
| `cash.close`             | Kassa kunlik yopish                                |    ✅    |              ✅              |                 ❌                 |                   ❌                   |
| **Moliya va oylik**      |                                                    |          |                              |                                    |
| `expense.manage`         | Xarajatlar                                         |    ✅    |              D               |                 ❌                 |                   ❌                   |
| `finance.view`           | P&L, tushum hisobotlari, prognoz                   |    ✅    |              D               |                 ❌                 |                   ❌                   |
| `payroll.manage`         | Ustoz shartnomasi, oylik hisob, tasdiqlash         |    ✅    |              ❌              |                 ❌                 |                   ❌                   |
| `payroll.view_own`       | O'z oyligini ko'rish                               |    —     |              —               |                 ✅                 |                   —                    |
| **Aloqa**                |                                                    |          |                              |                                    |
| `announcement.send`      | Ommaviy e'lon                                      |    ✅    |              ✅              | 🔸 (faqat `main`, o'z guruhlariga) |                   ❌                   |
| `ticket.handle`          | Ota-ona murojaatlariga javob                       |    ✅    |              ✅              |                 ❌                 |                   ❌                   |
| `ticket.create`          | Murojaat yuborish                                  |    —     |              —               |                 —                  |                   ✅                   |
| **Statistika**           |                                                    |          |                              |                                    |
| `stats.operational`      | Davomat/natija statistikasi                        |    ✅    |              ✅              |                 🔸                 |                   🔸                   |
| `approval.decide`        | Tasdiqlash so'rovlarini hal qilish                 |    ✅    |              ❌              |                 ❌                 |                   ❌                   |

**Delegatsiya qilinmaydi (hech qachon Admin'ga berilmaydi):** `staff.*`, `settings.manage`, `audit.view`, `payroll.manage`, `approval.decide`, `payment.refund`.

**Yordamchi ustoz (`assistant`):** `attendance.mark`, `grade.write` (izohsiz), `group.view`, `student.view`. `test.manage`, `announcement.send`, izoh yozish — faqat `main` (Q-62).

## 5. Tasdiqlash so'rovlari (approval requests)

| Amal                                               | Kim so'raydi | Kim hal qiladi | Muddat                         |
| -------------------------------------------------- | ------------ | -------------- | ------------------------------ |
| Chegirma > Admin limiti                            | Admin        | Director       | 48 soat, keyin avtomatik bekor |
| Storno (kiritilgan kundan keyin)                   | Admin        | Director       | 48 soat                        |
| Refund                                             | Admin        | Director       | 48 soat                        |
| O'tgan oy davomatini o'zgartirish (hisob yopilgan) | Admin        | Director       | 48 soat                        |

Oqim: so'rov (sabab majburiy) → Director'ga bot xabari inline tugmalar bilan → qaror → amal bajariladi (yoki rad) → so'rovchiga natija. Hammasi audit'da. Jadval: `approval_requests` (type, payload, requested_by, status, decided_by, decided_at, reason).

## 6. Policy qoidalari (vaqt va holatga bog'liq)

| Policy                | Qoida                                                                    | Manba |
| --------------------- | ------------------------------------------------------------------------ | ----- |
| `canMarkAttendance`   | Ustoz: dars kuni 00:00 dan 23:59 gacha, dars `cancelled` emas            | BR-30 |
| `canWriteGrade`       | Ustoz: dars kunidan 3 kun ichida                                         | —     |
| `canReversePayment`   | Admin: to'lov shu kuni kiritilgan bo'lsa                                 | BR-16 |
| `canGrantDiscount`    | Admin: `percent ≤ settings.adminDiscountLimit`                           | BR-18 |
| `canEditPayroll`      | Faqat `DRAFT` holatda                                                    | BR-27 |
| `canReviewSubmission` | Holat `PENDING_REVIEW` va boshqa Admin hozir ochib turmagan (lock 5 daq) | BR-13 |

Policy'lar `packages/domain/policies`da — sof funksiyalar, har biri unit test bilan.

## 7. Kanal × rol (qaysi rol qayerda ishlaydi)

| Rol      | Bot                                                              | Mini App                                                  | Web panel                    |
| -------- | ---------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------- |
| Director | Xabarlar, tasdiqlash so'rovlari (inline tugmalar), kunlik xulosa | Dashboard, tasdiqlash so'rovlari, chek navbati            | **To'liq** (asosiy ish joyi) |
| Admin    | Yangi chek / murojaat xabarlari                                  | Xodim rejimi: chek navbati, bugungi darslar holati (Q-65) | **To'liq** (asosiy ish joyi) |
| Ustoz    | Eslatmalar; Excel faylni botga yuborish → import                 | **Asosiy va yagona ish joyi** (Q-60)                      | —                            |
| Ota-ona  | Xabarlar, ro'yxatdan o'tish, chek rasmini yuborish               | Farzand profili, baholar, to'lovlar, chek yuborish        | —                            |
