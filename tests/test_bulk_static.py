from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def test_bulk_integration():
    html = (ROOT / 'frontend/index.html').read_text()
    js = (ROOT / 'frontend/bulk.js').read_text()
    app = (ROOT / 'frontend/app.js').read_text()
    assert 'id="bulk-input"' in html
    assert 'id="bulk-file"' in html
    assert 'id="bulk-proposal"' in html
    assert '/static/bulk.js' in html
    assert 'type: \'route_list\'' in app
    assert 'Preparar ruta de ${data.count} paradas' in app
    assert 'window.v3ParseAddressList = parseAddressList' in app
    assert '[...text.matchAll(addressPattern)]' in app
    assert 'window.v3ParseAddressList?.(text)' in js
    assert 'name:nextLine, address:parts[0]' in js
    assert 'Aprobar, importar y aplicar ruta' in js
    assert 'window.v3Audit' in js
    assert 'getRoutePedidos()' in js
    assert 'routeCost' in js
    assert 'confirm(' in js
