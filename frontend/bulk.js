/* DOMICILIO V3 - Importación masiva y propuesta equilibrada con aprobación.
   No se cambia la ruta activa ni se registran pedidos sin confirmación. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const input = $('bulk-input'), file = $('bulk-file'), results = $('bulk-results');
  if (!input || !results) return;
  let draft = [], proposal = null, busy = false;
  const clean = s => String(s ?? '').trim();
  const normalize = s => clean(s).toLocaleLowerCase('es').replace(/\s+/g, ' ');
  const status = (message, error = false) => { $('bulk-status').textContent = message; $('bulk-status').style.color = error ? '#dc2626' : '#6D28D9'; };
  const escapeHtml = s => clean(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const parseDelimited = (text, delimiter) => {
    const rows = []; let row = [], field = '', quoted = false;
    for (let i=0; i<text.length; i++) {
      const c = text[i];
      if (c === '"') { if (quoted && text[i+1] === '"') { field += '"'; i++; } else quoted = !quoted; }
      else if (c === delimiter && !quoted) { row.push(field); field=''; }
      else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && text[i+1] === '\n') i++; row.push(field); if(row.some(x=>clean(x))) rows.push(row); row=[]; field=''; }
      else field += c;
    }
    row.push(field); if (row.some(x=>clean(x))) rows.push(row);
    return rows;
  };
  function parseLines(text) {
    const detectedAddresses = window.v3ParseAddressList?.(text);
    if (detectedAddresses?.length) return detectedAddresses;

    const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
    const addressPattern = /^(?:(?:\d+[.)]\s*|[-*]\s*)?)(?:calle|cll?\.?|carrera|cra?\.?|cr\.?|kr\.?|avenida|av\.?|diagonal|dg\.?|transversal|tv\.?|manzana|mz\.?|kil[oó]metro|km)\b/i;
    const rows = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].replace(/^(?:\d+[.)]\s*|[-*]\s*)/, '');
      const parts = line.split(/\s+[|;]\s+|\s+[-–]\s+/).map(clean);
      const addressIdx = parts.findIndex(p => addressPattern.test(p));
      if (addressIdx >= 0) {
        const nextLine = lines[i + 1];
        const name = addressIdx > 0 ? parts.slice(0,addressIdx).join(' - ') : '';
        if (!name && parts.length === 1 && nextLine && !addressPattern.test(nextLine)) {
          rows.push({name:nextLine, address:parts[0], reference:'', priority:'normal'});
          i += 1;
        } else {
          rows.push({name, address:window.domicilioNormalizeAddress(parts[addressIdx]), reference:parts.slice(addressIdx+1).join(' - '), priority:'normal'});
        }
      } else if (rows.length) {
        rows[rows.length-1].reference = [rows[rows.length-1].reference,line].filter(Boolean).join(' - ');
      } else {
        rows.push({name:'',address:window.domicilioNormalizeAddress(line),reference:'',priority:'normal'});
      }
    }
    return rows;
  }
  function parseTable(rows) {
    if (!rows.length) return [];
    const headers = rows[0].map(h => normalize(h).normalize('NFD').replace(/[\u0300-\u036f]/g,''));
    const col = names => headers.findIndex(h => names.some(n => h.includes(n)));
    const a=col(['direccion','domicilio','ubicacion','address']), n=col(['cliente','nombre','destinatario']), r=col(['referencia','observacion','nota']), p=col(['prioridad','urgencia']);
    if (a < 0) throw new Error('El archivo debe incluir una columna Dirección o Domicilio.');
    return rows.slice(1).filter(row=>row.some(clean)).map(row=>({name:clean(row[n]),address:clean(row[a]),reference:clean(row[r]),priority:/urgente/i.test(row[p]||'')?'urgente':/prior/i.test(row[p]||'')?'prioritario':'normal'}));
  }
  function uniqueRows(rows) {
    const keys = new Set();
    return rows.filter(row => {
      const separated=window.domicilioSeparatePedidoFields?.(row.name,row.address,row.reference);
      if(separated)Object.assign(row,{name:separated.name,address:separated.address,reference:separated.reference});
      row.address = window.domicilioNormalizeAddress(row.address);
      const key = normalize(row.address)+'|'+normalize(row.name);
      if (!clean(row.address) || keys.has(key)) return false;
      keys.add(key); return true;
    }).map((row,i)=>({...row,uid:i+1,lat:null,lng:null,checked:false,issue:'Sin verificar'}));
  }
  function preview() {
    results.replaceChildren(); proposal = null;
    if (!draft.length) { status('No se encontraron direcciones válidas.',true); return; }
    const table = document.createElement('div'); table.className='bulk-table';
    draft.forEach((row,i)=>{
      const item=document.createElement('div'); item.className='bulk-item';
      item.innerHTML=`<span class="bulk-index">${i+1}</span><div class="bulk-fields"><input aria-label="Nombre" placeholder="Cliente (opcional)" value="${escapeHtml(row.name)}" data-field="name"><input aria-label="Dirección" placeholder="Dirección" value="${escapeHtml(row.address)}" data-field="address"><input aria-label="Referencia" placeholder="Referencia" value="${escapeHtml(row.reference)}" data-field="reference"><select aria-label="Prioridad" data-field="priority"><option value="normal">Normal</option><option value="prioritario">Prioritario</option><option value="urgente">Urgente</option></select><small class="bulk-row-status">${escapeHtml(row.issue)}</small></div><button type="button" class="bulk-remove" aria-label="Quitar dirección">×</button>`;
      item.querySelector('select').value=row.priority;
      item.querySelectorAll('[data-field]').forEach(control=>control.addEventListener('change',()=>{row[control.dataset.field]=control.dataset.field==='address'?window.domicilioNormalizeAddress(control.value):control.value; if(control.dataset.field==='address')control.value=row.address; row.checked=false; row.lat=null; row.lng=null; row.candidates=null; row.issue='Sin verificar'; item.querySelector('.bulk-row-status').textContent=row.issue; proposal=null;}));
      item.querySelector('.bulk-remove').onclick=()=>{draft.splice(i,1);preview();};
      table.append(item);
    });
    results.append(table);
    status(`${draft.length} direcciones preparadas. Revísalas antes de localizar.`);
    $('bulk-verify').disabled=false;
    $('bulk-proposal').classList.add('hidden');
  }
  $('bulk-parse').onclick=()=>{try{draft=uniqueRows(parseLines(input.value));preview();}catch(e){status(e.message,true);}};
  file.addEventListener('change',async()=>{
    const selected=file.files?.[0]; if(!selected)return;
    try {
      if(selected.size>2*1024*1024) throw new Error('Archivo demasiado grande (máximo 2 MB).');
      const ext=selected.name.split('.').pop().toLowerCase(); let rows;
      if(ext==='xlsx'||ext==='xls') {
        if(!window.XLSX) throw new Error('El lector Excel no está disponible. Puedes exportar el archivo como CSV e importarlo.');
        const book=window.XLSX.read(await selected.arrayBuffer(),{type:'array'});
        rows=window.XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,defval:''});
        draft=uniqueRows(parseTable(rows));
      } else {
        const text=await selected.text();
        if(ext==='txt') draft=uniqueRows(parseLines(text));
        else if(ext==='csv') { const first=text.split(/\r?\n/)[0]; const sep=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':','; draft=uniqueRows(parseTable(parseDelimited(text,sep))); }
        else throw new Error('Formato no admitido. Usa XLSX, XLS, CSV o TXT.');
      }
      preview();
    } catch(e) {status(e.message,true);} finally {file.value='';}
  });
  const sleep = ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function geocode(address) {
    const query= /ci[eé]naga|colombia/i.test(address)?address:`${address}, Ciénaga, Magdalena, Colombia`;
    const response=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&countrycodes=co&q='+encodeURIComponent(query));
    if(!response.ok) throw new Error('Servicio de búsqueda no disponible');
    return await response.json();
  }
  $('bulk-verify').onclick=async()=>{
    if(busy||!draft.length)return; busy=true; $('bulk-verify').disabled=true;
    try {
      for(let i=0;i<draft.length;i++) {
        const row=draft[i]; if(row.checked)continue;
        status(`Localizando dirección ${i+1} de ${draft.length}…`);
        try {
          const hits=await geocode(row.address);
          if(hits.length===1){row.lat=+hits[0].lat;row.lng=+hits[0].lon;row.checked=true;row.issue='Ubicación encontrada (verifica que sea correcta)';}
          else if(hits.length>1){row.issue='Ambigua: selecciona una ubicación'; row.candidates=hits;}
          else row.issue='No encontrada: corrige la dirección';
        } catch(e) {row.issue='Error de búsqueda: '+e.message;}
        const card=results.querySelectorAll('.bulk-item')[i];
        if(card){const label=card.querySelector('.bulk-row-status');label.textContent=row.issue;
          card.querySelector('.bulk-candidates')?.remove();
          if(row.candidates?.length){const sel=document.createElement('select');sel.className='bulk-candidates';sel.innerHTML='<option value="">Seleccionar ubicación…</option>';row.candidates.forEach((c,j)=>{const opt=document.createElement('option');opt.value=j;opt.textContent=c.display_name;sel.append(opt);});sel.onchange=()=>{if(sel.value==='')return;const c=row.candidates[Number(sel.value)];row.lat=+c.lat;row.lng=+c.lon;row.checked=true;row.issue='Ubicación seleccionada: '+c.display_name;label.textContent=row.issue;};card.querySelector('.bulk-fields').append(sel);}
        }
        if(i<draft.length-1)await sleep(1100); // Nominatim: limitar consultas a ~1/segundo.
      }
      status(`${draft.filter(r=>r.checked).length}/${draft.length} direcciones localizadas. Corrige las no encontradas antes de continuar.`);
    } finally {busy=false;$('bulk-verify').disabled=false;}
  };
  const normDistance = (a,b)=>Math.max(0,Number(a)||0)/1000;
  const routeCost=(order,matrix,finalIndex)=>{
    let total=0, at=0;
    for(const j of order){const cell=matrix[at]?.[j];if(!Number.isFinite(cell))return Infinity;total+=cell;at=j;}
    if(finalIndex!==null){const c=matrix[at]?.[finalIndex];if(!Number.isFinite(c))return Infinity;total+=c;}
    return total;
  };
  function optimizeIndices(indices,weights,finalIndex) {
    return window.domicilioRouteOptimizer.solve(indices, weights, finalIndex);
  }
  function renderProposal() {
    const panel=$('bulk-proposal'); panel.classList.remove('hidden');panel.replaceChildren();
    const heading=document.createElement('h3');heading.textContent='Propuesta de nueva ruta';panel.append(heading);
    const info=document.createElement('p'); info.textContent=`${proposal.newRows.length} pedidos nuevos · ${proposal.existing.length} pedidos pendientes anteriores. Próxima parada protegida: ${proposal.locked?'sí':'no hay parada previa'}.`;
    panel.append(info);
    const list=document.createElement('ol');
    proposal.order.forEach(obj=>{const li=document.createElement('li');li.textContent=`${obj.name||'Sin nombre'} — ${obj.address}${obj.priority!=='normal'?' ('+obj.priority+')':''}`;list.append(li);});panel.append(list);
    const totals=document.createElement('p');totals.textContent=`Recorrido estimado: ${proposal.km.toFixed(1)} km · ${Math.round(proposal.minutes)} min. Estimación OSRM, no incluye tráfico en vivo ni tiempo de atención.`;panel.append(totals);
    const row=document.createElement('div');row.className='bulk-actions';
    const reject=document.createElement('button');reject.className='btn btn-secondary';reject.textContent='Conservar ruta y no importar';reject.onclick=()=>{proposal=null;panel.classList.add('hidden');status('Propuesta descartada. La jornada sigue intacta.');};
    const approve=document.createElement('button');approve.className='btn btn-purple-primary';approve.textContent='Aprobar, importar y aplicar ruta';approve.onclick=applyProposal;
    row.append(reject,approve);panel.append(row);
  }
  $('bulk-optimize').onclick=async()=>{
    if(busy)return;
    if(!draft.length||draft.some(r=>!r.checked||!Number.isFinite(r.lat)||!Number.isFinite(r.lng))){status('Primero verifica y confirma la ubicación de TODAS las direcciones.',true);return;}
    const existing=getRoutePedidos();
    const seen=new Set(existing.map(p=>normalize(p.address)+'|'+normalize(p.name)));
    const newRows=draft.filter(p=>!seen.has(normalize(p.address)+'|'+normalize(p.name)));
    if(!newRows.length){status('Todos estos domicilios ya están en los pedidos pendientes.',true);return;}
    const locked=existing.length>0?existing[0]:null;
    const others=locked?existing.slice(1):existing;
    const origin=gpsPosition||startLocation;
    const destination=window.v3Destination?.point || ((window.v3Destination?.mode==='start'||returnToStartInput.checked)?startLocation:null);
    const candidates=[...(locked?[locked]:[]),...others,...newRows];
    const coords=[origin,...candidates.map(p=>[p.lat,p.lng]),...(destination?[destination]:[])];
    if(coords.length>90){status('La lista supera el límite de 88 paradas para este cálculo. Divídela en lotes.',true);return;}
    busy=true;$('bulk-optimize').disabled=true;status('Calculando matriz de tiempos y distancias por carretera…');
    try {
      const url='https://router.project-osrm.org/table/v1/driving/'+coords.map(p=>`${p[1]},${p[0]}`).join(';')+'?annotations=duration,distance';
      const response=await fetch(url);const data=await response.json();
      if(!response.ok||data.code!=='Ok'||!data.durations||!data.distances)throw new Error('OSRM no pudo calcular la matriz vial.');
      const finalIndex=destination?coords.length-1:null;
      const weights=data.durations.map((r,i)=>r.map((seconds,j)=>Number.isFinite(seconds)&&Number.isFinite(data.distances[i]?.[j])?seconds/60+data.distances[i][j]/1000*1.8:Infinity));
      const indices=candidates.map((_,i)=>i+1);
      const fixed=locked?[1]:[];
      const movable=locked?indices.slice(1):indices;
      const urgent=movable.filter(idx=>candidates[idx-1].priority==='urgente');
      const priority=movable.filter(idx=>candidates[idx-1].priority==='prioritario');
      const regular=movable.filter(idx=>candidates[idx-1].priority==='normal');
      const ordered=[...fixed];
      for(const group of [urgent,priority,regular]){
        if(!group.length)continue;
        const local=weights.map(r=>r.slice());
        if(ordered.length)local[0]=weights[ordered[ordered.length-1]].slice();
        const remainingAfter=movable.filter(idx=>!ordered.includes(idx)&&!group.includes(idx));
        const segment=optimizeIndices(group,local,remainingAfter.length?null:finalIndex);
        ordered.push(...segment);
      }
      const order=ordered.map(i=>candidates[i-1]);
      const totalDuration=routeCost(ordered,data.durations,finalIndex)/60;
      const totalDistance=routeCost(ordered,data.distances,finalIndex)/1000;
      if(!Number.isFinite(totalDuration)||!Number.isFinite(totalDistance))throw new Error('Algunas paradas no tienen conexión vial calculable.');
      proposal={order,existing,newRows,locked,km:totalDistance,minutes:totalDuration,signature:existing.map(p=>p.id).join('|')};
      renderProposal();status('Propuesta calculada. No se aplicará hasta que la apruebes.');
    } catch(e){status('No se modificó la ruta: '+e.message,true);}finally{busy=false;$('bulk-optimize').disabled=false;}
  };
  function applyProposal(){
    if(!proposal)return;
    if(getRoutePedidos().map(p=>p.id).join('|')!==proposal.signature){status('Los pedidos cambiaron. Calcula nuevamente antes de aplicar.',true);proposal=null;return;}
    if(!confirm(`¿Importar ${proposal.newRows.length} pedidos y reemplazar el orden de las paradas pendientes?`))return;
    const created=proposal.newRows.map((r,i)=>({id:generatePedidoId(),number:Math.max(0,...pedidos.map(p=>Number(p.number)||0))+i+1,name:r.name,address:r.address,reference:r.reference,priority:r.priority,lat:r.lat,lng:r.lng,status:'pendiente',createdAt:new Date().toISOString()}));
    const lookup=new Map(proposal.newRows.map((r,i)=>[r,created[i]]));
    const active=proposal.order.map(p=>lookup.get(p)||p);
    const finished=pedidos.filter(p=>p.status==='entregado'||p.status==='fallido');
    pedidos.splice(0,pedidos.length,...finished,...active);
    created.forEach(p=>updatePedidoMarker(p));
    window.v3Audit ||= [];window.v3Audit.push({at:new Date().toISOString(),action:'Importación masiva aprobada',details:`${created.length} nuevos domicilios; reoptimización equilibrada, próxima parada protegida`});
    saveState();renderPedidoList();window.v3Refresh?.();recalculateIfRouteVisible();
    showToast(`${created.length} pedidos importados; ruta aprobada`,'success');
    proposal=null;draft=[];input.value='';results.replaceChildren();$('bulk-proposal').classList.add('hidden');
    status('Pedidos guardados y nueva ruta aplicada.');
  }
  const voice=$('bulk-voice');let recognition;
  voice.onclick=()=>{
    const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Speech){status('El reconocimiento de voz no está disponible en este navegador. Usa texto o archivos.',true);return;}
    if(recognition){recognition.stop();return;}
    recognition=new Speech();recognition.lang='es-CO';recognition.continuous=true;recognition.interimResults=false;
    recognition.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)input.value+=(input.value?'\n':'')+e.results[i][0].transcript;};
    recognition.onerror=e=>status('Error del micrófono: '+e.error,true);
    recognition.onend=()=>{recognition=null;voice.textContent='🎙 Dictar direcciones';};
    recognition.start();voice.textContent='⏹ Detener dictado';status('Dictado activo. Revisa las direcciones transcritas antes de analizarlas.');
  };
})();
