import { createHash, randomBytes } from 'node:crypto';

/** URL-xavfsiz tasodifiy token (refresh, challenge): 32 bayt = 256 bit. */
export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');

/** Tokenlar DB'da faqat SHA-256 hash ko'rinishida (05-data-model.md). */
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
