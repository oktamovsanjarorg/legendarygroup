import { Controller, Get, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { InternalTokenGuard } from '../../common/index.js';

@Public()
@ApiTags('Internal')
@ApiSecurity('internal-token')
@UseGuards(InternalTokenGuard)
@Controller('internal')
export class InternalController {
  @Get('ping')
  @ApiOperation({ summary: 'Ichki servislar uchun aloqa tekshiruvi' })
  @ApiResponse({ status: 200, description: 'Token toʻgʻri va ichki API ishlamoqda' })
  @ApiResponse({ status: 401, description: 'Token notoʻgʻri yoki yoʻq' })
  ping(): { status: 'ok'; internal: true } {
    return { status: 'ok', internal: true };
  }
}
