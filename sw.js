/* TriLog · Offline-Fähigkeit: App-Dateien zwischenspeichern, Trainingsdaten bleiben im Browser-Speicher */
const CACHE = 'trilog-v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'css/trilog.css', 'js/util.js', 'js/data.js', 'js/model.js', 'js/glossar.js', 'js/insights.js', 'js/charts.js', 'js/views.js', 'js/settings.js', 'js/app.js', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return; /* Wetter immer live */
  /* Netz zuerst, damit Updates sofort ankommen; offline aus dem Zwischenspeicher */
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
