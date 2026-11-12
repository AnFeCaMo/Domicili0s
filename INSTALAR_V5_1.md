# Instalar V5.1 en Linux Mint

**Antes:** exporta respaldo JSON de los pedidos desde la app y verifica que el ZIP esté en ~/Descargas.

```bash
cd ~/Descargas/Domicili0s-V3 || exit 1
git switch main || exit 1
git pull --ff-only origin main || exit 1
git branch respaldo-antes-v51-$(date +%Y%m%d%H%M) || exit 1
unzip -t "$HOME/Descargas/DOMICILIO_V5_1_GPS_DIRECCIONES.zip" || exit 1
unzip -o "$HOME/Descargas/DOMICILIO_V5_1_GPS_DIRECCIONES.zip" -d . || exit 1
for f in frontend/*.js; do node --check "$f" || exit 1; done
for t in tests/*.js; do node "$t" || exit 1; done
git add -A
git diff --cached --quiet && { echo 'Sin cambios nuevos'; exit 0; }
git commit -m "DOMICILIO V5.1: geocodificar direcciones automáticamente" || exit 1
git push origin main || exit 1
```

En Chrome Android asegúrate de permitir Ubicación al sitio HTTPS y de activar la ubicación del dispositivo. Abre la app, pega direcciones, pulsa «Optimizar toda mi ruta» y revisa los marcadores: exactos, aproximados o pendientes. No dependas de una ubicación aproximada como punto de entrega definitivo.
