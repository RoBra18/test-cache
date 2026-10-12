import {
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProveedorPreciosService } from '../proveedor/proveedor-precios.service';
import { ConsultaPrecioRespuestaDto } from './dtos/consulta-precio-respuesta.dto';
import { CacheService } from 'src/redis/cache.service';

export type CacheStatus = 'HIT' | 'MISS';

@Injectable()
export class PreciosService {
    private readonly logger = new Logger(PreciosService.name);
    private readonly cacheTtl: number;

    constructor(
        private readonly cacheService: CacheService,
        private readonly proveedorService: ProveedorPreciosService,
        config: ConfigService,
    ) {
        this.cacheTtl = Number(config.get('CACHE_TTL_SEGUNDOS', 60));
    }

    private getCacheKey(sku: string): string {
        return `precio:${sku}`;
    }

    async obtenerPrecio(sku: string): Promise<{ data: ConsultaPrecioRespuestaDto; cache: CacheStatus }> {
        const key = this.getCacheKey(sku);

        const cached = await this.cacheService.get<ConsultaPrecioRespuestaDto>(key);
        if (cached) {
            return { data: cached, cache: 'HIT' };
        }

        const proveedorData = await this.proveedorService.obtenerPrecio(sku);
        if (!proveedorData) {
            throw new NotFoundException(`El SKU '${sku}' no existe en el proveedor`);
        }

        await this.cacheService.set(key, proveedorData, this.cacheTtl);

        return { data: proveedorData, cache: 'MISS' };
    }
}
