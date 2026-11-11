# Cómo instalar DOMICILIO V5 desde ZIP (Linux Mint)

**Antes de empezar:** abre V4 en el mismo navegador que utilizas para trabajar y exporta una copia de seguridad JSON de pedidos y reglas. GitHub no guarda tus pedidos personales del navegador.

1. Guarda `DOMICILIO_V5_COMPLETA.zip` en `~/Descargas`.
2. Ejecuta estos comandos desde tu propio equipo:

```bash
cd ~/Descargas/Domicili0s-V3 || exit 1
git switch main || exit 1
git pull --ff-only origin main || exit 1
# Respaldo en Git antes de aplicar cambios
git branch respaldo-antes-v5-$(date +%Y%m%d%H%M) || exit 1
unzip -t "$HOME/Descargas/DOMICILIO_V5_COMPLETA.zip" || exit 1
unzip -o "$HOME/Descargas/DOMICILIO_V5_COMPLETA.zip" -d . || exit 1
node --check frontend/app.js || exit 1
node --check frontend/v5.js || exit 1
node --check frontend/navigation.js || exit 1
for test in tests/*.js; do node "$test" || exit 1; done
git status
git diff --stat
# Publica SOLO después de revisar la lista de archivos cambiados:
git add -A
git commit -m "DOMICILIO V5: optimización unificada y GPS de llegada" || exit 1
git push origin main
```

3. En Render verifica que el despliegue de `main` termine y que `https://domicili0s-v3.onrender.com/static/v5.js` exista. Si la app conserva diseño anterior, cierra y vuelve a abrir la página para renovar el Service Worker.
4. Haz una prueba **detenido** con tres pedidos, uno de ellos sin coordenadas. Comprueba que ninguna dirección desaparezca, que la propuesta pida autorización y que la ruta solo incluya los puntos conocidos.
5. El botón `Estoy en esta dirección` registra tu ubicación solamente con dos confirmaciones y GPS con precisión no mayor a 50 m. No lo uses mientras conduces.

**Nota:** La optimización exacta aplica a grupos de hasta 10 ubicaciones con tiempos por carretera válidos; para grupos mayores se emplean heurísticas. No se garantiza tráfico ni cierres reales, navegación sin internet o voz con pantalla bloqueada.
