/* Regresión V5.2: calle aproximada, orden mixto y origen fresco. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements={};
function node(id){return elements[id]||=( {id,style:{},children:[],disabled:false,replaceChildren(...x){this.children=[...x]},appendChild(x){this.children.push(x)},append(...x){this.children.push(...x)},insertAdjacentElement(_,x){this.proposal=x},addEventListener(){},setAttribute(){},textContent:''});}
const orders=[];let gpsSuccess;
const ctx={window:{isSecureContext:true,domicilioRouteOptimizer:{withPriority(ids){return ids;},cost(){return 250;}},domicilioLocationLookup:{lookup:async()=>({status:'pending'})},domicilioBulkV5:{getDraft:()=>[],clear(){}},domicilioNormalizeAddress:s=>s,domicilioSeparatePedidoFields:(name,address,reference)=>({name,address,reference})}, document:{getElementById:node,createElement:tag=>node(Symbol(tag))},localStorage:{getItem(){return null},setItem(){}},navigator:{geolocation:{getCurrentPosition(ok){gpsSuccess=ok;ok({coords:{latitude:11.001,longitude:-74.2,accuracy:8}})}}},startLocation:[11,-74.24],pedidos:orders,knownAddresses:[],learnedRules:[],gpsPosition:null,generatePedidoId:()=>String(Math.random()),getRoutePedidos:()=>[],saveState(){},renderPedidoList(){},updatePedidoMarker(){},calculateRoute(){},showToast(){},confirm:()=>true,fetch:async()=>({ok:true,json:async()=>({code:'Ok',durations:[[0,100,120],[100,0,40],[120,40,0]]})}),AbortSignal:{timeout:()=>null},Number,Math,Date,JSON,Array,Set,Map,Promise,console};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../frontend/v5.js','utf8'),ctx);
const v=ctx.window.domicilioV5;
const a={id:'a',address:'Carrera 18 #29-18',priority:'normal'},mid={id:'m',address:'Carrera 19 #29-22'},b={id:'b',address:'Carrera 22 #29-10'};
const ordered=v.mergeUnknown([a,b],[mid]);
assert.strictEqual(ordered.map(x=>x.id).join(','),'a,m,b','La parada sin GPS debe intercalarse por nomenclatura');
assert.strictEqual(v.mergeUnknown([a,b],[mid],'a')[0].id,'a','La entrega activa debe permanecer primero');
assert(v.valid({lat:11,lng:-74.2,needsLocationReview:false}));
assert(!v.valid({lat:11,lng:-74.2,needsLocationReview:true}));
assert.strictEqual(v.routeOrigin().join(','),'11,-74.24','Sin GPS no se debe afirmar una posición actual');
(async()=>{await v.optimize();assert.strictEqual(v.routeOrigin().join(','),'11.001,-74.2');
assert(v.recordDeliveredOrigin([11.002,-74.203],8));
assert.strictEqual(v.lastConfirmed.coords.join(','),'11.002,-74.203');
console.log('V5.2: paradas mixtas, destino protegido, GPS fresco y última entrega: OK');})().catch(e=>{console.error(e);process.exit(1)});
