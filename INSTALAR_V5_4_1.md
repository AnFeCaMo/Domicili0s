# Instalación 5.4.1

1. Exporta el respaldo JSON desde la aplicación.
2. Desde el repositorio limpio y actualizado, crea una rama de respaldo.
3. Descomprime el ZIP completo en la raíz del repositorio.
4. Ejecuta `for f in frontend/*.js; do node --check "$f" || exit 1; done`.
5. Ejecuta `for t in tests/*.js; do node "$t" || exit 1; done`.
6. Ejecuta las pruebas Python según el entorno (por ejemplo `python -m pytest -q tests/test_smoke.py tests/test_bulk_static.py`).
7. Publica en GitHub tras inspeccionar cambios. Comprueba `/api/health` = `5.4.1` cuando Render publique.
8. Recarga la página y comprueba la nueva lista en Rutas. No borres datos del sitio sin respaldo.
