# Deployment Guide — Rewaya Hygiene Log Manager

Low-cost deployment for a small team: **Render** (API + Postgres) + **Netlify** (web)
and **Expo Go / EAS** (mobile). Everything has a free tier.

---

## 0. Prerequisites (one-time, on your machine)

| Tool | Install | Verify |
|------|---------|--------|
| Node.js 24 | https://nodejs.org | `node -v` |
| pnpm | `npm install -g pnpm` | `pnpm -v` |
| Git | https://git-scm.com | `git --version` |
| GitHub account | https://github.com | — |
| Render account | https://render.com | — |
| Netlify account | https://app.netlify.com | — |
| Expo CLI (mobile) | `npm install -g eas-cli` | `eas --version` |

> The repo is a pnpm workspace. Use **pnpm**, not npm/yarn.

---

## 1. Push the code to GitHub

```bash
cd "H:\Rewya_Hotel_Operational-main\Hygiene-Log-Manager\Hygiene-Log-Manager"

git init
git add .
git commit -m "Initial deploy: API + web + mobile"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/hygiene-log-manager.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username. Create the empty repo on
GitHub **first** (do not add a README/.gitignore when creating it).

---

## 2. Deploy the API to Render

1. Go to https://render.com → **New** → **Blueprint**.
2. Connect your GitHub account and select the `hygiene-log-manager` repo.
3. Render reads `render.yaml` and creates:
   - a **Web Service** (`rewaya-hygiene-api`, free tier)
   - a **Postgres database** (`rewaya-hygiene-db`, free tier)
   with `DATABASE_URL` wired automatically.
4. Click **Apply** and wait for the build to finish.

### Run the database migration (one time)

After the first deploy, create the tables:

- In Render, open the **API service** → **Shell** tab, then run:

  ```bash
  pnpm --filter @workspace/db run push
  ```

  (If the Shell isn't available on the free plan, run it locally against the
  Render DB URL: `DATABASE_URL=<render-postgres-uri> pnpm --filter @workspace/db run push`)

5. Copy your API URL, e.g. `https://rewaya-hygiene-api.onrender.com`.

> Free Render web services spin down after inactivity (~30–60s cold start).
> For an always-on option use a $5/mo instance or Railway.

### Using Supabase Postgres instead (optional)

1. Create a free Supabase project → copy the **URI** connection string.
2. In Render, set `DATABASE_URL` manually (instead of `fromDatabase`).
3. Run the migration (step above) against that URI.

---

## 3. Deploy the web app to Netlify

1. Go to https://app.netlify.com → **Add new site** → **Import from Git**.
2. Authorize GitHub and pick the repo.
3. Set the build settings:
   - **Base directory:** `artifacts/web-app`
   - **Build command:** `pnpm install && pnpm run build`
   - **Publish directory:** `dist`
   (These are also in `netlify.toml`, so Netlify may auto-fill them.)
4. Add an **environment variable**:
   - `VITE_API_URL` = `https://rewaya-hygiene-api.onrender.com` (your Render URL, no trailing slash)
5. Click **Deploy site**.

The `netlify.toml` already configures the SPA fallback (`/*` → `index.html`).

---

## 4. Mobile app (Expo)

The mobile client (`artifacts/mobile`) is a complete native app that talks to the
same API. Its API URL resolves from (in order):
`EXPO_PUBLIC_API_URL` → `expo-constants` `extra.apiUrl` (in `app.json`) → dev fallback.
Both `app.json` and `artifacts/mobile/.env` already default to the Render URL.

### Option A — Expo Go (free, no build — recommended to start)

```bash
cd artifacts/mobile
pnpm install
pnpm exec expo start
```

Scan the QR code with the **Expo Go** app (Android Play Store / iPhone Camera).
The app connects to the live Render API automatically.

### Option B — Internal APK for the team (EAS, free quota)

```bash
pnpm exec eas login
pnpm exec eas build --profile preview --platform android
```

Download the APK and sideload it to team phones. (iOS needs an Apple account +
internal distribution.)

### Option C — Production store build

```bash
pnpm exec eas build --profile production --platform all
pnpm exec eas submit --platform all
```

---

## 5. First login

- **Username:** `director`
- **Password:** `Rewaya@2024`

You will be forced to change the password on first login. Use the Director
dashboard (web or mobile) to create manager accounts and assign hotels.

---

## Architecture recap

```
Browser / Expo app
        │  (CORS open: origin: true)
        ▼
Render Web Service  ──▶  Postgres (Render or Supabase)
(rewaya-hygiene-api)
```

- **API:** `artifacts/api-server` (Express 5, Drizzle ORM)
- **Web:** `artifacts/web-app` (React + Vite) → Netlify
- **Mobile:** `artifacts/mobile` (Expo) → Expo Go / EAS
- **DB schema:** `lib/db`
- Logs are cached on-device and synced with the server, so they appear on every device.
