# DOMICILIO V5.3.1 — Tarjeta de navegación y versión visible

## Cambios

- La tarjeta de navegación GPS muestra siempre el nombre del cliente, la dirección escrita completa y la referencia, tanto con coordenadas como sin ellas.
- «Estoy perdido · Recalcular» solicita una ruta nueva desde GPS fresco y explica cuando el domicilio todavía no está localizado.
- «Repetir indicación» vuelve a leer la última instrucción mostrada.
- «Entregado · Detener navegación» confirma la entrega, detiene la navegación y prepara el siguiente pedido según el orden aprobado y la configuración de avance automático.
- «Detener» permite terminar la navegación sin marcar la entrega.
- Corrige el texto de encabezado que aún mostraba V5.2, cambia versión del backend a 5.3.1 y renueva la caché de la aplicación.

## Alcance de pruebas

- Se ejecutan las pruebas JavaScript preexistentes y una prueba adicional de regresión de la tarjeta.
- No reemplazan la verificación con GPS real, voz, permisos y rutas por carretera en un celular detenido.

## Seguridad

La app no debe mostrar como comprobada una ubicación que solamente se aproxima a una calle. No manipules los controles mientras conduces. El botón «Estoy perdido» recalcula sobre vías permitidas; no indica circular en contravía.
