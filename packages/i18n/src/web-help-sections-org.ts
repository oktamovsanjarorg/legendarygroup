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
          'Kompyuterda parol bilan: https://app.legendary-academy.uz → «Telefon raqam» maydonida 9 ta raqamni kiriting → «Parol» → «Kirish» → botdagi «✅ Tasdiqlash» yoki Authenticatorʼdagi 6 xonali kod.',
          'Faqat Telegram bilan: telefon raqamni kiriting → «Telegram orqali kirish» → botdagi «✅ Tasdiqlash».',
        ],
        note: 'Havola bir martalik va 60 soniya amal qiladi: har safar tugmani qayta bosing, havolani birovga yubormang.',
      },
      {
        id: 'kirish-muammolar',
        q: 'Kira olmayapman — nima qilay?',
        steps: [
          '«Telefon raqam yoki parol notoʻgʻri»: raqamni tekshiring (+998 dan keyin 9 ta raqam, boʻshliqsiz). Raqam toʻgʻri boʻlsa — parol xato.',
          '«Tasdiqlash kodi notoʻgʻri»: Authenticatorʼda eski «Legendary Group» yozuvi qolgan. Hammasini oʻchirib, QRʼni qayta skanerlang yoki botdagi «Tasdiqlash»ni bosing.',
          'Botdan xabar kelmadi: Telegram akkauntingiz ulanmagan boʻlishi mumkin — «Telegramni ulash»ga qarang.',
          'Parolni unutdim: Mini App → «Boshqaruv panelini ochish» bilan kiring yoki texnik masʼulga murojaat qiling.',
        ],
      },
      {
        id: 'telegram-ulash',
        q: 'Telegramni qanday ulayman?',
        steps: [
          'Web panel → Bosh sahifa → «Telegramni ulash» → «Ulash havolasini olish» → «Botni ochish va ulash».',
          'Botda «Start» bosing va telefon raqamingizni ulashing.',
        ],
        note: 'Havola 24 soat, bir marta amal qiladi.',
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
          'F.I.Sh, telefon raqam, rolni tanlang → «Qoʻshish va taklif qilish».',
          'Taklif havolasini nusxalab xodimga yuboring (Admin havola orqali parol oʻrnatadi, oʻqituvchi / ustoz Telegramda ochadi).',
        ],
        note: 'Havola yoʻqolsa yoki muddati oʻtsa: xodim kartasi → «Taklifni qayta yuborish».',
      },
      {
        id: 'ustoz-roli',
        q: 'Oʻzim ham oʻqituvchi boʻlib dars bersam nima qilaman?',
        steps: [
          'Menyu → «Xodimlar» → oʻzingizni tanlang → «Ustoz rolini qoʻshish».',
          'Guruhga oʻzingizni ustoz qilib biriktiring.',
        ],
        note: 'Mini App ochilganda «Direktor» yoki «Ustoz» rejimini tanlaysiz, almashtirish — bir tegish.',
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
