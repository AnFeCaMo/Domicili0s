const CIE_NAGA_CENTER = [11.0060, -74.2464];

const pedidoList = document.getElementById('pedido-list');
const pedidoFormWrapper = document.getElementById('pedido-form-wrapper');
const pedidoForm = document.getElementById('pedido-form');
const pedidoNumberInput = document.getElementById('pedido-number');
const pedidoNameInput = document.getElementById('pedido-name');
const pedidoAddressInput = document.getElementById('pedido-address');
const searchLocationButton = document.getElementById('search-location-button');
const addressFeedback = document.getElementById('address-feedback');
const selectedCoordinates = document.getElementById('selected-coordinates');
const startAddressInput = document.getElementById('start-address');
const searchStartButton = document.getElementById('search-start-button');
const setStartOnMapButton = document.getElementById('set-start-on-map-button');
const startLocationDisplay = document.getElementById('start-location-display');
const optimizeRouteButton = document.getElementById('optimize-route-button');
const calculateRouteButton = document.getElementById('calculate-route-button');
const routeSummary = document.getElementById('route-summary');
const returnToStartInput = document.getElementById('return-to-start');

const pedidos = [];
const learnedRules = [];
const knownAddresses = [];
let gpsPosition = null;
let gpsWatchId = null;
let isSelectingPedidoPoint = false;
let suggestionOrder = null;
let suggestionReason = '';
let speechRecognition = null;
const pedidoMarkers = new Map();
let selectedLocation = null;
let selectedMarker = null;
let startLocation = [...CIE_NAGA_CENTER];
let startMarker = null;
let mapInstance = null;
let routeLine = null;
let editingPedidoId = null;
let isSelectingStartPoint = false;
let currentRouteOrder = [];
let currentOrderFilter = 'all';

// Sistema de Notificaciones Toast
function showToast(message, type = 'info', duration = 3200) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function generatePedidoId() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  return `pedido-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function formatPedidoText(pedido) {
  const addressLabel = pedido.address || pedido.name || 'Ubicación seleccionada en el mapa';
  return `#${String(pedido.number).padStart(3, '0')} - ${addressLabel}`;
}

function getRoutePedidos() {
  return pedidos.filter((pedido) => pedido.status !== 'entregado' && pedido.status !== 'fallido');
}

function movePedido(pedidoId, direction) {
  const activePedidos = getRoutePedidos();
  const currentIndex = activePedidos.findIndex((pedido) => pedido.id === pedidoId);
  const targetIndex = currentIndex + direction;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= activePedidos.length) {
    return;
  }

  [activePedidos[currentIndex], activePedidos[targetIndex]] = [
    activePedidos[targetIndex],
    activePedidos[currentIndex],
  ];

  let activeIndex = 0;
  for (let index = 0; index < pedidos.length; index += 1) {
    if (pedidos[index].status !== 'entregado' && pedidos[index].status !== 'fallido') {
      pedidos[index] = activePedidos[activeIndex];
      activeIndex += 1;
    }
  }

  renderPedidoList();
  saveState();
  window.v3Refresh?.();
  recalculateIfRouteVisible();
  showToast('Orden de paradas actualizado', 'info');
}

function updateOrderFilterCounts() {
  const allCount = pedidos.length;
  const pendingCount = pedidos.filter(p => p.status === 'pendiente').length;
  const routeCount = pedidos.filter(p => p.status === 'en_ruta').length;
  const doneCount = pedidos.filter(p => p.status === 'entregado').length;

  const fAll = document.getElementById('filter-all-count');
  const fPending = document.getElementById('filter-pending-count');
  const fRoute = document.getElementById('filter-route-count');
  const fDone = document.getElementById('filter-done-count');
  const summaryCount = document.getElementById('orders-summary-count');
  const badgeNav = document.getElementById('badge-orders-count');
  const tabBadge = document.getElementById('tab-orders-badge');

  if (fAll) fAll.textContent = allCount;
  if (fPending) fPending.textContent = pendingCount;
  if (fRoute) fRoute.textContent = routeCount;
  if (fDone) fDone.textContent = doneCount;
  if (summaryCount) summaryCount.textContent = `${pendingCount} pendientes · ${allCount} total`;
  if (badgeNav) badgeNav.textContent = pendingCount;
  if (tabBadge) tabBadge.textContent = pendingCount;
}

