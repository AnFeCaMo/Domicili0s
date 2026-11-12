/* DOMICILIO V5.1 — Búsqueda responsable de direcciones en OpenStreetMap.
   Geocodificación ≠ GPS: los resultados de calle son APROXIMADOS, no identifican casas.
   Uso moderado de Nominatim público, máximo una petición cada ~1.2 s y caché local. */
(function(root){
  'use strict';
  const strip=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const road=s=>{const m=strip(s).match(/\b(calle|carrera|avenida|diagonal|transversal)\s+(\d+[a-z]?)\b/);return m?m[1]+' '+m[2]:null;};
  const house=s=>{const m=strip(s).match(/#\s*([\da-z]+)\s*[- ]\s*(\d+[a-z]?)\b/);return m?[m[1],m[2]]:null;};
  const center=[11.006,-74.2464];
  function meters(a,b){const d=Math.PI/180,dy=(a[0]-b[0])*d,dx=(a[1]-b[1])*d;const x=Math.sin(dy/2)**2+Math.cos(a[0]*d)*Math.cos(b[0]*d)*Math.sin(dx/2)**2;return 12742000*Math.asin(Math.min(1,Math.sqrt(x)));}
  const cacheName='domicilio-v51-geocoding-cache';
  function getCache(){try{return JSON.parse(root.localStorage?.getItem(cacheName)||'{}')||{};}catch(_){return {};}}
  function saveCache(cache){try{const entries=Object.entries(cache).slice(-250);root.localStorage?.setItem(cacheName,JSON.stringify(Object.fromEntries(entries)));}catch(_){}}
  let lastRequest=0, queue=Promise.resolve();
  function throttledSearch(query){
    // Cola global: evita peticiones paralelas a la instancia pública de Nominatim.
    const job=queue.then(async()=>{
      const pause=Math.max(0,1250-(Date.now()-lastRequest));if(pause)await new Promise(done=>setTimeout(done,pause));
      lastRequest=Date.now();
      const url='https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=co&q='+encodeURIComponent(query);
      const result=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'Accept':'application/json'}});
      if(!result.ok)throw Error(result.status===429?'El servicio de direcciones está limitado; vuelve a intentar después.':'El servicio de direcciones no respondió (HTTP '+result.status+').');
      return result.json();
    });
    queue=job.catch(()=>{});
    return job;
  }
  function choose(hits,address){
    const wantedRoad=road(address);const h=house(address);
    for(const item of Array.isArray(hits)?hits:[]){
      const lat=Number(item.lat),lng=Number(item.lon);if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)continue;
      // No mandar al domiciliario a otra ciudad aunque el buscador devuelva un nombre parecido.
      if(meters([lat,lng],center)>30000)continue;
      const matchText=strip([item.display_name,item.address?.road,item.address?.pedestrian].filter(Boolean).join(' '));
      if(wantedRoad && road(item.address?.road||item.address?.pedestrian||item.display_name)!==wantedRoad)continue;
      const itemHouse=strip(item.address?.house_number||'');
      const exact=Boolean(h && itemHouse && itemHouse.replace(/\s+/g,'').replace(/-/g,'')===(h[0]+h[1]));
      return {lat,lng,source:'osm',accuracy:exact?'portal':'calle',label:exact?'Portal encontrado en el mapa':'Punto aproximado de la calle (NO es la casa)',display:item.display_name||'',needsConfirmation:!exact};
    }
    return null;
  }
  async function lookup(address){
    const value=String(address||'').trim();if(!value)return {status:'pending',reason:'Dirección vacía'};
    const normalized=strip(value),cache=getCache(),saved=cache[normalized];
    if(saved && Date.now()-saved.savedAt<14*86400000)return {...saved.result,fromCache:true};
    try{
      let picked=choose(await throttledSearch(value+', Ciénaga, Magdalena, Colombia'),value);
      if(!picked && road(value))picked=choose(await throttledSearch(road(value)+', Ciénaga, Magdalena, Colombia'),value);
      const result=picked?{status:'found',...picked}:{status:'pending',reason:'No se identificó con seguridad la calle en Ciénaga'};
      cache[normalized]={savedAt:Date.now(),result};saveCache(cache);return result;
    }catch(e){return {status:'error',reason:e?.message||'No se pudo consultar el mapa'};}
  }
  root.domicilioLocationLookup={lookup,choose,road,house,meters};
})(typeof window!=='undefined'?window:globalThis);
