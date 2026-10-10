import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  @Get()
  @ApiOperation({ summary: 'Verifica la conexión a Redis' })
  @ApiOkResponse({ schema: { example: { status: 'ok', redis: 'up' } } })
  @ApiServiceUnavailableResponse({ description: 'Redis no responde' })
  async check() {
    try {
      await this.redis.ping();
      return { status: 'ok', redis: 'up' };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', redis: 'down' });
    }
  }
}
