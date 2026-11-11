/* DOMICILIO V5 — un solo flujo, no elimina pedidos cuando falta GPS. Sin servicios de pago. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const valid = p => Number.isFinite(p?.lat) && Number.isFinite(p?.lng) && Math.abs(p.lat)<=90 && Math.abs(p.lng)<=180 && !p.needsLocationReview;
  const sig = entries => entries.map(p => [p.id,p.name,p.address,p.reference,p.lat,p.lng,p.priority,p.status].join(':')).join('|');
  const norm = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
  const key = s => norm(window.domicilioNormalizeAddress?.(s)||s);
  const notice = (s,error=false) => { const el=$('v5-plan-status'); if(el){el.textContent=s;el.style.color=error?'#b91c1c':'';} const bulk=$('bulk-status');if(bulk)bulk.textContent=s; };
  const rules = [
    'Una sola optimización revisa todos los pedidos e importa la lista nueva, sin perder domicilios si no aparece GPS.',
    'La dirección escrita es válida aunque no esté cartografiada; solo se da guía por calles para coordenadas comprobables.',
    'Una ubicación GPS se aprende al llegar, con precisión aceptable, consentimiento explícito y confirmación del repartidor.',
    'Después de cada entrega, el GPS real es el origen; si no está disponible, usar último lugar confirmado y advertir.',
    'Comparar el coste de la ruta completa por carreteras y sentidos únicos disponibles, no solo el siguiente punto.',
    'La lista por nomenclatura para direcciones sin ubicación es aproximada y nunca se anuncia como ruta GPS exacta.',
    'Separa índices 1., 2., 3., nombres, direcciones, barrio, apartamento y esquina; no inventa datos ambiguos.',
    'La ruta en curso y la próxima entrega no cambian sin autorización; los pedidos terminados quedan excluidos.',
    'Un único botón Optimizar toda mi ruta prepara la lista, la propuesta y dibuja automáticamente la geometría disponible.',
    'No anunciar direcciones rectas continuamente: aviso de giro a unos 100 m, 50 m y cuando se alcanza el cruce.',
    'No afirmar tráfico, policía o cierres en tiempo real si no hay fuente pública fiable de dichos eventos.',
    'El regreso a Casa o base respeta sentidos de circulación conocidos y se calcula como trayecto propio.'
  ];
  function installRules(){
    const existing=new Set(learnedRules.map(r=>r.text));let added=false;
    for(const text of rules) if(!existing.has(text)){learnedRules.push({id:generatePedidoId(),text,source:'v5-default',createdAt:new Date().toISOString()});added=true;}
    if(added){saveState();window.v3Refresh?.();}
  }
  // El número de casa de una dirección no ofrece coordenadas confiables por sí solo.
  function nomenclature(p){
    const m=String(p.address||'').match(/\b(calle|carrera)\s+(\d+[a-z]?)\s*(?:#\s*(\d+[a-z]?))?/i);
    return m?{street:m[1].toLowerCase(),a:parseInt(m[2],10)||0,b:parseInt(m[3]||'0',10)||0}:null;
  }
  function approximateOrder(items, anchored=[]) {
    // Para puntos sin coordenadas: cuadrícula aproximada Calle/Carrera,
    // NO distancia real. Mantener los urgentes primero.
    const rank={urgente:0,prioritario:1,normal:2};
    const remaining=[...items], ordered=[];
    const lastDelivered=[...pedidos].reverse().find(p=>p.status==='entregado'&&nomenclature(p));
    let cursor=nomenclature(anchored.at(-1)||lastDelivered||remaining[0]);
    const grid=q=>q.street==='calle'?[q.b,q.a]:[q.a,q.b];
    while(remaining.length){
      let index=0,best=Infinity;
      remaining.forEach((p,i)=>{
        const x=nomenclature(p), priority=(rank[p.priority]??2)*1e5;
        const metric=x&&cursor?Math.abs(grid(x)[0]-grid(cursor)[0])+Math.abs(grid(x)[1]-grid(cursor)[1]):1e4;
        if(priority+metric<best){best=priority+metric;index=i;}
      });
      const next=remaining.splice(index,1)[0];ordered.push(next);cursor=nomenclature(next)||cursor;
    }
    return ordered;
  }
  const delay=ms=>new Promise(r=>setTimeout(r,ms));
  async function findLocation(address){
    const url='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&countrycodes=co&q='+encodeURIComponent(address+', Ciénaga, Magdalena, Colombia');
    const r=await fetch(url,{signal:AbortSignal.timeout(11000)});
    if(!r.ok)throw Error('Servicio de ubicación temporalmente no disponible');
    const hits=await r.json();
    // NO asignar automáticamente un resultado dudoso: solo puntos previamente confirmados.
    return hits.length?`Encontramos ${hits.length} coincidencia(s) para «${address}», pero requieren confirmación`:null;
  }
  const findSaved = address => knownAddresses.find(x=>key(x.address)===key(address)&&valid(x));
  const geolocate = () => new Promise(resolve=>{
    if(!navigator.geolocation){resolve(null);return;}
    navigator.geolocation.getCurrentPosition(pos => resolve({coords:[pos.coords.latitude,pos.coords.longitude],accuracy:pos.coords.accuracy,time:Date.now()}),()=>resolve(null),{enableHighAccuracy:true,maximumAge:4000,timeout:11000});
  });
  let lastConfirmed=null;
  try{lastConfirmed=JSON.parse(localStorage.getItem('domicilio-v5-last-confirmed')||'null');}catch(_){}
  function currentOrigin(gps){
    if(gps && gps.accuracy<=100) return {point:gps.coords,label:'Tu GPS actual'};
    if(Array.isArray(lastConfirmed?.coords))return {point:lastConfirmed.coords,label:'Último domicilio confirmado; GPS actual no disponible'};
    return {point:[...startLocation],label:'Punto de salida configurado; GPS actual no disponible'};
  }
  function panel(source='routes'){
    let p=$('v5-proposal');
    if(!p){p=document.createElement('section');p.id='v5-proposal';p.className='v5-plan-panel';p.setAttribute('aria-live','polite');}
    const anchor=(source==='orders' ? $('bulk-status') : $('v5-plan-status')) || $('bulk-status');
    anchor?.insertAdjacentElement('afterend',p);
    return p;
  }
  function text(tag,msg){const el=document.createElement(tag);el.textContent=msg;return el;}
  function appendOrderList(container,items){
    const ol=document.createElement('ol');
    items.forEach(p=>{const li=document.createElement('li');li.textContent=`${p.name||'Cliente por identificar'} — ${p.address||'Dirección pendiente'}${p.reference?' · '+p.reference:''} ${valid(p)?'· GPS disponible':'· sin GPS (orden aproximado)'}`;ol.appendChild(li);});
    container.appendChild(ol);
  }
  async function calculateKnown(known,origin,destination,lockedId){
    if(!known.length)return {order:[],minutes:null,geometryCount:0};
    if(known.length>35){
      // Degradación controlada: no sobrecargar la API pública con una matriz gigante.
      const rad=x=>x*Math.PI/180;
      const hav=(a,b)=>{const dlat=rad(b[0]-a[0]),dlng=rad(b[1]-a[1]);const h=Math.sin(dlat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dlng/2)**2;return 12742*Math.asin(Math.min(1,Math.sqrt(h)));};
      const points=[origin,...known.map(p=>[p.lat,p.lng]),...(destination?[destination]:[])];
      const matrix=points.map(a=>points.map(b=>hav(a,b)));
      const ids=known.map((_,i)=>i+1);
      const ranks=Object.fromEntries(known.map((p,i)=>[i+1,p.priority==='urgente'?0:p.priority==='prioritario'?1:2]));
      const locked=lockedId?ids.find(i=>known[i-1].id===lockedId):null;
      const indices=window.domicilioRouteOptimizer.withPriority(ids,matrix,destination?points.length-1:null,ranks,locked||null);
      return {order:indices.map(i=>known[i-1]),minutes:null,approx:true};
    }
    const coords=[origin,...known.map(p=>[p.lat,p.lng]),...(destination?[destination]:[])];
    const url='https://router.project-osrm.org/table/v1/driving/'+coords.map(c=>`${c[1]},${c[0]}`).join(';')+'?annotations=duration';
    const r=await fetch(url,{signal:AbortSignal.timeout(18000)});
    if(!r.ok)throw Error('No se pudo consultar el cálculo de rutas por calles');
    const data=await r.json();if(data.code!=='Ok'||!data.durations)throw Error('La red vial no devolvió tiempos para todas las paradas');
    const ids=known.map((_,i)=>i+1);
    const ranks=Object.fromEntries(known.map((p,i)=>[i+1,p.priority==='urgente'?0:p.priority==='prioritario'?1:2]));
    const locked=lockedId?ids.find(i=>known[i-1].id===lockedId):null;
    // Los pedidos urgentes se priorizan; la matriz dirigida respeta las calles de un solo sentido registradas.
    const sorted=window.domicilioRouteOptimizer.withPriority(ids,data.durations,destination?coords.length-1:null,ranks,locked||null);
    const seconds=window.domicilioRouteOptimizer.cost(sorted,data.durations,destination?coords.length-1:null);
    return {order:sorted.map(i=>known[i-1]),minutes:Number.isFinite(seconds)?Math.round(seconds/60):null};
  }
  let busy=false, generation=0;
  async function optimize({afterDelivery=false,source='routes'}={}){
    if(busy)return;
    busy=true;const version=++generation;
    const buttons=[$('v5-optimize-all'),$('v5-optimize-orders')].filter(Boolean);
    buttons.forEach(b=>b.disabled=true);
    const visual=panel(source);visual.replaceChildren();
    try{
      notice('Preparando toda la jornada y comprobando ubicaciones conocidas…');
      const old=getRoutePedidos();
      const incoming=afterDelivery?[]:(window.domicilioBulkV5?.getDraft()||[]);
      const keys=new Set(old.map(p=>key(p.address)+'|'+norm(p.name)));
      const newRows=[];
      for(const raw of incoming){
        const sep=window.domicilioSeparatePedidoFields?.(raw.name,raw.address,raw.reference)||raw;
        const addr=window.domicilioNormalizeAddress?.(sep.address)||sep.address;
        const k=key(addr)+'|'+norm(sep.name);
        if(!addr||keys.has(k))continue;keys.add(k);
        const saved=findSaved(addr);
        const manual = raw.checked && Number.isFinite(raw.lat) && Number.isFinite(raw.lng) &&
          /^Ubicación (elegida manualmente|seleccionada)/i.test(raw.issue||'');
        newRows.push({id:generatePedidoId(),number:Math.max(0,...pedidos.map(p=>Number(p.number)||0))+newRows.length+1,
          name:sep.name,address:addr,reference:sep.reference||'',priority:raw.priority||'normal',
          lat:saved?saved.lat:(manual?raw.lat:null),lng:saved?saved.lng:(manual?raw.lng:null),status:'pendiente',createdAt:new Date().toISOString(),
          locationStatus:saved?'confirmada':(manual?'ubicación seleccionada':'pendiente')});
      }
      const corrected=old.map(p=>{
        const x=window.domicilioSeparatePedidoFields?.(p.name,p.address,p.reference);
        const q=x?{...p,name:x.name,address:x.address,reference:x.reference}:({...p});
        if(x?.address!==p.address){q.needsLocationReview=true;q.lat=null;q.lng=null;}
        return q;
      });
      const gps=await geolocate();const from=currentOrigin(gps);
      if(gps?.accuracy<=100) gpsPosition=[...gps.coords];
      const entries=[...corrected,...newRows];
      if(!entries.length){notice('Primero agrega o pega al menos un domicilio.',true);return;}
      for(const p of entries){if(!valid(p)){const saved=findSaved(p.address);if(saved){p.lat=saved.lat;p.lng=saved.lng;p.needsLocationReview=false;p.locationStatus='confirmada';}}}
      const known=entries.filter(valid),missing=entries.filter(x=>!valid(x));
      const destination=window.v3Destination?.point || ((window.v3Destination?.mode==='start'||$('return-to-start')?.checked)?startLocation:null);
      const lockedId=window.domicilioNav?.currentTargetId?.()||null;
      let result={order:[],minutes:null},warning='';
      if(known.length){
        notice(`Organizando ${known.length} ubicaciones por calles. ${missing.length} dirección(es) quedarán en la lista sin GPS.`);
        try{result=await calculateKnown(known,from.point,destination,lockedId);if(result.approx)warning='Lista grande: orden aproximado por proximidad GPS; no equivale a tiempos por calles.';}catch(e){warning=e.message;result.order=approximateOrder(known);}
      }
      const unknown=approximateOrder(missing,result.order);
      // Sin GPS no se pueden comparar distancias exactas entre conocidos y desconocidos.
      // Se mantiene la navegación activa, y se conserva el resto con orden provisional.
      const proposed=[...result.order,...unknown];
      if(!proposed.length)throw Error('No se encontraron pedidos para organizar');
      const snapshot=sig(old);
      visual.replaceChildren(text('h3','Propuesta de toda tu jornada'));
      visual.appendChild(text('p',`${proposed.length} entregas: ${known.length} con ubicación y ${missing.length} sin GPS. Origen: ${from.label}.`));
      if(result.minutes!==null)visual.appendChild(text('p',`Tiempo estimado de los destinos con GPS: ${result.minutes} minutos, sin tiempo de entrega ni tráfico en vivo.`));
      if(warning)visual.appendChild(text('p','No se pudo calcular por calles: '+warning+'. Se conserva el orden provisional.'));
      if(missing.length)visual.appendChild(text('p','Aviso: el orden de domicilios sin GPS es aproximado, según su nomenclatura. No es una ruta verificable hasta registrar su ubicación.'));
      appendOrderList(visual,proposed);
      const accept=text('button','✓ Aprobar, guardar y mostrar ruta');accept.type='button';accept.className='btn btn-purple-primary';
      const cancel=text('button','Conservar mi orden');cancel.type='button';cancel.className='btn btn-outline';
      cancel.onclick=()=>{visual.replaceChildren();notice('No se modificaron tus pedidos.');};
      accept.onclick=async()=>{
        if(sig(getRoutePedidos())!==snapshot){notice('La lista cambió. Vuelve a optimizar antes de aprobar.',true);return;}
        if(lockedId && proposed[0]?.id!==lockedId){notice('La entrega en navegación debe permanecer primero. Vuelve a optimizar.',true);return;}
        if(!confirm(`¿Aplicar este orden a ${proposed.length} entregas? Los ${missing.length} pedidos sin GPS también se guardarán. Los cambios de texto propuestos no pueden deshacerse automáticamente.`))return;
        const finished=pedidos.filter(p=>p.status==='entregado'||p.status==='fallido');
        pedidos.splice(0,pedidos.length,...finished,...proposed);
        proposed.filter(valid).forEach(p=>updatePedidoMarker(p));
        saveState();renderPedidoList();window.v3Refresh?.();
        window.domicilioBulkV5?.clear();
        visual.replaceChildren(text('p','Tu lista está organizada. El mapa mostrará los puntos localizados; los restantes siguen pendientes de GPS.'));
        if(known.length){await calculateRoute();window.v3Navigate?.('map');}
        else window.v3Navigate?.('orders');
        notice('Jornada actualizada. Comprueba las ubicaciones y comienza tu recorrido.');
      };
      visual.append(accept,cancel);
      notice('Propuesta lista para revisar y aprobar.');
    }catch(e){visual.replaceChildren(text('p','No se modificó tu jornada: '+e.message));notice('No se pudo completar la optimización: '+e.message,true);}
    finally{if(version===generation){busy=false;buttons.forEach(b=>b.disabled=false);}}
  }
  async function captureAtOrder(p){
    if(!p)return;
    if(!confirm(`Estando detenido en el domicilio, ¿quieres obtener tu GPS para asociarlo al pedido #${p.number}?`))return;
    const gps=await geolocate();
    if(!gps){showToast('GPS no disponible. Comprueba permisos y señal.','danger');return;}
    if(gps.accuracy>50){showToast(`Precisión de ±${Math.round(gps.accuracy)} m. Se requiere señal mejor (50 m o menos).`,'warning',6500);return;}
    const [lat,lng]=gps.coords;
    if(!confirm(`¿Confirmas que esta es la ubicación real de ${p.address}?\n\nLat: ${lat.toFixed(6)}\nLon: ${lng.toFixed(6)}\nPrecisión aproximada: ±${Math.round(gps.accuracy)} m\n\nNo confirmes desde otra casa.`))return;
    p.lat=lat;p.lng=lng;p.needsLocationReview=false;p.locationStatus='confirmada';p.verifiedAt=new Date().toISOString();
    const existing=knownAddresses.findIndex(a=>key(a.address)===key(p.address));
    const saved={address:p.address,lat,lng,accuracy:gps.accuracy,verifiedAt:p.verifiedAt,source:'gps-confirmado'};
    if(existing>=0)knownAddresses.splice(existing,1,saved);else knownAddresses.push(saved);
    lastConfirmed={coords:[lat,lng],at:p.verifiedAt};
    try{localStorage.setItem('domicilio-v5-last-confirmed',JSON.stringify(lastConfirmed));}catch(_){}
    updatePedidoMarker(p);saveState();renderPedidoList();window.v3Refresh?.();
    showToast('Ubicación aprendida y guardada para futuras entregas.','success',6000);
  }
  // Reoptimizar en una propuesta, jamás alterar silenciosamente la ruta activa.
  window.domicilioSuggestAfterDelivery=()=>{if(getRoutePedidos().length>=2){optimize({afterDelivery:true});showToast('Revisando una posible mejora para los pedidos pendientes.','info');}};
  window.domicilioV5={optimize,captureAtOrder,approximateOrder,valid,get lastConfirmed(){return lastConfirmed;}};
  [$('v5-optimize-all'),$('v5-optimize-orders')].filter(Boolean).forEach(btn=>btn.addEventListener('click',()=>optimize({source:btn.id==='v5-optimize-orders'?'orders':'routes'})));
  $('v5-mobile-end-shift')?.addEventListener('click',()=>$('menu-end-shift')?.click());
  installRules();
})();
