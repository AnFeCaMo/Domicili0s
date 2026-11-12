# Instalación de DOMICILIO V5.3.1

1. Exporta una copia JSON de la jornada y el historial en la aplicación actual.
2. Descarga `DOMICILIO_V5_3_1_COMPLETA.zip` a `~/Descargas`.
3. Ejecuta los comandos de actualización del mensaje de entrega, desde `~/Descargas/Domicili0s-V3`.
4. Antes de publicar: `for f in frontend/*.js; do node --check "$f" || exit 1; done` y `for t in tests/*.js; do node "$t" || exit 1; done`.
5. Publica con `git add -A && git commit -m 'DOMICILIO V5.3.1: tarjeta de navegacion y version' && git push origin main`.
6. Confirma `/api/health` con `version: 5.3.1` y recarga la web en Chrome.
