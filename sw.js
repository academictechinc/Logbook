// Logbook service worker
// Bump CACHE_NAME on any update to index.html/manifest/icon — clients must
// fully close and reopen the installed app to pick up a new version.
var CACHE_NAME = "logbook-cache-v3";
var ASSETS = [
  "./index.html",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){ return key !== CACHE_NAME; })
            .map(function(key){ return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(event){
  var req = event.request;
  // Only cache-manage same-origin GET page/asset requests. Firebase Auth and
  // Firestore make their own POST/streaming requests to google APIs — those
  // must go straight to the network untouched, and the Cache API can't even
  // match a non-GET request (it throws), so bail out early for anything else.
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(function(cached){
      if(cached) return cached;
      return fetch(req).catch(function(){
        return caches.match("./index.html");
      });
    })
  );
});

self.addEventListener("notificationclick", function(event){
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then(function(list){
      for (var i = 0; i < list.length; i++){
        if ("focus" in list[i]) return list[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./index.html");
    })
  );
});
