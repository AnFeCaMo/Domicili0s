/* Verifica que la navegación no lea cada 10 metros, sino en hitos 100/50/giro. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
let watchCb, now=100000, spoken=[];
const ids={};
function el(id){return ids[id] ||= {id,checked:true,hidden:false,textContent:'',addEventListener(){},setAttribute(){}};}
for(const id of ['nav-v4','nav-v4-instruction','nav-v4-state','nav-v4-details','nav-v4-auto-next','nav-v4-lost','nav-v4-repeat','nav-v4-return','nav-v4-stop','nav-v4-arrived'])el(id);
const layer=()=>({addTo(){return this;},setLatLng(){},bindPopup(){return this;},getBounds(){return {}}});
const L={circleMarker:layer,geoJSON:layer,marker:layer,divIcon:()=>({})};
const origin=[11.0,-74.25], corner=[11.0009,-74.25], target=[11.002,-74.25];
const route={distance:400,duration:75,geometry:{type:'LineString',coordinates:[[origin[1],origin[0]],[corner[1],corner[0]],[target[1],target[0]]]},legs:[{steps:[
  {maneuver:{type:'depart',location:[origin[1],origin[0]]},name:'Calle 8'},
  {maneuver:{type:'turn',modifier:'slight left',location:[corner[1],corner[0]]},name:'Carrera 10'},
  {maneuver:{type:'arrive',location:[target[1],target[0]]},name:''}
]}]};
const ctx={window:{L,addEventListener(){},v3Navigate(){}},document:{getElementById:el},L,
mapInstance:{removeLayer(){},fitBounds(){}},gpsPosition:null,startLocation:origin,pedidos:[],
showToast(){},navigator:{onLine:true,geolocation:{watchPosition(cb){watchCb=cb;return 1;},getCurrentPosition(cb){cb({coords:{latitude:origin[0],longitude:origin[1],accuracy:5}});},clearWatch(){}}},
fetch:async()=>({ok:true,json:async()=>({code:'Ok',routes:[route]})}),AbortSignal:{timeout(){return null;}},
localStorage:{getItem(){return null;},setItem(){}},SpeechSynthesisUtterance:function(t){this.text=t;},
speechSynthesis:{cancel(){},speak(u){spoken.push(u.text);}},Date:{now(){return now;}},
console,Math,JSON,Number,String,Array,Map,Set,Promise,confirm:()=>true};
ctx.window.speechSynthesis=ctx.speechSynthesis;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname+'/../frontend/navigation.js','utf8'),ctx);
(async()=>{
ctx.window.domicilioNav.start({id:'p1',number:1,lat:target[0],lng:target[1]});
await new Promise(r=>setImmediate(r));
const send = meters=>{now+=10000;watchCb({coords:{latitude:corner[0]-meters/111195,longitude:corner[1],accuracy:5}});};
spoken=[];
for(const m of [180,140,125,110,100,90,80,70,60,55,50,40,35,30,20])send(m);
const turns=spoken.filter(s=>/gira ligeramente a la izquierda/.test(s));
assert.strictEqual(turns.length,3,`Se esperaban 3 avisos, hubo ${turns.length}: ${turns}`);
assert(turns[0].includes('100 metros'));
assert(turns[1].includes('50 metros'));
assert(turns[2].includes('Ahora'));
assert(!spoken.some(s=>/90 metros|80 metros|70 metros|40 metros/.test(s)));
console.log('V5.2: giros de OSRM con espacios y avisos discretos a 100 m, 50 m y giro: OK');
})().catch(e=>{console.error(e);process.exit(1)});
