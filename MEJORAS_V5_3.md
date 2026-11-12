# Cambios DOMICILIO V5.3

## 1. Gestión de jornadas y conservación de datos

- Se agregó `frontend/v53.js` con archivo por jornada (`domicilio-v53-historial` en localStorage).
- El historial conserva fecha, nombre, dirección, referencias, estado y motivos de fallos.
- Al finalizar, los pendientes pasan a **no_realizado en la copia histórica**. El pedido original permanece activo hasta el cierre confirmado.
- Archivo verificado antes de limpiar la lista. Si falla el guardado de la lista, intenta restaurar los pedidos activos.
- La memoria de direcciones confirmadas y las reglas del sistema se conservan después del cierre.
- El historial se incluye en la exportación/importación JSON de copias.

## 2. Mapa y origen GPS

- Se retiró del flujo principal el panel de Restaurante/Base y el retorno automático.
- Se eliminó el marcador predeterminado de restaurante y se desactivó la creación accidental de pedidos al tocar el mapa.
- El mapa sigue disponible en Inicio y al iniciar navegación; la selección manual requiere pulsar explícitamente una opción de selección.
- Sin GPS actual, el optimizador puede presentar orden aproximado de lista, pero no debe representar el centro de la ciudad como ubicación del repartidor.
- La última entrega confirmada solo puede servir de referencia secundaria, y se advierte que no es una lectura GPS actual.

## 3. Tarjetas y navegación

- Guardar y editar pedidos funciona también con latitud/longitud nulas.
- Los cambios textuales de dirección invalidan la posición antigua cuando no hay una nueva selección de GPS.
- Mejor tratamiento de `Ver mapa`, `Detalles`, `Fallido` (motivo/fecha), `Anular` (conserva registro), `Entregado` y `Ir al pedido`.
- Avance automático al **siguiente pedido de la lista aprobada**. Las paradas sin GPS no se saltan; se muestra dirección y botón para asociar ubicación al llegar.
- Mantiene avisos de voz espaciados a 100 m, 50 m y cerca del giro.

## 4. Interfaz

- Pestañas visibles: Inicio, Pedidos, Rutas, Historial.
- Configuración en menú de usuario, con ayuda contextual local incorporada.
- Mapa sin pestaña independiente; se mantiene su vista de navegación y ampliación desde Inicio.
- Controles técnicos antiguos de inicio/retorno se ocultan, conservando los identificadores internos necesarios para compatibilidad con el código existente.

## 5. Compatibilidad y límites

- La localización de direcciones depende de datos disponibles en OpenStreetMap/Nominatim.
- El algoritmo para puntos sin GPS es una aproximación; no hay garantía de optimalidad global ni tráfico en tiempo real.
- No se ofrecen atajos por contravía ni giros ilegales. El enrutamiento respeta el servicio vial disponible.
- Se conserva el almacenamiento local; no hay garantías de conservación ante borrado del almacenamiento del sitio. Exporta copias.
- Pruebas automatizadas y navegador simulado no sustituyen pruebas con GPS real en Ciénaga.
