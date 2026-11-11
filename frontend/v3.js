/* ==========================================================================
   DOMICILIO V3 — MODELO VISUAL APROBADO: LÓGICA DE INTERFAZ INTEGRADA
   Navegación 8 Vistas, Dashboard con Reloj Vivo, Jornada Activa y Estadísticas
   ========================================================================== */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const navButtons = [...document.querySelectorAll('[data-nav]')];
  let currentView = 'home';
  let shiftInterval = null;

  // 1. GESTIÓN DE JORNADA ACTIVA
  const initShiftTimer = () => {
    let shiftStart = localStorage.getItem('domicilio-shift-start');
    if (!shiftStart) {
      shiftStart = new Date().toISOString();
      localStorage.setItem('domicilio-shift-start', shiftStart);
    }

    const updateTimer = () => {
      const start = new Date(localStorage.getItem('domicilio-shift-start') || shiftStart);
      const now = new Date();
      const diffMs = Math.max(0, now - start);
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      const timerDisplay = $('shift-timer-display');
      const sidebarTimerDisplay = $('sidebar-shift-timer');
      const statsTimeDisplay = $('stats-total-time');
      const timeStr = `${diffHrs}h ${diffMins}m`;

      if (timerDisplay) timerDisplay.textContent = `Tiempo en ruta: ${timeStr}`;
      if (sidebarTimerDisplay) sidebarTimerDisplay.textContent = timeStr;
      if (statsTimeDisplay) statsTimeDisplay.textContent = timeStr;
    };

    if (shiftInterval) clearInterval(shiftInterval);
    updateTimer();
    shiftInterval = setInterval(updateTimer, 60000);
  };

  const endShift = () => {
    const doneCount = pedidos.filter((p) => p.status === 'entregado').length;
    const pendingCount = pedidos.filter((p) => p.status === 'pendiente' || p.status === 'en_ruta').length;

    const confirmMsg = `¿Deseas finalizar tu jornada actual?\n\n• Entregas completadas: ${doneCount}\n• Pedidos pendientes: ${pendingCount}\n\nSe registrará el cierre en el historial.`;
    if (!confirm(confirmMsg)) return;

    audit('Finalizar jornada', `Cierre de turno: ${doneCount} entregados, ${pendingCount} pendientes`);
    localStorage.removeItem('domicilio-shift-start');
    initShiftTimer();
    render();
    showToast('Jornada finalizada correctamente. ¡Buen trabajo!', 'success', 4000);
  };

  // 2. RELOJ Y FECHA EN TIEMPO REAL
  const startLiveClock = () => {
    const updateClock = () => {
      const now = new Date();
      const liveTime = $('live-time');
      const liveDate = $('live-date');
      const greetingHeading = $('home-greeting-heading');

      if (liveTime) {
        liveTime.textContent = now.toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
      }

      if (liveDate) {
        liveDate.textContent = now.toLocaleDateString('es-CO', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }

      if (greetingHeading) {
        const hour = now.getHours();
        let greeting = '¡Hola, Andrés!';
        if (hour < 12) greeting = '¡Buenos días, Andrés!';
        else if (hour < 18) greeting = '¡Buenas tardes, Andrés!';
        else greeting = '¡Buenas noches, Andrés!';
        greetingHeading.textContent = greeting;
      }
    };

    updateClock();
    setInterval(updateClock, 1000);
  };

  // 3. AUDITORÍA DE ACCIONES IMPORTANTES
  const audit = (action, details = '') => {
    window.v3Audit ||= [];
    window.v3Audit.push({
      at: new Date().toISOString(),
      action,
      details: String(details).slice(0, 180),
    });
    window.v3Audit = window.v3Audit.slice(-500);
    saveState();
  };

  // 4. CHAT CONVERSACIONAL DEL CEREBRO IA
  window.v3AppendChatMessage = (text, sender = 'assistant', actions = []) => {
    const chatContainer = $('ai-chat-messages');
    if (!chatContainer) return;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble chat-bubble-${sender}`;

    const content = document.createElement('div');
    content.className = 'chat-bubble-content';

    const p = document.createElement('p');
    p.textContent = text;
    content.appendChild(p);

    if (actions && actions.length > 0) {
      const actionsDiv = document.createElement('div');
      actionsDiv.style.marginTop = '10px';
      actionsDiv.style.display = 'flex';
      actionsDiv.style.gap = '8px';
      actionsDiv.style.flexWrap = 'wrap';

      actions.forEach(({ label, action }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-purple-primary btn-sm';
        btn.textContent = label;
        btn.onclick = () => {
          action();
          btn.disabled = true;
          btn.style.opacity = '0.6';
        };
        actionsDiv.appendChild(btn);
      });
      content.appendChild(actionsDiv);
    }

    const time = document.createElement('small');
    time.className = 'chat-time';
    const now = new Date();
    time.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    content.appendChild(time);

    bubble.appendChild(content);
    chatContainer.appendChild(bubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  };

  // 5. RENDERIZADO MAESTRO DE DATOS Y ESTADÍSTICAS
  const render = () => {
    const activeOrders = pedidos.filter((p) => p.status !== 'entregado' && p.status !== 'fallido');
    const doneOrders = pedidos.filter((p) => p.status === 'entregado');
    const routeOrders = pedidos.filter((p) => p.status === 'en_ruta');
    const failedOrders = pedidos.filter((p) => p.status === 'fallido');
    const totalOrders = pedidos.length;

    // 5.1 Cinco Tarjetas de Estadísticas del Inicio
    if ($('dash-pending-count')) $('dash-pending-count').textContent = activeOrders.length;
    if ($('dash-done-count')) $('dash-done-count').textContent = doneOrders.length;
    if ($('dash-route-count')) $('dash-route-count').textContent = routeOrders.length;

    // Badges en navegación
    if ($('sidebar-orders-badge')) $('sidebar-orders-badge').textContent = activeOrders.length;
    if ($('mobile-orders-badge')) $('mobile-orders-badge').textContent = activeOrders.length;
    if ($('notif-badge')) $('notif-badge').textContent = activeOrders.length;

    // 5.2 Siguiente Entrega (Tarjeta Destacada)
    const next = activeOrders[0];
    const nextName = $('next-customer-name');
    const nextAddress = $('next-customer-address');
    const nextRef = $('next-customer-reference');
    const nextBadge = $('next-stop-badge');
    const nextStatus = $('next-customer-status');
    const btnGo = $('btn-go-to-destination');
    const btnViewMap = $('btn-view-on-map-home');
    const stopsIndicator = $('home-map-stops-indicator');

    if (stopsIndicator) stopsIndicator.textContent = `${activeOrders.length} paradas activas`;

    if (next) {
      if (nextName) nextName.textContent = next.name || 'Cliente sin nombre';
      if (nextAddress) nextAddress.textContent = next.address || 'Ubicación seleccionada en el mapa';
      if (nextRef) nextRef.textContent = next.reference ? `Ref.: ${next.reference}` : '';
      if (nextBadge) nextBadge.textContent = `Parada #${next.number}`;
      if (nextStatus) {
        nextStatus.textContent = next.status === 'en_ruta' ? 'En ruta' : 'Pendiente';
        nextStatus.style.backgroundColor = next.status === 'en_ruta' ? 'var(--purple-soft)' : 'var(--warning-soft)';
        nextStatus.style.color = next.status === 'en_ruta' ? 'var(--purple-main)' : 'var(--warning)';
      }

      if (btnGo) {
        btnGo.style.display = 'inline-flex';
        btnGo.onclick = () => {
          navigate('map');
          setTimeout(() => {
            const marker = pedidoMarkers.get(next.id);
            if (marker && mapInstance) {
              mapInstance.flyTo([next.lat, next.lng], 16);
              marker.openPopup();
            }
          }, 120);
        };
      }

      if (btnViewMap) {
        btnViewMap.style.display = 'inline-flex';
        btnViewMap.onclick = () => {
          if (mapInstance) {
            mapInstance.flyTo([next.lat, next.lng], 15);
            const marker = pedidoMarkers.get(next.id);
            if (marker) marker.openPopup();
          }
        };
      }
    } else {
      if (nextName) nextName.textContent = totalOrders ? '¡Jornada completada!' : 'Sin pedidos pendientes';
      if (nextAddress) nextAddress.textContent = totalOrders ? 'Todos los pedidos han sido entregados con éxito.' : 'Agrega un pedido con el botón "+" para comenzar.';
      if (nextRef) nextRef.textContent = '';
      if (nextBadge) nextBadge.textContent = 'Al día';
      if (nextStatus) {
        nextStatus.textContent = 'Al día';
        nextStatus.style.backgroundColor = 'var(--success-soft)';
        nextStatus.style.color = 'var(--success)';
      }
      if (btnGo) btnGo.style.display = 'none';
      if (btnViewMap) btnViewMap.style.display = 'none';
    }

    // 5.3 Bottom Sheet de Entrega en el Mapa
    const mapCard = $('map-delivery-card');
    if (mapCard) {
      mapCard.replaceChildren();
      if (next) {
        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.alignItems = 'center';
        topRow.style.justifyContent = 'space-between';

        const heading = document.createElement('strong');
        heading.textContent = `Siguiente: #${next.number} · ${next.name || 'Cliente'}`;

        const badge = document.createElement('span');
        badge.className = 'status-pill-badge';
        badge.textContent = 'En turno';
        topRow.append(heading, badge);

        const p = document.createElement('p');
        p.textContent = `📍 ${next.address || 'Ubicación en mapa'}${next.reference ? ` (${next.reference})` : ''}`;

        const actionsRow = document.createElement('div');
        actionsRow.style.display = 'flex';
        actionsRow.style.gap = '8px';
        actionsRow.style.marginTop = '8px';

        const btnDone = document.createElement('button');
        btnDone.className = 'btn btn-purple-primary btn-sm';
        btnDone.innerHTML = '<span>✅ Marcar entregado</span>';
        btnDone.onclick = () => {
          if (!confirm(`¿Confirmas la entrega del pedido #${next.number}?`)) return;
          next.status = 'entregado';
          next.deliveredAt = new Date().toISOString();
          audit('Entrega completada', `Pedido #${next.number}`);
          updatePedidoMarker(next);
          saveState();
          renderPedidoList();
          render();
          recalculateIfRouteVisible();
          showToast(`¡Pedido #${next.number} entregado!`, 'success');
        };

        const btnDetails = document.createElement('button');
        btnDetails.className = 'btn btn-outline btn-sm';
        btnDetails.innerHTML = '<span>Ver pedido</span>';
        btnDetails.onclick = () => navigate('orders');

        actionsRow.append(btnDone, btnDetails);
        mapCard.append(topRow, p, actionsRow);
      } else {
        mapCard.innerHTML = '<p class="text-secondary">No hay entregas pendientes en este momento.</p>';
      }
    }

    // 5.4 Pantalla de Estadísticas y Rendimiento
    const effectiveRate = $('stats-effective-rate');
    const totalFinished = doneOrders.length + failedOrders.length;
    if (effectiveRate) {
      if (totalFinished === 0) {
        effectiveRate.textContent = '100%';
      } else {
        const pct = Math.round((doneOrders.length / totalFinished) * 100);
        effectiveRate.textContent = `${pct}%`;
      }
    }

    if ($('stats-failed-count')) $('stats-failed-count').textContent = String(failedOrders.length);

    // Barra de progreso general
    const progressBar = $('stats-progress-bar-fill');
    const legendDone = $('stats-progress-legend-done');
    const legendPending = $('stats-progress-legend-pending');

    if (totalOrders > 0) {
      const donePct = Math.round((doneOrders.length / totalOrders) * 100);
      if (progressBar) progressBar.style.width = `${donePct}%`;
      if (legendDone) legendDone.textContent = `${doneOrders.length} entregados (${donePct}%)`;
      if (legendPending) legendPending.textContent = `${activeOrders.length} pendientes`;
    } else {
      if (progressBar) progressBar.style.width = '0%';
      if (legendDone) legendDone.textContent = '0 entregados';
      if (legendPending) legendPending.textContent = '0 pendientes';
    }

    // 5.5 Historial de Auditoría
    const auditList = $('audit-list');
    if (auditList) {
      auditList.replaceChildren();
      (window.v3Audit || []).slice(-25).reverse().forEach((a) => {
        const row = document.createElement('p');
        const timeStr = new Date(a.at).toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        row.innerHTML = `
          <span><strong style="color: var(--purple-main);">${timeStr}</strong> · ${a.action}</span>
          <small class="text-muted">${a.details || ''}</small>
        `;
        auditList.append(row);
      });
      if (!(window.v3Audit || []).length) {
        auditList.innerHTML = '<p class="text-muted small">Sin acciones registradas aún.</p>';
      }
    }

    // 5.6 Reglas en Configuración
    const settingsRules = $('settings-rules');
    if (settingsRules) {
      settingsRules.replaceChildren();
      learnedRules.forEach((rule, idx) => {
        const row = document.createElement('p');
        row.innerHTML = `<span>• ${rule.text}</span>`;
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'btn btn-xs btn-danger-outline';
        delBtn.textContent = 'Eliminar';
        delBtn.onclick = () => {
          if (!confirm('¿Eliminar esta regla?')) return;
          learnedRules.splice(idx, 1);
          saveState();
          renderRules();
          render();
          showToast('Regla eliminada', 'info');
        };
        row.appendChild(delBtn);
        settingsRules.append(row);
      });
      if (!learnedRules.length) {
        settingsRules.innerHTML = '<p class="text-muted small">No hay recuerdos guardados aún.</p>';
      }
    }

    // 5.7 Lugares Guardados
    const places = window.v3SavedPlaces || [];
    const selector = $('saved-destination');
    if (selector) {
      const oldVal = selector.value;
      selector.replaceChildren();
      for (const place of places) {
        const option = document.createElement('option');
        option.value = place.id;
        option.textContent = place.name;
        selector.append(option);
      }
      if (places.some((p) => p.id === oldVal)) selector.value = oldVal;
    }

    const savedPlacesList = $('saved-places-list');
    if (savedPlacesList) {
      savedPlacesList.replaceChildren();
      places.forEach((place) => {
        const row = document.createElement('p');
        row.innerHTML = `<span><strong>${place.name}</strong> · ${place.point.map((x) => x.toFixed(4)).join(', ')}</span>`;
        const del = document.createElement('button');
        del.type = 'button';
        del.textContent = 'Eliminar';
        del.className = 'btn btn-xs btn-danger-outline';
        del.onclick = () => {
          if (!confirm(`¿Eliminar el lugar "${place.name}"?`)) return;
          window.v3SavedPlaces = places.filter((p) => p.id !== place.id);
          audit('Eliminar lugar', place.name);
          saveState();
          render();
          showToast(`Lugar "${place.name}" eliminado`, 'info');
        };
        row.append(del);
        savedPlacesList.append(row);
      });
      if (!places.length) {
        savedPlacesList.innerHTML = '<p class="text-muted small">Aún no hay lugares guardados.</p>';
      }
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  };

  // 6. CONTROLADOR DE NAVEGACIÓN ENTRE LAS 8 PANTALLAS
  const viewsMap = {
    home: 'home-view',
    orders: 'orders-view',
    routes: 'routes-view',
    map: 'map-view',
    ai: 'ai-view',
    history: 'history-view',
    stats: 'stats-view',
    settings: 'settings-view',
  };

  const navigate = (view) => {
    currentView = view;

    // Ocultar todas las pantallas
    Object.values(viewsMap).forEach((id) => {
      const el = $(id);
      if (el) el.classList.add('hidden');
    });

    // Mostrar la pantalla activa
    const targetId = viewsMap[view] || 'home-view';
    const targetEl = $(targetId);
    if (targetEl) targetEl.classList.remove('hidden');

    // Manejo del mapa Leaflet: mover el contenedor #map a donde corresponda
    const mapEl = $('map');
    if (mapEl) {
      if (view === 'home') {
        const homeSlot = $('home-embedded-map');
        if (homeSlot && !homeSlot.contains(mapEl)) {
          homeSlot.appendChild(mapEl);
        }
      } else if (view === 'map') {
        const fullSlot = $('dedicated-map-container');
        if (fullSlot && !fullSlot.contains(mapEl)) {
          fullSlot.appendChild(mapEl);
        }
      }
      setTimeout(() => mapInstance?.invalidateSize(), 100);
    }

    // Actualizar estado activo en botones de navegación
    navButtons.forEach((btn) => {
      const isActive = btn.dataset.nav === view;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    // Cerrar dropdown de usuario si estaba abierto
    $('user-dropdown-menu')?.classList.add('hidden');

    if (view === 'orders') {
      renderPedidoList();
    }

    render();
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  window.v3Navigate = navigate;
  window.v3Refresh = render;

  // 7. EVENTOS DE NAVEGACIÓN Y MENÚ
  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.nav));
  });

  // Toggle del Sidebar en computadores (Colapsar / Expandir)
  $('sidebar-toggle-btn')?.addEventListener('click', () => {
    const sidebar = $('app-sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed');
  });

  // Menú desplegable de usuario
  $('user-menu-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    $('user-dropdown-menu')?.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    $('user-dropdown-menu')?.classList.add('hidden');
  });

  // Opciones del Dropdown de Usuario
  $('menu-goto-stats')?.addEventListener('click', () => navigate('stats'));
  $('menu-goto-history')?.addEventListener('click', () => navigate('history'));
  $('menu-goto-settings')?.addEventListener('click', () => navigate('settings'));
  $('menu-end-shift')?.addEventListener('click', endShift);
  $('end-shift-btn')?.addEventListener('click', endShift);

  // Botón "Continuar mi jornada"
  $('resume-work')?.addEventListener('click', () => {
    const active = getRoutePedidos();
    if (!active.length) {
      showToast('No tienes pedidos pendientes para entregar', 'info');
      return;
    }
    navigate('map');
    const mapCard = $('map-delivery-card');
    if (mapCard) mapCard.classList.remove('hidden');
    audit('Reanudar jornada');
    showToast(`Dirígete a la parada #${active[0].number}`, 'info');
  });

  // 8. ACCIONES RÁPIDAS DE LA PANTALLA DE INICIO
  $('home-quick-new-order')?.addEventListener('click', () => {
    navigate('orders');
    showPedidoForm(startLocation);
  });

  $('home-quick-optimize')?.addEventListener('click', () => {
    optimizePedidoOrder();
  });

  $('home-quick-return')?.addEventListener('click', () => {
    navigate('routes');
    $('destination-mode')?.focus();
  });

  $('home-quick-continue')?.addEventListener('click', () => {
    $('resume-work')?.click();
  });

  $('home-quick-stats')?.addEventListener('click', () => {
    navigate('stats');
  });

  // Botón ampliar mapa en inicio
  $('home-map-fullscreen-btn')?.addEventListener('click', () => navigate('map'));
  $('home-map-locate-btn')?.addEventListener('click', () => {
    if (gpsPosition && mapInstance) {
      mapInstance.flyTo(gpsPosition, 16);
      showToast('Centrado en tu ubicación GPS', 'info');
    } else {
      showToast('GPS inactivo. Actívalo en Pedidos.', 'warning');
    }
  });

  // 9. WIDGET DEL CEREBRO IA EN EL INICIO
  $('home-ai-expand-btn')?.addEventListener('click', () => navigate('ai'));

  $('home-ai-send-btn')?.addEventListener('click', () => {
    const input = $('home-ai-input');
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();
    input.value = '';
    $('assistant-input').value = text;
    navigate('ai');
    previewInstruction();
  });

  $('home-ai-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      $('home-ai-send-btn')?.click();
    }
  });

  $('home-ai-mic-btn')?.addEventListener('click', () => {
    navigate('ai');
    $('assistant-record')?.click();
  });

  // 10. HERRAMIENTAS DEL MAPA PRINCIPAL
  $('fullscreen-map-action')?.addEventListener('click', () => {
    const el = $('map-view');
    if (el) {
      if (!document.fullscreenElement) {
        el.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    }
  });

  $('map-expand')?.addEventListener('click', () => {
    const mapPanel = document.querySelector('.map-panel');
    if (mapPanel) {
      mapPanel.classList.toggle('expanded');
      setTimeout(() => mapInstance?.invalidateSize(), 150);
    }
  });

  $('map-card-toggle')?.addEventListener('click', () => {
    $('map-delivery-card')?.classList.toggle('hidden');
  });

  $('map-center-gps')?.addEventListener('click', () => {
    if (gpsPosition && mapInstance) {
      mapInstance.flyTo(gpsPosition, 16);
      showToast('Centrado en tu GPS', 'info');
    } else {
      showToast('GPS inactivo. Actívalo en Pedidos.', 'warning');
    }
  });

  $('map-center-start')?.addEventListener('click', () => {
    if (startLocation && mapInstance) {
      mapInstance.flyTo(startLocation, 15);
      showToast('Centrado en el restaurante / base', 'info');
    }
  });

  // Chips de sugerencias en chat
  document.querySelectorAll('.suggestion-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const promptText = chip.dataset.prompt;
      const input = $('assistant-input');
      if (input && promptText) {
        input.value = promptText;
        input.focus();
      }
    });
  });

  $('ai-to-settings-btn')?.addEventListener('click', () => navigate('settings'));

  // Agregar regla manual
  $('settings-add-rule-btn')?.addEventListener('click', () => {
    const text = prompt('Escribe una regla o recordatorio para el repartidor:');
    if (!text || !text.trim()) return;
    learnedRules.push({
      id: generatePedidoId(),
      text: text.trim(),
      createdAt: new Date().toISOString(),
    });
    saveState();
    renderRules();
    render();
    showToast('Regla guardada', 'success');
  });

  // Configuración de destino
  const mode = $('destination-mode');
  const setDestination = () => {
    if (!mode) return;
    const v = mode.value;
    const wrap = $('saved-destination-wrap');
    if (wrap) wrap.style.display = v === 'saved' ? 'block' : 'none';

    if (v === 'map') {
      const fb = $('destination-feedback');
      if (fb) fb.textContent = 'Abre el Mapa y toca el punto de destino final.';
      navigate('map');
      mapInstance.once('click', (ev) => {
        const point = [ev.latlng.lat, ev.latlng.lng];
        if (confirm(`¿Fijar ${formatCoordinates(point)} como destino final?`)) {
          window.v3Destination = { mode: 'map', point };
          audit('Destino final', 'Marcador en mapa');
          saveState();
          recalculateIfRouteVisible();
          showToast('Destino en mapa guardado', 'success');
        }
      });
      return;
    }

    if (v === 'saved') {
      const place = (window.v3SavedPlaces || []).find((p) => p.id === $('saved-destination')?.value);
      if (!place) {
        showToast('Guarda primero un lugar en Configuración', 'warning');
        return;
      }
      window.v3Destination = { mode: 'saved', point: place.point, placeId: place.id };
    } else {
      window.v3Destination = { mode: v };
    }

    const returnCheck = $('return-to-start');
    if (returnCheck) returnCheck.checked = v === 'start';

    const fb = $('destination-feedback');
    if (fb) fb.textContent = 'Destino final configurado.';
    audit('Cambiar destino', v);
    saveState();
    recalculateIfRouteVisible();
  };

  if (mode) mode.onchange = setDestination;
  $('saved-destination')?.addEventListener('change', setDestination);

  $('save-place')?.addEventListener('click', () => {
    const name = prompt('Nombre del lugar (por ejemplo: Casa, Bodega):');
    if (!name?.trim()) return;
    const point = gpsPosition || startLocation;
    if (!confirm(`¿Guardar "${name.trim()}" en ${formatCoordinates(point)}?`)) return;
    window.v3SavedPlaces ||= [];
    window.v3SavedPlaces.push({
      id: generatePedidoId(),
      name: name.trim().slice(0, 60),
      point: [...point],
    });
    audit('Guardar lugar', name.trim());
    saveState();
    render();
    showToast(`Lugar "${name.trim()}" guardado`, 'success');
  });

  $('clear-audit')?.addEventListener('click', () => {
    if (!confirm('¿Eliminar todo el historial de acciones?')) return;
    window.v3Audit = [];
    saveState();
    render();
    showToast('Historial vaciado', 'info');
  });

  // Conectividad en tiempo real
  const updateConnectivity = () => {
    const pill = $('connectivity');
    if (!pill) return;
    const isOnline = navigator.onLine;
    pill.classList.toggle('online', isOnline);
    pill.classList.toggle('offline-status', !isOnline);
    const textSpan = pill.querySelector('.status-indicator-text');
    if (textSpan) {
      textSpan.textContent = isOnline ? 'Conectado' : 'Sin conexión · local';
    }
  };

  window.addEventListener('online', updateConnectivity);
  window.addEventListener('offline', updateConnectivity);
  updateConnectivity();

  // Modo Oscuro / Claro
  const themeToggle = $('theme-toggle');
  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('domicilio-theme', theme);
    const icon = $('theme-icon');
    if (icon) {
      icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
      if (window.lucide) window.lucide.createIcons();
    }
  };

  const savedTheme = localStorage.getItem('domicilio-theme') || 'light';
  applyTheme(savedTheme);

  themeToggle?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });

  // Service Worker
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Inicialización
  startLiveClock();
  initShiftTimer();
  navigate('home');
})();
