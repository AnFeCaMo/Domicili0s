/* DOMICILIO V5.4.2 — importador conservador de direcciones colombianas.
 * No consulta GPS, no inventa coordenadas, no crea pedidos y no cambia rutas.
 * Devuelve los campos por separado y señala placas ambiguas para revisión.
 */
(function(root) {
  'use strict';
  const STREET = '(?:calle|cll?\\.?|carrera|cra?\\.?|cr\\.?|kr\\.?|avenida|av\\.?|diagonal|dg\\.?|transversal|tv\\.?|manzana|mz\\.?)';
  const START = new RegExp('^\\s*'+STREET+'\\s+(?:\\d+[A-Za-z]?|(?:un|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis|dieciséis|diecisiete|dieciocho|diecinueve|veinte|veinti\\w+|treinta|cuarenta))\\b','i');
  const STREET_AT = new RegExp('\\b'+STREET+'\\s+(?:\\d+[A-Za-z]?|(?:diez|once|doce|trece|catorce|quince|dieci\\w+|veinti\\w+|treinta|cuarenta|cinco|seis|siete|ocho|nueve))','gi');
  const ADDRESS = /^((?:Calle|Carrera|Avenida|Diagonal|Transversal|Manzana)\s+\d+[A-Za-z]?(?:\s+bis)?(?:\s*#\s*\d+[A-Za-z]?(?:\s*[-–]\s*\d+[A-Za-z]?)?)?)(?:\s*[,;|—–]?\s*(.*))?$/i;
  const HOUSE = /#\s*\d+[A-Za-z]?\s*[-–]\s*\d+[A-Za-z]?/i;
  const NUMBER = /#\s*\d+[A-Za-z]?\s*$/i;
  const HEADING = /^(?:orden recomendado(?: de entregas)?|ruta (?:optimizada|recomendada)|lista de (?:entregas|domicilios)|entregas(?: pendientes)?|pedidos(?: pendientes)?)\s*:?$/i;
  const REFERENCE = /^(?:barrio|sector|urbanizaci[oó]n|conjunto|manzana|apartamento|apto\.?|interior|casa|torre|bloque|esquina|frente a|al lado de|diagonal a|cerca de|entrada|local|piso|vereda)\b/i;
  const SECTORS = ['Nueva Floresta','La Floresta','Puerta Negra'];
  const clean = s => String(s ?? '').replace(/\*\*/g,'').replace(/^\s*[-•*]\s*/,'').replace(/\s+/g,' ').trim();
  const numberPrefix = s => clean(s).replace(/^\d{1,3}\s*[.)]\s*/,'').replace(/\s+\d{1,3}[.)]\s*$/,'').trim();
  const unique = a => [...new Set(a.filter(Boolean))];

  function validateAddress(address) {
    const a = clean(address);
    if(!a) return {ok:false,issue:'Falta dirección. Escribe la dirección antes de optimizar.'};
    if(!/^(?:Calle|Carrera|Avenida|Diagonal|Transversal|Manzana)\s+\d/i.test(a))
      return {ok:false,issue:'Dirección no reconocida. Revisa tipo de vía y numeración.'};
    if(NUMBER.test(a)) return {ok:false,issue:'Placa ambigua: separa la numeración con guion (ej.: #18-71). No se ha supuesto el número de casa.'};
    if(!HOUSE.test(a) && !/\s+con\s+(?:Calle|Carrera)\s+\d/i.test(a))
      return {ok:false,issue:'Dirección incompleta: revisa la numeración o confirma que sea una intersección.'};
    return {ok:true,issue:''};
  }
  function extract(line, normalize) {
    const normalized = clean(normalize(line));
    const match = normalized.match(ADDRESS);
    if(!match) return null;
    return {address:clean(match[1].replace(/\s*#\s*/,' #').replace(/\s*[-–]\s*(?=\d+[A-Za-z]?\s*$)/,'-')),suffix:clean(match[2])};
  }
  function classifySuffix(suffix) {
    let rest = clean(suffix).replace(/^[,;|—–\s]+/,'');
    if(!rest) return {name:'',reference:''};
    // Una referencia conocida seguida del destinatario no debe convertirse en su nombre.
    for(const sector of SECTORS) {
      const prefix = new RegExp('^(?:(?:barrio|sector|apartamento de)\\s+)?'+sector.replace(/\s+/g,'\\s+')+'(?=\\b|[.,])','i');
      const match = rest.match(prefix);
      if(match) {
        const tail=clean(rest.slice(match[0].length).replace(/^[.,;—–\s]+/,''));
        return {name:tail,reference:match[0]};
      }
    }
    if(/^(?:esquina|frente a|al lado de)\b/i.test(rest)) {
      const m=rest.match(/^(esquina|frente a|al lado de)(?:\s*[,;—–]\s*|\s+)(.*)$/i);
      if(m && m[1].toLowerCase()==='esquina' && m[2] && !/^(?:calle|carrera|cra|cl)\b/i.test(m[2]))
        return {name:clean(m[2]),reference:'esquina'};
      return {name:'',reference:rest};
    }
    if(REFERENCE.test(rest)) return {name:'',reference:rest};
    // Texto tras una coma: un barrio/ciudad no es necesariamente un cliente.
    if(/^(?:ci[eé]naga|magdalena|colombia)\b/i.test(rest)) return {name:'',reference:rest};
    const parts=rest.split(/\s+[—–|]\s+|\s*;\s*/).map(clean).filter(Boolean);
    if(parts.length>1) {
      const ref=parts.filter(x=>REFERENCE.test(x));
      const names=parts.filter(x=>!REFERENCE.test(x));
      return {name:names[0]||'',reference:unique([...ref,...names.slice(1)]).join(' · ')};
    }
    return {name:rest,reference:''};
  }
  function parseRecord(lines, normalize, separate) {
    const values=lines.map(x=>numberPrefix(x)).filter(x=>x&&!HEADING.test(x));
    if(!values.length)return null;
    const at=values.findIndex(x=>START.test(x));
    let name='',reference='',address='';
    if(at>=0) {
      const extracted=extract(values[at],normalize);
      if(!extracted) return {name:'',address:clean(values[at]),reference:values.filter((_,i)=>i!==at).join(' · '),priority:'normal',needsAddressReview:true,addressIssue:'Revisa la estructura de la dirección.'};
      address=extracted.address;
      const pre=values.slice(0,at),post=values.slice(at+1);
      const suffix=classifySuffix(extracted.suffix);
      const before=pre.filter(x=>!HEADING.test(x));
      if(before.length) {
        name=before[0];
        const detail=name.match(/^(.*?)\s+[—–]\s+(.+)$/);
        if(detail)name=clean(detail[1]);
        reference=unique([detail?.[2],...before.slice(1),suffix.reference,suffix.name,...post]).join(' · ');
      } else {
        name=suffix.name;
        reference=suffix.reference;
        for(const p of post) {
          const part=classifySuffix(p);
          if(!name && part.name) name=part.name;
          else if(part.name) reference=unique([reference,part.name]).join(' · ');
          if(part.reference)reference=unique([reference,part.reference]).join(' · ');
        }
      }
    } else {
      // Nunca descartar silenciosamente una línea que no pudo interpretarse.
      return {name:'',address:'',reference:values.join(' · '),priority:'normal',needsAddressReview:true,addressIssue:'No se detectó una dirección. Corrígela en la vista previa.'};
    }
    const fields=typeof separate==='function'?separate(name,address,reference):{name,address,reference};
    const finalAddress=clean(fields.address||address);
    const validation=validateAddress(finalAddress);
    return {name:clean(fields.name),address:finalAddress,reference:clean(fields.reference),priority:'normal',needsAddressReview:!validation.ok,addressIssue:validation.issue};
  }
  function splitMultipleAddresses(line) {
    const text=clean(line);
    const found=[...text.matchAll(STREET_AT)].map(m=>m.index);
    if(found.length<2)return [text];
    const breaks=[0];
    for(let i=1;i<found.length;i++) {
      const part=text.slice(breaks[breaks.length-1],found[i]);
      // "Carrera 11 calle 24 16" forma una sola dirección, no dos.
      if(/(?:#\s*\d+|\b(?:n[uú]mero|numeral)\s+\d+)/i.test(part)) breaks.push(found[i]);
    }
    if(breaks.length===1)return [text];
    return breaks.map((at,i)=>clean(text.slice(at,breaks[i+1]??text.length))).filter(Boolean);
  }
  function parse(text, normalize, separate) {
    const raw=String(text||'').replace(/\r/g,'').trim();
    if(!raw)return [];
    const norm=typeof normalize==='function'?normalize:x=>x;
    let lines=raw.split('\n').flatMap(line=>splitMultipleAddresses(norm(line))).map(x=>clean(x)).filter(x=>x&&!HEADING.test(x));
    // Nombre antes de la dirección en una misma línea: «Ana López | Calle 8 #23-02».
    lines=lines.flatMap(line=>{
      if(START.test(numberPrefix(line)))return [line];
      const m=line.match(STREET_AT);
      if(!m)return [line];
      const at=line.toLowerCase().indexOf(m[0].toLowerCase());
      if(at<=0)return [line];
      const before=clean(line.slice(0,at).trim().replace(/[|;:—–,-]+$/,''));
      const address=clean(line.slice(at));
      return before&&address?[before,address]:[line];
    });
    const markers=/^(\d{1,3})\s*[.)]\s*(.*)$/;
    const single=/^\d{1,3}$/;
    let groups=[],current=[],markerCount=0;
    for(const line of lines){
      const marker=line.match(markers);
      if(marker||single.test(line)) {
        markerCount++;
        if(current.length)groups.push(current);
        current=[];
        if(marker?.[2])current.push(clean(marker[2]));
      } else current.push(line);
    }
    if(current.length)groups.push(current);
    if(markerCount>=2){return groups.map(g=>parseRecord(g,norm,separate)).filter(Boolean);}
    // Sin numeración: agrupar pares nombre/dirección y dirección/nombre.
    const records=[];let pending=[];
    for(const line of lines) {
      const isAddress=START.test(numberPrefix(line));
      if(isAddress){
        if(pending.length && !pending.some(x=>START.test(numberPrefix(x)))) {
          // Ya tenemos el cliente: nombre primero, dirección después.
          records.push([...pending,line]);pending=[];
        } else {
          if(pending.length)records.push(pending);
          pending=[line];
          const suffix=extract(line,norm)?.suffix||'';
          if(classifySuffix(suffix).name){records.push(pending);pending=[];}
        }
      } else if(pending.length && pending.some(x=>START.test(numberPrefix(x)))) {
        records.push([...pending,line]);pending=[];
      } else if(pending.length) {
        records.push(pending);pending=[line];
      } else pending=[line];
    }
    if(pending.length)records.push(pending);
    return records.map(g=>parseRecord(g,norm,separate)).filter(Boolean);
  }
  function deliveryNumber(p,orders) {
    const list=(orders||[]).filter(x=>!['entregado','fallido','anulado'].includes(x.status));
    const i=list.findIndex(x=>x.id===p?.id);
    return i>=0?i+1:null;
  }
  root.domicilioImportadorV542={parse,validateAddress,deliveryNumber};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.domicilioImportadorV542;
})(typeof window!=='undefined'?window:globalThis);