function renderPedidoList() {
  if (!pedidoList) return;
  pedidoList.innerHTML = '';
  updateOrderFilterCounts();

  const filteredPedidos = pedidos.filter(pedido => {
    if (currentOrderFilter === 'all') return true;
    return pedido.status === currentOrderFilter;
  });

  if (filteredPedidos.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'card';
    empty.style.textAlign = 'center';
    empty.style.padding = '32px 16px';
    empty.innerHTML = `
      <div style="color: var(--text-muted); font-size: 1.1rem; margin-bottom: 8px;">
        ${pedidos.length === 0 ? '📦 No tienes pedidos registrados' : 'No hay pedidos con el filtro seleccionado'}
      </div>
      <p class="small text-secondary">
        ${pedidos.length === 0 ? 'Toca "+ Nuevo Pedido" o pide al Cerebro IA que registre uno.' : 'Cambia el filtro arriba para ver otros pedidos.'}
      </p>
    `;
    pedidoList.appendChild(empty);
    return;
  }

  filteredPedidos.forEach((pedido, displayIndex) => {
    const item = document.createElement('li');
    item.className = `pedido-card-item status-${pedido.status}`;
    item.dataset.pedidoId = pedido.id;

    // Estado badge text
    let statusLabel = 'Pendiente';
    let statusClass = 'badge-warning';
    if (pedido.status === 'en_ruta') {
      statusLabel = 'En ruta';
      statusClass = 'badge-primary';
    } else if (pedido.status === 'entregado') {
      statusLabel = 'Entregado';
      statusClass = 'badge-success';
    } else if (pedido.status === 'fallido') {
      statusLabel = 'No entregado';
      statusClass = 'badge-danger';
    }

    // Cuerpo principal de la tarjeta (Toca para expandir opciones o ver en mapa)
    const cardMain = document.createElement('div');
    cardMain.className = 'pedido-card-main';
    cardMain.innerHTML = `
      <div class="pedido-card-header">
        <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
          <div class="pedido-stop-badge">#${pedido.number}</div>
          <div class="pedido-card-info">
            <h4 class="pedido-customer-name">${pedido.name || 'Cliente sin nombre'}</h4>
            <div class="pedido-address-text">
              <span>📍 ${pedido.address || 'Ubicación seleccionada en el mapa'}</span>
            </div>
            ${pedido.reference ? `<div class="pedido-reference-text">Ref.: ${pedido.reference}</div>` : ''}
          </div>
        </div>
        <span class="badge ${statusClass}">${statusLabel}</span>
      </div>
    `;

    // Click en la tarjeta alterna la expansión de opciones
    cardMain.addEventListener('click', (e) => {
      item.classList.toggle('expanded');
    });

    // Acordeón de Acciones Expandible
    const cardActions = document.createElement('div');
    cardActions.className = 'pedido-card-actions';

    // Grilla de botones de acción
    const buttonsGrid = document.createElement('div');
    buttonsGrid.className = 'actions-buttons-grid';

    // 1. Ver en Mapa
    const viewMapBtn = document.createElement('button');
    viewMapBtn.type = 'button';
    viewMapBtn.className = 'btn btn-outline btn-sm';
    viewMapBtn.innerHTML = '<span>📍 Ver en Mapa</span>';
    viewMapBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.v3Navigate?.('map');
      setTimeout(() => {
        const marker = pedidoMarkers.get(pedido.id);
        if (marker && mapInstance) {
          mapInstance.flyTo([pedido.lat, pedido.lng], 16);
          marker.openPopup();
        }
      }, 150);
    });

    // 2. Editar Pedido
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-outline btn-sm';
    editBtn.innerHTML = '<span>✏️ Editar</span>';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      editingPedidoId = pedido.id;
      pedidoForm.reset();
      pedidoNumberInput.value = pedido.number;
      pedidoNameInput.value = pedido.name && !pedido.name.startsWith('Pedido #') ? pedido.name : '';
      pedidoAddressInput.value = pedido.address === 'Ubicación seleccionada en el mapa' ? '' : pedido.address || '';
      document.getElementById('pedido-reference').value = pedido.reference || '';
      updateSelectedLocation([pedido.lat, pedido.lng]);
      document.getElementById('form-title').textContent = `Editar Pedido #${pedido.number}`;
      pedidoFormWrapper.classList.remove('hidden');
      pedidoFormWrapper.scrollIntoView({ behavior: 'smooth' });
      clearAddressFeedback();
      pedidoNumberInput.focus();
    });

    // 3. Cambiar Ubicación en Mapa
    const changeLocBtn = document.createElement('button');
    changeLocBtn.type = 'button';
    changeLocBtn.className = 'btn btn-outline btn-sm';
    changeLocBtn.innerHTML = '<span>🎯 Cambiar Ubic.</span>';
    changeLocBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showToast(`Toca el nuevo punto en el mapa para el pedido #${pedido.number}`, 'info');
      window.v3Navigate?.('map');
      mapInstance.once('click', (ev) => {
        const newCoords = [ev.latlng.lat, ev.latlng.lng];
        if (confirm(`¿Mover el pedido #${pedido.number} a estas coordenadas?\n${formatCoordinates(newCoords)}`)) {
          pedido.lat = newCoords[0];
          pedido.lng = newCoords[1];
          updatePedidoMarker(pedido);
          saveState();
          renderPedidoList();
          recalculateIfRouteVisible();
          showToast(`Ubicación actualizada para pedido #${pedido.number}`, 'success');
        }
      });
    });

    // 4. Consultar Detalles
    const detailsBtn = document.createElement('button');
    detailsBtn.type = 'button';
    detailsBtn.className = 'btn btn-outline btn-sm';
    detailsBtn.innerHTML = '<span>📋 Detalles</span>';
    detailsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const statusMap = {
        pendiente: 'Pendiente de entrega',
        en_ruta: 'En ruta',
        entregado: `Entregado ${pedido.deliveredAt ? `(${new Date(pedido.deliveredAt).toLocaleTimeString('es-CO')})` : ''}`,
        fallido: `Fallido ${pedido.failedReason ? `— Motivo: ${pedido.failedReason}` : ''}`
      };
      const distFromStart = haversineDistance(startLocation, [pedido.lat, pedido.lng]).toFixed(2);
      const distFromGps = gpsPosition ? haversineDistance(gpsPosition, [pedido.lat, pedido.lng]).toFixed(2) : null;

      const detailsInfo = [
        `📦 PEDIDO #${pedido.number}`,
        `Cliente: ${pedido.name || 'Sin nombre'}`,
        `Dirección: ${pedido.address || 'Ubicación seleccionada en mapa'}`,
        pedido.reference ? `Referencia: ${pedido.reference}` : null,
        `Estado: ${statusMap[pedido.status] || pedido.status}`,
        `Coordenadas: ${formatCoordinates([pedido.lat, pedido.lng])}`,
        `Distancia desde base: ${distFromStart} km`,
        distFromGps ? `Distancia desde tu posición actual: ${distFromGps} km` : null
      ].filter(Boolean).join('\n');

      alert(detailsInfo);
    });

    // 5. Marcar como Entregado
    const markDoneBtn = document.createElement('button');
    markDoneBtn.type = 'button';
    markDoneBtn.className = 'btn btn-primary btn-sm';
    markDoneBtn.innerHTML = '<span>✅ Entregado</span>';
    markDoneBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm(`¿Confirmas que entregaste el pedido #${pedido.number}?`)) return;
      pedido.status = 'entregado';
      pedido.deliveredAt = new Date().toISOString();
      window.v3Audit ||= [];
      window.v3Audit.push({ at: new Date().toISOString(), action: 'Entrega completada', details: `Pedido #${pedido.number} (${pedido.name || 'Sin nombre'})` });
      updatePedidoMarker(pedido);
      saveState();
      renderPedidoList();
      window.v3Refresh?.();
      recalculateIfRouteVisible();
      showToast(`¡Pedido #${pedido.number} completado! 🎉`, 'success');
    });

    // 5. Registrar Entrega Fallida
    const markFailedBtn = document.createElement('button');
    markFailedBtn.type = 'button';
    markFailedBtn.className = 'btn btn-danger-outline btn-sm';
    markFailedBtn.innerHTML = '<span>⚠️ Fallido</span>';
    markFailedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const reason = prompt('Motivo de la entrega fallida (ej: Cliente no contesta, dirección incorrecta):', 'Cliente no se encontraba');
      if (reason === null) return;
      pedido.status = 'fallido';
      pedido.failedReason = reason.trim();
      window.v3Audit ||= [];
      window.v3Audit.push({ at: new Date().toISOString(), action: 'Entrega fallida', details: `Pedido #${pedido.number}: ${reason.trim()}` });
      updatePedidoMarker(pedido);
      saveState();
      renderPedidoList();
      window.v3Refresh?.();
      recalculateIfRouteVisible();
      showToast(`Pedido #${pedido.number} marcado como fallido`, 'warning');
    });

    // 6. Eliminar Pedido
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger-outline btn-sm';
    deleteBtn.innerHTML = '<span>🗑 Eliminar</span>';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm(`¿Eliminar definitivamente el pedido #${pedido.number}?`)) return;
      const index = pedidos.findIndex((itemPedido) => itemPedido.id === pedido.id);
      if (index >= 0) {
        window.v3Audit ||= [];
        window.v3Audit.push({ at: new Date().toISOString(), action: 'Eliminar pedido', details: `Pedido #${pedido.number}` });
        pedidos.splice(index, 1);
        const marker = pedidoMarkers.get(pedido.id);
        if (marker) {
          mapInstance.removeLayer(marker);
          pedidoMarkers.delete(pedido.id);
        }
        if (editingPedidoId === pedido.id) {
          resetPedidoForm();
        }
        renderPedidoList();
        saveState();
        window.v3Refresh?.();
        recalculateIfRouteVisible();
        showToast(`Pedido #${pedido.number} eliminado`, 'info');
      }
    });

    buttonsGrid.append(viewMapBtn, editBtn, changeLocBtn, detailsBtn, markDoneBtn, markFailedBtn, deleteBtn);

    // Controles para reordenar parada (Subir/Bajar)
    const reorderRow = document.createElement('div');
    reorderRow.className = 'actions-order-reorder';
    reorderRow.innerHTML = `
      <span class="small text-secondary">Secuencia de parada:</span>
      <div style="display: flex; gap: 6px;">
        <button type="button" class="btn btn-secondary btn-xs btn-up" title="Mover arriba">↑ Subir parada</button>
        <button type="button" class="btn btn-secondary btn-xs btn-down" title="Mover abajo">↓ Bajar parada</button>
      </div>
    `;
    reorderRow.querySelector('.btn-up').onclick = (e) => { e.stopPropagation(); movePedido(pedido.id, -1); };
    reorderRow.querySelector('.btn-down').onclick = (e) => { e.stopPropagation(); movePedido(pedido.id, 1); };

    cardActions.append(buttonsGrid, reorderRow);
    item.append(cardMain, cardActions);
    pedidoList.appendChild(item);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function formatCoordinates([lat, lng]) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function updateStartLocationDisplay() {
  startLocationDisplay.textContent = `${startLocation[0].toFixed(5)}, ${startLocation[1].toFixed(5)}`;
}

