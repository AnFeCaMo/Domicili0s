# DOMICILIO V5.3.3

**Versión actual: 5.3.3.** Repositorio: https://github.com/AnFeCaMo/Domicili0s

**Novedades:** editor, selección y borrado masivo de reglas sin reinstalación automática; búsqueda de intersecciones Calle/Carrera sin asignar falsos domicilios. Lee [MEJORAS_V5_3_2.md](MEJORAS_V5_3_2.md), [INSTALAR_V5_3_2.md](INSTALAR_V5_3_2.md) y [PRUEBAS_V5_3_2.md](PRUEBAS_V5_3_2.md).

# DOMICILIO V5.3.1

**Actualización de navegación:** véase [MEJORAS_V5_3_1.md](MEJORAS_V5_3_1.md) y [INSTALAR_V5_3_1.md](INSTALAR_V5_3_1.md).

# DOMICILIO V5.3 — Asistente de reparto

**Versión base previa:** 5.3.0  
**Autor:** Ing. Andrés Camacho  
**Plataforma:** FastAPI + JavaScript/HTML/CSS + Leaflet/OpenStreetMap; OSRM y Nominatim públicos opcionales para rutas/geocodificación.  
**Objetivo:** un solo flujo de optimización para todos los pedidos de la jornada, sin requerir GPS por pedido y sin crear ubicaciones falsas.

## Flujo principal

1. En **Pedidos**, añade un pedido o pega una lista. Se guardan los nombres y las direcciones incluso sin coordenadas.
2. En **Rutas**, pulsa **Optimizar toda mi ruta**; busca ubicaciones, consulta memoria local, calcula un orden por carreteras cuando es posible y propone un orden aproximado para las demás. **No se borra nada al optimizar**.
3. Revisa y aprueba la propuesta. La ruta GPS solo incluye puntos localizados. Si no está disponible tu GPS actual, se informa claramente y se limita la optimización a una propuesta, sin inventar una base.
4. En **Inicio** o **Pedidos**, selecciona **Ir al pedido**. Si no tiene coordenadas, la tarjeta de navegación muestra su dirección y **Estoy en esta dirección**. Al llegar y estando detenido, confirma el GPS con precisión suficiente.
5. Después de registrar una entrega, pasa **al siguiente pedido en el orden aprobado**. Si no está localizado, lo muestra sin saltárselo.
6. **Finalizar jornada** archiva entregados, no realizados y anulados en **Historial**, verifica el guardado, y limpia la lista de la jornada actual. Optimizar no termina ni limpia la jornada.

## Menú simplificado

Pestañas principales: **Inicio, Pedidos, Rutas, Historial**. El mapa está disponible en Inicio y al abrir la navegación, pero no ocupa pestaña principal. Solo se fijan puntos en el mapa al entrar expresamente en modo de selección. Los ajustes y la ayuda local están juntos en **Configuración** (menú de usuario).

## Botones y acciones

- **Ir al pedido:** navega a coordenadas conocidas o presenta la dirección si faltan.
- **Editar:** permite cambiar nombre, dirección y referencia sin exigir GPS; si cambia la dirección no reutiliza la ubicación antigua sin verificación.
- **Entregado:** registra el resultado y prepara el siguiente pedido aprobado.
- **Fallido:** pide el motivo, registra fecha/hora y excluye el pedido de rutas pendientes sin borrarlo del historial.
- **Anular:** conserva el pedido como no entregado/anulado hasta el archivo de jornada, con confirmación.
- **Ver en mapa:** solo centra un marcador existente; si falta ubicación lo explica.
- **Estoy en esta dirección:** lectura GPS reciente con doble confirmación; aprende esa dirección para próximas jornadas.
- **Finalizar jornada:** archiva la jornada completa y limpia únicamente la lista activa.
- **Optimizar toda mi ruta:** busca, compara, propone y dibuja el recorrido disponible después de aprobarlo. No altera la jornada en curso sin autorización.

## Instalación

Ver `INSTALAR_V5_3.md`. Copia el ZIP completo sobre el repositorio en la rama `main` **tras crear respaldo de Git y exportar un JSON de la aplicación**. El despliegue de Render depende de la configuración del repositorio; esta entrega no publica cambios automáticamente.

## Pruebas

Ver `PRUEBAS_V5_3.md`. Incluye pruebas JavaScript, Python/FastAPI y una prueba interactiva de Chromium **con mapa simulado**; no sustituye una prueba real de GPS, geocodificación o navegación en moto.

## Advertencias

- La localización por dirección puede ser aproximada y los mapas públicos no tienen todas las viviendas de Ciénaga.
- La nomenclatura es solo un criterio aproximado, no una garantía de recorrido óptimo.
- Nunca autorizar contravía, giro en U prohibido u otros movimientos ilegales. La aplicación sigue el grafo vial de los servicios públicos; el mapa puede mostrar calles alternativas sin recomendar maniobras prohibidas.
- Para conducir, usar la voz de manera segura, revisar el vehículo detenido y respetar siempre señales y normas de tránsito.
- Las jornadas se almacenan en el navegador (localStorage); borrar datos del sitio puede borrarlas. **Exporta copias JSON periódicamente**. No hay sincronización multi-dispositivo ni base de datos persistente en servidor.
- El asistente en Configuración es ayuda basada en reglas locales, no una IA generativa.

## Documentación

`MEJORAS_V5_3.md` · `GUIA_USO_V5_3.md` · `INSTALAR_V5_3.md` · `PRUEBAS_V5_3.md` · `SEGURIDAD_LIMITACIONES_V5_3.md`.

Los archivos `MEJORAS_V4.md`, `MEJORAS_V5.md`, `MEJORAS_V5_1.md` y `MEJORAS_V5_2.md` son antecedentes históricos y no sustituyen esta documentación.


## Nuevo en V5.3.3

El **Monitor inteligente** revisa pedidos, lecturas de GPS y la coherencia textual de direcciones de forma local mientras la app está abierta. Las anomalías se muestran en Inicio, Rutas y Configuración. Las lecturas claramente anómalas se descartan para evitar saltos de marcador. Las direcciones sin coordenadas permanecen en la lista. Configuración permite apagar el monitor. Consulta `MEJORAS_V5_3_3.md`, `INSTALAR_V5_3_3.md` y `PRUEBAS_V5_3_3.md`.

**Privacidad:** no se envía la ubicación del teléfono a un servicio remoto de monitoreo. El despliegue en Render sirve la aplicación, pero no activa seguimiento cuando el navegador está cerrado.
