# Verificación de DOMICILIO V5.3.3

- Pruebas JavaScript existentes en `tests/*.js`.
- `tests/test_v533_monitor.js` verifica: activación del monitor, rechazo de saltos GPS, rechazo de precisión ±500 m, aceptación de desplazamientos plausibles, intersección no coincidente, punto aproximado, pedidos sin coordenadas, reglas duplicadas y desactivación manual.
- Pruebas HTTP con `tests/test_smoke.py` usando servidor FastAPI.
- Pruebas de interacción en Chromium mediante `tests/test_v53_browser.py` y prueba específica del monitor.

Estas pruebas no validan el GPS físico en todas las calles de Ciénaga y no garantizan que OpenStreetMap conozca números prediales precisos.
