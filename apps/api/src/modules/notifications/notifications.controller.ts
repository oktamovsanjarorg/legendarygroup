import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DEFAULT_BRANCH_ID,
  type ListUndeliveredQuery,
  type NotificationPreference,
  type UndeliveredNotificationItem,
  type UpdateNotificationPreferencesRequest,
} from '@lg/contracts';
import { Audit } from '../../common/audit/audit.decorator.js';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { Authenticated } from '../../common/decorators/access.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly service: NotificationsService) {}

  @Get('preferences')
  @Authenticated()
  @NoAudit('Bildirishnoma sozlamalari')
  @ApiOperation({ summary: 'FR-RPT-4: Foydalanuvchining bildirishnoma sozlamalarini olish' })
  async getPreferences(@CurrentUser() actor: RequestUser): Promise<NotificationPreference[]> {
    return this.service.getUserPreferences(actor.id);
  }

  @Patch('preferences')
  @Authenticated()
  @Audit({ action: 'notification_preferences.update', entity: 'notification_preferences' })
  @ApiOperation({
    summary: 'FR-RPT-4: Bildirishnoma sozlamalarini yangilash (majburiy turlar oʻchirilmaydi)',
  })
  async updatePreferences(
    @CurrentUser() actor: RequestUser,
    @Body() body: UpdateNotificationPreferencesRequest,
  ): Promise<NotificationPreference[]> {
    return this.service.updateUserPreferences(actor.id, body.preferences);
  }

  @Get('undelivered')
  @RequirePermission('settings.manage')
  @NoAudit('Yetib bormagan xabarlar')
  @ApiOperation({ summary: 'FR-RPT-6: Yetib bormagan (xatolik yoki bloklangan) xabarlar roʻyxati' })
  async getUndelivered(
    @CurrentUser() actor: RequestUser,
    @Query() query: ListUndeliveredQuery,
  ): Promise<UndeliveredNotificationItem[]> {
    const branchId = query.branchId ?? DEFAULT_BRANCH_ID;
    return this.service.getUndelivered(branchId, query.status);
  }

  @Post('undelivered/:id/retry')
  @RequirePermission('settings.manage')
  @Audit({ action: 'notification.retry', entity: 'notification' })
  @ApiOperation({ summary: 'Yetib bormagan xabarni qayta yuborish' })
  async retry(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: boolean }> {
    await this.service.retryNotification(id);
    return { success: true };
  }
}
