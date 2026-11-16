import { normalizePhone, type PublicCourse } from '@lg/contracts';
import { formatMoney } from '@lg/i18n';

/** Client'ga build paytida HTML ichida beriladigan matnlar (butun i18n bundle'ga kirmasin). */
export interface SiteTexts {
  duration: string;
  lessonMinutes: string;
  nameRequired: string;
  phoneInvalid: string;
}

export interface CourseCard {
  id: string;
  name: string;
  description: string | null;
  price: string;
  meta: string[];
}

/** API kursini kartaga: narx — bigint so'm (`formatMoney`), float yo'q. */
export function toCourseCard(c: PublicCourse, t: SiteTexts): CourseCard {
  const meta = [t.lessonMinutes.replace('{n}', String(c.lessonDurationMin))];
  if (c.durationMonths) meta.unshift(t.duration.replace('{months}', String(c.durationMonths)));
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    price: formatMoney(BigInt(c.defaultMonthlyPrice)),
    meta,
  };
}

export interface LeadForm {
  fullName: string;
  phone: string;
  courseId: string;
  comment: string;
  /** Honeypot — odam ko'rmaydi; to'ldirilsa server jimgina rad etadi. */
  website: string;
}

export type LeadCheck =
  | { ok: true; body: Record<string, string | null> }
  | { ok: false; field: 'fullName' | 'phone'; error: string };

/** `PublicLeadRequest` tanasi; telefon E.164 ga keltiriladi. */
export function checkLead(f: LeadForm, t: SiteTexts): LeadCheck {
  const fullName = f.fullName.trim();
  if (fullName.length < 2) return { ok: false, field: 'fullName', error: t.nameRequired };
  const phone = normalizePhone(f.phone);
  if (!phone) return { ok: false, field: 'phone', error: t.phoneInvalid };
  const body: Record<string, string | null> = {
    fullName,
    phone,
    courseId: f.courseId || null,
    comment: f.comment.trim() || null,
  };
  if (f.website) body['website'] = f.website;
  return { ok: true, body };
}
