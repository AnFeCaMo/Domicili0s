# DOMICILIO V5.2 — Correcciones de auditoría (12 de noviembre de 2026)

- Optimización unificada: inserción provisional de pedidos sin coordenadas junto a calles y carreras similares; no se inventan ubicaciones y los tiempos de carretera solo cubren puntos localizados.
- Origen: GPS actual si está fresco (25 s, hasta ±100 m), última entrega confirmada de precisión adecuada como respaldo o base; se advierte cuando no es GPS real.
- Navegación: corrige direcciones OSRM con espacios (slight left/right, sharp left/right); avisos a ~100 m, ~50 m y en la esquina; alerta especial cuando el punto es aproximado. Última entrega guardada solo si GPS reciente y ±50 m.
- Seguridad: caracteres HTML de pedidos escapados en globos del mapa y resumen; auditoría, reglas y lugares guardados usan texto seguro.
- Interfaz: oculto botón antiguo redundante, títulos sencillos, botón único, mejoras del encabezado en móvil.
- Caché web: nueva versión y política preferente de red para aplicar actualizaciones sin conservar JS viejo.
- Servidor: /api/health informa versión 5.2.0.

## Límites reales
No es posible determinar todas las viviendas con GPS; geocodificar depende de la información cartográfica de Ciénaga. Una dirección sin punto no puede generar trayecto por calles. Las paradas mixtas son un orden provisional, no una prueba de optimalidad global. Sin datos de tráfico en vivo, OSRM da tiempos estimados. No se probó conducción real.
