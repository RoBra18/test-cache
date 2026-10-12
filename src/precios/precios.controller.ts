import { Controller, Get, Param, Res } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { PreciosService } from './precios.service';
import { ConsultaPrecioRespuestaDto } from './dtos/consulta-precio-respuesta.dto';

@ApiTags('precios')
@Controller('precios')
export class PreciosController {
  constructor(private readonly preciosService: PreciosService) {

  }

  @Get(':sku')
  @ApiOperation({
    summary: 'Consultar precio de un producto con caché',
    description:
      'Devuelve el precio del producto desde Redis si está en caché (X-Cache: HIT) o desde el proveedor si no lo está (X-Cache: MISS).',
  })
  @ApiOkResponse({
    description: 'Precio obtenido exitosamente',
    type: ConsultaPrecioRespuestaDto,
    headers: {
      'X-Cache': {
        description: 'Indica si provino del caché (HIT) o del proveedor (MISS)',
        schema: { type: 'string', example: 'HIT' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'SKU no encontrado en el proveedor' })
  async obtenerPrecio( @Param('sku') sku: string, @Res({ passthrough: true }) res: Response,
  ): Promise<ConsultaPrecioRespuestaDto> {
    const { data, cache } = await this.preciosService.obtenerPrecio(sku);
    res.setHeader('X-Cache', cache);
    return data;
  }
}