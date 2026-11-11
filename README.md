# DOMICILIO V5 — Sistema inteligente de reparto

La **versión 5** integra los cambios de navegación, memoria local, revisión de direcciones, GPS de llegada, propuesta unificada y diseño adaptativo. Para detalles funcionales y limitaciones consulta [MEJORAS_V5.md](MEJORAS_V5.md) y [INSTALAR_V5.md](INSTALAR_V5.md).

**Advertencia:** no sustituye señales viales ni ofrece datos de tráfico en tiempo real. La navegación web en segundo plano no está garantizada. Siempre confirma las ubicaciones antes de conducir.

---

# DOMICILIO V3 — Asistente Inteligente de Reparto

Aplicación moderna para repartidores y gestión inteligente de entregas en Ciénaga, Magdalena.
Autoría y dirección técnica: **Ing. Andrés Camacho**.

---

## 🎨 Rediseño de Interfaz — Modelo Visual Aprobado (Morado Profesional)

La interfaz de **DOMICILIO V3** ha sido transformada respetando fielmente el modelo visual aprobado, con su paleta de colores morados, diseño de tarjetas blancas con bordes suaves, iconos vectoriales y adaptación completa para celulares, tabletas y computadores.

### 🟣 Paleta de Colores Oficial

- **Morado principal:** `#6D28D9`
- **Morado oscuro:** `#4C1D95`
- **Morado secundario:** `#7C3AED`
- **Morado suave:** `#EDE9FE`
- **Fondo principal:** `#F8F7FF`
- **Fondo de tarjetas:** `#FFFFFF`
- **Texto principal:** `#17142B`
- **Texto secundario:** `#64748B`
- **Verde de éxito:** `#22C55E`
- **Naranja de advertencia:** `#F97316`
- **Rojo de error:** `#EF4444`
- **Azul informativo:** `#3B82F6`

---

## 🚀 Arquitectura y Componentes Implementados

### 1. Encabezado Superior (Todo el Ancho con Degradado Morado)
- **Izquierda:** Icono de motocicleta, texto destacado **DOMICILIO V3**, badge `PRO`, subtítulo `Asistente Inteligente de Reparto` y botón para alternar el menú lateral.
- **Derecha:** Indicador de conexión en tiempo real (`Conectado` / `Sin conexión`), botón de notificaciones con contador, alternador de modo oscuro/claro y menú de usuario con avatar, nombre (*Andrés C.*) y opciones desplegables (*Estadísticas*, *Historial*, *Configuración*, *Finalizar jornada*).

### 2. Menú Lateral en Computadores y Navegación Móvil
- **En computadores:** Menú lateral completo con 8 secciones:
  1. ⊞ **Inicio**
  2. 📦 **Pedidos**
  3. ↝ **Rutas**
  4. 🗺️ **Mapa**
  5. 🧠 **Cerebro IA**
  6. 🕒 **Historial**
  7. 📊 **Estadísticas**
  8. ⚙️ **Configuración**
  - Opción activa con fondo morado destacado.
  - Estado y temporizador de jornada al pie del menú; el botón para finalizar también está en el menú de usuario.
  - En ventanas de escritorio compactas (768–1100 px), el menú y el dashboard se ajustan para mostrar las estadísticas, el mapa, las acciones rápidas y el asistente en una sola vista.
- **En dispositivos móviles:** Navegación inferior fija sin barras laterales con las 5 secciones de trabajo operativo: *Inicio*, *Pedidos*, *Rutas*, *Cerebro IA* y *Mapa*. Las vistas de *Historial*, *Estadísticas* y *Configuración* están disponibles desde el menú de usuario.

### 3. Pantalla de Inicio (Dashboard del Repartidor)
- **Bienvenida y Jornada Activa:**
  - Saludo dinámico según la hora del día ("¡Buenas tardes, Andrés!").
  - Mensaje de cabecera: *"Todo listo para continuar con tus domicilios."*
  - **Fecha y hora reales en vivo**, con segundero continuo y temporizador de jornada ("Tiempo en ruta: Xh Ym").
  - Botones de acción: **«Continuar mi jornada»** y **«Finalizar jornada»** (con confirmación de seguridad).
