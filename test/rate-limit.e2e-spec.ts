import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import Redis from 'ioredis';
import { AppModule } from '../src/app.module';
import { REDIS } from '../src/redis/constants';

describe('Rate Limiting (e2e)', () => {
  let app: INestApplication;
  let redisClient: Redis;
  const testApiKey = 'test-e2e-client-key';
  const testLimit = 3;
  const testWindow = 10;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            RATE_LIMIT_MAX: testLimit,
            RATE_LIMIT_VENTANA_SEGUNDOS: testWindow,
            CACHE_TTL_SEGUNDOS: 60,
            REDIS_HOST: process.env.REDIS_HOST || 'localhost',
            REDIS_PORT: process.env.REDIS_PORT || 6379,
          };
          return config[key] ?? defaultValue;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    redisClient = app.get<Redis>(REDIS);
  });

  beforeEach(async () => {
    await redisClient.del(`ratelimit:${testApiKey}`);
  });

  afterAll(async () => {
    await redisClient.del(`ratelimit:${testApiKey}`);
    await app.close();
  });

  it('debe responder 401 Unauthorized si falta el header x-api-key', async () => {
    const response = await request(app.getHttpServer())
      .get('/precios/LAP-001')
      .expect(401);

    expect(response.body.message).toContain('x-api-key');
  });

  it('debe responder 200 e incluir los headers X-RateLimit-* con una API key válida', async () => {
    const response = await request(app.getHttpServer())
      .get('/precios/LAP-001')
      .set('x-api-key', testApiKey)
      .expect(200);

    expect(response.headers['x-ratelimit-limit']).toBe(String(testLimit));
    expect(response.headers['x-ratelimit-remaining']).toBe(String(testLimit - 1));
    expect(response.headers['x-ratelimit-reset']).toBeDefined();
  });

  it('debe decrementar X-RateLimit-Remaining en peticiones consecutivas', async () => {
    const res1 = await request(app.getHttpServer())
      .get('/precios/LAP-001')
      .set('x-api-key', testApiKey)
      .expect(200);

    const res2 = await request(app.getHttpServer())
      .get('/precios/LAP-001')
      .set('x-api-key', testApiKey)
      .expect(200);

    const remaining1 = parseInt(res1.headers['x-ratelimit-remaining'], 10);
    const remaining2 = parseInt(res2.headers['x-ratelimit-remaining'], 10);

    expect(remaining2).toBe(remaining1 - 1);
  });

  it('debe responder 429 Too Many Requests y Retry-After al exceder el límite', async () => {
    for (let i = 0; i < testLimit; i++) {
      await request(app.getHttpServer())
        .get('/precios/LAP-001')
        .set('x-api-key', testApiKey)
        .expect(200);
    }

    const blocked = await request(app.getHttpServer())
      .get('/precios/LAP-001')
      .set('x-api-key', testApiKey)
      .expect(429);

    expect(blocked.headers['retry-after']).toBeDefined();
    const retryAfter = parseInt(blocked.headers['retry-after'], 10);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(testWindow);
  });
});