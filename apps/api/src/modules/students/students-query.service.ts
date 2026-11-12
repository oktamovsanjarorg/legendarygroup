import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  type GuardianLookupResult,
  normalizePhone,
  type OrgListFilter,
  type StudentDetail,
  type StudentListResult,
} from '@lg/contracts';
import { type Database, guardians, studentGuardians, students, type Transaction } from '@lg/db';
import { normalizeUz } from '@lg/i18n';
import { and, asc, desc, eq, exists, ilike, inArray, or, type SQL, sql } from 'drizzle-orm';
import { AppException } from '../../common/errors/app.exception.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import type { RequestUser } from '../auth/index.js';
import { archivedFilter } from '../../common/db/archive.js';
import { StudentScopeService } from './student-scope.service.js';
import { type GuardianLink, toDetail, toListItem } from './students.serializer.js';

const CODE_RE = /^(?:lg-?)?(\d{4,7})$/i;

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Qidiruv (FR-STU-5): kod → telefon (o'quvchi yoki ota-ona) → ism (normalizatsiya, trigram). */
export function searchCondition(db: Database, q: string | undefined): SQL | undefined {
  const text = q?.trim();
  if (!text) return undefined;
  const code = CODE_RE.exec(text);
  if (code?.[1]) return eq(students.code, Number(code[1]));
  const phone = normalizePhone(text);
  if (phone) {
    const byGuardian = exists(
      db
        .select({ one: sql`1` })
        .from(studentGuardians)
        .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
        .where(and(eq(studentGuardians.studentId, students.id), eq(guardians.phone, phone))),
    );
    return or(eq(students.phone, phone), byGuardian);
  }
  return ilike(students.searchName, `%${escapeLike(normalizeUz(text))}%`);
}

/**
 * Cursor — oxirgi qatorning `id`si; solishtirish DB'dagi aniq `created_at` bilan (mikrosoniya —
 * JS `Date` millisoniyaga qisqartiradi va sahifa chegarasida qator tushib qolardi).
 */
const encodeCursor = (id: string) => Buffer.from(id).toString('base64url');
function decodeCursor(raw: string): string {
  const id = Buffer.from(raw, 'base64url').toString();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))
    throw new AppException(HttpStatus.BAD_REQUEST, 'BAD_REQUEST');
  return id;
}

export interface StudentListParams {
  q?: string | undefined;
  groupId?: string | undefined;
  status: OrgListFilter;
  cursor?: string | undefined;
  limit: number;
}

/** O'quvchilarni o'qish (T-105): ro'yxat/qidiruv, kartochka, ota-onani telefon bo'yicha topish. */
@Injectable()
export class StudentsQueryService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(StudentScopeService) private readonly scope: StudentScopeService,
  ) {}

  /** Saralash `created_at desc, id desc`, cursor pagination (12-ai-playbook.md §5). */
  async list(user: RequestUser, p: StudentListParams): Promise<StudentListResult> {
    const scope = this.scope.scopeFor(user);
    const after = p.cursor ? decodeCursor(p.cursor) : null;
    const rows = await this.db
      .select()
      .from(students)
      .where(
        and(
          scope.kind === 'all' ? undefined : scope.where,
          archivedFilter(students.archivedAt, p.status),
          searchCondition(this.db, p.q),
          p.groupId ? inArray(students.id, this.scope.enrolledOn([p.groupId])) : undefined,
          after
            ? sql`(${students.createdAt}, ${students.id}) < (select s.created_at, s.id from ${students} s where s.id = ${after}::uuid)`
            : undefined,
        ),
      )
      .orderBy(desc(students.createdAt), desc(students.id))
      .limit(p.limit + 1);
    const page = rows.slice(0, p.limit);
    const last = page.at(-1);
    return {
      items: page.map(toListItem),
      nextCursor: rows.length > p.limit && last ? encodeCursor(last.id) : null,
    };
  }

  async detail(user: RequestUser, id: string): Promise<StudentDetail> {
    await this.scope.assertVisible(user, id);
    const [row] = await this.db.select().from(students).where(eq(students.id, id));
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    const viewer = { role: user.role, guardianId: await this.scope.guardianIdOf(user) };
    return toDetail(row, await this.links(id), viewer);
  }

  async links(studentId: string, tx: Database | Transaction = this.db): Promise<GuardianLink[]> {
    return tx
      .select({
        relation: studentGuardians.relation,
        isPrimary: studentGuardians.isPrimary,
        notify: studentGuardians.notify,
        guardian: {
          id: guardians.id,
          fullName: guardians.fullName,
          phone: guardians.phone,
          userId: guardians.userId,
        },
      })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .where(eq(studentGuardians.studentId, studentId))
      .orderBy(desc(studentGuardians.isPrimary), asc(guardians.fullName));
  }

  /** Forma uchun (FR-STU-2): shu telefonli ota-ona bormi va uning farzandlari. Faqat xodim. */
  async lookupGuardian(phone: string): Promise<GuardianLookupResult> {
    const [g] = await this.db.select().from(guardians).where(eq(guardians.phone, phone));
    if (!g) return { guardian: null };
    const children = await this.db
      .select({ id: students.id, fullName: students.fullName, code: students.code })
      .from(studentGuardians)
      .innerJoin(students, eq(students.id, studentGuardians.studentId))
      .where(eq(studentGuardians.guardianId, g.id))
      .orderBy(asc(students.fullName));
    return { guardian: { id: g.id, fullName: g.fullName, phone: g.phone, children } };
  }

  async photoFileId(user: RequestUser, id: string): Promise<string> {
    await this.scope.assertVisible(user, id);
    const [row] = await this.db
      .select({ photo: students.photoFileId })
      .from(students)
      .where(eq(students.id, id));
    if (!row?.photo) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    return row.photo;
  }
}
