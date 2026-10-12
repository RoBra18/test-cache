import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from './redis.module';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const valor = await this.redis.get(key);
      return valor ? (JSON.parse(valor) as T) : null;
    } catch (err: any) {
      this.logger.error(`Error de lectura en Redis [key: ${key}]: ${err.message}`);
      return null;
    }
  }

  async set(key: string, value: any, ttlSegundos: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSegundos);
    } catch (err: any) {
      this.logger.error(`Error de escritura en Redis [key: ${key}]: ${err.message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (err: any) {
      this.logger.error(`Error invalidando clave en Redis [key: ${key}]: ${err.message}`);
    }
  }
}