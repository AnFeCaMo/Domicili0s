const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('frontend/monitor-v533.js','utf8');
const html=fs.readFileSync('frontend/index.html','utf8');
const nav=fs.readFileSync('frontend/navigation.js','utf8');
const app=fs.readFileSync('frontend/app.js','utf8');
const v5=fs.readFileSync('frontend/v5.js','utf8');
for(const id of ['monitor-v533-panel','monitor-v533-enabled','monitor-v533-status','monitor-v533-alerts','monitor-v533-route-alert'])assert(html.includes(`id="${id}"`),`Falta ${id}`);
assert(html.includes('/static/monitor-v533.js?v=534'));
assert(nav.includes("ingestGps?.(pos,'navegacion')"));
assert(app.includes("ingestGps?.(position,'gps-general')"));
assert(v5.includes("ingestGps?.(pos,'optimizacion')"));
const orders=[{id:'a',number:1,name:'Cliente',address:'Calle 14 #11-12',lat:11.003,lng:-74.25,locationStatus:'estimada',locationAccuracy:'interseccion',locationEvidence:'Calle 14 con Carrera 21, Ciénaga'}];
const rules=[{id:'r1',text:'Entrega sin regresar a base'},{id:'r2',text:'Entrega sin regresar a base'}];
const ctx={
 window:{domicilioMonitorData:()=>({orders,rules,knownAddresses:[]}),domicilioLocationLookup:{intersectingRoad:()=>({main:'calle 14',cross:'carrera 11',last:'12'})},domicilioNormalizeAddress:x=>x},
 document:{getElementById:()=>null,addEventListener:()=>{},hidden:false},
 localStorage:{getItem:()=>null,setItem:()=>{}},
 setInterval:()=>0,
 Date,Math,Number,Set,Array,String,RegExp
};
vm.createContext(ctx);vm.runInContext(source,ctx);
const monitor=ctx.window.domicilioMonitor;
assert(monitor,'El monitor debe estar instalado');
const result=monitor.reviewAll();
assert(result.alerts.some(x=>x.key==='mismatch-a'),'Debe alertar cuando la carrera del mapa sea distinta');
assert(result.alerts.some(x=>x.key==='approx-a'),'Debe diferenciar intersección de casa verificada');
assert(result.alerts.some(x=>x.key==='rules-duplicates'),'Debe identificar reglas duplicadas');
const gps=(lat,lng,accuracy,time)=>({coords:{latitude:lat,longitude:lng,accuracy},timestamp:time});
const now=Date.now();
assert.equal(monitor.ingestGps(gps(11.006,-74.246,12,now)),true);
assert.equal(monitor.ingestGps(gps(11.08,-74.1,8,now+1200)),false,'Salto de kilómetros debe descartarse');
assert.equal(monitor.lastGps.coords[0],11.006,'No mover origen tras salto');
assert.equal(monitor.ingestGps(gps(11.00605,-74.24602,17,now+2000)),true,'Un desplazamiento pequeño debe permitirse');
assert.equal(monitor.ingestGps(gps(11.007,-74.25,500,now+3000)),false,'Precisión ±500m debe rechazarse');
orders[0].locationStatus='confirmada';orders[0].locationAccuracy='portal';orders[0].locationEvidence='';
assert(!monitor.orderAlerts(orders[0]).some(x=>x.key==='approx-a'),'No señalar confirmado como aproximado');
orders[0].lat=null;orders[0].lng=null;
assert(monitor.orderAlerts(orders[0]).some(x=>x.key==='missing-a'),'Mantener el pedido sin GPS y alertar');
monitor.setEnabled(false);
assert.equal(monitor.enabled,false);
console.log('V5.3.3 monitor: GPS saltos, precisión, coincidencia de calles, reglas repetidas y desactivación: OK');
