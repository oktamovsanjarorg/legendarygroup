/**
 * Postgres xato kodlari (drizzle xatoni `DrizzleQueryError.cause`ga o'raydi).
 * Ilova unique/FK buzilishini domen xatosiga aylantirish uchun ishlatadi.
 */
interface PgError {
  code: string;
  constraint: string | null;
}

const SQLSTATE = /^[0-9A-Z]{5}$/;

function pgError(err: unknown): PgError | null {
  let e: unknown = err;
  for (let depth = 0; depth < 4 && typeof e === 'object' && e !== null; depth += 1) {
    const code: unknown = 'code' in e ? e.code : undefined;
    if (typeof code === 'string' && SQLSTATE.test(code)) {
      const name: unknown = 'constraint_name' in e ? e.constraint_name : null;
      return { code, constraint: typeof name === 'string' ? name : null };
    }
    e = 'cause' in e ? e.cause : undefined;
  }
  return null;
}

/** `23505` unique_violation; `constraint` berilsa — faqat shu indeks/cheklov. */
export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  const pg = pgError(err);
  if (pg?.code !== '23505') return false;
  return constraint === undefined || pg.constraint === constraint;
}
