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
  openApp: 'Ilovani ochish',
  menuButton: 'Ilova',
  error: 'Kutilmagan xato yuz berdi. Birozdan keyin qayta urinib koʻring.',
} as const;
