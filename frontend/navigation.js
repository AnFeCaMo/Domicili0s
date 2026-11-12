/* DOMICILIO V4 — navegación asistida; requiere permiso GPS y conexión para rutas nuevas. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const panel = $('nav-v4');
  let watch = null, point = null, marker = null, line = null, arrows = [], overviewArrows = [];
  let target = null, route = null, steps = [], stepIndex = -1, lastReroute = 0, lastVoice = '', arrived = false;
  let gpsAccuracy = Infinity, gpsTimestamp = 0, calculating = false, destinationIsBase = false, routeGeneration = 0;
  // Avisos discretos: solo al aproximarse a una maniobra, nunca cada 10 metros.
  let voiceStage = new Map(), lastSpokenAt = 0, lastTurnAdvanceAt = 0;
  const isTurn = (step) => {
    const m = step?.maneuver || {};
    return ['turn','roundabout','rotary','fork','end of road','new name','merge','on ramp','off ramp','notification','arrive'].includes(m.type)
      && (m.type === 'arrive' || ['left','right','slight left','slight right','sharp left','sharp right','uturn'].includes(m.modifier) || ['roundabout','rotary','fork','end of road','off ramp'].includes(m.type));
  };
  function resetVoiceGuidance() {voiceStage.clear(); lastSpokenAt=0; lastTurnAdvanceAt=0;}
  // Devuelve el próximo hito de voz; omite «continúa derecho» para no saturar.
  function nextVoiceStep() {
    for (let i=stepIndex+1; i<steps.length; i++) if(isTurn(steps[i])) return {i,step:steps[i]};
    return null;
  }
  function guideAtGps() {
    const next=nextVoiceStep();
    if(!next) return;
    const d=distance(point,next.step.point);
    const previous=voiceStage.get(next.i)||0;
    // A 100 m, 50 m y en el cruce. El GPS puede variar unos metros.
    const stage=d<=22?3:d<=55?2:d<=110?1:0;
    if(stage<=previous) return;
    // Ignorar avisos poco fiables cuando el margen de error cubre el cruce.
    if(gpsAccuracy>Math.min(35,Math.max(15,d/2))) return;
    const now=Date.now();
    if(now-lastSpokenAt<9000 && stage<3) return;
    const action=stepText(next.step);
    if(next.step.maneuver?.type==='arrive' && stage===3){voiceStage.set(next.i,stage);message('Has llegado a las proximidades del destino. Confirma la dirección.',true);return;}
    const statement=stage===3?`Ahora, ${action}`:stage===2?`En 50 metros, ${action}`:`En 100 metros, ${action}`;
    voiceStage.set(next.i,stage);
    lastSpokenAt=now;
    message(statement,true);
    if(stage===3 && now-lastTurnAdvanceAt>7000){stepIndex=next.i;lastTurnAdvanceAt=now;}
  }
  const autoNextKey = 'domicilio-v4-auto-next';
  const autoNextCheckbox = $('nav-v4-auto-next');
  autoNextCheckbox.checked = localStorage.getItem(autoNextKey) !== 'false';
  autoNextCheckbox.addEventListener('change', () => {
    try { localStorage.setItem(autoNextKey, String(autoNextCheckbox.checked)); } catch (_) {}
  });
  const toRad = x => x * Math.PI / 180;
  const distance = (a,b) => { const dlat=toRad(b[0]-a[0]),dlon=toRad(b[1]-a[1]); const h=Math.sin(dlat/2)**2+Math.cos(toRad(a[0]))*Math.cos(toRad(b[0]))*Math.sin(dlon/2)**2; return 12742000*Math.asin(Math.min(1,Math.sqrt(h))); };
  const safeText = v => String(v || '').replace(/[<>]/g,'');
  function announce(message, force=false) {
    if (!message || (!force && message === lastVoice)) return;
    lastVoice = message;
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(message); u.lang='es-CO'; u.rate=0.95;
      speechSynthesis.speak(u);
    }
  }
  function message(text, voice=false) { $('nav-v4-instruction').textContent=text; if(voice) announce(text); }
  function showDestination(pedido) {
    const customer=$('nav-v4-customer'),address=$('nav-v4-address'),reference=$('nav-v4-reference');
    if(customer)customer.textContent=pedido?.name?.trim() || 'Cliente sin nombre';
    if(address)address.textContent=pedido?.address?.trim() || 'Dirección no especificada';
    if(reference) {
      reference.textContent=pedido?.reference?.trim() ? `Referencia: ${pedido.reference.trim()}` : '';
      reference.hidden=!pedido?.reference?.trim();
    }
  }
  function resetDestination() {
    ['nav-v4-customer','nav-v4-address','nav-v4-reference'].forEach(id=>{
      const element=$(id);
      if(element){element.textContent='';element.hidden=false;}
    });
  }
  function status(text) { $('nav-v4-state').textContent=text; }
  function removeLayer(layer) { if(layer && mapInstance) mapInstance.removeLayer(layer); }
  function removeArrows(list) { list.forEach(removeLayer); list.length=0; }
  function addArrows(coordinates, dest, color='#fff', interval=110) {
    if(!mapInstance || !window.L || coordinates.length<2) return;
    let accumulated=0;
    for(let i=1;i<coordinates.length;i++) {
      const a=coordinates[i-1], b=coordinates[i]; const len=distance(a,b);
      if(len<0.5) continue;
      accumulated+=len;
      if(accumulated<interval) continue;
      accumulated=0;
      const lat=(a[0]+b[0])/2, lng=(a[1]+b[1])/2;
      const angle=Math.atan2((b[1]-a[1])*Math.cos(toRad(lat)),b[0]-a[0])*180/Math.PI;
      const icon=L.divIcon({className:'',html:`<div style="transform:rotate(${angle}deg);font-size:22px;color:${color};font-weight:900;text-shadow:0 0 3px #111,0 0 3px #111">↑</div>`,iconSize:[22,22],iconAnchor:[11,11]});
      dest.push(L.marker([lat,lng],{icon,interactive:false}).addTo(mapInstance));
      if(dest.length>150) break;
    }
  }
  function showOverviewArrows(r) {
    removeArrows(overviewArrows);
    const legs=r?.legs||[];
    if(!legs.length || !r.geometry?.coordinates) return;
    const coords=r.geometry.coordinates.map(c=>[c[1],c[0]]);
    // Vista general: flechas blancas sobre ruta azul. El retorno se distingue en navegación individual.
    addArrows(coords,overviewArrows,'#ffffff',120);
  }
  function freshGps() { return point && Date.now()-gpsTimestamp<20000 && gpsAccuracy<=120; }
  function updateGps(pos) {
    point=[pos.coords.latitude,pos.coords.longitude]; gpsAccuracy=pos.coords.accuracy; gpsTimestamp=Date.now();
    gpsPosition=point;
    if(!marker) marker=L.circleMarker(point,{radius:9,color:'#fff',weight:3,fillColor:'#1677ff',fillOpacity:1}).addTo(mapInstance).bindPopup('Mi ubicación GPS');
    else marker.setLatLng(point);
    if(!target || !target.coords) return;
    if(!route && !calculating && freshGps() && navigator.onLine) calculate();
    const remaining=distance(point,target.coords);
    $('nav-v4-details').textContent=`Distancia directa: ${Math.round(remaining)} m · Precisión GPS: ±${Math.round(gpsAccuracy)} m${navigator.onLine?'':' · Sin conexión'}`;
    if(gpsAccuracy>80) {status('GPS impreciso');return;}
    if(remaining<Math.max(35,gpsAccuracy+15) && !arrived) {arrived=true; status('Cerca del destino');message(target.approximate?'Estás cerca del punto estimado de la calle, NO necesariamente de la vivienda. Verifica el número y la referencia.':'Estás cerca del destino. Comprueba la dirección antes de marcar la entrega.',true);return;}
    if(!route || !steps.length) return;
    guideAtGps();
    // Solo recalcular con desvío persistente aproximado y con intervalo mínimo.
    if(route && Date.now()-lastReroute>45000 && navigator.onLine && distanceToLine(point,route.geometry.coordinates)>95) {
      lastReroute=Date.now(); message('Posible desvío. Recalculando recorrido.',true); calculate();
    }
  }
  function distanceToLine(p,coords) {
    // Distancia aproximada a segmentos en metros (proyección local).
    let best=Infinity; const k=Math.cos(toRad(p[0]));
    for(let i=1;i<coords.length;i++) {
      const a=coords[i-1],b=coords[i], ax=(a[0]-p[1])*111200*k, ay=(a[1]-p[0])*111200;
      const bx=(b[0]-p[1])*111200*k,by=(b[1]-p[0])*111200;
      const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
      best=Math.min(best,Math.hypot(ax+t*dx,ay+t*dy));
    }
    return best;
  }
  function stepText(s) {
    const m=s.maneuver||{}; const road=s.name?` hacia ${s.name}`:'';
    const direction={left:'gira a la izquierda',right:'gira a la derecha',straight:'continúa derecho',slight_left:'gira ligeramente a la izquierda',slight_right:'gira ligeramente a la derecha',sharp_left:'gira pronunciadamente a la izquierda',sharp_right:'gira pronunciadamente a la derecha',uturn:'realiza un cambio de sentido'};
    if(m.type==='arrive') return 'Has llegado al destino';
    if(m.type==='depart') return `Inicia el recorrido${road}`;
    if(m.type==='roundabout'||m.type==='rotary') return `En la glorieta, toma la salida ${m.exit||'indicada'}${road}`;
    const modifier=String(m.modifier||'').trim().toLowerCase().replace(/[ -]+/g,'_');
    return `${direction[modifier]|| (m.type==='continue'?'continúa derecho':'continúa por la vía')}${road}`;
  }
  async function calculate() {
    if(calculating || !target || !target.coords) return;
    if(!freshGps()) {message('Esperando ubicación GPS precisa. Activa la ubicación del teléfono.',true);return;}
    if(!navigator.onLine) {
      status('Sin conexión');
      try {const cached=JSON.parse(localStorage.getItem('domicilio-v4-last-route')||'null');
        if(cached?.geometry && cached.target?.id===target.id && Date.now()-cached.at<86400000) {
          removeLayer(line);removeArrows(arrows);
          line=L.geoJSON(cached.geometry,{style:{color:'#9a6cbd',weight:6,dashArray:'8 8'}}).addTo(mapInstance);
          addArrows(cached.geometry.coordinates.map(c=>[c[1],c[0]]),arrows,'#fff');
          message('Sin conexión: ruta anterior orientativa. No hay indicaciones actualizadas.',true);return;
        }
      }catch(_){}
      message('Sin internet: se conservan los pedidos, pero no se puede calcular una ruta nueva.',true);return;
    }
    calculating=true; const generation=++routeGeneration; status('Calculando');
    const pts=[point,target.coords].map(p=>`${p[1]},${p[0]}`).join(';');
    try {
      const response=await fetch(`https://router.project-osrm.org/route/v1/driving/${pts}?overview=full&geometries=geojson&steps=true`,{signal:AbortSignal.timeout(16000)});
      if(!response.ok) throw new Error('Servicio de rutas no disponible');
      const data=await response.json();
      if(generation!==routeGeneration) return;
      if(data.code!=='Ok'||!data.routes?.length) throw new Error('No se encontró recorrido por calles');
      route=data.routes[0]; steps=(route.legs||[]).flatMap(l=>l.steps||[]).map(s=>({...s,point:[s.maneuver.location[1],s.maneuver.location[0]]}));
      stepIndex=-1; arrived=false; resetVoiceGuidance(); removeLayer(line); removeArrows(arrows);
      line=L.geoJSON(route.geometry,{style:{color:destinationIsBase?'#e88725':'#1668e9',weight:7,opacity:0.9,dashArray:destinationIsBase?'12 7':null}}).addTo(mapInstance);
      addArrows(route.geometry.coordinates.map(c=>[c[1],c[0]]),arrows,destinationIsBase?'#783900':'#fff',90);
      mapInstance.fitBounds(line.getBounds(),{padding:[55,55]});
      status('Navegando');
      $('nav-v4-details').textContent=`${(route.distance/1000).toFixed(2)} km · ${Math.ceil(route.duration/60)} min estimados · ${destinationIsBase?'Regreso':'Ida'}`;
      message(steps.length?'Ruta preparada. Sigue las indicaciones del mapa. Avisaré antes de cada giro.':'Sigue la ruta indicada por las flechas.',true);
      try {localStorage.setItem('domicilio-v4-last-route',JSON.stringify({target,geometry:route.geometry,at:Date.now()}));}catch(_){}
    }catch(e) {if(generation===routeGeneration) {status('Ruta no disponible');message(`No se pudo actualizar la ruta: ${e.message}. Revisa la conexión.`,true);}}
    finally {if(generation===routeGeneration) calculating=false;}
  }
  function beginGps() {
    if(watch!==null) return;
    if(!navigator.geolocation) {message('Este dispositivo no admite GPS.');return;}
    watch=navigator.geolocation.watchPosition(updateGps,e=>{status('GPS no disponible');message('No se pudo obtener el GPS: '+e.message);},{enableHighAccuracy:true,maximumAge:3000,timeout:18000});
  }
  function start(pedido) {
    if(pedido?.locationStatus==='estimada' && !confirm('La ubicación encontrada es aproximada, corresponde a la CALLE y no necesariamente a esta casa. ¿Quieres ver un recorrido orientativo y confirmar el domicilio al llegar?'))return;
    if(!pedido)return;
    if(pedido.needsLocationReview || pedido.lat == null || pedido.lng == null || !Number.isFinite(Number(pedido.lat)) || !Number.isFinite(Number(pedido.lng))) {
      stop();showDestination(pedido);target={id:pedido.id,number:pedido.number,coords:null};panel.hidden=false;
      window.v3Navigate?.('map');status('Ubicación no localizada');
      message(`Pedido #${pedido.number}: ${pedido.name||'Cliente'}. Dirección: ${pedido.address||'sin dirección'}${pedido.reference?' · Referencia: '+pedido.reference:''}. Confirma la ubicación al llegar.`);
      $('nav-v53-capture')?.removeAttribute('hidden');return;
    }
    // No reutilizar instrucciones o geometría del pedido anterior.
    routeGeneration++;calculating=false;route=null;steps=[];stepIndex=-1;arrived=false;lastVoice='';resetVoiceGuidance();
    removeLayer(line);line=null;removeArrows(arrows);
    $('nav-v53-capture')?.setAttribute('hidden','');
    destinationIsBase=false; target={id:pedido.id,number:pedido.number,coords:[Number(pedido.lat),Number(pedido.lng)],approximate:pedido.locationStatus==='estimada'};
    showDestination(pedido);panel.hidden=false; window.v3Navigate?.('map'); status('Esperando GPS'); message('Solicitando tu ubicación. Acepta el permiso del navegador.');
    beginGps(); if(freshGps()) calculate();
    else navigator.geolocation?.getCurrentPosition(pos=>{updateGps(pos);calculate();},()=>{}, {enableHighAccuracy:true,timeout:15000});
  }
  function back() {
    message('No se configura un regreso automático. Agrega un destino nuevo si lo necesitas.');return;
    if(!startLocation?.every(Number.isFinite)) return;
    routeGeneration++;calculating=false;route=null;steps=[];stepIndex=-1;removeLayer(line);line=null;removeArrows(arrows);
    destinationIsBase=true; target={id:null,coords:[...startLocation]}; arrived=false;resetVoiceGuidance();
    panel.hidden=false; window.v3Navigate?.('map'); beginGps(); calculate();
  }
  function stop() {$('nav-v53-capture')?.setAttribute('hidden','');resetDestination();resetVoiceGuidance();routeGeneration++;calculating=false;target=null;route=null;steps=[];panel.hidden=true;removeLayer(line);line=null;removeArrows(arrows);if(watch!==null){navigator.geolocation.clearWatch(watch);watch=null;}}
  function deliver() {
    if(!target?.id) {message('Estás navegando al punto de salida, no a un pedido.');return;}
    const currentId=target.id;
    const p=pedidos.find(p=>p.id===currentId);if(!p)return;
    if(!confirm(`¿Confirmas que entregaste el pedido #${p.number}?`))return;
    p.status='entregado';p.deliveredAt=new Date().toISOString();
    if(freshGps() && gpsAccuracy<=50)window.domicilioV5?.recordDeliveredOrigin?.([...point],gpsAccuracy);
    updatePedidoMarker(p);window.domicilioV53?.onDelivered?.(p);saveState();renderPedidoList();window.v3Refresh?.();
    // La lista de pedidos conserva el orden manual/optimizado aprobado por el usuario.
    const pending=getRoutePedidos();
    const next=pending[0];
    stop();
    if(next) {
      // Siempre el siguiente del orden aprobado, incluso sin coordenadas.
      window.domicilioV53?.advanceAfterDelivery?.();
      if(!autoNextCheckbox.checked) showToast(`Entregado. El siguiente es #${next.number}: ${next.address||'dirección pendiente'}`, 'success', 5500);
    } else showToast('Jornada sin pedidos pendientes. Finalízala cuando decidas.', 'success', 5500);
  }
  $('nav-v4-lost').addEventListener('click',()=>{
    if(!target)return;
    if(!target.coords) {
      message('No hay ubicación GPS para este domicilio. Revisa la dirección visible y confirma el punto al llegar.',true);
      return;
    }
    if(!freshGps()) {
      message('Esperando una ubicación GPS actual y precisa para buscar nuevamente el recorrido.',true);
      beginGps();
      return;
    }
    lastReroute=Date.now();
    message('Estoy recalculando el recorrido desde tu ubicación actual.',true);
    calculate();
  });
  $('nav-v4-repeat').addEventListener('click',()=>{
    if(!target)return;
    const instruction=$('nav-v4-instruction').textContent;
    announce(instruction || `Destino: ${$('nav-v4-address')?.textContent || 'dirección pendiente'}`,true);
  });
  $('nav-v4-return')?.addEventListener('click',back);
  $('nav-v53-capture')?.addEventListener('click',()=>{const p=pedidos.find(p=>p.id===target?.id);if(p)window.domicilioV5?.captureAtOrder?.(p);});
  $('nav-v4-stop').addEventListener('click',stop);
  $('nav-v4-arrived').addEventListener('click',deliver);
  window.addEventListener('offline',()=>{if(target){status('Sin conexión');message('Conexión perdida. Mantengo la ruta visible; no puedo recalcular.',true);}});
  window.addEventListener('online',()=>{if(target){status('Conectado');message('Conexión recuperada.',true);}});
  window.domicilioNav={start,back,stop,calculate,showOverviewArrows,currentTargetId:()=>target?.id||null};
})();
