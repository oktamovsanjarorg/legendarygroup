/** C-06 Tanishtiruv (T-125): birinchi ochilishda rolga qarab 3 kartochka. */
export const introMessages = {
  intro: {
    next: 'Keyingi',
    start: 'Boshlash',
    step: '{n} / {total}',
    teacher: [
      {
        title: 'Davomat — bir bosishda',
        text: 'Bugungi darsni oching, kelmaganlarni belgilang. Internet boʻlmasa ham saqlanadi va keyin yuboriladi.',
      },
      {
        title: 'Baho va uy vazifasi',
        text: 'Guruhingizdagi oʻquvchilarga baho qoʻying, vazifalarni tekshiring — ota-onalar darhol koʻradi.',
      },
      {
        title: 'Jadval va eslatmalar',
        text: 'Haftalik jadvalingiz shu yerda. Dars oldidan bot eslatib turadi.',
      },
    ],
    guardian: [
      {
        title: 'Farzandingiz qanday oʻqiyapti',
        text: 'Davomat, baholar va uy vazifalari — har kuni yangilanadi.',
      },
      {
        title: 'Toʻlovlar va cheklar',
        text: 'Qarz, toʻlov tarixi va har bir chek PDF koʻrinishida. Onlayn toʻlash ham mumkin.',
      },
      {
        title: 'Markaz bilan aloqa',
        text: 'Darsga kela olmasligini oldindan bildiring yoki savol yozing — javob shu yerga keladi.',
      },
    ],
    staff: [
      {
        title: 'Bugungi holat',
        text: 'Tushum, qarzdorlar, davomat va kutayotgan ishlar — bitta ekranda.',
      },
      {
        title: 'Navbat va soʻrovlar',
        text: 'Tasdiqlash soʻrovlari va tekshiriladigan ishlar — telefoningizdan hal qiling.',
      },
      {
        title: 'Oʻquvchi va toʻlov',
        text: 'Oʻquvchini toping, ota-onaga qoʻngʻiroq qiling, toʻlov qabul qiling. Hisobotlar — web panelda.',
      },
    ],
  },
} as const;
