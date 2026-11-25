import {
  type BotStudentLinkResult,
  TelegramOnboardRequest,
  type TelegramOnboardResult,
  TelegramStudentOnboardRequest,
  TelegramStatusRequest,
  type TelegramOnboardStatus,
} from '@lg/contracts';
import type { Clock } from '@lg/domain';
import { Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { AppException } from '../../common/errors/app.exception.js';
import { RateLimiter, type RateLimit } from '../../common/rate-limit/rate-limiter.js';
import { EnvService } from '../../config/env.service.js';
import { verifyContactResponse, verifyInitData } from '../auth/index.js';
import { GuardianLinkService } from './guardian-link.service.js';
import { StaffLinkService } from './staff-link.service.js';
import { StudentLinkService } from './student-link.service.js';

/** Bir Telegram akkauntidan — 20 urinish / soat (raqam ro'yxatini terib chiqish yo'q). */
const ONBOARD_LIMIT: RateLimit = { scope: 'tg:onboard', limit: 20, windowS: 60 * 60 };

/**
 * C-03 Mini App ichida bog'lanish (Q-111): bot qiladigan ishning o'zi — xodim → ota-ona,
 * o'quvchi — kod bilan. Kim ekanligi `initData`dan, raqam — Telegram imzolagan kontaktdan;
 * kontakt boshqa odamniki bo'lsa — rad. Audit — link servislari ichida.
 */
@Public()
@NoAudit('Link servislari ichida')
@ApiTags('Auth')
@Controller('auth/telegram')
export class TelegramOnboardingController {
  private readonly botToken: string;

  constructor(
    @Inject(StaffLinkService) private readonly staff: StaffLinkService,
    @Inject(GuardianLinkService) private readonly guardians: GuardianLinkService,
    @Inject(StudentLinkService) private readonly students: StudentLinkService,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(EnvService) env: EnvService,
  ) {
    this.botToken = env.get('TELEGRAM_BOT_TOKEN');
  }

  @Post('contact')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'C-03: raqam ulashib bog‘lanish (xodim yoki ota-ona)' })
  async contact(
    @ZodBody(TelegramOnboardRequest) body: z.output<typeof TelegramOnboardRequest>,
  ): Promise<TelegramOnboardResult> {
    const who = await this.identify(body.initData, body.contact);
    const staff = await this.staff.linkByContact({
      telegramId: who.telegramId,
      phone: who.phone,
      username: who.username,
    });
    if (staff.result === 'conflict') return { result: 'conflict' };
    if (staff.result !== 'not_found') return { result: 'linked' };
    const g = await this.guardians.linkGuardianByContact({
      telegramId: who.telegramId,
      phone: who.phone,
      fullName: who.fullName,
      username: who.username,
      createRequest: body.createRequest,
    });
    const linked = ['guardian_linked', 'already_linked', 'staff_linked'].includes(g.result);
    if (linked) return { result: 'linked' };
    if (g.result === 'request_created' || g.result === 'pending_approval')
      return { result: g.result };
    return { result: g.result === 'conflict' ? 'conflict' : 'not_found' };
  }

  @Post('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'C-03: ochilganda — soʻrov kutilyaptimi yoki rad etilganmi' })
  async status(
    @ZodBody(TelegramStatusRequest) body: TelegramStatusRequest,
  ): Promise<TelegramOnboardStatus> {
    const me = verifyInitData(body.initData, this.botToken, this.clock.now().getTime());
    if (!me.ok) throw new AppException(HttpStatus.UNAUTHORIZED, 'INVALID_INIT_DATA');
    const s = await this.guardians.checkTelegramStatus(me.user.id);
    return { status: s.status, ...(s.rejectReason ? { rejectReason: s.rejectReason } : {}) };
  }

  @Post('student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'C-03: o‘quvchi — raqam va kod bilan bog‘lanish' })
  async student(
    @ZodBody(TelegramStudentOnboardRequest) body: TelegramStudentOnboardRequest,
  ): Promise<BotStudentLinkResult> {
    const who = await this.identify(body.initData, body.contact);
    return this.students.linkStudent({
      telegramId: who.telegramId,
      phone: who.phone,
      code: body.code,
    });
  }

  private async identify(initData: string, contact: string) {
    const now = this.clock.now().getTime();
    const me = verifyInitData(initData, this.botToken, now);
    if (!me.ok) throw new AppException(HttpStatus.UNAUTHORIZED, 'INVALID_INIT_DATA');
    await this.limiter.hit(ONBOARD_LIMIT, String(me.user.id));
    const c = verifyContactResponse(contact, this.botToken, now);
    // Boshqa odamning kontakti (forward) — o'zini o'sha odam qilib bog'lab bo'lmaydi.
    if (!c.ok || c.userId !== me.user.id)
      throw new AppException(HttpStatus.BAD_REQUEST, 'INVALID_CONTACT');
    return {
      telegramId: me.user.id,
      phone: c.phone,
      fullName: c.fullName || me.user.firstName || 'Foydalanuvchi',
      username: me.user.username ?? undefined,
    };
  }
}
