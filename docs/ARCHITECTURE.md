# Namma Metro ETA PWA Architecture

This document captures what has been built so far, how the system works, and how to deploy/test it.

## Goal

Build a free personal commute tracker for iPhone that estimates Namma Metro commute ETAs for:

- Morning: Banashankari -> Pattandur Agrahara
- Evening: Pattandur Agrahara -> Banashankari

The app is intentionally private/local-first. It uses schedule/headway estimates for now because no official BMRCL/IUDX live API key is configured.

## Current Features

- Installable PWA hosted on GitHub Pages
- iPhone Home Screen support
- GPS-based current location
- Walking-time estimate to origin station
- Schedule/headway-based train wait estimate
- Metro travel-time estimate with Majestic interchange allowance
- Map view using Leaflet and OpenStreetMap
- Daily commute reminders
- iPhone Web Push notifications using Cloudflare Workers
- Cloudflare cron job checks reminder windows every 5 minutes
- Weekday-only reminder option
- GPS-derived walking-time sync to Cloudflare
- Push Status panel showing:
  - Worker health
  - Last subscription sync
  - Next push time
  - Walking sync source
  - Last Worker message

## Repository Structure

```text
.
├── app.js
├── icon.svg
├── index.html
├── manifest.webmanifest
├── README.md
├── styles.css
├── sw.js
├── docs/
│   └── ARCHITECTURE.md
├── push-worker/
│   ├── wrangler.toml
│   └── src/
│       └── worker.js
└── tools/
    └── generate-vapid-keys.mjs
```

## Frontend PWA

The PWA is plain HTML/CSS/JavaScript, with no build step.

Main files:

- `index.html`: app shell, cards, settings UI, map container
- `styles.css`: responsive layout and visual design
- `app.js`: ETA logic, GPS, map, settings, push subscription
- `sw.js`: service worker, cache handling, push notification display
- `manifest.webmanifest`: PWA metadata
- `icon.svg`: app icon

### Data Model

Station and route data live in `app.js`.

The main route array is:

```js
const morningRoute = [
  "banashankari",
  "rvRoad",
  "jayanagar",
  "southEnd",
  "lalbagh",
  "nationalCollege",
  "krMarket",
  "chickpete",
  "majestic",
  "sirM",
  "vidhanaSoudha",
  "cubbonPark",
  "mgRoad",
  "trinity",
  "halasuru",
  "indiranagar",
  "svRoad",
  "baiyappanahalli",
  "benniganahalli",
  "krPura",
  "singayyanapalya",
  "garudacharpalya",
  "hoodi",
  "seetharampalya",
  "kundalahalli",
  "nallurhalli",
  "sathyaSai",
  "pattandur"
];
```

The evening route is the reverse.

### ETA Calculation

The frontend computes:

```text
total ETA = walking time + next train wait + metro ride time
```

Walking estimate:

```js
walkingKm = directKm * 1.28
walkingMinutes = walkingKm / 4.6 km/h
```

Train wait estimate:

- Peak headway: 5 minutes
- Off-peak headway: 8 minutes
- Late/very early fallback: 15 minutes

Ride estimate:

```text
station hops * 2.25 minutes + 5 minute Majestic interchange
```

## Service Worker

File: `sw.js`

Responsibilities:

- Cache app shell assets
- Prefer fresh network app assets to avoid stale iPhone PWA caches
- Receive Web Push events
- Fetch latest message from Cloudflare Worker when the push payload is empty
- Show the notification
- Focus/open the app when a notification is tapped

The cache name is versioned manually:

```js
const CACHE_NAME = "namma-metro-eta-v4";
```

When changing cache behavior, bump this value.

## Cloudflare Worker

File: `push-worker/src/worker.js`

Worker URL:

```text
https://namma-metro-eta-push.sgrinfo.workers.dev
```

Current endpoints:

```text
GET  /health
GET  /latest-message
POST /subscribe
POST /test
```

### `/subscribe`

Called by the PWA after notification permission is granted.

Stores in KV:

- Web Push subscription
- reminder settings
- lead minutes
- weekday-only flag
- GPS-derived walking estimates

### `/test`

Stores a test message in KV and sends a push to the saved subscription.

### Scheduled Cron

Configured in `push-worker/wrangler.toml`:

```toml
[triggers]
crons = ["*/5 * * * *"]
```

The Worker checks every 5 minutes whether the current IST time falls inside the reminder window.

Reminder firing logic:

```text
target push time = commute time - lead minutes
```

It also writes a per-day sent marker to avoid duplicate reminders:

```text
sent:morning:YYYY-MM-DD
sent:evening:YYYY-MM-DD
```

### Worker ETA Calculation

The Worker calculates push ETA text server-side so notifications can be useful even when the app is closed.

Current Worker estimate:

```text
total ETA = synced walking minutes + train wait + metro ride estimate
```

