const assert=require('node:assert/strict');
const api=require('../frontend/address-intelligence-v550.js');
const journey=require('../frontend/smart-journey-v560.js');
globalThis.domicilioV55=api;
globalThis.pedidos=[
  {id:'a',number:1,address:'Calle 14 #25-86',lat:null,lng:null,status:'pendiente'},
  {id:'b',number:2,address:'Carrera 26 #24-18',lat:null,lng:null,status:'pendiente'},
  {id:'c',number:3,address:'Calle 16 #22-10',lat:null,lng:null,status:'pendiente'},
  {id:'d',number:4,address:'No definida',lat:null,lng:null,status:'pendiente'}
];
globalThis.getRoutePedidos=()=>pedidos.filter(p=>p.status==='pendiente');
assert.equal(journey.sector(pedidos[0]),'centro');
assert.equal(journey.sector(pedidos[1]),'calles-altas');
assert.equal(journey.sector(pedidos[2]),'centro');
assert.equal(journey.sector(pedidos[3]),'sin-determinar');
assert.deepEqual(journey.proposeSectors(pedidos).map(p=>p.id),['a','c','b','d']);
assert.deepEqual(journey.stats().bySector,{centro:2,'calles-altas':1,'sin-determinar':1});
assert.equal(journey.stats().outstanding,4);
assert.equal(journey.processVoice('siguiente dirección').action,'read-next');
assert.equal(journey.processVoice('estado de la jornada').action,'read-stats');
assert.equal(journey.processVoice('entregado pedido 1').action,'confirm-manually');
assert.equal(pedidos[0].status,'pendiente','voice must not mark delivered');
let navId='b';globalThis.domicilioNav={currentTargetId:()=>navId};
assert.equal(journey.proposeSectors(pedidos)[0].id,'b');
assert.equal(journey.applyOrder([pedidos[0],pedidos[1],pedidos[2],pedidos[3]]),false,'active delivery cannot be moved');
console.log('V5.6: sector agrupado, proteccion navegacion, voz sin acciones destructivas: OK');
