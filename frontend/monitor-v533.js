/* DOMICILIO V5.3.3 — supervisión determinista y local, sin enviar la ubicación al servidor.
   No reemplaza el GPS físico ni afirma verificar portales sin evidencia cartográfica.
   Revisa las lecturas recibidas y el estado de pedidos mientras la página esté abierta. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const STORAGE_KEY='domicilio-v533-monitor-enabled';
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const validCoord=(lat,lng)=>Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
  const toRad=x=>x*Math.PI/180;
  const meters=(a,b)=>{const dlat=toRad(b[0]-a[0]),dlng=toRad(b[1]-a[1]),h=Math.sin(dlat/2)**2+Math.cos(toRad(a[0]))*Math.cos(toRad(b[0]))*Math.sin(dlng/2)**2;return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));};
  const addressParts=(value)=>{
    const normalized=window.domicilioNormalizeAddress?.(value)||value;
    const p=window.domicilioLocationLookup?.intersectingRoad?.(normalized);
    if(p)return p;
    const match=norm(normalized).match(/^\s*(calle|carrera)\s+(\d+[a-z]?)\s*(?:#|numero|numeral)\s*(\d+[a-z]?)\s*[- ]\s*(\d+[a-z]?)/);
    if(!match)return null;
    return {main:`${match[1]} ${match[2]}`,cross:`${match[1]==='calle'?'carrera':'calle'} ${match[3]}`,last:match[4]};
  };
  const critical=(key,message,orderId)=>({key,level:'critical',message,orderId});
  const warning=(key,message,orderId)=>({key,level:'warning',message,orderId});
  const info=(key,message,orderId)=>({key,level:'info',message,orderId});
  let enabled=true,lastAccepted=null,gpsIssue=null,lastChecked=0,notifications=new Set(),lastWarnings=[];
  try{enabled=localStorage.getItem(STORAGE_KEY)!=='false';}catch(_){}
  const check=$('monitor-v533-enabled');if(check)check.checked=enabled;
  function gpsTime(position){const raw=Number(position?.timestamp),now=Date.now();return raw>0&&raw<=now+15000?raw:now;}
  function examineGps(position,previous=lastAccepted){
    const c=position?.coords,lat=Number(c?.latitude),lng=Number(c?.longitude),accuracy=Number(c?.accuracy);
    if(!validCoord(lat,lng)||!Number.isFinite(accuracy)||accuracy<=0)return {accepted:false,reason:'Lectura GPS inválida o sin precisión informada.'};
    if(accuracy>120)return {accepted:false,reason:`GPS impreciso (±${Math.round(accuracy)} m). Comprueba el permiso de ubicación y la señal.`};
    const timestamp=gpsTime(position);
    if(Date.now()-timestamp>20000)return {accepted:false,reason:'GPS antiguo: esperando una posición reciente.'};
    if(previous){
      const dt=(timestamp-previous.time)/1000;
      if(dt< -1)return {accepted:false,reason:'La lectura GPS llegó fuera de orden.'};
      if(dt>0.5){
        const dist=meters([lat,lng],previous.coords);
        // Margen de precisión combinado; no atribuir un salto pequeño al movimiento real.
        const plausible=Math.max(100,dt*48)+accuracy+previous.accuracy;
        if(dist>plausible)return {accepted:false,reason:`Posible salto GPS de ${Math.round(dist)} m en ${Math.round(dt)} s. Posición ignorada.`};
      }
    }
    return {accepted:true,coords:[lat,lng],accuracy,time:timestamp};
  }
  function ingestGps(position,source='gps'){
    // Incluso desactivado el monitor, no confundir ausencia de supervisión con una lectura válida.
    const result=examineGps(position);
    if(!result.accepted){gpsIssue={message:result.reason,at:Date.now(),source};if(enabled)reviewAll();return false;}
    lastAccepted={coords:result.coords,accuracy:result.accuracy,time:result.time,source};
    gpsIssue=null;
    if(enabled)reviewAll();
    return true;
  }
  function orderAlerts(order){
    const alerts=[],id=order.id||String(order.number),label=`Pedido #${order.number}: ${order.address||'dirección vacía'}`;
    const lat=order.lat==null?NaN:Number(order.lat),lng=order.lng==null?NaN:Number(order.lng);
    const hasCoords=validCoord(lat,lng);
    if(!String(order.address||'').trim())return [critical('empty-'+id,`El ${label} no tiene dirección escrita. Corrígela antes de navegar.`,id)];
    const parts=addressParts(order.address);
    if(!parts && /^(calle|carrera)\b/i.test(norm(order.address)))alerts.push(warning('syntax-'+id,`${label}: falta la vía transversal o la numeración predial. Revísala en la tarjeta.`,id));
    if(!hasCoords){alerts.push(warning('missing-'+id,`${label}: sin coordenadas. Se conserva en el orden de reparto; confirma la ubicación al llegar.`,id));return alerts;}
    if(order.locationStatus==='estimada'||order.locationAccuracy==='interseccion'||order.needsLocationReview){
      alerts.push(warning('approx-'+id,`${label}: el mapa solo encontró una intersección aproximada, no la casa. Verifica el número al llegar.`,id));
    }
    if(parts && order.locationEvidence && order.locationStatus!=='confirmada'){
      const text=norm(order.locationEvidence);
      const named=part=>new RegExp('(?:^|[^a-z0-9])'+part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![a-z0-9])').test(text);
      // Solo señalamos contradicciones cuando el resultado contiene vías reconocibles.
      const hasRoads=/(?:calle|carrera)\s+\d+/i.test(text);
      if(hasRoads && (!named(parts.main)|| (order.locationAccuracy==='interseccion'&&!named(parts.cross))))
        alerts.push(critical('mismatch-'+id,`${label}: el resultado del mapa NO coincide con las vías ${parts.main} y ${parts.cross}. Corrige o confirma en el domicilio.`,id));
    }
    const same=Array.isArray(window.domicilioMonitorData?.().knownAddresses)?window.domicilioMonitorData().knownAddresses.find(a=>norm(a.address)===norm(order.address)&&Number.isFinite(a.lat)&&Number.isFinite(a.lng)):null;
    if(same && same.source==='gps-confirmado' && meters([lat,lng],[same.lat,same.lng])>180){
      alerts.push(critical('saved-'+id,`${label}: la ubicación propuesta está a más de 180 m de un punto GPS confirmado previamente. Comprueba el marcador.`,id));
    }
    return alerts;
  }
  function ruleAlerts(){
    const rules=window.domicilioMonitorData?.().rules||[];
    if(!rules.length)return [];
    const found=[],seen=new Set();let duplicates=0,obsolete=0;
    for(const r of rules){const text=norm(r.text);if(!text)continue;
      if(seen.has(text))duplicates++;else seen.add(text);
      if(/(?:regreso|volver|retorno) (?:automatico|obligatorio)|terminar en (?:casa|base)/.test(text))obsolete++;
    }
    if(duplicates)found.push(info('rules-duplicates',`Hay ${duplicates} regla(s) idénticas. Revísalas en Configuración; no se borrará ninguna automáticamente.`));
    if(obsolete)found.push(info('rules-obsolete',`Hay ${obsolete} regla(s) de regreso automático a Casa o base que podrían confundir al asistente. El motor de rutas actual no las utiliza.`));
    return found;
  }
  function analyze(orders,now=Date.now()){
    const active=orders.filter(o=>!['entregado','fallido'].includes(o.status));
    const result=[];
    for(const p of active.slice(0,250))result.push(...orderAlerts(p));
    if(active.length>250)result.push(info('many-orders',`Se revisaron los primeros 250 de ${active.length} pedidos; divide jornadas muy grandes para reducir carga.`));
    if(gpsIssue && now-gpsIssue.at<45000)result.unshift(warning('gps',gpsIssue.message));
    if(lastAccepted && now-lastAccepted.time>30000)result.unshift(warning('stale-gps','No hay una lectura GPS reciente. La ubicación mostrada puede estar desactualizada.'));
    // Nunca utilizar una posición fuera de época como origen fiable.
    if(!lastAccepted && active.length)result.push(info('gps-await','Todavía no hay lectura GPS validada por el monitor. Autoriza ubicación para mejorar la navegación.'));
    return {alerts:result,activeCount:active.length};
  }
  function render(result){
    const status=$('monitor-v533-status'),summary=$('monitor-v533-summary'),list=$('monitor-v533-alerts'),route=$('monitor-v533-route-alert'),home=$('monitor-v533-home-alert');
    if(!status&&!route&&!home)return;
    if(!enabled){if(status)status.textContent='Monitor desactivado por el usuario.';if(summary)summary.textContent='No se están evaluando pedidos.';if(list)list.replaceChildren();if(route)route.textContent='Monitor desactivado en Configuración.';if(home)home.textContent='Monitor desactivado en Configuración.';return;}
    const levels={critical:'Revisar',warning:'Atención',info:'Información'};
    if(status)status.textContent=`Monitor activo · ${result.activeCount} pedidos pendientes · ${result.alerts.length} observaciones`;
    if(summary)summary.textContent=lastAccepted?`Último GPS aceptado: precisión ±${Math.round(lastAccepted.accuracy)} m, hace ${Math.max(0,Math.round((Date.now()-lastAccepted.time)/1000))} s. Evaluación local en este dispositivo.`:'Esperando GPS validado. El monitor también revisa direcciones sin GPS.';
    if(list){list.replaceChildren();for(const alert of result.alerts.slice(0,15)){
      const li=document.createElement('li');li.dataset.level=alert.level;li.textContent=`${levels[alert.level]||'Aviso'}: ${alert.message}`;list.appendChild(li);
    }if(result.alerts.length>15){const li=document.createElement('li');li.textContent=`Y ${result.alerts.length-15} observaciones adicionales. Corrige las primeras y vuelve a revisar.`;list.appendChild(li);}}
    if(route||home){const important=result.alerts.find(a=>a.level==='critical')||result.alerts.find(a=>a.level==='warning');const output=important?`Monitor: ${important.message}`:`Monitor: ${result.activeCount} pedidos supervisados; sin anomalías críticas detectadas.`;if(route)route.textContent=output;if(home)home.textContent=output;}
  }
  function reviewAll(){
    if(!enabled){render({alerts:[],activeCount:0});return {alerts:[],activeCount:0};}
    const orders=window.domicilioMonitorData?.().orders||[];
    const result=analyze(orders);
    const rules=ruleAlerts();result.alerts.push(...rules);
    lastChecked=Date.now();lastWarnings=result.alerts;
    render(result);
    return result;
  }
  function setEnabled(v){enabled=!!v;try{localStorage.setItem(STORAGE_KEY,String(enabled));}catch(_){}reviewAll();}
  check?.addEventListener('change',()=>setEnabled(check.checked));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)reviewAll();});
  window.domicilioMonitor={examineGps,ingestGps,reviewAll,orderAlerts,addressParts,analyze,setEnabled,get enabled(){return enabled;},get lastGps(){return lastAccepted;},get lastWarnings(){return [...lastWarnings];}};
  // Revisión ligera de pedidos. No consulta servicios externos ni inicia GPS sin permiso.
  setInterval(()=>{if(!document.hidden)reviewAll();},8000);
  reviewAll();
})();