function haversineDistance([lat1, lng1], [lat2, lng2]) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function optimizePedidoOrder() {
  const activePedidos = getRoutePedidos();

  if (activePedidos.length < 2) {
    showAddressFeedback('Se necesitan al menos 2 pedidos activos para optimizar.', true);
    return;
  }

  const unvisited = [...activePedidos];
  const ordered = [];
  let currentLocation = [...startLocation];

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < unvisited.length; index += 1) {
      const candidate = unvisited[index];
      const distance = haversineDistance(currentLocation, [candidate.lat, candidate.lng]);

      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    }

    const [nearestPedido] = unvisited.splice(nearestIndex, 1);
    ordered.push(nearestPedido);
    currentLocation = [nearestPedido.lat, nearestPedido.lng];
  }

  let orderedIndex = 0;
  for (let index = 0; index < pedidos.length; index += 1) {
    if (pedidos[index].status !== 'entregado' && pedidos[index].status !== 'fallido') {
      pedidos[index] = ordered[orderedIndex];
      orderedIndex += 1;
    }
  }

  window.v3Audit ||= [];
  window.v3Audit.push({ at: new Date().toISOString(), action: 'Optimizar ruta', details: 'Heurística de proximidad aplicada' });
  renderPedidoList();
  saveState();
  window.v3Refresh?.();
  calculateRoute();
  showToast('Ruta optimizada por proximidad', 'success');
}

