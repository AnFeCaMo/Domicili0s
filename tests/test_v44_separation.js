const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const txt=fs.readFileSync('frontend/app.js','utf8');
const pick=(start,end)=>txt.slice(txt.indexOf(start),txt.indexOf(end));
const normal=pick('function normalizeAddress(raw) {','window.domicilioNormalizeAddress=normalizeAddress;');
const split=pick('function separatePedidoFields(name, address, reference=','window.domicilioSeparatePedidoFields=separatePedidoFields;');
const parse=pick('function parseAddressList(text) {','window.v3ParseAddressList = parseAddressList;');
const env={window:{}};
vm.runInNewContext(normal+'\n'+split+'\n'+parse+'\nthis.split=separatePedidoFields;this.parse=parseAddressList;',env);
const cases=[
 [['número 23 02 esquina Ana López','Calle 8 #23-02',''],['Ana López','Calle 8 #23-02','esquina']],
 [['instituto María Montessori','Calle 8 número 11a-39',''],['instituto María Montessori','Calle 8 #11a-39','']],
 [['número linda Oliveros','Calle 7#18-28',''],['linda Oliveros','Calle 7 #18-28','']],
 [['11 37 María Gutiérrez','Calle 7 #11-37',''],['María Gutiérrez','Calle 7 #11-37','']],
 [['número 1939 yuranis parejo','Calle 7 #19-39',''],['yuranis parejo','Calle 7 #19-39','']],
 [['Katerin Castro','Calle 1B #21-07',''],['Katerin Castro','Calle 1B #21-07','']],
 [['Ana López','Calle 8 #23-02','esquina frente a tienda'],['Ana López','Calle 8 #23-02','esquina frente a tienda']],
 [['29 30 Juan','Calle 8 #23-02',''],['29 30 Juan','Calle 8 #23-02','']],
 [['número 21 07 Katerin Castro','Calle 1B',''],['Katerin Castro','Calle 1B #21-07','']],
];
for(const [input,expected] of cases){const obj=env.split(...input);assert.deepEqual([obj.name,obj.address,obj.reference],expected,JSON.stringify(input));}
const result=env.parse('Calle 8 número 23 02 esquina Ana López\nCalle 7 número 19 39 Yuranis Parejo');
assert.equal(result[0].name,'Ana López');assert.equal(result[0].reference,'esquina');assert.equal(result[1].name,'Yuranis Parejo');
console.log('V4.4: nombres, numeraciones duplicadas, referencias y direcciones existentes: OK');
