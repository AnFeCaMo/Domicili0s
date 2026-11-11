/* Prueba de integración del botón único sin depender de internet ni GPS. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes={};
function el(id){return nodes[id] ||= {id,children:[],style:{},dataset:{},disabled:false,textContent:'',replaceChildren(...els){this.children=[...els]},appendChild(x){this.children.push(x);return x},append(...els){this.children.push(...els)},insertAdjacentElement(where,x){this.next=x;},addEventListener(type,fn){this['on'+type]=fn;},setAttribute(){}};}
for(const id of ['v5-plan-status','bulk-status','v5-optimize-all','v5-optimize-orders','return-to-start','v5-mobile-end-shift'])el(id);
const doc={getElementById:el,createElement:tag=>el(Symbol(tag))};
const orders=[]; const rules=[],knownAddresses=[];
const pending={name:'Mónica García',address:'Carrera 18 #29-18',reference:'',priority:'normal'};
let saved=0,rendered=0;
const ctx={window:{domicilioBulkV5:{getDraft:()=>[pending],clear(){ctx.cleared=true;}},domicilioNormalizeAddress:s=>s,domicilioSeparatePedidoFields:(name,address,reference)=>({name,address,reference}),v3Refresh(){},domicilioNav:{currentTargetId:()=>null},domicilioRouteOptimizer:{}},document:doc,localStorage:{getItem(){return null;},setItem(){}},navigator:{geolocation:{getCurrentPosition(ok,err){err({});}}},pedidos:orders,learnedRules:rules,knownAddresses,startLocation:[11,-74.24],gpsPosition:null,generatePedidoId:()=>String(Math.random()),getRoutePedidos:()=>orders.filter(p=>p.status==='pendiente'),saveState(){saved++},renderPedidoList(){rendered++},updatePedidoMarker(){},calculateRoute(){throw Error('Should not calculate route without coords');},showToast(){},confirm:()=>true,fetch:()=>{throw Error('Should not request matrix without coords');},Number,Math,JSON,Array,Set,Map,Promise,Date,console};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../frontend/v5.js','utf8'),ctx);
(async()=>{
 await ctx.window.domicilioV5.optimize();
 const p=el('v5-proposal'),approve=p.children.find(x=>x.textContent?.includes('Aprobar'));
 assert(approve,'Debe mostrar botón de aprobación');
 await approve.onclick();
 assert.strictEqual(orders.length,1,'Pedido sin GPS se conserva');
 assert.strictEqual(orders[0].lat,null);assert.strictEqual(orders[0].lng,null);
 assert(ctx.cleared);assert(saved>=1);assert(rendered>0);
 assert(rules.some(r=>r.text.includes('Una sola optimización')));
 console.log('V5: importar y ordenar un pedido sin GPS sin perderlo: OK');
})().catch(err=>{console.error(err);process.exit(1)});