function renderRouteSummary(data, routeOrders = []) {
  const dashDist = document.getElementById('dash-distance-val');
  const dashTime = document.getElementById('dash-time-val');
  const statsDist = document.getElementById('stats-total-dist');

  if (!data) {
    if (routeSummary) routeSummary.innerHTML = '<p class="text-secondary">Sin ruta calculada. Agrega pedidos y presiona "Trazar ruta en el mapa".</p>';
    if (dashDist) dashDist.textContent = '0.0 km';
    if (dashTime) dashTime.textContent = '0 min';
    if (statsDist) statsDist.textContent = '0.0 km';
    return;
  }

  const distanceKm = (data.distance / 1000).toFixed(1);
  const durationMin = Math.round(data.duration / 60);
  const pendingCount = routeOrders.length;

  if (dashDist) dashDist.textContent = `${distanceKm} km`;
  if (dashTime) dashTime.textContent = `${durationMin} min`;
  if (statsDist) statsDist.textContent = `${distanceKm} km`;

  if (routeSummary) {
    routeSummary.innerHTML = `
      <div style="display: flex; gap: 16px; margin-bottom: 12px; flex-wrap: wrap;">
        <div><strong>Distancia:</strong> ${distanceKm} km</div>
        <div><strong>Tiempo estimado:</strong> ${durationMin} min</div>
        <div><strong>Paradas activas:</strong> ${pendingCount}</div>
      </div>
      <div style="font-size: 0.88rem; color: var(--text-secondary);">
        <strong>Secuencia óptima recomendada:</strong>
        <ol style="margin-left: 20px; margin-top: 6px;">
          ${routeOrders.map(p => `<li>#${p.number} — ${p.name || p.address || 'Sin nombre'}</li>`).join('')}
        </ol>
      </div>
    `;
  }
}

function clearRoute() {
  if (routeLine && mapInstance) {
    mapInstance.removeLayer(routeLine);
    routeLine = null;
  }
  currentRouteOrder = [];
  renderRouteSummary(null);
}

function saveState() {
  const state = {
    rules: learnedRules,
    knownAddresses,
    orders: pedidos,
    startLocation,
    returnToStart: returnToStartInput.checked,
    savedPlaces: window.v3SavedPlaces || [],
    destination: window.v3Destination || { mode: 'none' },
    audit: window.v3Audit || [],
  };

  try {
    localStorage.setItem('domicilios-cienaga-state', JSON.stringify(state));
  } catch (error) {
    console.error('No se pudo guardar el estado local.', error);
    showAddressFeedback('No se pudieron guardar los cambios en este navegador.', true);
  }
}

function loadSavedState() {
  try {
    const rawState = localStorage.getItem('domicilios-cienaga-state');
    if (!rawState) return;

    const state = JSON.parse(rawState);
    if (!state || !Array.isArray(state.orders)) {
      throw new Error('El formato del estado guardado no es válido.');
    }

    const restoredOrders = state.orders.map((pedido) => {
      if (
        typeof pedido.id !== 'string' ||
        !Number.isInteger(Number(pedido.number)) ||
        !Number.isFinite(Number(pedido.lat)) ||
        !Number.isFinite(Number(pedido.lng)) ||
        Number(pedido.lat) < -90 ||
        Number(pedido.lat) > 90 ||
        Number(pedido.lng) < -180 ||
        Number(pedido.lng) > 180
      ) {
        throw new Error('Se encontró un pedido guardado con datos inválidos.');
      }
      return {
        ...pedido,
        number: Number(pedido.number),
        lat: Number(pedido.lat),
        lng: Number(pedido.lng),
        status: ['pendiente', 'en_ruta', 'entregado', 'fallido'].includes(pedido.status)
          ? pedido.status
          : 'pendiente',
      };
    });
    pedidos.push(...restoredOrders);
    window.v3SavedPlaces = Array.isArray(state.savedPlaces) ? state.savedPlaces.slice(0, 100) : [];
    window.v3Destination = state.destination || { mode: state.returnToStart ? 'start' : 'none' };
    window.v3Audit = Array.isArray(state.audit) ? state.audit.slice(-500) : [];
    if (Array.isArray(state.rules)) learnedRules.push(...state.rules.filter(r => r && typeof r.text === 'string').slice(0, 200));
    if (Array.isArray(state.knownAddresses)) knownAddresses.push(...state.knownAddresses.filter(a => a && typeof a.address === 'string' && Number.isFinite(a.lat) && Number.isFinite(a.lng)).slice(0, 2000));

    if (
      Array.isArray(state.startLocation) &&
      state.startLocation.length === 2 &&
      state.startLocation.every((coordinate) => Number.isFinite(Number(coordinate)))
    ) {
      startLocation = state.startLocation.map(Number);
    }
    returnToStartInput.checked = Boolean(state.returnToStart);
  } catch (error) {
    console.error('No se pudieron restaurar los datos guardados.', error);
    try {
      localStorage.removeItem('domicilios-cienaga-state');
    } catch (storageError) {
      console.error('No se pudo limpiar el estado local inválido.', storageError);
    }
    showAddressFeedback('No se pudieron leer los datos guardados. Se inició una lista vacía.', true);
  }
}

function recalculateIfRouteVisible() {
  if (routeLine) {
    calculateRoute();
  } else {
    renderRouteSummary(null);
  }
}

function setStartLocation(location) {
  startLocation = [...location];
  updateStartLocationDisplay();

  if (!startMarker) {
    startMarker = L.marker(startLocation, {
      title: 'Restaurante / Base',
    }).addTo(mapInstance);
    startMarker.bindPopup('<strong>Restaurante / Punto de inicio</strong>');
  } else {
    startMarker.setLatLng(startLocation);
  }

  mapInstance.flyTo(startLocation, 14);
  saveState();
  recalculateIfRouteVisible();
  showToast('Punto de inicio actualizado', 'info');
}

async function geocodeStartAddress() {
  const query = startAddressInput.value.trim();
  if (!query) {
    showAddressFeedback('Escribe una dirección para buscar.', true);
    return;
  }

  const fullQuery = `${query}, Ciénaga, Magdalena, Colombia`;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(fullQuery)}`;

  searchStartButton.disabled = true;
  showAddressFeedback('Buscando dirección de inicio...', false);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error al conectar con el servicio de mapas.');
    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      showAddressFeedback('No se encontró la dirección en Ciénaga.', true);
      return;
    }

    const { lat, lon } = results[0];
    const newLocation = [Number(lat), Number(lon)];
    setStartLocation(newLocation);
    clearAddressFeedback();
    showToast('Punto de inicio encontrado', 'success');
  } catch (error) {
    showAddressFeedback(error.message, true);
  } finally {
    searchStartButton.disabled = false;
  }
}

function enableStartSelectionMode() {
  isSelectingStartPoint = true;
  isSelectingPedidoPoint = false;
  showToast('Toca el mapa para fijar el restaurante / inicio', 'info');
  window.v3Navigate?.('map');
}

function clearAddressFeedback() {
  if (addressFeedback) {
    addressFeedback.classList.add('hidden');
    addressFeedback.textContent = '';
  }
}

function showAddressFeedback(message, isError) {
  if (!addressFeedback) return;
  addressFeedback.textContent = message;
  addressFeedback.classList.remove('hidden');
  addressFeedback.style.color = isError ? 'var(--danger)' : 'var(--primary)';
}

function updateSelectedLocation(location) {
  selectedLocation = [...location];
  selectedCoordinates.textContent = formatCoordinates(selectedLocation);

  if (!selectedMarker) {
    selectedMarker = L.marker(selectedLocation, { draggable: true }).addTo(mapInstance);
    selectedMarker.on('dragend', () => {
      const position = selectedMarker.getLatLng();
      selectedLocation = [position.lat, position.lng];
      selectedCoordinates.textContent = formatCoordinates(selectedLocation);
    });
  } else {
    selectedMarker.setLatLng(selectedLocation);
  }
}

function showPedidoForm(location) {
  editingPedidoId = null;
  pedidoForm.reset();
  const nextNumber = Math.max(0, ...pedidos.map((p) => Number(p.number) || 0)) + 1;
  pedidoNumberInput.value = nextNumber;
  document.getElementById('form-title').textContent = 'Registrar Nuevo Pedido';
  updateSelectedLocation(location);
  clearAddressFeedback();
  pedidoFormWrapper.classList.remove('hidden');
  window.v3Navigate?.('orders');
  pedidoFormWrapper.scrollIntoView({ behavior: 'smooth' });
}

function resetPedidoForm() {
  editingPedidoId = null;
  pedidoForm.reset();
  selectedLocation = null;
  if (selectedMarker) {
    mapInstance.removeLayer(selectedMarker);
    selectedMarker = null;
  }
  selectedCoordinates.textContent = 'Selecciona un punto en el mapa';
  pedidoFormWrapper.classList.add('hidden');
  clearAddressFeedback();
}

