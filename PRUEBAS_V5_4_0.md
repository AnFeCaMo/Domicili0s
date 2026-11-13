# Pruebas DOMICILIO V5.4.0

## Ejecutadas
- Validación de sintaxis de todos los archivos JavaScript.
- Todas las pruebas `tests/*.js`, incluida `test_v540_short_routes.js`.
- Cuatro pruebas Python/HTTP con el servidor FastAPI levantado.
- Verificación de ZIP completo.

## Casos nuevos
- Priorizar una alternativa por carretera de 250 m frente a otra de 900 m cuando ambas son aceptables.
- Descartar una alternativa de 180 m que implique una demora extrema frente a 300 m.
- Desvíos detectados con varias lecturas GPS válidas y recálculo desde posición actual.
- Marcadores claros para pedido activo, conocido, estimado y terminado.

## Validaciones pendientes sobre el terreno
- Pruebas reales de geocodificación de Calle 14 #26-86, Calle 24 #13-51 y sus intersecciones.
- Señales y sentidos viales reales; el servidor de rutas solo entrega alternativas según sus propios datos.
- GPS físico en Ciénaga y avisos de voz bajo distintas condiciones de señal.
