/* Validación sin llamadas reales a Nominatim; evita adjudicar casas sin prueba. */
const assert=require('assert');const fs=require('fs'),vm=require('vm');
const storage={};
const ctx={window:{localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v}},console,fetch:async url=>({ok:true,json:async()=>{
  if(decodeURIComponent(url).includes('Calle 14')) return [{lat:'11.006',lon:'-74.2464',display_name:'Calle 14, Ciénaga, Magdalena, Colombia',address:{road:'Calle 14'}}];
  return [];
}}),setTimeout,Date,AbortSignal,Math,Number,JSON,Array,Promise,Error};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../frontend/location-lookup.js','utf8'),ctx);
(async()=>{
 const l=ctx.window.domicilioLocationLookup;
 assert.strictEqual(l.road('Calle 14 #25-86'),'calle 14');
 assert(l.choose([{lat:'11.006',lon:'-74.2464',display_name:'Calle 14, Ciénaga',address:{road:'Calle 14'}}],'Calle 14 #25-86').needsConfirmation);
 assert.strictEqual(l.choose([{lat:'11.006',lon:'-74.2464',display_name:'Calle 140, Ciénaga',address:{road:'Calle 140'}}],'Calle 14 #25-86'),null);
 const hit=await l.lookup('Calle 14 #25-86');
 assert.strictEqual(hit.status,'found');assert.strictEqual(hit.accuracy,'calle');assert(hit.needsConfirmation);
 const again=await l.lookup('Calle 14 #25-86');assert(again.fromCache);
 const no=await l.lookup('Carrera 99 #1-23');assert.strictEqual(no.status,'pending');
 console.log('V5.1: búsqueda real, coincidencia de calle, GPS aproximado, caché y casos sin resultado: OK');
})().catch(e=>{console.error(e);process.exitCode=1});