- **Cinco Tarjetas Horizontales de Estadísticas:**
  1. 🟣 **Pendientes:** Conteo de pedidos por entregar (icono morado).
  2. 🟢 **Completados:** Conteo de pedidos entregados (icono verde).
  3. 🟠 **En ruta:** Conteo de domicilios en camino (icono naranja).
  4. 🔵 **Distancia estimada:** Kilómetros calculados de la ruta OSRM (icono azul).
  5. 🟣 **Tiempo estimado:** Minutos restantes calculados de carretera (icono morado oscuro).
- **Siguiente Entrega y Mapa (Tarjeta en 2 Columnas):**
  - *Columna Izquierda:* Título *Siguiente entrega*, cliente, dirección, referencia, número de parada, estado, botón morado **«Ir al destino»** y botón secundario **«Ver en mapa»**.
  - *Columna Derecha:* Mapa interactivo real Leaflet + OpenStreetMap con marcadores numerados, ruta trazada, GPS y contador de paradas activas.
- **Acciones Rápidas (Tarjeta con 5 Botones Grandes):**
  1. ＋ **Nuevo pedido** (abre formulario).
  2. ⚡ **Optimizar ruta** (aplica algoritmo de proximidad).
  3. ↩ **Definir regreso** (configura retorno a Casa o Base).
  4. 🧭 **Continuar mi jornada** (destacado con verde suave).
  5. 📊 **Ver estadísticas** (lleva a métricas de rendimiento).
- **Tarjeta del Cerebro IA en el Inicio:**
  - Icono de cerebro morado, indicador de disponibilidad real ("Motor de reglas local activo"), input rápido de instrucciones, botón de micrófono y botón morado de envío.
  - Al pegar o dictar varias direcciones, reconoce cada parada y ofrece prepararlas en el organizador de rutas.

### 4. Pantalla de Pedidos
- El Cerebro IA reconoce listas de direcciones tanto en un solo mensaje como en varias líneas. El organizador asocia cada dirección con el nombre que viene después (por ejemplo, `Calle 12 # 13-04 Bienestar Familiar`), además de admitir Excel, CSV, TXT y dictado.
- La lista se geocodifica y se presenta una propuesta de ruta para revisión; los pedidos y el orden solo cambian después de la aprobación explícita.
- Tarjetas grandes con borde semántico según estado.
- Filtro por chips (*Todos*, *Pendientes*, *En ruta*, *Entregados*).
- Menú expandible por pedido con 7 opciones reales:
  - ✏️ **Editar pedido**.
  - 🎯 **Cambiar ubicación en el mapa**.
  - 📋 **Consultar detalles** (modal informativo con distancias y estado).
  - ✅ **Marcar como entregado** (confirmación manual y timestamp).
  - ⚠️ **Registrar entrega fallida** (motivo y auditoría).
  - ⬆️ / ⬇️ **Subir / Bajar parada** (reordenamiento manual de la secuencia).
  - 🗑 **Eliminar pedido** (confirmación destructiva).
- Botón flotante global (**FAB**) `+` visible en todo momento.

### 5. Pantalla de Rutas
- Configuración de origen (Restaurante / Base) con geocodificación Nominatim o selección en mapa.
- Configuración de destino final: *Sin regreso*, *Restaurante*, *Lugar guardado (Casa)* o *Punto en mapa*.
- Optimización heurística de proximidad y orden sugerido por tiempos reales de carretera mediante matriz OSRM.
- Trazado de ruta GeoJSON en el mapa.

### 6. Pantalla de Historial y Estadísticas
- Tasa de efectividad porcentual (entregados vs fallidos).
- Distancia acumulada calculada.
- Tiempo total en ruta de la jornada.
- Barra de progreso visual de entregas.
- Línea de tiempo cronológica con auditoría de todas las acciones del repartidor.

### 7. Pantalla de Configuración y Memoria
- Memoria persistente del Cerebro IA (creación, edición y eliminación de reglas).
- Información transparente del motor heurístico local (sin prometer modelos generativos ausentes).
- Gestión de lugares frecuentes guardados.
- Copias de seguridad completas en formato JSON descargable (`domicilio-v3-respaldo.json`) e importación con validación.
- Firma y créditos del autor: **Ing. Andrès Camacho**.

