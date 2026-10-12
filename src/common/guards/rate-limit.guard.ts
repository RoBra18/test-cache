import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import Redis from 'ioredis';
import { REDIS } from '../../redis/constants';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly maxRequests: number;
  private readonly windowSeconds: number;

  private readonly luaScript = `
    local current = redis.call('INCR', KEYS[1])
    if current == 1 then
      redis.call('EXPIRE', KEYS[1], ARGV[1])
    end
    local ttl = redis.call('TTL', KEYS[1])
    return { current, ttl }
  `;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    config: ConfigService,
  ) {
    this.maxRequests = Number(config.get('RATE_LIMIT_MAX', 10));
    this.windowSeconds = Number(config.get('RATE_LIMIT_WINDOW_SEGUNDOS', 60));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const apiKey = req.headers['x-api-key'];
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
      throw new UnauthorizedException('Header x-api-key es requerido');
    }

    const key = `ratelimit:${apiKey.trim()}`;

    try {
      const resultado = (await this.redis.eval(
        this.luaScript,
        1,
        key,
        this.windowSeconds,
      )) as [number, number];

      const [current, rawTtl] = resultado;
      const ttl = rawTtl > 0 ? rawTtl : this.windowSeconds;
      const remaining = Math.max(0, this.maxRequests - current);

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', ttl);

      if (current > this.maxRequests) {
        res.setHeader('Retry-After', ttl);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Demasiadas peticiones. Límite de cuota excedido.',
            retryAfter: ttl,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (err: unknown) {
      if (err instanceof HttpException) {
        throw err;
      }

      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error de Rate Limiter en Redis: ${errorMsg}`);
      return true;
    }
  }
}