/* DOMICILIO V5.3: conservación del historial, limpieza segura y asistente local. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const mem=new Map(),elements=new Map(),notices=[];
const el=id=>{if(!elements.has(id))elements.set(id,{id,children:[],textContent:'',value:'',checked:true,addEventListener(type,fn){this['on'+type]=fn;},replaceChildren(...v){this.children=v},appendChild(x){this.children.push(x)},append(x){this.children.push(x)}});return elements.get(id)};
const records=[{id:'a',number:1,name:'Entregado',address:'Calle 10 #5-30',lat:11,lng:-74,status:'entregado'},
 {id:'b',number:2,name:'Pendiente',address:'Carrera 11 #12-20',lat:null,lng:null,status:'pendiente'},
 {id:'c',number:3,name:'Ausente',address:'Carrera 15 #19-01',lat:11,lng:-74,status:'fallido',failedReason:'Cliente ausente'}];
let stops=0,writes=0;
const ctx={window:{domicilioNav:{stop(){stops++},currentTargetId:()=>null},v3Navigate:()=>{}},document:{getElementById:el,querySelectorAll:()=>[],createElement:tag=>({tagName:tag,children:[],appendChild(x){this.children.push(x)},textContent:'',className:''})},localStorage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)},pedidos:records,pedidoMarkers:new Map(),mapInstance:null,routeLine:null,saveState(){writes++;mem.set('domicilios-cienaga-state',JSON.stringify({orders:records}))},renderPedidoList(){},showToast:(...v)=>notices.push(v),confirm:()=>true,Date,Math,JSON,Array,Map,console};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('frontend/v53.js','utf8'),ctx);
const v=ctx.window.domicilioV53;
assert.equal(v.finishShift(),true);
assert.equal(records.length,0);
assert.equal(v.readHistory().length,1);
assert.equal(v.readHistory()[0].orders.length,3);
assert.equal(v.readHistory()[0].orders.map(p=>p.status).join(','),'entregado,no_realizado,fallido');
assert.ok(writes>=1);assert.equal(stops,1);
assert.equal(v.finishShift(),false,'No archivar jornadas vacías');
assert.equal(v.readHistory().length,1);
el('v53-question').value='¿Por qué falta el GPS?';el('v53-ask').onclick();
assert.match(el('v53-answer').textContent,/ubicación|GPS/);
assert.equal(v.restoreHistory([]),true);
assert.equal(v.readHistory().length,0);
console.log('V5.3: historial persistente, limpieza confirmada, pedidos fallidos y ayuda local: OK');
