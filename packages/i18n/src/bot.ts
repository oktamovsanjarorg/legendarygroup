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
  openApp: 'Ilovani ochish',
  menuButton: 'Ilova',
  error: 'Kutilmagan xato yuz berdi. Birozdan keyin qayta urinib koʻring.',
} as const;
