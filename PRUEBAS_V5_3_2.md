# Pruebas DOMICILIO V5.3.2

## Ejecutadas localmente

- Sintaxis de todos los archivos `frontend/*.js`: OK.
- Pruebas `tests/*.js`: OK (14 archivos ejecutados).
- Prueba real de interfaz en Chromium `tests/test_v532_rules_browser.py`: OK; buscar, duplicadas, seleccionar, deseleccionar, editar, añadir y eliminar varias.
- Regresión integrada Chromium `tests/test_v53_browser.py`: OK; pedidos, fallidos, cierre, historial, direcciones sin GPS y ayuda.
- Pruebas Python/HTTP, con FastAPI encendido: 4 passed.

## Pendiente en el teléfono

- Permisos y precisión GPS, capturas de coordenadas en Ciénaga.
- Disponibilidad real de intersecciones en OpenStreetMap / Nominatim.
- Despliegue Render y eliminación/edición de reglas después de recargar en Chrome Android.
- Recorrido real y anuncios de navegación en condiciones controladas, sin manipular el móvil mientras se conduce.
