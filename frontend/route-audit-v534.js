/* V5.3.4: comprobación independiente de la calidad de una ruta. No indica contravías. */
(function(root){
  'use strict';
  const rad=x=>x*Math.PI/180;
  function distance(a,b){
    if(!Array.isArray(a)||!Array.isArray(b)||![...a,...b].every(Number.isFinite))return NaN;
    const dlat=rad(b[0]-a[0]),dlon=rad(b[1]-a[1]);
    const h=Math.sin(dlat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dlon/2)**2;
    return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  function evaluate(origin,destination,data){
    const direct=distance(origin,destination);
    const candidates=Array.isArray(data?.routes)?data.routes.filter(r=>Number.isFinite(r?.distance)&&r.distance>=0&&Number.isFinite(r?.duration)&&r.duration>=0):[];
    if(!Number.isFinite(direct)||!candidates.length)return {valid:false,issues:['No hay datos suficientes para verificar el recorrido.'],directMeters:direct};
    const offsets=(Array.isArray(data?.waypoints)?data.waypoints:[]).map(w=>Number(w?.distance));
    const snapOrigin=offsets.length>0&&Number.isFinite(offsets[0])?offsets[0]:null;
    const snapDestination=offsets.length>1&&Number.isFinite(offsets[1])?offsets[1]:null;
    // Equilibrar duración y distancia entre alternativas que OSRM declare permitidas.
    // No crear atajos ni ignorar restricciones viales. 0.08 s por metro penaliza rodeos excesivos.
    const score=r=>r.duration+0.08*r.distance;
    const chosen=candidates.reduce((a,b)=>score(b)<score(a)?b:a);
    const issues=[];
    if(snapOrigin!==null&&snapOrigin>60)issues.push(`El inicio de la ruta está desplazado ${Math.round(snapOrigin)} m respecto al GPS.`);
    if(snapDestination!==null&&snapDestination>65)issues.push(`El final de la ruta queda a ${Math.round(snapDestination)} m del punto del pedido.`);
    const longDetour=direct>15&&direct<400&&chosen.distance>Math.max(450,direct*4)&&chosen.distance-direct>350;
    if(longDetour)issues.push(`El recorrido por calles mide ${Math.round(chosen.distance)} m para una distancia directa de ${Math.round(direct)} m. Comprueba la ubicación del domicilio y los sentidos viales.`);
    const end=chosen?.geometry?.coordinates?.at(-1);
    const endGap=end?distance([end[1],end[0]],destination):null;
    if(Number.isFinite(endGap)&&endGap>70&&!(snapDestination!==null&&snapDestination>65))issues.push(`La línea de ruta termina a ${Math.round(endGap)} m del punto solicitado.`);
    return {valid:true,route:chosen,directMeters:direct,routeMeters:chosen.distance,routeSeconds:chosen.duration,ratio:direct>=1?chosen.distance/direct:null,snapOrigin,snapDestination,issues,suspicious:issues.length>0,longDetour};
  }
  root.domicilioRouteAudit={distance,evaluate};
})(typeof window!=='undefined'?window:globalThis);