---

## 📁 Archivos Modificados

| Archivo | Descripción del Cambio |
|---|---|
| `frontend/index.html` | Estructura completa bajo el modelo aprobado: encabezado superior morado, menú lateral de 8 opciones, dashboard con reloj y jornada activa, dos columnas para entrega y mapa, acciones rápidas, widget de IA, navegación móvil inferior de 5 botones y vistas completas. |
| `frontend/styles.css` | Sistema de estilos del modelo aprobado con la paleta morada oficial (`#6D28D9`, `#4C1D95`, `#EDE9FE`, etc.), tipografía Inter, tarjetas blancas suaves, botones con degradados, diseño responsive y modo oscuro opcional. |
| `frontend/app.js` | Tarjetas de pedidos y opciones completas, sincronización del chat con el organizador de rutas para listas de direcciones, FAB global, filtros y estadísticas en vivo. |
| `frontend/bulk.js` | Análisis de listas de domicilios, geocodificación, optimización de ruta y aprobación de importación. |
| `frontend/v3.js` | Controlador de navegación para las 8 secciones, reloj vivo en tiempo real, timer de jornada activa, finalización de turno, sincronización del mapa, menú desplegable de usuario y auditoría. |
| `frontend/manifest.webmanifest` | Configuración PWA con color de tema `#6D28D9`. |
| `frontend/sw.js` | Service worker actualizado con la versión de caché `domicilio-v3-shell-6`. |
| `README.md` | Documentación técnica integral de la entrega. |

---

## 🧪 Pruebas Automatizadas de Regresión

- **Smoke Tests (`tests/test_smoke.py`):**
  - Los 8 elementos obligatorios están presentes y verificados: `id="map"`, `id="pedido-form"`, `id="return-to-start"`, `Creado Por el Ing. Andrès Camacho`, `id="dashboard"`, `id="destination-mode"`, `id="settings-view"`.
  - Cadena prohibida `"Estado del backend"` ausente.
- **Sintaxis JavaScript:** Comprobación estricta con `node -c` sobre `app.js`, `v3.js` y `sw.js` (0 errores).
- **Sintaxis Python:** Comprobación con `py_compile` sobre `backend/app/main.py` y `tests/test_smoke.py` (0 errores).

---

## 🚀 Despliegue con Docker

```bash
docker compose up -d --build
```
Acceso desde el navegador: `http://localhost:8000`

## V3.1 — Importación masiva y reoptimización aprobada

En **Pedidos → Organizar mi jornada** puedes pegar una dirección por línea, cargar TXT, CSV (con columna `Dirección`/`Domicilio`) o XLS/XLSX (primera hoja, encabezados). Para Excel se utiliza SheetJS cargado por CDN; requiere conexión para disponer de ese lector. También se puede dictar texto si el navegador soporta reconocimiento de voz. La transcripción debe revisarse manualmente.

**Flujo seguro:** analizar → editar filas → verificar ubicaciones con Nominatim → seleccionar coincidencias ambiguas → calcular matriz OSRM de tiempos y distancias → ver propuesta → **aprobar** importación y reordenamiento. Los pedidos existentes no cambian antes de la aprobación. La siguiente parada pendiente se protege; las demás se agrupan por urgentes, prioritarias y normales, optimizando cada grupo con una heurística de proximidad y refinamiento 2-opt. Se considera el destino final configurado. Se conserva el historial de entregas completadas y se evita duplicar filas idénticas en la lista y pedidos pendientes coincidentes.

**Limitaciones:** requiere Internet para geocodificación y cálculo de rutas; no utiliza tráfico en vivo ni garantiza el óptimo matemático global; el geocodificador público puede no encontrar direcciones precisas o imponer límites de uso. Se recomienda revisar cada ubicación. Las estimaciones no incluyen tiempos de atención. La reoptimización masiva se ejecuta al pulsar «Calcular ruta y solicitar aprobación», una vez analizada y verificada la lista. Los límites de uso del servicio público no son apropiados para cargas comerciales intensivas.
