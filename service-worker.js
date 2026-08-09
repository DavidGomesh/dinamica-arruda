const CACHE_NAME = "dinamica-arruda-v17";
const APP_SHELL = [
  "./", "./index.html", "./css/styles.css", "./js/app.js", "./js/pwa-install.js",
  "./js/storage/store.js", "./js/domain/time.js", "./js/domain/text.js", "./js/domain/players.js",
  "./js/domain/settings.js", "./js/domain/content.js", "./js/domain/decks.js",
  "./js/domain/backup.js", "./js/domain/matches.js", "./js/domain/history.js", "./js/domain/timed-games.js",
  "./js/domain/headband-orientation.js",
  "./js/domain/secret-voting.js", "./js/data/content.js",
  "./manifest.webmanifest", "./icons/app-icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
  )));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)
    .then((response) => {
      if (response.ok && new URL(event.request.url).origin === self.location.origin) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    })
    .catch(() => caches.match("./index.html"))));
});