function updatePedidoMarker(pedido) {
  const existingMarker = pedidoMarkers.get(pedido.id);
  if (existingMarker) {
    mapInstance.removeLayer(existingMarker);
    pedidoMarkers.delete(pedido.id);
  }

  const marker = L.marker([pedido.lat, pedido.lng], {
    title: formatPedidoText(pedido),
    opacity: pedido.status === 'entregado' ? 0.45 : 1.0,
  }).addTo(mapInstance);

  marker.bindPopup(`
    <div style="font-family: 'Inter', sans-serif; font-size: 13px;">
      <strong>#${pedido.number} · ${pedido.name || 'Cliente'}</strong><br/>
      ${pedido.address || 'Ubicación en mapa'}<br/>
      <span style="font-weight: 700; color: ${pedido.status === 'entregado' ? 'var(--success)' : 'var(--warning)'};">
        ${pedido.status.toUpperCase()}
      </span>
    </div>
  `);

  pedidoMarkers.set(pedido.id, marker);
}

async function calculateRoute() {
  const activePedidos = getRoutePedidos();
  if (activePedidos.length === 0) {
    clearRoute();
    showToast('No hay pedidos activos para trazar la ruta', 'info');
    return;
  }

  calculateRouteButton.disabled = true;
  showToast('Trazando ruta con OSRM...', 'info');

  const origin = gpsPosition || startLocation;
  const finalPoint = window.v3Destination?.point || ((window.v3Destination?.mode === 'start' || returnToStartInput.checked) ? startLocation : null);
  const routePoints = [origin, ...activePedidos.map(p => [p.lat, p.lng]), ...(finalPoint ? [finalPoint] : [])];

  const coordinatesString = routePoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson&steps=false`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('No se pudo calcular la ruta con el servicio OSRM.');
    const data = await response.json();
    if (data.code !== 'Ok' || !Array.isArray(data.routes) || data.routes.length === 0) {
      throw new Error('El servicio no encontró una ruta válida.');
    }

    const route = data.routes[0];
    if (routeLine) {
      mapInstance.removeLayer(routeLine);
    }

    routeLine = L.geoJSON(route.geometry, {
      style: {
        color: '#2563eb',
        weight: 5,
        opacity: 0.85,
      },
    }).addTo(mapInstance);

    mapInstance.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
    currentRouteOrder = [...activePedidos];
    renderRouteSummary(route, activePedidos);
    showToast('Ruta calculada y trazada con éxito', 'success');
  } catch (error) {
    showToast(error.message, 'danger');
    renderRouteSummary(null);
  } finally {
    calculateRouteButton.disabled = false;
  }
}

async function geocodeAddress() {
  const address = pedidoAddressInput.value.trim();
  if (!address) {
    showAddressFeedback('Escribe una dirección para buscar.', true);
    return;
  }

  const cached = knownAddresses.find((item) => item.address.toLowerCase() === address.toLowerCase());
  if (cached) {
    updateSelectedLocation([cached.lat, cached.lng]);
    mapInstance.flyTo([cached.lat, cached.lng], 16);
    showToast('Ubicación obtenida del caché local', 'info');
    return;
  }

  const fullQuery = `${address}, Ciénaga, Magdalena, Colombia`;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(fullQuery)}`;

  searchLocationButton.disabled = true;
  showToast('Buscando dirección...', 'info');

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error al conectar con el servicio de geocodificación.');
    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      showAddressFeedback('No se encontró la dirección en Ciénaga.', true);
      return;
    }

    const { lat, lon } = results[0];
    const newLocation = [Number(lat), Number(lon)];
    updateSelectedLocation(newLocation);
    mapInstance.flyTo(newLocation, 16);
    clearAddressFeedback();
    showToast('Dirección localizada', 'success');
  } catch (error) {
    showAddressFeedback(error.message, true);
  } finally {
    searchLocationButton.disabled = false;
  }
}

function handlePedidoSubmit(event) {
  event.preventDefault();

  if (!selectedLocation) {
    showAddressFeedback('Debes seleccionar un punto en el mapa o buscar la dirección.', true);
    return;
  }

  const numberValue = Number(pedidoNumberInput.value);
  if (!Number.isInteger(numberValue) || numberValue < 1) {
    showAddressFeedback('El número de pedido debe ser un entero mayor o igual a 1.', true);
    return;
  }

  const name = pedidoNameInput.value.trim();
  const address = pedidoAddressInput.value.trim();
  const reference = document.getElementById('pedido-reference').value.trim();

  if (address) {
    const existingIndex = knownAddresses.findIndex((item) => item.address.toLowerCase() === address.toLowerCase());
    if (existingIndex >= 0) {
      knownAddresses[existingIndex] = { address, lat: selectedLocation[0], lng: selectedLocation[1] };
    } else {
      knownAddresses.push({ address, lat: selectedLocation[0], lng: selectedLocation[1] });
      if (knownAddresses.length > 2000) knownAddresses.shift();
    }
  }

  if (editingPedidoId) {
    const pedido = pedidos.find((p) => p.id === editingPedidoId);
    if (pedido) {
      pedido.number = numberValue;
      pedido.name = name;
      pedido.address = address;
      pedido.reference = reference;
      pedido.lat = selectedLocation[0];
      pedido.lng = selectedLocation[1];
      updatePedidoMarker(pedido);
      window.v3Audit ||= [];
      window.v3Audit.push({ at: new Date().toISOString(), action: 'Editar pedido', details: `Pedido #${pedido.number}` });
      showToast(`Pedido #${pedido.number} actualizado`, 'success');
    }
  } else {
    const newPedido = {
      id: generatePedidoId(),
      number: numberValue,
      name,
      address,
      reference,
      lat: selectedLocation[0],
      lng: selectedLocation[1],
      status: 'pendiente',
    };
    pedidos.push(newPedido);
    updatePedidoMarker(newPedido);
    window.v3Audit ||= [];
    window.v3Audit.push({ at: new Date().toISOString(), action: 'Nuevo pedido', details: `Pedido #${newPedido.number} (${name || 'Sin nombre'})` });
    showToast(`Pedido #${newPedido.number} creado`, 'success');
  }

  saveState();
  renderPedidoList();
  window.v3Refresh?.();
  resetPedidoForm();
  recalculateIfRouteVisible();
}

