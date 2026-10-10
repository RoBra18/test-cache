import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS = Symbol('REDIS');

// Cliente de Redis compartido. Inyéctalo con: constructor(@Inject(REDIS) private readonly redis: Redis)
@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('Redis');
        const redis = new Redis(config.get<string>('REDIS_URL', 'redis://localhost:6379'), {
          // Si Redis no responde, cada comando falla al segundo en lugar de quedar esperando.
          commandTimeout: 1000,
          maxRetriesPerRequest: 1,
        });
        // Sin este listener, ioredis imprime "Unhandled error event" en cada reintento de conexión.
        redis.on('error', (err: NodeJS.ErrnoException) => logger.warn(`Error de conexión: ${err.message || err.code}`));
        return redis;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown() {
    await this.redis.quit().catch(() => this.redis.disconnect());
  }
}
