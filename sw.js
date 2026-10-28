/* Henriksen – service worker.
   Strona: najpierw sieć (żeby nowe wersje docierały od razu), offline z pamięci.
   Ikony, manifest, czcionki: z pamięci, w tle odświeżane.
   Przy większych zmianach podbij VERSION. */
const VERSION = "henriksen-v34";
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/icon.svg",
  "./video/gol-1.mp4", "./video/gol-2.mp4", "./video/gol-3.mp4", "./video/gol-4.mp4",
  "./sound/rakieta.m4a"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Strona główna: sieć, a bez internetu wersja z pamięci
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put("./index.html", copy));
      return res;
    }).catch(() => caches.match("./index.html")));
    return;
  }

  // Filmiki: Safari prosi o kawałki pliku (Range), więc odpowiadamy 206 z pliku w pamięci
  if (req.headers.has("range") && url.origin === location.origin) {
    e.respondWith(rangeFromCache(req));
    return;
  }

  // Pliki z tej strony i czcionki Google: z pamięci + odświeżenie w tle
  const sameOrigin = url.origin === location.origin;
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  const lib = url.hostname === "cdn.jsdelivr.net"; // supabase-js (konto); zapytania do Supabase idą zawsze do sieci
  if (!sameOrigin && !fonts && !lib) return;
  e.respondWith(caches.open(VERSION).then(c => c.match(req).then(hit => {
    const net = fetch(req).then(res => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; })
      .catch(() => hit);
    return hit || net;
  })));
});

async function rangeFromCache(req) {
  const c = await caches.open(VERSION);
  let res = await c.match(req.url);
  if (!res) {
    try {
      res = await fetch(req.url);
      if (res.ok) c.put(req.url, res.clone());
    } catch (err) { return fetch(req); }
  }
  if (!res.ok) return res;
  const buf = await res.arrayBuffer(), size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") || "");
  let start = 0, end = size - 1;
  if (m && m[1]) { start = +m[1]; if (m[2]) end = Math.min(+m[2], size - 1); }
  else if (m && m[2]) start = Math.max(0, size - +m[2]);
  if (start >= size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    "Content-Type": res.headers.get("Content-Type") || "video/mp4",
    "Content-Range": `bytes ${start}-${end}/${size}`,
    "Content-Length": String(end - start + 1),
    "Accept-Ranges": "bytes" } });
}