function initializeMap() {
  mapInstance = L.map('map', { zoomControl: true }).setView(startLocation, 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap colaboradores',
  }).addTo(mapInstance);

  startMarker = L.marker(startLocation, { title: 'Restaurante / Base' }).addTo(mapInstance);
  startMarker.bindPopup('<strong>Restaurante / Punto de inicio</strong>');

  mapInstance.on('click', (event) => {
    const clickedLocation = [event.latlng.lat, event.latlng.lng];

    if (isSelectingStartPoint) {
      setStartLocation(clickedLocation);
      isSelectingStartPoint = false;
      return;
    }

    if (isSelectingPedidoPoint) {
      isSelectingPedidoPoint = false;
      showPedidoForm(clickedLocation);
      return;
    }

    showPedidoForm(clickedLocation);
  });

  pedidos.forEach(updatePedidoMarker);
  updateStartLocationDisplay();
}

// Asistente Local Heurístico
function parseAddressList(text) {
  const addressPattern = /\b(?:calle|cll?\.?|carrera|cra?\.?|cr\.?|kr\.?|avenida|av\.?|diagonal|dg\.?|transversal|tv\.?|manzana|mz\.?|kil[oó]metro|km)\s+\d+[a-z]?(?:\s*(?:#|n(?:[.º°]|o\.?)?)\s*\d+[a-z]?(?:\s*[-–]\s*\d+[a-z]?)?)?(?:\s*(?:bis|sur|este|oeste))?/giu;
  const matches = [...text.matchAll(addressPattern)];
  if (!matches.length) return [];

  const clean = (value) => value
    .replace(/[\r\n]+/g, ' ')
    .replace(/^[\s,;|:–—-]+|[\s,;|:–—-]+$/g, '')
    .trim();
  const prefix = clean(text.slice(0, matches[0].index));
  const commandPrefix = /^(?:agrega|añade|crea|crear|registra|registrar|arma|organiza)\b[\s\S]*$/i.test(prefix);
  const firstName = !commandPrefix && /[|;–—-]/.test(prefix)
    ? clean(prefix.split(/[|;–—-]/).pop())
    : '';

  return matches.map((match, index) => {
    const nextStart = matches[index + 1]?.index ?? text.length;
    return {
      address: match[0].trim(),
      name: clean(text.slice(match.index + match[0].length, nextStart)) || (index === 0 ? firstName : ''),
      reference: '',
      priority: 'normal',
    };
  });
}

window.v3ParseAddressList = parseAddressList;

function parseInstruction(text) {
  const value = text.trim();
  if (!value) return { type: 'error', message: 'Escribe o dicta una instrucción.' };

  const addressList = parseAddressList(value);
  if (addressList.length >= 2) {
    return {
      type: 'route_list',
      count: addressList.length,
      raw: value,
    };
  }

  // Consultas de estado
  if (/(cu[aá]ntos|pedidos pendientes|estado|c[oó]mo voy)/i.test(value)) {
    const pending = pedidos.filter(p => p.status === 'pendiente').length;
    const done = pedidos.filter(p => p.status === 'entregado').length;
    return {
      type: 'query',
      message: `Tienes ${pending} pedidos pendientes y ${done} completados de un total de ${pedidos.length}.`
    };
  }

  // Solicitud de optimización
  if (/(optimiza|mejor ruta|ordenar ruta|secuencia)/i.test(value)) {
    return { type: 'action_optimize', message: '¿Deseas que reorganice tus pedidos por proximidad?' };
  }

  // Reglas o recuerdos
  if (/^(aprende|recuerda|guarda(?: esto en la memoria| (?:esta |la )?regla)?|nueva regla|regla:)/i.test(value)) {
    return {
      type: 'rule',
      text: value.replace(/^(aprende|recuerda|guarda(?: esto en la memoria| (?:esta |la )?regla)?|nueva regla|regla:)\s*:?\s*/i, '').trim(),
    };
  }

  // Creación de pedido
  if (/(agrega|añade|registr[ae]|nuevo pedido|nuevo domicilio|lleva|entrega)/i.test(value)) {
    const match = value.match(/(?:para|de|a nombre de)\s+([\p{L} ]+?)(?=\s+(?:en|ubicad[oa]|direcci[oó]n|calle|carrera|cra|cl|diagonal|transversal)\b|[,.;]|$)/iu);
    const addr = value.match(/(?:calle|carrera|cra\.?|cl\.?|diagonal|transversal|avenida|av\.?|manzana|mz\.?|barrio)\s+.+/iu);
    return {
      type: 'order',
      name: match?.[1]?.trim() || '',
      address: addr?.[0]?.trim() || '',
      raw: value,
    };
  }

  return {
    type: 'unknown',
    message: 'No identifiqué la instrucción. Puedes pegar varias direcciones juntas para preparar una ruta, decir "Agrega pedido para Carlos en Calle 8", "Recuerda que..." u "Optimiza la ruta".',
  };
}

function previewInstruction() {
  const input = document.getElementById('assistant-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  // Registrar burbuja del usuario en el chat
  window.v3AppendChatMessage?.(text, 'user');
  input.value = '';

  const data = parseInstruction(text);
  const target = document.getElementById('assistant-preview');
  target.replaceChildren();

  if (data.type === 'route_list') {
    window.v3AppendChatMessage?.(`Detecté ${data.count} direcciones. Puedes revisar los lugares y calcular una ruta antes de importarlos.`, 'assistant', [
      {
        label: `Preparar ruta de ${data.count} paradas`,
        action: () => {
          const bulkInput = document.getElementById('bulk-input');
          const bulkParse = document.getElementById('bulk-parse');
          if (!bulkInput || !bulkParse) {
            showToast('No se pudo abrir el organizador de domicilios.', 'error');
            return;
          }
          bulkInput.value = data.raw;
          window.v3Navigate?.('orders');
          bulkParse.click();
          document.getElementById('bulk-orders')?.scrollIntoView({ behavior: 'smooth' });
        },
      },
    ]);
    return;
  }

  if (data.type === 'query') {
    window.v3AppendChatMessage?.(data.message, 'assistant');
    return;
  }

  if (data.type === 'action_optimize') {
    window.v3AppendChatMessage?.(data.message, 'assistant', [
      {
        label: 'Optimizar ahora',
        action: () => optimizePedidoOrder(),
      }
    ]);
    return;
  }

  if (data.type === 'rule') {
    if (!data.text) {
      window.v3AppendChatMessage?.('La regla está vacía.', 'assistant');
      return;
    }
    const autoSave = document.getElementById('automatic-memory')?.checked;
    if (autoSave) {
      learnedRules.push({ id: generatePedidoId(), text: data.text, createdAt: new Date().toISOString() });
      saveState();
      renderRules();
      window.v3Refresh?.();
      window.v3AppendChatMessage?.(`He guardado este recuerdo en mi memoria: "${data.text}".`, 'assistant');
      showToast('Recuerdo guardado en memoria', 'success');
    } else {
      window.v3AppendChatMessage?.(`¿Deseas que recuerde esto?:\n"${data.text}"`, 'assistant', [
        {
          label: 'Confirmar y guardar regla',
          action: () => {
            learnedRules.push({ id: generatePedidoId(), text: data.text, createdAt: new Date().toISOString() });
            saveState();
            renderRules();
            window.v3Refresh?.();
            window.v3AppendChatMessage?.('Regla guardada correctamente.', 'assistant');
            showToast('Regla guardada', 'success');
          }
        }
      ]);
    }
    return;
  }

  if (data.type === 'order') {
    const summary = `Interpreté el pedido para: ${data.name || 'Cliente sin nombre'} en ${data.address || 'dirección no identificada'}.`;
    window.v3AppendChatMessage?.(summary, 'assistant', [
      {
        label: 'Abrir en formulario',
        action: () => {
          editingPedidoId = null;
          pedidoForm.reset();
          selectedLocation = null;
          selectedCoordinates.textContent = 'Busca la dirección o selecciona un punto en el mapa';
          pedidoNumberInput.value = Math.max(0, ...pedidos.map((p) => Number(p.number) || 0)) + 1;
          pedidoNameInput.value = data.name;
          pedidoAddressInput.value = data.address;
          document.getElementById('form-title').textContent = 'Registrar Nuevo Pedido';
          pedidoFormWrapper.classList.remove('hidden');
          window.v3Navigate?.('orders');
          pedidoFormWrapper.scrollIntoView({ behavior: 'smooth' });
          if (data.address) geocodeAddress();
        }
      }
    ]);
    return;
  }

  window.v3AppendChatMessage?.(data.message, 'assistant');
}

function renderRules() {
  const list = document.getElementById('rules-list');
  if (list) {
    list.replaceChildren();
    if (!learnedRules.length) {
      const li = document.createElement('li');
      li.textContent = 'Sin reglas guardadas.';
      list.append(li);
    }
    for (const rule of learnedRules) {
      const li = document.createElement('li');
      li.textContent = rule.text + ' ';
      list.append(li);
    }
  }
}

function voice(message) {
  const voiceCheckbox = document.getElementById('voice-guidance');
  if (voiceCheckbox && voiceCheckbox.checked && 'speechSynthesis' in window) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(message);
    u.lang = 'es-CO';
    speechSynthesis.speak(u);
  }
}

function initVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const feedback = document.getElementById('assistant-feedback');
  const record = document.getElementById('assistant-record');
  const hold = document.getElementById('assistant-hold');

  if (!SR) {
    if (feedback) feedback.textContent = 'Reconocimiento de voz no disponible en este navegador.';
    return;
  }

  let recording = false;

  function start() {
    if (recording) return;
    speechRecognition = new SR();
    speechRecognition.lang = 'es-CO';
    speechRecognition.interimResults = false;

    speechRecognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      const input = document.getElementById('assistant-input');
      input.value += (input.value ? ' ' : '') + text;
      if (feedback) feedback.textContent = 'Texto reconocido.';
    };

    speechRecognition.onerror = (e) => {
      if (feedback) feedback.textContent = 'Error: ' + e.error;
    };

    speechRecognition.onend = () => {
      recording = false;
      if (record) record.classList.remove('recording');
    };

    try {
      speechRecognition.start();
      recording = true;
      if (record) record.classList.add('recording');
      if (feedback) feedback.textContent = 'Escuchando...';
    } catch (e) {
      if (feedback) feedback.textContent = 'No se pudo activar el micrófono.';
    }
  }

  function stop() {
    if (recording && speechRecognition) {
      speechRecognition.stop();
      recording = false;
      if (record) record.classList.remove('recording');
    }
  }

  if (record) record.addEventListener('click', () => (recording ? stop() : start()));
  if (hold) {
    hold.addEventListener('pointerdown', (e) => { e.preventDefault(); start(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => hold.addEventListener(ev, stop));
    hold.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); start(); } });
    hold.addEventListener('keyup', stop);
  }
}

