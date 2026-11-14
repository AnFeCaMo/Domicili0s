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
// Interfaz de lectura para el monitor: no expone operaciones de escritura.
window.domicilioMonitorData=()=>({orders:pedidos,rules:learnedRules,knownAddresses});
let gpsPosition = null;
let gpsWatchId = null;
let isSelectingPedidoPoint = false;
let suggestionOrder = null;
let suggestionReason = '';
let speechRecognition = null;
const pedidoMarkers = new Map();
let selectedLocation = null;
let selectedLocationConfidence = 'pendiente';
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
  return pedidos.filter((pedido) => !['entregado', 'fallido'].includes(pedido.status));
}

function movePedido(pedidoId, direction) {
  const activePedidos = getRoutePedidos();
  const currentIndex = activePedidos.findIndex((pedido) => pedido.id === pedidoId);
  const targetIndex = currentIndex + direction;
  const navTargetId=window.domicilioNav?.currentTargetId?.();
  if (navTargetId && (activePedidos[currentIndex]?.id===navTargetId || activePedidos[targetIndex]?.id===navTargetId)) {
    showToast('La próxima entrega está protegida mientras navegas.', 'info');
    return;
  }

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
    window.domicilioRefreshRouteList?.();
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
            <h4 class="pedido-customer-name">${String(pedido.name || 'Cliente sin nombre').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</h4>
            <div class="pedido-address-text">
              <span>📍 ${String(pedido.address || 'Ubicación pendiente de confirmar').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span>
            </div>
            ${pedido.reference ? `<div class="pedido-reference-text">Ref.: ${String(pedido.reference).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</div>` : ''}
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
      if(!Number.isFinite(pedido.lat)||!Number.isFinite(pedido.lng)){showToast('La dirección no está localizada. Puedes guardarla con GPS al llegar.','warning');return;}
      window.v3Navigate?.('map');
      setTimeout(() => {
        const marker = pedidoMarkers.get(pedido.id);
        if (marker && mapInstance) {
          mapInstance.flyTo([pedido.lat, pedido.lng], 16);
          marker.openPopup();
        }
      }, 150);
    });

    if(pedido.locationStatus==='estimada'){const hint=document.createElement('p');hint.className='small';hint.textContent='⚠ Punto estimado de la calle; confirma la casa antes de navegar.';buttonsGrid.appendChild(hint);}
    const navigateBtn = document.createElement('button');
    navigateBtn.type = 'button';
    navigateBtn.className = 'btn btn-primary btn-sm';
    navigateBtn.textContent = '🧭 Ir al pedido';
    navigateBtn.addEventListener('click', (e) => { e.stopPropagation(); window.domicilioNav?.start(pedido); });
    buttonsGrid.appendChild(navigateBtn);
    const captureGps=document.createElement('button');
    captureGps.type='button';captureGps.className='btn btn-outline btn-sm';
    captureGps.textContent='📍 Estoy en esta dirección';
    captureGps.title='Al llegar y estando detenido: guardar la ubicación real de este domicilio';
    captureGps.onclick=e=>{e.stopPropagation();window.domicilioV5?.captureAtOrder(pedido);};
    buttonsGrid.appendChild(captureGps);

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
      if(Number.isFinite(pedido.lat)&&Number.isFinite(pedido.lng))updateSelectedLocation([pedido.lat, pedido.lng],(pedido.locationSource==='gps-confirmado'||pedido.locationSource==='mapa-confirmado')?'confirmada':'estimada');
      else {selectedLocation=null;selectedCoordinates.textContent='Ubicación pendiente: usa el mapa o busca dirección';}
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
          pedido.needsLocationReview = false;pedido.locationStatus='confirmada';pedido.locationSource='mapa-confirmado';
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
      const located=Number.isFinite(pedido.lat)&&Number.isFinite(pedido.lng);
      const distFromGps = located && gpsPosition ? haversineDistance(gpsPosition, [pedido.lat, pedido.lng]).toFixed(2) : null;

      const detailsInfo = [
        `📦 PEDIDO #${pedido.number}`,
        `Cliente: ${pedido.name || 'Sin nombre'}`,
        `Dirección: ${pedido.address || 'Ubicación seleccionada en mapa'}`,
        pedido.reference ? `Referencia: ${pedido.reference}` : null,
        `Estado: ${statusMap[pedido.status] || pedido.status}`,
        located ? `Coordenadas: ${formatCoordinates([pedido.lat, pedido.lng])}` : 'Ubicación no localizada',
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
      window.domicilioV53?.onDelivered?.(pedido);
      saveState();
      renderPedidoList();
      window.v3Refresh?.();
      recalculateIfRouteVisible();
      showToast(`¡Pedido #${pedido.number} completado! 🎉`, 'success');
      if(window.domicilioNav?.currentTargetId?.()===pedido.id)window.domicilioNav.stop();
      window.domicilioV53?.advanceAfterDelivery?.();
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
      pedido.failedAt = new Date().toISOString();
      pedido.status = 'fallido';
      pedido.failedReason = reason.trim();
      window.v3Audit ||= [];
      window.v3Audit.push({ at: new Date().toISOString(), action: 'Entrega fallida', details: `Pedido #${pedido.number}: ${reason.trim()}` });
      updatePedidoMarker(pedido);
      saveState();
      renderPedidoList();
      window.v3Refresh?.();
      recalculateIfRouteVisible();
      if(window.domicilioNav?.currentTargetId?.()===pedido.id)window.domicilioNav.stop();
      window.domicilioV53?.advanceAfterDelivery?.();
      showToast(`Pedido #${pedido.number} marcado como fallido`, 'warning');
    });

    // 6. Eliminar Pedido
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger-outline btn-sm';
    deleteBtn.innerHTML = '<span>🗑 Anular</span>';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm(`¿Anular el pedido #${pedido.number}? Permanecerá registrado para el historial de la jornada.`)) return;
      pedido.status='fallido'; pedido.failedReason='Pedido anulado'; pedido.failedAt=new Date().toISOString();
      window.v3Audit ||= [];
      window.v3Audit.push({at:new Date().toISOString(),action:'Anular pedido',details:`Pedido #${pedido.number}`});
      saveState(); renderPedidoList(); window.v3Refresh?.(); recalculateIfRouteVisible();
      if(window.domicilioNav?.currentTargetId?.()===pedido.id)window.domicilioNav.stop();
      window.domicilioV53?.advanceAfterDelivery?.();
      showToast(`Pedido #${pedido.number} anulado y conservado para el historial`, 'info');
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
  window.domicilioRefreshRouteList?.();
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

