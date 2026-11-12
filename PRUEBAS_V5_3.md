# Validación de DOMICILIO V5.3

## Pruebas locales realizadas

- **12/12 JavaScript**: interpretación/normalización de direcciones, rutas, orden de pedidos, GPS, voz, seguridad HTML y nuevo flujo de historial.
- **4/4 Python/HTTP**: salud de FastAPI, HTML, publicación de archivos y prueba estática de importación masiva, con servidor local.
- **Chromium con Leaflet simulado**: sin errores JavaScript detectados durante estos flujos: crear pedido sin GPS; editar nombre; marcar fallo; finalizar jornada; verificar archivo y lista vacía; crear nueva jornada; iniciar navegación sin coordenadas; avanzar al siguiente pedido sin GPS; comprobar que tocar mapa no agrega un pedido; consultar asistente local.

## Comandos

```bash
for f in frontend/*.js; do node --check "$f" || exit 1; done
for t in tests/*.js; do node "$t" || exit 1; done

python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 18853 &
PID=$!
APP_BASE_URL=http://127.0.0.1:18853 python -m pytest -q tests/test_smoke.py tests/test_bulk_static.py
kill "$PID"
```

Opcional: `python tests/test_v53_browser.py`. Requiere Playwright, Chromium y dependencias compatibles. Esta prueba simula la cartografía; no valida GPS físico.

## Pendientes de prueba en dispositivo real

- Geolocalización con Chrome Android y permisos del sistema.
- Búsqueda de direcciones reales en Ciénaga; calidad de coordenadas, límites de servicios y tiempo de respuesta.
- Rutas legales con sentidos viales, audio, precisión del desvío y regreso a vías permitidas.
- Persistencia después de cierre/recarga de Chrome Android, exportación e importación de JSON grandes.
- Verificar visualmente botones, encabezado, mapa, historial y configuración en diferentes tamaños físicos de celular y computadora.

Una prueba automatizada superada no equivale a afirmar que todos los botones funcionarán en todos los teléfonos.
