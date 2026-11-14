import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { EnvService } from '../../config/env.service.js';

export interface PresignedPost {
  url: string;
  fields: Record<string, string>;
}

/**
 * S3 (prod — AWS, lokal — MinIO). Bucket private: brauzer faqat vaqtinchalik imzoli
 * havolalar bilan ishlaydi (FR-SYS-2). Kalitlar berilmasa — SDK standart zanjiri (IAM roli).
 */
@Injectable()
export class StorageService implements OnApplicationShutdown {
  private readonly s3: S3Client;
  readonly bucket: string;

  constructor(@Inject(EnvService) env: EnvService) {
    const accessKeyId = env.get('S3_ACCESS_KEY_ID');
    const secretAccessKey = env.get('S3_SECRET_ACCESS_KEY');
    this.bucket = env.get('S3_BUCKET_FILES');
    this.s3 = new S3Client({
      region: env.get('S3_REGION'),
      endpoint: env.get('S3_ENDPOINT'),
      forcePathStyle: env.get('S3_FORCE_PATH_STYLE'),
      credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
    });
  }

  /** To'g'ridan-to'g'ri yuklash: hajm va Content-Type S3 tomonida majburlanadi. */
  presignedPost(
    key: string,
    mime: string,
    maxBytes: number,
    expiresS: number,
  ): Promise<PresignedPost> {
    return createPresignedPost(this.s3, {
      Bucket: this.bucket,
      Key: key,
      Conditions: [
        ['content-length-range', 1, maxBytes],
        ['eq', '$Content-Type', mime],
      ],
      Fields: { 'Content-Type': mime },
      Expires: expiresS,
    });
  }

  presignedGet(key: string, expiresS: number, downloadName?: string): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: downloadName
          ? `attachment; filename="${downloadName}"`
          : undefined,
      }),
      { expiresIn: expiresS },
    );
  }

  /** Obyektni o'qiydi; `maxBytes`dan katta bo'lsa — `null` (xotirani himoya qilish). */
  async read(key: string, maxBytes: number): Promise<Buffer | null> {
    try {
      const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if ((res.ContentLength ?? 0) > maxBytes || !res.Body) return null;
      return Buffer.from(await res.Body.transformToByteArray());
    } catch (err) {
      if ((err as { name?: string }).name === 'NoSuchKey') return null;
      throw err;
    }
  }

  async write(key: string, body: Buffer, mime: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: mime }),
    );
  }

  async remove(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  onApplicationShutdown(): void {
    this.s3.destroy();
  }
}
