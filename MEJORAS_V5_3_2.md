# DOMICILIO V5.3.2 — Mejoras

## Reglas administrables

- Buscar reglas por texto.
- Seleccionar individualmente, seleccionar todas las visibles y deseleccionar.
- Detectar y seleccionar reglas duplicadas exactas tras normalizar mayúsculas, acentos y puntuación habitual.
- Eliminar varias reglas mediante una sola confirmación.
- Editar reglas existentes o añadir nuevas. Bloquea la duplicación de nuevas reglas idénticas y limita el máximo a 200 reglas de hasta 1500 caracteres.
- **No se reinstalan las reglas de V4 al iniciar**: las reglas eliminadas no deben regresar al recargar.
- Conservación de pedidos e historial al modificar reglas. Exporta un respaldo JSON antes de cambios masivos.

## Interpretación de direcciones

- `Calle 14 número 11 12` / `Calle 14 numeral 11 12` / `Calle 14 carrera 11 12` => `Calle 14 #11-12`.
- `Carrera 25 número 18C 86` => `Carrera 25 #18C-86`.
- El GPS **jamás cambia los números de la dirección escrita**.
- El buscador primero intenta la casa completa; si falla, busca explícitamente la intersección de Calle y Carrera. No acepta un punto arbitrario del centro de la calle como casa.
- Una intersección es **aproximada**; requiere comprobación humana, y una dirección no encontrada sigue en la lista sin coordenadas ficticias.

## Alcance y limitaciones

- Se conservan navegación, optimización, historial, tarjetas y asistente local de V5.3.1.
- El motor de reglas no es una IA generativa: son instrucciones personales administradas en la interfaz. No controla directamente el sensor GPS.
- El geocodificador público puede carecer de la vivienda o intersección. No se garantiza una ubicación para cada dirección ni la ruta más rápida.
- **No hay corrección automática de GPS errático por IA** en esta actualización; se deben validar lecturas reales y precisión del teléfono.
- Mantener navegación legal; sin recomendaciones de contravía.
