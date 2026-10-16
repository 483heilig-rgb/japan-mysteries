/* Offline-first service worker: art, voice recordings and the quiz are all local. */
const CACHE_NAME = 'night-atlas-offline-v1';
const ASSETS = [
  './',
  './index.html',
  './atlas.css',
  './offline.css',
  './offline.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './assets/hero.jpg',
  './assets/yokai-01.jpg',
  './assets/yokai-02.jpg',
  './assets/yokai-03.jpg',
  './assets/yokai-04.jpg',
  './assets/yokai-05.jpg',
  './assets/yokai-06.jpg',
  './assets/yokai-07.jpg',
  './assets/yokai-08.jpg',
  './assets/yokai-09.jpg',
  './assets/yokai-10.jpg',
  './assets/yokai-11.jpg',
  './assets/yokai-12.jpg',
  './assets/audio/kappa.mp3',
  './assets/audio/kitsune.mp3',
  './assets/audio/tengu.mp3',
  './assets/audio/yuki-onna.mp3',
  './assets/audio/karakasa.mp3',
  './assets/audio/tanuki.mp3',
  './assets/audio/oni.mp3',
  './assets/audio/nekomata.mp3',
  './assets/audio/rokurokubi.mp3',
  './assets/audio/noppera.mp3',
  './assets/audio/zashiki.mp3',
  './assets/audio/jorogumo.mp3',
  './assets/audio/rain-window.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.filter(name => name.startsWith('night-atlas-offline-') && name !== CACHE_NAME)
        .map(name => caches.delete(name))
    )).then(() => self.clients.claim())
  );
});

async function partialAudio(response, rangeHeader) {
  const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
  if (!match) return response;
  const bytes = await response.arrayBuffer();
  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), bytes.byteLength - 1) : bytes.byteLength - 1;
  if (start >= bytes.byteLength || end < start) {
    return new Response(null, {status: 416, headers: {'Content-Range': `bytes */${bytes.byteLength}`}});
  }
  return new Response(bytes.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${bytes.byteLength}`,
      'Accept-Ranges': 'bytes'
    }
  });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cached = await caches.match(request, {ignoreSearch: true});
    if (cached) {
      const range = request.headers.get('range');
      return range ? partialAudio(cached, range) : cached;
    }
    try {
      const live = await fetch(request);
      if (live.ok && live.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, live.clone());
      }
      return live;
    } catch (error) {
      if (request.mode === 'navigate') {
        const home = await caches.match('./index.html');
        if (home) return home;
      }
      throw error;
    }
  })());
});