// Compatibilidad con botones históricos: toda optimización ahora propone y pide aprobación.
function optimizePedidoOrder() {
  return proposeRouteOrder();
}

function renderRouteSummary(data, routeOrders = []) {
  const dashDist = document.getElementById('dash-distance-val');
  const dashTime = document.getElementById('dash-time-val');
  const statsDist = document.getElementById('stats-total-dist');

  if (!data) {
    if (routeSummary) routeSummary.innerHTML = '<p class="text-secondary">Sin ruta calculada. Agrega pedidos y pulsa «Optimizar toda mi ruta».</p>';
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
        <strong>Secuencia recomendada (según datos disponibles):</strong>
        <ol style="margin-left: 20px; margin-top: 6px;">
          ${routeOrders.map(p => `<li>#${escapePedidoHtml(p.number)} — ${escapePedidoHtml(p.name || p.address || 'Sin nombre')}</li>`).join('')}
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
    returnToStart: false,
    shifts: window.domicilioV53?.readHistory?.() || [],
    savedPlaces: window.v3SavedPlaces || [],
    destination: window.v3Destination || { mode: 'none' },
    audit: window.v3Audit || [],
  };

  try {
    localStorage.setItem('domicilios-cienaga-state', JSON.stringify(state));
    // V5.3.3: actualizar alertas inmediatamente después de cualquier cambio de pedidos o reglas.
    window.domicilioMonitor?.reviewAll?.();
    window.dispatchEvent(new Event('domicilio:v56-update'));
    if(mapInstance) getRoutePedidos().forEach(p=>updatePedidoMarker(p));
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
        (pedido.lat !== null && pedido.lat !== undefined && (!Number.isFinite(Number(pedido.lat)) || Math.abs(Number(pedido.lat)) > 90)) ||
        (pedido.lng !== null && pedido.lng !== undefined && (!Number.isFinite(Number(pedido.lng)) || Math.abs(Number(pedido.lng)) > 180))
      ) {
        throw new Error('Se encontró un pedido guardado con datos inválidos.');
      }
      return {
        ...pedido,
        number: Number(pedido.number),
        lat: pedido.lat == null ? null : Number(pedido.lat),
        lng: pedido.lng == null ? null : Number(pedido.lng),
        status: ['pendiente', 'en_ruta', 'entregado', 'fallido'].includes(pedido.status)
          ? pedido.status
          : 'pendiente',
      };
    });
    pedidos.push(...restoredOrders);
    window.v3SavedPlaces = Array.isArray(state.savedPlaces) ? state.savedPlaces.slice(0, 100) : [];
    window.v3Destination = { mode: 'none' };
    if(Array.isArray(state.shifts)) window.domicilioV53?.restoreHistory?.(state.shifts);
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
    returnToStartInput.checked = false;
  } catch (error) {
    console.error('No se pudieron restaurar los datos guardados.', error);
    try {
      // Conservamos el respaldo local incluso si algún pedido antiguo resulta inválido.
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
  const query = normalizeAddress(startAddressInput.value.trim());
  startAddressInput.value = query;
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

function updateSelectedLocation(location, confidence='confirmada') {
  selectedLocation = [...location];
  selectedLocationConfidence = confidence;
  selectedCoordinates.textContent = formatCoordinates(selectedLocation);

  if (!selectedMarker) {
    selectedMarker = L.marker(selectedLocation, { draggable: true }).addTo(mapInstance);
    selectedMarker.on('dragend', () => {
      const position = selectedMarker.getLatLng();
      selectedLocation = [position.lat, position.lng];
      selectedLocationConfidence='confirmada';
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
  if(Array.isArray(location) && location.every(Number.isFinite)) updateSelectedLocation(location);
  else {selectedLocation=null;selectedCoordinates.textContent='Dirección sin GPS: puedes guardar el pedido y localizarlo después.';}
  clearAddressFeedback();
  pedidoFormWrapper.classList.remove('hidden');
  window.v3Navigate?.('orders');
  pedidoFormWrapper.scrollIntoView({ behavior: 'smooth' });
}

function resetPedidoForm() {
  editingPedidoId = null;
  pedidoForm.reset();
  selectedLocation = null;
  selectedLocationConfidence='pendiente';
  if (selectedMarker) {
    mapInstance.removeLayer(selectedMarker);
    selectedMarker = null;
  }
  selectedCoordinates.textContent = 'Selecciona un punto en el mapa';
  pedidoFormWrapper.classList.add('hidden');
  clearAddressFeedback();
}

function escapePedidoHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function updatePedidoMarker(pedido) {
  const existingMarker = pedidoMarkers.get(pedido.id);
  if (existingMarker) {
    mapInstance.removeLayer(existingMarker);
    pedidoMarkers.delete(pedido.id);
  }

  if (!Number.isFinite(pedido.lat) || !Number.isFinite(pedido.lng) || pedido.needsLocationReview) return;
  const isCurrent=window.domicilioNav?.currentTargetId?.()===pedido.id;
  const numberVisible=window.domicilioV55?.relativeNumber(pedido,pedidos)??pedido.number;
  const estimated=pedido.locationStatus==='estimada' || pedido.locationAccuracy==='interseccion';
  const done=['entregado','fallido','anulado'].includes(pedido.status);
  const tone=isCurrent?'actual':estimated?'estimado':done?'terminado':'pendiente';
  const color={actual:'#165cf2',estimado:'#f59e0b',terminado:'#6b7280',pendiente:'#16a34a'}[tone];
  const icon=L.divIcon({
    className:'domicilio-order-pin-wrap',
    html:`<span class="domicilio-order-pin domicilio-order-pin--${tone}" style="--pin-color:${color}" aria-hidden="true">${escapePedidoHtml(numberVisible)}</span>`,
    iconSize:[40,46],iconAnchor:[20,42],popupAnchor:[0,-37]
  });
  const marker = L.marker([pedido.lat, pedido.lng], {
    title: formatPedidoText(pedido),icon,opacity:1,zIndexOffset:isCurrent?1200:estimated?450:250,
  }).addTo(mapInstance);

  marker.bindPopup(`
    <div style="font-family: 'Inter', sans-serif; font-size: 13px;">
      <strong>#${escapePedidoHtml(pedido.number)} · ${escapePedidoHtml(pedido.name || 'Cliente')}</strong><br/>
      ${escapePedidoHtml(pedido.address || 'Ubicación en mapa')}<br/>
      <span style="font-weight: 700; color: ${color};">
        ${escapePedidoHtml(pedido.status.toUpperCase())}
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
  showToast('Dibujando tu recorrido por calles...', 'info');

  const origin = window.domicilioV5?.routeOrigin?.();
  if (!origin) { showToast('Activa tu GPS para trazar desde tu ubicación actual.', 'warning'); calculateRouteButton.disabled=false; return; }
  const finalPoint = null; // V5.3: no añadir regresos ni bases automáticamente.
  const known = activePedidos.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && !p.needsLocationReview);
  if (!known.length) { clearRoute(); calculateRouteButton.disabled=false; routeSummary.textContent = 'Todos los pedidos siguen en tu lista. Falta ubicar alguno para dibujar una ruta GPS real.'; return; }
  const routePoints = [origin, ...known.map(p => [p.lat, p.lng]), ...(finalPoint ? [finalPoint] : [])];

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
    window.domicilioNav?.showOverviewArrows(route);
    currentRouteOrder = [...known];
    renderRouteSummary(route, known);
    const missing=activePedidos.length-known.length;
    if(missing && routeSummary) routeSummary.insertAdjacentText('beforeend', ` · ${missing} pedido(s) sin GPS permanecen en la lista (orden estimado).`);
    showToast('Ruta calculada y trazada con éxito', 'success');
  } catch (error) {
    showToast(error.message, 'danger');
    renderRouteSummary(null);
  } finally {
    calculateRouteButton.disabled = false;
  }
}

async function geocodeAddress() {
  const address = window.domicilioNormalizeAddress(pedidoAddressInput.value.trim());
  pedidoAddressInput.value=address;
  if(!address){showAddressFeedback('Escribe una dirección para buscar.',true);return;}
  // No reutilizar un marcador anterior si la nueva dirección no puede verificarse.
  selectedLocation=null;selectedLocationConfidence='pendiente';
  if(selectedMarker){mapInstance.removeLayer(selectedMarker);selectedMarker=null;}
  selectedCoordinates.textContent='Ubicación pendiente de verificar';
  searchLocationButton.disabled=true;
  try {
    const result=await window.domicilioLocationLookup.lookup(address);
    if(result.status!=='found'){
      showAddressFeedback(result.reason||'No se pudo verificar el punto de esta dirección. Selecciónalo en el mapa.',true);
      return;
    }
    updateSelectedLocation([Number(result.lat),Number(result.lng)],result.needsConfirmation?'estimada':'confirmada');
    mapInstance.flyTo([Number(result.lat),Number(result.lng)],16);
    if(result.needsConfirmation)showAddressFeedback('Punto orientativo, NO es la casa confirmada. Puedes ajustar el marcador manualmente.',true);
    else clearAddressFeedback();
  }catch(err){showAddressFeedback(err.message||'Error consultando ubicación',true);}
  finally{searchLocationButton.disabled=false;}
}

function handlePedidoSubmit(event) {
  event.preventDefault();

  // V5.3: nombre, dirección y referencia se pueden editar sin GPS.
  // Si cambió el texto, no reutilizar coordenadas de otra vivienda.
  const hasSelectedPoint = Array.isArray(selectedLocation) && selectedLocation.every(Number.isFinite);

  const numberValue = Number(pedidoNumberInput.value);
  if (!Number.isInteger(numberValue) || numberValue < 1) {
    showAddressFeedback('El número de pedido debe ser un entero mayor o igual a 1.', true);
    return;
  }

  const name = pedidoNameInput.value.trim();
  const address = normalizeAddress(pedidoAddressInput.value.trim());
  pedidoAddressInput.value = address;
  const reference = document.getElementById('pedido-reference').value.trim();

  if(address && hasSelectedPoint && selectedLocationConfidence==='confirmada' &&
     !(editingPedidoId && pedidos.some(p=>p.id===editingPedidoId && p.address!==address && p.lat===selectedLocation[0] && p.lng===selectedLocation[1]))){
    const k=window.domicilioV55.key(address);
    const saved={address,lat:selectedLocation[0],lng:selectedLocation[1],verifiedAt:new Date().toISOString(),source:'mapa-confirmado'};
    const index=knownAddresses.findIndex(a=>window.domicilioV55.key(a.address)===k);
    if(index>=0)knownAddresses[index]=saved;else knownAddresses.push(saved);
    if(knownAddresses.length>2000)knownAddresses.shift();
  }

  if (editingPedidoId) {
    const pedido = pedidos.find((p) => p.id === editingPedidoId);
    if (pedido) {
      const previousAddress=pedido.address, previousLat=pedido.lat, previousLng=pedido.lng;
      pedido.number = numberValue;
      pedido.name = name;
      pedido.address = address;
      pedido.reference = reference;
      const unchangedCoordinates=hasSelectedPoint && previousLat===selectedLocation[0] && previousLng===selectedLocation[1];
      const addressMovedWithoutNewLocation=previousAddress!==address && unchangedCoordinates;
      pedido.lat = hasSelectedPoint && !addressMovedWithoutNewLocation ? selectedLocation[0] : null;
      pedido.lng = hasSelectedPoint && !addressMovedWithoutNewLocation ? selectedLocation[1] : null;
      pedido.needsLocationReview = !hasSelectedPoint || addressMovedWithoutNewLocation;
      pedido.locationStatus = hasSelectedPoint && !pedido.needsLocationReview ? (selectedLocationConfidence==='confirmada'?'confirmada':'estimada'):'pendiente';
      pedido.locationSource = pedido.locationStatus==='confirmada'?'mapa-confirmado':'osm-aproximada';
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
      lat: hasSelectedPoint ? selectedLocation[0] : null,
      lng: hasSelectedPoint ? selectedLocation[1] : null,
      needsLocationReview: !hasSelectedPoint,
      locationStatus: hasSelectedPoint ? (selectedLocationConfidence==='confirmada'?'confirmada':'estimada'):'pendiente',
      locationSource: hasSelectedPoint ? (selectedLocationConfidence==='confirmada'?'mapa-confirmado':'osm-aproximada'):null,
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

  // El centro inicial es únicamente una vista del mapa: nunca una base o parada.
  startMarker = null;

  mapInstance.on('click', (event) => {
    const clickedLocation = [event.latlng.lat, event.latlng.lng];

    if (window.domicilioBulkMapPick?.(clickedLocation)) return;
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

    // Mapa de consulta: no agregar pedidos al tocarlo fuera del modo explícito.
  });

  pedidos.forEach(updatePedidoMarker);
  updateStartLocationDisplay();
}

// Asistente Local Heurístico
function parseAddressList(text) {
  // V4.5: permitir listas numeradas copiadas de un chat o documento, tanto
  // «1. Cliente\nCalle...» como «1. Calle...\nCliente».
  const original=String(text||'').replace(/\r/g,'');
  const addressStart=/^(?:calle|cll?\.?|carrera|cra?\.?|cr\.?|kr\.?|avenida|av\.?|diagonal|dg\.?|transversal|tv\.?|manzana|mz\.?)\s*\d/i;
  const clean=s=>String(s||'').replace(/\*\*/g,'').replace(/^\s*[-•]\s*/,'').trim();
  const lines=original.split('\n').map(clean);
  const marker=/^(\d{1,3})\s*[.)]\s*(.*)$/;
  const groups=[];let current=[], markerCount=0;
  for(const line of lines){
    if(!line)continue;
    const m=line.match(marker)||line.match(/^(\d{1,3})$/);
    if(m){
      markerCount++;
      if(current.length)groups.push(current);
      current=[];if(m[2])current.push(clean(m[2]));
    }else current.push(line);
  }
  if(current.length)groups.push(current);
  if(markerCount>=2){
    const rows=[];
    for(const group of groups){
      const index=group.findIndex(x=>addressStart.test(x));
      if(index<0)continue;
      const normal=normalizeAddress(group[index]);
      const addrMatch=normal.match(/^((?:Calle|Carrera|Avenida|Diagonal|Transversal|Manzana)\s+\d+[A-Za-z]?(?:\s+bis)?(?:\s*#\s*\d+[A-Za-z]?(?:\s*-\s*\d+[A-Za-z]?)?)?)(?:\s+(.*))?$/i);
      const address=addrMatch?addrMatch[1]:normal;
      const suffix=addrMatch?.[2]||'';
      const before=group.slice(0,index).map(clean).filter(Boolean);
      const after=[suffix,...group.slice(index+1)].map(clean).filter(Boolean);
      let name='',reference='';
      if(before.length){name=before[0];reference=[...before.slice(1),...after].join(' · ');}
      else if(after.length){name=after[0];reference=after.slice(1).join(' · ');}
      name=name.replace(/\s+\d{1,3}[.)]\s*$/,'').trim();
      const detailSplit=name.match(/^(.*?)\s+[—–]\s+(.+)$/);
      if(detailSplit){name=detailSplit[1];reference=[detailSplit[2],reference].filter(Boolean).join(' · ');}
      const separated=separatePedidoFields(name,address,reference);
      rows.push({name:separated.name,address:separated.address,reference:separated.reference,priority:'normal'});
    }
    if(rows.length)return rows;
  }
  // Texto sin numeración: reutilizar el detector de direcciones; separar los
  // campos usando el mismo motor que revisa pedidos ya guardados.
  text=original.split(/\r?\n/).map(line=>normalizeAddress(line)).join('\n');
  const addressPattern=/\b(?:calle|cll?\.?|carrera|cra?\.?|cr\.?|kr\.?|avenida|av\.?|diagonal|dg\.?|transversal|tv\.?|manzana|mz\.?|kil[oó]metro|km)\s+\d+[a-z]?(?:\s*(?:#|n(?:[.º°]|o\.?)?)\s*\d+[a-z]?(?:\s*[-–]\s*\d+[a-z]?)?)?(?:\s*(?:bis|sur|este|oeste))?/giu;
  const matches=[...text.matchAll(addressPattern)];
  if(!matches.length)return [];
  const cleanFragment=value=>value.replace(/[\r\n]+/g,' ').replace(/^[\s,;|:–—-]+|[\s,;|:–—-]+$/g,'').trim();
  const prefix=cleanFragment(text.slice(0,matches[0].index));
  const commandPrefix=/^(?:agrega|añade|crea|crear|registra|registrar|arma|organiza)\b[\s\S]*$/i.test(prefix);
  const firstName=!commandPrefix && /[|;–—-]/.test(prefix)?cleanFragment(prefix.split(/[|;–—-]/).pop()):'';
  return matches.map((match,index)=>{
    const nextStart=matches[index+1]?.index??text.length;
    const rawName=cleanFragment(text.slice(match.index+match[0].length,nextStart))||(index===0?firstName:'');
    const values=separatePedidoFields(rawName.replace(/\s+\d{1,3}[.)]\s*$/,''),match[0].trim());
    return {address:values.address,name:values.name,reference:values.reference,priority:'normal'};
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
    return { type: 'action_optimize', message: '¿Deseas que calcule una propuesta por tiempo total de carretera y te permita aprobarla?' };
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
        action: () => proposeRouteOrder(),
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
  const saved=JSON.parse(localStorage.getItem('domicilios-cienaga-state') || '{}');
  saved.shifts=window.domicilioV53?.readHistory?.()||[];
  const blob = new Blob([JSON.stringify(saved,null,2)], { type: 'application/json' });
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
    if(Array.isArray(state.shifts)) window.domicilioV53?.restoreHistory?.(state.shifts);
    localStorage.setItem('domicilios-cienaga-state', JSON.stringify(state));
    showToast('Copia importada con éxito', 'success');
    setTimeout(() => location.reload(), 600);
  } catch (err) {
    alert('No se pudo importar: ' + err.message);
  }
}

function gpsUpdate(position) {
  if (window.domicilioMonitor?.ingestGps?.(position,'gps-general')===false) return;
  gpsPosition = [position.coords.latitude, position.coords.longitude];
  const gpsStatus = document.getElementById('gps-status');
  if (gpsStatus) {
    gpsStatus.textContent = `GPS: ${formatCoordinates(gpsPosition)} · precisión ±${Math.round(position.coords.accuracy)} m`;
  }

  if (getRoutePedidos().length && position.coords.accuracy <= 60) {
    const next = getRoutePedidos()[0];
    const meters = Number.isFinite(next.lat) && Number.isFinite(next.lng) && next.locationStatus !== 'estimada'
      ? haversineDistance(gpsPosition, [next.lat, next.lng]) * 1000 : Infinity;
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
      if (gpsStatus) gpsStatus.textContent = `GPS error: ${err.message}`;
      showToast('Error GPS: ' + err.message, 'warning');
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );

  if (gpsBtn) gpsBtn.innerHTML = '<span>⏹ Detener GPS</span>';
  showToast('GPS activado en alta precisión', 'success');
}

// V4.4: separar campos mezclados de pedidos anteriores y dictados.
// Es una propuesta local y reversible: nunca cambia coordenadas ni guarda sin confirmar.
function separatePedidoFields(name, address, reference='') {
  // Una numeración de lista como «Mateus Marcos 3.» no forma parte del nombre.
  let customer=String(name||'').trim().replace(/\s+/g,' ').replace(/\s+\d{1,3}[.)]\s*$/,'').trim();
  let normalized=normalizeAddress(address||'');
  let detail=String(reference||'').trim();
  const original={name:customer,address:normalized,reference:detail};
  const notes=[];
  const appendDetail=value=>{ if(value && !detail.toLowerCase().includes(value.toLowerCase())) detail=[detail,value].filter(Boolean).join(' · '); };
  // Si se pegó una dirección completa dentro del campo cliente, extraerla solo
  // cuando la dirección actual está incompleta. Nunca sustituir una dirección ya completa.
  const embedded=customer.match(/\b(?:calle|carrera|cll|cra|cr|kr)\s+\d+[A-Za-z]?(?:\s+(?:n[uú]mero|numeral|#|calle|carrera|cra|cr)\s*|\s+#\s*)\d+[A-Za-z]?(?:\s*[-–]\s*|\s+)\d+[A-Za-z]?/i);
  if(embedded && !/#\s*\d+[A-Za-z]?\s*-\s*\d+[A-Za-z]?/i.test(normalized)) {
    normalized=normalizeAddress(embedded[0]);
    customer=customer.replace(embedded[0],' ').replace(/\s+/g,' ').trim();
    notes.push('Dirección completa trasladada desde el cliente');
  }
  // Si el domicilio solo dice Calle 1B y el nombre empieza por "número 21 07",
  // completar la dirección antes de separar el cliente.
  const bare=normalized.match(/^((?:Calle|Carrera)\s+\d+[A-Za-z]?(?:\s+bis)?)$/i);
  const detached=customer.match(/^\s*(?:n[uú]mero|numeral|#)\s*(\d+[A-Za-z]?)\s+([0-9]+[A-Za-z]?)(?=\s|$)/i);
  if(bare && detached) {
    normalized=normalizeAddress(`${normalized} #${detached[1]}-${detached[2]}`);
    customer=customer.slice(detached[0].length).trim();
    notes.push('Numeración recuperada de cliente');
  }
  // Quitar del campo cliente solamente numeraciones que coinciden exactamente
  // con la numeración de la dirección; jamás descartar cifras desconocidas.
  const house=normalized.match(/#\s*(\d+[A-Za-z]?)\s*[-–]\s*(\d+[A-Za-z]?)/i);
  if(house){
    const a=house[1],b=house[2];
    const escapeRegex=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const joined=escapeRegex(a+b), separated=`${escapeRegex(a)}\\s*(?:[-– ]\\s*)${escapeRegex(b)}`;
    const prefix=new RegExp(`^\\s*(?:(?:n[uú]mero|numeral|#)\\s*)?(?:${separated}|${joined})(?=\\s|$)\\s*`,'i');
    const before=customer;
    customer=customer.replace(prefix,'').trim();
    if(before!==customer)notes.push('Numeración duplicada quitada del cliente');
  }
  // "número" suelto antes de un nombre es un marcador de dictado, no parte del nombre.
  customer=customer.replace(/^\s*(?:n[uú]mero|numeral|#)\s+(?=[A-Za-zÁÉÍÓÚÑáéíóúñ])/i,'').trim();
  // «Esquina» expresa una referencia vial. Sin una calle transversal no
  // inventamos el cruce; movemos la palabra a observaciones.
  if(/\besquina\b/i.test(customer)) {
    customer=customer.replace(/\besquina\b/ig,' ').replace(/\s+/g,' ').trim();
    appendDetail('esquina');
    notes.push('Referencia de esquina separada del cliente');
  }
  if(/^\s*(?:n[uú]mero|numeral|#)\s*$/i.test(customer)) customer='';
  return {name:customer,address:normalized,reference:detail,changed:customer!==original.name||normalized!==original.address||detail!==original.reference,notes};
}
window.domicilioSeparatePedidoFields=separatePedidoFields;

// V4.3: revisar y corregir pedidos guardados sin volver a importarlos.
function displayCurrentOrders(mode='manual') {
  const panel=document.getElementById('v43-current-orders');
  if(!panel)return;
  panel.replaceChildren();
  const active=getRoutePedidos();
  const title=document.createElement('h3');title.textContent=mode==='review'?'Revisar direcciones existentes':'Orden manual de entregas';panel.append(title);
  const note=document.createElement('p'); note.textContent=mode==='review'
    ?'Corrige nombres y números de direcciones anteriores. Las coordenadas NO cambian automáticamente: verifica las corregidas en el mapa antes de navegar.'
    :'Usa las flechas para ordenar tus pedidos. Se respeta el orden que elijas y no se sustituye sin aprobación.';panel.append(note);
  if(!active.length){const p=document.createElement('p');p.textContent='No hay pedidos pendientes.';panel.append(p);return;}
  const list=document.createElement('div');list.className='v43-existing-list';panel.append(list);
  active.forEach((p,i)=>{
    const line=document.createElement('div');line.className='v43-existing-row';
    const label=document.createElement('strong');label.textContent=`${i+1}. Pedido #${p.number}`;line.append(label);
    if(mode==='manual'){
      const up=document.createElement('button');up.type='button';up.className='btn btn-outline btn-sm';up.textContent='↑ Subir';up.disabled=i===0 || p.status==='en_ruta' || (i===1 && (active[0]?.status==='en_ruta' || window.domicilioNav?.currentTargetId?.()===active[0]?.id));
      up.onclick=()=>{movePedido(p.id,-1);displayCurrentOrders('manual');};
      const down=document.createElement('button');down.type='button';down.className='btn btn-outline btn-sm';down.textContent='↓ Bajar';down.disabled=i===active.length-1 || p.status==='en_ruta' || (i===0 && window.domicilioNav?.currentTargetId?.()===p.id);
      down.onclick=()=>{movePedido(p.id,1);displayCurrentOrders('manual');};
      const labelText=document.createElement('span');labelText.textContent=`${p.name||'Sin nombre'} · ${p.address||'Dirección incompleta'}`;
      line.append(labelText,up,down);
    }else{
      const customer=document.createElement('input');customer.type='text';customer.value=p.name||'';customer.setAttribute('aria-label',`Cliente del pedido ${p.number}`);
      const addr=document.createElement('input');addr.type='text';addr.value=normalizeAddress(p.address||'');
      const parsed=separatePedidoFields(p.name,p.address,p.reference);
      customer.value=parsed.name;
      addr.value=parsed.address;
      addr.setAttribute('aria-label',`Dirección del pedido ${p.number}`);
      const ref=document.createElement('input');ref.type='text';ref.value=parsed.reference;
      ref.setAttribute('aria-label',`Referencia del pedido ${p.number}`);
      ref.placeholder='Referencia: esquina, barrio, entrada…';
      const save=document.createElement('button');save.type='button';save.className='btn btn-primary btn-sm';save.textContent='Guardar corrección';
      const flag=document.createElement('small');
      flag.textContent=parsed.changed ? `Propuesta para revisar: ${parsed.notes.join('; ') || 'campos separados'}. Coordenadas sin modificar.`
        : p.needsLocationReview?'⚠ Verifica ubicación en el mapa':'Datos conservados; coordenadas sin modificar';
      save.onclick=()=>{
        const revised=separatePedidoFields(customer.value,addr.value,ref.value);
        const newName=revised.name,newAddress=revised.address,newReference=revised.reference;
        if(!newAddress){showToast('La dirección no puede quedar vacía','danger');return;}
        const changed=newAddress!==p.address;
        const message=`¿Guardar la corrección del pedido #${p.number}?\n\nCliente: ${newName||'(sin cliente)'}\nDirección: ${newAddress}\nReferencia: ${newReference||'(ninguna)'}\n\nLas coordenadas no cambiarán; revisa el punto en el mapa.`;
        if(!confirm(message))return;
        p.name=newName;p.address=newAddress;p.reference=newReference;
        if(changed)p.needsLocationReview=true;
        saveState();renderPedidoList();window.v3Refresh?.();
        displayCurrentOrders('review');showToast(changed?'Dirección corregida. Verifica ubicación en el mapa.':'Cliente y referencia actualizados','info',5500);
      };
      line.append(customer,addr,ref,flag,save);
    }
    list.append(line);
  });
}
window.domicilioReviewCurrentOrders=()=>displayCurrentOrders('review');
window.domicilioManualOrder=()=>displayCurrentOrders('manual');
document.getElementById('review-current-orders')?.addEventListener('click',window.domicilioReviewCurrentOrders);
document.getElementById('manual-route-order')?.addEventListener('click',window.domicilioManualOrder);

async function proposeRouteOrder() {
  const active = getRoutePedidos();
  const target = document.getElementById('suggestion-preview');
  target.replaceChildren();
  if(active.some(p=>p.needsLocationReview)){
    target.textContent='Hay direcciones corregidas con ubicación pendiente de confirmar. Usa «Cambiar Ubic.» en cada pedido antes de optimizar.';
    return;
  }

  if (active.length < 2) {
    target.innerHTML = '<p class="text-secondary">Se necesitan al menos dos pedidos pendientes para evaluar tiempos por carretera.</p>';
    return;
  }

  const origin = window.domicilioV5?.routeOrigin?.();
  if (!origin) {showToast('Necesitas GPS actual para proponer un recorrido.', 'warning');return;}
  const finalPoint = null; // V5.3: no añadir regresos ni bases automáticamente.
  const coords = [origin, ...active.map(p => [p.lat, p.lng]), ...(finalPoint ? [finalPoint] : [])];
  const url = 'https://router.project-osrm.org/table/v1/driving/' + coords.map(c => `${c[1]},${c[0]}`).join(';') + '?annotations=duration';

  target.innerHTML = '<p class="text-secondary">Consultando tiempos reales de carretera con OSRM...</p>';

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || data.code !== 'Ok' || !data.durations) throw new Error('Servicio de rutas no disponible');

    const matrix = data.durations;
    const ids = active.map((_,i)=>i+1);
    const ranks = Object.fromEntries(active.map((p,i)=>[i+1,p.priority==='urgente'?0:p.priority==='prioritario'?1:2]));
    const navId=window.domicilioNav?.currentTargetId?.();
    const locked = active[0]?.status==='en_ruta' || (navId && active[0]?.id===navId) ? 1 : null;
    const last = finalPoint ? coords.length-1 : null;
    const sorted = window.domicilioRouteOptimizer.withPriority(ids,matrix,last,ranks,locked);
    const proposal = sorted.map(i=>active[i-1]);
    const oldCost = window.domicilioRouteOptimizer.cost(ids,matrix,last);
    const newCost = window.domicilioRouteOptimizer.cost(sorted,matrix,last);
    const summaryCost = `${Math.round(oldCost/60)} min actuales → ${Math.round(newCost/60)} min propuestos`;

    suggestionOrder = proposal;
    const snapshot=active.map(p=>`${p.id}:${p.lat}:${p.lng}:${p.address}:${p.priority||''}`).join('|');
    const original = active.map(p => p.id).join('|');
    const proposed = proposal.map(p => p.id).join('|');

    if (original === proposed) {
      target.innerHTML = '<p class="text-success">No se encontró una alternativa más rápida con las restricciones y los datos de OSRM disponibles.</p>';
      return;
    }

    const summary = document.createElement('div');
    summary.style.marginTop = '8px';
    summary.innerHTML = `
      <p style="font-weight: 600; margin-bottom: 6px;">Orden sugerido por carretera (${summaryCost}):</p>
      <div style="background: var(--bg-subtle); padding: 8px 12px; border-radius: var(--radius-sm); margin-bottom: 8px;">
        ${proposal.map(p => `#${p.number}`).join(' → ')}
      </div>
    `;

    const acceptBtn = document.createElement('button');
    acceptBtn.type = 'button';
    acceptBtn.className = 'btn btn-primary btn-sm';
    acceptBtn.textContent = 'Aplicar este orden de paradas';
    acceptBtn.onclick = () => {
      if (getRoutePedidos().map(p=>`${p.id}:${p.lat}:${p.lng}:${p.address}:${p.priority||''}`).join('|')!==snapshot){
        target.textContent='La lista cambió desde la propuesta. Vuelve a optimizar.';return;
      }
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
    target.textContent='No se pudo consultar el servicio de carreteras. Tu ruta no se modificó: '+e.message;
  }
}
window.domicilioSuggestAfterDelivery=()=>{
  if(getRoutePedidos().length<2)return;
  // Solo sugiere; nunca cambia automáticamente el orden aprobado.
  proposeRouteOrder();
  showToast('Entrega registrada. Puedes revisar una nueva propuesta de ruta en Rutas.', 'info', 6000);
};

// Inicialización de Eventos
searchStartButton?.addEventListener('click', geocodeStartAddress);
setStartOnMapButton?.addEventListener('click', enableStartSelectionMode);
searchLocationButton?.addEventListener('click', geocodeAddress);
optimizeRouteButton?.addEventListener('click', proposeRouteOrder);
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
  showPedidoForm(null);
});
document.getElementById('global-fab-order')?.addEventListener('click', () => {
  showPedidoForm(null);
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

// Navegación V4: cargada después de la inicialización del mapa.

// Normalización conservadora: convertir números escritos en letras sin inventar domicilios.
function normalizeAddress(raw) {
  // Interpretación local reversible: nunca geocodificar ni inventar un número de casa.
  let text = String(raw ?? '').trim().replace(/\s+/g, ' ');
  const ascii = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const units = {cero:0, un:1, uno:1, una:1, dos:2, tres:3, cuatro:4, cinco:5, seis:6, siete:7, ocho:8, nueve:9};
  const teens = {diez:10, once:11, doce:12, trece:13, catorce:14, quince:15, dieciseis:16, diecisiete:17, dieciocho:18, diecinueve:19, veinte:20,
    veintiuno:21, veintidos:22, veintitres:23, veinticuatro:24, veinticinco:25, veintiseis:26, veintisiete:27, veintiocho:28, veintinueve:29};
  const tens = {treinta:30, cuarenta:40, cincuenta:50, sesenta:60, setenta:70, ochenta:80, noventa:90};
  const hundreds = {cien:100, ciento:100, doscientos:200, trescientos:300, cuatrocientos:400, quinientos:500};
  // Sustituye secuencias numéricas en palabras respetando otras palabras como el nombre del cliente.
  const tokens = text.match(/[\p{L}]+|\d+|[^\p{L}\d]+/gu) || [];
  const output=[];
  for(let i=0;i<tokens.length;i++) {
    const w=ascii(tokens[i]);
    let number = w in units ? units[w] : w in teens ? teens[w] : w in tens ? tens[w] : w in hundreds ? hundreds[w] : null;
    if(number===null){output.push(tokens[i]);continue;}
    let j=i;
    const nextWord = at => at<tokens.length && /^\s+$/.test(tokens[at-1]||'') ? ascii(tokens[at]) : null;
    if(number>=100 && number%100===0) {
      const second=nextWord(j+2);
      if(second && (second in teens || second in tens || second in units)) {
        number+=(teens[second]??tens[second]??units[second]);j+=2;
      }
    }
    if(number>=20 && number%10===0 && number%100>=20) {
      if(/^\s+$/.test(tokens[j+1]||'') && ascii(tokens[j+2]||'')==='y' && /^\s+$/.test(tokens[j+3]||'') && ascii(tokens[j+4]||'') in units){
        number+=units[ascii(tokens[j+4])];j+=4;
      }
    }
    output.push(String(number));i=j;
  }
  text=output.join('').replace(/\b(cll|cl)\.?\s+/gi,'Calle ').replace(/\b(cra|cr|kr)\.?\s+/gi,'Carrera ');
  text=text.replace(/\bnumero\b|\bnúmero\b/gi,'#').replace(/\bnumeral\b/gi,'#');
  text=text.replace(/(\b(?:Calle|Carrera)\s+\d+[A-Za-z]?)\s*#\s*/i,'$1 #');
  text=text.replace(/(\d+[A-Za-z]?)\s+guion\s+(\d+[A-Za-z]?)/gi,'$1-$2');
  // En Colombia, Calle X seguida de Carrera Y o # Y-Z se interpreta como Calle X #Y-Z.
  // Carrera X seguida de Calle Y se interpreta como Carrera X #Y-Z.
  const match=text.match(/^(\s*(?:Calle|Carrera)\s+\d+[A-Za-z]?(?:\s+bis)?)(?:\s+(?:con\s+)?(?:Calle|Carrera|#|No\.?|Nro\.?|N°)\s*|\s+)(\d+[A-Za-z]?)(?:\s*[-–]\s*|\s+)(\d+[A-Za-z]?)(.*)$/i);
  if(match) return `${match[1].trim()} #${match[2]}-${match[3]}${match[4]||''}`.replace(/\s+/g,' ').trim();
  // Intersección sin número de casa: no completar una numeración inexistente.
  const cross=text.match(/^(\s*(?:Calle|Carrera)\s+\d+[A-Za-z]?)(?:\s+con\s+|\s+)(Calle|Carrera)\s+(\d+[A-Za-z]?)(.*)$/i);
  if(cross) return `${cross[1].trim()} con ${cross[2]} ${cross[3]}${cross[4]||''}`.replace(/\s+/g,' ').trim();
  return text.trim();
}
window.domicilioNormalizeAddress=normalizeAddress;
window.domicilioNormalizeAddress=(raw)=>window.domicilioV55.normalize(normalizeAddress(raw));
const V4_RULES=[
'Usar la posición GPS actual como origen cuando sea precisa y reciente.',
'Agrupar pedidos cercanos y sugerir el orden con menor tiempo de carretera.',
'Nunca cambiar el orden de pedidos sin confirmación del repartidor.',
'Considerar pedidos urgentes y restricciones de circulación antes de optimizar.',
'Calcular ida y regreso por separado: una calle de entrada no implica salida permitida.',
'Indicar con flechas el sentido de circulación sobre cada recorrido.',
'Cuando un pedido nuevo quede al paso, proponer incorporarlo sin alterar mucho la ruta.',
'Cuando un pedido nuevo esté lejos, sugerir dejarlo para el final.',
'Recalcular desde GPS al desviarse, sin inventar instrucciones.',
'Avisar al llegar cerca del domicilio; confirmar antes de marcar entregado.',
'Recordar correcciones de direcciones y puntos frecuentes confirmados.',
'Interpretar números escritos en letras y conservar apartamento, barrio y referencias.',
'No inventar números de vivienda ni dar por verificada una dirección ambigua.',
'Conservar pedidos y última ruta cuando falle internet; advertir que no puede recalcular.',
'Para ruta circular, terminar en Casa o base solo cuando esté configurado.',
'No confundir ruta más corta con más rápida; usar tiempos de carretera disponibles.',
'Informar de cierres y congestiones solo con fuentes actuales y verificables.',
'No presentar reportes comunitarios como información confirmada.',
'Respetar sentidos únicos y prohibiciones de giro según los datos del mapa.',
'Priorizar indicaciones por voz y controles grandes para reducir interacción al conducir.',
'Cuando una dirección empieza por Calle, el número siguiente a # o número representa la carrera y el último es el número de casa.',
'Cuando una dirección empieza por Carrera, el número siguiente a # o número representa la calle y el último es el número de casa.',
'Interpretar Calle 24 número 11 16, Calle 24 carrera 11 16 y Calle 24 #11-16 como Calle 24 #11-16.',
'Interpretar Carrera 11 calle 24 16, Carrera 11 número 24 16 y Carrera 11 #24-16 como Carrera 11 #24-16.',
'La palabra número, numeral y el símbolo # expresan el separador de numeración predial, no un nuevo cliente.',
'Separar los nombres y las referencias de la numeración; mostrar la normalización para confirmación antes de localizar.',
'Evaluar el costo total de la ruta en matriz vial dirigida, incluyendo ida, sentidos únicos y regreso configurado.',
'No afirmar que un orden es óptimo si se aplicó una heurística o la matriz vial está incompleta.',
'Mantener el siguiente pedido activo sin cambiarlo al reoptimizar sin aprobación.',
'Después de cada entrega recalcular una propuesta desde el GPS actual, pero mantener el orden hasta que la apruebe.',
'Permitir reoptimizar pedidos ya registrados sin obligar a importarlos nuevamente.',
'Ofrecer controles manuales para subir o bajar pedidos y guardar el orden elegido.',
'Normalizar direcciones antiguas separando palabras y números sin inventar viviendas.',
'Si se corrige un domicilio existente, conservar sus coordenadas temporalmente pero exigir su verificación antes de optimizar.',
'No borrar pedidos, nombres, ubicaciones o preferencias existentes durante una migración.',
'El campo cliente contiene el nombre o la institución; no debe incluir número, numeral, # ni numeración predial duplicada.',
'Una referencia como esquina, barrio o entrada se guarda en Referencia, separada del cliente y del número predial.',
'Si el cliente trae 23 02 y la dirección es Calle 8 #23-02, reconocer la duplicación y proponer retirarla del nombre.',
'Si el cliente trae 1939 y la dirección es Calle 7 #19-39, comparar cifras antes de separar y no borrar números diferentes.',
'Las correcciones de los pedidos guardados solo se aplican después de confirmación; no borrar datos y exigir verificación del mapa si cambia la dirección.',
'No inventar la calle de una esquina cuando solo se dicta la palabra esquina; conservarla como referencia incompleta.',
'Una lista numerada 1, 2, 3 o 1., 2., 3. usa esos números como índice de entrega, no como parte del cliente o número predial.',
'Cuando copio una ruta ordenada desde un chat, admitir tanto cliente antes de dirección como dirección antes de cliente.',
'Reconocer texto después de raya larga como posible referencia de apartamento, barrio o sector y ofrecerlo separado del cliente.',
'Si una dirección importada no tiene coordenadas confirmadas, indicar qué pedido necesita verificación y permitir elegirlo manualmente en el mapa.',
'No calcular ni prometer navegación para puntos no verificados: solicitar revisión en vez de inventar ubicación.'
];
function installV4Rules(){
  const existing=new Set(learnedRules.map(r=>r.text));
  for(const text of V4_RULES) if(!existing.has(text)) learnedRules.push({id:generatePedidoId(),text,createdAt:new Date().toISOString(),source:'v4-default'});
  saveState();renderRules();
}
// V5.3.2: Las reglas antiguas son material histórico, NO se reinstalan al iniciar.
// Respetar las eliminaciones y ediciones realizadas por el usuario.

