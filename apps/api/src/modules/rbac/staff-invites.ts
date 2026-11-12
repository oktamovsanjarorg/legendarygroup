import type { StaffInvite as StaffInviteDto } from '@lg/contracts';
import { type InviteChannel, staffInvites, type Transaction } from '@lg/db';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { randomToken, sha256 } from '../auth/index.js';
import { INVITE_TTL_MS } from './first-director.js';

export interface InviteLinks {
  /** Web panel manzili (`PUBLIC_APP_URL`). */
  appUrl: string;
  /** Bot username (`TELEGRAM_BOT_USERNAME`). */
  botUsername: string;
}

/** Bot `/start` parametri prefiksi (≤ 64 belgi: `inv_` + 43 belgili token). */
export const BOT_INVITE_PREFIX = 'inv_';

export const inviteUrl = (links: InviteLinks, channel: InviteChannel, token: string): string =>
  channel === 'web'
    ? `${links.appUrl.replace(/\/$/, '')}/invite/${token}`
    : `https://t.me/${links.botUsername}?start=${BOT_INVITE_PREFIX}${token}`;

/**
 * Yangi taklif (24 soat, bir martalik). Shu foydalanuvchining shu kanaldagi eski, ishlatilmagan
 * takliflari darhol yaroqsiz qilinadi (muddati hozirga) — bir vaqtda faqat bitta havola ishlaydi.
 */
export async function issueInvite(
  tx: Transaction,
  links: InviteLinks,
  input: { userId: string; channel: InviteChannel; now: Date },
): Promise<StaffInviteDto> {
  const { userId, channel, now } = input;
  await tx
    .update(staffInvites)
    .set({ expiresAt: now })
    .where(
      and(
        eq(staffInvites.userId, userId),
        eq(staffInvites.channel, channel),
        isNull(staffInvites.usedAt),
        gt(staffInvites.expiresAt, now),
      ),
    );
  const token = randomToken();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
  await tx.insert(staffInvites).values({ userId, channel, tokenHash: sha256(token), expiresAt });
  return { channel, url: inviteUrl(links, channel, token), expiresAt: expiresAt.toISOString() };
}
