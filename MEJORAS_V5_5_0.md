# DOMICILIO V5.5.0 — Direcciones inteligentes y numeración visual

Actualización **incremental sobre V5.4.2** (no reemplaza archivos por versiones antiguas).

- Nomenclatura equivalente: `Cra 25 18C 86`, `Carrera 25 número 18C-86`, `Kr 25 #18C-86`.
- La clave del domicilio conserva por separado la calle/carrera principal, cruce y número final. No confunde `Calle 14 #26-86` con `Calle 16B #26-86`.
- Solo reutiliza ubicaciones en memoria si constan como confirmadas con GPS o mapa y la dirección coincide íntegramente. Las posiciones aproximadas no se aprenden automáticamente.
- El módulo de búsqueda consulta la memoria confirmada antes de pedir coordenadas al servicio externo.
- Los marcadores pendientes se renumeran visualmente 1, 2, 3... según el orden vigente, pero el pedido mantiene su número original para el historial.
- La lista de Rutas indica si la ubicación es confirmada, aproximada o no dispone de GPS.
- No se cambia el orden automáticamente. Se conserva la aprobación explícita de la propuesta de optimización.
- Conserva el importador V5.4.2, la tarjeta mínima de navegación, historial y datos del navegador.

**Límites:** la optimización por sectores/Troncal del Caribe, la búsqueda real de carriles habilitados y el dictado de órdenes avanzadas no están implementados en esta actualización. El mapa todavía depende de la cartografía externa para calcular rutas viales.

Para probar: `node tests/test_v550_intelligence.js` y luego todos los JS en `tests/`.
