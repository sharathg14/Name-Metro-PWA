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

The current MVP can show notifications while the app is running. The next step is to add Web Push subscription and a Cloudflare Worker.
