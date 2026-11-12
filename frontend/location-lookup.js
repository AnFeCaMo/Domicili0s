/* DOMICILIO V5.3.2: origen GPS independiente del destino; no usar el centro de una calle
   como si fuera la casa. La intersección es SOLO aproximada y exige confirmación. */
(function(root){
  'use strict';
  const strip=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const road=s=>{const m=strip(s).match(/\b(calle|carrera|avenida|diagonal|transversal)\s+(\d+[a-z]?)\b/);return m?m[1]+' '+m[2]:null;};
  const house=s=>{const m=strip(s).match(/#\s*([\da-z]+)\s*[- ]\s*(\d+[a-z]?)\b/);return m?[m[1],m[2]]:null;};
  const primary=s=>{const m=strip(s).match(/^\s*(calle|carrera)\s+(\d+[a-z]?)\b/);return m?{type:m[1],number:m[2]}:null;};
  function intersectingRoad(s){
    const p=primary(s),h=house(s);if(!p||!h)return null;
    const other=p.type==='calle'?'carrera':'calle';
    return {main:`${p.type} ${p.number}`,cross:`${other} ${h[0]}`,last:h[1]};
  }
  const center=[11.006,-74.2464];
  function meters(a,b){const d=Math.PI/180,dy=(a[0]-b[0])*d,dx=(a[1]-b[1])*d;const x=Math.sin(dy/2)**2+Math.cos(a[0]*d)*Math.cos(b[0]*d)*Math.sin(dx/2)**2;return 12742000*Math.asin(Math.min(1,Math.sqrt(x)));}
  const cacheName='domicilio-v532-geocoding-cache';
  function getCache(){try{return JSON.parse(root.localStorage?.getItem(cacheName)||'{}')||{};}catch(_){return {};}}
  function saveCache(cache){try{root.localStorage?.setItem(cacheName,JSON.stringify(Object.fromEntries(Object.entries(cache).slice(-250))));}catch(_){}}
  let lastRequest=0,queue=Promise.resolve();
  function throttledSearch(query){
    const job=queue.then(async()=>{
      const pause=Math.max(0,1250-(Date.now()-lastRequest));if(pause)await new Promise(done=>setTimeout(done,pause));
      lastRequest=Date.now();
      const url='https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=co&q='+encodeURIComponent(query);
      const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'Accept':'application/json'}});
      if(!response.ok)throw Error(response.status===429?'El servicio de direcciones está limitado.':'La búsqueda de direcciones falló (HTTP '+response.status+').');
      return response.json();
    });queue=job.catch(()=>{});return job;
  }
  const roadIn=(display,name)=>new RegExp('(?:^|[^a-z0-9])'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![a-z0-9])').test(display);
  const safeCoords=item=>{
    const lat=Number(item?.lat),lng=Number(item?.lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180||meters([lat,lng],center)>30000)return null;
    return {lat,lng};
  };
  function choose(hits,address,mode='exact'){
    const intersection=intersectingRoad(address),wanted=road(address),h=house(address);
    for(const item of Array.isArray(hits)?hits:[]){
      const coords=safeCoords(item);if(!coords)continue;
      const itemRoad=road(item.address?.road||item.address?.pedestrian||item.display_name);
      const display=strip(item.display_name||'');
      const houseNumber=strip(item.address?.house_number||'').replace(/[\s-]/g,'');
      const exact=Boolean(h&&houseNumber===(h[0]+h[1]));
      if(mode==='exact'){
        if(!exact || (wanted && itemRoad!==wanted && !roadIn(display,wanted)))continue;
        return {...coords,source:'osm',accuracy:'portal',label:'Número predial encontrado en el mapa; verifica la vivienda',display:item.display_name||'',needsConfirmation:true};
      }
      if(mode==='intersection'&&intersection){
        // Ambos nombres de vías deben constar en el resultado, no solo la calle principal.
        const main=intersection.main,cross=intersection.cross;
        if(!roadIn(display,main)||!roadIn(display,cross))continue;
        return {...coords,source:'osm',accuracy:'interseccion',label:'Intersección aproximada, NO es la vivienda',display:item.display_name||'',needsConfirmation:true};
      }
    }
    return null;
  }
  async function lookup(address){
    const value=String(address||'').trim();if(!value)return {status:'pending',reason:'Dirección vacía'};
    const normalized=strip(value),cache=getCache(),saved=cache[normalized];
    if(saved&&Date.now()-saved.savedAt<14*86400000)return {...saved.result,fromCache:true};
    try{
      const full=value+', Ciénaga, Magdalena, Colombia';
      let picked=choose(await throttledSearch(full),value,'exact');
      const intersection=intersectingRoad(value);
      if(!picked&&intersection){
        const queries=[`${intersection.main} con ${intersection.cross}, Ciénaga, Magdalena, Colombia`,`${intersection.main} y ${intersection.cross}, Ciénaga, Magdalena, Colombia`];
        for(const q of queries){picked=choose(await throttledSearch(q),value,'intersection');if(picked)break;}
      }
      const result=picked?{status:'found',...picked}:{status:'pending',reason:'No se pudo confirmar la vivienda ni la intersección entre las dos vías. La dirección escrita se conserva.'};
      cache[normalized]={savedAt:Date.now(),result};saveCache(cache);return result;
    }catch(e){return {status:'error',reason:e?.message||'No se pudo consultar el mapa'};}
  }
  root.domicilioLocationLookup={lookup,choose,road,house,intersectingRoad,meters};
})(typeof window!=='undefined'?window:globalThis);
