# Pruebas DOMICILIO V5.4.1

## Ejecutadas en este entorno

- Validación de sintaxis para cada archivo `frontend/*.js`: correcta.
- 19 pruebas JavaScript en `tests/*.js`: correctas.
- 4 comprobaciones Python/HTTP con servidor FastAPI local, incluyendo `/api/health` y recursos web: correctas.
- Prueba Chromium automatizada `tests/test_v541_browser.py` con GPS/mapa simulado: correcta (0 errores JavaScript). Registra y edita pedidos, comprueba historial, representa la lista, verifica la tarjeta compacta, marca `No entregado` y pasa al siguiente, marca `Entregado` y prueba ambas acciones también desde la lista sin abrir navegación.
- Prueba `tests/test_v541_optimizer.js`: compara una matriz simulada donde la mejor secuencia por distancia difiere de la más rápida, y verifica que se aprueba antes de modificar el orden y no cambia automáticamente al mapa.

## Pendiente de validación real

- Uso con GPS y voz en Chrome Android; Chrome puede restringir la síntesis de voz hasta interacción del usuario.
- Geocodificación en vivo de calles de Ciénaga con Nominatim.
- Conexiones y cierres reales del proveedor cartográfico: no se puede prometer un resultado de navegación correcto en cada domicilio sin un relevamiento más preciso de la zona.
- La simulación de navegador usa un mapa ficticio y no garantiza la exactitud vial.
