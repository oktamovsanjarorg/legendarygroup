/** Telefonni loglar/audit uchun maskalash: `+99890***4567` (07 §3). */
export const maskPhone = (phone: string): string =>
  phone.length > 9 ? `${phone.slice(0, 6)}***${phone.slice(-4)}` : '***';
