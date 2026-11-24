import {
  CreateExpenseRequest,
  type ExpenseItem,
  ListExpensesQuery,
  type MonthlyPnLSummary,
  PnLQuery,
  UpdateExpenseRequest,
} from '@lg/contracts';
import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { auditContext } from '../../common/audit/request-context.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { ExpensesService } from './expenses.service.js';

@ApiTags('Expenses & Finance')
@ApiBearerAuth()
@Controller()
export class ExpensesController {
  constructor(@Inject(ExpensesService) private readonly service: ExpensesService) {}

  @Post('expenses')
  @RequirePermission('expense.manage')
  @NoAudit('ExpensesService ichida (oldin/keyin holati bilan)')
  @ApiOperation({ summary: 'FR-FIN-1 Yangi xarajat kiritish' })
  async createExpense(
    @CurrentUser() actor: RequestUser,
    @ZodBody(CreateExpenseRequest) body: CreateExpenseRequest,
    @Req() req: FastifyRequest,
  ): Promise<ExpenseItem> {
    return this.service.createExpense(actor, body, auditContext(req));
  }

  @Get('expenses')
  @RequirePermission('expense.manage')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'Xarajatlar roʻyxati' })
  async listExpenses(
    @ZodQuery(ListExpensesQuery) query: ListExpensesQuery,
  ): Promise<ExpenseItem[]> {
    return this.service.listExpenses(query);
  }

  @Get('expenses/:id')
  @RequirePermission('expense.manage')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'Xarajat tafsilotlari' })
  async getExpense(@Param('id', ParseUUIDPipe) id: string): Promise<ExpenseItem> {
    return this.service.getExpense(id);
  }

  @Patch('expenses/:id')
  @RequirePermission('expense.manage')
  @NoAudit('ExpensesService ichida (oldin/keyin holati bilan)')
  @ApiOperation({ summary: 'Xarajatni tahrirlash' })
  async updateExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(UpdateExpenseRequest) body: UpdateExpenseRequest,
    @Req() req: FastifyRequest,
  ): Promise<ExpenseItem> {
    return this.service.updateExpense(id, body, auditContext(req));
  }

  @Delete('expenses/:id')
  @RequirePermission('expense.manage')
  @NoAudit('ExpensesService ichida (oldin/keyin holati bilan)')
  @ApiOperation({ summary: 'Xarajatni oʻchirish' })
  async deleteExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: FastifyRequest,
  ): Promise<{ success: true }> {
    await this.service.deleteExpense(id, auditContext(req));
    return { success: true };
  }

  @Get('finance/pnl')
  @RequirePermission('finance.view')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'FR-FIN-2 Oylik P&L (foyda-zarar) hisoboti' })
  async getMonthlyPnL(@ZodQuery(PnLQuery) query: PnLQuery): Promise<MonthlyPnLSummary> {
    return this.service.getMonthlyPnL(query.period);
  }
}
