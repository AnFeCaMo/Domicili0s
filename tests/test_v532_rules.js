const assert=require('assert'),fs=require('fs'),vm=require('vm');
const app=fs.readFileSync(__dirname+'/../frontend/app.js','utf8');
const v3=fs.readFileSync(__dirname+'/../frontend/v3.js','utf8');
const index=fs.readFileSync(__dirname+'/../frontend/index.html','utf8');
const manager=fs.readFileSync(__dirname+'/../frontend/rules-manager.js','utf8');
assert(!/\binstallV4Rules\(\);/.test(app),'El arranque no debe reinstalar las reglas eliminadas');
assert(!v3.includes("delBtn.textContent = 'Eliminar'"),'No debe quedar un botón de eliminar por cada regla');
for(const id of ['v532-rule-search','v532-select-all','v532-select-duplicates','v532-clear-selection','v532-delete-selected','v532-rule-text','settings-add-rule-btn','v532-cancel-edit'])assert(index.includes(`id="${id}"`),`Falta el control ${id}`);
assert(index.includes('/static/rules-manager.js?v=56000'));
assert(manager.includes('learnedRules.splice('));
assert(manager.includes('saveState()'));
assert(manager.includes('r.text=value'));
const normalized=app.slice(app.indexOf('function normalizeAddress(raw) {'),app.indexOf('window.domicilioNormalizeAddress=normalizeAddress;'));
const ctx={};vm.createContext(ctx);vm.runInContext(normalized+';this.normalizeAddress=normalizeAddress;',ctx);
for(const [input,expected] of [
 ['Calle 14 número 11 12','Calle 14 #11-12'],
 ['Calle 14 numeral 11 12','Calle 14 #11-12'],
 ['Calle 14 carrera 11 12','Calle 14 #11-12'],
 ['Carrera 25 número 18C 86','Carrera 25 #18C-86'],
 ['Carrera 34A número 19 18','Carrera 34A #19-18']
])assert.strictEqual(ctx.normalizeAddress(input),expected);
console.log('V5.3.2: reglas seleccionables/editables, no reinstalacion y direcciones Calle/Carrera: OK');
