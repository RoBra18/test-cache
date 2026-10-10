import { Module } from '@nestjs/common';
import { ProveedorController } from './proveedor.controller';
import { ProveedorPreciosService } from './proveedor-precios.service';

@Module({
  controllers: [ProveedorController],
  providers: [ProveedorPreciosService],
  exports: [ProveedorPreciosService],
})
export class ProveedorModule {}
