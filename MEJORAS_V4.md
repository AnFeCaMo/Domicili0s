# DOMICILIO V4 — entrega de código

## Cambios implementados
- Botón «Ir al pedido» en cada tarjeta, navegación GPS con permiso explícito del navegador.
- Ruta OSRM por calles, maniobras en español mediante voz del navegador, distancia y duración inicial.
- Flechas sobre el trazado, color azul para ida y naranja discontinuo para regreso a base.
- Botón «Estoy perdido» para recalcular desde el GPS; botón «Repetir».
- Detección de proximidad y botón de confirmación manual de entrega.
- Memoria de direcciones verificadas ya existente y 20 reglas predeterminadas persistentes nuevas.
- Interpretación básica de números escritos en letras para campos de dirección y origen.
- Conservación local de pedidos y de última geometría consultada; modo sin conexión limitado.
- Ruta circular: conserva el mecanismo existente de retorno al punto inicial y optimización con confirmación.

## Limitaciones que NO se deben ocultar
- El servicio público OSRM no proporciona tráfico, accidentes, policía ni cierres en tiempo real. No se implementaron alertas en vivo.
- La ruta pública OSRM usa perfil `driving` y sus datos pueden estar incompletos. Confirmar sentidos viales localmente.
- La navegación en navegador puede pausarse al bloquear la pantalla; el audio no está garantizado en segundo plano.
- La voz depende del soporte de síntesis de voz y de las voces instaladas en el dispositivo.
- El cálculo del desvío es aproximado y el GPS puede ser impreciso; no usar indicaciones como sustituto de señales viales.
- Sin conexión se conserva la última geometría para consulta, no se ofrece navegación offline real.
- La optimización existente no garantiza solución global óptima para muchos pedidos.
- La normalización escrita es conservadora, no cubre todas las expresiones del español.

## Pruebas antes de usar en repartos
1. Ejecutar `docker compose up -d --build` y abrir el servicio.
2. Registrar un pedido con coordenadas verificadas; pulsar «Ir al pedido».
3. Autorizar GPS en el teléfono, con HTTPS; esperar precisión adecuada.
4. Verificar ruta, flechas, instrucciones por voz y botón «Estoy perdido» **sin conducir**.
5. Verificar retorno a base, desconexión de internet y marcado de entrega.
6. Hacer una prueba controlada a pie o con acompañante antes de usarlo trabajando.

## Pruebas automatizadas
- `pytest -q tests/test_smoke.py tests/test_bulk_static.py`
- `node --check frontend/app.js` y `node --check frontend/navigation.js`

## Despliegue
No se modificó Render ni GitHub. Se entrega un archivo comprimido sin la carpeta `.git` ni cachés.
