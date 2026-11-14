/* DOMICILIO V5.5.0 — nomenclatura, memoria de ubicaciones CONFIRMADAS y numeración visual.
 * No inventa coordenadas. Funciona sin servicios de pago y puede cargarse sin conexión. */
(function(root){
  'use strict';
  const ascii=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const aliases={cl:'Calle',cll:'Calle',calle:'Calle',cr:'Carrera',cra:'Carrera',kr:'Carrera',carrera:'Carrera',av:'Avenida',avenida:'Avenida',dg:'Diagonal',diagonal:'Diagonal',tv:'Transversal',transversal:'Transversal'};
  const digits=s=>String(s||'').replace(/\s+/g,'').toUpperCase();
  function normalize(value){
    let s=String(value??'').trim().replace(/\s+/g,' ');
    if(!s)return '';
    s=s.replace(/^(cll?|cra?|kr|calle|carrera|av|avenida|dg|diagonal|tv|transversal)\.?\s*/i,(m,kind)=>aliases[kind.toLowerCase()]+' ');
    s=s.replace(/\b(?:n[uú]mero|nro\.?|no\.?|num\.?|numeral)\s*/gi,'#');
    s=s.replace(/\s*#\s*/g,' #').replace(/\s*[–—]\s*/g,'-');
    const m=s.match(/^(Calle|Carrera|Avenida|Diagonal|Transversal)\s+(\d+[a-z]?)(?:\s+(?:con\s+)?(?:calle|carrera|cra\.?|cll?\.?)\s+|\s*#\s*|\s+)(\d+[a-z]?)(?:\s*-\s*|\s+)(\d+[a-z]?)(?=\b|\s|$)(.*)$/i);
    if(m)return `${m[1]} ${digits(m[2])} #${digits(m[3])}-${digits(m[4])}${m[5]||''}`.replace(/\s+/g,' ').trim();
    return s.replace(/\s+/g,' ').trim();
  }
  function parts(value){
    const s=normalize(value);
    const m=s.match(/^(Calle|Carrera|Avenida|Diagonal|Transversal)\s+(\d+[A-Z]?)(?:\s*#\s*(\d+[A-Z]?)\s*-\s*(\d+[A-Z]?))?(?:\b|\s|$)/i);
    return m?{type:m[1].toLowerCase(),main:digits(m[2]),cross:m[3]?digits(m[3]):null,door:m[4]?digits(m[4]):null,complete:Boolean(m[3]&&m[4])}:null;
  }
  function key(value){
    const p=parts(value);
    if(p?.complete)return [p.type,p.main,p.cross,p.door].join('|').toLowerCase();
    return ascii(normalize(value)).replace(/[.,#\s-]+/g,'');
  }
  const coords=a=>a&&Number.isFinite(Number(a.lat))&&Number.isFinite(Number(a.lng))&&Math.abs(Number(a.lat))<=90&&Math.abs(Number(a.lng))<=180;
  function verified(a){return Boolean(coords(a)&&a.needsLocationReview!==true&&(a.source==='gps-confirmado'||a.source==='mapa-confirmado'||a.locationSource==='gps-confirmado'||a.locationSource==='mapa-confirmado'||a.verifiedAt));}
  function findConfirmed(address,entries){
    const target=parts(address);if(!target?.complete)return null;
    const same=(entries||[]).filter(a=>verified(a)&&parts(a.address)?.complete&&key(a.address)===key(address));
    return same.length?same[same.length-1]:null;
  }
  function relativeNumber(p,entries){const pending=(entries||[]).filter(x=>!['entregado','fallido','anulado'].includes(x.status));const i=pending.findIndex(x=>x.id===p?.id);return i<0?null:i+1;}
  function status(p){if(!coords(p)||p.needsLocationReview)return 'pendiente';if(verified(p))return 'confirmada';return 'aproximada';}
  root.domicilioV55={normalize,parts,key,verified,findConfirmed,relativeNumber,status};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.domicilioV55;
})(typeof window!=='undefined'?window:globalThis);
