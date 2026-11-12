import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
root=str(Path(__file__).resolve().parents[1])
js='''
(()=>{
class Stub {
  constructor(){this._events={};this._latlng={lat:11,lng:-74.2};}
  setView(){return this} addTo(){return this} bindPopup(){return this} setLatLng(){return this} flyTo(){return this} removeLayer(){return this} hasLayer(){return true} openPopup(){return this}
  on(e,f){this._events[e]=f;return this} once(e,f){this._events[e]=f;return this} off(){return this} getLatLng(){return this._latlng} setIcon(){return this} setStyle(){return this} getBounds(){return [[11,-74],[11.1,-74.2]]}
  fitBounds(){return this} invalidateSize(){return this} setZoom(){return this} getZoom(){return 14} remove(){return this} addLayer(){return this}
}
window.L={map:()=>new Stub(),tileLayer:()=>new Stub(),marker:()=>new Stub(),divIcon:()=>new Stub(),icon:()=>new Stub(),circleMarker:()=>new Stub(),geoJSON:()=>new Stub(),latLngBounds:()=>new Stub(),polyline:()=>new Stub(),layerGroup:()=>new Stub(),control:{zoom:()=>new Stub()},DomEvent:{disableClickPropagation(){}}};
window.confirm=()=>true;window.prompt=()=> 'Cliente ausente';
})();'''
async def main():
  async with async_playwright() as pl:
    browser=await pl.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=await browser.new_context(viewport={'width':390,'height':844},permissions=[],service_workers='block')
    await context.add_init_script(script=js)
    async def bypass(route):
      if 'unpkg.com' in route.request.url or 'cdn.jsdelivr.net' in route.request.url:await route.fulfill(status=200,content_type='application/javascript',body='')
      elif route.request.url.startswith('https://domicilio.test/'):
        url=route.request.url.replace('https://domicilio.test/','').split('?')[0]
        target=Path(root)/('frontend/index.html' if not url else url.replace('static/','frontend/'))
        if target.is_file():
          typ='text/javascript' if target.suffix=='.js' else 'text/css' if target.suffix=='.css' else 'text/html'
          await route.fulfill(status=200,content_type=typ,body=target.read_bytes())
        else: await route.fulfill(status=404,body='missing')
      else:await route.continue_()
    await context.route('**/*',bypass)
    page=await context.new_page(); errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    import re
    html=(Path(root)/'frontend/index.html').read_text()
    html=re.sub(r'<script[^>]*>.*?</script>','',html,flags=re.S|re.I)
    html=re.sub(r'<link[^>]*rel="stylesheet"[^>]*>','',html,flags=re.I)
    await page.set_content(html,wait_until='load')
    await page.evaluate("""()=>{const mem=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)}})}""")
    for name in ['route-optimizer','app','v3','navigation','bulk','location-lookup','v5','v53','rules-manager','monitor-v533']:
      await page.add_script_tag(content=(Path(root)/'frontend'/f'{name}.js').read_text())
    await page.wait_for_timeout(250)
    print('START errors',errors[:10]);print('V53',await page.evaluate('!!window.domicilioV53'))
    assert await page.evaluate('!!window.domicilioMonitor'), 'El monitor no cargó'
    assert await page.locator('#monitor-v533-enabled').is_checked(), 'El monitor debe iniciar activo'
    assert 'Monitor:' in await page.locator('#monitor-v533-home-alert').inner_text()
    print('MONITOR_UI',await page.locator('#monitor-v533-status').inner_text())
    await page.locator('[data-nav="orders"]').last.click()
    await page.locator('#open-new-order-btn').click()
    await page.fill('#pedido-name','Cliente Demo');await page.fill('#pedido-address','Calle 14 #25-86')
    await page.locator('#pedido-form button[type="submit"]').click();await page.wait_for_timeout(100)
    print('ORDER',await page.evaluate('pedidos.map(p=>({name:p.name,lat:p.lat,status:p.status}))'))
    await page.locator('.pedido-card-main').first.click()
    await page.get_by_role('button',name='Editar').first.click();await page.fill('#pedido-name','Cliente Editado');await page.locator('#pedido-form button[type="submit"]').click()
    print('EDIT',await page.evaluate('pedidos[0].name'))
    assert 'sin coordenadas' in (await page.locator('#monitor-v533-home-alert').inner_text()).lower(), 'Debe avisar que el pedido no tiene GPS' 
    await page.locator('.pedido-card-main').first.click()
    await page.get_by_role('button',name='Fallido').first.click()
    print('FAILED',await page.evaluate('pedidos[0].status'))
    await page.locator('#menu-end-shift').evaluate('(el)=>el.click()')
    await page.wait_for_timeout(150)
    print('SHIFT',await page.evaluate('({remaining:pedidos.length,history:window.domicilioV53.readHistory().length})'))
    print('ERRORS',errors[:15]);print('BODY',await page.locator('#v53-history').inner_text())
    # Nuevo día: dos pedidos sin coordenadas; saltar al siguiente sin omitirlo.
    await page.locator('[data-nav="orders"]').last.click()
    for name,addr in [('Primera','Calle 10 #11-12'),('Segunda','Carrera 11 #8-23')]:
      await page.locator('#open-new-order-btn').click()
      await page.fill('#pedido-name',name);await page.fill('#pedido-address',addr)
      await page.locator('#pedido-form button[type="submit"]').click()
    await page.evaluate("window.domicilioNav.start(pedidos[0])")
    print('UNKNOWN_NAV',await page.locator('#nav-v4-instruction').inner_text())
    await page.locator('#nav-v4-arrived').click()
    print('AUTO_NEXT',await page.evaluate('({left:getRoutePedidos().length,navId:window.domicilioNav.currentTargetId()})'))
    print('NEXT_INFO',await page.locator('#nav-v4-instruction').inner_text())
    print('CAPTURE_VISIBLE',await page.locator('#nav-v53-capture').is_visible())
    # Consultar mapa no debe crear pedidos.
    await page.evaluate("mapInstance._events.click({latlng:{lat:11.1,lng:-74.24}})")
    print('MAP_NONINTERACTIVE',await page.evaluate('pedidos.length'))
    await page.locator('#menu-goto-settings').evaluate('(el)=>el.click()')
    await page.fill('#v53-question','¿Cómo optimizo la ruta?')
    await page.locator('#v53-ask').click()
    print('ASSISTANT',await page.locator('#v53-answer').inner_text())
    print('FINAL_ERRORS',errors[:15]);assert not errors, errors
    await browser.close()
if __name__ == "__main__":
  asyncio.run(main())
