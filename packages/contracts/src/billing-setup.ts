import { z } from 'zod';

const Period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'PERIOD_FORMAT');
const Amount = z.string().regex(/^[1-9]\d{0,14}$/, 'AMOUNT_POSITIVE_DIGITS');

/**
 * T-145 Boshlang'ich holat (tizimga o'tish): o'quvchining haqiqiy kelgan sanasi va tizimdan
 * oldingi to'lanmagan oylar. Bir marta — joriy oy hisobi yaratilguncha.
 */
export const StudentBillingSetupRequest = z.object({
  enrollments: z
    .array(z.object({ enrollmentId: z.uuid(), startDate: z.iso.date() }))
    .max(10)
    .default([]),
  openingDebts: z
    .array(z.object({ enrollmentId: z.uuid(), period: Period, amount: Amount }))
    .max(60)
    .default([]),
});

export const StudentBillingSetupState = z.object({
  /** Joriy oy hisobi bor — sozlash yopiq (tuzatish: storno / kechirish). */
  done: z.boolean(),
  period: z.string(),
});

export type StudentBillingSetupRequest = z.input<typeof StudentBillingSetupRequest>;
export type StudentBillingSetupInput = z.output<typeof StudentBillingSetupRequest>;
export type StudentBillingSetupState = z.infer<typeof StudentBillingSetupState>;
