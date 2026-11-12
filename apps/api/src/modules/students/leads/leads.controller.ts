import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ChangeLeadStatusRequest,
  ConvertLeadRequest,
  CreateLeadRequest,
  type LeadDto,
  LeadListQuery,
  LeadStatsQuery,
  type LeadStatsDto,
  ScheduleTrialRequest,
  UpdateLeadRequest,
} from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { NoAudit } from '../../../common/audit/audit.decorator.js';
import { auditContext } from '../../../common/audit/request-context.js';
import { RequirePermission } from '../../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../../common/decorators/zod.decorators.js';
import { LeadConvertService } from './lead-convert.service.js';
import { LeadsQueryService } from './leads-query.service.js';
import { LeadsService } from './leads.service.js';

const NO_AUDIT = 'LeadsService ichida';

/** Lidlar (T-107, W-08). Hammasi `lead.manage` (Director, Admin). */
@ApiTags('Leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadsController {
  constructor(
    @Inject(LeadsQueryService) private readonly query: LeadsQueryService,
    @Inject(LeadsService) private readonly leads: LeadsService,
    @Inject(LeadConvertService) private readonly converter: LeadConvertService,
  ) {}

  @Get()
  @RequirePermission('lead.manage')
  @ApiOperation({ summary: 'Lidlar (kanban): holat, kurs, manba, mas’ul, qidiruv' })
  list(@ZodQuery(LeadListQuery) q: z.output<typeof LeadListQuery>): Promise<LeadDto[]> {
    return this.query.list(q);
  }

  @Get('stats')
  @RequirePermission('lead.manage')
  @ApiOperation({ summary: 'Manba statistikasi va konversiya voronkasi' })
  stats(@ZodQuery(LeadStatsQuery) q: z.output<typeof LeadStatsQuery>): Promise<LeadStatsDto> {
    return this.query.stats(q);
  }

  @Get(':id')
  @RequirePermission('lead.manage')
  @ApiOperation({ summary: 'Lid' })
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<LeadDto> {
    return this.query.detail(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('lead.manage')
  @NoAudit(NO_AUDIT)
  @ApiOperation({ summary: 'Lid qoʻshish (ochiq lid takrori — 409 LEAD_EXISTS)' })
  create(
    @ZodBody(CreateLeadRequest) body: z.output<typeof CreateLeadRequest>,
    @Req() req: FastifyRequest,
  ): Promise<LeadDto> {
    return this.leads.create(auditContext(req), body);
  }

  @Patch(':id')
  @RequirePermission('lead.manage')
  @NoAudit(NO_AUDIT)
  @ApiOperation({ summary: 'Lidni tahrirlash' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(UpdateLeadRequest) body: z.output<typeof UpdateLeadRequest>,
    @Req() req: FastifyRequest,
  ): Promise<LeadDto> {
    return this.leads.update(auditContext(req), id, body);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('lead.manage')
  @NoAudit(NO_AUDIT)
  @ApiOperation({ summary: 'Holat (kanban ustuni); rad etish — sabab bilan' })
  status(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(ChangeLeadStatusRequest) body: z.output<typeof ChangeLeadStatusRequest>,
    @Req() req: FastifyRequest,
  ): Promise<LeadDto> {
    return this.leads.changeStatus(auditContext(req), id, body);
  }

  @Post(':id/trial')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('lead.manage')
  @NoAudit(NO_AUDIT)
  @ApiOperation({ summary: 'Sinov darsiga yozish' })
  trial(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(ScheduleTrialRequest) body: z.output<typeof ScheduleTrialRequest>,
    @Req() req: FastifyRequest,
  ): Promise<LeadDto> {
    return this.leads.scheduleTrial(auditContext(req), id, body.lessonId);
  }

  @Post(':id/convert')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('lead.manage')
  @NoAudit(NO_AUDIT)
  @ApiOperation({ summary: 'Oʻquvchiga aylantirish (+ ixtiyoriy guruhga yozish)' })
  convert(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(ConvertLeadRequest) body: z.output<typeof ConvertLeadRequest>,
    @Req() req: FastifyRequest,
  ): Promise<LeadDto> {
    return this.converter.convert(auditContext(req), id, body);
  }
}
