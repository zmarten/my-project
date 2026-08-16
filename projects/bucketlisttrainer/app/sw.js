/*
 * Service worker.
 *
 * The whole point of this file is that the app opens in a basement with no signal, so the
 * shell is cache-first and the program is network-first with a cache fallback: a plan
 * change lands the next time there is signal, and its absence never blocks the session.
 *
 * Bump CACHE on every deploy. The old cache is deleted on activate.
 */
'use strict';

var CACHE = 'bucketlist-v2';

var SHELL = [
  './',
  'index.html',
  'app.css',
  'app.js',
  'manifest.webmanifest',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL.concat(['program.json'])); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

/*
 * Only ever store a clean same-origin 200. Without this guard an authentication redirect
 * gets cached as if it were the app, and the installed PWA then opens to a login page it
 * can never get past while offline.
 */
function cacheable(res) {
  return res && res.status === 200 && res.type === 'basic' && !res.redirected;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/program.json')) {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          if (cacheable(res)) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); });
          }
          return res;
        })
        .catch(function () {
          return caches.match(req).then(function (hit) {
            return hit || Response.error();
          });
        })
    );
    return;
  }

  /*
   * Stale while revalidate for the shell.
   *
   * Pure cache-first was wrong. It opens instantly and then never updates, because a new
   * deploy only lands if someone remembers to bump CACHE by hand, and that is exactly the
   * kind of manual step this repo keeps proving nobody remembers. This serves the cached
   * copy immediately, refetches in the background, and the next open is current. Instant
   * and self-healing, at the cost of being one launch behind after a deploy.
   */
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (cacheable(res)) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        if (hit) return hit;
        /* A navigation that misses the cache still gets the app rather than a browser error. */
        if (req.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      });
      return hit || net;
    })
  );
});