The Worker receives walking minutes from the PWA during subscription sync.

Example push body:

```text
Leave in 10 min. Walk 6 min, train wait 4 min, arrival around 09:42.
```

### Weekday-Only Logic

If `weekdaysOnly` is true, scheduled pushes are skipped on Saturday and Sunday in IST.

## Cloudflare Configuration

File: `push-worker/wrangler.toml`

Important values:

```toml
name = "namma-metro-eta-push"
main = "src/worker.js"
compatibility_date = "2025-05-27"

[vars]
VAPID_SUBJECT = "mailto:sharathg14@gmail.com"
VAPID_PUBLIC_KEY = "..."
APP_ORIGIN = "https://sharathg14.github.io"

[[kv_namespaces]]
binding = "SUBSCRIPTIONS"
id = "9d2b2b5f1a6144be936280c3ff7dd067"
```

The private VAPID key is not committed. It is stored in Cloudflare as a secret:

```bash
npx wrangler secret put VAPID_PRIVATE_KEY
```

## Push Notification Flow

```text
iPhone Home Screen PWA
  -> user taps Enable
  -> browser creates PushSubscription
  -> app POSTs subscription/settings to Cloudflare /subscribe
  -> Worker stores subscription/settings in KV
  -> Cloudflare cron runs every 5 minutes
  -> Worker checks commute windows
  -> Worker stores latest notification message in KV
  -> Worker sends Web Push
  -> iPhone wakes service worker
  -> service worker fetches /latest-message
  -> service worker displays notification
```

## Deployment

### Deploy PWA To GitHub Pages

```bash
cd "/Users/sgr/Documents/Live PWA App for Namma Metro"
git add .
git commit -m "Describe change"
git push
```

GitHub Pages URL:

```text
https://sharathg14.github.io/Name-Metro-PWA/
```

### Deploy Cloudflare Worker

```bash
cd "/Users/sgr/Documents/Live PWA App for Namma Metro/push-worker"
npx wrangler deploy
```

### Generate VAPID Keys

Only needed if rotating/recreating push keys.

```bash
cd "/Users/sgr/Documents/Live PWA App for Namma Metro"
node tools/generate-vapid-keys.mjs
```

Then:

1. Put public key in:

```text
push-worker/wrangler.toml
app.js
```

2. Put private key in Cloudflare:

```bash
cd push-worker
npx wrangler secret put VAPID_PRIVATE_KEY
```

3. Deploy Worker:

```bash
npx wrangler deploy
```

## iPhone Testing Steps

1. Open Safari.
2. Visit:

```text
https://sharathg14.github.io/Name-Metro-PWA/
```

3. Tap Share.
4. Tap `Add to Home Screen`.
5. Open the Home Screen app.
6. Tap `Use GPS`.
7. Confirm Push Status shows walking sync as `gps`.
8. Tap `Enable`.
9. Tap `Test`.

Expected push:

```text
Namma Metro push test
Cloudflare push works. Demo ETA: ...
```

To test scheduled push:

1. Set Morning or Evening time 15 minutes from now.
2. Set Lead to `10`.
3. Keep Weekdays enabled if it is a weekday.
4. Tap `Enable` again to sync settings.
5. Close and lock iPhone.
6. Wait for the next Cloudflare cron window.

Cron runs every 5 minutes, so the notification can arrive a few minutes after the exact target time.

## Current Limitations

- ETA is estimated, not live.
- No official BMRCL/IUDX API is connected yet.
- Station coordinates and segment timings are seed values, not audited GTFS-grade data.
- The Worker stores one subscription record for personal use, not many users.
- The Worker does not yet store saved Home/Office coordinates.
- Push payload is handled through `/latest-message` rather than encrypted Web Push payloads.
- GitHub Pages and Cloudflare Workers are separate deploys.

## Important Privacy Notes

- Location history is not stored.
- Current GPS is saved locally in browser localStorage as `lastKnownPosition`.
- Cloudflare receives only derived walking minutes, not raw GPS coordinates.
- Push subscription data is stored in Cloudflare KV.
- VAPID private key is a Cloudflare secret and must not be committed.

## Roadmap

Recommended next steps:

1. Saved Home/Office coordinates
2. Pause today / pause this week / resume
3. Better route timing by station segment
4. Proper GTFS static schedule import
5. Investigate official live GTFS-RT/IUDX/BMRCL data access
6. Multi-user support only if this becomes more than a personal app
7. Encrypted Web Push payloads instead of `/latest-message` fetch

## Useful Commands

Syntax checks:

```bash
node --check app.js
node --check sw.js
node --check push-worker/src/worker.js
```

Local server:

```bash
python3 -m http.server 4173
```

Worker deploy:

```bash
cd push-worker
npx wrangler deploy
```

Git status:

```bash
git status --short --branch
```
