import {
  CreateExpenseRequest,
  DEFAULT_BRANCH_ID,
  type ExpenseItem,
  type ListExpensesQuery,
  type MonthlyPnLSummary,
  type PnLQuery,
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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit, NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { ExpensesService } from './expenses.service.js';

@ApiTags('Expenses & Finance')
@ApiBearerAuth()
@Controller()
export class ExpensesController {
  constructor(@Inject(ExpensesService) private readonly service: ExpensesService) {}

  @Post('expenses')
  @RequirePermission('expense.manage')
  @Audit({ action: 'expense.create', entity: 'expense' })
  @ApiOperation({ summary: 'FR-FIN-1 Yangi xarajat kiritish' })
  async createExpense(
    @CurrentUser() actor: RequestUser,
    @ZodBody(CreateExpenseRequest) req: CreateExpenseRequest,
  ): Promise<ExpenseItem> {
    return this.service.createExpense(actor, DEFAULT_BRANCH_ID, req);
  }

  @Get('expenses')
  @RequirePermission('expense.manage')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'Xarajatlar roʻyxati' })
  async listExpenses(
    @CurrentUser() actor: RequestUser,
    @Query() query: ListExpensesQuery,
  ): Promise<ExpenseItem[]> {
    return this.service.listExpenses(actor, DEFAULT_BRANCH_ID, query);
  }

  @Get('expenses/:id')
  @RequirePermission('expense.manage')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'Xarajat tafsilotlari' })
  async getExpense(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExpenseItem> {
    return this.service.getExpense(actor, id);
  }

  @Patch('expenses/:id')
  @RequirePermission('expense.manage')
  @Audit({ action: 'expense.update', entity: 'expense' })
  @ApiOperation({ summary: 'Xarajatni tahrirlash' })
  async updateExpense(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(UpdateExpenseRequest) req: UpdateExpenseRequest,
  ): Promise<ExpenseItem> {
    return this.service.updateExpense(actor, id, req);
  }

  @Delete('expenses/:id')
  @RequirePermission('expense.manage')
  @Audit({ action: 'expense.delete', entity: 'expense' })
  @ApiOperation({ summary: 'Xarajatni oʻchirish' })
  async deleteExpense(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    await this.service.deleteExpense(actor, id);
    return { success: true };
  }

  @Get('finance/pnl')
  @RequirePermission('finance.view')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'FR-FIN-2 Oylik P&L (foyda-zarar) hisoboti' })
  async getMonthlyPnL(
    @CurrentUser() actor: RequestUser,
    @Query() query: PnLQuery,
  ): Promise<MonthlyPnLSummary> {
    return this.service.getMonthlyPnL(actor, DEFAULT_BRANCH_ID, query.period);
  }
}
