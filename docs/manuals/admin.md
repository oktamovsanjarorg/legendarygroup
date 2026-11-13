# Foydalanuvchi Qo'llanmasi: Administrator (Admin) (T-506)

Administrator — markazning kundalik operatsion jarayonlarini (lidlar, guruhlar, to'lovlar, davomat nazorati va ota-onalar bilan aloqa) boshqaruvchi asosiy mas'ul xodim.

---

## 1. Lidlar va Qabul (Leads Kanban)

- **Yangi lid kiritish:** telefon raqami tekshiriladi (takroriy telefon bo'lsa ogohlantirish beriladi).
- **Statuslar bo'yicha siljitish:** Yangi → Aloqada → Sinov darsi belgilandi → O'quvchiga aylandi (Won) / Rad etildi (Lost).
- **Sinov darsiga yozish:** guruh va sanani tanlab, o'quvchini ustoz ro'yxatida sinov belgisi bilan ko'rsatish.

---

## 2. To'lov cheklarini tasdiqlash navbati (Submissions)

Ota-onalar ilova orqali yuborgan to'lov cheklari ushbu navbatga tushadi:

1. **Navbatni ochish:** rasm kattalashtirilib (zoom) ko'rsatiladi.
2. **Qulflash (Optimistic Lock):** administrator chekni ochganda u 5 daqiqaga qulflanadi (ikki admin bir vaqtda tasdiqlashidan himoya).
3. **Tasdiqlash:** haqiqiy tushgan summa tekshiriladi, kerak bo'lsa tahrirlanadi va «Tasdiqlash» bosiladi. Tizim avtomatik rasmiy kvitansiya generatsiya qiladi va ota-ona hisobiga biriktiradi.
4. **Rad etish:** chek soxta yoki xato bo'lsa, sabab tanlanib rad etiladi. Ota-onaga Telegram orqali tushuntirish xabari yuboriladi.

---

## 3. Naqd to'lov qabul qilish va Kassa

- **To'lov kiritish (W-16):** o'quvchini tanlash → summa → to'lov turi (naqd, terminal, o'tkazma).
- **Chek chop etish / yuborish:** to'lov kiritilishi bilanoq rasmiy PDF kvitansiya generatsiya qilinadi.
- **Kunlik kassa yopish:** kun yakunida kassadagi jami naqd pul sanaladi va tizim bilan solishtiriladi.
