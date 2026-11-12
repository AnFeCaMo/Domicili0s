# Instalación DOMICILIO V5.3 (Linux Mint + GitHub + Render)

**Antes de comenzar:** exporta un respaldo JSON desde Configuración y guárdalo fuera de Chrome. El ZIP contiene la aplicación completa.

```bash
cd ~/Descargas/Domicili0s-V3 || exit 1
git switch main || exit 1
git pull --ff-only origin main || exit 1

# Evitar mezclar cambios locales no publicados
if [ -n "$(git status --porcelain)" ]; then
  echo 'Hay cambios locales. Revísalos antes de instalar.'
  exit 1
fi

git branch respaldo-antes-v53-$(date +%Y%m%d%H%M) || exit 1
unzip -t "$HOME/Descargas/DOMICILIO_V5_3_COMPLETA.zip" || exit 1
unzip -o "$HOME/Descargas/DOMICILIO_V5_3_COMPLETA.zip" -d . || exit 1

for f in frontend/*.js; do node --check "$f" || exit 1; done
for t in tests/*.js; do node "$t" || exit 1; done

# Publicar si estás conforme con los cambios
 git add -A
 git diff --cached --stat
 git commit -m 'DOMICILIO V5.3: jornadas historial tarjetas y navegacion' || exit 1
 git push origin main
```

Comprueba el despliegue de Render en su panel y consulta `curl -fsS https://domicili0s-v3.onrender.com/api/health` hasta que muestre `"version":"5.3.0"`.

Para restaurar código, utiliza la rama Git de respaldo que se creó. La recuperación de datos locales requiere la copia JSON.
