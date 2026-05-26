const SUBSCRIPTION_KEY = "primary";
const LATEST_MESSAGE_KEY = "latest-message";
const DEFAULT_SETTINGS = {
  morningTime: "08:30",
  eveningTime: "18:00",
  leadMinutes: 10,
  timezone: "Asia/Kolkata"
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env) });
    }

    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return json({ ok: true }, env);
    }

    if (url.pathname === "/latest-message") {
      const message = await loadLatestMessage(env);
      return json(message, env);
    }

    if (url.pathname === "/subscribe" && request.method === "POST") {
      const body = await request.json();
      if (!body.subscription?.endpoint) {
        return json({ ok: false, error: "Missing subscription" }, env, 400);
      }

      const record = {
        subscription: body.subscription,
        settings: { ...DEFAULT_SETTINGS, ...body.settings },
        updatedAt: new Date().toISOString()
      };
      await env.SUBSCRIPTIONS.put(SUBSCRIPTION_KEY, JSON.stringify(record));
      return json({ ok: true }, env);
    }

    if (url.pathname === "/test" && request.method === "POST") {
      const record = await loadRecord(env);
      if (!record) return json({ ok: false, error: "No subscription saved" }, env, 404);
      await saveLatestMessage(env, buildTestMessage());
      const result = await sendPush(env, record.subscription);
      return json({ ok: result.ok, status: result.status }, env, result.ok ? 200 : 502);
    }

    return json({ ok: false, error: "Not found" }, env, 404);
  },

  async scheduled(event, env) {
    const record = await loadRecord(env);
    if (!record) return;

    const now = new Date(event.scheduledTime);
    const settings = { ...DEFAULT_SETTINGS, ...record.settings };
    const reminders = [
      { label: "morning", time: settings.morningTime },
      { label: "evening", time: settings.eveningTime }
    ];

    for (const reminder of reminders) {
      if (await shouldSend(env, now, reminder, settings.leadMinutes)) {
        await saveLatestMessage(env, buildReminderMessage(reminder, settings));
        await sendPush(env, record.subscription);
      }
    }
  }
};

async function loadRecord(env) {
  const raw = await env.SUBSCRIPTIONS.get(SUBSCRIPTION_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function loadLatestMessage(env) {
  const raw = await env.SUBSCRIPTIONS.get(LATEST_MESSAGE_KEY);
  if (raw) return JSON.parse(raw);
  return {
    title: "Namma Metro ETA",
    body: "Time to check your metro commute.",
    tag: "metro-eta",
    url: "./"
  };
}

async function saveLatestMessage(env, message) {
  await env.SUBSCRIPTIONS.put(LATEST_MESSAGE_KEY, JSON.stringify({
    ...message,
    createdAt: new Date().toISOString()
  }), { expirationTtl: 15 * 60 });
}

function buildTestMessage() {
  return {
    title: "Namma Metro push test",
    body: "Cloudflare background push is working on your iPhone.",
    tag: "metro-eta-test",
    url: "./"
  };
}

function buildReminderMessage(reminder, settings) {
  const lead = Number(settings.leadMinutes || 10);
  const isMorning = reminder.label === "morning";
  return {
    title: isMorning ? "Leave check: Office commute" : "Leave check: Home commute",
    body: isMorning
      ? `In ${lead} min, check Banashankari to Pattandur Agrahara metro ETA.`
      : `In ${lead} min, check Pattandur Agrahara to Banashankari metro ETA.`,
    tag: `metro-eta-${reminder.label}`,
    url: "./"
  };
}

async function shouldSend(env, nowUtc, reminder, leadMinutes) {
  const nowIst = new Date(nowUtc.getTime() + 5.5 * 60 * 60 * 1000);
  const today = nowIst.toISOString().slice(0, 10);
  const currentMinutes = nowIst.getUTCHours() * 60 + nowIst.getUTCMinutes();
  const targetMinutes = timeToMinutes(reminder.time) - Number(leadMinutes || 10);
  const delta = currentMinutes - targetMinutes;
  if (delta < 0 || delta >= 5) return false;

  const sentKey = `sent:${reminder.label}:${today}`;
  const alreadySent = await env.SUBSCRIPTIONS.get(sentKey);
  if (alreadySent) return false;

  await env.SUBSCRIPTIONS.put(sentKey, "1", { expirationTtl: 36 * 60 * 60 });
  return true;
}

function timeToMinutes(timeText) {
  const [hour, minute] = String(timeText).split(":").map(Number);
  return hour * 60 + minute;
}

async function sendPush(env, subscription) {
  const audience = new URL(subscription.endpoint).origin;
  const jwt = await createVapidJwt(env, audience);
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      TTL: "600",
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
      "Crypto-Key": `p256ecdsa=${env.VAPID_PUBLIC_KEY}`
    }
  });
  return { ok: response.ok || response.status === 201, status: response.status };
}

async function createVapidJwt(env, audience) {
  const header = base64UrlJson({ typ: "JWT", alg: "ES256" });
  const payload = base64UrlJson({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: env.VAPID_SUBJECT
  });
  const data = new TextEncoder().encode(`${header}.${payload}`);
  const keyData = base64UrlToArrayBuffer(env.VAPID_PRIVATE_KEY);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, data);
  return `${header}.${payload}.${base64Url(new Uint8Array(normalizeEs256Signature(signature)))}`;
}

function normalizeEs256Signature(signature) {
  const bytes = new Uint8Array(signature);
  if (bytes.length === 64) return bytes;
  if (bytes[0] !== 0x30) return bytes;

  let offset = 2;
  if (bytes[offset] !== 0x02) return bytes;
  const rLength = bytes[offset + 1];
  let r = bytes.slice(offset + 2, offset + 2 + rLength);
  offset += 2 + rLength;
  if (bytes[offset] !== 0x02) return bytes;
  const sLength = bytes[offset + 1];
  let s = bytes.slice(offset + 2, offset + 2 + sLength);
  r = leftPad32(trimLeadingZeroes(r));
  s = leftPad32(trimLeadingZeroes(s));
  return new Uint8Array([...r, ...s]);
}

function trimLeadingZeroes(bytes) {
  let index = 0;
  while (index < bytes.length - 1 && bytes[index] === 0) index += 1;
  return bytes.slice(index);
}

function leftPad32(bytes) {
  if (bytes.length >= 32) return bytes.slice(bytes.length - 32);
  const output = new Uint8Array(32);
  output.set(bytes, 32 - bytes.length);
  return output;
}

function base64UrlJson(value) {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function base64Url(bytes) {
  let binary = "";
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToArrayBuffer(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function corsHeaders(env) {
  return {
    "access-control-allow-origin": env.APP_ORIGIN || "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  };
}

function json(body, env, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders(env)
    }
  });
}
