/** C-03 Birinchi kirish (Q-111): «bog'lanmagan» emas — Mini App ichida ro'yxatdan o'tish. */
export const onboardingMessages = {
  onboarding: {
    title: 'Xush kelibsiz!',
    hint: 'Kirish uchun telefon raqamingizni ulashing — tizim sizni oʻzi taniydi. Parol kerak emas.',
    share: '📱 Raqamni ulashish',
    checking: 'Raqam tekshirilmoqda…',
    declined: 'Raqam ulashilmadi. Kirish uchun raqamni ulashish kerak.',
    student: '🎓 Men oʻquvchiman',
    studentTitle: 'Oʻquvchi kirishi',
    studentHint:
      'Markaz bergan 6 xonali kodni kiriting. Raqam — oʻzingizniki yoki ota-onangizniki.',
    code: 'Kirish kodi',
    enter: 'Kirish',
    back: '← Orqaga',
    unknownTitle: 'Raqamingiz bazada yoʻq',
    unknownHint:
      'Bu raqam markazda roʻyxatdan oʻtmagan. Farzandingiz markazda oʻqiyotgan boʻlsa — soʻrov yuboring, xodim tasdiqlaydi.',
    request: 'Men ota-onaman — soʻrov yuborish',
    requestedTitle: 'Soʻrov yuborildi',
    requestedHint: 'Markaz xodimi tasdiqlagach, ilova shu yerda ochiladi. Odatda bir kun ichida.',
    refresh: 'Tekshirish',
    rejected:
      'Oldingi soʻrov rad etildi: {reason}. Raqamni qayta ulashib, yana urinib koʻrishingiz mumkin.',
    notYet: 'Hali tasdiqlanmagan. Birozdan keyin yana tekshiring.',
    conflict:
      'Bu raqam boshqa Telegram akkauntga ulangan. Markazga qoʻngʻiroq qiling — xodim eski ulanishni uzadi.',
    codeInvalid: 'Kod yoki raqam notoʻgʻri. Kodni markazdan qayta soʻrang.',
    codeInUse: 'Bu oʻquvchi boshqa Telegram akkauntga ulangan. Markazga murojaat qiling.',
    rateLimited: 'Urinishlar koʻp. 15 daqiqadan keyin qayta urinib koʻring.',
    oldClient:
      'Telegram ilovangiz eski. Yangilang yoki botda «Start» → «📱 Telefon raqamni ulashish».',
    backToBot: 'Botga qaytish',
  },
} as const;
