/* sw.js — Service Worker for Beta1
 *
 * SHELL_CACHE versioning (Codex §4.1 fix): includes BUILD_ID and VARIANT
 *   to prevent cn/intl cross-pollution.
 * Tile fetch always carries referrerPolicy: 'no-referrer' (Codex critical).
 * postFreeze guard rejects mutations after BUILD_FREEZE_DATE.
 * Prefetch is chunked Promise.allSettled with 80% success threshold.
 */

const BUILD_ID = 'dafe2f0';
const VARIANT  = 'intl';
const SHELL_CACHE = `beta1-shell-${BUILD_ID}-${VARIANT}`;
const TILE_CACHE  = 'beta1-tiles-v1';
const FREEZE_DATE = new Date('2026-05-21T00:00:00+09:00');

const SHELL_URLS = [
  './',
  './index.html',
  './manifest.json',
  './styles.css',
  './data.js',
  './coords-fix.js',
  './icons.js',
  './state.js',
  './search.js',
  './map.js',
  './ui.js',
  './app.js',
  './vendor/leaflet.css',
  './vendor/leaflet.min.js',
  './vendor/qrcode-generator.min.js'
];

const TILE_HOST_RE = /(wprd0[1-4]\.is\.autonavi\.com|tile\.openstreetmap\.org)/;

// ── install: precache shell ─────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => c.addAll(SHELL_URLS).catch((err) => {
        console.warn('[sw.js] shell precache partial failure:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

// ── activate: clean old shell caches + health probe broadcast ───────
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith('beta1-shell-') && k !== SHELL_CACHE)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
    try {
      const ch = new BroadcastChannel('cache-status');
      const tileCache = await caches.open(TILE_CACHE);
      const tileKeys = await tileCache.keys();
      ch.postMessage({ type: 'health', cacheName: SHELL_CACHE, tilesCached: tileKeys.length });
      ch.close();
    } catch (e) { /* BroadcastChannel may be unsupported */ }
  })());
});

// ── fetch: routing strategies ───────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Tile request → stale-while-revalidate, ALWAYS no-referrer
  if (TILE_HOST_RE.test(url.hostname)) {
    event.respondWith(staleWhileRevalidateTile(req));
    return;
  }

  // Navigation request → network-first with portal detection (PM-4)
  if (req.mode === 'navigate') {
    event.respondWith(navigationStrategy(req));
    return;
  }

  // Shell request → cache-first
  const isShell = SHELL_URLS.some((u) => {
    return url.pathname === u.replace('./', '/') || url.pathname.endsWith(u.replace('./', '/'));
  });
  if (isShell) {
    event.respondWith(cacheFirst(req, SHELL_CACHE));
  }
  // Else: passthrough (default network)
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok && allowMutation()) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return new Response('Offline — shell cache miss', { status: 503 });
  }
}

async function staleWhileRevalidateTile(req) {
  const cache = await caches.open(TILE_CACHE);
  const hit = await cache.match(req);
  // ⚠️ Codex critical: SW fetch must explicitly set referrerPolicy
  const fetchPromise = fetch(req, { referrerPolicy: 'no-referrer' })
    .then((res) => {
      if (res && res.ok && allowMutation()) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || fetchPromise;
}

async function navigationStrategy(req) {
  try {
    const res = await fetch(req);
    // Captive portal heuristic: response URL differs from request URL
    if (res.url && res.url !== req.url && new URL(res.url).hostname !== new URL(req.url).hostname) {
      try {
        const ch = new BroadcastChannel('cache-status');
        ch.postMessage({ type: 'portal', detectedUrl: res.url });
        ch.close();
      } catch (e) { /* noop */ }
    }
    return res;
  } catch (e) {
    const cache = await caches.open(SHELL_CACHE);
    const hit = await cache.match('./index.html') || await cache.match('./');
    return hit || new Response('Offline navigation', { status: 503 });
  }
}

function allowMutation() {
  // postFreeze guard: never mutate caches after FREEZE_DATE
  if (Number.isNaN(FREEZE_DATE.getTime())) return true;
  return Date.now() <= FREEZE_DATE.getTime();
}

// ── message: prefetch trigger from "오프라인 준비" button ───────────
self.addEventListener('message', async (event) => {
  const data = event.data || {};
  if (data.type !== 'prefetch-tiles') return;
  const urls = Array.isArray(data.urls) ? data.urls : [];
  if (!urls.length) return;
  const cache = await caches.open(TILE_CACHE);
  const ch = (() => { try { return new BroadcastChannel('cache-status'); } catch (e) { return null; } })();

  const CHUNK = 50;
  let ok = 0, fail = 0;
  for (let i = 0; i < urls.length; i += CHUNK) {
    const slice = urls.slice(i, i + CHUNK);
    const results = await Promise.allSettled(
      slice.map((u) =>
        fetch(u, { referrerPolicy: 'no-referrer', mode: 'no-cors' })
          .then((res) => {
            if (res && res.ok && allowMutation()) return cache.put(u, res.clone()).then(() => true);
            return false;
          })
      )
    );
    results.forEach((r) => { if (r.status === 'fulfilled' && r.value) ok++; else fail++; });
    if (ch) ch.postMessage({ type: 'progress', ok: ok, fail: fail, total: urls.length });
  }
  const success = ok / urls.length >= 0.8;
  if (ch) {
    ch.postMessage({ type: 'complete', ok: ok, fail: fail, total: urls.length, success: success });
    ch.close();
  }
});
