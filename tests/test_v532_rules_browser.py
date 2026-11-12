"""Prueba de UI real de selección/edición/alta/borrado en Chromium, sin red."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]

async def main():
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page=await browser.new_page(viewport={'width':390,'height':844})
        page.on('dialog',lambda d:asyncio.create_task(d.accept()))
        await page.set_content('''<div id="settings-rules"></div><input id="v532-rule-search">
          <button id="v532-select-all">Seleccionar visibles</button>
          <button id="v532-select-duplicates">Duplicadas</button>
          <button id="v532-clear-selection">Deseleccionar</button>
          <button id="v532-delete-selected" disabled>Eliminar seleccionadas</button>
          <div id="v532-rule-count"></div>
          <label id="v532-editor-label"></label><textarea id="v532-rule-text"></textarea>
          <button id="settings-add-rule-btn">Guardar regla</button>
          <button id="v532-cancel-edit" hidden>Cancelar</button>''')
        await page.evaluate("""()=>{
          window.learnedRules=[
            {id:'a',text:'Usar GPS para encontrar mi posición.'},
            {id:'b',text:'Usar GPS para encontrar mi posición.'},
            {id:'c',text:'No borrar pedidos al optimizar.'}
          ];
          window.generatePedidoId=()=>String(Math.random());
          window.saveState=()=>{window._saves=(window._saves||0)+1};
          window.showToast=()=>{};
          window.confirm=()=>true;
        }""")
        await page.add_script_tag(content=(ROOT/'frontend/rules-manager.js').read_text())
        assert await page.locator('.rules-v532-row').count()==3
        await page.locator('#v532-select-duplicates').click()
        assert await page.locator('input[type=checkbox]:checked').count()==1
        await page.locator('#v532-delete-selected').click()
        assert await page.evaluate('learnedRules.length')==2
        await page.locator('.rules-v532-row button').first.click()
        await page.locator('#v532-rule-text').fill('Regla corregida.')
        await page.locator('#settings-add-rule-btn').click()
        assert await page.evaluate('learnedRules[0].text')=='Regla corregida.'
        await page.locator('#v532-rule-text').fill('Nueva preferencia de entrega.')
        await page.locator('#settings-add-rule-btn').click()
        assert await page.evaluate('learnedRules.length')==3
        await page.locator('#v532-rule-search').fill('preferencia')
        assert await page.locator('.rules-v532-row').count()==1
        await page.locator('#v532-select-all').click()
        assert await page.locator('input[type=checkbox]:checked').count()==1
        await page.locator('#v532-clear-selection').click()
        assert await page.locator('input[type=checkbox]:checked').count()==0
        print('V5.3.2 Chromium: seleccionar, eliminar duplicadas, editar, agregar, buscar y deseleccionar: OK')
        await browser.close()

if __name__=='__main__':asyncio.run(main())
