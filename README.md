# Decisiones


## Caché

<!-- ¿Qué guardas en Redis, con qué clave y con qué TTL? ¿Guardas también los SKU inexistentes? ¿Por qué? -->
Se está guardando todo el objeto con el dato del precio devuelto en el proveedor. Para la clave, se está utilizando el estandard de utilizar los ":" para la separación. Nuestra clave es "precio:${sku}".
En cuanto al TTL, se está usando una constante CACHE_TTL_SEGUNDOS, con un valor por defecto de 60 segundos.

No se están guardando SKU inexistentes. Si bien sería interesante implementar un caché opuesto o negativo, no tiene implementada dicha funcionalidad, ya que si lleka un SKU inexistente, sí o sí se realiza una llamada al servicio para verificar si existe. 


## Invalidación

<!-- ¿Cómo garantizas que después de un PUT no se sirva el precio viejo? ¿Hay algún caso borde? -->

Se está grantizando la actualización correcta del precio cada que exista un PUT a través de la eliminación del caché respectivo. Como se puede observar a continuación:
    
```typescript
        const key = this.getCacheKey(sku);
        await this.cacheService.del(key);
```
De esta manera se aseguramos que la petición nueva después del put, consulte al proveedor y actualice el caché.

Existen algunos casos en los que podría fallar este tipo de propuestas, por ejemplo cuando exista una caida en redis durante la eliminación del caché o si es que existiesen actualizaciones externas del proveedor. Sin embargo es por eso que existe un TTL. Hacer que el caché expire en un tiempo determinado sirve para solventar este tipo de situaciones.

## Límite de peticiones

<!-- ¿Qué algoritmo usaste (ventana fija, ventana deslizante, token bucket...)? ¿Cómo garantizas que sea correcto con peticiones simultáneas y varias réplicas? ¿Cómo calculas Retry-After? -->

Se decidió utilizar un algoritmo de ventana fija con LUA. Si bien se sabe que este algoritmo tiene casos borde donde pueden ejecutar el doble de consultas al finalizar y empezar un minuto, se decidió su implementación debido a su simplicidad y efectividad, ya que se suele diseñar este rate limit tomando en cuenta ese caso extremo y asumiéndolo, prefiriendo tener un menor consumo de memoria y costo computacional.

El uso del scrpit LUA nos ayuda a asegurar que el rate limit funcione también bajo concurrencia, ya que hace que REDIS gestione las peticiones de forma atómica. 

El retry-after es calculado directamente desde el comando TTL de Redis que retorna el script LUA.

## Si Redis se cae

<!-- ¿Qué hace tu API con los precios y con el límite? ¿Por qué elegiste ese comportamiento? ¿Qué riesgo aceptas? -->

En caso de que Redis caiga, se decidió continuar con la operación acudiendo al proveedor de forma directa, en ambos casos. Tanto en la consulta de precios como en el rate limit. 

Para eso, en caso de que REDIS caiga, se está guardando el error con un log, y se consulta directamente el precio del servicio al proveedor. Lo mismo pasa para el ratelimit. Si es que REDIS deja de funcionar, se registra el evento y se acude al proveedor.

Se decidió esto pensando en priorizar la disponibilidad del servicio, ya que si bien REDIS nos ayuda mucho, no puede ser un bloquante para detener la API, al menos en este caso. De esta forma se prefiere evitar dejar la aplicación inutilizable y llamar al proveedor. 

Sin embargo, los riesgos que se asumen ante esto, es la probabilidad de ser susceptibles a ataques, recibiendo miles de peticiones, o incluso se arriesgamos a una saturación del servidor. 


## Cómo probaste tu solución

<!-- ¿Qué pruebas escribiste y qué demuestran? -->
Se escribieron pruebas e2e con Jest con el objetivo de probar los aspectos del rate limit.
Las pruebas demuestran que las solicitudes sin x-api-key son rechazadas de inmediato con 401 Unauthorized, que con credenciales válidas la API responde 200 OK decrementando el encabezado X-RateLimit-Remaining en cada llamada consecutiva, y que al superar el límite de peticiones el guardia bloquea el acceso devolviendo 429 Too Many Requests junto al encabezado Retry-After con los segundos exactos restantes 

## Uso de IA

<!-- ¿Usaste IA? ¿Para qué partes? ¿Qué tuviste que corregir o cambiar de lo que te sugirió? -->
Se utilizó IA para investigar los tipos de algoritmos para el ratelimit, y una vez que se escogió uno, se le solicitó  la implementación del mismo (Algoritmo LUA). Además, se utilizó IA para la creación de la prueba e2e de manera rápida.

## Qué mejorarías con más tiempo

<!-- Opcional. -->
- Me parecería interesante implementar el caché negativo, donde se guarden consultas fallidas para también devolverlas y evitar llamadas al proveedor. 
- Algo a mejorar, también es la implementación del control de concurrencia al momento de obtener el precio, haciendo que sol se haga un viaje al proveedor ante varias consultas simultáneas.