function exportBackup() {
  const content = localStorage.getItem('domicilios-cienaga-state') || '{}';
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'domicilio-v3-respaldo.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Copia de seguridad descargada', 'success');
}

async function importBackup(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const state = JSON.parse(await file.text());
    if (!Array.isArray(state.orders) || state.orders.length > 10000 || !Array.isArray(state.rules || []) || !Array.isArray(state.knownAddresses || [])) {
      throw new Error('Formato de copia inválido');
    }
    if (!confirm('¿Reemplazar todos los pedidos y reglas locales por esta copia?')) return;
    localStorage.setItem('domicilios-cienaga-state', JSON.stringify(state));
    showToast('Copia importada con éxito', 'success');
    setTimeout(() => location.reload(), 600);
  } catch (err) {
    alert('No se pudo importar: ' + err.message);
  }
}

function gpsUpdate(position) {
  gpsPosition = [position.coords.latitude, position.coords.longitude];
  const gpsStatus = document.getElementById('gps-status');
  if (gpsStatus) {
    gpsStatus.innerHTML = `<span>GPS: ${formatCoordinates(gpsPosition)} · precisión ±${Math.round(position.coords.accuracy)} m</span>`;
  }

  if (getRoutePedidos().length && position.coords.accuracy <= 60) {
    const next = getRoutePedidos()[0];
    const meters = haversineDistance(gpsPosition, [next.lat, next.lng]) * 1000;
    if (meters < Math.max(30, position.coords.accuracy)) {
      const msg = `Estás cerca del pedido #${next.number} (${next.name || 'Cliente'}).`;
      if (!gpsUpdate.announced || gpsUpdate.announced !== next.id) {
        voice(msg);
        showToast(msg, 'info', 5000);
        gpsUpdate.announced = next.id;
      }
    }
  }
}

