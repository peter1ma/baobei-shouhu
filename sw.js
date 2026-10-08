const CACHE = 'baobei-v8';
const APP = "./index.html";
const ASSETS = ["./", APP, "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png", "./sw.js"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async url => {
      try {
        const res = await fetch(url, {cache: "reload"});
        if (res && res.ok) await cache.put(url, res);
      } catch (e) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cachedExact = await cache.match(event.request, {ignoreSearch: true});
    if (event.request.mode === "navigate") {
      try {
        const res = await fetch(event.request, {cache: "reload"});
        if (res && res.ok) {
          await cache.put(event.request, res.clone());
          if (url.pathname.endsWith("/") || url.pathname.endsWith("/index.html") || url.pathname.endsWith("index.html")) {
            await cache.put(APP, res.clone());
            await cache.put("./", res.clone());
          }
          return res;
        }
      } catch (e) {}
      if (cachedExact) return cachedExact;
      const hit = await cache.match(APP) || await cache.match("./");
      if (hit) return hit;
      return new Response("<!doctype html><meta charset=utf-8><p style='font-family:sans-serif'>请先用 Safari 联网打开一次，出现「已可离线」后再添加到主屏幕。</p>", {headers:{"Content-Type":"text/html; charset=utf-8"}});
    }
    if (cachedExact) return cachedExact;
    try {
      const res = await fetch(event.request);
      if (res && res.ok) await cache.put(event.request, res.clone());
      return res;
    } catch (e) {
      const hit = await cache.match(APP) || await cache.match("./");
      if (hit) return hit;
      return new Response("<!doctype html><meta charset=utf-8><p style='font-family:sans-serif'>请先用 Safari 联网打开一次，出现「已可离线」后再添加到主屏幕。</p>", {headers:{"Content-Type":"text/html; charset=utf-8"}});
    }
  })());
});
