/* Ivory Reader service worker.
   Static assets are cache-first; the page itself is network-first so a new
   version arrives as soon as the tablet is online, with the cache as fallback. */
const VERSION = 'v5';
const CACHE = 'ivory-reader-' + VERSION;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './fonts/fonts.css',
  './fonts/fraunces-500-latin.woff2',
  './fonts/source-sans-3-400-latin.woff2',
  './fonts/noto-music-400-music.woff2',
  './audio/A1.mp3',
  './audio/A2.mp3',
  './audio/A3.mp3',
  './audio/A4.mp3',
  './audio/A5.mp3',
  './audio/A6.mp3',
  './audio/C2.mp3',
  './audio/C3.mp3',
  './audio/C4.mp3',
  './audio/C5.mp3',
  './audio/C6.mp3',
  './audio/C7.mp3',
  './audio/Ds2.mp3',
  './audio/Ds3.mp3',
  './audio/Ds4.mp3',
  './audio/Ds5.mp3',
  './audio/Ds6.mp3',
  './audio/Fs2.mp3',
  './audio/Fs3.mp3',
  './audio/Fs4.mp3',
  './audio/Fs5.mp3',
  './audio/Fs6.mp3'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
