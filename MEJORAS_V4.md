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

## V4.3 — pedidos existentes y reoptimización dinámica
- Los pedidos ya guardados se pueden revisar, normalizar y corregir con aprobación individual, sin reimportarlos.
- Si se cambia una dirección, se exige revisar su ubicación en el mapa. Las coordenadas no se inventan ni actualizan en silencio.
- Botones de orden manual en la sección Rutas para subir y bajar pedidos activos.
- Después de confirmar una entrega se solicita una **propuesta** de reoptimización con los pedidos restantes; solo se aplica si se aprueba explícitamente.
- El recorrido actual y la próxima parada en navegación se mantienen protegidos mientras no se acepte otro orden.
- Reglas nuevas persistentes que no sustituyen las preferencias previas.
- La matriz vial de OSRM requiere internet y puede tener límites; V4.3 no garantiza tráfico en vivo, GPS en segundo plano ni exactitud de geocodificación.
- **Antes de instalar:** exportar copia de seguridad desde la aplicación. Los pedidos están en localStorage del navegador, no en GitHub.

## V4.4 — separación de cliente, numeración y referencias (sin perder pedidos)
- El panel **Rutas → Revisar direcciones guardadas** ahora propone Cliente, Dirección y Referencia en campos separados.
- Detecta numeración duplicada en nombres cuando coincide con la numeración del domicilio (por ejemplo `23 02` frente a `#23-02`, o `1939` frente a `#19-39`). No elimina cifras distintas.
- Reconoce la palabra `esquina` como referencia, no como nombre del destinatario; si no se menciona la vía del cruce, la deja sin inventarla.
- Repara nombres contaminados como `número Linda Oliveros`, manteniendo el nombre y la dirección original.
- También aplica la separación a la vista previa de importación de listas/archivos y a instrucciones que extraen direcciones.
- Cada corrección requiere aprobación individual. Los cambios de dirección dejan marcada la ubicación para revisar el punto en el mapa; las coordenadas NO se modifican automáticamente.
- Se agregan seis reglas de interpretación a la memoria local sin borrar reglas previas. No se incorporó un modelo generativo: se utiliza lógica local verificable.
- `node tests/test_v44_separation.js` revisa nueve casos; `node tests/test_v42_parse.js` comprueba listas.
- Se actualiza la caché del service worker para entregar los scripts nuevos.

## V4.5 — Importación de rutas copiadas y selección manual en mapa
- El analizador de listas numeradas ignora «1.», «2.», «3.» como índices del recorrido, tanto si el cliente antecede a la dirección como si aparece después.
- Extrae referencias después de raya larga (p. ej., «Apartamento de puerta negra», «La Floresta») y no las incorpora al nombre.
- Revisión de pedidos antiguos: limpia numeraciones enumeradas sueltas al final del nombre.
- El importador permite seleccionar en el mapa la ubicación de cada dirección cuando Nominatim no la reconoce. La elección es explícita y debe revisarse.
- El botón de calcular indica las filas no verificadas; no genera rutas basadas en direcciones sin coordenadas.
- El servicio OSRM público no incluye tráfico en vivo y la optimización depende de la calidad de los puntos verificados.
