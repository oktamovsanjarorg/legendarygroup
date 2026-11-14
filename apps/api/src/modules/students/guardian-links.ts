import { HttpStatus } from '@nestjs/common';
import type { GuardianInput } from '@lg/contracts';
import { type GuardianRow, guardians, studentGuardians, type Transaction } from '@lg/db';
import { and, asc, eq, ne } from 'drizzle-orm';
import { AppException } from '../../common/errors/app.exception.js';

/**
 * Ota-onani telefon bo'yicha topish yoki yaratish (FR-STU-2: telefon — bog'lash kaliti).
 * Mavjud ota-onaning ismi o'zgartirilmaydi (boshqa farzandi kartochkasida ham ko'rinadi).
 * Parallel so'rovda ham bitta qator: `ON CONFLICT DO NOTHING` + qayta o'qish.
 */
export async function findOrCreateGuardian(
  tx: Transaction,
  input: Pick<GuardianInput, 'fullName' | 'phone'>,
): Promise<{ guardian: GuardianRow; created: boolean }> {
  const [inserted] = await tx
    .insert(guardians)
    .values({ fullName: input.fullName, phone: input.phone })
    .onConflictDoNothing({ target: guardians.phone })
    .returning();
  if (inserted) return { guardian: inserted, created: true };
  const [existing] = await tx.select().from(guardians).where(eq(guardians.phone, input.phone));
  if (!existing) throw new Error('ota-ona topilmadi');
  return { guardian: existing, created: false };
}

/** Asosiy ota-ona bitta (partial unique index): avval boshqalarini tushiramiz. */
export async function makePrimary(
  tx: Transaction,
  studentId: string,
  guardianId: string,
): Promise<void> {
  await tx
    .update(studentGuardians)
    .set({ isPrimary: false })
    .where(
      and(
        eq(studentGuardians.studentId, studentId),
        ne(studentGuardians.guardianId, guardianId),
        eq(studentGuardians.isPrimary, true),
      ),
    );
  await tx
    .update(studentGuardians)
    .set({ isPrimary: true })
    .where(
      and(eq(studentGuardians.studentId, studentId), eq(studentGuardians.guardianId, guardianId)),
    );
}

/** Asosiy ota-ona uzilsa — qolganlardan eng birinchi bog'langani asosiy bo'ladi. */
export async function ensurePrimary(tx: Transaction, studentId: string): Promise<void> {
  const links = await tx
    .select()
    .from(studentGuardians)
    .where(eq(studentGuardians.studentId, studentId))
    .orderBy(asc(studentGuardians.createdAt));
  const first = links[0];
  if (first && !links.some((l) => l.isPrimary)) await makePrimary(tx, studentId, first.guardianId);
}

/** Kiritilgan ro'yxatda ko'pi bilan bitta asosiy; hech biri bo'lmasa — birinchisi. */
export function normalizePrimary<T extends { isPrimary: boolean }>(list: readonly T[]): T[] {
  const flagged = list.filter((g) => g.isPrimary).length;
  if (flagged > 1) throw new AppException(HttpStatus.BAD_REQUEST, 'MULTIPLE_PRIMARY_GUARDIANS');
  return list.map((g, i) => ({ ...g, isPrimary: flagged === 0 ? i === 0 : g.isPrimary }));
}

/** Bir ro'yxatda bir telefon ikki marta — xato (PK to'qnashuvi o'rniga tushunarli kod). */
export function assertUniquePhones(list: readonly { phone: string }[]): void {
  if (new Set(list.map((g) => g.phone)).size !== list.length)
    throw new AppException(HttpStatus.BAD_REQUEST, 'DUPLICATE_GUARDIAN_PHONE');
}
