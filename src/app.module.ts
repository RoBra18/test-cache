import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { ProveedorModule } from './proveedor/proveedor.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    HealthModule,
    ProveedorModule,
    // TODO: registra aquí tu módulo de precios.
  ],
})
export class AppModule {}
