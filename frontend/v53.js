/* DOMICILIO V5.3 — gestión de jornada, historial verificable y ayuda contextual local. */
(() => {
  'use strict';
  const KEY='domicilio-v53-historial';
  const $=id=>document.getElementById(id);
  function readHistory(){
    try{const data=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(data)?data:[];}
    catch(_){return [];}
  }
  function restoreHistory(data){
    if(!Array.isArray(data))return false;
    const trimmed=data.filter(j=>j&&Array.isArray(j.orders)&&typeof j.endedAt==='string').slice(-2000);
    try{localStorage.setItem(KEY,JSON.stringify(trimmed));drawHistory();return true;}
    catch(_){return false;}
  }
  function archiveShift(orders,startedAt,endedAt){
    const archive={id:`jornada-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,startedAt,endedAt,
      orders:orders.map(p=>({...p, status:['pendiente','en_ruta'].includes(p.status)?'no_realizado':p.status,
        failedReason:['pendiente','en_ruta'].includes(p.status)?'Jornada finalizada sin entrega':p.failedReason}))};
    const before=readHistory(),after=[...before,archive];
    localStorage.setItem(KEY,JSON.stringify(after));
    const verified=readHistory();
    if(!verified.some(j=>j.id===archive.id))throw new Error('No se pudo verificar el historial');
    return archive;
  }
  function finishShift(){
    if(window.domicilioNav?.currentTargetId?.() && !confirm('Hay una navegación activa. ¿Quieres detenerla y finalizar la jornada?'))return false;
    const count=pedidos.length;
    const done=pedidos.filter(p=>p.status==='entregado').length;
    const failed=pedidos.filter(p=>p.status==='fallido').length;
    const pending=count-done-failed;
    if(!confirm(`Finalizar jornada y archivar todos los pedidos?\n\nEntregados: ${done}\nNo realizados o anulados: ${failed+pending}\nTotal: ${count}\n\nLa lista activa quedará vacía. El historial conservará las direcciones.`))return false;
    if(!count){showToast('La jornada no tiene pedidos. Puedes comenzar una nueva.','info');return false;}
    const original=pedidos.map(p=>({...p})),originalStart=localStorage.getItem('domicilio-shift-start');
    try{
      const archive=archiveShift(original,originalStart||new Date().toISOString(),new Date().toISOString());
      window.domicilioNav?.stop?.();
      pedidos.splice(0,pedidos.length);
      // Solo liberar pedidos activos: no borrar knownAddresses, reglas ni ubicaciones aprendidas.
      pedidoMarkers.forEach(marker=>{if(mapInstance?.hasLayer(marker))mapInstance.removeLayer(marker)});
      pedidoMarkers.clear();
      if(routeLine&&mapInstance?.hasLayer(routeLine))mapInstance.removeLayer(routeLine);
      routeLine=null;
      localStorage.setItem('domicilio-shift-start',new Date().toISOString());
      saveState();
      const check=JSON.parse(localStorage.getItem('domicilios-cienaga-state')||'{}');
      if(!Array.isArray(check.orders)||check.orders.length)throw new Error('La lista no pudo guardarse limpia');
      renderPedidoList();window.v3Refresh?.();drawHistory();window.v3Navigate?.('history');
      showToast(`Jornada archivada: ${archive.orders.length} pedidos. Lista lista para una jornada nueva.`, 'success',6000);
      return true;
    }catch(e){
      pedidos.splice(0,pedidos.length,...original);
      if(originalStart)localStorage.setItem('domicilio-shift-start',originalStart);
      saveState();renderPedidoList();window.v3Refresh?.();
      showToast('No se pudo finalizar sin riesgo de pérdida: '+e.message,'danger',7000);return false;
    }
  }
  function drawHistory(){
    const host=$('v53-history');if(!host)return;
    host.replaceChildren();
    const history=readHistory().slice().reverse();
    if(!history.length){const p=document.createElement('p');p.textContent='Todavía no hay jornadas finalizadas. Al finalizar una, aparecerá aquí con todos los pedidos.';host.appendChild(p);return;}
    for(const shift of history){
      const details=document.createElement('details');details.className='v53-day';
      const total=shift.orders.length,done=shift.orders.filter(p=>p.status==='entregado').length;
      const summary=document.createElement('summary');
      const date=new Date(shift.endedAt);
      summary.textContent=`${Number.isNaN(+date)?'Fecha desconocida':date.toLocaleDateString('es-CO',{year:'numeric',month:'long',day:'numeric'})} · ${total} pedidos · ${done} entregados · ${total-done} no realizados`;
      details.appendChild(summary);
      const list=document.createElement('ol');
      shift.orders.forEach(p=>{
        const li=document.createElement('li');
        const status=p.status==='entregado'?'Entregado':p.status==='fallido'?'No entregado':'No realizado';
        li.textContent=`#${p.number} · ${p.name||'Cliente'} · ${p.address||'Sin dirección'}${p.reference?' · '+p.reference:''} · ${status}${p.failedReason?' ('+p.failedReason+')':''}`;
        list.appendChild(li);
      });details.appendChild(list);host.appendChild(details);
    }
  }
  function onDelivered(_p){
    // Solo el navegador puede registrar origen desde GPS con precisión real.
    // No confirmar coordenadas inventando una precisión.
  }
  function advanceAfterDelivery(){
    const next=getRoutePedidos()[0];
    if(!next)return;
    showToast(`Siguiente #${next.number}: ${next.address||'dirección pendiente'}${Number.isFinite(next.lat)&&Number.isFinite(next.lng)?'':' · sin GPS'}`,'info',6500);
    if($('nav-v4-auto-next')?.checked && !window.domicilioNav?.currentTargetId?.())window.domicilioNav?.start?.(next);
  }

  function ask(){
    const q=($('v53-question')?.value||'').toLowerCase(),out=$('v53-answer');if(!out)return;
    if(!q.trim()){out.textContent='Escribe una pregunta sobre DOMICILIO.';return;}
    if(/gps|ubicaci[oó]n|localiz|coordenada/.test(q))out.textContent='Activa la ubicación en Chrome. Si el sistema no encuentra un domicilio, guarda su posición desde «Estoy en esta dirección» estando detenido en el lugar. No se inventan coordenadas.';
    else if(/optim|orden|ruta|recorrido/.test(q))out.textContent='En Rutas, usa «Optimizar toda mi ruta». Compara las ubicaciones conocidas y propone un orden aproximado para los domicilios sin GPS. Revisa y aprueba el resultado antes de navegar.';
    else if(/historial|jornada|finaliz|borrar|elimin/.test(q))out.textContent='Finalizar jornada archiva todos los pedidos, incluidos los no realizados, y limpia la lista activa. Optimizar no borra pedidos. Puedes exportar tus datos desde Configuración.';
    else if(/editar|fallid|entreg/.test(q))out.textContent='Abre Pedidos y despliega la tarjeta. Puedes editar sin GPS, marcar entregado, registrar fallido o anular. Las acciones guardan cambios en la jornada actual.';
    else if(/mapa|direcci[oó]n/.test(q))out.textContent='El mapa principal es para consultar. Solo permite marcar un punto cuando eliges expresamente «Cambiar ubicación» o «Seleccionar dirección en el mapa».';
    else out.textContent='Puedo ayudarte a usar GPS, rutas, direcciones, pedidos, historial y configuración. Este asistente funciona con reglas locales; no es una IA generativa.';
  }
  window.domicilioV53={readHistory,restoreHistory,finishShift,drawHistory,onDelivered,advanceAfterDelivery};
  $('v53-ask')?.addEventListener('click',ask);
  $('v53-question')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();ask();}});
  document.querySelectorAll('[data-nav="history"]').forEach(b=>b.addEventListener('click',drawHistory));
  $('menu-goto-history')?.addEventListener('click',drawHistory);
  drawHistory();
})();
