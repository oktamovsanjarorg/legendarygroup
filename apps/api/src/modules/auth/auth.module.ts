import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { InternalTokenGuard } from '../../common/guards/internal-token.guard.js';
import { AccessTokenGuard } from './access-token.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { InternalAuthController } from './internal-auth.controller.js';
import { PanelHandoffController } from './panel-handoff.controller.js';
import { PanelHandoffService } from './panel-handoff.service.js';
import { SessionsController } from './sessions.controller.js';
import { SessionsService } from './sessions.service.js';
import { StaffUsers } from './staff-users.js';
import { TelegramAuthService } from './telegram-auth.service.js';
import { TelegramModule } from '../telegram/index.js';
import { TelegramChallenges } from './telegram-challenges.js';
import { TelegramLoginNotifier } from './telegram-login-notifier.js';
import { TelegramLoginService } from './telegram-login.service.js';
import { TokensService } from './tokens.service.js';
import { TotpService } from './totp.service.js';

/** Xodimlar autentifikatsiyasi (T-006). Global `AccessTokenGuard` — deny by default. */
@Module({
  imports: [TelegramModule],
  controllers: [AuthController, SessionsController, InternalAuthController, PanelHandoffController],
  providers: [
    AuthService,
    SessionsService,
    StaffUsers,
    TelegramLoginService,
    TelegramChallenges,
    TelegramLoginNotifier,
    PanelHandoffService,
    TelegramAuthService,
    TokensService,
    TotpService,
    InternalTokenGuard,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
  exports: [SessionsService, TokensService],
})
export class AuthModule {}
