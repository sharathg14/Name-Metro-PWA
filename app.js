const stations = {
  banashankari: { name: "Banashankari", line: "Green", lat: 12.9156, lng: 77.5736 },
  rvRoad: { name: "Rashtreeya Vidyalaya Road", line: "Green", lat: 12.9214, lng: 77.5806 },
  jayanagar: { name: "Jayanagar", line: "Green", lat: 12.9295, lng: 77.5802 },
  southEnd: { name: "South End Circle", line: "Green", lat: 12.9385, lng: 77.5801 },
  lalbagh: { name: "Lalbagh", line: "Green", lat: 12.9469, lng: 77.5800 },
  nationalCollege: { name: "National College", line: "Green", lat: 12.9507, lng: 77.5739 },
  krMarket: { name: "Krishna Rajendra Market", line: "Green", lat: 12.9600, lng: 77.5750 },
  chickpete: { name: "Chickpete", line: "Green", lat: 12.9680, lng: 77.5746 },
  majestic: { name: "Majestic", line: "Interchange", lat: 12.9763, lng: 77.5713 },
  sirM: { name: "Sir M. Visveshwaraya", line: "Purple", lat: 12.9741, lng: 77.5841 },
  vidhanaSoudha: { name: "Vidhana Soudha", line: "Purple", lat: 12.9796, lng: 77.5910 },
  cubbonPark: { name: "Cubbon Park", line: "Purple", lat: 12.9812, lng: 77.5980 },
  mgRoad: { name: "MG Road", line: "Purple", lat: 12.9755, lng: 77.6068 },
  trinity: { name: "Trinity", line: "Purple", lat: 12.9730, lng: 77.6170 },
  halasuru: { name: "Halasuru", line: "Purple", lat: 12.9764, lng: 77.6265 },
  indiranagar: { name: "Indiranagar", line: "Purple", lat: 12.9784, lng: 77.6387 },
  svRoad: { name: "Swami Vivekananda Road", line: "Purple", lat: 12.9858, lng: 77.6450 },
  baiyappanahalli: { name: "Baiyappanahalli", line: "Purple", lat: 12.9907, lng: 77.6529 },
  benniganahalli: { name: "Benniganahalli", line: "Purple", lat: 12.9966, lng: 77.6661 },
  krPura: { name: "KR Pura", line: "Purple", lat: 13.0008, lng: 77.6759 },
  singayyanapalya: { name: "Singayyanapalya", line: "Purple", lat: 12.9965, lng: 77.6886 },
  garudacharpalya: { name: "Garudacharpalya", line: "Purple", lat: 12.9939, lng: 77.7002 },
  hoodi: { name: "Hoodi", line: "Purple", lat: 12.9915, lng: 77.7114 },
  seetharampalya: { name: "Seetharampalya", line: "Purple", lat: 12.9866, lng: 77.7213 },
  kundalahalli: { name: "Kundalahalli", line: "Purple", lat: 12.9827, lng: 77.7277 },
  nallurhalli: { name: "Nallurhalli", line: "Purple", lat: 12.9797, lng: 77.7332 },
  sathyaSai: { name: "Sri Sathya Sai Hospital", line: "Purple", lat: 12.9805, lng: 77.7387 },
  pattandur: { name: "Pattandur Agrahara", line: "Purple", lat: 12.9876, lng: 77.7382 }
};

const morningRoute = [
  "banashankari", "rvRoad", "jayanagar", "southEnd", "lalbagh", "nationalCollege",
  "krMarket", "chickpete", "majestic", "sirM", "vidhanaSoudha", "cubbonPark",
  "mgRoad", "trinity", "halasuru", "indiranagar", "svRoad", "baiyappanahalli",
  "benniganahalli", "krPura", "singayyanapalya", "garudacharpalya", "hoodi",
  "seetharampalya", "kundalahalli", "nallurhalli", "sathyaSai", "pattandur"
];

const eveningRoute = [...morningRoute].reverse();

const pushConfig = {
  // Fill these after deploying the Cloudflare Worker and generating VAPID keys.
  workerUrl: "https://namma-metro-eta-push.sgrinfo.workers.dev",
  vapidPublicKey: "BLmOVr6_quhClJ9fUjJ4Vb7QXY3eU7VMv5nlNVvtAkh7uzMZtRKrpJa8kcUrY8BgHZjuxqaObh87dejKmSF7iWU"
};

const state = {
  position: null,
  map: null,
  userMarker: null,
  timers: []
};

