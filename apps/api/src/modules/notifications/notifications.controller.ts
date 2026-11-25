import { Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DEFAULT_BRANCH_ID,
  type ListUndeliveredQuery,
  ListUndeliveredQuerySchema,
  type NotificationPreference,
  type UndeliveredNotificationItem,
  type UpdateNotificationPreferencesRequest,
  UpdateNotificationPreferencesRequestSchema,
} from '@lg/contracts';
import { Audit } from '../../common/audit/audit.decorator.js';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { Authenticated } from '../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { NotificationDeliveryService } from './notification-delivery.service.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    @Inject(NotificationsService) private readonly service: NotificationsService,
    @Inject(NotificationDeliveryService) private readonly delivery: NotificationDeliveryService,
  ) {}

  @Get('preferences')
  @Authenticated()
  @NoAudit('Bildirishnoma sozlamalari')
  @ApiOperation({ summary: 'FR-RPT-4: Foydalanuvchining bildirishnoma sozlamalarini olish' })
  async getPreferences(@CurrentUser() actor: RequestUser): Promise<NotificationPreference[]> {
    return this.service.getUserPreferences(actor.id, actor.role);
  }

  @Patch('preferences')
  @Authenticated()
  @Audit({ action: 'notification_preferences.update', entity: 'notification_preferences' })
  @ApiOperation({
    summary: 'FR-RPT-4: Bildirishnoma sozlamalarini yangilash (majburiy turlar oʻchirilmaydi)',
  })
  async updatePreferences(
    @CurrentUser() actor: RequestUser,
    @ZodBody(UpdateNotificationPreferencesRequestSchema) body: UpdateNotificationPreferencesRequest,
  ): Promise<NotificationPreference[]> {
    return this.service.updateUserPreferences(actor.id, body.preferences, actor.role);
  }

  @Get('undelivered')
  @RequirePermission('student.manage')
  @NoAudit('Yetib bormagan xabarlar')
  @ApiOperation({ summary: 'FR-RPT-6: Yetib bormagan (xatolik yoki bloklangan) xabarlar roʻyxati' })
  async getUndelivered(
    @CurrentUser() actor: RequestUser,
    @ZodQuery(ListUndeliveredQuerySchema) query: ListUndeliveredQuery,
  ): Promise<UndeliveredNotificationItem[]> {
    const branchId = query.branchId ?? DEFAULT_BRANCH_ID;
    return this.service.getUndelivered(branchId, query.status);
  }

  @Post('undelivered/:id/retry')
  @RequirePermission('student.manage')
  @Audit({ action: 'notification.retry', entity: 'notification' })
  @ApiOperation({ summary: 'Yetib bormagan xabarni qayta yuborish' })
  async retry(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: boolean }> {
    await this.delivery.retry(id);
    return { success: true };
  }
}
