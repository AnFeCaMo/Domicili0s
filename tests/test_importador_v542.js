'use strict';
const assert=require('node:assert/strict');
const importer=require('../frontend/address-importer-v542.js');
const normalize=s=>String(s||'').trim().replace(/\s+/g,' ')
 .replace(/\b(?:cl|cll)\.?\s+/gi,'Calle ')
 .replace(/\b(?:cra|cr|kr)\.?\s+/gi,'Carrera ')
 .replace(/\b(?:n[uú]mero|numeral)\b/gi,'#')
 .replace(/\b(calle) catorce\b/gi,'Calle 14')
 .replace(/\bveinticinco\b/gi,'25').replace(/\bochenta y seis\b/gi,'86')
 .replace(/(Calle|Carrera)\s+(\d+[A-Za-z]?)\s+(?:Calle|Carrera)\s+(\d+[A-Za-z]?)\s+(\d+[A-Za-z]?)/i,'$1 $2 #$3-$4')
 .replace(/(Calle|Carrera)\s+(\d+[A-Za-z]?)\s*#\s*(\d+[A-Za-z]?)\s+(\d+[A-Za-z]?)/i,'$1 $2 #$3-$4')
 .replace(/\s*#\s*/,' #');
const separate=(name,address,reference)=>({name,address,reference});
const parse=s=>importer.parse(s,normalize,separate);
const sample=`Orden recomendado de entregas
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
Inocencia Mora — Apartamento de Puerta Negra
Carrera 25 #18C-30
6
Galán Estefany — La Floresta
Carrera 26 #18-71
7
Silva Cleotilde — Nueva Floresta
Carrera 34A #19-18`;
let rows=parse(sample);
assert.equal(rows.length,7,JSON.stringify(rows));
assert.deepEqual(rows.map(x=>x.address),['Carrera 18 #29-18','Calle 17 #22-20','Calle 14 #25-86','Carrera 25 #18C-86','Carrera 25 #18C-30','Carrera 26 #18-71','Carrera 34A #19-18']);
assert.equal(rows[0].name,'Mónica García');
assert.equal(rows[4].name,'Inocencia Mora');
assert.equal(rows[4].reference,'Apartamento de Puerta Negra');
assert.equal(rows[6].reference,'Nueva Floresta');
assert(rows.every(x=>!x.needsAddressReview));
rows=parse('Calle 12 # 13-04\nBienestar Familiar\n\nCarrera 11A # 8A-23\nAlcaldía Municipal');
assert.equal(rows.length,2,JSON.stringify(rows));
assert.equal(rows[0].name,'Bienestar Familiar');
assert.equal(rows[1].name,'Alcaldía Municipal');
rows=parse('Ana López | Calle 8 #23-02\nPedro Torres | Carrera 11 #24-16');
assert.equal(rows.length,2,JSON.stringify(rows));
assert.equal(rows[0].name,'Ana López');
assert.equal(rows[1].name,'Pedro Torres');
rows=parse('Calle 8 #23-02 | Ana López\nCarrera 11 #24-16 | Pedro Torres');
assert.equal(rows.length,2,JSON.stringify(rows));
assert.equal(rows[0].name,'Ana López');
rows=parse('Carrera 34A #19-18, Nueva Floresta Silva Cleotilde Carrera 26 #1871 La Floresta. Galán Estefany Calle 14 #25-86 Caterin Zarate');
assert.equal(rows.length,3,JSON.stringify(rows));
assert.equal(rows[0].name,'Silva Cleotilde');
assert.equal(rows[0].reference,'Nueva Floresta');
assert.equal(rows[1].name,'Galán Estefany');
assert.equal(rows[1].needsAddressReview,true);
assert.equal(rows[2].name,'Caterin Zarate');
rows=parse('Carrera 34A número 19-18, Nueva Floresta Silva Cleotilde Carrera 26 número 1871 La Floresta. Galán Estefany Calle catorce número veinticinco ochenta y seis Caterin Zarate Carrera 25 número 18C 86 Karen Fornaris Carrera 18 número 2918 Mónica García Carrera 25 número 18C 30 apartamento de Puerta Negra Inocencia Mora Calle 17 número 2220 Mateus Marcos');
assert.equal(rows.length,7,'El texto original en una sola línea debe conservar los siete pedidos');
assert.deepEqual(rows.map(x=>x.name),['Silva Cleotilde','Galán Estefany','Caterin Zarate','Karen Fornaris','Mónica García','Inocencia Mora','Mateus Marcos']);
assert.equal(rows.filter(x=>x.needsAddressReview).length,3,'Las placas compactas ambiguas requieren confirmación');
rows=parse('Calle 17 #2220 Mateus Marcos');
assert.equal(rows.length,1);
assert.equal(rows[0].needsAddressReview,true);
assert.equal(importer.validateAddress('Carrera 25 #18C-86').ok,true);
assert.equal(importer.validateAddress('Carrera 26 #1871').ok,false);
const orders=[{id:'old',number:79,status:'entregado'},{id:'b',number:301,status:'pendiente'},{id:'a',number:8,status:'en_ruta'}];
assert.equal(importer.deliveryNumber(orders[1],orders),1);
assert.equal(importer.deliveryNumber(orders[2],orders),2);
assert.equal(importer.deliveryNumber(orders[0],orders),null);
console.log('V5.4.2: direcciones, clientes, referencias, placas ambiguas y secuencia: OK');
