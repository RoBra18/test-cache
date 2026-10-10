# Examen práctico 3 de 3 — Caché y límite de peticiones (Redis)

Este es uno de los **tres repositorios** del examen práctico para el puesto de **Desarrollador Backend Junior**. Los otros dos son [`hcrm-examen-pedidos`](https://github.com/hansa-examenes/hcrm-examen-pedidos) (SQL Server) y [`hcrm-examen-visitas`](https://github.com/hansa-examenes/hcrm-examen-visitas) (MongoDB).

## Reglas generales (iguales para los 3 repositorios)

- **Stack obligatorio: NestJS + TypeScript.** El esqueleto ya está armado; construye sobre él.
- **Puedes usar IA** (ChatGPT, Claude, Copilot, etc.), documentación y cualquier recurso. No es trampa: es como se trabaja hoy.
- **Pero tendrás que defender tu solución** en una entrevista técnica: explicar cada decisión, responder preguntas sobre tu código y **hacer un cambio pequeño en vivo**. Si no entiendes lo que entregaste, se va a notar.
- **No cambies el contrato de la API** (rutas, códigos HTTP, formato de entrada y salida). Revisaremos tu entrega con pruebas automáticas que dependen de ese contrato.
- **Haz commits pequeños y frecuentes.** El historial es parte de la evaluación: queremos ver cómo avanzaste, no solo el resultado.
- **Completa `DECISIONES.md`** con las decisiones que tomaste y por qué (media página alcanza).
- **Tiempo estimado:** entre 1 y 2 horas por repositorio.

### Entrega

1. **Crea tu copia con "Use this template"** (botón verde arriba a la derecha → *Create a new repository*). **No hagas fork.**
   - *Owner:* tu cuenta de GitHub. *Repository name:* el mismo nombre de este repositorio.
   - *Visibility:* **Private**.
2. **Invita a `Sergio-Al` como colaborador** en cada repositorio: *Settings → Collaborators → Add people*.
3. Trabaja en tu repositorio y sube tus commits (`git push`) a medida que avanzas.
4. **Responde el correo del examen con los 3 enlaces** antes de la fecha y hora indicadas. Evaluaremos el último commit subido antes de ese correo.

## Requisitos

- Node.js 20 o superior
- Docker Desktop (o Docker Engine + Compose)

## Cómo levantar el proyecto

```bash
cp .env.example .env
npm install
npm run db:up        # levanta Redis
npm run start:dev    # API en http://localhost:4003
```

La documentación interactiva de la API (Swagger) queda en **http://localhost:4003/api**.

Comprueba que todo funciona:

```bash
curl http://localhost:4003/health                   # {"status":"ok","redis":"up"}
curl http://localhost:4003/proveedor/estadisticas   # {"llamadas":0}
```

## Qué ya está hecho

| Pieza | Descripción |
|---|---|
| `GET /health` | Verifica la conexión a Redis |
| `GET /api` | Documentación Swagger (el JSON está en `/api-json`) |
| `RedisModule` | Cliente `ioredis` listo para inyectar con `@Inject(REDIS)` |
| `ProveedorPreciosService` | Simula la API externa de un proveedor de precios. Es **lenta** (1,5 segundos por llamada) y cuenta cuántas veces se la llamó |
| `GET /proveedor/estadisticas` | Devuelve `{ "llamadas": N }`: cuántas veces se llamó al proveedor |

**No modifiques** `ProveedorPreciosService` ni `GET /proveedor/estadisticas`: trátalos como un servicio de terceros. La evaluación usa el contador de llamadas para verificar que tu caché funciona. SKUs disponibles: `LAP-001`, `MON-002`, `TEC-003`, `MOU-004`, `IMP-005`.

## Qué tienes que construir

Varias aplicaciones consultan precios a través de esta API. El proveedor es lento y cobra por consulta, así que hay que **evitar llamarlo cuando no hace falta**. Además, algunos clientes hacen demasiadas peticiones, así que hay que **limitar cuántas peticiones puede hacer cada cliente**.

> En producción esta API corre con **varias réplicas** detrás de un balanceador. Por eso el caché y el límite de peticiones tienen que vivir en Redis y no en la memoria del proceso. El proveedor simulado vive en memoria solo para simplificar el examen.

### 1. `GET /precios/:sku` — consultar un precio con caché

Respuesta **200**:

```json
{ "sku": "LAP-001", "precio": 5200, "moneda": "BOB", "consultadoEn": "2026-10-09T14:30:00.000Z" }
```

- Si el precio está en caché, se responde desde Redis **sin llamar al proveedor**.
- Si no está, se consulta al proveedor y se guarda en caché durante `CACHE_TTL_SEGUNDOS` (por defecto 60).
- Toda respuesta debe incluir el header **`X-Cache: HIT`** (vino del caché) o **`X-Cache: MISS`** (se consultó al proveedor).
- **404** si el SKU no existe en el proveedor.

### 2. `PUT /precios/:sku` — actualizar un precio

Petición: `{ "precio": 5400 }` (número mayor que 0).

- Actualiza el precio en el proveedor y **invalida el caché** de ese SKU: la siguiente consulta debe devolver el precio nuevo (con `X-Cache: MISS`), no el viejo.
- Respuesta **200**: `{ "sku": "LAP-001", "precio": 5400, "moneda": "BOB" }`.
- **400** si el body es inválido, **404** si el SKU no existe.

### 3. Límite de peticiones por cliente

Aplica a todas las rutas de `/precios` (no a `/health` ni a `/proveedor`):

- Cada cliente se identifica con el header **`x-api-key`** (cualquier texto no vacío). Si falta: **401**.
- Cada cliente puede hacer como máximo `RATE_LIMIT_MAX` peticiones (por defecto 10) cada `RATE_LIMIT_VENTANA_SEGUNDOS` (por defecto 60).
- Al superar el límite: **429 Too Many Requests**, con el header **`Retry-After`** indicando cuántos segundos faltan para poder volver a intentar.
- El límite de un cliente no afecta a otro.
- Tiene que funcionar correctamente con varias réplicas y con peticiones simultáneas.

### 4. Si Redis se cae

Decide qué debe pasar con las consultas de precios y con el límite de peticiones si Redis deja de responder, impleméntalo y **justifícalo en `DECISIONES.md`**. No hay una única respuesta correcta; nos interesa tu razonamiento.

### 5. Una prueba automática

Agrega al menos una prueba (unitaria o e2e en `test/`) del caché o del límite de peticiones.

### 6. Documentación en Swagger

Tus endpoints deben quedar documentados en Swagger: DTOs de entrada con `@ApiProperty`, y las respuestas y errores principales con `@ApiOkResponse`, `@ApiNotFoundResponse`, etc. Los endpoints que ya vienen hechos muestran cómo. Como todas las rutas de `/precios` requieren `x-api-key`, márcalas con `@ApiSecurity('x-api-key')`: así se pueden probar desde Swagger con el botón **Authorize**.

### Opcional (suma puntos)

Si llegan 10 consultas **simultáneas** por un SKU que no está en caché, lo ideal es llamar al proveedor **una sola vez**, no diez. Si lo resuelves, explica cómo en `DECISIONES.md`.

## Qué evaluamos

- Que el contrato se cumpla: caché con TTL, invalidación, header `X-Cache`, límite con 429 y `Retry-After`.
- Que el límite de peticiones sea correcto bajo concurrencia (operaciones atómicas en Redis).
- Diseño de las claves de Redis y uso de expiración.
- Tu decisión sobre la caída de Redis y cómo la justificas.
- Código ordenado (guards, interceptors o servicios donde corresponda), manejo de errores.
- La documentación de tu API en Swagger.
- `DECISIONES.md` y el historial de commits.
