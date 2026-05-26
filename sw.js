const CACHE_NAME = "namma-metro-eta-v4";
const PUSH_WORKER_URL = "https://namma-metro-eta-push.sgrinfo.workers.dev";
const ASSETS = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  const isAppAsset = requestUrl.origin === self.location.origin;

  if (isAppAsset) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

self.addEventListener("push", event => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  event.waitUntil(
    resolvePushPayload(payload).then(message =>
      self.registration.showNotification(message.title, {
        body: message.body,
        icon: "icon.svg",
        badge: "icon.svg",
        tag: message.tag,
        data: message.url
      })
    )
  );
});

async function resolvePushPayload(payload) {
  if (payload.title || payload.body) {
    return normalizePayload(payload);
  }

  try {
    const response = await fetch(`${PUSH_WORKER_URL}/latest-message`, { cache: "no-store" });
    if (response.ok) {
      return normalizePayload(await response.json());
    }
  } catch {
    // Fall back to a generic notification if the Worker cannot be reached.
  }

  return normalizePayload({});
}

function normalizePayload(payload) {
  return {
    title: payload.title || "Namma Metro ETA",
    body: payload.body || "Time to check your metro commute.",
    tag: payload.tag || "metro-eta",
    url: payload.url || "./"
  };
}

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const targetUrl = event.notification.data || "./";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
      const client = clients.find(item => "focus" in item);
      if (client) return client.focus();
      return self.clients.openWindow(targetUrl);
    })
  );
});
