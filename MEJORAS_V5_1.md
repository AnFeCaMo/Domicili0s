# DOMICILIO V5.1 — Corrección de geolocalización de direcciones

## Defecto encontrado en V5
El módulo `frontend/v5.js` tenía una función `findLocation` que no se utilizaba durante «Optimizar toda mi ruta» y solo devolvía un mensaje textual, nunca coordenadas. Por eso los pedidos nuevos quedaban sin ubicación aunque hubiese coincidencias en el mapa.

## Cambios
- `frontend/location-lookup.js` busca automáticamente los domicilios de toda la jornada al optimizar, con OpenStreetMap/Nominatim, límite de solicitudes y caché local de 14 días.
- Intenta la dirección completa; si no encuentra un portal, busca la calle. Solo acepta resultados en la zona de Ciénaga cuyo nombre de vía coincida.
- Clasifica un portal localizado como ubicación localizada; una calle encontrada sin portal es un **punto aproximado**, no la casa exacta. Se muestra advertencia antes de navegar.
- No elimina pedidos cuando la geocodificación falla o el servicio limita consultas.
- Se utiliza el GPS real del repartidor si está disponible y tiene precisión razonable; en caso contrario se explica el motivo y se utiliza el último punto confirmado o el origen guardado, claramente identificado.
- El navegador no pasa silenciosamente a un pedido cuya ubicación solo es aproximada; requiere revisión.
- El service worker cambia de versión para actualizar los recursos en vez de conservar la V5 anterior.

## Límites importantes
OpenStreetMap no tiene registradas todas las numeraciones de casas en Ciénaga. Encontrar una calle NO permite saber dónde queda exactamente una vivienda; confirmar en el mapa o al llegar. El servicio público de Nominatim no ofrece garantías para geocodificación masiva; para un lanzamiento con muchos usuarios se necesita un proveedor adecuado o infraestructura propia.

## Pruebas
- `node tests/test_v51_location.js`
- `node tests/test_v5_unified.js`
- `for f in tests/*.js; do node "$f" || exit 1; done`
- Para pruebas HTTP, primero iniciar `uvicorn backend.app.main:app --host 127.0.0.1 --port 8000` y luego `python -m pytest -q tests`.
- Se requiere prueba real con permiso de ubicación en Android y verificación de la calle/portal en Ciénaga.
