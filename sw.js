/* Offline gyorsítótár. A VERSION növelésével a régi gyorsítótár törlődik. */
const VERSION = 'szk-0.2.2';
const FILES = [
  './', './index.html', './manifest.webmanifest',
  './css/style.css',
  './js/config.js', './js/engine.js', './js/unzip.js', './js/importers.js', './js/spell.js', './js/speech.js',
  './js/i18n.js', './js/store.js', './js/app.js',
  './fonts/poppins-regular.woff', './fonts/poppins-medium.woff', './fonts/poppins-bold.woff',
  './dict/en.txt',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        if (res && res.ok && new URL(e.request.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () {
        if (e.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});
