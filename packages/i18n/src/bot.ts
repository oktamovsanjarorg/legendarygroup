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
    greeting: '👋 Assalomu alaykum, {name}!',
    body: 'Legendary Group xodimi sifatida ulanish uchun telefon raqamingizni ulashing (pastdagi tugma).',
    shareButton: '📱 Telefon raqamni ulashish',
    invalid: 'Taklif havolasi eskirgan yoki ishlatilgan. Direktordan yangi havola soʻrang.',
    notOwn: 'Faqat oʻz telefon raqamingizni ulashing (pastdagi tugma orqali).',
    linked: '✅ Telegram akkauntingiz ulandi, {name}.',
    linkedBody: 'Endi ilovada darslaringiz va davomat chiqadi.',
    notFound:
      'Bu raqam boʻyicha faol taklif topilmadi. Direktor yoki administratorga murojaat qiling.',
  },
  parentOnboarding: {
    welcomeTitle: '👋 Legendary Group oʻquv markaziga xush kelibsiz!',
    welcomeBody:
      'Markaz yangiliklari, farzandingiz davomati, baholari va toʻlovlarini kuzatib borish uchun telefon raqamingizni ulashing.\n\n<i>Tugmani bosish orqali siz shaxsiy maʼlumotlarni qayta ishlashga rozilik bildirasiz.</i>',
    shareButton: '📱 Telefon raqamni ulashish',
    linkedTitle: '✅ Profilingiz muvaffaqiyatli bogʻlandi, {name}!',
    linkedChildren:
      'Farzand(lar)ingiz:\n{children}\n\nIlovani ochish uchun pastdagi tugmani bosing.',
    alreadyLinked:
      '✅ Profilingiz allaqachon bogʻlangan, {name}.\n\nFarzand(lar)ingiz:\n{children}',
    staffGreeting: '👋 Assalomu alaykum, {name}!\n\nIlovani ochish uchun pastdagi tugmani bosing.',
    pendingTitle: '⏳ Bogʻlanish soʻrovingiz koʻrib chiqilmoqda',
    pendingBody: 'Administrator arizangizni tasdiqlashi bilanoq sizga xabar yuboriladi.',
    requestCreatedTitle: 'ℹ️ Soʻrov qabul qilindi',
    requestCreatedBody:
      'Telefon raqamingiz ({phone}) oʻquv markaz bazasida topilmadi.\n\nAdministratorga bogʻlanish soʻrovi yuborildi. Administrator tasdiqlashi bilanoq sizga xabar beramiz yoki markaz maʼmuriyatiga murojaat qiling.',
    rejectedBody:
      'Sizning soʻrovingiz rad etilgan.\nSabab: {reason}\nSavollar boʻlsa, markaz administratoriga murojaat qiling.',
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
