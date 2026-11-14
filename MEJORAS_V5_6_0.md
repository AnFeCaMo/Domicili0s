# DOMICILIO V5.6.0 — Integración de mejoras de jornada

- Conserva V5.4.2 y V5.5.0: importador seguro, verificación de calle, memoria de lugares confirmados, navegación compacta, lista numerada y monitor.
- Propuesta opcional por sectores: calles inferiores a 21 como Centro y desde 21 como Calles altas **solo como agrupación nominal**, no como clasificación geográfica garantizada de la Troncal. En los tramos curvos de Calle 18/20 requiere validación manual. No infiere coordenadas ni atraviesa vías prohibidas.
- Orden heurístico por proximidad de coordenadas verificadas o cuadrícula orientativa. No sustituye motor vial ni garantiza ruta más corta.
- Aprobación obligatoria antes de cambiar el orden, con protección de entrega en navegación.
- Estadísticas de jornada y actualización después de guardar pedidos.
- Orden por voz opcional con Web Speech: leer dirección, escuchar resumen, abrir propuesta. Acciones sensibles nunca se ejecutan sin revisión manual. Depende del navegador y puede requerir servicios externos.
- Recuperación de una copia local anterior a aplicar orden por sectores; conservar respaldo JSON/exportación existente.
- PWA: archivos básicos disponibles tras visitar la app conectada. Sin conexión no hay garantías de mapas de calles, geocodificación ni rutas nuevas de OSRM.
- Se conservan las marcas de estado y la voz de navegación sin textos intrusivos.

## Pendiente de validación física

Calibrar sectorización real de Ciénaga, giros, sentidos, ubicaciones y precisión GPS con pruebas de campo. Una cuadrícula de calles no es prueba de transitabilidad.
