/* 이 주소는 더 이상 사용하지 않습니다.
 * 예전에 학생 기기에 저장된 오프라인 사본(이 주소의 캐시)을 지우고 스스로 해제합니다. 새 주소를 알려 주는 내용은 없습니다. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('science-final-')).map((k) => caches.delete(k)));
      await self.registration.unregister();
      const wins = await self.clients.matchAll({ type: 'window' });
      wins.forEach((w) => w.navigate(w.url).catch(() => {}));
    })()
  );
});