const settings = {
  morningTime: "08:30",
  eveningTime: "18:00",
  leadMinutes: 10,
  notificationsEnabled: false
};

const els = {
  gpsDot: document.querySelector("#gpsDot"),
  locationStatus: document.querySelector("#locationStatus"),
  locateBtn: document.querySelector("#locateBtn"),
  refreshBtn: document.querySelector("#refreshBtn"),
  morningEta: document.querySelector("#morningEta"),
  morningWalk: document.querySelector("#morningWalk"),
  morningTrain: document.querySelector("#morningTrain"),
  morningTotal: document.querySelector("#morningTotal"),
  eveningEta: document.querySelector("#eveningEta"),
  eveningWalk: document.querySelector("#eveningWalk"),
  eveningTrain: document.querySelector("#eveningTrain"),
  eveningTotal: document.querySelector("#eveningTotal"),
  morningTime: document.querySelector("#morningTime"),
  eveningTime: document.querySelector("#eveningTime"),
  leadMinutes: document.querySelector("#leadMinutes"),
  notifyBtn: document.querySelector("#notifyBtn"),
  testNotifyBtn: document.querySelector("#testNotifyBtn"),
  notificationState: document.querySelector("#notificationState"),
  workerHealth: document.querySelector("#workerHealth"),
  lastSync: document.querySelector("#lastSync"),
  nextPush: document.querySelector("#nextPush"),
  lastWorkerMessage: document.querySelector("#lastWorkerMessage")
};

function loadSettings() {
  const saved = JSON.parse(localStorage.getItem("metroEtaSettings") || "{}");
  Object.assign(settings, saved);
  els.morningTime.value = settings.morningTime;
  els.eveningTime.value = settings.eveningTime;
  els.leadMinutes.value = settings.leadMinutes;
  updateNotificationState();
}

function saveSettings() {
  settings.morningTime = els.morningTime.value || "08:30";
  settings.eveningTime = els.eveningTime.value || "18:00";
  settings.leadMinutes = Number(els.leadMinutes.value || 10);
  localStorage.setItem("metroEtaSettings", JSON.stringify(settings));
  syncPushSubscription();
  scheduleReminders();
  render();
}

function saveLastSync() {
  localStorage.setItem("lastPushSync", new Date().toISOString());
  renderPushStatus();
}

function haversineKm(a, b) {
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function walkingMinutes(from, station) {
  if (!from) return 8;
  const directKm = haversineKm(from, station);
  const walkingKm = directKm * 1.28;
  return Math.max(2, Math.ceil((walkingKm / 4.6) * 60));
}

function isPeak(date) {
  const hour = date.getHours() + date.getMinutes() / 60;
  return (hour >= 7.5 && hour <= 10.5) || (hour >= 17 && hour <= 20.5);
}

function headwayMinutes(date) {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour < 5 || hour > 23.25) return 15;
  return isPeak(date) ? 5 : 8;
}

function waitForNextTrain(date) {
  const headway = headwayMinutes(date);
  const start = new Date(date);
  start.setHours(5, 0, 0, 0);
  const elapsed = Math.max(0, (date - start) / 60000);
  const remainder = elapsed % headway;
  return Math.ceil(remainder === 0 ? 0 : headway - remainder);
}

function trainMinutes(route) {
  const stationHops = route.length - 1;
  const interchange = route.includes("majestic") ? 5 : 0;
  return Math.round(stationHops * 2.25 + interchange);
}

