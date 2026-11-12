const CACHE='domicilio-v533-monitor-20261112';
const SHELL=['/','/static/styles.css','/static/route-optimizer.js','/static/app.js','/static/v3.js','/static/bulk.js', '/static/location-lookup.js','/static/v5.js','/static/navigation.js','/static/v53.js','/static/rules-manager.js','/static/monitor-v533.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==location.origin)return;
  if(url.pathname.startsWith('/api/'))return;
  // Primero la red al conectarse: no dejar una pantalla antigua durante un despliegue nuevo.
  e.respondWith(fetch(e.request).then(resp=>{
    if(resp.ok&&SHELL.includes(url.pathname)){const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}
    return resp;
  }).catch(async()=>await caches.match(e.request) || await caches.match('/')));
});
