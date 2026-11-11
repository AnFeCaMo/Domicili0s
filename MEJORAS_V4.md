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

## Actualización V4.1 — siguiente pedido automático
- Casilla «Ir automáticamente al siguiente pedido» activada por defecto en la navegación; preferencia persistente en este navegador.
- Al confirmar manualmente una entrega, comienza la navegación a la primera parada pendiente según el orden aprobado.
- Si no quedan pedidos, muestra un aviso sin iniciar el regreso por su cuenta.
- Si el siguiente pedido carece de coordenadas, detiene la navegación y avisa para verificarlo; no salta pedidos.
- Nunca marca el siguiente pedido como entregado automáticamente.

## V4.2 — Direcciones y optimización de recorridos
- Normalización local de vías: «Calle 24 número 11 16», «Calle 24 carrera 11 16» o «Calle 24 #11-16» → «Calle 24 #11-16».
- Si inicia con Calle, el segundo componente se interpreta como Carrera; si inicia con Carrera, se interpreta como Calle. Siempre se respeta el último como placa de casa.
- Se mantiene la referencia original si hay una intersección sin número de vivienda (no inventar casas). Revisar posición en mapa antes de iniciar.
- Reglas nuevas persistentes en la memoria local; no se borran pedidos ni reglas personalizadas.
- El cálculo de propuesta desde la pantalla de Rutas usa matriz dirigida OSRM y evalúa el recorrido completo para hasta 10 paradas por nivel de prioridad; para listas grandes utiliza heurística y 2-opt. Se solicita aprobación antes de cambiar el orden.
- La importación masiva conserva la confirmación y refina tramos con solucionador exacto para hasta 10 paradas en cada grupo.
- Los servicios OSRM gratuitos no prometen tráfico en tiempo real ni resultados siempre disponibles; las indicaciones requieren verificar coordenadas.

### Verificación V4.2
- `node tests/test_v42_rules.js`: interpreta nueve ejemplos y valida la búsqueda exhaustiva del mejor orden (para pocos pedidos).
- `node tests/test_v42_parse.js`: separa nombres de clientes y direcciones en listas.
- `node --check frontend/*.js` (ejecutar por archivo).
- `python -m pytest -q tests/test_smoke.py tests/test_bulk_static.py` con el servidor FastAPI corriendo.
- Aún deben comprobarse a pie o con el vehículo estacionado la ubicación GPS, la geocodificación de direcciones de Ciénaga y la consistencia de los sentidos reales. No usar como sustituto de la señalización vial.