function startGps() {
  if (!navigator.geolocation) {
    showToast('GPS no disponible en este dispositivo.', 'danger');
    return;
  }

  const gpsBtn = document.getElementById('gps-button');
  const gpsStatus = document.getElementById('gps-status');

  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
    if (gpsBtn) gpsBtn.innerHTML = '<span>📍 Activar GPS</span>';
    if (gpsStatus) gpsStatus.innerHTML = '<span>GPS detenido.</span>';
    showToast('GPS desactivado', 'info');
    return;
  }

  gpsWatchId = navigator.geolocation.watchPosition(
    gpsUpdate,
    (err) => {
      if (gpsStatus) gpsStatus.innerHTML = `<span>GPS error: ${err.message}</span>`;
      showToast('Error GPS: ' + err.message, 'warning');
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );

  if (gpsBtn) gpsBtn.innerHTML = '<span>⏹ Detener GPS</span>';
  showToast('GPS activado en alta precisión', 'success');
}

async function proposeRouteOrder() {
  const active = getRoutePedidos();
  const target = document.getElementById('suggestion-preview');
  target.replaceChildren();

  if (active.length < 2) {
    target.innerHTML = '<p class="text-secondary">Se necesitan al menos dos pedidos pendientes para evaluar tiempos por carretera.</p>';
    return;
  }

  const origin = gpsPosition || startLocation;
  const finalPoint = window.v3Destination?.point || ((window.v3Destination?.mode === 'start' || returnToStartInput.checked) ? startLocation : null);
  const coords = [origin, ...active.map(p => [p.lat, p.lng]), ...(finalPoint ? [finalPoint] : [])];
  const url = 'https://router.project-osrm.org/table/v1/driving/' + coords.map(c => `${c[1]},${c[0]}`).join(';') + '?annotations=duration';

  target.innerHTML = '<p class="text-secondary">Consultando tiempos reales de carretera con OSRM...</p>';

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || data.code !== 'Ok' || !data.durations) throw new Error('Servicio de rutas no disponible');

    const matrix = data.durations;
    const remaining = active.map((p, i) => ({ p, index: i + 1 }));
    const proposal = [];
    let at = 0;
    const last = finalPoint ? coords.length - 1 : null;

    while (remaining.length) {
      let best = 0;
      let cost = Infinity;
      remaining.forEach((item, i) => {
        const d = matrix[at]?.[item.index];
        const end = last !== null && remaining.length === 1 ? matrix[item.index]?.[last] || 0 : 0;
        const total = d + end;
        if (d !== null && Number.isFinite(d) && total < cost) {
          cost = total;
          best = i;
        }
      });
      const next = remaining.splice(best, 1)[0];
      proposal.push(next.p);
      at = next.index;
    }

    suggestionOrder = proposal;
    const original = active.map(p => p.id).join('|');
    const proposed = proposal.map(p => p.id).join('|');

    if (original === proposed) {
      target.innerHTML = '<p class="text-success">El orden actual ya es el más óptimo según los tiempos por carretera.</p>';
      return;
    }

    const summary = document.createElement('div');
    summary.style.marginTop = '8px';
    summary.innerHTML = `
      <p style="font-weight: 600; margin-bottom: 6px;">Orden sugerido por carretera:</p>
      <div style="background: var(--bg-subtle); padding: 8px 12px; border-radius: var(--radius-sm); margin-bottom: 8px;">
        ${proposal.map(p => `#${p.number}`).join(' → ')}
      </div>
    `;

    const acceptBtn = document.createElement('button');
    acceptBtn.type = 'button';
    acceptBtn.className = 'btn btn-primary btn-sm';
    acceptBtn.textContent = 'Aplicar este orden de paradas';
    acceptBtn.onclick = () => {
      if (!confirm('¿Aplicar este orden a tus paradas?')) return;
      let idx = 0;
      for (let i = 0; i < pedidos.length; i++) {
        if (pedidos[i].status !== 'entregado' && pedidos[i].status !== 'fallido') {
          pedidos[i] = proposal[idx++];
        }
      }
      saveState();
      renderPedidoList();
      window.v3Refresh?.();
      recalculateIfRouteVisible();
      target.innerHTML = '<p class="text-success">Orden aplicado con tu confirmación.</p>';
      showToast('Nuevo orden de paradas aplicado', 'success');
    };

    target.replaceChildren(summary, acceptBtn);
  } catch (e) {
    target.innerHTML = '<p class="text-danger">No se pudo consultar el servicio de carreteras. Tu ruta no se modificó.</p>';
  }
}

// Inicialización de Eventos
searchStartButton?.addEventListener('click', geocodeStartAddress);
setStartOnMapButton?.addEventListener('click', enableStartSelectionMode);
searchLocationButton?.addEventListener('click', geocodeAddress);
optimizeRouteButton?.addEventListener('click', optimizePedidoOrder);
calculateRouteButton?.addEventListener('click', calculateRoute);
returnToStartInput?.addEventListener('change', () => {
  saveState();
  recalculateIfRouteVisible();
});
pedidoForm?.addEventListener('submit', handlePedidoSubmit);

// Filtros de pedidos por estado
document.querySelectorAll('#order-filter-chips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#order-filter-chips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentOrderFilter = chip.dataset.filter;
    renderPedidoList();
  });
});

document.getElementById('assistant-analyze')?.addEventListener('click', previewInstruction);
document.getElementById('assistant-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    previewInstruction();
  }
});

document.getElementById('new-map-order')?.addEventListener('click', () => {
  isSelectingPedidoPoint = true;
  showToast('Toca el mapa para fijar la ubicación del pedido', 'info');
  window.v3Navigate?.('map');
});

document.getElementById('select-pedido-map')?.addEventListener('click', () => {
  isSelectingPedidoPoint = true;
  showToast('Toca el mapa para elegir el punto', 'info');
  window.v3Navigate?.('map');
});

document.getElementById('cancel-pedido')?.addEventListener('click', resetPedidoForm);
document.getElementById('cancel-pedido-icon')?.addEventListener('click', resetPedidoForm);
document.getElementById('open-new-order-btn')?.addEventListener('click', () => {
  showPedidoForm(startLocation);
});
document.getElementById('global-fab-order')?.addEventListener('click', () => {
  showPedidoForm(startLocation);
});

document.getElementById('gps-button')?.addEventListener('click', startGps);
document.getElementById('suggest-route')?.addEventListener('click', proposeRouteOrder);
document.getElementById('export-data')?.addEventListener('click', exportBackup);
document.getElementById('import-data')?.addEventListener('change', importBackup);
document.getElementById('settings-export-data')?.addEventListener('click', exportBackup);
document.getElementById('settings-import-data')?.addEventListener('change', importBackup);

// Carga inicial
loadSavedState();
initializeMap();
renderRouteSummary(null);
renderPedidoList();
renderRules();
initVoice();
