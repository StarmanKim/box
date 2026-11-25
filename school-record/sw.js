/* 오프라인 사용을 위한 앱 파일 캐시 (학생 자료는 캐시하지 않음: localStorage에만 저장) */
const CACHE = "srm2026-v2";
const STD = ["kor", "soc", "his", "mor", "mat", "sci", "eng", "pe", "mus", "art"].map((k) => `std/2022-${k}.js`);
const FILES = ["./", "index.html", "app.css", "app.js", "rules.js", "korean.js", "compose.js", "standards.js", "standards-data.js", "xlsx-lite.js", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", ...STD];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// 네트워크 우선, 실패 시 캐시 (업데이트가 바로 반영되도록)
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});
