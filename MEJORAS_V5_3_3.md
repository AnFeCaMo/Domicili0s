# DOMICILIO V5.3.3 — Monitor inteligente en tiempo real de la jornada

## Alcance implementado

- Se ejecuta automáticamente cuando la aplicación está abierta y el usuario no lo desactiva en Configuración.
- Validación de lecturas del GPS: rango de coordenadas, precisión estimada (hasta ±120 m), antigüedad (20 s), recepción fuera de orden y saltos incompatibles con el desplazamiento y los márgenes de precisión. Las lecturas rechazadas no mueven la ubicación usada por el navegador.
- Supervisa órdenes pendientes sin borrar ni reordenar pedidos; alertas de dirección vacía o incompleta, dirección sin coordenadas, intersección aproximada en lugar de vivienda, discrepancia textual entre vías entregadas y vías indicadas por la cartografía, y divergencia de más de 180 m frente a punto previamente confirmado por el usuario (cuando existe).
- Diferencia claramente **GPS del repartidor** de **coordenadas del destino**. Mantiene Calle 14 #11-12 sin reemplazar la Carrera 11 por la vía en que se encuentra el usuario.
- Revisa duplicaciones exactas de reglas y advertencias sobre reglas antiguas de regreso a base. No borra reglas ni altera el historial de forma automática.
- Alertas discretas y permanentes en Inicio y Rutas. Panel detallado dentro de Configuración, con opción de activar/desactivar, sin nuevas pestañas.
- Integración con optimización V5.3 y navegación V5.3.1, sin aceptar datos ficticios ni afirmar que los resultados de geocodificación aproximada correspondan a la casa.

## Limitaciones explícitas

1. El monitor usa validaciones **deterministas locales**, no un modelo generativo autónomo. Las reglas escritas por el usuario se guardan como texto y se aplican automáticamente solo las reglas estructuradas codificadas y probadas: formato Calle/Carrera, coincidencia de nomenclatura, estados, restricciones de seguridad y validación de coordenadas. No se ejecutan como código instrucciones arbitrarias de texto.
2. **En tiempo real mientras el navegador tenga la aplicación abierta y pueda recibir GPS.** Estar desplegada en Render permite acceder a ella remotamente; NO significa que el servidor reciba ubicación continua o pueda monitorizar el teléfono con Chrome cerrado/bloqueado. No se envían ubicaciones ni pedidos a un servidor de monitoreo remoto.
3. Ni el GPS ni OpenStreetMap garantizan la dirección exacta de una vivienda. La geocodificación del mapa puede ofrecer una intersección orientativa; el usuario confirma la casa al llegar.
4. No hay datos fiables integrados de cierres, trancones ni tráfico en vivo. La posición del mapa, la señal GPS y la ruta OSRM pueden tener errores de precisión o disponibilidad.
5. Las alertas son informativas. El usuario decide si modifica una dirección, guarda un punto confirmado o acepta una nueva ruta.
6. El chequeo no se ejecuta mientras la aplicación esté cerrada. En segundo plano, algunos navegadores móviles suspenden los eventos y la frecuencia del GPS.

## Flujo de dirección

`Calle 14 número 11 12` → `Calle 14 #11-12` → buscar primero vivienda, después la intersección Calle 14 con Carrera 11. Si falta coincidencia, conservar la dirección y marcar ubicación pendiente. Al confirmar físicamente la ubicación, registrar la coordenada con consentimiento y precisión suficiente.

## Archivos relevantes

- `frontend/monitor-v533.js`: supervisor independiente, revisiones y alertas.
- `frontend/app.js`: entrega de lecturas GPS y acceso seguro de solo lectura a pedidos/reglas.
- `frontend/navigation.js`: rechazo de lecturas GPS anómalas antes de mover el marcador.
- `frontend/v5.js`: control GPS durante optimización y conservación de evidencia de coincidencia.
- `frontend/index.html` y `frontend/styles.css`: estado visible y control del monitor.
- `frontend/sw.js`: caché V5.3.3.
- `tests/test_v533_monitor.js`: pruebas de precisión, saltos, inconsistencias y reglas.