function formatClock(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatShortDateTime(value) {
  if (!value) return "--";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function routeEstimate(route, originKey) {
  const now = new Date();
  const origin = stations[originKey];
  const walk = walkingMinutes(state.position, origin);
  const stationArrival = new Date(now.getTime() + walk * 60000);
  const wait = waitForNextTrain(stationArrival);
  const ride = trainMinutes(route);
  const total = walk + wait + ride;
  const arrival = new Date(now.getTime() + total * 60000);
  return { walk, wait, ride, total, arrival };
}

function setEta(prefix, estimate) {
  els[`${prefix}Eta`].textContent = formatClock(estimate.arrival);
  els[`${prefix}Walk`].textContent = `${estimate.walk} min`;
  els[`${prefix}Train`].textContent = `${estimate.wait} min`;
  els[`${prefix}Total`].textContent = `${estimate.total} min`;
}

function render() {
  setEta("morning", routeEstimate(morningRoute, "banashankari"));
  setEta("evening", routeEstimate(eveningRoute, "pattandur"));
  updateMapUser();
}

function updateLocationStatus() {
  if (!state.position) {
    els.gpsDot.classList.remove("ready");
    els.locationStatus.textContent = "Waiting for location";
    return;
  }
  const nearest = Object.values(stations)
    .map(station => ({ station, km: haversineKm(state.position, station) }))
    .sort((a, b) => a.km - b.km)[0];
  els.gpsDot.classList.add("ready");
  els.locationStatus.textContent = `Nearest station: ${nearest.station.name} · ${nearest.km.toFixed(1)} km`;
}

function locate() {
  if (!navigator.geolocation) {
    els.locationStatus.textContent = "GPS is not available in this browser";
    return;
  }
  els.locationStatus.textContent = "Finding your location";
  navigator.geolocation.getCurrentPosition(
    position => {
      state.position = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      localStorage.setItem("lastKnownPosition", JSON.stringify(state.position));
      updateLocationStatus();
      render();
    },
    () => {
      els.locationStatus.textContent = "Location permission is blocked";
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
}

function initMap() {
  if (!window.L) return;
  state.map = L.map("map", { zoomControl: false }).setView([12.982, 77.665], 12);
  L.control.zoom({ position: "bottomright" }).addTo(state.map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(state.map);

  const greenCoords = morningRoute.slice(0, 9).map(key => [stations[key].lat, stations[key].lng]);
  const purpleCoords = morningRoute.slice(8).map(key => [stations[key].lat, stations[key].lng]);
  L.polyline(greenCoords, { color: "#1b8a61", weight: 6, opacity: 0.86 }).addTo(state.map);
  L.polyline(purpleCoords, { color: "#7452a3", weight: 6, opacity: 0.86 }).addTo(state.map);

  morningRoute.forEach(key => {
    const station = stations[key];
    const marker = L.circleMarker([station.lat, station.lng], {
      radius: key === "majestic" || key === "banashankari" || key === "pattandur" ? 7 : 4,
      color: "#ffffff",
      weight: 2,
      fillColor: station.line === "Green" ? "#1b8a61" : station.line === "Purple" ? "#7452a3" : "#d9902f",
      fillOpacity: 1
    }).addTo(state.map);
    marker.bindPopup(station.name);
  });

  const bounds = L.latLngBounds(morningRoute.map(key => [stations[key].lat, stations[key].lng]));
  state.map.fitBounds(bounds.pad(0.14));
}

function updateMapUser() {
  if (!state.map || !state.position) return;
  if (!state.userMarker) {
    state.userMarker = L.circleMarker([state.position.lat, state.position.lng], {
      radius: 8,
      color: "#ffffff",
      weight: 3,
      fillColor: "#2c6f9f",
      fillOpacity: 1
    }).addTo(state.map);
    state.userMarker.bindPopup("Current GPS");
  } else {
    state.userMarker.setLatLng([state.position.lat, state.position.lng]);
  }
}

function updateNotificationState() {
  const permission = "Notification" in window ? Notification.permission : "unsupported";
  const pushReady = Boolean(pushConfig.workerUrl && pushConfig.vapidPublicKey);
  if (settings.notificationsEnabled && pushReady) {
    els.notificationState.textContent = "Push";
  } else if (settings.notificationsEnabled) {
    els.notificationState.textContent = "Local";
  } else {
    els.notificationState.textContent = permission === "granted" ? "Ready" : "Off";
  }
  els.notifyBtn.textContent = settings.notificationsEnabled ? "Disable" : "Enable";
}

function updateNextPushStatus() {
  const lead = Number(settings.leadMinutes || 10);
  const candidates = [
    { label: "Office", at: nextReminderAt(settings.morningTime, lead) },
    { label: "Home", at: nextReminderAt(settings.eveningTime, lead) }
  ].sort((a, b) => a.at - b.at);
  els.nextPush.textContent = `${candidates[0].label} · ${formatShortDateTime(candidates[0].at)}`;
}

async function renderPushStatus() {
  els.lastSync.textContent = formatShortDateTime(localStorage.getItem("lastPushSync"));
  updateNextPushStatus();

  if (!pushConfig.workerUrl) {
    els.workerHealth.textContent = "Local";
    els.lastWorkerMessage.textContent = "Worker not configured";
    return;
  }

  try {
    const baseUrl = pushConfig.workerUrl.replace(/\/$/, "");
    const [healthResponse, messageResponse] = await Promise.all([
      fetch(`${baseUrl}/health`, { cache: "no-store" }),
      fetch(`${baseUrl}/latest-message`, { cache: "no-store" })
    ]);
    els.workerHealth.textContent = healthResponse.ok ? "Online" : "Error";
    if (messageResponse.ok) {
      const message = await messageResponse.json();
      els.lastWorkerMessage.textContent = message.body || message.title || "--";
    }
  } catch {
    els.workerHealth.textContent = "Offline";
    els.lastWorkerMessage.textContent = "Worker unreachable";
  }
}

async function toggleNotifications() {
  if (!("Notification" in window)) {
    els.notificationState.textContent = "Unsupported";
    return;
  }
  if (settings.notificationsEnabled) {
    settings.notificationsEnabled = false;
    saveSettings();
    updateNotificationState();
    return;
  }
  const permission = await Notification.requestPermission();
  settings.notificationsEnabled = permission === "granted";
  saveSettings();
  await syncPushSubscription();
  updateNotificationState();
  if (settings.notificationsEnabled) {
    const mode = pushConfig.workerUrl ? "Daily commute push is active." : "Local reminders are active while this PWA is running.";
    sendCommuteNotification("Reminders enabled", mode);
  }
}

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

async function syncPushSubscription() {
  if (!settings.notificationsEnabled || !pushConfig.workerUrl || !pushConfig.vapidPublicKey) return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(pushConfig.vapidPublicKey)
    });
    await fetch(`${pushConfig.workerUrl.replace(/\/$/, "")}/subscribe`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subscription,
        settings: {
          morningTime: settings.morningTime,
          eveningTime: settings.eveningTime,
          leadMinutes: settings.leadMinutes,
          timezone: "Asia/Kolkata"
        }
      })
    });
    saveLastSync();
    updateNotificationState();
  } catch (error) {
    console.warn("Push subscription failed", error);
    els.notificationState.textContent = "Local";
  }
}

