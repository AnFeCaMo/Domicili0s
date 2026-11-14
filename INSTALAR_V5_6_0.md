# Instalación

Esta entrega es un **proyecto completo** compatible con el árbol V5.5.0. Descarga y respalda tu jornada JSON primero.

```bash
(
 set -e
 cd ~/Descargas/Domicili0s-V3
 git switch main
 git pull --ff-only origin main
 if [ -n "$(git status --porcelain)" ]; then echo 'Hay cambios pendientes'; exit 1; fi
 git branch "respaldo-antes-v560-$(date +%Y%m%d%H%M%S)"
 unzip -t "$HOME/Descargas/DOMICILIO_V5_6_0_COMPLETA.zip"
 unzip -o "$HOME/Descargas/DOMICILIO_V5_6_0_COMPLETA.zip" -d .
 for f in frontend/*.js; do node --check "$f"; done
 for t in tests/*.js; do node "$t"; done
 git add -A
 git diff --cached --stat
 git commit -m "DOMICILIO V5.6.0: jornada inteligente integrada"
 git push origin main
)
echo "Código de resultado: $?"
```

Verifica https://domicili0s-v3.onrender.com/api/health → 5.6.0 una vez termine Render.
