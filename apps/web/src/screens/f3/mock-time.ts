/** Mock sanalari: `YYYY-MM-DD[ HH:MM[:SS]]` — Toshkent vaqti (UTC+5) → `Date`. */
export function at(local: string): Date {
  const [day, time = '00:00'] = local.split(' ');
  const hms = time.length === 5 ? `${time}:00` : time;
  return new Date(`${day}T${hms}+05:00`);
}
