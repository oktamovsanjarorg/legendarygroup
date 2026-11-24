export interface HelpItem {
  id: string;
  /** Savol faqat shu ruxsat bilan koʻrinadi (boʻlim ruxsatidan tashqari). */
  permission?: string;
  q: string;
  steps: readonly string[];
  note?: string;
}

export interface HelpSection {
  id: string;
  title: string;
  permission?: string;
  items: readonly HelpItem[];
}

export const helpSectionsOrg: readonly HelpSection[] = [
  {
    id: 'kirish',
    title: 'Kirish',
    items: [
      {
        id: 'kirish-web',
        q: 'Web panelga qanday kiraman?',
        steps: [
          'Mini App orqali (eng oson): Telegramda markaz botini oching → menyu tugmasi bilan Mini Appʼni oching → «Bugun» ekrani pastidagi «Boshqaruv panelini ochish» tugmasini bosing.',
          'Kompyuterda: https://app.legendary-academy.uz → telefon raqamni kiriting → «Telegram orqali kirish» → botdagi «✅ Tasdiqlash». Parol va kod yoʻq.',
        ],
        note: 'Havola bir martalik va 60 soniya amal qiladi: har safar tugmani qayta bosing, havolani birovga yubormang.',
      },
      {
        id: 'kirish-muammolar',
        q: 'Kira olmayapman — nima qilay?',
        steps: [
          'Botdan xabar kelmadi: botni oching → «Start» → «Telefon raqamni ulashish» → kirish sahifasida qayta urinib koʻring.',
          'Bot «boshqa profilga ulangan» desa: Direktor «Xodimlar» → xodim → «Telegramni uzish»ni bossin, soʻng raqamni qayta ulashing.',
          'Bot raqamni tanimasa: Telegramdagi raqamingiz «Xodimlar»da yozilgan raqam bilan bir xilmi — Direktordan soʻrang.',
        ],
      },
      {
        id: 'telegram-ulash',
        q: 'Telegramni qanday ulayman?',
        steps: [
          'Markaz botini oching → «Start» → «Telefon raqamni ulashish».',
          'Raqam «Xodimlar»dagi raqam bilan bir xil boʻlsa — darhol ulanadi.',
        ],
      },
      {
        id: 'sessiyalar',
        q: 'Boshqa qurilmalardan qanday chiqaman?',
        steps: [
          'Menyu → «Mening sessiyalarim» → kerakli qurilmada «Chiqish» yoki «Barcha qurilmalardan chiqish».',
        ],
      },
    ],
  },
  {
    id: 'xodimlar',
    title: 'Xodimlar',
    permission: 'staff.manage',
    items: [
      {
        id: 'xodim-qoshish',
        q: 'Administrator yoki oʻqituvchi (ustoz) qanday qoʻshaman?',
        steps: [
          'Menyu → «Xodimlar» → «Xodim qoʻshish».',
          'F.I.Sh, telefon raqam (Telegramdagi raqami), rolni tanlang → «Qoʻshish».',
          'Xodim markaz botini ochib, «Start» → «Telefon raqamni ulashish»ni bosadi — kirdi. Parol yoʻq.',
        ],
        note: 'Xodim telefonini yoki Telegramini almashtirsa: xodim kartasi → «Telegramni uzish», soʻng raqamini botda qayta ulashadi.',
      },
      {
        id: 'ustoz-roli',
        q: 'Oʻzim ham oʻqituvchi boʻlib dars bersam nima qilaman?',
        steps: [
          'Menyu → «Xodimlar» → oʻzingizni tanlang → «Ustoz rolini qoʻshish».',
          'Guruhga oʻzingizni ustoz qilib biriktiring.',
        ],
        note: 'Mini App ochilganda «Direktor» yoki «Ustoz» rejimini tanlaysiz. Keyin almashtirish: Mini App yuqorisidagi ⋮ → Sozlamalar → «Faol rol».',
      },
      {
        id: 'xodim-bloklash',
        q: 'Xodim ishdan ketsa nima qilish kerak?',
        steps: [
          'Xodim kartasi → «Bloklash». Barcha qurilmalardagi sessiyalari darhol yopiladi.',
          'Qaytarish — «Blokdan chiqarish», rolni olish — «… rolini olish».',
        ],
      },
    ],
  },
  {
    id: 'kurslar',
    title: 'Kurslar va xonalar',
    permission: 'course.manage',
    items: [
      {
        id: 'kurs-xona-yaratish',
        q: 'Kurs yoki xona qanday qoʻshiladi?',
        steps: [
          'Menyu → «Kurslar va xonalar» → «Yangi kurs» (nomi, oylik narx, dars davomiyligi).',
          'Yoki «Yangi xona» (raqami, sigʻimi).',
        ],
        note: 'Keraksiz kurs arxivlanadi (yangi guruhlarda chiqmaydi).',
      },
    ],
  },
  {
    id: 'guruhlar',
    title: 'Guruhlar',
    permission: 'group.view',
    items: [
      {
        id: 'guruh-yaratish',
        q: 'Yangi guruh qanday ochiladi?',
        steps: [
          'Menyu → «Guruhlar» → «Yangi guruh».',
          'Kurs, xona, kunlar va vaqtni tanlang → «Guruh yaratish».',
        ],
        note: 'Xona band boʻlsa «Toʻqnashuv» ogohlantirishi chiqadi.',
      },
      {
        id: 'ustoz-biriktirish',
        q: 'Guruhga ustoz qanday biriktiriladi?',
        steps: [
          'Guruh → «Ustozlar» → «Ustoz biriktirish».',
          'Ustoz, vazifasi (Asosiy / Yordamchi) va sanani tanlang.',
        ],
        note: 'Yangi asosiy ustoz qoʻyilsa, eskisi oʻzi yakunlanadi.',
      },
      {
        id: 'jadval-ozgartirish',
        q: 'Dars jadvalini qanday oʻzgartiraman?',
        steps: ['Guruh → «Jadvalni oʻzgartirish» → qaysi sanadan ekanini tanlang.'],
        note: 'Oʻtgan darslar oʻzgarmaydi.',
      },
      {
        id: 'bayramlar',
        q: 'Bayram kunlari darslar nima boʻladi?',
        steps: ['Menyu → «Sozlamalar» → «Bayramlar» → sana va nomni kiriting → «Qoʻshish».'],
        note: 'Bu kunlardagi darslar avtomatik bekor boʻladi.',
      },
    ],
  },
  {
    id: 'oquvchilar',
    title: 'Oʻquvchilar',
    permission: 'student.view',
    items: [
      {
        id: 'oquvchi-qoshish',
        q: 'Yangi oʻquvchi qanday qoʻshiladi va guruhga yoziladi?',
        steps: [
          'Menyu → «Oʻquvchilar» → «Yangi oʻquvchi» → maʼlumotlarni kiriting → «Oʻquvchi qoʻshish».',
          'Oʻquvchi kartasi → «Guruhga yozish» → guruh va sanani tanlang → «Yozish».',
        ],
      },
      {
        id: 'ota-ona-ulash',
        q: 'Ota-onani botga qanday ulayman?',
        steps: [
          'Oʻquvchi kartasida «Ota-ona qoʻshish» (telefon raqami bilan).',
          'Ota-ona botda «Start» bosib shu raqamni ulashsa avtomatik bogʻlanadi.',
        ],
        note: 'Raqam mos kelmasa, soʻrov «Bogʻlanish soʻrovlari» boʻlimiga tushadi.',
      },
      {
        id: 'guruh-harakatlari',
        q: 'Boshqa guruhga koʻchirish, muzlatish yoki chiqarish qanday qilinadi?',
        steps: [
          '«Boshqa guruhga koʻchirish» — chegirma saqlanadi.',
          '«Muzlatish» — kamida 14 kun; shu davr darslari keyingi oy hisobidan ayriladi.',
          '«Guruhdan chiqarish» — oxirgi kun va sabab bilan.',
        ],
      },
      {
        id: 'lidlar',
        q: 'Qiziqqanlar (lidlar) bilan qanday ishlanadi?',
        steps: [
          'Menyu → «Lidlar» → «Lid qoʻshish».',
          'Kelib yozilsa — lid kartasidan «Guruhga yozish».',
        ],
      },
    ],
  },
  {
    id: 'tolovlar',
    title: 'Toʻlovlar',
    items: [
      {
        id: 'tolov-kiritish',
        permission: 'payment.create',
        q: 'Naqd yoki karta toʻlovini qanday kiritaman?',
        steps: [
          'Menyu → «Toʻlov kiritish» (yoki istalgan sahifadan «Alt+P»).',
          'Oʻquvchi, summa va usulni tanlang → «Saqlash va chek chiqarish (Enter)».',
        ],
      },
      {
        id: 'chek-navbati',
        permission: 'payment.review',
        q: 'Ota-ona yuborgan oʻtkazma cheki qanday tekshiriladi?',
        steps: [
          'Menyu → «Chek navbati» (yoki Mini App → «Navbat»).',
          'Rasmni tekshiring, summani toʻgʻrilang → «Tasdiqlash» yoki «Rad etish».',
        ],
        note: 'Ota-onaga botdan natija boradi. 24 soatdan oshgan cheklar alohida belgilanadi.',
      },
      {
        id: 'qarzdorlar',
        permission: 'payment.review',
        q: 'Qarzdorlar bilan qanday ishlanadi?',
        steps: [
          'Menyu → «Qarzdorlar» — muddat boʻyicha (0–7, 8–30, 30+ kun).',
          '«Hozir eslatish» — ota-onaga botdan eslatma yuboradi.',
        ],
      },
      {
        id: 'chegirmalar',
        permission: 'discount.grant',
        q: 'Oʻquvchiga qanday chegirma beriladi?',
        steps: ['Oʻquvchi kartasi → «Chegirma berish» yoki menyu → «Chegirmalar».'],
        note: 'Admin oʻz limitidan oshirsa, Direktorga tasdiqlash soʻrovi ketadi.',
      },
      {
        id: 'storno-qaytarish',
        permission: 'payment.reverse',
        q: 'Toʻlovni qanday bekor qilaman (storno) yoki pulni qaytaraman?',
        steps: ['Toʻlov sahifasi → «Storno» yoki qaytarish.'],
        note: 'Admin buni qilsa, Direktorga tasdiqlash soʻrovi ketadi.',
      },
      {
        id: 'kassa-yopish',
        permission: 'cash.close',
        q: 'Kassani qanday yopaman?',
        steps: [
          'Menyu → «Kassa» → «Sanalgan naqd»ni kiriting.',
          'Farq boʻlsa sababini yozing → «Kunni yopish».',
        ],
      },
    ],
  },
];
