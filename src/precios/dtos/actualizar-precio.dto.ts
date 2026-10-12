import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class ActualizarPrecioDto {
  @ApiProperty({
    description: 'Nuevo precio del producto (debe ser mayor a 0)',
    example: 5400,
  })
  @IsNumber({}, { message: 'precio debe ser un número válido' })
  @IsPositive({ message: 'precio debe ser mayor que 0' })
  precio!: number;
}