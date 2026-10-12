import { Module } from '@nestjs/common';
import { PreciosService } from './precios.service';
import { PreciosController } from './precios.controller';

@Module({
  controllers: [PreciosController],
  providers: [PreciosService],
})
export class PreciosModule {}
