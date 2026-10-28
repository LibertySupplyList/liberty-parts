/* Liberty Parts offline cache. VERSION is stamped on every deploy. */
const VERSION = 'wl-1793197570';
const SHELL = ['./', 'index.html', 'config.js', 'firebase-app-compat.js', 'firebase-firestore-compat.js',
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', (e) => {
  // cache: 'reload' skips the browser's HTTP cache so a new version never stores old files
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(SHELL.map((u) => fetch(new Request(u, { cache: 'reload' })).then((r) => { if (r.ok) return c.put(u === './' ? 'index.html' : u, r); }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k !== 'wl-fonts').map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
function fromNetwork(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    // 'no-cache' asks the server every time, so a new version shows up on the next open
    fetch(url, { cache: 'no-cache', credentials: 'same-origin' }).then((r) => { clearTimeout(t); resolve(r); }, (err) => { clearTimeout(t); reject(err); });
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
  const nav = req.mode === 'navigate';
  const fresh = nav || /\/(index\.html|config\.js)?$/.test(url.pathname);
  if (fresh) {
    const key = nav || /\/(index\.html)?$/.test(url.pathname) ? 'index.html' : 'config.js';
    const target = nav ? new URL('index.html', self.registration.scope).href : url.href;
    e.respondWith(fromNetwork(target, 4000).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(key, copy)); }
      return r;
    }).catch(() => caches.match(key)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
