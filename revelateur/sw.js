/* Révélateur service worker: network first for the app, cache as a fallback so it opens without signal.
   The on-device models (MediaPipe from jsDelivr, model files from Google's storage) are versioned in their URLs,
   so they are served from the cache once downloaded. Photos are never fetched over the network. */
const V = 'revelateur-2026.11.16b';
const MODELS = 'revelateur-models-1';
const CORE = ['./', 'index.html', 'app.css', 'js/main.js', 'js/ui.js', 'js/engine.js', 'js/geo.js', 'js/scenes.js', 'js/gl.js', 'js/jpeg.js', 'js/photo.js', 'js/vision.js', 'js/library.js', 'js/store.js', 'manifest.webmanifest', 'icon-192.png', '../cloud.js'];
const isModel = u => (u.hostname === 'cdn.jsdelivr.net' && u.pathname.startsWith('/npm/@mediapipe/tasks-vision@')) || (u.hostname === 'storage.googleapis.com' && u.pathname.startsWith('/mediapipe-models/'));
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('revelateur-') && k !== V && k !== MODELS).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (isModel(u)) {
    e.respondWith(caches.open(MODELS).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }))));
    return;
  }
  if (u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
