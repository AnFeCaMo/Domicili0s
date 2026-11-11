const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('frontend/app.js','utf8');
const first=code.indexOf('function normalizeAddress(raw) {');
const last=code.indexOf('window.domicilioNormalizeAddress=normalizeAddress;',first);
const ctx={};vm.runInNewContext(code.slice(first,last)+'this.norm=normalizeAddress;',ctx);
const cases={
  'calle 24 número 11 16':'calle 24 #11-16',
  'calle 24 carrera 11 16':'calle 24 #11-16',
  'calle 24 #11-16':'calle 24 #11-16',
  'carrera 11 calle 24 16':'carrera 11 #24-16',
  'carrera 11 numeral 24 16':'carrera 11 #24-16',
  'calle veinticuatro numero once dieciseis':'calle 24 #11-16',
  'calle treinta y dos número once guion dieciséis':'calle 32 #11-16',
  'calle 10 con carrera 15':'calle 10 con carrera 15',
  'calle 8 número 23 02 esquina':'calle 8 #23-02 esquina',
};
for(const [input,expected] of Object.entries(cases))assert.equal(ctx.norm(input),expected,input);
const opt=require('../frontend/route-optimizer.js');
// Orden óptimo global no equivale siempre a elegir el siguiente tramo más corto.
const m=[[0,1,3,5],[10,0,9,1],[1,2,0,3],[10,1,1,0]];
const indices=[1,2,3],order=opt.solve(indices,m);const permutations=[];
function visit(xs,used=[]){if(!xs.length){permutations.push(used);return;}xs.forEach((n,i)=>visit(xs.filter((_,j)=>j!==i),[...used,n]));}
visit(indices);
const min=Math.min(...permutations.map(p=>opt.cost(p,m)));
assert.equal(opt.cost(order,m),min);
const withBase=opt.solve(indices,m,0);
assert.equal(opt.cost(withBase,m,0),Math.min(...permutations.map(p=>opt.cost(p,m,0))));
console.log(`${Object.keys(cases).length} direcciones y optimización exacta: OK`);
