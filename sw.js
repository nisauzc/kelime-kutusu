/* Çevrimdışı kullanım için basit önbellek */
var CACHE = "kelime-kutusu-v3";
var FILES = [
  "./", "./index.html",
  "./css/style.css",
  "./js/csv.js", "./js/srs.js", "./js/store.js", "./js/study.js", "./js/ui.js", "./js/app.js",
  "./data/starter.js",
  "./manifest.json",
  "./icons/icon-192.png", "./icons/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(FILES.map(function (f) {
      // cache:"reload" tarayıcı önbelleğini atlar, böylece eski dosya saklanmaz
      return c.add(new Request(f, { cache: "reload" })).catch(function () {});
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) {
      return k === CACHE ? null : caches.delete(k);
    }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;   // yazı tipleri ağdan gelsin
  /* Önce ağ, olmazsa önbellek: çevrimiçiyken her zaman güncel sürüm gelir,
     çevrimdışıyken uygulama yine açılır. */
  e.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || caches.match("./index.html");
      });
    })
  );
});
