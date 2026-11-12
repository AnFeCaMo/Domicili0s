# Instalar DOMICILIO V5.3.2

Repositorio confirmado: https://github.com/AnFeCaMo/Domicili0s

1. En la aplicación actual, **exporta una copia JSON** de pedidos, memoria y jornadas. Guardarla fuera del navegador.
2. En Linux Mint, usa tu clon local del repositorio, después de verificar `git remote -v`. Puede seguir llamándose `~/Descargas/Domicili0s-V3` aunque el repositorio remoto ahora sea `AnFeCaMo/Domicili0s`.
3. Comprueba que `git status --porcelain` esté vacío.
4. Crea rama de respaldo `git branch respaldo-antes-v532-$(date +%Y%m%d%H%M)`.
5. Comprueba ZIP: `unzip -t ~/Descargas/DOMICILIO_V5_3_2_COMPLETA.zip`.
6. Extrae sobre el directorio raíz del clon: `unzip -o ~/Descargas/DOMICILIO_V5_3_2_COMPLETA.zip -d .`.
7. Ejecuta `for f in frontend/*.js; do node --check "$f" || exit 1; done` y `for t in tests/*.js; do node "$t" || exit 1; done`.
8. Revisa los cambios `git diff --stat` y publica `git add -A && git commit -m 'DOMICILIO V5.3.2: reglas y direcciones' && git push origin main`.
9. En Render, comprueba `/api/health`, cuya versión esperada es `5.3.2`.

**Precaución:** no borres datos del sitio en Chrome para refrescar la interfaz, ya que se perderían pedidos y reglas almacenados localmente. Abre/reinicia la aplicación y consulta el número de versión. Si el repositorio antiguo ha sido renombrado, `git remote -v` es la fuente de verdad: evita hacer push a un remoto incorrecto.
