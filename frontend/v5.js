/* DOMICILIO V5 — un solo flujo, no elimina pedidos cuando falta GPS. Sin servicios de pago. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const valid = p => Number.isFinite(p?.lat) && Number.isFinite(p?.lng) && Math.abs(p.lat)<=90 && Math.abs(p.lng)<=180 && !p.needsLocationReview;
  const sig = entries => entries.map(p => [p.id,p.name,p.address,p.reference,p.lat,p.lng,p.priority,p.status,p.needsLocationReview,p.locationStatus].join(':')).join('|');
  const norm = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
  const key = s => norm(window.domicilioNormalizeAddress?.(s)||s);
  const notice = (s,error=false) => { const el=$('v5-plan-status'); if(el){el.textContent=s;el.style.color=error?'#b91c1c':'';} const bulk=$('bulk-status');if(bulk)bulk.textContent=s; };
  // Las reglas editables son preferencias documentadas y no controlan el servicio OSRM.
  // No instalar reglas predeterminadas al arrancar: respeta las reglas borradas por usuario.
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
  // Orden de respaldo: la nomenclatura es SOLO una aproximación; nunca produce coordenadas ficticias.
  // Inserta puntos pendientes junto a tramos de direcciones similares, en vez de relegarlos todos al final.
  function mergeUnknown(known, missing, lockedId=null) {
    const output=[...known], pending=approximateOrder(missing,known);
    const priority=p=>p.priority==='urgente'?0:p.priority==='prioritario'?1:2;
    const xy=p=>{const n=nomenclature(p);return n?(n.street==='calle'?[n.b,n.a]:[n.a,n.b]):null;};
    const measure=(a,b)=>{const x=xy(a),y=xy(b);return x&&y?Math.abs(x[0]-y[0])+Math.abs(x[1]-y[1]):null;};
    for(const p of pending){
      const minimum=lockedId&&output[0]?.id===lockedId?1:0;
      let best=output.length, score=Infinity;
      // Un domicilio sin nomenclatura comprobable permanece al final de la propuesta.
      if(!xy(p)){output.push(p);continue;}
      for(let i=minimum;i<=output.length;i++){
        const prev=i>0?output[i-1]:null, next=i<output.length?output[i]:null;
        // Mantener las prioridades explícitas además del orden geográfico aproximado.
        if(prev&&priority(prev)>priority(p) || next&&priority(next)<priority(p))continue;
        const left=prev?measure(prev,p):null,right=next?measure(p,next):null,old=prev&&next?measure(prev,next):null;
        if(left===null&&right===null)continue;
        const candidate=(left??0)+(right??0)-(old??0);
        // Empates: mantener orden previo, sin mover la entrega que ya se está navegando.
        if(candidate<score){score=candidate;best=i;}
      }
      output.splice(best,0,p);
    }
    return output;
  }
  const delay=ms=>new Promise(r=>setTimeout(r,ms));
  const findLocation = async address => window.domicilioLocationLookup?.lookup(address) || {status:'error',reason:'Buscador de ubicaciones no cargado'};
  const findSaved = address => knownAddresses.find(x=>key(x.address)===key(address)&&valid(x));
  let gpsIssue='';
  const geolocate = () => new Promise(resolve=>{
    if(!window.isSecureContext){gpsIssue='La página necesita HTTPS para acceder al GPS';resolve(null);return;}
    if(!navigator.geolocation){gpsIssue='El navegador no ofrece el servicio de ubicación';resolve(null);return;}
    navigator.geolocation.getCurrentPosition(pos => {
      if(window.domicilioMonitor?.ingestGps?.(pos,'optimizacion')===false){gpsIssue='Lectura GPS descartada por precisión o salto anómalo. Espera una posición confiable.';resolve(null);return;}
      gpsIssue='';lastFreshGps={coords:[pos.coords.latitude,pos.coords.longitude],accuracy:pos.coords.accuracy,time:Date.now()};resolve(lastFreshGps);
    },e=>{
      gpsIssue=e.code===1?'Permiso de ubicación denegado. Actívalo para este sitio en Chrome y en los ajustes del celular.':e.code===2?'El teléfono no pudo determinar la ubicación; activa Ubicación y prueba al aire libre.':'El GPS tardó demasiado en responder; prueba con la ubicación activada.';
      resolve(null);
    },{enableHighAccuracy:true,maximumAge:4000,timeout:15000});
  });
  let lastConfirmed=null, lastFreshGps=null;
  try{lastConfirmed=JSON.parse(localStorage.getItem('domicilio-v5-last-confirmed')||'null');}catch(_){}
  function currentOrigin(gps){
    if(gps && gps.accuracy<=100) return {point:gps.coords,label:'Tu GPS actual'};
    if(Array.isArray(lastConfirmed?.coords) && lastConfirmed.coords.length===2 && lastConfirmed.coords.every(Number.isFinite))return {point:lastConfirmed.coords,label:'Último domicilio confirmado (origen aproximado; no es tu GPS actual)'};
    return {point:null,label:'GPS no disponible: solo orden provisional, sin origen inventado'};
  }
  function routeOrigin(){
    if(lastFreshGps && Date.now()-lastFreshGps.time<25000 && lastFreshGps.accuracy<=100)return lastFreshGps.coords;
    if(lastConfirmed?.coords?.length===2 && lastConfirmed.coords.every(Number.isFinite))return lastConfirmed.coords;
    return null;
  }
  function recordDeliveredOrigin(coords, accuracy){
    if(!Array.isArray(coords) || coords.length!==2 || !coords.every(Number.isFinite) || accuracy>50)return false;
    lastConfirmed={coords:[...coords],at:new Date().toISOString(),source:'última entrega confirmada'};
    try{localStorage.setItem('domicilio-v5-last-confirmed',JSON.stringify(lastConfirmed));}catch(_){}
    return true;
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
    items.forEach(p=>{const li=document.createElement('li');li.textContent=`${p.name||'Cliente por identificar'} — ${p.address||'Dirección pendiente'}${p.reference?' · '+p.reference:''} ${valid(p)?(p.locationStatus==='estimada'?'· punto aproximado de la calle, confirmar al llegar':'· ubicación disponible'):'· sin ubicación (orden aproximado)'}`;ol.appendChild(li);});
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
    const url='https://router.project-osrm.org/table/v1/driving/'+coords.map(c=>`${c[1]},${c[0]}`).join(';')+'?annotations=distance,duration';
    const r=await fetch(url,{signal:AbortSignal.timeout(18000)});
    if(!r.ok)throw Error('No se pudo consultar el cálculo de rutas por calles');
    const data=await r.json();if(data.code!=='Ok'||!data.durations)throw Error('La red vial no devolvió tiempos para todas las paradas');
    const ids=known.map((_,i)=>i+1);
    const ranks=Object.fromEntries(known.map((p,i)=>[i+1,p.priority==='urgente'?0:p.priority==='prioritario'?1:2]));
    const locked=lockedId?ids.find(i=>known[i-1].id===lockedId):null;
    // Preferir distancias de carretera dirigidas; añadir una pequeña penalización
    // por tiempo y usar minutos como respaldo si OSRM no devuelve distancias.
    const hasDistances=Array.isArray(data.distances)&&data.distances.length===coords.length&&
      data.distances.every(row=>Array.isArray(row)&&row.length===coords.length);
    const costs=hasDistances?data.distances.map((row,i)=>row.map((meters,j)=>
      Number.isFinite(meters)&&Number.isFinite(data.durations[i]?.[j])
        ? meters+data.durations[i][j]*0.3 : Infinity)):data.durations;
    const sorted=window.domicilioRouteOptimizer.withPriority(ids,costs,destination?coords.length-1:null,ranks,locked||null);
    const seconds=window.domicilioRouteOptimizer.cost(sorted,data.durations,destination?coords.length-1:null);
    return {order:sorted.map(i=>known[i-1]),minutes:Number.isFinite(seconds)?Math.round(seconds/60):null,
      usedDistances:hasDistances};
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
      const ambiguous=incoming.filter(p=>p.needsAddressReview ||
        (window.domicilioImportadorV542?.validateAddress(p.address)?.ok===false));
      if(ambiguous.length){
        $('bulk-parse')?.click();
        notice(`${ambiguous.length} dirección(es) requieren revisión. Corrige las placas en la vista previa antes de optimizar; no se guardó ningún pedido.`,true);
        $('bulk-results')?.scrollIntoView?.({behavior:'smooth',block:'start'});
        return;
      }
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
        if(x?.address!==p.address){q.needsLocationReview=true;q.lat=null;q.lng=null;q.locationStatus='pendiente';}
        return q;
      });
      const gps=await geolocate();const from=currentOrigin(gps);
      if(gps?.accuracy<=100) gpsPosition=[...gps.coords];
      const entries=[...corrected,...newRows];
      if(!entries.length){notice('Primero agrega o pega al menos un domicilio.',true);return;}
      for(const p of entries){if(!valid(p)){const saved=findSaved(p.address);if(saved){p.lat=saved.lat;p.lng=saved.lng;p.needsLocationReview=false;p.locationStatus='confirmada';}}}
      // La versión anterior nunca llamaba al buscador: las direcciones nuevas quedaban sin coordenadas.
      // Buscar automáticamente tanto las direcciones existentes como las importadas.
      const unresolved=entries.filter(p=>!valid(p));
      let found=0,estimated=0,errors=0;
      for(let i=0;i<unresolved.length;i++){
        const p=unresolved[i];
        notice(`Buscando ubicaciones en el mapa: ${i+1}/${unresolved.length} · ${p.address}`);
        const hit=await findLocation(p.address);
        if(hit.status==='found'){
          p.lat=hit.lat;p.lng=hit.lng;p.needsLocationReview=false;
          p.locationStatus=hit.needsConfirmation?'estimada':'localizada';
          p.locationSource=hit.source;p.locationDescription=hit.label;
          p.locationEvidence=hit.display||'';
          p.locationAccuracy=hit.accuracy||'desconocida';
          p.locationCheckedAt=new Date().toISOString();
          if(hit.needsConfirmation)estimated++;else found++;
        }else{
          p.locationStatus='pendiente';p.locationIssue=hit.reason||'Ubicación no encontrada';
          if(hit.status==='error')errors++;
        }
      }
      const known=entries.filter(valid),missing=entries.filter(x=>!valid(x));
      const destination=null; // Sin retorno obligatorio ni base.
      const lockedId=window.domicilioNav?.currentTargetId?.()||null;
      let result={order:[],minutes:null},warning='';
      if(known.length){
        notice(`Organizando ${known.length} ubicaciones por calles. ${missing.length} dirección(es) quedarán en la lista sin GPS.`);
        try{result=from.point?await calculateKnown(known,from.point,destination,lockedId):{order:approximateOrder(known),minutes:null};if(result.approx)warning='Lista grande: orden aproximado por proximidad GPS; no equivale a tiempos por calles.';}catch(e){warning=e.message;result.order=approximateOrder(known);}
      }
      // Las ubicaciones pendientes se intercalan por nomenclatura, con aviso explícito.
      // Sin GPS no se pueden comparar distancias exactas entre conocidos y desconocidos.
      // Se mantiene la navegación activa, y se conserva el resto con orden provisional.
      const proposed=mergeUnknown(result.order,missing,lockedId);
      if(lockedId && proposed[0]?.id!==lockedId){
        const locked=proposed.find(p=>p.id===lockedId);if(locked){proposed.splice(proposed.indexOf(locked),1);proposed.unshift(locked);}
      }
      if(!proposed.length)throw Error('No se encontraron pedidos para organizar');
      const snapshot=sig(old);
      visual.replaceChildren(text('h3','Propuesta de toda tu jornada'));
      visual.appendChild(text('p',`${proposed.length} entregas: ${known.length-estimated} con ubicación guardada/localizada, ${estimated} con punto aproximado de calle y ${missing.length} sin localizar. Origen: ${from.label}.`));
      if(gpsIssue || (gps && gps.accuracy>100))visual.appendChild(text('p',`Tu ubicación GPS: ${gpsIssue || 'precisión insuficiente (±'+Math.round(gps.accuracy)+' m)'}. Se usa un origen alternativo; puedes activar GPS en Chrome para mejorar la ruta.`));
      if(result.minutes!==null)visual.appendChild(text('p',`Tiempo estimado SOLO para las paradas localizadas: ${result.minutes} minutos, sin considerar las paradas sin GPS, los tiempos de entrega ni el tráfico en vivo.`));
      if(warning)visual.appendChild(text('p','No se pudo calcular por calles: '+warning+'. Se conserva el orden provisional.'));
      if(estimated)visual.appendChild(text('p',`${estimated} destino(s) están ubicados SOLO por la calle: el marcador NO corresponde necesariamente a la casa. Confirma el número al llegar; el recorrido es orientativo.`));
      if(missing.length)visual.appendChild(text('p',`Hay ${missing.length} dirección(es) sin coordenadas. Se intercalaron por calles/carreras cuando fue posible: el orden es SOLO aproximado y no hay ruta GPS hasta localizar esos domicilios. ${errors?'Algunas búsquedas fallaron por conexión o límite del servicio.':''}`));
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
        window.domicilioMonitor?.reviewAll?.();
        window.domicilioBulkV5?.clear();
        visual.replaceChildren(text('p','Tu lista está organizada. El mapa mostrará los puntos localizados; los restantes siguen pendientes de GPS.'));
        if(known.length)await calculateRoute();
        // Permanecer en Rutas/Pedidos para consultar y marcar la lista, sin abrir el mapa automáticamente.
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
  window.domicilioV5={optimize,captureAtOrder,approximateOrder,mergeUnknown,routeOrigin,recordDeliveredOrigin,valid,get lastConfirmed(){return lastConfirmed;}};
  [$('v5-optimize-all'),$('v5-optimize-orders')].filter(Boolean).forEach(btn=>btn.addEventListener('click',()=>optimize({source:btn.id==='v5-optimize-orders'?'orders':'routes'})));
  $('v5-mobile-end-shift')?.addEventListener('click',()=>$('menu-end-shift')?.click());
  // No reinstalar reglas eliminadas: las reglas editables son notas locales, no órdenes ejecutables.
})();
