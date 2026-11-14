# Validación V5.6.0

- Sintaxis de todos los archivos JS: superada.
- Todas las pruebas JS de `tests/*.js`: superadas, incluida `test_v560_journey.js` (sectores orientativos, estado, voz no destructiva y pedido protegido).
- Pruebas HTTP con FastAPI servido en puerto local 8877: 4/4 superadas.
- ZIP revisado con test de integridad.

## No comprobado en esta entrega
- Prueba visual real en Chrome: navegador automatizado no disponible en el entorno.
- GPS y trazado vial real en Ciénaga: requieren verificación física y datos cartográficos fiables.
- Navegación por carreteras sin conexión: no implementada; solo la interfaz y datos guardados pueden funcionar sin Internet tras cachear el PWA.
- Reconocimiento de voz sin conexión: depende del navegador; no se garantiza.
