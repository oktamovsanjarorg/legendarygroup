/** Bot xabarlari (11-ux.md §6: sarlavha → 1–3 qator → tugma). */
export const botMessages = {
  start: {
    title: '👋 Legendary Group oʻquv markaziga xush kelibsiz!',
    body: 'Davomat, baholar, toʻlovlar va markaz xabarlari — shu yerda.\nIlovani ochish uchun pastdagi tugmani bosing.',
  },
  help: {
    title: 'ℹ️ Yordam',
    body: '/start — bosh menyu\n/help — yordam\nSavol boʻlsa — ilovadagi «Murojaat» boʻlimidan yozing.',
  },
  staffInvite: {
    notOwn: 'Faqat oʻz telefon raqamingizni ulashing (pastdagi tugma orqali).',
    linked: '✅ Telegram akkauntingiz ulandi, {name}.',
    linkedBody: 'Tayyor. Ilovani pastdagi tugma bilan oching — parol kerak emas.',
    conflict:
      'Bu raqam yoki Telegram akkaunt tizimda boshqa profilga ulangan. Direktorga ayting: Xodimlar boʻlimida «Telegramni uzish»ni bossin, soʻng raqamni qayta ulashing.',
  },
  /** "Telegram orqali kirish" (web, ADR 0006 §6): bot tasdiq so'raydi. */
  staffLogin: {
    title: '🔐 Boshqaruv paneliga kirish',
    body: 'Hozir web panelga Telegram orqali kirish soʻraldi. Siz boʻlsangiz — «Tasdiqlash»ni bosing (5 daqiqa ichida).\n\nSiz soʻramagan boʻlsangiz — tugmani bosmang.',
    confirmButton: '✅ Tasdiqlash',
    confirmed: '✅ Kirish tasdiqlandi. Brauzerga qayting.',
    expired:
      'Soʻrov muddati oʻtgan yoki allaqachon ishlatilgan. Web sahifada qayta urinib koʻring.',
  },
  parentOnboarding: {
    welcomeTitle: '👋 Legendary Group oʻquv markaziga xush kelibsiz!',
    welcomeBody:
      'Kirish uchun telefon raqamingizni ulashing — ota-ona, ustoz va xodimlar uchun bir xil. Parol kerak emas.\n\n<i>Tugmani bosish orqali siz shaxsiy maʼlumotlarni qayta ishlashga rozilik bildirasiz.</i>',
    shareButton: '📱 Telefon raqamni ulashish',
    linkedTitle: '✅ Profilingiz muvaffaqiyatli bogʻlandi, {name}!',
    linkedChildren:
      'Farzand(lar)ingiz:\n{children}\n\nIlovani ochish uchun pastdagi tugmani bosing.',
    alreadyLinked:
      '✅ Profilingiz allaqachon bogʻlangan, {name}.\n\nFarzand(lar)ingiz:\n{children}',
    staffGreeting: '👋 Assalomu alaykum, {name}!\n\nIlovani ochish uchun pastdagi tugmani bosing.',
    pendingTitle: '⏳ Bogʻlanish soʻrovingiz koʻrib chiqilmoqda',
    pendingBody: 'Administrator arizangizni tasdiqlashi bilanoq sizga xabar yuboriladi.',
    unknownPhoneTitle: 'ℹ️ Raqam bazada topilmadi',
    unknownPhoneBody:
      'Telefon raqamingiz ({phone}) oʻquv markaz bazasida yoʻq.\n\nSiz ota-onamisiz yoki oʻquvchimisiz?',
    requestButton: '👨‍👩‍👧 Ota-ona sifatida soʻrov yuborish',
    childrenFallback: 'Roʻyxatga olingan farzandlar mavjud',
    requestCreatedTitle: 'ℹ️ Soʻrov qabul qilindi',
    requestCreatedBody:
      'Telefon raqamingiz ({phone}) oʻquv markaz bazasida topilmadi.\n\nAdministratorga bogʻlanish soʻrovi yuborildi. Administrator tasdiqlashi bilanoq sizga xabar beramiz yoki markaz maʼmuriyatiga murojaat qiling.',
    rejectedBody:
      'Sizning soʻrovingiz rad etilgan.\nSabab: {reason}\nSavollar boʻlsa, markaz administratoriga murojaat qiling.',
  },
  studentLogin: {
    greeting: '🎓 Assalomu alaykum, {name}!\n\nIlovani ochish uchun pastdagi tugmani bosing.',
    enterCodeButton: '🎓 Men oʻquvchiman',
    promptCode:
      'Oʻquvchi profiliga kirish uchun administrator bergan 6 xonali maxfiy kodni yuboring:',
    needContact:
      'Oʻquvchi sifatida kirish uchun avval telefon raqamingizni ulashing (pastdagi tugma orqali).',
    success: '✅ Xush kelibsiz, {name}!\n\nProfilingiz muvaffaqiyatli bogʻlandi.',
    invalidCode: 'Kiritilgan kod yoki telefon mos kelmadi. Kodni Admindan soʻrang.',
    rateLimited: 'Juda koʻp notoʻgʻri urinish. 15 daqiqadan soʻng qayta urinib koʻring.',
    alreadyLinked: 'Siz allaqachon oʻquvchi profiliga bogʻlangansiz.',
    inUse:
      'Bu oʻquvchi yoki telefon raqami boshqa Telegram akkauntga bogʻlangan. Administratorga murojaat qiling.',
  },
  submission: {
    confirmed: 'Toʻlovingiz tasdiqlandi. Chek raqami: {number}',
    rejected: 'Toʻlov chekingiz rad etildi. Sabab: {reason}',
  },
  paymentReceipt: {
    text: '✅ Toʻlov qabul qilindi\n{student}: {amount}\nChek raqami: {number}',
    verify: 'Chekni tekshirish',
  },
  receiptUploadHelp: {
    title: '🧾 Toʻlov cheki',
    body: 'Chekni hisobingizga biriktirish uchun ilovadagi «Toʻlov» boʻlimiga kiring yoki administratorga murojaat qiling.',
  },
  unknownMessage: {
    title: 'ℹ️ Assalomu alaykum!',
    body: 'Barcha maʼlumotlar (davomat, dars jadvali, baholar va toʻlovlar) ilova ichida joylashgan.\n\nIlovani ochish uchun pastdagi tugmani bosing yoki /help buyrugʻidan foydalaning.',
  },
  openApp: 'Ilovani ochish',
  menuButton: 'Ilova',
  error: 'Kutilmagan xato yuz berdi. Birozdan keyin qayta urinib koʻring.',
} as const;
