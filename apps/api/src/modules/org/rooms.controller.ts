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
import { type Room, CreateRoomRequest, OrgListQuery, UpdateRoomRequest } from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod.decorators.js';
import { auditContext } from '../auth/index.js';
import { RoomsService } from './rooms.service.js';

/** Xonalar (T-102, W-09). Hammasi `course.manage` (02 §2 — Director, Admin). */
@ApiTags('Org')
@ApiBearerAuth()
@Controller('rooms')
export class RoomsController {
  constructor(@Inject(RoomsService) private readonly rooms: RoomsService) {}

  @Get()
  @RequirePermission('course.manage')
  @ApiOperation({ summary: "Xonalar ro'yxati (standart — faollari)" })
  list(@ZodQuery(OrgListQuery) q: z.output<typeof OrgListQuery>): Promise<Room[]> {
    return this.rooms.list(q.status);
  }

  @Get(':id')
  @RequirePermission('course.manage')
  @ApiOperation({ summary: 'Xona' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<Room> {
    return this.rooms.get(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('course.manage')
  @NoAudit('RoomsService.create ichida')
  @ApiOperation({ summary: "Xona qo'shish" })
  create(
    @ZodBody(CreateRoomRequest) body: z.output<typeof CreateRoomRequest>,
    @Req() req: FastifyRequest,
  ): Promise<Room> {
    return this.rooms.create(auditContext(req), body);
  }

  @Patch(':id')
  @RequirePermission('course.manage')
  @NoAudit('RoomsService.update ichida (before/after)')
  @ApiOperation({ summary: 'Xonani tahrirlash' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(UpdateRoomRequest) body: z.output<typeof UpdateRoomRequest>,
    @Req() req: FastifyRequest,
  ): Promise<Room> {
    return this.rooms.update(auditContext(req), id, body);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('course.manage')
  @NoAudit('RoomsService.setArchived ichida')
  @ApiOperation({ summary: 'Arxivlash' })
  archive(@Param('id', ParseUUIDPipe) id: string, @Req() req: FastifyRequest): Promise<Room> {
    return this.rooms.setArchived(auditContext(req), id, 'archive');
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('course.manage')
  @NoAudit('RoomsService.setArchived ichida')
  @ApiOperation({ summary: 'Arxivdan chiqarish' })
  restore(@Param('id', ParseUUIDPipe) id: string, @Req() req: FastifyRequest): Promise<Room> {
    return this.rooms.setArchived(auditContext(req), id, 'restore');
  }
}
