import { Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type CreateTicketMessageRequest,
  CreateTicketMessageSchema,
  type CreateTicketRequest,
  CreateTicketSchema,
  type ListTicketsQuery,
  ListTicketsQuerySchema,
  type TicketDetail,
  type TicketItem,
  type TicketMessageItem,
  type UpdateTicketRequest,
  UpdateTicketSchema,
} from '@lg/contracts';
import { Audit, NoAudit } from '../../common/audit/audit.decorator.js';
import { Authenticated, RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { TicketsService } from './tickets.service.js';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(@Inject(TicketsService) private readonly service: TicketsService) {}

  @Post()
  @Authenticated()
  @Audit({ action: 'ticket.create', entity: 'ticket' })
  @ApiOperation({ summary: 'FR-RPT-7: Yangi murojaat (ticket) yaratish' })
  async create(
    @CurrentUser() actor: RequestUser,
    @ZodBody(CreateTicketSchema) body: CreateTicketRequest,
  ): Promise<TicketDetail> {
    return this.service.createTicket(actor, body);
  }

  @Get()
  @Authenticated()
  @NoAudit('Murojaatlar roʻyxati')
  @ApiOperation({ summary: 'FR-RPT-7: Murojaatlar roʻyxatini olish' })
  async list(
    @CurrentUser() actor: RequestUser,
    @ZodQuery(ListTicketsQuerySchema) query: ListTicketsQuery,
  ): Promise<{ items: TicketItem[] }> {
    return this.service.listTickets(actor, query);
  }

  @Get(':id')
  @Authenticated()
  @NoAudit('Murojaat tafsilotlari')
  @ApiOperation({ summary: 'FR-RPT-7: Murojaat va uning xabarlarini olish' })
  async getById(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TicketDetail> {
    return this.service.getTicket(actor, id);
  }

  @Post(':id/messages')
  @Authenticated()
  @Audit({ action: 'ticket.reply', entity: 'ticket_message' })
  @ApiOperation({ summary: 'FR-RPT-7: Murojaatga javob yoki xabar yuborish' })
  async addMessage(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(CreateTicketMessageSchema) body: CreateTicketMessageRequest,
  ): Promise<TicketMessageItem> {
    return this.service.addMessage(actor, id, body);
  }

  @Patch(':id')
  @RequirePermission('ticket.handle')
  @Audit({ action: 'ticket.update', entity: 'ticket' })
  @ApiOperation({ summary: 'FR-RPT-7: Murojaat holati yoki masʼulini yangilash' })
  async update(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(UpdateTicketSchema) body: UpdateTicketRequest,
  ): Promise<TicketItem> {
    return this.service.updateTicket(actor, id, body);
  }
}
