import { Module } from '@nestjs/common';
import { PreciosService } from './precios.service';
import { PreciosController } from './precios.controller';
import { ProveedorModule } from '../proveedor/proveedor.module';

@Module({
  imports: [ProveedorModule],
  controllers: [PreciosController],
  providers: [PreciosService],
})
export class PreciosModule {}
