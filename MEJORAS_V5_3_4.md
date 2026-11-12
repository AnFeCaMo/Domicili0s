# DOMICILIO V5.3.4 — Auditoría de rutas GPS

## Problema observado
Una captura muestra un pedido Calle 24 #13-51 a 63 m de distancia directa desde el repartidor con GPS ±4 m, mientras la ruta azul hace un rodeo largo. Este comportamiento no demuestra por sí solo un fallo de posición: puede ser una diferencia entre distancia directa y circulación legal, una mala ubicación geocodificada, o un ajuste incorrecto a la red vial.

## Implementación
- **Auditoría independiente** (`frontend/route-audit-v534.js`): compara distancia directa vs longitud vial; verifica el ajuste (snapping) del origen y destino que devuelve OSRM; revisa la geometría de llegada.
- **Alternativas OSRM**: pide alternativas permitidas y elige una equilibrando el tiempo y la distancia. No inventa tramos ni ignora sentidos únicos.
- **Alerta visible**: marca recorridos desproporcionados, por ejemplo una ruta de 1.100 m para un punto a ~63 m en línea recta. Explica que debe verificarse la ubicación y la circulación, sin recomendar contravías.
- **Monitor V5.3.3**: recibe automáticamente las anomalías de la ruta, las incluye entre los avisos de la jornada y deja de mostrar la alerta antigua al detener la navegación.
- **Voz**: anuncia «en 100/50 metros, llegarás a las proximidades» en vez de «has llegado» de forma anticipada.
- **Cache, interfaz y API**: actualizados a V5.3.4.

## Límites importantes
- No se confirmó con una prueba en carretera si Calle 24 #13-51 es un portal exacto o un punto aproximado; la posición del mapa debe verificarse antes de confiar en la ruta.
- Un camino largo **puede ser el único recorrido legal** por sentidos únicos, giros o restricciones. V5.3.4 lo advierte y compara alternativas cuando el motor las devuelve; no reemplaza las restricciones reales.
- El servicio gratuito de rutas no garantiza información de cierres ni tráfico en vivo. La ruta no debe utilizarse para circular en contravía ni para giros prohibidos.
- La supervisión continúa mientras la aplicación permanezca activa con permisos, no es seguimiento remoto persistente con el teléfono bloqueado.
