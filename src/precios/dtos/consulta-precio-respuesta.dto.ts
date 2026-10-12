import { ApiProperty } from '@nestjs/swagger';

export class ConsultaPrecioRespuestaDto {
  @ApiProperty({ example: 'LAP-001' })
  sku!: string;

  @ApiProperty({ example: 5200 })
  precio!: number;

  @ApiProperty({ example: 'BOB' })
  moneda!: string;

  @ApiProperty({ example: '2026-10-09T14:30:00.000Z' })
  consultadoEn!: string;
}