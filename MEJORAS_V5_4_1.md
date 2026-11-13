# DOMICILIO V5.4.1 — revisión del flujo real de reparto

## Hallazgos de código

- La tarjeta de navegación mostraba el texto de cada indicación y todas las advertencias; se expandía y tapaba el mapa.
- Aprobar una propuesta abría el mapa automáticamente y hacía más difícil operar solo desde una lista.
- No había botón «No entregado» en la tarjeta activa; para marcar fallido había que regresar a Pedidos.
- Los pedidos sin GPS permanecían en la jornada, pero el resumen de la ruta dibujada solo incluía puntos con coordenadas.
- Las reglas editables del usuario son notas de comportamiento en memoria y **no** reconfiguran OSRM ni Nominatim; la optimización usa sus algoritmos implementados en código.
- OSRM público sigue usando un perfil de conducción; no se promete una ruta de cualquier calle ni una geocodificación predial exacta.

## Cambios

1. Tarjeta flotante muy corta: nombre, dirección, Entregado, No entregado y cierre pequeño.
2. Las frases de guía se emiten mediante síntesis de voz y no se dibujan en un panel de texto visible.
3. No entregado registra «Cliente no se encontraba» tras confirmación, conserva el pedido en la jornada y avanza al siguiente del orden aprobado.
4. Optimización de pedidos localizados prioriza la distancia vial dirigida con una penalización suave de duración. Si el proveedor no entrega distancias, utiliza tiempo como respaldo. Las direcciones sin GPS se ordenan aproximadamente por nomenclatura.
5. Lista operativa en Rutas: muestra todos los pedidos pendientes, incluso sin GPS; permite marcar entregado/no entregado sin abrir el mapa.
6. Aprobar optimización mantiene la pantalla actual, actualiza lista e historial sin cambiar automáticamente al mapa.
7. Las alertas extensas dejan de mostrarse en la tarjeta, pero siguen disponibles en el monitor y los controles de revisión.

8. Las reglas que el usuario borre ya no se reinstalan automáticamente. Las reglas editables son notas, no comandos ejecutables para el servicio de rutas.

## Límites

No se cambió el proveedor cartográfico ni se prometió solucionar todas las direcciones de Ciénaga. Las coordenadas dudosas no se reemplazan por suposiciones. El GPS requiere permiso del navegador y conexión cuando necesita rutas nuevas. La voz puede no estar disponible según dispositivo/configuración.
