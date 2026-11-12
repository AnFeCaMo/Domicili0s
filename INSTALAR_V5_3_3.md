# Instalar DOMICILIO V5.3.3

1. Exportar un **respaldo JSON** de pedidos, reglas, ubicaciones e historial desde Configuración. Guardarlo fuera de la carpeta de instalación.
2. Comprobar el repositorio y árbol limpio:

```bash
cd ~/Descargas/Domicili0s-V3 || exit 1
git remote -v
git switch main || exit 1
git pull --ff-only origin main || exit 1
git status --short
```

El remoto esperado es `https://github.com/AnFeCaMo/Domicili0s.git`. Si tienes cambios locales, resuélvelos ANTES de extraer el ZIP.

3. Crear respaldo, extraer e inspeccionar:

```bash
cd ~/Descargas/Domicili0s-V3 || exit 1
git branch "respaldo-antes-v533-$(date +%Y%m%d%H%M)" || exit 1
unzip -t "$HOME/Descargas/DOMICILIO_V5_3_3_COMPLETA.zip" || exit 1
unzip -o "$HOME/Descargas/DOMICILIO_V5_3_3_COMPLETA.zip" -d . || exit 1
for f in frontend/*.js; do node --check "$f" || exit 1; done
for t in tests/*.js; do node "$t" || exit 1; done
git diff --stat
```

4. Publicar solo si las pruebas pasan y el diff es el esperado:

```bash
git add -A
git commit -m "DOMICILIO V5.3.3: monitor GPS y pedidos" || exit 1
git push origin main || exit 1
curl -fsS https://domicili0s-v3.onrender.com/api/health
```

Cuando Render termine el despliegue, `/api/health` debe informar `"version":"5.3.3"`.

## Primera prueba de funcionamiento

Con el celular detenido: abre Configuración y comprueba que aparece "Monitor inteligente" activo. Agrega una dirección que no aparezca en el mapa: debe permanecer en Pedidos y generar una alerta. Si la calle y la carrera del resultado del mapa no coinciden con las escritas, se mostrará un aviso para corregir/confirmar; no se cambiará la dirección automáticamente.

El monitor no proporciona vigilancia del dispositivo cuando está cerrado ni sincroniza GPS en servidor. Esta versión NO necesita nuevas credenciales ni OAuth.
