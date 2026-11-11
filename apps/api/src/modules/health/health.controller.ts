import { Controller, Get, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { LivenessResult, ReadinessResult } from './health.service.js';
import { HealthService } from './health.service.js';

@Public()
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Jarayon tirikligini tekshirish (Liveness probe)' })
  @ApiResponse({ status: 200, description: 'Jarayon faol' })
  getLive(): LivenessResult {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'DB va Redis ulanishlarini tekshirish (Readiness probe)' })
  @ApiResponse({ status: 200, description: 'Barcha bogʻliq xizmatlar tayyor' })
  @ApiResponse({ status: 503, description: 'Kamida bitta xizmat ishlamayapti' })
  async getReady(): Promise<ReadinessResult> {
    return this.healthService.getReadiness();
  }
}
