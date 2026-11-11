/* DOMICILIO V4.2: optimización sobre matriz dirigida de tiempos/costos de carretera.
   Para hasta 10 pedidos usa programación dinámica exacta (Hamiltoniano abierto/circular);
   por encima, usa heurística con mejora 2-opt. Solo considera rutas alcanzables. */
(function(root) {
  'use strict';
  function cost(path, matrix, end=null, origin=0) {
    let prev=origin, sum=0;
    for(const i of path) {const d=matrix[prev]?.[i];if(!Number.isFinite(d))return Infinity;sum+=d;prev=i;}
    if(end!==null){const d=matrix[prev]?.[end];if(!Number.isFinite(d))return Infinity;sum+=d;}
    return sum;
  }
  function solve(indices, matrix, end=null, origin=0) {
    if(!indices.length) return [];
    if(indices.length<=10) {
      const n=indices.length, m=1<<n, best=Array.from({length:m},()=>Array(n).fill(Infinity)), prev=Array.from({length:m},()=>Array(n).fill(-1));
      for(let i=0;i<n;i++)best[1<<i][i]=matrix[origin]?.[indices[i]]??Infinity;
      for(let mask=1;mask<m;mask++)for(let last=0;last<n;last++){
        if(!(mask&(1<<last))||!Number.isFinite(best[mask][last]))continue;
        for(let next=0;next<n;next++){
          if(mask&(1<<next))continue;
          const edge=matrix[indices[last]]?.[indices[next]];
          if(!Number.isFinite(edge))continue;
          const newMask=mask|(1<<next), candidate=best[mask][last]+edge;
          if(candidate<best[newMask][next]){best[newMask][next]=candidate;prev[newMask][next]=last;}
        }
      }
      let last=-1, result=Infinity;
      for(let i=0;i<n;i++) {
        const extra=end===null?0:matrix[indices[i]]?.[end];
        if(!Number.isFinite(extra))continue;
        const candidate=best[m-1][i]+extra;
        if(candidate<result){result=candidate;last=i;}
      }
      if(last<0)throw Error('No existe una ruta vial que conecte todas las paradas.');
      const path=[];let mask=m-1;
      while(last>=0){path.push(indices[last]);const old=last;last=prev[mask][last];mask^=1<<old;}
      return path.reverse();
    }
    const remaining=indices.slice(),path=[];let at=origin;
    while(remaining.length){let best=-1,weight=Infinity;
      for(let i=0;i<remaining.length;i++){const d=matrix[at]?.[remaining[i]];if(Number.isFinite(d)&&d<weight){best=i;weight=d;}}
      if(best<0)throw Error('No existe una ruta vial que conecte todas las paradas.');
      at=remaining[best];path.push(remaining.splice(best,1)[0]);
    }
    let best=cost(path,matrix,end,origin);
    for(let pass=0;pass<6;pass++){let improved=false;
      for(let i=0;i<path.length-1;i++)for(let j=i+1;j<path.length;j++){
        const proposed=[...path.slice(0,i),...path.slice(i,j+1).reverse(),...path.slice(j+1)];
        const c=cost(proposed,matrix,end,origin);
        if(c<best){path.splice(0,path.length,...proposed);best=c;improved=true;}
      }
      if(!improved)break;
    }
    if(!Number.isFinite(best))throw Error('No se pudo construir una ruta vial completa.');
    return path;
  }
  function withPriority(indices, matrix, end=null, ranks={}, locked=null) {
    const fixed=locked===null?[]:[locked], unassigned=indices.filter(i=>i!==locked), priority=[...new Set(unassigned.map(i=>ranks[i]??2))].sort((a,b)=>a-b);
    let previous=fixed.length?fixed[0]:0, out=[...fixed];
    for(let g=0;g<priority.length;g++){
      const group=unassigned.filter(i=>(ranks[i]??2)===priority[g]);
      const section=solve(group,matrix,g===priority.length-1?end:null,previous);
      out.push(...section);if(section.length)previous=section[section.length-1];
    }
    if(!Number.isFinite(cost(out,matrix,end)))throw Error('No se pudo calcular el recorrido completo.');
    return out;
  }
  root.domicilioRouteOptimizer={solve,withPriority,cost};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.domicilioRouteOptimizer;
})(typeof window!=='undefined'?window:globalThis);
