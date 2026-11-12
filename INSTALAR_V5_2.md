# Instalar DOMICILIO V5.2

Este ZIP es el proyecto completo. Se instala sobre el repositorio `AnFeCaMo/Domicili0s-V3` sin modificar la información del navegador. Haz una exportación JSON de tus pedidos ANTES de actualizar y no borres los datos de Chrome.

```bash
cd ~/Descargas/Domicili0s-V3 || exit 1
git switch main || exit 1
git pull --ff-only origin main || exit 1
git branch respaldo-antes-v52-$(date +%Y%m%d%H%M) || exit 1
unzip -t "$HOME/Descargas/DOMICILIO_V5_2_COMPLETA.zip" || exit 1
unzip -o "$HOME/Descargas/DOMICILIO_V5_2_COMPLETA.zip" -d . || exit 1
for f in frontend/*.js; do node --check "$f" || exit 1; done
for t in tests/*.js; do node "$t" || exit 1; done
# Pruebas HTTP (con la aplicación iniciada; puerto 8000 libre)
# python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
# En otra terminal: python -m pytest -q tests

git add -A
git commit -m "DOMICILIO V5.2: reparar rutas, voz y seguridad" || exit 1
git push origin main
```

## Comprobación de Render

```bash
curl -fsS https://domicili0s-v3.onrender.com/api/health
```

Debe informar `"version":"5.2.0"` cuando Render publique este commit. Si Chrome sigue mostrando V5.1, recarga la página con los controles del navegador. No elimines los datos del sitio ni el almacenamiento local: allí se guardan tus pedidos.

## Recomendaciones

Prueba GPS con el vehículo detenido. Las posiciones de calle son orientativas, no de vivienda. El orden de direcciones sin GPS es provisional y el sistema necesita conexión para buscar nuevos recorridos de carretera.
