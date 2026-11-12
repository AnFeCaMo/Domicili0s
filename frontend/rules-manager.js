/* DOMICILIO V5.3.2: administrar reglas personales sin reinstalar reglas antiguas. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const selected = new Set();
  let editingId = null;
  const fingerprint = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[•.,;:]+/g,' ').replace(/\s+/g,' ').trim();
  const findRule=id=>learnedRules.find(r=>r.id===id);
  const show=text=>showToast(text,'info');
  const normalizeIds=()=>{
    const ids=new Set();
    for(const rule of learnedRules){
      if(!rule.id || ids.has(rule.id))rule.id=generatePedidoId();
      ids.add(rule.id);
    }
  };
  function visibleRules(){
    const query=fingerprint($('v532-rule-search')?.value);
    return learnedRules.filter(r=>!query || fingerprint(r.text).includes(query));
  }
  function render(){
    const list=$('settings-rules');if(!list)return;
    normalizeIds();
    const allIds=new Set(learnedRules.map(r=>r.id));
    for(const id of selected)if(!allIds.has(id))selected.delete(id);
    list.replaceChildren();
    for(const rule of visibleRules()){
      const row=document.createElement('div');row.className='rules-v532-row';
      const cb=document.createElement('input');cb.type='checkbox';cb.checked=selected.has(rule.id);cb.setAttribute('aria-label','Seleccionar regla');
      cb.addEventListener('change',()=>{cb.checked?selected.add(rule.id):selected.delete(rule.id);updateCount();});
      const content=document.createElement('span');content.className='rules-v532-rule-text';content.textContent=rule.text;
      const edit=document.createElement('button');edit.type='button';edit.className='btn btn-outline btn-sm';edit.textContent='Editar';
      edit.addEventListener('click',()=>{editingId=rule.id;$('v532-rule-text').value=rule.text;$('v532-editor-label').textContent='Editar regla seleccionada';$('settings-add-rule-btn').textContent='Guardar cambios';$('v532-cancel-edit').hidden=false;$('v532-rule-text').focus();});
      row.append(cb,content,edit);list.append(row);
    }
    if(!list.children.length){const e=document.createElement('p');e.className='small text-secondary';e.textContent=learnedRules.length?'Ninguna regla coincide con tu búsqueda.':'No hay reglas guardadas. Puedes agregar una nueva.';list.append(e);}
    updateCount();
  }
  function updateCount(){
    const count=$('v532-rule-count'),del=$('v532-delete-selected');
    if(count)count.textContent=`${visibleRules().length} visibles · ${learnedRules.length} guardadas · ${selected.size} seleccionadas`;
    if(del){del.disabled=selected.size===0;del.textContent=`Eliminar seleccionadas (${selected.size})`;}
  }
  function clearEdit(){editingId=null;$('v532-rule-text').value='';$('v532-editor-label').textContent='Agregar una regla';$('settings-add-rule-btn').textContent='Guardar regla';$('v532-cancel-edit').hidden=true;}
  function addOrEdit(){
    const value=$('v532-rule-text').value.trim();
    if(!value){show('Escribe una regla antes de guardar.');return;}
    if(value.length>1500){show('La regla supera el máximo de 1500 caracteres.');return;}
    if(editingId){const r=findRule(editingId);if(!r){show('La regla ya no existe.');clearEdit();return;}r.text=value;r.editedAt=new Date().toISOString();}
    else {
      if(learnedRules.length>=200){show('Límite de 200 reglas. Elimina o combina algunas antes de agregar.');return;}
      if(learnedRules.some(r=>fingerprint(r.text)===fingerprint(value))){show('Ya existe una regla igual. Puedes editarla.');return;}
      learnedRules.push({id:generatePedidoId(),text:value,createdAt:new Date().toISOString(),source:'manual'});
    }
    saveState();clearEdit();render();show('Reglas guardadas correctamente.');
  }
  function removeSelected(){
    const count=selected.size;if(!count)return;
    if(!confirm(`¿Eliminar ${count} regla(s) seleccionada(s)? No se borrarán pedidos, GPS ni historial. Puedes exportar un respaldo antes.`))return;
    for(let i=learnedRules.length-1;i>=0;i--)if(selected.has(learnedRules[i].id))learnedRules.splice(i,1);
    selected.clear();if(editingId&&!findRule(editingId))clearEdit();saveState();render();show(`${count} regla(s) eliminada(s).`);
  }
  $('v532-rule-search')?.addEventListener('input',render);
  $('v532-select-all')?.addEventListener('click',()=>{for(const r of visibleRules())selected.add(r.id);render();});
  $('v532-clear-selection')?.addEventListener('click',()=>{selected.clear();render();});
  $('v532-select-duplicates')?.addEventListener('click',()=>{
    const seen=new Set();let found=0;
    for(const r of learnedRules){const k=fingerprint(r.text);if(k&&seen.has(k)){selected.add(r.id);found++;}else seen.add(k);}
    render();show(found?`${found} duplicada(s) seleccionadas para revisión.`:'No hay reglas idénticas.');
  });
  $('v532-delete-selected')?.addEventListener('click',removeSelected);
  $('settings-add-rule-btn')?.addEventListener('click',addOrEdit);
  $('v532-cancel-edit')?.addEventListener('click',clearEdit);
  window.domicilioRulesManager={render,selected,removeSelected,addOrEdit,fingerprint};
  render();
})();
