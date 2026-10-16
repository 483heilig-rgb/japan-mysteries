/* Offline-first service worker: every scene, clue and recording is bundled. */
const CACHE_NAME = 'moonbell-offline-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './data.js',
  './app.js',
  './favicon.svg',
  './offline.css',
  './offline.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './assets/art-00.jpg',
  './assets/art-01.jpg',
  './assets/art-02.jpg',
  './assets/art-03.jpg',
  './assets/art-04.jpg',
  './assets/art-05.jpg',
  './assets/art-06.jpg',
  './assets/art-07.jpg',
  './assets/art-08.jpg',
  './assets/art-09.jpg',
  './assets/art-10.jpg',
  './assets/art-11.jpg',
  './assets/art-12.jpg',
  './assets/art-13.jpg',
  './assets/audio/rain.mp3',
  './assets/audio/bell.mp3',
  './assets/audio/prologue.mp3',
  './assets/audio/clue-sandal.mp3',
  './assets/audio/clue-bell.mp3',
  './assets/audio/clue-boat.mp3',
  './assets/audio/clue-ash.mp3',
  './assets/audio/clue-tea.mp3',
  './assets/audio/clue-beam.mp3',
  './assets/audio/clue-cord.mp3',
  './assets/audio/clue-fox.mp3',
  './assets/audio/ending-perfect.mp3',
  './assets/audio/ending-solved.mp3',
  './assets/audio/ending-wrong.mp3',
  './assets/audio/witness-0-0.mp3',
  './assets/audio/witness-0-1.mp3',
  './assets/audio/witness-1-0.mp3',
  './assets/audio/witness-1-1.mp3',
  './assets/audio/witness-2-0.mp3',
  './assets/audio/witness-2-1.mp3',
  './assets/audio/witness-3-0.mp3',
  './assets/audio/witness-3-1.mp3'
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
      names.filter(name => name.startsWith('moonbell-offline-') && name !== CACHE_NAME)
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
