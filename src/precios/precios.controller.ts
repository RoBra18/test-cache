import { Body, Controller, Get, HttpCode, HttpStatus, Param, Put, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { PreciosService } from './precios.service';
import { ConsultaPrecioRespuestaDto } from './dtos/consulta-precio-respuesta.dto';
import { PrecioActualizadoRespuestaDto } from './dtos/precio-actualizado-respuesta.dto';
import { ActualizarPrecioDto } from './dtos/actualizar-precio.dto';

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
  async obtenerPrecio(@Param('sku') sku: string, @Res({ passthrough: true }) res: Response,
  ): Promise<ConsultaPrecioRespuestaDto> {
    const { data, cache } = await this.preciosService.obtenerPrecio(sku);
    res.setHeader('X-Cache', cache);
    return data;
  }

  @Put(':sku')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar precio de un producto',
    description:
      'Actualiza el precio en el proveedor e invalida la clave correspondiente en Redis.',
  })
  @ApiOkResponse({
    description: 'Precio actualizado exitosamente e invalidado en caché',
    type: PrecioActualizadoRespuestaDto,
  })
  @ApiBadRequestResponse({ description: 'Precio inválido (no numérico o menor/igual a 0)' })
  @ApiNotFoundResponse({ description: 'SKU no encontrado en el proveedor' })
  async actualizarPrecio(
    @Param('sku') sku: string, @Body() dto: ActualizarPrecioDto ): Promise<PrecioActualizadoRespuestaDto> {
    return this.preciosService.actualizarPrecio(sku, dto.precio);
  }
}