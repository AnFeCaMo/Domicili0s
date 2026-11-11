const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const txt=fs.readFileSync('frontend/app.js','utf8');
const pick=(start,end)=>txt.slice(txt.indexOf(start),txt.indexOf(end));
const env={window:{}};
vm.runInNewContext(pick('function normalizeAddress(raw) {','window.domicilioNormalizeAddress=normalizeAddress;')+'\n'+pick('function separatePedidoFields(name, address, reference=','window.domicilioSeparatePedidoFields=separatePedidoFields;')+'\n'+pick('function parseAddressList(text) {','window.v3ParseAddressList = parseAddressList;')+'\nthis.parse=parseAddressList;this.separate=separatePedidoFields;',env);
const ordered=`Orden recomendado de entregas
1
Mónica García
Carrera 18 #29-18
2
Mateus Marcos
Calle 17 #22-20
3
Caterin Zarate
Calle 14 #25-86
4
Karen Fornaris
Carrera 25 #18C-86
5
Inocencia Mora — Apartamento de puerta negra
Carrera 25 #18C-30
6
Galán Estefany — La Floresta
Carrera 26 #18-71
7
Silva Cleotilde — Nueva Floresta
Carrera 34A #19-18`;
const rows=env.parse(ordered);assert.equal(rows.length,7);assert.deepEqual(Array.from(rows,r=>r.name),['Mónica García','Mateus Marcos','Caterin Zarate','Karen Fornaris','Inocencia Mora','Galán Estefany','Silva Cleotilde']);
assert.equal(rows[4].reference,'Apartamento de puerta negra');assert.equal(rows[5].reference,'La Floresta');assert.equal(rows[6].reference,'Nueva Floresta');
assert.equal(rows[6].address,'Carrera 34A #19-18');
const addressFirst=env.parse('1. Carrera 18 #29-18\nMónica García\n2. Calle 17 #22-20\nMateus Marcos 3.\n3. Calle 14 #25-86\nCaterin Zarate');
assert.equal(addressFirst.length,3);assert.equal(addressFirst[1].name,'Mateus Marcos');
assert.equal(env.separate('Mateus Marcos 3.','Calle 17 #22-20').name,'Mateus Marcos');
assert.equal(env.separate('número 23 02 esquina Ana López','Calle 8 #23-02').reference,'esquina');
console.log('V4.5: listas numeradas, nombres, direcciones y referencias: OK');
