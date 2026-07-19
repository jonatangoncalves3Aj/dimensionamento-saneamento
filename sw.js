// Service Worker — Dimensionamento de Saneamento
const CACHE = 'saneamento-v9';
const ASSETS = [
  './levantamento/',
  './levantamento/index.html',
  './levantamento/css/levantamento.css',
  './levantamento/js/app.js',
  './levantamento/js/store.js',
  './levantamento/js/calc.js',
  './levantamento/js/viewer.js',
  './levantamento/js/deteccao.js',
  './levantamento/js/tabela.js',
  './levantamento/js/orcamento.js',
  './levantamento/js/avanco.js',
  './levantamento/vendor/pdf.min.mjs',
  './levantamento/vendor/pdf.worker.min.mjs',
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/projeto.js',
  './js/tabelas.js',
  './js/calculos-agua.js',
  './js/calculos-aguaquente.js',
  './js/calculos-incendio.js',
  './js/calculos-esgoto.js',
  './js/calculos-drenagem.js',
  './js/calculos-fossa.js',
  './js/calculos-predial.js',
  './js/memorial.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
