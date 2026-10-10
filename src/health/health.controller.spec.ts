import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { REDIS } from '../redis/redis.module';
import { HealthController } from './health.controller';

// Ejemplo de prueba unitaria: el cliente de Redis se reemplaza por un mock.
describe('HealthController', () => {
  const redis = { ping: jest.fn() };
  let controller: HealthController;

  beforeEach(async () => {
    redis.ping.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: REDIS, useValue: redis }],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  it('responde ok cuando Redis responde', async () => {
    redis.ping.mockResolvedValue('PONG');
    await expect(controller.check()).resolves.toEqual({ status: 'ok', redis: 'up' });
  });

  it('responde 503 cuando Redis no responde', async () => {
    redis.ping.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
