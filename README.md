# Namma Metro ETA

Personal PWA for Banashankari <-> Pattandur Agrahara commute ETA estimates.

## Current MVP

- GPS-based nearest station status
- Banashankari to Pattandur Agrahara ETA
- Pattandur Agrahara to Banashankari ETA
- Walking + schedule/headway estimate
- Map view with Green/Purple route segments
- Local-only settings
- PWA manifest and service worker

## Run Locally

```bash
python3 -m http.server 4173
```

Open:

```text
http://127.0.0.1:4173
```

## Deploy To GitHub Pages

1. Create a new GitHub repository.
2. Push this folder to the repository.
3. In GitHub, open `Settings -> Pages`.
4. Under `Build and deployment`, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Save.

GitHub will publish the app at:

```text
https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME/
```

## Install On iPhone

1. Open the GitHub Pages URL in Safari.
2. Tap Share.
3. Tap `Add to Home Screen`.
4. Open the app from the new Home Screen icon.
5. Tap `Enable` inside the app to request notification permission.

## iPhone Notification Reality

iPhone PWA notifications require:

- HTTPS hosting
- The app installed through `Add to Home Screen`
- Notification permission requested from inside the installed PWA
- A service worker
- For background notifications while the app is closed: a push backend

GitHub Pages can host the PWA, but it cannot run a backend or scheduled jobs. For true daily commute notifications while the app is closed, add a free backend such as Cloudflare Workers with:

- A subscription endpoint
- Web Push VAPID keys
- A scheduled cron trigger
- A push sender

The current MVP can show notifications while the app is running. Background pushes are scaffolded in `push-worker/`.

## Set Up Real iPhone Background Push

This uses free Cloudflare Workers. You need a Cloudflare account and `wrangler`.

### 1. Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 2. Generate VAPID Keys

```bash
node tools/generate-vapid-keys.mjs
```

Copy both values:

```text
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

### 3. Create Cloudflare KV

```bash
cd push-worker
wrangler kv namespace create SUBSCRIPTIONS
```

Copy the generated KV namespace id into `push-worker/wrangler.toml`.

### 4. Configure The Worker

In `push-worker/wrangler.toml`, replace:

```text
VAPID_PUBLIC_KEY = "REPLACE_WITH_PUBLIC_KEY"
id = "REPLACE_WITH_KV_NAMESPACE_ID"
```

Set the private key as a secret:

```bash
wrangler secret put VAPID_PRIVATE_KEY
```

Paste `VAPID_PRIVATE_KEY` when prompted.

### 5. Deploy Worker

```bash
wrangler deploy
```

Cloudflare will print a URL like:

```text
https://namma-metro-eta-push.YOUR_ACCOUNT.workers.dev
```

### 6. Connect The PWA To Worker

In `app.js`, fill:

```js
const pushConfig = {
  workerUrl: "https://namma-metro-eta-push.YOUR_ACCOUNT.workers.dev",
  vapidPublicKey: "VAPID_PUBLIC_KEY"
};
```

Commit and push to GitHub Pages again.

### 7. Test On iPhone

1. Open the GitHub Pages URL in Safari.
2. Add it to Home Screen again, or fully close/reopen the installed app.
3. Open the Home Screen app.
4. Tap `Enable`.
5. Tap `Test`.

The Worker test endpoint sends a background Web Push to the saved subscription. Scheduled pushes run every 5 minutes and fire once per morning/evening commute window, `leadMinutes` before the configured commute time.
