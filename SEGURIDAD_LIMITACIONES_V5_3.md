# Seguridad, privacidad y límites — V5.3

- Los datos de pedidos, memoria e historial se almacenan localmente en el navegador. **No está garantizada la conservación a largo plazo** si se limpian los datos del sitio, el dispositivo se daña o se cambia de navegador. El JSON exportado es la copia de seguridad que debe conservarse.
- Las direcciones y coordenadas enviadas a los servicios públicos de búsqueda de mapas y enrutamiento se transmiten a esos servicios; no constituye operación 100% offline.
- El GPS necesita HTTPS, permiso del dispositivo y precisión suficiente. Un punto aproximado de calle no es una ubicación de vivienda confirmada.
- Solo un usuario detenido en el domicilio debe asociar coordenadas mediante confirmación explícita. No se interpreta una proximidad GPS como prueba de entrega.
- Los recorridos calculados siguen restricciones viales representadas en los datos públicos, que pueden estar incompletas. **No se sugieren ni dibujan atajos ilegales de contravía o giros en U prohibidos**. Siempre deben respetarse señales y reglas de tránsito.
- El sistema optimiza según datos disponibles; sin tráfico real ni una cartografía completa no puede asegurar la ruta mundialmente óptima o más rápida.
- La interfaz móvil y la navegación por voz exigen pruebas controladas con teléfono real. No manipular el teléfono mientras se conduce.
- Pruebas de navegador usan un stub de Leaflet y por ello NO validan la cartografía, permisos GPS físicos ni direcciones reales.
- Los archivos históricos de versiones anteriores se conservan como referencia, no como documentación vigente.