function nextReminderAt(timeText, leadMinutes) {
  const [hour, minute] = timeText.split(":").map(Number);
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  next.setMinutes(next.getMinutes() - leadMinutes);
  if (next <= new Date()) next.setDate(next.getDate() + 1);
  return next;
}

function scheduleReminders() {
  state.timers.forEach(timer => clearTimeout(timer));
  state.timers = [];
  if (!settings.notificationsEnabled || Notification.permission !== "granted") return;

  [
    { name: "Morning metro", time: settings.morningTime, route: morningRoute, origin: "banashankari" },
    { name: "Evening metro", time: settings.eveningTime, route: eveningRoute, origin: "pattandur" }
  ].forEach(item => {
    const target = nextReminderAt(item.time, settings.leadMinutes);
    const delay = target - new Date();
    const timer = setTimeout(() => {
      const estimate = routeEstimate(item.route, item.origin);
      sendCommuteNotification(item.name, `Leave check: ${estimate.total} min total, arrival around ${formatClock(estimate.arrival)}.`);
      scheduleReminders();
    }, delay);
    state.timers.push(timer);
  });
}

function sendCommuteNotification(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, {
        body,
        icon: "icon.svg",
        badge: "icon.svg",
        tag: "metro-eta"
      });
    });
    return;
  }
  new Notification(title, { body, icon: "icon.svg", tag: "metro-eta" });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }
}

function hydrateLastLocation() {
  const saved = JSON.parse(localStorage.getItem("lastKnownPosition") || "null");
  if (saved?.lat && saved?.lng) {
    state.position = saved;
    updateLocationStatus();
  }
}

els.locateBtn.addEventListener("click", locate);
els.refreshBtn.addEventListener("click", render);
els.notifyBtn.addEventListener("click", toggleNotifications);
els.testNotifyBtn.addEventListener("click", () => {
  if (Notification.permission === "granted") {
    if (pushConfig.workerUrl) {
      fetch(`${pushConfig.workerUrl.replace(/\/$/, "")}/test`, { method: "POST" }).catch(() => {
        sendCommuteNotification("Namma Metro ETA", "Push test could not reach Cloudflare. Check your connection and Worker deploy.");
      });
      return;
    }
    const estimate = routeEstimate(morningRoute, "banashankari");
    sendCommuteNotification("Namma Metro ETA", `Banashankari to Pattandur Agrahara: ${estimate.total} min total.`);
  } else {
    toggleNotifications();
  }
});

[els.morningTime, els.eveningTime, els.leadMinutes].forEach(input => {
  input.addEventListener("change", saveSettings);
});

loadSettings();
hydrateLastLocation();
registerServiceWorker();
initMap();
render();
renderPushStatus();
scheduleReminders();
setInterval(render, 60000);
setInterval(renderPushStatus, 5 * 60000);
