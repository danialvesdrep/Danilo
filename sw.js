// sw.js — Service worker para o Boletim Danilo Campetti.
// Estratégia:
//   - precache do app shell;
//   - stale-while-revalidate para briefings/index.json;
//   - network-first com fallback de cache para briefings/<date>.json;
//   - cache-first para assets estáticos;
//   - tudo o resto: passthrough.
const VERSION = 'boletim-v1';
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;

const SHELL_FILES = [
  './',
  './index.html',
  './admin.html',
  './manifest.webmanifest',
  './assets/styles.css',
  './assets/icons/icon.svg',
  './js/app.js',
  './js/store.js',
  './js/post-generator.js',
  './js/render/briefing.js',
  './js/render/archive.js',
  './js/render/share.js',
  './js/render/tts.js',
  './js/admin/auth.js',
  './js/admin/editor.js',
  './js/admin/publish.js',
  './config/cidades-noroeste.json',
  './config/fontes.json',
  './config/posicionamento.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL).then(cache => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

function isBriefingFile(url) {
  return /\/briefings\/\d{4}-\d{2}-\d{2}\.json/.test(url.pathname);
}
function isBriefingIndex(url) {
  return /\/briefings\/index\.json/.test(url.pathname);
}
function isStaticAsset(url) {
  return /\.(css|svg|png|webp|woff2?|ttf)$/.test(url.pathname);
}
function isHTML(req) {
  return req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Cross-origin (fonts, GitHub API): passthrough.
  if (url.origin !== self.location.origin) return;

  // Briefing do dia: network-first com fallback cache.
  if (isBriefingFile(url)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Index dos boletins: stale-while-revalidate.
  if (isBriefingIndex(url)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Static assets: cache-first.
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // HTML / shell: cache-first com fallback network.
  if (isHTML(req)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Default: try cache, fallback network.
  event.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(SHELL);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
    return fresh;
  } catch (e) {
    return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function networkFirst(req) {
  const cache = await caches.open(RUNTIME);
  try {
    const fresh = await fetch(req, { cache: 'no-cache' });
    if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw e;
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then(fresh => {
    if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
    return fresh;
  }).catch(() => cached);
  return cached || fetchPromise;
}
