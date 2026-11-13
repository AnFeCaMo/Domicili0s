# Instalación de DOMICILIO V5.4.0

1. Exporta una copia JSON de los pedidos, jornadas y direcciones guardadas desde la aplicación.
2. En `~/Descargas/Domicili0s-V3` comprueba `git status --short` y `git remote -v`.
3. Crea un respaldo: `git branch respaldo-antes-v540-$(date +%Y%m%d%H%M)`.
4. Verifica el ZIP y extráelo en la raíz del repositorio.
5. Ejecuta `node --check frontend/navigation.js` y `for t in tests/*.js; do node "$t" || exit 1; done`.
6. Ejecuta `git add -A && git commit -m "DOMICILIO V5.4.0: rutas directas y marcadores" && git push origin main`.
7. Comprueba `/api/health` cuando Render termine el despliegue.

No incluyas archivos de configuración privados ni secretos en Git.
