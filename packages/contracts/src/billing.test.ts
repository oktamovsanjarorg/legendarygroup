import { describe, expect, it } from 'vitest';
import {
  CreatePaymentRequest,
  GenerateInvoicesRequest,
  InvoiceListQuery,
  InvoiceSchema,
  LedgerEntrySchema,
  PeriodSchema,
  SetEnrollmentDiscountRequest,
  StudentLedgerSummarySchema,
  WaivePenaltyRequest,
} from './billing.js';

describe('Billing contracts', () => {
  it("PeriodSchema to'g'ri formatni qabul qiladi va noto'g'risini rad etadi", () => {
    expect(PeriodSchema.safeParse('2026-11').success).toBe(true);
    expect(PeriodSchema.safeParse('2026-01').success).toBe(true);
    expect(PeriodSchema.safeParse('2026-13').success).toBe(false);
    expect(PeriodSchema.safeParse('2026-1').success).toBe(false);
    expect(PeriodSchema.safeParse('not-a-period').success).toBe(false);
  });

  it("InvoiceSchema to'g'ri ma'lumotni parse qiladi", () => {
    const valid = {
      id: '01900000-0000-7000-8000-000000000001',
      branchId: '01900000-0000-7000-8000-000000000002',
      studentId: '01900000-0000-7000-8000-000000000003',
      period: '2026-11',
      dueDate: '2026-11-10',
      total: '50000000',
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(InvoiceSchema.safeParse(valid).success).toBe(true);
  });

  it('LedgerEntrySchema musbat va manfiy summalarni qabul qiladi', () => {
    const entry = {
      id: '01900000-0000-7000-8000-000000000001',
      branchId: '01900000-0000-7000-8000-000000000002',
      studentId: '01900000-0000-7000-8000-000000000003',
      entryType: 'invoice',
      amount: '50000000',
      refTable: 'invoices',
      refId: '01900000-0000-7000-8000-000000000004',
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    expect(LedgerEntrySchema.safeParse(entry).success).toBe(true);

    const paymentEntry = { ...entry, entryType: 'payment', amount: '-50000000' };
    expect(LedgerEntrySchema.safeParse(paymentEntry).success).toBe(true);
  });

  it("StudentLedgerSummarySchema to'g'ri ishlaydi", () => {
    const summary = {
      studentId: '01900000-0000-7000-8000-000000000001',
      balance: '-50000000',
      totalDebt: '50000000',
      totalAdvance: '0',
      isCritical: false,
    };
    expect(StudentLedgerSummarySchema.safeParse(summary).success).toBe(true);
  });

  it('InvoiceListQuery standart limit 50 beradi', () => {
    const parsed = InvoiceListQuery.parse({});
    expect(parsed.limit).toBe(50);
  });

  it('GenerateInvoicesRequest period talab qiladi', () => {
    expect(GenerateInvoicesRequest.safeParse({}).success).toBe(false);
    expect(GenerateInvoicesRequest.safeParse({ period: '2026-11' }).success).toBe(true);
  });

  it('CreatePaymentRequest summani tekshiradi', () => {
    const valid = {
      studentId: '01900000-0000-7000-8000-000000000001',
      amount: '50000000',
      method: 'cash',
    };
    expect(CreatePaymentRequest.safeParse(valid).success).toBe(true);
    expect(CreatePaymentRequest.safeParse({ ...valid, amount: '-500' }).success).toBe(false);
    expect(CreatePaymentRequest.safeParse({ ...valid, method: 'bitcoin' }).success).toBe(false);
  });

  it('SetEnrollmentDiscountRequest va WaivePenaltyRequest validatsiyasi', () => {
    const discount = { percent: 15, reason: 'Iqtidorli oʻquvchi' };
    expect(SetEnrollmentDiscountRequest.safeParse(discount).success).toBe(true);
    expect(SetEnrollmentDiscountRequest.safeParse({ percent: 105, reason: 'katta' }).success).toBe(
      false,
    );

    const waive = { reason: 'Kasal boʻlganligi tasdiqlandi' };
    expect(WaivePenaltyRequest.safeParse(waive).success).toBe(true);
    expect(WaivePenaltyRequest.safeParse({ reason: 'a' }).success).toBe(false);
  });
});
