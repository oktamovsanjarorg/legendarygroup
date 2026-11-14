import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { FILE_PURPOSES, type FileInfo, type FilePurpose, type Permission } from '@lg/contracts';
import { type Database, files } from '@lg/db';
import type { Clock } from '@lg/domain';
import { eq } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import { uuidv7 } from 'uuidv7';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { REDIS_TOKEN } from '../../common/redis/redis.tokens.js';
import { StorageService } from '../../common/storage/storage.service.js';
import type { RequestUser } from '../auth/index.js';
import { PermissionsService } from '../rbac/index.js';
import { processUpload } from './file-processing.js';

const UPLOAD_TTL_S = 15 * 60;
/** FR-SYS-2: ko'rish havolasi vaqtinchalik (5 daq). */
export const VIEW_URL_TTL_S = 5 * 60;

interface PendingUpload {
  key: string;
  purpose: FilePurpose;
  mime: string;
  userId: string;
}

const pendingKey = (id: string) => `files:upload:${id}`;
const finalKey = (id: string, ext: string, now: Date) =>
  `files/${now.toISOString().slice(0, 7).replace('-', '/')}/${id}.${ext}`;

type Row = typeof files.$inferSelect;
const toInfo = (r: Row): FileInfo => ({
  id: r.id,
  purpose: r.purpose as FilePurpose,
  mime: r.mime,
  size: r.size,
  sha256: r.sha256,
  createdAt: r.createdAt.toISOString(),
});

/**
 * Fayllar (T-019, FR-SYS-2). Brauzer → S3 (presigned POST, `tmp/`) → `complete` — server faylni
 * tekshiradi va qayta ishlaydi (`processUpload`), yakuniy kalitga yozadi, `files` qatori + audit.
 * Bot fayli — ichki endpoint orqali shu `ingest` oqimiga. Ruxsat maqsad bo'yicha (`FILE_PURPOSES`).
 */
@Injectable()
export class FilesService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createUpload(user: RequestUser, req: { purpose: FilePurpose; mime: string; size: number }) {
    const rule = FILE_PURPOSES[req.purpose];
    await this.assertAllowed(user, rule.upload);
    if (!(rule.mimes as readonly string[]).includes(req.mime)) {
      throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, 'FILE_TYPE_NOT_ALLOWED');
    }
    if (req.size > rule.maxBytes)
      throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, 'FILE_TOO_LARGE');

    const uploadId = uuidv7();
    const pending: PendingUpload = {
      key: `tmp/${uploadId}`,
      purpose: req.purpose,
      mime: req.mime,
      userId: user.id,
    };
    const post = await this.storage.presignedPost(
      pending.key,
      req.mime,
      rule.maxBytes,
      UPLOAD_TTL_S,
    );
    await this.redis.set(pendingKey(uploadId), JSON.stringify(pending), 'EX', UPLOAD_TTL_S);
    const expiresAt = new Date(this.clock.now().getTime() + UPLOAD_TTL_S * 1000).toISOString();
    return { uploadId, url: post.url, fields: post.fields, expiresAt };
  }

  /** Bir martalik: yuklash faqat uni boshlagan foydalanuvchi tomonidan yakunlanadi. */
  async completeUpload(user: RequestUser, uploadId: string, ctx: AuditContext): Promise<FileInfo> {
    const raw = await this.redis.getdel(pendingKey(uploadId));
    const pending = raw ? (JSON.parse(raw) as PendingUpload) : null;
    if (!pending || pending.userId !== user.id)
      throw new AppException(HttpStatus.NOT_FOUND, 'UPLOAD_NOT_FOUND');
    try {
      const body = await this.storage.read(pending.key, FILE_PURPOSES[pending.purpose].maxBytes);
      if (!body) throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, 'FILE_TOO_LARGE');
      return await this.ingest(
        body,
        { purpose: pending.purpose, declaredMime: pending.mime, uploadedBy: user.id },
        ctx,
      );
    } finally {
      await this.storage.remove(pending.key).catch(() => undefined);
    }
  }

  /** Tekshirish → qayta ishlash → yakuniy kalit → `files` + audit. */
  async ingest(
    input: Buffer,
    meta: { purpose: FilePurpose; declaredMime?: string; uploadedBy: string | null },
    ctx: AuditContext,
  ): Promise<FileInfo> {
    const result = await processUpload(input, meta.purpose, meta.declaredMime);
    if (!result.ok) throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, result.error);
    const { file } = result;
    const id = uuidv7();
    const now = this.clock.now();
    const key = finalKey(id, file.ext, now);
    await this.storage.write(key, file.body, file.mime);
    const [row] = await this.db
      .insert(files)
      .values({
        id,
        s3Key: key,
        mime: file.mime,
        size: file.body.length,
        sha256: file.sha256,
        uploadedBy: meta.uploadedBy,
        purpose: meta.purpose,
        createdAt: now,
      })
      .returning();
    if (!row) throw new Error('fayl yozilmadi');
    const info = toInfo(row);
    await this.audit.record(ctx, {
      action: 'file.upload',
      entity: 'file',
      entityId: id,
      after: { ...info },
    });
    return info;
  }

  /** Ko'rish: yuklagan foydalanuvchi yoki maqsadning `view` ruxsati. Havola 5 daqiqa. */
  async viewUrl(
    user: RequestUser,
    fileId: string,
  ): Promise<{ url: string; expiresAt: string; file: FileInfo }> {
    const [row] = await this.db.select().from(files).where(eq(files.id, fileId));
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    if (row.uploadedBy !== user.id) {
      const rule = FILE_PURPOSES[row.purpose as FilePurpose];
      // Mavjudligini oshkor qilmaslik uchun ruxsatsiz holatda ham 404.
      if (!rule || !(await this.has(user, rule.view)))
        throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    }
    const url = await this.storage.presignedGet(row.s3Key, VIEW_URL_TTL_S);
    const expiresAt = new Date(this.clock.now().getTime() + VIEW_URL_TTL_S * 1000).toISOString();
    return { url, expiresAt, file: toInfo(row) };
  }

  /** Fayl maqsadi (boshqa modullar `*_file_id`ni tekshirishi uchun); yo'q — `null`. */
  async purposeOf(fileId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ purpose: files.purpose })
      .from(files)
      .where(eq(files.id, fileId));
    return row?.purpose ?? null;
  }

  /**
   * Scope'ni chaqiruvchi modul tekshirgan holda ko'rish havolasi (masalan, ota-ona — faqat o'z
   * farzandi rasmi, T-105). Ruxsat tekshiruvi YO'Q — faqat scope'dan keyin chaqiriladi.
   */
  async scopedViewUrl(fileId: string): Promise<{ url: string; expiresAt: string }> {
    const [row] = await this.db.select().from(files).where(eq(files.id, fileId));
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    const url = await this.storage.presignedGet(row.s3Key, VIEW_URL_TTL_S);
    const expiresAt = new Date(this.clock.now().getTime() + VIEW_URL_TTL_S * 1000).toISOString();
    return { url, expiresAt };
  }

  private async has(user: RequestUser, permission: Permission) {
    return (await this.permissions.forUser(user.id, user.role, user.pv)).has(permission);
  }

  private async assertAllowed(user: RequestUser, permission: Permission) {
    if (!(await this.has(user, permission)))
      throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }
}
