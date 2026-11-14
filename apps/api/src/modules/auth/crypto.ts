import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id, OWASP tavsiyasi (19 MiB, t=2, p=1) — 07-quality-security.md §3.
 * `@node-rs/argon2` standart algoritmi — Argon2id.
 */
const ARGON2 = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (password: string): Promise<string> => hash(password, ARGON2);

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false; // buzilgan hash — "noto'g'ri parol" kabi
  }
}

/**
 * Foydalanuvchi topilmaganda ham shu ish bajariladi — javob vaqti bo'yicha
 * mavjud telefon raqamlarni aniqlab bo'lmasin (user enumeration).
 */
let dummyHash: Promise<string> | undefined;
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword('dummy-password-for-timing');
  await verifyPassword(await dummyHash, password);
}

/** URL-xavfsiz tasodifiy token (refresh, taklif): 32 bayt = 256 bit. */
export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');

/** Tokenlar DB'da faqat SHA-256 hash ko'rinishida (05-data-model.md). */
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

/**
 * AES-256-GCM (TOTP sirlari, 05-data-model.md "shifrlangan").
 * Format: `v1.<iv>.<tag>.<ciphertext>` (base64url) — kalit almashtirishga tayyor versiya bilan.
 */
export class SecretBox {
  private readonly key: Buffer;

  constructor(hexKey: string) {
    this.key = Buffer.from(hexKey, 'hex');
    if (this.key.length !== 32) throw new Error("SecretBox: kalit 32 bayt bo'lishi kerak");
  }

  seal(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return ['v1', iv, cipher.getAuthTag(), data]
      .map((p) => (typeof p === 'string' ? p : p.toString('base64url')))
      .join('.');
  }

  open(sealed: string): string {
    const [version, iv, tag, data] = sealed.split('.');
    if (version !== 'v1' || !iv || !tag || !data) throw new Error("SecretBox: format noto'g'ri");
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(data, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}
