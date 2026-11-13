const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const nodes={};function el(id){return nodes[id]||=( {id,children:[],style:{},dataset:{},textContent:'',disabled:false,
  replaceChildren(...xs){this.children=[...xs];},appendChild(x){this.children.push(x);return x;},append(...xs){this.children.push(...xs)},insertAdjacentElement(_,x){this.next=x},addEventListener(type,fn){this['on'+type]=fn;},setAttribute(){},removeAttribute(){}});}
for(const id of ['v5-plan-status','bulk-status','v5-optimize-all','v5-optimize-orders','return-to-start'])el(id);
const origin=[11.006,-74.2464];const a={id:'a',name:'A',address:'Calle 14 #11-20',reference:'',priority:'normal',status:'pendiente',lat:11.01,lng:-74.24,number:1,locationStatus:'confirmada'};
const b={id:'b',name:'B',address:'Calle 14 #12-20',reference:'',priority:'normal',status:'pendiente',lat:11.011,lng:-74.241,number:2,locationStatus:'confirmada'};
const pedidos=[a,b],learnedRules=[],knownAddresses=[];let rendered=0,calculated=0,forcedMap=0,fetches=0;
const durations=[[0,10,60],[10,0,10],[60,60,0]];
const distances=[[0,1000,100],[100,0,1000],[100,100,0]];
const ctx={
  window:{isSecureContext:true,domicilioLocationLookup:{lookup:async()=>({status:'pending'})},
    domicilioBulkV5:{getDraft:()=>[],clear(){}},domicilioNormalizeAddress:s=>s,
    domicilioSeparatePedidoFields:(name,address,reference)=>({name,address,reference}),
    domicilioRouteOptimizer:null,v3Refresh(){},v3Navigate(){forcedMap++},domicilioNav:{currentTargetId:()=>null},
    domicilioMonitor:{ingestGps:()=>true,reviewAll(){}}},
  document:{getElementById:el,createElement:tag=>el(Symbol(tag))},
  localStorage:{getItem(){return null},setItem(){}},
  navigator:{geolocation:{getCurrentPosition(ok){ok({coords:{latitude:origin[0],longitude:origin[1],accuracy:8}})}}},
  pedidos,learnedRules,knownAddresses,gpsPosition:null,generatePedidoId:()=>String(Math.random()),
  getRoutePedidos:()=>pedidos.filter(p=>p.status==='pendiente'),
  saveState(){},renderPedidoList(){rendered++},updatePedidoMarker(){},
  calculateRoute(){calculated++},showToast(){},confirm:()=>true,
  fetch:async url=>{assert(url.includes('annotations=distance,duration'));fetches++;return {ok:true,json:async()=>({code:'Ok',distances,durations})}},
  AbortSignal:{timeout(){return undefined}},Number,Math,JSON,Array,Set,Map,Promise,Date,console
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('frontend/route-optimizer.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('frontend/v5.js','utf8'),ctx);
(async()=>{
  await ctx.window.domicilioV5.optimize();
  const proposal=el('v5-proposal');const approve=proposal.children.find(x=>x.textContent?.includes('Aprobar'));
  assert(approve,'Se debe solicitar aprobación del orden');
  await approve.onclick();
  assert.equal(fetches,1);
  assert.deepEqual(pedidos.map(x=>x.id),['b','a'],'El orden por distancia debe preferir B antes que A');
  assert.equal(rendered,1,'Lista actualizada tras aprobar');
  assert.equal(calculated,1,'Se dibuja el recorrido solo con puntos localizados');
  assert.equal(forcedMap,0,'No debe abrir el mapa al aprobar');
  console.log('V5.4.1: matriz vial por distancia, aprobación y lista sin salto al mapa: OK');
})().catch(e=>{console.error(e);process.exitCode=1});
