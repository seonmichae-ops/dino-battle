// 공룡 배틀 서비스 워커 — 오프라인 실행용
// 게임 파일을 고칠 때마다 VERSION을 올리면 새 파일로 교체됨
const VERSION = 'dino-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'css/style.css', 'js/lib/three.min.js', 'js/data.js', 'js/engine.js', 'js/models.js', 'js/game.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-64.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 글꼴(구글 폰트): 한 번 받아두면 저장본 사용
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.open(VERSION + '-font').then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      try { const res = await fetch(req); if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; } catch (_) { return Response.error(); }
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // three.js는 바뀌지 않으니 저장본 먼저, 나머지는 인터넷 먼저(새 버전 바로 반영) → 안 되면 저장본
  if (url.pathname.endsWith('/js/lib/three.min.js')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))));
});
