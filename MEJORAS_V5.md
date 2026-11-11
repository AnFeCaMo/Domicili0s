# DOMICILIO V5 — Entrega integrada

## Funciones
- Botón principal «Optimizar toda mi ruta» en Pedidos y Rutas; los accesos rápidos de Inicio usan el mismo flujo.
- Interpreta listas numeradas; separa clientes, direcciones y referencias usando reglas deterministas. Las ambigüedades necesitan revisión.
- Combina nuevos pedidos pegados con pedidos existentes sin duplicarlos según nombre y dirección.
- Si falta GPS, mantiene los pedidos en la lista y propone un orden de nomenclatura **aproximado**, sin inventar puntos.
- Para puntos conocidos consulta matriz dirigida de tiempos por carretera; optimización exacta hasta 10 paradas y heurística para más, respetando prioridades y próxima parada activa.
- Solicita aprobación de la propuesta completa antes de aplicarla. Después dibuja la ruta de puntos conocidos en el mapa, con flechas de circulación.
- Cada pedido tiene «Estoy en esta dirección»: solicita GPS, exige precisión de 50 m o mejor, confirma punto explícitamente y lo guarda en memoria local.
- Tras entregar, el siguiente pedido se selecciona automáticamente cuando tiene GPS; vuelve a proponer ruta para las entregas restantes y no altera el orden sin confirmación.
- Para el origen se intenta obtener GPS actualizado; si falla, se indica cuándo se usa el último punto confirmado o el punto de salida.
- Navegación guiada por voz a hitos aproximados de 100 m, 50 m y en el cruce, sin repetir continuamente.
- Controles responsivos: perfil accesible en móvil, finalizar jornada, textos claros y botones secundarios ocultos.

## Límites reales y seguridad
- Un pedido sin coordenadas verificadas no puede tener navegación GPS por calles, aunque sí forma parte de la lista.
- El orden por nomenclatura no garantiza cercanía por carretera. Si el servicio público OSRM falla, se muestra una advertencia; no se fingen tiempos de viaje.
- Hasta 35 puntos localizados se intenta utilizar matriz por carretera. Para más de 35 se usa una heurística geográfica marcada claramente como aproximada, para no sobrecargar el servicio público. No hay límite fijo de registro de pedidos.
- No hay datos confiables de trancones, policía o cierres en tiempo real. OSRM no incluye tráfico en vivo.
- Navegador web puede suspender geolocalización y voz con la pantalla bloqueada. Requiere HTTPS y permisos GPS.
- El estado se guarda en el mismo navegador con localStorage, no en una cuenta remota; antes de actualizar exportar JSON.
- GPS de llegada puede variar; confirmar estando detenido y corregir en mapa si el lugar no coincide.
- El servicio público de geocodificación no debe utilizarse intensivamente en producción; las ubicaciones no se adjudican sin confirmación.
- El sistema no equivale a un modelo generativo como ChatGPT. Las reglas locales cubren los formatos previstos y requieren confirmación en casos ambiguos.
- Sin conexión puede visualizarse última ruta guardada, pero no recalcular nuevos tramos ni ofrecer navegación offline completa.

## Pruebas
Ejecutar `node --check frontend/v5.js`, los scripts en tests y `python -m pytest -q tests`. Antes de repartir, probar GPS y voz detenido, en Android y Chrome.
