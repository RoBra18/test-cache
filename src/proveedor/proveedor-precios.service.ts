import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PrecioProveedor {
  sku: string;
  precio: number;
  moneda: 'BOB';
  consultadoEn: string;
}

/**
 * Simula la API externa de un proveedor de precios: es LENTA (PROVEEDOR_LATENCIA_MS por
 * consulta) y cuenta cuántas veces se la llamó.
 *
 * NO MODIFIQUES ESTE ARCHIVO. Trátalo como un servicio de terceros que no controlas.
 * La evaluación usa el contador de llamadas para verificar que tu caché funciona.
 */
@Injectable()
export class ProveedorPreciosService {
  private readonly precios = new Map<string, number>([
    ['LAP-001', 5200.0],
    ['MON-002', 1350.5],
    ['TEC-003', 420.0],
    ['MOU-004', 150.75],
    ['IMP-005', 2890.0],
  ]);
  private llamadas = 0;
  private readonly latenciaMs: number;

  constructor(config: ConfigService) {
    this.latenciaMs = Number(config.get('PROVEEDOR_LATENCIA_MS', 1500));
  }

  /** Devuelve el precio actual, o null si el SKU no existe. Tarda PROVEEDOR_LATENCIA_MS. */
  async obtenerPrecio(sku: string): Promise<PrecioProveedor | null> {
    this.llamadas++;
    await new Promise((resolve) => setTimeout(resolve, this.latenciaMs));
    const precio = this.precios.get(sku);
    if (precio === undefined) {
      return null;
    }
    return { sku, precio, moneda: 'BOB', consultadoEn: new Date().toISOString() };
  }

  /** Cambia el precio de un SKU existente. Devuelve false si el SKU no existe. */
  async actualizarPrecio(sku: string, precio: number): Promise<boolean> {
    this.llamadas++;
    await new Promise((resolve) => setTimeout(resolve, this.latenciaMs));
    if (!this.precios.has(sku)) {
      return false;
    }
    this.precios.set(sku, precio);
    return true;
  }

  estadisticas() {
    return { llamadas: this.llamadas };
  }
}
