const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const env={window:{}};vm.createContext(env);vm.runInContext(fs.readFileSync('frontend/route-audit-v534.js','utf8'),env);
const audit=env.window.domicilioRouteAudit;
const from=[11,-74],to=[11,-73.998];
function route(distance,duration){return {distance,duration,geometry:{coordinates:[[from[1],from[0]],[to[1],to[0]]]},legs:[]};}
let choice=audit.evaluate(from,to,{routes:[route(900,60),route(250,75)],waypoints:[{distance:0},{distance:0}]});
assert.equal(choice.routeMeters,250,'Preferir menor recorrido permitido, aunque sea ligeramente más lento');
choice=audit.evaluate(from,to,{routes:[route(300,65),route(180,1500)],waypoints:[{distance:0},{distance:0}]});
assert.equal(choice.routeMeters,300,'Evitar una ruta de gran demora');
const nav=fs.readFileSync('frontend/navigation.js','utf8');
assert(nav.includes('offRouteSamples>=2'),'Desvío validado por varias lecturas');
assert(nav.includes('Actualizando la ruta desde donde estás'),'Recalcular desde GPS actual');
const app=fs.readFileSync('frontend/app.js','utf8');
assert(app.includes('domicilio-order-pin--${tone}'),'Colores diferentes para pedidos');
assert(app.includes('zIndexOffset:isCurrent?1200'),'Destino activo por delante de otros');
const html=fs.readFileSync('frontend/index.html','utf8');
assert(html.includes('DOMICILIO V5.6.0')&&html.includes('id="v540-map-legend"'));
console.log('V5.4.1: distancia prioritaria, desvíos, marcadores y leyenda: OK');
