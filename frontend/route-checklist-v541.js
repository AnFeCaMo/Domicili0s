/* DOMICILIO V5.4.1 — lista independiente de GPS, sincronizada con el orden aprobado. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const label=(tag,content,klass)=>{const el=document.createElement(tag);if(klass)el.className=klass;el.textContent=content;return el;};
  function finish(p,delivered){
    if(!p||['entregado','fallido'].includes(p.status))return;
    const reason=delivered?'':prompt(`Motivo de no entregar el pedido #${p.number}:`,'Cliente no se encontraba');
    if(reason===null)return;
    if(delivered && !confirm(`¿Confirmar pedido #${p.number} como entregado?`))return;
    const now=new Date().toISOString();
    if(delivered){p.status='entregado';p.deliveredAt=now;p.failedReason='';window.domicilioV53?.onDelivered?.(p);}
    else{p.status='fallido';p.failedAt=now;p.failedReason=reason.trim()||'No entregado';}
    window.v3Audit ||= [];
    window.v3Audit.push({at:now,action:delivered?'Entrega completada':'Entrega no realizada',details:`Pedido #${p.number}${!delivered?' — '+p.failedReason:''}`});
    if(window.domicilioNav?.currentTargetId?.()===p.id)window.domicilioNav?.stop?.();
    updatePedidoMarker(p);saveState();renderPedidoList();window.v3Refresh?.();window.dispatchEvent(new Event('domicilio:v56-update'));
    // La lista permite continuar manualmente sin abrir navegador ni forzar el mapa.
    if(!getRoutePedidos().length)showToast('Se registraron todos los pedidos de la jornada.','success');
  }
  function render(){
    const host=$('route-checklist');if(!host)return;
    const pending=getRoutePedidos();host.replaceChildren();
    const count=$('route-checklist-count');if(count)count.textContent=`(${pending.length} pendientes)`;
    if(!pending.length){host.appendChild(label('li','No tienes entregas pendientes. Agrega pedidos o comienza una nueva jornada.','route-checklist-empty'));return;}
    pending.forEach((p,index)=>{
      const item=document.createElement('li');item.className='route-checklist-item';
      if(window.domicilioNav?.currentTargetId?.()===p.id)item.classList.add('is-active');
      const head=label('div','','route-checklist-head');
      const number=label('span',String(index+1),'route-checklist-sequence');
      const info=label('div','','route-checklist-info');
      info.append(label('strong',p.name?.trim()||'Cliente sin nombre'),label('p',p.address?.trim()||'Dirección pendiente'));
      if(p.reference)info.appendChild(label('p',`Referencia: ${p.reference}`,'route-checklist-note'));
      const located=Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&!p.needsLocationReview;
      const verification=window.domicilioV55?.status(p)||'pendiente';
      const zone=window.domicilioV56?.sector?.(p);if(zone)info.appendChild(label('div',zone==='centro'?'Sector: Centro (orientativo)':zone==='calles-altas'?'Sector: Calles altas (orientativo)':'Sector por verificar','route-checklist-note'));
      info.appendChild(label('div',verification==='confirmada'?'Ubicación confirmada':verification==='aproximada'?'Punto aproximado: verifica la vivienda':'Sin GPS: puedes entregar desde la lista','route-checklist-note'));
      head.append(number,info);item.appendChild(head);
      const actions=label('div','','route-checklist-actions');
      const nav=label('button',located?'Ver ruta':'Ver pedido');nav.type='button';nav.addEventListener('click',()=>window.domicilioNav?.start?.(p));
      const done=label('button','✓ Entregado','route-checklist-done');done.type='button';done.addEventListener('click',()=>finish(p,true));
      const failed=label('button','No entregado','route-checklist-failed');failed.type='button';failed.addEventListener('click',()=>finish(p,false));
      actions.append(nav,done,failed);item.appendChild(actions);host.appendChild(item);
    });
  }
  window.domicilioRefreshRouteList=render;
  render();
  document.querySelectorAll('[data-nav="routes"]').forEach(b=>b.addEventListener('click',render));
})();
