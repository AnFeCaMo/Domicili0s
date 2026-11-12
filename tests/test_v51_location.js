/* V5.3.2: No confundir el centro de una calle con el número de vivienda. */
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const storage={};let queries=[];
const ctx={window:{localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v}},console,fetch:async url=>({ok:true,json:async()=>{
  const q=decodeURIComponent(url);queries.push(q);
  if(q.toLowerCase().includes('carrera 11')&&q.toLowerCase().includes('calle 14'))return [{lat:'11.006',lon:'-74.2464',display_name:'Calle 14 con Carrera 11, Ciénaga',address:{road:'Calle 14'}}];
  if(q.toLowerCase().includes('calle 14'))return [{lat:'11.006',lon:'-74.2464',display_name:'Calle 14, Ciénaga',address:{road:'Calle 14'}}];
  return [];
}}),setTimeout,Date,AbortSignal,Math,Number,JSON,Array,Promise,Error};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../frontend/location-lookup.js','utf8'),ctx);
(async()=>{
 const l=ctx.window.domicilioLocationLookup;
 assert.strictEqual(l.road('Calle 14 #11-12'),'calle 14');
 assert.strictEqual(l.intersectingRoad('Calle 14 #11-12').cross,'carrera 11');
 assert.strictEqual(l.intersectingRoad('Carrera 25 #18C-86').cross,'calle 18c');
 assert.strictEqual(l.choose([{lat:'11.006',lon:'-74.2464',display_name:'Calle 14, Ciénaga',address:{road:'Calle 14'}}],'Calle 14 #11-12'),null);
 const hit=await l.lookup('Calle 14 #11-12');
 assert.strictEqual(hit.status,'found');assert.strictEqual(hit.accuracy,'interseccion');assert(hit.needsConfirmation);
 const again=await l.lookup('Calle 14 #11-12');assert(again.fromCache);
 assert(queries.some(q=>q.toLowerCase().includes('calle 14 con carrera 11')));
 const no=await l.lookup('Carrera 99 #1-23');assert.strictEqual(no.status,'pending');
 console.log('V5.3.2: interseccion Calle/Carrera, cache, sin centros de calle ni coordenadas inventadas: OK');
})().catch(e=>{console.error(e);process.exitCode=1});
