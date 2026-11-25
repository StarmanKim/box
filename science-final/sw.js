/* 오프라인 지원: 인터넷이 되면 항상 최신 파일을 받고(네트워크 우선), 끊기면 저장해 둔 파일을 씁니다. */
const CACHE = 'science-final-v1';
const FILES = [
  './', 'index.html', 'pc.html', 'mobile.html', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png',
  'css/base.css', 'css/pc.css', 'css/mobile.css',
  'js/figures.js', 'js/data-u7.js', 'js/data-u8.js', 'js/core.js', 'js/app.js', 'js/qr.js'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('mobile.html')))
  );
});
