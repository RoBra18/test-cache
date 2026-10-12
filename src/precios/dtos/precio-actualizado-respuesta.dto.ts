import { ApiProperty } from '@nestjs/swagger';

export class PrecioActualizadoRespuestaDto {
  @ApiProperty({
    description: 'Código de SKU del producto',
    example: 'LAP-001',
  })
  sku!: string;

  @ApiProperty({
    description: 'Nuevo precio actualizado en el proveedor',
    example: 5400,
  })
  precio!: number;

  @ApiProperty({
    description: 'Moneda en la que se expresa el precio',
    example: 'BOB',
  })
  moneda!: string;
}