import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProveedorPreciosService } from './proveedor-precios.service';

// No modificar: la evaluación consulta este endpoint.
@ApiTags('proveedor')
@Controller('proveedor')
export class ProveedorController {
  constructor(private readonly proveedor: ProveedorPreciosService) {}

  @Get('estadisticas')
  @ApiOperation({ summary: 'Cuántas veces se llamó al proveedor externo simulado' })
  @ApiOkResponse({ schema: { example: { llamadas: 3 } } })
  estadisticas() {
    return this.proveedor.estadisticas();
  }
}
