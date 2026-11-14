/* DOMICILIO V5.6 — supervisor de jornada, sectorización orientativa, voz y recuperación.
   Nunca inventa coordenadas. Los cambios de orden requieren confirmación explícita.
   No sustituye un enrutador vial ni asegura disponibilidad de mapas sin Internet. */
(function(root){
  'use strict';
  const $=id=>document.getElementById(id);
  const KEY='domicilio-v56-recovery';
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const pending=()=>typeof getRoutePedidos==='function'?getRoutePedidos().filter(p=>p.status!=='anulado'):[];
  const text=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;};
  const complete=p=>['entregado','fallido','anulado'].includes(p.status);
  function street(p){return root.domicilioV55?.parts?.(p.address)||null;}
  function sector(p){
    const q=street(p);if(!q||!q.complete)return 'sin-determinar';
    // La Troncal cambia de denominación según el tramo; no inferir un lado sin mapa.
    // El umbral de calle es una agrupación NOMINAL, nunca una ubicación verificada.
    if(q.type==='calle')return Number.parseInt(q.main,10)>=21?'calles-altas':'centro';
    if(q.type==='carrera'&&q.cross)return Number.parseInt(q.cross,10)>=21?'calles-altas':'centro';
    return 'sin-determinar';
  }
  function coords(p){return Number.isFinite(p?.lat)&&Number.isFinite(p?.lng)&&!p.needsLocationReview;}
  function distance(a,b){
    if(!coords(a)||!coords(b))return Infinity;
    const rad=Math.PI/180,lat=(a.lat+b.lat)/2*rad;
    return Math.hypot((a.lat-b.lat)*111195,(a.lng-b.lng)*111195*Math.cos(lat));
  }
  function gridDistance(a,b){
    const x=street(a),y=street(b);
    if(!x?.complete||!y?.complete)return Infinity;
    const xy=q=>q.type==='calle'?[parseInt(q.main,10),parseInt(q.cross,10)]:[parseInt(q.cross,10),parseInt(q.main,10)];
    const u=xy(x),v=xy(y);return Math.abs(u[0]-v[0])+Math.abs(u[1]-v[1]);
  }
  function nearestOrder(items,start=null){
    let list=[...items],result=[],cursor=start;
    while(list.length){
      let best=0,score=Infinity;
      list.forEach((p,i)=>{const value=cursor?(Number.isFinite(distance(cursor,p))?distance(cursor,p):gridDistance(cursor,p)):i*0.00001;
        if(value<score){best=i;score=value;}});
      const next=list.splice(best,1)[0];result.push(next);cursor=next;
    }
    return result;
  }
  function proposeSectors(items){
    const activeId=root.domicilioNav?.currentTargetId?.();
    const locked=activeId?items.find(p=>p.id===activeId):null;
    const rest=items.filter(p=>p!==locked);
    // Priorizar el sector inicial, minimizar cruces repetidos; no cambiar orden automático.
    const grouped={centro:[], 'calles-altas':[], 'sin-determinar':[]};
    rest.forEach(p=>grouped[sector(p)].push(p));
    const current=locked||rest[0];const first=sector(current);
    const zones=first==='calles-altas'?['calles-altas','centro','sin-determinar']:['centro','calles-altas','sin-determinar'];
    const out=locked?[locked]:[];
    for(const zone of zones)out.push(...nearestOrder(grouped[zone],out.at(-1)||null));
    return out;
  }
  function snapshot(){
    const raw=localStorage.getItem('domicilios-cienaga-state');
    if(!raw)return null;
    try{const value=JSON.parse(raw);return Array.isArray(value.orders)?value:null;}catch(_){return null;}
  }
  function keepRecovery(){
    const data=snapshot();if(!data)return false;
    try{localStorage.setItem(KEY,JSON.stringify({at:new Date().toISOString(),state:data}));return true;}catch(_){return false;}
  }
  function applyOrder(order){
    if(!Array.isArray(order)||order.length<2)return false;
    const current=pending();const ids=x=>x.map(p=>p.id).sort().join('|');
    if(ids(current)!==ids(order))return false;
    const activeId=root.domicilioNav?.currentTargetId?.();
    if(activeId&&order[0]?.id!==activeId)return false;
    keepRecovery();
    const indices=new Map(order.map((p,i)=>[p.id,i]));
    const unfinished=pedidos.filter(p=>!complete(p));
    const sorted=[...unfinished].sort((a,b)=>(indices.get(a.id)??Infinity)-(indices.get(b.id)??Infinity));
    let cursor=0;
    for(let i=0;i<pedidos.length;i++)if(!complete(pedidos[i]))pedidos[i]=sorted[cursor++];
    saveState();renderPedidoList();root.v3Refresh?.();root.domicilioRefreshRouteList?.();
    return true;
  }
  function stats(){
    const rows=Array.isArray(pedidos)?pedidos:[];
    const delivered=rows.filter(p=>p.status==='entregado').length;
    const failed=rows.filter(p=>p.status==='fallido').length;
    const outstanding=rows.filter(p=>!complete(p)).length;
    const verified=rows.filter(p=>root.domicilioV55?.status?.(p)==='confirmada').length;
    const bySector={centro:0,'calles-altas':0,'sin-determinar':0};
    rows.filter(p=>!complete(p)).forEach(p=>bySector[sector(p)]++);
    return {delivered,failed,outstanding,verified,bySector};
  }
  function speak(value){
    if(!('speechSynthesis'in root))return false;
    root.speechSynthesis.cancel();const speech=new SpeechSynthesisUtterance(String(value));speech.lang='es-CO';speech.rate=1;
    root.speechSynthesis.speak(speech);return true;
  }
  function helpMessage(){return 'Puedes decir: siguiente dirección; estado de la jornada; entregar pedido uno; no entregado pedido dos; optimizar toda mi ruta.';}
  function processVoice(command){
    const input=norm(command).replace(/[.,;!?]/g,' ');
    const rows=pending();
    if(/siguiente (direccion|pedido|entrega)/.test(input)){
      const p=rows[0];const msg=p?`Siguiente entrega: ${p.name||'Cliente'}. ${p.address}.`:'No quedan pedidos pendientes.';
      speak(msg);return {action:'read-next',message:msg};
    }
    if(/(estado|resumen) (de )?(la )?jornada/.test(input)){
      const s=stats();const msg=`${s.outstanding} pendientes, ${s.delivered} entregados y ${s.failed} no entregados.`;
      speak(msg);return {action:'read-stats',message:msg};
    }
    if(/optimizar|reordenar/.test(input)){
      const btn=$('v56-sectors');btn?.click();return {action:'propose',message:'Propuesta abierta para revisar y aprobar.'};
    }
    const m=input.match(/(?:entregar|entregado|no entregado|fallido)(?: (?:el )?pedido)?\s+(\d{1,3})/);
    if(m){
      const n=Number(m[1]),p=rows[n-1];if(!p)return {action:'error',message:'No existe ese número de entrega pendiente.'};
      // Nunca ejecutar cambios a pedidos solo por transcripción; botón del listado y confirmación.
      const msg=`Revisa y confirma manualmente en la lista el pedido ${n}: ${p.name||'Cliente'}, ${p.address}.`;
      speak(msg);p.id&&typeof document!=='undefined'&&document.getElementById('route-checklist')?.scrollIntoView({behavior:'smooth',block:'nearest'});
      return {action:'confirm-manually',message:msg};
    }
    return {action:'unknown',message:helpMessage()};
  }
  function render(){
    const host=$('v56-tools');if(!host)return;
    const s=stats();const report=$('v56-stats');
    if(report)report.textContent=`${s.outstanding} pendientes · ${s.delivered} entregados · ${s.failed} no entregados · ${s.verified} ubicaciones confirmadas`;
    const sectors=$('v56-sectors-count');
    if(sectors)sectors.textContent=`Centro: ${s.bySector.centro}; calles altas: ${s.bySector['calles-altas']}; por revisar: ${s.bySector['sin-determinar']}. Clasificación orientativa por nomenclatura.`;
  }
  function showProposal(){
    const rows=pending(),container=$('v56-proposal');if(!container)return;
    container.replaceChildren();if(rows.length<2){container.append(text('p','Necesitas dos o más pendientes para proponer un nuevo orden.'));return;}
    const ordered=proposeSectors(rows),initial=rows.map(p=>p.id).join('|');
    container.append(text('strong','Propuesta orientativa por sectores; revisa la ubicación de cada domicilio.'));
    const list=document.createElement('ol');
    ordered.forEach(p=>list.append(text('li',`${p.name||'Cliente'} — ${p.address||'Dirección pendiente'} · ${sector(p)==='calles-altas'?'Calles altas':sector(p)==='centro'?'Centro':'Sector por verificar'}`)));
    container.append(list);
    const unchanged=ordered.every((p,i)=>p.id===rows[i].id);
    if(unchanged){container.append(text('p','El orden propuesto coincide con la lista actual.'));return;}
    const btn=text('button','Aprobar nuevo orden');btn.type='button';btn.className='btn btn-purple-primary btn-sm';
    btn.onclick=()=>{
      if(pending().map(p=>p.id).join('|')!==initial){container.replaceChildren(text('p','La lista cambió. Solicita una nueva propuesta.'));return;}
      if(!confirm('¿Aprobar el orden propuesto? La sectorización es aproximada y los puntos sin GPS requieren comprobación.'))return;
      if(applyOrder(ordered))container.replaceChildren(text('p','Orden aprobado y sincronizado con lista y mapa.'));
      else container.replaceChildren(text('p','No se pudo aplicar. Vuelve a calcular la propuesta.'));
    };container.append(btn);
  }
  function recover(){
    let stored;try{stored=JSON.parse(localStorage.getItem(KEY)||'null');}catch(_){stored=null;}
    if(!Array.isArray(stored?.state?.orders))return alert('No hay una copia de recuperación válida.');
    if(!confirm(`¿Restaurar la copia de ${stored.at}? Esto reemplaza la jornada actual. Exporta un respaldo JSON antes de continuar.`))return;
    try{localStorage.setItem('domicilios-cienaga-state',JSON.stringify(stored.state));location.reload();}catch(_){alert('No se pudo restaurar: falta espacio de almacenamiento.');}
  }
  function startVoice(){
    const SR=root.SpeechRecognition||root.webkitSpeechRecognition;
    if(!SR)return alert('Reconocimiento de voz no disponible. Usa Chrome compatible o los botones de la lista.');
    const recognizer=new SR();recognizer.lang='es-CO';recognizer.interimResults=false;recognizer.maxAlternatives=1;
    recognizer.onresult=e=>{const result=processVoice(e.results[0][0].transcript);const feedback=$('v56-voice-feedback');if(feedback)feedback.textContent=result.message;};
    recognizer.onerror=e=>{const feedback=$('v56-voice-feedback');if(feedback)feedback.textContent='Micrófono: '+e.error;};
    recognizer.start();
  }
  function attach(){
    $('v56-sectors')?.addEventListener('click',showProposal);
    $('v56-voice')?.addEventListener('click',startVoice);
    $('v56-recover')?.addEventListener('click',recover);
    $('v56-speak-next')?.addEventListener('click',()=>processVoice('siguiente direccion'));
    render();
    // Repintar en las mismas actualizaciones que recibe la lista, sin cronómetro/GPS adicionales.
    root.addEventListener('domicilio:v56-update',render);
    document.querySelectorAll('[data-nav="routes"]').forEach(b=>b.addEventListener('click',render));
  }
  root.domicilioV56={sector,proposeSectors,nearestOrder,stats,processVoice,applyOrder,keepRecovery,render};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.domicilioV56;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
  }
})(typeof window!=='undefined'?window:globalThis);
