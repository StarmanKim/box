/* 오프라인 지원: 인터넷이 되면 항상 최신 파일을 받고(네트워크 우선), 끊기면 저장해 둔 파일을 씁니다. */
const CACHE = 'sf-app-v3';
const FILES = [
  './', 'index.html', 'pc.html', 'mobile.html', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png',
  'css/base.css', 'css/pc.css', 'css/mobile.css',
  'js/figures.js', 'js/data-u7.js', 'js/data-u8.js', 'js/bank-topics.js', 'js/bank-u7.js', 'js/bank-u8.js', 'js/core.js', 'js/app.js', 'js/qr.js',
  // 추가 문제 그림(수업 중 인터넷이 끊겨도 보이도록 미리 저장)
  'img/u7/r1-g11-1.webp', 'img/u7/r1-g23-1.webp', 'img/u7/r1-g23-2.webp', 'img/u7/r1-q01-1.webp', 'img/u7/r1-q02-1.webp', 'img/u7/r1-q03-1.webp',
  'img/u7/r1-q06-1.webp', 'img/u7/r1-q22-1.webp', 'img/u7/r2-q02-1.webp', 'img/u7/r2-q02-2.webp', 'img/u7/r2-q03-1.webp', 'img/u7/r2-q04-1.webp',
  'img/u7/r2-q04-2.webp', 'img/u7/r2-q05-1.webp', 'img/u7/r2-q05-2.webp', 'img/u7/r2-q06-1.webp', 'img/u7/r2-q08-1.webp', 'img/u7/r2-q09-1.webp',
  'img/u7/r2-q10-1.webp', 'img/u7/r2-q11-1.webp', 'img/u7/r2-q11-2.webp', 'img/u7/r2-q11-3.webp', 'img/u7/r2-q12-1.webp', 'img/u7/r2-q13-1.webp',
  'img/u7/r2-q14-1.webp', 'img/u7/r2-q15-1.webp', 'img/u7/r2-q16-1.webp', 'img/u7/r2-q18-1.webp', 'img/u7/r2-q20-1.webp', 'img/u7/r2-q21-1.webp',
  'img/u7/r2-q22-1.webp', 'img/u7/r2-q22-2.webp', 'img/u7/r2-q23-1.webp', 'img/u7/r2-q23-2.webp', 'img/u7/r2-q23-3.webp', 'img/u7/r2-q24-1.webp',
  'img/u7/r2-q25-1.webp', 'img/u7/r2-q25-2.webp', 'img/u7/r3-g20-1.webp', 'img/u7/r3-g22-1.webp', 'img/u7/r3-q02-1.webp', 'img/u7/r3-q02-2.webp',
  'img/u7/r3-q03-1.webp', 'img/u7/r3-q04-1.webp', 'img/u7/r3-q19-1.webp', 'img/u7/r3-q24-1.webp', 'img/u7/r4-g18-1.webp', 'img/u7/r4-q05-1.webp',
  'img/u7/r4-q06-1.webp', 'img/u7/r4-q07-1.webp', 'img/u7/r4-q08-o1.webp', 'img/u7/r4-q08-o2.webp', 'img/u7/r4-q08-o3.webp', 'img/u7/r4-q08-o4.webp',
  'img/u7/r4-q08-o5.webp', 'img/u7/r4-q09-1.webp', 'img/u7/r4-q10-1.webp', 'img/u7/r4-q11-1.webp', 'img/u7/r4-q12-1.webp', 'img/u7/r4-q15-1.webp',
  'img/u7/r4-q16-1.webp', 'img/u7/r4-q17-1.webp', 'img/u7/r4-q20-1.webp', 'img/u7/r4-q21-1.webp', 'img/u7/r4-q24-1.webp', 'img/u7/r4-q24-2.webp',
  'img/u7/r5-q02-1.webp', 'img/u7/r5-q06-1.webp', 'img/u7/r5-q08-1.webp', 'img/u7/r5-q09-1.webp', 'img/u7/r5-q10-1.webp', 'img/u7/r5-q12-1.webp',
  'img/u7/r5-q16-1.webp', 'img/u7/r5-q21-1.webp', 'img/u7/r5-q23-1.webp', 'img/u7/r5-q24-1.webp', 'img/u7/r5-q25-1.webp', 'img/u8/r1-q02-1.webp',
  'img/u8/r1-q12-1.webp', 'img/u8/r1-q12-2.webp', 'img/u8/r1-q16-1.webp', 'img/u8/r1-q21-1.webp', 'img/u8/r2-g03-1.webp', 'img/u8/r2-g19-1.webp',
  'img/u8/r2-g19-2.webp', 'img/u8/r2-g19-3.webp', 'img/u8/r2-q01-1.webp', 'img/u8/r2-q05-1.webp', 'img/u8/r2-q07-1.webp', 'img/u8/r2-q16-1.webp',
  'img/u8/r2-q18-1.webp', 'img/u8/r2-q21-1.webp', 'img/u8/r2-q21-2.webp', 'img/u8/r2-q22-1.webp', 'img/u8/r2-q23-1.webp', 'img/u8/r3-q11-1.webp',
  'img/u8/r3-q13-1.webp', 'img/u8/r3-q21-1.webp', 'img/u8/r3-q23-1.webp', 'img/u8/r3-q23-2.webp', 'img/u8/r4-q01-1.webp', 'img/u8/r4-q17-o1.webp',
  'img/u8/r4-q17-o2.webp', 'img/u8/r4-q17-o3.webp', 'img/u8/r4-q17-o4.webp', 'img/u8/r4-q17-o5.webp', 'img/u8/r4-q19-1.webp', 'img/u8/r4-q19-2.webp',
  'img/u8/r5-q09-1.webp', 'img/u8/r5-q11-1.webp', 'img/u8/r5-q16-1.webp', 'img/u8/r5-q17-1.webp', 'img/u8/r5-q17-2.webp'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && /^(sf-app-|science-final-)/.test(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim())
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
