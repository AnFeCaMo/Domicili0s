# DOMICILIO V5.4.0 — navegación directa y ubicaciones verificables

- Selección de rutas por menor distancia entre alternativas transitables devueltas por el servidor, con límite de demora extrema.
- Detección de desvíos desde GPS: requiere dos lecturas suficientemente precisas; recálculo desde la posición actual con pausa para evitar saturación.
- Marcadores diferenciados: azul para pedido navegando, verde para conocido, naranja para punto aproximado y gris para terminado.
- Avisa si el recorrido resulta desproporcionado o si el servicio ajusta inicio/destino lejos de las coordenadas solicitadas.
- Conserva monitor, pedidos, memoria de ubicaciones, archivo de jornadas, botones y ajustes.
- No añade rutas contravía como indicaciones. No inventa restricciones rojas si no hay información cartográfica verificable.

## Limitaciones
La geocodificación pública puede no disponer de portales o intersecciones en Ciénaga. Un punto de intersección es *orientativo*, nunca la casa exacta. La menor distancia no equivale siempre al menor tiempo ni a la posibilidad física de paso. La navegación real requiere evaluación en el lugar, desde el teléfono, con el vehículo detenido para configurar o interactuar.
