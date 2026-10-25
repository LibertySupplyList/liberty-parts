/* Liberty Parts offline cache. VERSION is stamped by the setup script on every deploy. */
const VERSION = 'wl-1792940911';
const SHELL = ['./', 'index.html', 'config.js', 'firebase-app-compat.js', 'firebase-firestore-compat.js',
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k !== 'wl-fonts').map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
function fromNetwork(req, timeoutMs) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    fetch(req).then((r) => { clearTimeout(t); resolve(r); }, (err) => { clearTimeout(t); reject(err); });
  });
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open('wl-fonts').then((c) => c.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }))));
    return;
  }
  if (url.origin !== self.location.origin) return;
  const fresh = req.mode === 'navigate' || /\/(index\.html|config\.js)?$/.test(url.pathname);
  if (fresh) {
    e.respondWith(fromNetwork(req, 4000).then((r) => {
      if (r.ok) caches.open(VERSION).then((c) => c.put(req.mode === 'navigate' ? 'index.html' : req, r.clone()));
      return r;
    }).catch(() => caches.match(req.mode === 'navigate' ? 'index.html' : req, { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
